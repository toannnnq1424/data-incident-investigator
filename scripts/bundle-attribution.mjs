import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

import { parsePnpmLockGraph, resolvePnpmPackageRootIdentity } from './pnpm-lock-identity.mjs';
import {
  assertCanonicalContainedPath,
  assertCanonicalRoot,
  isPortablePathSegment,
  isPortableRelativePath,
} from './release-path-safety.mjs';

const noticeFileName = 'THIRD_PARTY_NOTICES.txt';
const provenanceMethod = 'vite-rollup-rendered-modules-v1';
const provenanceOutputVariable = 'DII_BUNDLE_ATTRIBUTION_OUTPUT';
const releaseBuildVariable = 'DII_RELEASE_ARTIFACT_BUILD';
const packageNamePattern =
  /^(?:@[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?\/)?[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const javascriptModulePattern = /\.(?:[cm]?[jt]sx?|json)$/i;
const legalFilePattern = /^(?:licen[cs]e|copying)(?:[._-].+)?$/i;
const noticeFilePattern = /^notice(?:[._-].+)?$/i;
const virtualRuntimeSources = new Map([
  ['\0commonjsHelpers.js', { packageName: 'vite', sourcePath: 'dist/node/chunks/config.js' }],
  [
    '\0vite/modulepreload-polyfill.js',
    { packageName: 'vite', sourcePath: 'dist/node/chunks/config.js' },
  ],
  ['\0vite/preload-helper.js', { packageName: 'vite', sourcePath: 'dist/node/chunks/config.js' }],
]);

function fail(message) {
  throw new Error(`Bundle attribution failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, expected, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys are not canonical`);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparablePath(value) {
  const normalized = path.normalize(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function normalizedRelativePath(root, absolutePath, label) {
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  assert(
    relative.length > 0 &&
      relative !== '..' &&
      !relative.startsWith('../') &&
      !path.isAbsolute(relative) &&
      !relative.includes('\\') &&
      !relative.includes('\0') &&
      isPortableRelativePath(relative),
    `${label} must remain inside the repository`,
  );
  return relative;
}

function assertSafeSourcePath(value, label) {
  assert(isPortableRelativePath(value), `${label} is unsafe`);
}

function parseNodeModulesPath(moduleId) {
  const withoutNull = moduleId.startsWith('\0') ? moduleId.slice(1) : moduleId;
  const queryIndex = withoutNull.indexOf('?');
  const filePath = (queryIndex === -1 ? withoutNull : withoutNull.slice(0, queryIndex)).replaceAll(
    '\\',
    '/',
  );
  const query = queryIndex === -1 ? '' : withoutNull.slice(queryIndex);
  const marker = '/node_modules/';
  const markerIndex = filePath.lastIndexOf(marker);
  if (markerIndex === -1) return undefined;

  const packageAndModule = filePath.slice(markerIndex + marker.length).split('/');
  const packageName = packageAndModule[0]?.startsWith('@')
    ? `${packageAndModule[0]}/${packageAndModule[1] ?? ''}`
    : packageAndModule[0];
  const packageSegmentCount = packageName?.startsWith('@') ? 2 : 1;
  assert(packageNamePattern.test(packageName ?? ''), `invalid package name in module ${moduleId}`);
  const moduleSegments = packageAndModule.slice(packageSegmentCount);
  assert(moduleSegments.length > 0, `package-root module cannot be attributed: ${moduleId}`);
  const modulePath = `${moduleSegments.join('/')}${query}`;
  const sourcePath = moduleSegments.join('/');
  assertSafeSourcePath(sourcePath, `module source path for ${moduleId}`);
  const packageRoot = `${filePath.slice(0, markerIndex + marker.length)}${packageName}`;
  return { modulePath, packageName, packageRoot, sourcePath };
}

async function readUtf8Evidence(absolutePath, label) {
  const buffer = await readFile(absolutePath);
  const text = buffer.toString('utf8');
  assert(Buffer.from(text, 'utf8').equals(buffer), `${label} is not canonical UTF-8 text`);
  assert(!text.includes('\0'), `${label} contains a NUL byte`);
  return { buffer, text };
}

async function loadPackageEvidence(repositoryRoot, packageRoot, lockGraph) {
  const canonicalRepositoryRoot = await assertCanonicalRoot(repositoryRoot, 'repository root');
  const canonicalPackageRoot = await realpath(packageRoot);
  const relativePackageRoot = normalizedRelativePath(
    canonicalRepositoryRoot,
    canonicalPackageRoot,
    'package root',
  );
  await assertCanonicalContainedPath(canonicalRepositoryRoot, relativePackageRoot, {
    label: 'third-party package root',
    type: 'directory',
  });
  const graphIdentity = resolvePnpmPackageRootIdentity(relativePackageRoot, lockGraph);

  const packageManifestRelativePath = `${relativePackageRoot}/package.json`;
  const packageManifestPath = await assertCanonicalContainedPath(
    canonicalRepositoryRoot,
    packageManifestRelativePath,
    { label: `${graphIdentity.lockSnapshot} package manifest`, type: 'file' },
  );
  const packageManifestEvidence = await readUtf8Evidence(
    packageManifestPath,
    packageManifestRelativePath,
  );
  let packageManifest;
  try {
    packageManifest = JSON.parse(packageManifestEvidence.text);
  } catch {
    fail(`${relativePackageRoot}/package.json is not valid JSON`);
  }
  assert(packageNamePattern.test(packageManifest.name ?? ''), 'package manifest name is invalid');
  assert(
    typeof packageManifest.version === 'string' && packageManifest.version.length > 0,
    `${packageManifest.name} package version is missing`,
  );
  assert(
    typeof packageManifest.license === 'string' && packageManifest.license.trim().length > 0,
    `${packageManifest.name}@${packageManifest.version} declared license is missing`,
  );
  assert(
    packageManifest.name === graphIdentity.name &&
      packageManifest.version === graphIdentity.version,
    `package manifest ${packageManifest.name}@${packageManifest.version} differs from frozen graph ${graphIdentity.lockSnapshot}`,
  );

  const entryNames = await readdir(canonicalPackageRoot);
  const licenseNames = entryNames.filter((name) => legalFilePattern.test(name)).sort(compareText);
  const noticeNames = entryNames.filter((name) => noticeFilePattern.test(name)).sort(compareText);
  assert(
    licenseNames.length === 1,
    `${packageManifest.name}@${packageManifest.version} must have exactly one top-level license file`,
  );

  const legalFiles = [];
  for (const [kind, names] of [
    ['license', licenseNames],
    ['notice', noticeNames],
  ]) {
    for (const fileName of names) {
      assert(
        isPortablePathSegment(fileName),
        `${graphIdentity.lockSnapshot} legal filename is unsafe`,
      );
      const legalRelativePath = `${relativePackageRoot}/${fileName}`;
      const absoluteFile = await assertCanonicalContainedPath(
        canonicalRepositoryRoot,
        legalRelativePath,
        { label: `${graphIdentity.lockSnapshot}/${fileName}`, type: 'file' },
      );
      const evidence = await readUtf8Evidence(
        absoluteFile,
        `${packageManifest.name}@${packageManifest.version}/${fileName}`,
      );
      legalFiles.push({
        kind,
        path: legalRelativePath,
        sha256: sha256(evidence.buffer),
        text: evidence.text,
      });
    }
  }

  return {
    canonicalPackageRoot,
    declaredLicense: packageManifest.license.trim(),
    legalFiles,
    name: packageManifest.name,
    lockPackage: graphIdentity.lockPackage,
    lockSnapshot: graphIdentity.lockSnapshot,
    packageRoot: graphIdentity.packageRoot,
    packageManifest: {
      path: packageManifestRelativePath,
      sha256: sha256(packageManifestEvidence.buffer),
    },
    version: packageManifest.version,
  };
}

async function resolveVirtualPackageRoot(repositoryRoot, packageName) {
  const packageSegments = packageName.split('/');
  for (const base of [
    path.join(repositoryRoot, 'apps', 'web', 'node_modules'),
    path.join(repositoryRoot, 'node_modules'),
  ]) {
    try {
      return await realpath(path.join(base, ...packageSegments));
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
    }
  }
  fail(`could not resolve virtual runtime source package ${packageName}`);
}

async function classifyModule(repositoryRoot, moduleId) {
  const installedModule = parseNodeModulesPath(moduleId);
  if (installedModule) {
    return { ...installedModule, kind: 'third-party' };
  }

  const virtualSource = virtualRuntimeSources.get(moduleId);
  if (virtualSource) {
    return {
      kind: 'third-party',
      modulePath: `virtual:${moduleId.slice(1)}`,
      packageName: virtualSource.packageName,
      packageRoot: await resolveVirtualPackageRoot(repositoryRoot, virtualSource.packageName),
      sourcePath: virtualSource.sourcePath,
    };
  }

  if (moduleId.startsWith('\0')) {
    fail(`unclassified virtual module ${JSON.stringify(moduleId)}`);
  }

  const absoluteModulePath = path.resolve(moduleId);
  const relative = path.relative(repositoryRoot, absoluteModulePath);
  if (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  ) {
    return { kind: 'first-party' };
  }
  fail('rendered module resolves outside the repository and installed package graph');
}

function parseRawProvenance(value) {
  exactKeys(value, ['chunks', 'schemaVersion'], 'raw provenance');
  assert(value.schemaVersion === 1, 'unsupported raw provenance schemaVersion');
  assert(Array.isArray(value.chunks) && value.chunks.length > 0, 'raw provenance chunks are empty');

  const chunks = [];
  const seenChunks = new Set();
  for (const chunk of value.chunks) {
    exactKeys(chunk, ['fileName', 'modules'], 'raw provenance chunk');
    assert(
      typeof chunk.fileName === 'string' &&
        chunk.fileName.endsWith('.js') &&
        !chunk.fileName.includes('\\') &&
        !chunk.fileName.includes(':') &&
        !chunk.fileName.startsWith('/') &&
        !chunk.fileName
          .split('/')
          .some((segment) => segment === '' || segment === '.' || segment === '..'),
      'raw provenance chunk path is unsafe',
    );
    assert(!seenChunks.has(chunk.fileName), `duplicate raw provenance chunk ${chunk.fileName}`);
    seenChunks.add(chunk.fileName);
    assert(Array.isArray(chunk.modules) && chunk.modules.length > 0, 'raw chunk modules are empty');

    const modules = [];
    const seenModules = new Set();
    for (const module of chunk.modules) {
      exactKeys(module, ['id', 'renderedLength'], 'raw provenance module');
      assert(
        typeof module.id === 'string' && module.id.length > 0,
        'raw provenance module id is invalid',
      );
      assert(
        Number.isSafeInteger(module.renderedLength) && module.renderedLength >= 0,
        `invalid rendered length for ${JSON.stringify(module.id)}`,
      );
      assert(!seenModules.has(module.id), `duplicate raw provenance module ${module.id}`);
      seenModules.add(module.id);
      modules.push(module);
    }
    chunks.push({ fileName: chunk.fileName, modules });
  }
  return chunks;
}

function addContribution(packageRecord, bundlePath, moduleEvidence) {
  let contribution = packageRecord.contributions.get(bundlePath);
  if (!contribution) {
    contribution = new Map();
    packageRecord.contributions.set(bundlePath, contribution);
  }
  assert(
    !contribution.has(moduleEvidence.path),
    `duplicate module contribution ${moduleEvidence.path} in ${bundlePath}`,
  );
  contribution.set(moduleEvidence.path, moduleEvidence);
}

export async function createBundleAttribution(rawProvenance, repositoryRoot) {
  const resolvedRepositoryRoot = await assertCanonicalRoot(repositoryRoot, 'repository root');
  const lockfilePath = await assertCanonicalContainedPath(
    resolvedRepositoryRoot,
    'pnpm-lock.yaml',
    { label: 'pnpm-lock.yaml', type: 'file' },
  );
  const lockfileEvidence = await readUtf8Evidence(lockfilePath, 'pnpm-lock.yaml');
  const lockGraph = parsePnpmLockGraph(lockfileEvidence.text);
  const chunks = parseRawProvenance(rawProvenance);
  const packagesByRoot = new Map();

  for (const chunk of chunks) {
    for (const module of chunk.modules) {
      const classification = await classifyModule(resolvedRepositoryRoot, module.id);
      if (classification.kind === 'first-party') continue;
      if (module.renderedLength === 0) {
        if (!javascriptModulePattern.test(classification.sourcePath)) {
          fail(
            `zero-rendered third-party module may emit an unattributed non-JavaScript asset: ${classification.sourcePath}`,
          );
        }
        continue;
      }

      const canonicalPackageRoot = await realpath(classification.packageRoot);
      const packageKey = comparablePath(canonicalPackageRoot);
      let packageRecord = packagesByRoot.get(packageKey);
      if (!packageRecord) {
        const evidence = await loadPackageEvidence(
          resolvedRepositoryRoot,
          canonicalPackageRoot,
          lockGraph,
        );
        assert(
          evidence.name === classification.packageName,
          `module package ${classification.packageName} differs from ${evidence.name}`,
        );
        packageRecord = { ...evidence, contributions: new Map() };
        packagesByRoot.set(packageKey, packageRecord);
      }

      assertSafeSourcePath(classification.sourcePath, 'classified module source path');
      const sourceEvidencePath = `${packageRecord.packageRoot}/${classification.sourcePath}`;
      const canonicalSource = await assertCanonicalContainedPath(
        resolvedRepositoryRoot,
        sourceEvidencePath,
        { label: 'module source path', type: 'file' },
      );
      const sourceEvidence = await readFile(canonicalSource);
      addContribution(packageRecord, `apps/web/dist/${chunk.fileName}`, {
        path: classification.modulePath,
        renderedBytes: module.renderedLength,
        sourcePath: classification.sourcePath,
        sourceSha256: sha256(sourceEvidence),
      });
    }
  }

  assert(packagesByRoot.size > 0, 'no rendered third-party package contribution was found');
  const identities = new Set();
  const packages = [...packagesByRoot.values()]
    .map((packageRecord) => {
      const identity = `${packageRecord.name}@${packageRecord.version}`;
      assert(!identities.has(identity), `duplicate installed roots for ${identity}`);
      identities.add(identity);
      return {
        contributions: [...packageRecord.contributions.entries()]
          .sort(([left], [right]) => compareText(left, right))
          .map(([bundlePath, modules]) => ({
            bundlePath,
            modules: [...modules.values()].sort((left, right) =>
              compareText(left.path, right.path),
            ),
          })),
        declaredLicense: packageRecord.declaredLicense,
        legalFiles: packageRecord.legalFiles,
        lockPackage: packageRecord.lockPackage,
        lockSnapshot: packageRecord.lockSnapshot,
        name: packageRecord.name,
        packageRoot: packageRecord.packageRoot,
        packageManifest: packageRecord.packageManifest,
        version: packageRecord.version,
      };
    })
    .sort(
      (left, right) =>
        compareText(left.name, right.name) || compareText(left.version, right.version),
    );

  return {
    method: provenanceMethod,
    noticeFile: noticeFileName,
    packages,
  };
}

export function createViteBundleAttributionPlugin(environment = process.env) {
  const outputPath = environment[provenanceOutputVariable];
  const releaseBuild = environment[releaseBuildVariable];
  if (!outputPath && !releaseBuild) return false;
  assert(releaseBuild === '1', `${releaseBuildVariable}=1 is required for release capture`);
  assert(outputPath, `${provenanceOutputVariable} is required for release capture`);
  assert(path.isAbsolute(outputPath), `${provenanceOutputVariable} must be an absolute path`);
  assert(isPortablePathSegment(path.basename(outputPath)), 'release capture filename is unsafe');
  const outputDirectory = path.dirname(outputPath);
  const outputDirectoryStat = lstatSync(outputDirectory);
  assert(
    outputDirectoryStat.isDirectory() && !outputDirectoryStat.isSymbolicLink(),
    'release capture directory must be a real directory',
  );
  assert(
    comparablePath(realpathSync(outputDirectory)) === comparablePath(outputDirectory),
    'release capture directory must be canonical and non-linked',
  );
  assert(!existsSync(outputPath), 'release capture output already exists');

  return {
    apply: 'build',
    generateBundle(_outputOptions, bundle) {
      const chunks = Object.values(bundle)
        .filter((entry) => entry.type === 'chunk')
        .map((chunk) => ({
          fileName: chunk.fileName,
          modules: Object.entries(chunk.modules)
            .map(([id, module]) => ({ id, renderedLength: module.renderedLength }))
            .sort((left, right) => compareText(left.id, right.id)),
        }))
        .sort((left, right) => compareText(left.fileName, right.fileName));
      assert(chunks.length > 0, 'Vite emitted no JavaScript chunks');
      writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: 1, chunks }, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
      });
    },
    name: 'dii-bundle-attribution',
  };
}

export function readRawBundleAttribution(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    fail('Vite bundle attribution output is missing or invalid JSON');
  }
}

export const bundleAttributionOutputVariable = provenanceOutputVariable;
export const releaseArtifactBuildVariable = releaseBuildVariable;
