import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const manifestName = 'RELEASE-MANIFEST.json';
const sha256Pattern = /^[0-9a-f]{64}$/;
const commitPattern = /^[0-9a-f]{40}$/;
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9A-Za-z-][0-9A-Za-z-]*))*)?$/;
const artifactNamePattern =
  /^data-incident-investigator-v(?<version>.+)-(?<commit>[0-9a-f]{12})\.tar\.gz$/;
const maxArchiveBytes = 25 * 1024 * 1024;
const maxPayloadBytes = 50 * 1024 * 1024;
const maxPayloadFiles = 500;
const forbiddenPathSegments = new Set([
  '.cache',
  '.git',
  '.pnpm-store',
  '__pycache__',
  'coverage',
  'node_modules',
  'outputs',
  'test',
  'tests',
  'work',
]);
const requiredStaticFiles = [
  '.env.example',
  'LICENSE',
  'README.md',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'apps/api/dist/index.js',
  'apps/api/package.json',
  'apps/web/dist/index.html',
  'apps/web/package.json',
  'docs/DEPLOYMENT.md',
  'docs/KNOWN_ISSUES.md',
  'docs/ROLLBACK.md',
  'docs/SECURITY.md',
  'fixtures/incidents/removed-schema-column.json',
  'fixtures/metadata/removed-schema-column.json',
  'packages/agent-core/package.json',
  'packages/agent-core/src/index.ts',
  'packages/datahub-client/package.json',
  'packages/datahub-client/src/index.ts',
  'packages/shared-types/package.json',
  'packages/shared-types/src/index.ts',
  'scripts/verify-release-artifact.mjs',
];
const exactDependencyManifests = [
  'apps/api/package.json',
  'apps/web/package.json',
  'package.json',
  'packages/agent-core/package.json',
  'packages/datahub-client/package.json',
  'packages/shared-types/package.json',
].sort();

function fail(message) {
  throw new Error(`Release artifact verification failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function isSafeReleasePath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('/') ||
    /^[A-Za-z]:/.test(value)
  ) {
    return false;
  }

  const segments = value.split('/');
  return segments.every((segment) => {
    const lowerSegment = segment.toLowerCase();
    return (
      segment.length > 0 &&
      segment !== '.' &&
      segment !== '..' &&
      !forbiddenPathSegments.has(lowerSegment) &&
      (lowerSegment === '.env.example' || !lowerSegment.startsWith('.env')) &&
      !lowerSegment.endsWith('.log') &&
      !lowerSegment.endsWith('.map') &&
      !lowerSegment.endsWith('.tsbuildinfo')
    );
  });
}

function isAllowedPayloadPath(filePath) {
  if (requiredStaticFiles.includes(filePath)) return true;
  if (filePath.startsWith('apps/api/dist/')) return filePath.endsWith('.js');
  if (filePath.startsWith('apps/web/dist/')) return true;
  return [
    'packages/agent-core/src/',
    'packages/datahub-client/src/',
    'packages/shared-types/src/',
  ].some((prefix) => filePath.startsWith(prefix) && filePath.endsWith('.ts'));
}

function readTarString(header, offset, length) {
  const field = header.subarray(offset, offset + length);
  const nullIndex = field.indexOf(0);
  return field.subarray(0, nullIndex === -1 ? field.length : nullIndex).toString('utf8');
}

function readTarOctal(header, offset, length, label) {
  const value = readTarString(header, offset, length).trim();
  assert(/^[0-7]+$/.test(value), `${label} is not canonical octal`);
  return Number.parseInt(value, 8);
}

function tarChecksum(header) {
  let total = 0;
  for (let index = 0; index < header.length; index += 1) {
    total += index >= 148 && index < 156 ? 32 : header[index];
  }
  return total;
}

function isZeroBlock(block) {
  return block.every((byte) => byte === 0);
}

export function parseReleaseArchive(archiveBuffer) {
  assert(archiveBuffer.length >= 18, 'gzip archive is truncated');
  assert(archiveBuffer.length <= maxArchiveBytes, 'gzip archive exceeds the 25 MiB limit');
  assert(archiveBuffer[0] === 0x1f && archiveBuffer[1] === 0x8b, 'archive is not gzip');
  assert(archiveBuffer[2] === 8, 'gzip compression method is not deflate');
  assert(archiveBuffer[3] === 0, 'gzip flags are not canonical');
  assert(
    archiveBuffer.subarray(4, 8).every((byte) => byte === 0),
    'gzip mtime is not zero',
  );
  assert(archiveBuffer[8] === 2, 'gzip compression-level marker is not canonical');
  assert(archiveBuffer[9] === 255, 'gzip operating-system byte is not canonical');

  let tarBuffer;
  try {
    tarBuffer = gunzipSync(archiveBuffer);
  } catch {
    fail('gzip payload cannot be decompressed');
  }

  assert(tarBuffer.length % 512 === 0, 'tar payload is not block aligned');
  assert(tarBuffer.length <= maxPayloadBytes, 'tar payload exceeds the 50 MiB limit');
  const entries = new Map();
  let offset = 0;
  let sawTrailer = false;
  let priorEntryName = '';

  while (offset < tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    assert(header.length === 512, 'tar header is truncated');
    if (isZeroBlock(header)) {
      const secondTrailer = tarBuffer.subarray(offset + 512, offset + 1024);
      assert(
        secondTrailer.length === 512 && isZeroBlock(secondTrailer),
        'tar trailer is incomplete',
      );
      assert(isZeroBlock(tarBuffer.subarray(offset)), 'tar has data after its trailer');
      sawTrailer = true;
      break;
    }

    const name = readTarString(header, 0, 100);
    const storedChecksum = readTarOctal(header, 148, 8, `${name || 'unnamed entry'} checksum`);
    assert(tarChecksum(header) === storedChecksum, `${name || 'unnamed entry'} checksum mismatch`);
    assert(isSafeReleasePath(name), `unsafe or forbidden archive path ${JSON.stringify(name)}`);
    assert(!entries.has(name), `duplicate archive path ${name}`);
    assert(name > priorEntryName, 'archive entries are not uniquely sorted');
    assert(entries.size < maxPayloadFiles, 'archive exceeds the 500-file limit');
    assert(readTarOctal(header, 100, 8, `${name} mode`) === 0o644, `${name} mode is not 0644`);
    assert(readTarOctal(header, 108, 8, `${name} uid`) === 0, `${name} uid is not zero`);
    assert(readTarOctal(header, 116, 8, `${name} gid`) === 0, `${name} gid is not zero`);
    const size = readTarOctal(header, 124, 12, `${name} size`);
    assert(readTarOctal(header, 136, 12, `${name} mtime`) === 0, `${name} mtime is not zero`);
    const type = String.fromCharCode(header[156]);
    assert(type === '0' || header[156] === 0, `${name} is not a regular file`);
    assert(readTarString(header, 257, 6) === 'ustar', `${name} lacks the ustar marker`);
    assert(readTarString(header, 263, 2) === '00', `${name} has a non-canonical ustar version`);
    assert(readTarString(header, 265, 32) === '', `${name} uname is not empty`);
    assert(readTarString(header, 297, 32) === '', `${name} gname is not empty`);
    assert(readTarString(header, 157, 100) === '', `${name} link name is not empty`);
    assert(readTarString(header, 345, 155) === '', `${name} ustar prefix is not empty`);

    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    assert(contentEnd <= tarBuffer.length, `${name} content is truncated`);
    entries.set(name, Buffer.from(tarBuffer.subarray(contentStart, contentEnd)));
    priorEntryName = name;
    offset = contentStart + Math.ceil(size / 512) * 512;
  }

  assert(sawTrailer, 'tar trailer is missing');
  assert(entries.size > 1, 'archive does not contain a release payload');
  return entries;
}

function exactKeys(value, expected, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys are not canonical`);
}

function parseManifest(buffer) {
  let manifest;
  try {
    manifest = JSON.parse(buffer.toString('utf8'));
  } catch {
    fail(`${manifestName} is not valid JSON`);
  }

  exactKeys(
    manifest,
    [
      'artifact',
      'dependencyInventory',
      'files',
      'product',
      'runtime',
      'schemaVersion',
      'source',
      'toolchain',
    ],
    manifestName,
  );
  assert(manifest.schemaVersion === 1, 'unsupported manifest schemaVersion');
  exactKeys(manifest.product, ['name', 'version'], 'manifest product');
  assert(manifest.product.name === 'data-incident-investigator', 'unexpected product name');
  assert(semverPattern.test(manifest.product.version), 'product version is not SemVer');
  exactKeys(manifest.source, ['commit', 'tree'], 'manifest source');
  assert(commitPattern.test(manifest.source.commit), 'source commit is not a full lowercase SHA');
  assert(commitPattern.test(manifest.source.tree), 'source tree is not a full lowercase SHA');
  exactKeys(manifest.artifact, ['fileName', 'format', 'rootDirectory'], 'manifest artifact');
  assert(manifest.artifact.format === 'tar+gzip', 'unexpected archive format');
  exactKeys(manifest.toolchain, ['node', 'pnpm'], 'manifest toolchain');
  assert(manifest.toolchain.node === '24.14.0', 'unexpected build Node version');
  assert(manifest.toolchain.pnpm === '11.9.0', 'unexpected build pnpm version');
  exactKeys(
    manifest.runtime,
    ['defaultMode', 'node', 'state', 'supportedModes', 'target', 'webApiBasePath'],
    'manifest runtime',
  );
  assert(manifest.runtime.node === '>=24', 'unexpected runtime Node contract');
  assert(manifest.runtime.target === 'generic-node-host', 'unexpected deployment target');
  assert(manifest.runtime.defaultMode === 'fixture', 'unexpected default mode');
  assert(
    JSON.stringify(manifest.runtime.supportedModes) === JSON.stringify(['fixture', 'datahub']),
    'unexpected supported modes',
  );
  assert(manifest.runtime.state === 'process-local', 'unexpected state contract');
  assert(manifest.runtime.webApiBasePath === '/api', 'unexpected web API base path');
  exactKeys(
    manifest.dependencyInventory,
    ['lockfile', 'lockfileSha256', 'manifests'],
    'manifest dependencyInventory',
  );
  assert(manifest.dependencyInventory.lockfile === 'pnpm-lock.yaml', 'unexpected lockfile path');
  assert(
    sha256Pattern.test(manifest.dependencyInventory.lockfileSha256),
    'invalid lockfile SHA-256',
  );
  assert(
    Array.isArray(manifest.dependencyInventory.manifests),
    'manifest inventory must be an array',
  );
  assert(
    JSON.stringify(manifest.dependencyInventory.manifests) ===
      JSON.stringify(exactDependencyManifests),
    'dependency manifest inventory is not canonical',
  );
  assert(
    Array.isArray(manifest.files) && manifest.files.length > 0,
    'manifest files must be nonempty',
  );

  let priorPath = '';
  for (const file of manifest.files) {
    exactKeys(file, ['path', 'sha256', 'size'], `manifest file ${JSON.stringify(file?.path)}`);
    assert(
      isSafeReleasePath(file.path),
      `unsafe or forbidden manifest path ${JSON.stringify(file.path)}`,
    );
    assert(
      isAllowedPayloadPath(file.path),
      `manifest path is outside the release allowlist: ${file.path}`,
    );
    assert(file.path !== manifestName, `${manifestName} cannot hash itself`);
    assert(file.path > priorPath, 'manifest files are not uniquely sorted');
    assert(Number.isSafeInteger(file.size) && file.size >= 0, `${file.path} has invalid size`);
    assert(sha256Pattern.test(file.sha256), `${file.path} has invalid SHA-256`);
    priorPath = file.path;
  }

  let priorManifest = '';
  for (const manifestPath of manifest.dependencyInventory.manifests) {
    assert(isSafeReleasePath(manifestPath), `unsafe dependency manifest path ${manifestPath}`);
    assert(
      manifestPath.endsWith('package.json'),
      `dependency manifest is not package.json: ${manifestPath}`,
    );
    assert(manifestPath > priorManifest, 'dependency manifests are not uniquely sorted');
    priorManifest = manifestPath;
  }

  assert(
    buffer.equals(Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8')),
    `${manifestName} formatting is not canonical`,
  );

  return manifest;
}

function validateReleaseFiles(files, manifest, context) {
  const expected = new Set(manifest.files.map((file) => file.path));
  expected.add(manifestName);
  assert(files.size === expected.size, `${context} file count differs from manifest`);

  for (const pathName of files.keys()) {
    assert(expected.has(pathName), `${context} contains unexpected file ${pathName}`);
  }

  for (const file of manifest.files) {
    const content = files.get(file.path);
    assert(content !== undefined, `${context} is missing ${file.path}`);
    assert(content.length === file.size, `${file.path} size mismatch`);
    assert(sha256(content) === file.sha256, `${file.path} SHA-256 mismatch`);
  }
  for (const requiredPath of requiredStaticFiles) {
    assert(files.has(requiredPath), `${context} is missing required file ${requiredPath}`);
  }

  const rootManifest = files.get('package.json');
  assert(rootManifest, 'root package.json is missing');
  let rootPackage;
  try {
    rootPackage = JSON.parse(rootManifest.toString('utf8'));
  } catch {
    fail('root package.json is invalid JSON');
  }
  assert(rootPackage.name === manifest.product.name, 'root package name differs from manifest');
  assert(
    rootPackage.version === manifest.product.version,
    'root package version differs from manifest',
  );
  assert(rootPackage.packageManager === `pnpm@${manifest.toolchain.pnpm}`, 'pnpm version differs');
  const lockfile = files.get(manifest.dependencyInventory.lockfile);
  assert(lockfile, 'dependency lockfile is missing');
  assert(
    sha256(lockfile) === manifest.dependencyInventory.lockfileSha256,
    'dependency lockfile SHA-256 differs from inventory',
  );
  const environmentExample = files.get('.env.example');
  assert(environmentExample, '.env.example is missing');
  const environmentText = environmentExample.toString('utf8');
  for (const credentialName of [
    'DATAHUB_GMS_URL',
    'DATAHUB_TOKEN',
    'OPENAI_API_KEY',
    'STITCH_API_KEY',
  ]) {
    assert(
      new RegExp(`^${credentialName}=$`, 'm').test(environmentText),
      `.env.example must keep ${credentialName} blank`,
    );
  }
  for (const manifestPath of manifest.dependencyInventory.manifests) {
    const packageBuffer = files.get(manifestPath);
    assert(packageBuffer, `dependency manifest is missing: ${manifestPath}`);
    let packageManifest;
    try {
      packageManifest = JSON.parse(packageBuffer.toString('utf8'));
    } catch {
      fail(`dependency manifest is invalid JSON: ${manifestPath}`);
    }
    assert(packageManifest.private === true, `dependency manifest is not private: ${manifestPath}`);
    assert(
      packageManifest.version === manifest.product.version,
      `dependency manifest version differs: ${manifestPath}`,
    );
  }
}

function validateIdentity(manifest, expected = {}) {
  const nameMatch = artifactNamePattern.exec(manifest.artifact.fileName);
  assert(nameMatch, 'artifact filename is not canonical');
  assert(
    nameMatch.groups.version === manifest.product.version,
    'filename version differs from manifest',
  );
  assert(
    nameMatch.groups.commit === manifest.source.commit.slice(0, 12),
    'filename commit differs from manifest',
  );
  assert(
    manifest.artifact.rootDirectory === manifest.artifact.fileName.replace(/\.tar\.gz$/, ''),
    'root directory differs from artifact filename',
  );
  if (expected.commit !== undefined) {
    assert(
      manifest.source.commit === expected.commit,
      'source commit differs from expected commit',
    );
  }
  if (expected.version !== undefined) {
    assert(
      manifest.product.version === expected.version,
      'product version differs from expected version',
    );
  }
}

export async function verifyArtifact(artifactPath, expected = {}) {
  const resolvedArtifact = path.resolve(artifactPath);
  const archiveBuffer = await readFile(resolvedArtifact);
  const sidecarPath = `${resolvedArtifact}.sha256`;
  const sidecar = await readFile(sidecarPath, 'utf8');
  const expectedSidecar = `${sha256(archiveBuffer)}  ${path.basename(resolvedArtifact)}\n`;
  assert(sidecar === expectedSidecar, 'SHA-256 sidecar does not match archive bytes and filename');

  const archivedEntries = parseReleaseArchive(archiveBuffer);
  const roots = new Set([...archivedEntries.keys()].map((entry) => entry.split('/')[0]));
  assert(roots.size === 1, 'archive must contain exactly one root directory');
  const [rootDirectory] = roots;
  const relativeFiles = new Map();
  for (const [entryPath, content] of archivedEntries) {
    assert(entryPath.startsWith(`${rootDirectory}/`), `archive entry escapes root: ${entryPath}`);
    relativeFiles.set(entryPath.slice(rootDirectory.length + 1), content);
  }

  const manifestBuffer = relativeFiles.get(manifestName);
  assert(manifestBuffer, `${manifestName} is missing`);
  const manifest = parseManifest(manifestBuffer);
  assert(
    path.basename(resolvedArtifact) === manifest.artifact.fileName,
    'archive filename differs from manifest',
  );
  assert(rootDirectory === manifest.artifact.rootDirectory, 'archive root differs from manifest');
  validateIdentity(manifest, expected);
  validateReleaseFiles(relativeFiles, manifest, 'archive');
  return {
    archiveSha256: sha256(archiveBuffer),
    fileCount: relativeFiles.size,
    manifest,
    sidecarPath,
  };
}

async function listDirectoryFiles(root, relative = '') {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = new Map();
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    assert(isSafeReleasePath(childRelative), `unsafe or forbidden extracted path ${childRelative}`);
    if (entry.isSymbolicLink()) fail(`extracted path is a symbolic link: ${childRelative}`);
    if (entry.isDirectory()) {
      const descendants = await listDirectoryFiles(root, childRelative);
      for (const [filePath, content] of descendants) files.set(filePath, content);
    } else if (entry.isFile()) {
      files.set(childRelative, await readFile(path.join(root, ...childRelative.split('/'))));
    } else {
      fail(`extracted path is not a regular file: ${childRelative}`);
    }
  }
  return files;
}

export async function verifyDirectory(directoryPath, expected = {}) {
  const resolvedDirectory = path.resolve(directoryPath);
  assert((await stat(resolvedDirectory)).isDirectory(), 'verification path is not a directory');
  const files = await listDirectoryFiles(resolvedDirectory);
  const manifestBuffer = files.get(manifestName);
  assert(manifestBuffer, `${manifestName} is missing`);
  const manifest = parseManifest(manifestBuffer);
  assert(
    path.basename(resolvedDirectory) === manifest.artifact.rootDirectory,
    'directory name differs from manifest',
  );
  validateIdentity(manifest, expected);
  validateReleaseFiles(files, manifest, 'directory');
  return { fileCount: files.size, manifest };
}

function parseArguments(argv) {
  const values = argv.filter((argument) => argument !== '--');
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    const value = values[index + 1];
    if (
      !['--artifact', '--directory', '--expected-commit', '--expected-version'].includes(key) ||
      !value
    ) {
      fail(`unsupported or incomplete argument ${key ?? '<missing>'}`);
    }
    assert(options[key.slice(2)] === undefined, `duplicate argument ${key}`);
    options[key.slice(2)] = value;
    index += 1;
  }
  assert(
    Boolean(options.artifact) !== Boolean(options.directory),
    'provide exactly one of --artifact or --directory',
  );
  if (options['expected-commit'] !== undefined) {
    assert(
      commitPattern.test(options['expected-commit']),
      '--expected-commit must be 40 lowercase hex characters',
    );
  }
  if (options['expected-version'] !== undefined) {
    assert(semverPattern.test(options['expected-version']), '--expected-version must be SemVer');
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const expected = { commit: options['expected-commit'], version: options['expected-version'] };
  const result = options.artifact
    ? await verifyArtifact(options.artifact, expected)
    : await verifyDirectory(options.directory, expected);
  console.log(
    JSON.stringify({
      artifact: result.manifest.artifact.fileName,
      commit: result.manifest.source.commit,
      files: result.fileCount,
      ...(result.archiveSha256 ? { sha256: result.archiveSha256 } : {}),
      status: 'verified',
      version: result.manifest.product.version,
    }),
  );
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (entryPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Release artifact verification failed.');
    process.exitCode = 1;
  });
}
