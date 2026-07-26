import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

const noticeFileName = 'THIRD_PARTY_NOTICES.txt';
const provenanceMethod = 'vite-rollup-rendered-modules-v1';
const provenanceOutputVariable = 'DII_BUNDLE_ATTRIBUTION_OUTPUT';
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
      !relative.includes('\0'),
    `${label} must remain inside the repository`,
  );
  return relative;
}

function assertSafeSourcePath(value, label) {
  assert(
    typeof value === 'string' &&
      value.length > 0 &&
      !value.includes('\\') &&
      !value.includes('\0') &&
      !value.startsWith('/') &&
      !/^[A-Za-z]:/.test(value) &&
      value
        .split('/')
        .every((segment) => segment.length > 0 && segment !== '.' && segment !== '..'),
    `${label} is unsafe`,
  );
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

async function loadPackageEvidence(repositoryRoot, packageRoot) {
  const canonicalRepositoryRoot = await realpath(repositoryRoot);
  const canonicalPackageRoot = await realpath(packageRoot);
  const relativePackageRoot = normalizedRelativePath(
    canonicalRepositoryRoot,
    canonicalPackageRoot,
    'package root',
  );
  assert(
    relativePackageRoot.includes('/node_modules/') ||
      relativePackageRoot.startsWith('node_modules/'),
    'third-party package root is not installed under node_modules',
  );

  const packageManifestPath = path.join(canonicalPackageRoot, 'package.json');
  const packageManifestEvidence = await readUtf8Evidence(
    packageManifestPath,
    `${relativePackageRoot}/package.json`,
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
      const absoluteFile = path.join(canonicalPackageRoot, fileName);
      const evidence = await readUtf8Evidence(
        absoluteFile,
        `${packageManifest.name}@${packageManifest.version}/${fileName}`,
      );
      legalFiles.push({
        kind,
        path: normalizedRelativePath(canonicalRepositoryRoot, absoluteFile, 'legal file'),
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
    packageManifest: {
      path: normalizedRelativePath(
        canonicalRepositoryRoot,
        packageManifestPath,
        'package manifest',
      ),
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
  const resolvedRepositoryRoot = path.resolve(repositoryRoot);
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
        const evidence = await loadPackageEvidence(resolvedRepositoryRoot, canonicalPackageRoot);
        assert(
          evidence.name === classification.packageName,
          `module package ${classification.packageName} differs from ${evidence.name}`,
        );
        packageRecord = { ...evidence, contributions: new Map() };
        packagesByRoot.set(packageKey, packageRecord);
      }

      const sourceAbsolute = path.join(
        packageRecord.canonicalPackageRoot,
        ...classification.sourcePath.split('/'),
      );
      assertSafeSourcePath(classification.sourcePath, 'classified module source path');
      const canonicalSource = await realpath(sourceAbsolute);
      normalizedRelativePath(
        packageRecord.canonicalPackageRoot,
        canonicalSource,
        'module source path',
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
        name: packageRecord.name,
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

export function createViteBundleAttributionPlugin() {
  const outputPath = process.env[provenanceOutputVariable];
  if (!outputPath) return false;
  assert(path.isAbsolute(outputPath), `${provenanceOutputVariable} must be an absolute path`);

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
