import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createBundleAttribution, readRawBundleAttribution } from './bundle-attribution.mjs';
import {
  parsePnpmLockGraph,
  parsePnpmSnapshotKey,
  resolvePnpmPackageRootIdentity,
} from './pnpm-lock-identity.mjs';
import { createRuntimeManifest, runtimeManifestPaths } from './prepare-runtime-manifests.mjs';
import {
  assertCanonicalContainedPath,
  assertCanonicalRoot,
  assertCanonicalStandalonePath,
  assertUniquePortablePaths,
  isPortableRelativePath,
} from './release-path-safety.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const attributionFileName = 'RUNTIME-ATTRIBUTION.json';
const noticeFileName = 'THIRD_PARTY_NOTICES.txt';
const baseImage =
  'node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d';
export const runtimeOutputRoots = [
  'apps/api/dist',
  'apps/web/dist',
  'packages/agent-core/dist',
  'packages/datahub-client/dist',
  'packages/shared-types/dist',
];
const requiredLegalFilePaths = ['LICENSE', 'NOTICE', noticeFileName];
const legalFilePattern = /^(?:licen[cs]e|copying)(?:[._-].+)?$/i;
const noticeFilePattern = /^notice(?:[._-].+)?$/i;
const fallbackLegalEvidence = new Map([
  [
    'abstract-logging@2.0.1',
    {
      path: 'third_party_licenses/abstract-logging-2.0.1-MIT.txt',
      sourceUrl: 'http://jsumners.mit-license.org/',
      upstreamCommit: '80dfaef91ee87008f4ed2b6e78921d383bccd406',
    },
  ],
]);

function fail(message) {
  throw new Error(`Runtime attribution failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function portableRelative(root, absolutePath, label) {
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  assert(
    relative.length > 0 &&
      relative !== '..' &&
      !relative.startsWith('../') &&
      !path.isAbsolute(relative) &&
      isPortableRelativePath(relative),
    `${label} is outside its containment root`,
  );
  return relative;
}

async function containedPath(root, relativePath, label, type = 'file') {
  try {
    return await assertCanonicalContainedPath(root, relativePath, { label, type });
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      fail(`${label} is missing`);
    }
    fail(`${label} is unsafe: ${error instanceof Error ? error.message : 'unknown path error'}`);
  }
}

async function readContainedFile(root, relativePath, label) {
  return readFile(await containedPath(root, relativePath, label));
}

function fileEvidence(relativePath, buffer) {
  return {
    path: relativePath,
    sha256: sha256(buffer),
    size: buffer.length,
  };
}

function assertFileEvidence(entries, label) {
  assert(Array.isArray(entries) && entries.length > 0, `${label} must be a non-empty array`);
  assertUniquePortablePaths(
    entries.map((entry) => entry?.path),
    label,
  );
  for (const entry of entries) {
    assert(
      Number.isSafeInteger(entry.size) &&
        entry.size >= 0 &&
        typeof entry.sha256 === 'string' &&
        /^[0-9a-f]{64}$/.test(entry.sha256),
      `${label} contains invalid content evidence`,
    );
  }
  const sorted = [...entries].sort((left, right) => compareText(left.path, right.path));
  assert(JSON.stringify(entries) === JSON.stringify(sorted), `${label} must be sorted by path`);
}

async function verifyBoundFiles(root, expected, label) {
  assertFileEvidence(expected, label);
  for (const entry of expected) {
    const buffer = await readContainedFile(root, entry.path, `${label} ${entry.path}`);
    assert(
      buffer.length === entry.size && sha256(buffer) === entry.sha256,
      `${entry.path} content differs from attribution`,
    );
  }
}

function pnpm(arguments_) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath
    ? process.execPath
    : process.platform === 'win32'
      ? 'pnpm.cmd'
      : 'pnpm';
  const commandArguments = npmExecPath ? [npmExecPath, ...arguments_] : arguments_;
  const result = spawnSync(command, commandArguments, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) fail(`could not run pnpm: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    fail(`pnpm ${arguments_.join(' ')} exited ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  try {
    return JSON.parse(String(result.stdout));
  } catch {
    fail(`pnpm ${arguments_.join(' ')} did not return JSON`);
  }
}

export function collectExternalDependencies(projects) {
  assert(Array.isArray(projects), 'pnpm list output must be an array');
  const externalByPath = new Map();

  function visit(dependencies) {
    if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) return;
    for (const dependency of Object.values(dependencies)) {
      if (!dependency || typeof dependency !== 'object' || Array.isArray(dependency)) continue;
      if (
        typeof dependency.path === 'string' &&
        dependency.path.replaceAll('\\', '/').includes('/node_modules/.pnpm/') &&
        typeof dependency.version === 'string' &&
        !dependency.version.startsWith('link:')
      ) {
        const key = process.platform === 'win32' ? dependency.path.toLowerCase() : dependency.path;
        externalByPath.set(key, {
          path: dependency.path,
          version: dependency.version,
        });
      }
      visit(dependency.dependencies);
      visit(dependency.optionalDependencies);
    }
  }

  for (const project of projects) {
    visit(project?.dependencies);
    visit(project?.optionalDependencies);
  }
  return [...externalByPath.values()].sort((left, right) =>
    compareText(left.path.replaceAll('\\', '/'), right.path.replaceAll('\\', '/')),
  );
}

function productionList(allWorkspaces) {
  return pnpm(
    allWorkspaces
      ? ['-r', 'list', '--prod', '--depth', 'Infinity', '--json']
      : ['--filter', '@dii/api...', 'list', '--prod', '--depth', 'Infinity', '--json'],
  );
}

async function readCanonicalUtf8(absolutePath, label) {
  const buffer = await readFile(absolutePath);
  const text = buffer.toString('utf8');
  assert(Buffer.from(text, 'utf8').equals(buffer), `${label} is not canonical UTF-8`);
  assert(!text.includes('\0'), `${label} contains a NUL byte`);
  return { buffer, text };
}

async function readCanonicalContainedUtf8(root, relativePath, label) {
  return readCanonicalUtf8(await containedPath(root, relativePath, label), label);
}

async function packageEvidence(dependency, lockGraph, canonicalRepositoryRoot) {
  const requestedPackageRoot = path.resolve(dependency.path);
  const requestedPackageRootRelative = portableRelative(
    canonicalRepositoryRoot,
    requestedPackageRoot,
    'package root',
  );
  const packageRoot = await containedPath(
    canonicalRepositoryRoot,
    requestedPackageRootRelative,
    'package root',
    'directory',
  );
  const packageRootRelative = portableRelative(
    canonicalRepositoryRoot,
    packageRoot,
    'package root',
  );
  const frozen = resolvePnpmPackageRootIdentity(packageRootRelative, lockGraph);
  const packageManifestEvidence = await readCanonicalContainedUtf8(
    packageRoot,
    'package.json',
    `${frozen.lockSnapshot} package.json`,
  );
  let packageManifest;
  try {
    packageManifest = JSON.parse(packageManifestEvidence.text);
  } catch {
    fail(`${frozen.lockSnapshot} package.json is invalid JSON`);
  }
  assert(
    packageManifest.name === frozen.name && packageManifest.version === frozen.version,
    `${frozen.lockSnapshot} differs from its package manifest`,
  );
  assert(
    typeof packageManifest.license === 'string' && packageManifest.license.trim().length > 0,
    `${frozen.lockSnapshot} has no declared licence metadata`,
  );

  const names = await readdir(packageRoot);
  const licenseNames = names.filter((name) => legalFilePattern.test(name)).sort(compareText);
  const noticeNames = names.filter((name) => noticeFilePattern.test(name)).sort(compareText);
  const legalFiles = [];
  for (const [kind, selectedNames] of [
    ['license', licenseNames],
    ['notice', noticeNames],
  ]) {
    for (const fileName of selectedNames) {
      const evidence = await readCanonicalContainedUtf8(
        packageRoot,
        fileName,
        `${frozen.lockSnapshot}/${fileName}`,
      );
      legalFiles.push({
        kind,
        path: `${packageRootRelative}/${fileName}`,
        sha256: sha256(evidence.buffer),
        source: 'package',
        text: evidence.text,
      });
    }
  }

  const identity = `${frozen.name}@${frozen.version}`;
  if (licenseNames.length === 0) {
    const fallback = fallbackLegalEvidence.get(identity);
    assert(fallback, `${identity} has no packaged licence file or approved fallback`);
    const evidence = await readCanonicalContainedUtf8(
      canonicalRepositoryRoot,
      fallback.path,
      fallback.path,
    );
    legalFiles.unshift({
      kind: 'license',
      path: fallback.path,
      sha256: sha256(evidence.buffer),
      source: 'upstream-fallback',
      sourceUrl: fallback.sourceUrl,
      text: evidence.text,
      upstreamCommit: fallback.upstreamCommit,
    });
  }
  assert(
    legalFiles.some((legalFile) => legalFile.kind === 'license'),
    `${identity} has no licence evidence`,
  );

  return {
    declaredLicense: packageManifest.license.trim(),
    legalFiles,
    lockPackage: frozen.lockPackage,
    lockSnapshot: frozen.lockSnapshot,
    name: frozen.name,
    packageManifest: {
      path: `${packageRootRelative}/package.json`,
      sha256: sha256(packageManifestEvidence.buffer),
    },
    packageRoot: packageRootRelative,
    version: frozen.version,
  };
}

async function collectPackageEvidence(dependencies, lockGraph, canonicalRepositoryRoot) {
  return Promise.all(
    dependencies.map((dependency) =>
      packageEvidence(dependency, lockGraph, canonicalRepositoryRoot),
    ),
  ).then((packages) =>
    packages.sort(
      (left, right) =>
        compareText(left.name, right.name) ||
        compareText(left.version, right.version) ||
        compareText(left.packageRoot, right.packageRoot),
    ),
  );
}

export async function collectRuntimeFiles(rootPath = repositoryRoot) {
  const canonicalRoot = await assertCanonicalRoot(rootPath, 'runtime filesystem root');
  const files = [];

  async function walk(relativeDirectory) {
    const absoluteDirectory = await containedPath(
      canonicalRoot,
      relativeDirectory,
      `runtime output ${relativeDirectory}`,
      'directory',
    );
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
      const child = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        await containedPath(canonicalRoot, child, `runtime output ${child}`, 'directory');
        await walk(child);
      } else if (entry.isFile()) {
        const buffer = await readContainedFile(canonicalRoot, child, `runtime output ${child}`);
        files.push(fileEvidence(child, buffer));
      } else {
        fail(`runtime output contains a non-regular path: ${child}`);
      }
    }
  }

  for (const root of runtimeOutputRoots) await walk(root);
  return files.sort((left, right) => compareText(left.path, right.path));
}

async function collectRequiredLegalFiles(canonicalRepositoryRoot) {
  const evidence = [];
  for (const relativePath of requiredLegalFilePaths) {
    const buffer = await readContainedFile(
      canonicalRepositoryRoot,
      relativePath,
      `required legal file ${relativePath}`,
    );
    evidence.push(fileEvidence(relativePath, buffer));
  }
  return evidence.sort((left, right) => compareText(left.path, right.path));
}

async function collectRewrittenRuntimeManifests(canonicalRepositoryRoot) {
  const evidence = [];
  for (const manifestPath of runtimeManifestPaths) {
    const source = await readCanonicalContainedUtf8(
      canonicalRepositoryRoot,
      manifestPath,
      manifestPath,
    );
    let manifest;
    try {
      manifest = JSON.parse(source.text);
    } catch {
      fail(`${manifestPath} is invalid JSON`);
    }
    const runtimeManifest = Buffer.from(
      `${JSON.stringify(createRuntimeManifest(manifest, manifestPath), null, 2)}\n`,
      'utf8',
    );
    evidence.push(fileEvidence(manifestPath, runtimeManifest));
  }
  return evidence.sort((left, right) => compareText(left.path, right.path));
}

export async function verifyRuntimeFilesystemEvidence(rootPath, attribution) {
  const canonicalRoot = await assertCanonicalRoot(rootPath, 'runtime filesystem root');
  assert(
    attribution?.schemaVersion === 2 && attribution?.method === 'cloud-run-runtime-attribution-v2',
    'runtime attribution schema or method is unsupported',
  );
  assertFileEvidence(attribution.runtimeFiles, 'runtime files');
  assert(
    attribution.runtimeFiles.every((entry) =>
      runtimeOutputRoots.some((root) => entry.path === root || entry.path.startsWith(`${root}/`)),
    ),
    'runtime file evidence contains a path outside the approved output roots',
  );
  await verifyBoundFiles(canonicalRoot, attribution.requiredLegalFiles, 'required legal files');
  await verifyBoundFiles(
    canonicalRoot,
    attribution.runtimeWorkspaceManifests,
    'runtime workspace manifests',
  );
  const actualRuntimeFiles = await collectRuntimeFiles(canonicalRoot);
  assert(
    JSON.stringify(actualRuntimeFiles) === JSON.stringify(attribution.runtimeFiles),
    'runtime file set or content differs from attribution',
  );
  return actualRuntimeFiles;
}

function uniqueIdentities(packages) {
  return [...new Set(packages.map((entry) => `${entry.name}@${entry.version}`))].sort(compareText);
}

function distinctNames(identities) {
  return new Set(identities.map((identity) => identity.slice(0, identity.lastIndexOf('@')))).size;
}

function packageIdentityFromLockKey(packageKey) {
  const parsed = parsePnpmSnapshotKey(packageKey);
  return `${parsed.name}@${parsed.version}`;
}

async function assertDockerfilePin(canonicalRepositoryRoot) {
  const dockerfile = (
    await readCanonicalContainedUtf8(canonicalRepositoryRoot, 'Dockerfile', 'Dockerfile')
  ).text;
  const fromLines = dockerfile
    .split('\n')
    .filter((line) => line.startsWith('FROM '))
    .map((line) => line.split(/\s+/)[1]);
  assert(fromLines.length >= 2, 'Dockerfile must use at least two pinned Node stages');
  assert(
    fromLines.every((image) => image === baseImage),
    'every Dockerfile stage must use the approved immutable Node image',
  );
}

async function buildAttribution(bundleProvenancePath) {
  const canonicalRepositoryRoot = await assertCanonicalRoot(repositoryRoot, 'repository root');
  await assertCanonicalStandalonePath(bundleProvenancePath, {
    label: 'bundle provenance',
    type: 'file',
  });
  await assertDockerfilePin(canonicalRepositoryRoot);
  const lockfileEvidence = await readCanonicalContainedUtf8(
    canonicalRepositoryRoot,
    'pnpm-lock.yaml',
    'pnpm-lock.yaml',
  );
  const lockGraph = parsePnpmLockGraph(lockfileEvidence.text);
  const allProductionDependencies = collectExternalDependencies(productionList(true));
  const runtimeDependencies = collectExternalDependencies(productionList(false));
  const [runtimePackages, bundledWeb, runtimeFiles, requiredLegalFiles, runtimeWorkspaceManifests] =
    await Promise.all([
      collectPackageEvidence(runtimeDependencies, lockGraph, canonicalRepositoryRoot),
      createBundleAttribution(
        readRawBundleAttribution(bundleProvenancePath),
        canonicalRepositoryRoot,
      ),
      collectRuntimeFiles(canonicalRepositoryRoot),
      collectRequiredLegalFiles(canonicalRepositoryRoot),
      collectRewrittenRuntimeManifests(canonicalRepositoryRoot),
    ]);
  const allProductionPackages = await collectPackageEvidence(
    allProductionDependencies,
    lockGraph,
    canonicalRepositoryRoot,
  );
  const allProductionIdentities = uniqueIdentities(allProductionPackages);
  const runtimeIdentities = uniqueIdentities(runtimePackages);
  const lockIdentities = [...lockGraph.packages].map(packageIdentityFromLockKey).sort(compareText);

  return {
    schemaVersion: 2,
    method: 'cloud-run-runtime-attribution-v2',
    baseImage,
    lockfile: {
      path: 'pnpm-lock.yaml',
      sha256: sha256(lockfileEvidence.buffer),
      packageEntries: lockGraph.packages.size,
      snapshotEntries: lockGraph.snapshotKeys.size,
      distinctPackageNames: distinctNames(lockIdentities),
    },
    fullProductionClosure: {
      packageIdentities: allProductionIdentities,
      packageIdentityCount: allProductionIdentities.length,
      distinctPackageNames: distinctNames(allProductionIdentities),
    },
    deployedRuntimeClosure: {
      packageIdentities: runtimeIdentities,
      packageIdentityCount: runtimeIdentities.length,
      distinctPackageNames: distinctNames(runtimeIdentities),
      packageRootCount: runtimePackages.length,
      packages: runtimePackages,
    },
    bundledWeb,
    runtimeFiles,
    requiredLegalFiles,
    runtimeWorkspaceManifests,
  };
}

function renderLegalFile(legalFile) {
  const text = legalFile.text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n*$/u, '\n');
  const provenance =
    legalFile.source === 'upstream-fallback'
      ? [
          `Evidence source: upstream fallback (${legalFile.path})`,
          `Upstream URL: ${legalFile.sourceUrl}`,
          `Exact upstream tag commit: ${legalFile.upstreamCommit}`,
        ]
      : [`Evidence source: installed package file (${legalFile.path})`];
  return [
    ...provenance,
    `Evidence SHA-256: ${legalFile.sha256}`,
    `----- BEGIN ${legalFile.kind.toUpperCase()} EVIDENCE -----`,
    text,
    `----- END ${legalFile.kind.toUpperCase()} EVIDENCE -----`,
  ].join('\n');
}

export function createRuntimeNotice(attribution) {
  const lines = [
    'DATA INCIDENT INVESTIGATOR — THIRD-PARTY ATTRIBUTION EVIDENCE',
    '',
    'Generated deterministically from the frozen pnpm graph, exact installed production closure,',
    'and exact Vite rendered-module provenance. It reproduces upstream legal evidence without',
    'adding compatibility conclusions or representing fallback evidence as npm-package content.',
    'Reproduced text is normalized to LF and trailing horizontal whitespace is removed; each',
    'recorded evidence SHA-256 binds the original installed/tracked source bytes.',
    '',
    `Lockfile SHA-256: ${attribution.lockfile.sha256}`,
    `Full production identities: ${attribution.fullProductionClosure.packageIdentityCount}`,
    `Deployed external runtime identities: ${attribution.deployedRuntimeClosure.packageIdentityCount}`,
    `Deployed external runtime package roots: ${attribution.deployedRuntimeClosure.packageRootCount}`,
    `Bundled web package identities: ${attribution.bundledWeb.packages.length}`,
  ];

  for (const [role, packages] of [
    ['BUNDLED WEB OUTPUT', attribution.bundledWeb.packages],
    ['EXTERNAL NODE RUNTIME', attribution.deployedRuntimeClosure.packages],
  ]) {
    for (const packageEntry of packages) {
      lines.push(
        '',
        '='.repeat(80),
        `${role}: ${packageEntry.name}@${packageEntry.version}`,
        `Declared licence metadata: ${packageEntry.declaredLicense}`,
        `Canonical package root: ${packageEntry.packageRoot}`,
        `Frozen lock package: ${packageEntry.lockPackage}`,
        `Frozen lock snapshot: ${packageEntry.lockSnapshot}`,
        `Package manifest: ${packageEntry.packageManifest.path}`,
        `Package manifest SHA-256: ${packageEntry.packageManifest.sha256}`,
      );
      if (role === 'BUNDLED WEB OUTPUT') {
        lines.push('Rendered bundle contributions:');
        for (const contribution of packageEntry.contributions) {
          lines.push(`- ${contribution.bundlePath}`);
          for (const module of contribution.modules) {
            lines.push(
              `  - ${module.path} | rendered bytes: ${module.renderedBytes} | source: ${module.sourcePath} | source SHA-256: ${module.sourceSha256}`,
            );
          }
        }
      }
      for (const legalFile of packageEntry.legalFiles) {
        lines.push('', renderLegalFile({ source: 'package', ...legalFile }));
      }
    }
  }
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

function canonicalManifest(attribution) {
  return Buffer.from(`${JSON.stringify(attribution, null, 2)}\n`, 'utf8');
}

async function readTrackedEvidence(rootPath = repositoryRoot) {
  const canonicalRoot = await assertCanonicalRoot(rootPath, 'runtime evidence root');
  const manifestBuffer = await readContainedFile(
    canonicalRoot,
    attributionFileName,
    attributionFileName,
  );
  let manifest;
  try {
    manifest = JSON.parse(manifestBuffer.toString('utf8'));
  } catch {
    fail(`${attributionFileName} is invalid JSON`);
  }
  assert(
    manifestBuffer.equals(canonicalManifest(manifest)),
    `${attributionFileName} is not canonical`,
  );
  const noticeBuffer = await readContainedFile(canonicalRoot, noticeFileName, noticeFileName);
  assert(
    noticeBuffer.equals(createRuntimeNotice(manifest)),
    `${noticeFileName} differs from its attribution manifest`,
  );
  return { canonicalRoot, manifest, manifestBuffer, noticeBuffer };
}

async function generate(bundleProvenancePath) {
  const canonicalRepositoryRoot = await assertCanonicalRoot(repositoryRoot, 'repository root');
  const attributionPath = await containedPath(
    canonicalRepositoryRoot,
    attributionFileName,
    attributionFileName,
  );
  const noticePath = await containedPath(canonicalRepositoryRoot, noticeFileName, noticeFileName);
  const originalNotice = await readFile(noticePath);
  const initialAttribution = await buildAttribution(bundleProvenancePath);
  const nextNotice = createRuntimeNotice(initialAttribution);

  try {
    await writeFile(noticePath, nextNotice);
    const attribution = await buildAttribution(bundleProvenancePath);
    assert(
      nextNotice.equals(createRuntimeNotice(attribution)),
      `${noticeFileName} did not converge during generation`,
    );
    await writeFile(attributionPath, canonicalManifest(attribution));
    return attribution;
  } catch (error) {
    try {
      await writeFile(noticePath, originalNotice);
    } catch (rollbackError) {
      fail(
        `${noticeFileName} generation failed and rollback also failed: ${
          rollbackError instanceof Error ? rollbackError.message : 'unknown rollback error'
        }`,
      );
    }
    throw error;
  }
}

async function verifySource(bundleProvenancePath) {
  const expected = await buildAttribution(bundleProvenancePath);
  const tracked = await readTrackedEvidence();
  assert(
    tracked.manifestBuffer.equals(canonicalManifest(expected)),
    `${attributionFileName} is stale for the current source/build/lock graph`,
  );
  return expected;
}

async function verifyRuntime() {
  const tracked = await readTrackedEvidence();
  const lockfile = await readContainedFile(
    tracked.canonicalRoot,
    'pnpm-lock.yaml',
    'pnpm-lock.yaml',
  );
  assert(
    sha256(lockfile) === tracked.manifest.lockfile.sha256,
    'runtime lockfile differs from attribution',
  );
  const lockGraph = parsePnpmLockGraph(lockfile.toString('utf8'));
  const runtimeDependencies = collectExternalDependencies(productionList(false));
  const runtimePackages = await collectPackageEvidence(
    runtimeDependencies,
    lockGraph,
    tracked.canonicalRoot,
  );
  assert(
    JSON.stringify(runtimePackages) ===
      JSON.stringify(tracked.manifest.deployedRuntimeClosure.packages),
    'installed runtime package/legal closure differs from attribution',
  );
  await verifyRuntimeFilesystemEvidence(tracked.canonicalRoot, tracked.manifest);
  return tracked.manifest;
}

function parseArguments(arguments_) {
  const [command, ...rest] = arguments_;
  assert(
    command === 'generate' || command === 'verify-source' || command === 'verify-runtime',
    'expected generate, verify-source, or verify-runtime',
  );
  if (command === 'verify-runtime') {
    assert(rest.length === 0, 'verify-runtime accepts no arguments');
    return { command };
  }
  assert(
    rest.length === 2 && rest[0] === '--bundle-provenance' && rest[1],
    `${command} requires --bundle-provenance <path>`,
  );
  return { command, bundleProvenancePath: path.resolve(rest[1]) };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const attribution =
    options.command === 'generate'
      ? await generate(options.bundleProvenancePath)
      : options.command === 'verify-source'
        ? await verifySource(options.bundleProvenancePath)
        : await verifyRuntime();
  console.log(
    JSON.stringify({
      command: options.command,
      lockfileSha256: attribution.lockfile.sha256,
      fullProductionPackageIdentities: attribution.fullProductionClosure.packageIdentityCount,
      runtimePackageIdentities: attribution.deployedRuntimeClosure.packageIdentityCount,
      runtimePackageRoots: attribution.deployedRuntimeClosure.packageRootCount,
      bundledWebPackages: attribution.bundledWeb.packages.length,
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Runtime attribution failed.');
    process.exitCode = 1;
  });
}
