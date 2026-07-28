import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { test } from 'node:test';

import {
  collectExternalDependencies,
  createRuntimeNotice,
  runtimeOutputRoots,
  verifyRuntimeFilesystemEvidence,
} from '../scripts/runtime-attribution.mjs';
import {
  createRuntimeManifest,
  runtimeManifestPaths,
} from '../scripts/prepare-runtime-manifests.mjs';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function contentEvidence(relativePath, buffer) {
  return {
    path: relativePath,
    sha256: sha256(buffer),
    size: buffer.length,
  };
}

function sortEvidence(entries) {
  return entries.sort((left, right) => left.path.localeCompare(right.path, 'en'));
}

async function writeRuntimeFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-runtime-attribution-'));
  for (const outputRoot of runtimeOutputRoots) {
    await mkdir(path.join(root, ...outputRoot.split('/')), { recursive: true });
  }

  const runtimePath = 'apps/api/dist/index.js';
  const runtimeBuffer = Buffer.from('export const fixture = true;\n');
  await writeFile(path.join(root, ...runtimePath.split('/')), runtimeBuffer);

  const requiredLegalFiles = [];
  for (const [relativePath, text] of [
    ['LICENSE', 'Apache fixture license\n'],
    ['NOTICE', 'Fixture notice\n'],
    ['THIRD_PARTY_NOTICES.txt', 'Fixture third-party notices\n'],
  ]) {
    const buffer = Buffer.from(text);
    await writeFile(path.join(root, relativePath), buffer);
    requiredLegalFiles.push(contentEvidence(relativePath, buffer));
  }

  const runtimeWorkspaceManifests = [];
  for (const manifestPath of runtimeManifestPaths) {
    const buffer = Buffer.from(
      `${JSON.stringify({ name: manifestPath, exports: { '.': './dist/index.js' } }, null, 2)}\n`,
    );
    const absolutePath = path.join(root, ...manifestPath.split('/'));
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    runtimeWorkspaceManifests.push(contentEvidence(manifestPath, buffer));
  }

  return {
    attribution: {
      schemaVersion: 2,
      method: 'cloud-run-runtime-attribution-v2',
      requiredLegalFiles: sortEvidence(requiredLegalFiles),
      runtimeFiles: [contentEvidence(runtimePath, runtimeBuffer)],
      runtimeWorkspaceManifests: sortEvidence(runtimeWorkspaceManifests),
    },
    root,
    runtimePath,
  };
}

async function removeRuntimeFixture(root) {
  await rm(root, { force: true, recursive: true });
}

test('collectExternalDependencies follows production dependencies and ignores unsaved entries', () => {
  const packagePath =
    process.platform === 'win32'
      ? 'C:\\repo\\node_modules\\.pnpm\\alpha@1.0.0\\node_modules\\alpha'
      : '/repo/node_modules/.pnpm/alpha@1.0.0/node_modules/alpha';
  const nestedPath =
    process.platform === 'win32'
      ? 'C:\\repo\\node_modules\\.pnpm\\beta@2.0.0\\node_modules\\beta'
      : '/repo/node_modules/.pnpm/beta@2.0.0/node_modules/beta';
  const projects = [
    {
      dependencies: {
        alpha: {
          path: packagePath,
          version: '1.0.0',
          dependencies: {
            beta: { path: nestedPath, version: '2.0.0' },
          },
        },
      },
      unsavedDependencies: {
        shouldNotAppear: {
          path: packagePath.replace('alpha@1.0.0', 'junk@9.9.9'),
          version: '9.9.9',
        },
      },
    },
    {
      optionalDependencies: {
        duplicate: { path: packagePath, version: '1.0.0' },
      },
    },
  ];

  assert.deepEqual(collectExternalDependencies(projects), [
    { path: packagePath, version: '1.0.0' },
    { path: nestedPath, version: '2.0.0' },
  ]);
});

test('createRuntimeNotice is deterministic and preserves fallback provenance', () => {
  const attribution = {
    lockfile: { sha256: 'a'.repeat(64) },
    fullProductionClosure: { packageIdentityCount: 1 },
    deployedRuntimeClosure: {
      packageIdentityCount: 1,
      packageRootCount: 1,
      packages: [
        {
          name: 'abstract-logging',
          version: '2.0.1',
          declaredLicense: 'MIT',
          packageRoot: 'node_modules/.pnpm/abstract-logging@2.0.1/node_modules/abstract-logging',
          lockPackage: 'abstract-logging@2.0.1',
          lockSnapshot: 'abstract-logging@2.0.1',
          packageManifest: { path: 'package.json', sha256: 'b'.repeat(64) },
          legalFiles: [
            {
              kind: 'license',
              path: 'third_party_licenses/abstract-logging-2.0.1-MIT.txt',
              sha256: 'c'.repeat(64),
              source: 'upstream-fallback',
              sourceUrl: 'http://jsumners.mit-license.org/',
              upstreamCommit: '80dfaef91ee87008f4ed2b6e78921d383bccd406',
              text: 'MIT fallback evidence\n',
            },
          ],
        },
      ],
    },
    bundledWeb: { packages: [] },
    requiredLegalFiles: [
      {
        path: 'THIRD_PARTY_NOTICES.txt',
        sha256: 'd'.repeat(64),
        size: 123,
      },
    ],
  };

  const first = createRuntimeNotice(attribution);
  const second = createRuntimeNotice(attribution);
  const changedSelfEvidence = JSON.parse(JSON.stringify(attribution));
  changedSelfEvidence.requiredLegalFiles[0].sha256 = 'e'.repeat(64);
  changedSelfEvidence.requiredLegalFiles[0].size = 456;
  assert.deepEqual(first, second);
  assert.deepEqual(first, createRuntimeNotice(changedSelfEvidence));
  assert.match(first.toString('utf8'), /Evidence source: upstream fallback/);
  assert.match(first.toString('utf8'), /80dfaef91ee87008f4ed2b6e78921d383bccd406/);
});

test('createRuntimeManifest changes only source exports to built output', () => {
  const source = {
    name: '@dii/shared-types',
    type: 'module',
    exports: {
      '.': {
        types: './src/index.ts',
        import: './src/index.ts',
      },
    },
  };
  assert.deepEqual(createRuntimeManifest(source, 'package.json'), {
    ...source,
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    },
  });
});

test('runtime filesystem evidence accepts the exact contained file set and content', async () => {
  const fixture = await writeRuntimeFixture();
  try {
    const actual = await verifyRuntimeFilesystemEvidence(fixture.root, fixture.attribution);
    assert.deepEqual(actual, fixture.attribution.runtimeFiles);
  } finally {
    await removeRuntimeFixture(fixture.root);
  }
});

test('runtime filesystem evidence rejects an unexpected runtime file', async () => {
  const fixture = await writeRuntimeFixture();
  try {
    await writeFile(
      path.join(fixture.root, 'apps', 'web', 'dist', 'unexpected.js'),
      'unexpected\n',
    );
    await assert.rejects(
      verifyRuntimeFilesystemEvidence(fixture.root, fixture.attribution),
      /runtime file set or content differs from attribution/,
    );
  } finally {
    await removeRuntimeFixture(fixture.root);
  }
});

test('runtime filesystem evidence rejects runtime content tamper', async () => {
  const fixture = await writeRuntimeFixture();
  try {
    await writeFile(
      path.join(fixture.root, ...fixture.runtimePath.split('/')),
      'export const fixture = false;\n',
    );
    await assert.rejects(
      verifyRuntimeFilesystemEvidence(fixture.root, fixture.attribution),
      /runtime file set or content differs from attribution/,
    );
  } finally {
    await removeRuntimeFixture(fixture.root);
  }
});

test('runtime filesystem evidence rejects required legal-file tamper and absence', async () => {
  const tampered = await writeRuntimeFixture();
  try {
    await writeFile(path.join(tampered.root, 'NOTICE'), 'Tampered notice\n');
    await assert.rejects(
      verifyRuntimeFilesystemEvidence(tampered.root, tampered.attribution),
      /NOTICE content differs from attribution/,
    );
  } finally {
    await removeRuntimeFixture(tampered.root);
  }

  const missing = await writeRuntimeFixture();
  try {
    await rm(path.join(missing.root, 'LICENSE'));
    await assert.rejects(
      verifyRuntimeFilesystemEvidence(missing.root, missing.attribution),
      /required legal files LICENSE is missing/,
    );
  } finally {
    await removeRuntimeFixture(missing.root);
  }
});

test('runtime filesystem evidence rejects rewritten workspace-manifest tamper', async () => {
  const fixture = await writeRuntimeFixture();
  try {
    const manifestPath = runtimeManifestPaths[0];
    await writeFile(path.join(fixture.root, ...manifestPath.split('/')), '{"name":"tampered"}\n');
    await assert.rejects(
      verifyRuntimeFilesystemEvidence(fixture.root, fixture.attribution),
      /package\.json content differs from attribution/,
    );
  } finally {
    await removeRuntimeFixture(fixture.root);
  }
});

test('runtime filesystem evidence rejects explicit cross-root paths before reading', async () => {
  const fixture = await writeRuntimeFixture();
  try {
    const escaped = JSON.parse(JSON.stringify(fixture.attribution));
    escaped.requiredLegalFiles[0].path = '../outside/LICENSE';
    await assert.rejects(
      verifyRuntimeFilesystemEvidence(fixture.root, escaped),
      /unsafe portable path/,
    );
  } finally {
    await removeRuntimeFixture(fixture.root);
  }
});

test('runtime filesystem evidence rejects a symlink, junction, or reparse escape', async () => {
  const fixture = await writeRuntimeFixture();
  const externalRoot = await mkdtemp(path.join(tmpdir(), 'dii-runtime-attribution-external-'));
  const linkedPath = path.join(fixture.root, 'apps', 'api', 'dist', 'linked-output');
  let linked = false;
  try {
    await writeFile(path.join(externalRoot, 'outside.js'), 'must not be scanned\n');
    await symlink(externalRoot, linkedPath, process.platform === 'win32' ? 'junction' : 'dir');
    linked = true;
    await assert.rejects(
      verifyRuntimeFilesystemEvidence(fixture.root, fixture.attribution),
      /non-regular path|symbolic link|junction|reparse target/,
    );
    assert.equal(
      await readFile(path.join(externalRoot, 'outside.js'), 'utf8'),
      'must not be scanned\n',
    );
  } finally {
    if (linked) await unlink(linkedPath);
    await removeRuntimeFixture(fixture.root);
    await rm(externalRoot, { force: true, recursive: true });
  }
});
