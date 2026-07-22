import { execFileSync, spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { isSafeReleasePath, sha256 } from './verify-release-artifact.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedNodeVersion = '24.14.0';
const expectedPnpmVersion = '11.9.0';
const outputDirectory = 'outputs/release';
const manifestName = 'RELEASE-MANIFEST.json';
const packageManifestPaths = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/agent-core/package.json',
  'packages/datahub-client/package.json',
  'packages/evaluation/package.json',
  'packages/shared-types/package.json',
];
const includedDependencyManifests = packageManifestPaths.filter(
  (manifestPath) => manifestPath !== 'packages/evaluation/package.json',
);
const staticFiles = [
  '.env.example',
  'LICENSE',
  'README.md',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/agent-core/package.json',
  'packages/datahub-client/package.json',
  'packages/shared-types/package.json',
  'docs/DEPLOYMENT.md',
  'docs/KNOWN_ISSUES.md',
  'docs/ROLLBACK.md',
  'docs/SECURITY.md',
  'fixtures/incidents/removed-schema-column.json',
  'fixtures/metadata/removed-schema-column.json',
  'scripts/verify-release-artifact.mjs',
];
const directorySelections = [
  { directory: 'apps/api/dist', include: (filePath) => filePath.endsWith('.js') },
  { directory: 'apps/web/dist', include: () => true },
  { directory: 'packages/agent-core/src', include: (filePath) => filePath.endsWith('.ts') },
  { directory: 'packages/datahub-client/src', include: (filePath) => filePath.endsWith('.ts') },
  { directory: 'packages/shared-types/src', include: (filePath) => filePath.endsWith('.ts') },
];

function fail(message) {
  throw new Error(`Release artifact build failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function git(...arguments_) {
  return execFileSync('git', arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function pnpmCommand(arguments_, options = {}) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath
    ? process.execPath
    : process.platform === 'win32'
      ? 'pnpm.cmd'
      : 'pnpm';
  const commandArguments = npmExecPath ? [npmExecPath, ...arguments_] : arguments_;
  const result = spawnSync(command, commandArguments, {
    cwd: repositoryRoot,
    encoding: options.capture ? 'utf8' : undefined,
    env: { ...process.env, VITE_API_BASE_URL: '/api' },
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) fail(`could not run pnpm: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = options.capture ? String(result.stderr || result.stdout || '').trim() : '';
    fail(`pnpm ${arguments_.join(' ')} exited ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  return options.capture ? String(result.stdout).trim() : '';
}

async function readJson(relativePath) {
  try {
    return JSON.parse(
      await readFile(path.join(repositoryRoot, ...relativePath.split('/')), 'utf8'),
    );
  } catch {
    fail(`${relativePath} is not valid JSON`);
  }
}

async function collectFiles(relativeDirectory, include) {
  const absoluteDirectory = path.join(repositoryRoot, ...relativeDirectory.split('/'));
  const directoryStat = await stat(absoluteDirectory);
  assert(directoryStat.isDirectory(), `${relativeDirectory} is not a directory`);
  const collected = [];

  async function walk(currentRelative) {
    const currentAbsolute = path.join(repositoryRoot, ...currentRelative.split('/'));
    const entries = await readdir(currentAbsolute, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    )) {
      const child = `${currentRelative}/${entry.name}`;
      if (entry.isSymbolicLink()) fail(`symbolic links are not allowed: ${child}`);
      if (entry.isDirectory()) {
        await walk(child);
      } else if (entry.isFile()) {
        if (include(child)) collected.push(child);
      } else {
        fail(`non-regular build output is not allowed: ${child}`);
      }
    }
  }

  await walk(relativeDirectory);
  return collected;
}

function writeAscii(buffer, value, offset, length, label) {
  const encoded = Buffer.from(value, 'ascii');
  assert(encoded.length <= length, `${label} exceeds tar field width`);
  encoded.copy(buffer, offset);
}

function writeOctal(buffer, value, offset, length, label) {
  const encoded = value.toString(8).padStart(length - 1, '0');
  assert(encoded.length === length - 1, `${label} exceeds tar field width`);
  writeAscii(buffer, `${encoded}\0`, offset, length, label);
}

function tarHeader(name, size) {
  const header = Buffer.alloc(512);
  assert(Buffer.byteLength(name, 'utf8') <= 100, `archive path is too long for ustar: ${name}`);
  writeAscii(header, name, 0, 100, `${name} path`);
  writeOctal(header, 0o644, 100, 8, `${name} mode`);
  writeOctal(header, 0, 108, 8, `${name} uid`);
  writeOctal(header, 0, 116, 8, `${name} gid`);
  writeOctal(header, size, 124, 12, `${name} size`);
  writeOctal(header, 0, 136, 12, `${name} mtime`);
  header.fill(0x20, 148, 156);
  header[156] = '0'.charCodeAt(0);
  writeAscii(header, 'ustar\0', 257, 6, `${name} magic`);
  writeAscii(header, '00', 263, 2, `${name} version`);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  const checksumValue = checksum.toString(8).padStart(6, '0');
  assert(checksumValue.length === 6, `${name} checksum exceeds tar field width`);
  writeAscii(header, `${checksumValue}\0 `, 148, 8, `${name} checksum`);
  return header;
}

function createTar(entries) {
  const chunks = [];
  for (const [entryPath, content] of entries) {
    chunks.push(tarHeader(entryPath, content.length), content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) chunks.push(Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
}

async function ensureAbsent(relativePath) {
  try {
    await access(path.join(repositoryRoot, ...relativePath.split('/')), constants.F_OK);
    fail(`${relativePath} already exists; refuse to overwrite an artifact`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Release artifact build failed:'))
      throw error;
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
  }
}

async function main() {
  assert(process.versions.node === expectedNodeVersion, `Node ${expectedNodeVersion} is required`);
  const pnpmVersion = pnpmCommand(['--version'], { capture: true });
  assert(pnpmVersion === expectedPnpmVersion, `pnpm ${expectedPnpmVersion} is required`);

  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  assert(status === '', 'the Git worktree must be clean before the release build');
  const commit = git('rev-parse', '--verify', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  assert(/^[0-9a-f]{40}$/.test(commit), 'HEAD is not a full lowercase commit SHA');
  assert(/^[0-9a-f]{40}$/.test(tree), 'HEAD tree is not a full lowercase SHA');

  const manifests = await Promise.all(
    packageManifestPaths.map(async (manifestPath) => ({
      manifestPath,
      value: await readJson(manifestPath),
    })),
  );
  const rootPackage = manifests[0].value;
  assert(rootPackage.name === 'data-incident-investigator', 'unexpected root package name');
  assert(rootPackage.private === true, 'root package must remain private');
  assert(
    rootPackage.packageManager === `pnpm@${expectedPnpmVersion}`,
    'root pnpm version is not pinned',
  );
  assert(rootPackage.engines?.node === '>=24', 'root Node runtime contract changed unexpectedly');
  assert(
    manifests.every(({ value }) => value.private === true && value.version === rootPackage.version),
    'all seven private manifest versions must be aligned',
  );

  const artifactStem = `${rootPackage.name}-v${rootPackage.version}-${commit.slice(0, 12)}`;
  const artifactFileName = `${artifactStem}.tar.gz`;
  const artifactRelativePath = `${outputDirectory}/${artifactFileName}`;
  const sidecarRelativePath = `${artifactRelativePath}.sha256`;
  await ensureAbsent(artifactRelativePath);
  await ensureAbsent(sidecarRelativePath);

  console.log('Building release inputs with VITE_API_BASE_URL=/api');
  pnpmCommand(['build']);

  await access(path.join(repositoryRoot, 'apps/api/dist/index.js'), constants.R_OK);
  await access(path.join(repositoryRoot, 'apps/web/dist/index.html'), constants.R_OK);
  const selectedPaths = new Set(staticFiles);
  for (const selection of directorySelections) {
    for (const filePath of await collectFiles(selection.directory, selection.include)) {
      selectedPaths.add(filePath);
    }
  }

  const sortedPaths = [...selectedPaths].sort();
  assert(sortedPaths.length === selectedPaths.size, 'release file selection contains duplicates');
  assert(sortedPaths.length < 500, 'release file selection exceeds the 500-file limit');
  assert(sortedPaths.every(isSafeReleasePath), 'release file selection contains an unsafe path');
  assert(
    sortedPaths.includes('apps/api/dist/index.js'),
    'API entrypoint is missing from selection',
  );
  assert(
    sortedPaths.includes('apps/web/dist/index.html'),
    'web entrypoint is missing from selection',
  );
  assert(
    !sortedPaths.some((filePath) => filePath.endsWith('.map')),
    'source maps must not be packaged',
  );

  const files = new Map();
  for (const relativePath of sortedPaths) {
    files.set(relativePath, await readFile(path.join(repositoryRoot, ...relativePath.split('/'))));
  }
  const lockfile = files.get('pnpm-lock.yaml');
  assert(lockfile, 'pnpm-lock.yaml is missing from selection');

  const manifest = {
    schemaVersion: 1,
    product: { name: rootPackage.name, version: rootPackage.version },
    source: { commit, tree },
    artifact: {
      fileName: artifactFileName,
      format: 'tar+gzip',
      rootDirectory: artifactStem,
    },
    toolchain: { node: expectedNodeVersion, pnpm: expectedPnpmVersion },
    runtime: {
      node: rootPackage.engines.node,
      target: 'generic-node-host',
      defaultMode: 'fixture',
      supportedModes: ['fixture', 'datahub'],
      state: 'process-local',
      webApiBasePath: '/api',
    },
    dependencyInventory: {
      lockfile: 'pnpm-lock.yaml',
      lockfileSha256: sha256(lockfile),
      manifests: [...includedDependencyManifests].sort(),
    },
    files: sortedPaths.map((relativePath) => {
      const content = files.get(relativePath);
      return { path: relativePath, sha256: sha256(content), size: content.length };
    }),
  };
  const manifestBuffer = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  files.set(manifestName, manifestBuffer);

  const archiveEntries = [...files.entries()]
    .map(([relativePath, content]) => [`${artifactStem}/${relativePath}`, content])
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const tarBuffer = createTar(archiveEntries);
  assert(tarBuffer.length <= 50 * 1024 * 1024, 'tar payload exceeds the 50 MiB limit');
  const archiveBuffer = gzipSync(tarBuffer, { level: 9, mtime: 0 });
  archiveBuffer[3] = 0;
  archiveBuffer.fill(0, 4, 8);
  archiveBuffer[8] = 2;
  archiveBuffer[9] = 255;
  assert(archiveBuffer.length <= 25 * 1024 * 1024, 'gzip archive exceeds the 25 MiB limit');
  const archiveSha256 = sha256(archiveBuffer);

  await mkdir(path.join(repositoryRoot, ...outputDirectory.split('/')), { recursive: true });
  await writeFile(path.join(repositoryRoot, ...artifactRelativePath.split('/')), archiveBuffer, {
    flag: 'wx',
  });
  await writeFile(
    path.join(repositoryRoot, ...sidecarRelativePath.split('/')),
    `${archiveSha256}  ${artifactFileName}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );

  console.log(
    JSON.stringify({
      artifact: artifactRelativePath,
      commit,
      files: files.size,
      sha256: archiveSha256,
      sidecar: sidecarRelativePath,
      tree,
      version: rootPackage.version,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Release artifact build failed.');
  process.exitCode = 1;
});
