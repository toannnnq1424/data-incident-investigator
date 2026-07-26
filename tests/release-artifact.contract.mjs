import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { constants } from 'node:fs';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { platform, tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createBundleAttribution,
  createViteBundleAttributionPlugin,
  readRawBundleAttribution,
} from '../scripts/bundle-attribution.mjs';
import {
  cleanReleaseBuildOutputs,
  releaseBuildOutputRoots,
  writeArtifactTransaction,
} from '../scripts/build-release-artifact.mjs';
import {
  parsePnpmLockGraph,
  virtualStoreDirectoryForSnapshot,
} from '../scripts/pnpm-lock-identity.mjs';
import { assertUniquePortablePaths } from '../scripts/release-path-safety.mjs';
import {
  createThirdPartyNotice,
  isAllowedPayloadPath,
  isSafeReleasePath,
  parseReleaseArchive,
  validateThirdPartyAttribution,
  validateThirdPartyNotice,
  verifyArtifact,
  verifyDirectory,
} from '../scripts/verify-release-artifact.mjs';

const graphEntriesByRoot = new Map();
const cloneJson = (value) => JSON.parse(JSON.stringify(value));

async function writeTestLockfile(root) {
  const entries = graphEntriesByRoot.get(root) ?? new Map();
  const packageKeys = [
    ...new Set([...entries.values()].map(({ packageKey }) => packageKey)),
  ].sort();
  const snapshotKeys = [...entries.keys()].sort();
  const text = [
    "lockfileVersion: '9.0'",
    '',
    'packages:',
    '',
    ...packageKeys.flatMap((key) => [`  ${key}:`, '    resolution: {}', '']),
    'snapshots:',
    '',
    ...snapshotKeys.flatMap((key) => [`  ${key}: {}`, '']),
  ].join('\n');
  await writeFile(path.join(root, 'pnpm-lock.yaml'), text);
  return text;
}

async function writePackageEvidence(root, packageName, version, files, options = {}) {
  const packageKey = `${packageName}@${version}`;
  const lockSnapshot = options.lockSnapshot ?? packageKey;
  const virtualStoreDirectory =
    options.virtualStoreDirectory ?? virtualStoreDirectoryForSnapshot(lockSnapshot);
  const packageRoot = path.join(
    root,
    'node_modules',
    '.pnpm',
    virtualStoreDirectory,
    'node_modules',
    ...packageName.split('/'),
  );
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: packageName,
        version: options.manifestVersion ?? version,
        license: options.license ?? 'MIT',
      },
      null,
      2,
    )}\n`,
  );
  if (options.includeLicense !== false) {
    await writeFile(path.join(packageRoot, options.licenseFile ?? 'LICENSE'), 'Example license\n');
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(packageRoot, ...relativePath.split('/'));
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }
  const entries = graphEntriesByRoot.get(root) ?? new Map();
  entries.set(lockSnapshot, { packageKey });
  graphEntriesByRoot.set(root, entries);
  await writeTestLockfile(root);
  return packageRoot;
}

test('release paths allow only canonical non-secret payload locations', () => {
  const safePaths = ['.env.example', 'apps/api/dist/index.js', 'docs/ROLLBACK.md'];
  const unsafePaths = [
    '../secret',
    '/absolute',
    'C:/secret',
    '.env',
    '.env.local',
    'node_modules/dependency',
    'tests/fixture.json',
    'apps/api/dist/index.js.map',
    'service.log',
    'windows\\path',
    '//server/share/file.js',
    'apps/web/dist/CON',
    'apps/web/dist/CON .txt',
    'apps/web/dist/NUL.txt',
    'apps/web/dist/index.js:secret',
    'apps/web/dist/trailing.',
    'apps/web/dist/trailing ',
    'apps/web/dist/control\u001f.js',
  ];

  assert.equal(safePaths.every(isSafeReleasePath), true);
  assert.equal(unsafePaths.some(isSafeReleasePath), false);
  assert.throws(
    () => assertUniquePortablePaths(['apps/web/dist/index.js', 'APPS/web/dist/index.js']),
    /Windows-ambiguous duplicate/,
  );
});

test('release payload allows compiled runtime workspaces and excludes their source', () => {
  for (const packageName of ['agent-core', 'datahub-client', 'shared-types']) {
    assert.equal(isAllowedPayloadPath(`packages/${packageName}/dist/index.js`), true);
    assert.equal(isAllowedPayloadPath(`packages/${packageName}/dist/index.d.ts`), true);
    assert.equal(isAllowedPayloadPath(`packages/${packageName}/src/index.ts`), false);
  }
});

test('bundle attribution maps the exact five packages and excludes abstract-logging', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-bundle-attribution-'));
  try {
    const reactRoot = await writePackageEvidence(
      root,
      'react',
      '19.2.7',
      { 'cjs/react.production.js': 'export const value = 1;\n' },
      { licenseFile: 'LICENSE.md' },
    );
    const reactDomRoot = await writePackageEvidence(
      root,
      'react-dom',
      '19.2.7',
      {
        'cjs/react-dom.production.js': 'export const dom = true;\n',
      },
      { lockSnapshot: 'react-dom@19.2.7(react@19.2.7)' },
    );
    const schedulerRoot = await writePackageEvidence(root, 'scheduler', '0.27.0', {
      'cjs/scheduler.production.js': 'export const schedule = true;\n',
    });
    const viteRoot = await writePackageEvidence(
      root,
      'vite',
      '7.3.6',
      { 'dist/node/chunks/config.js': 'export const helper = true;\n' },
      {
        licenseFile: 'LICENSE.md',
        lockSnapshot: 'vite@7.3.6(@types/node@24.13.3)(tsx@4.23.1)',
      },
    );
    const zodRoot = await writePackageEvidence(root, 'zod', '4.4.3', {
      'index.js': 'export const z = true;\n',
    });
    await writePackageEvidence(
      root,
      'abstract-logging',
      '2.0.1',
      { 'index.js': 'export default {};\n' },
      { includeLicense: false },
    );
    const viteLink = path.join(root, 'apps', 'web', 'node_modules', 'vite');
    await mkdir(path.dirname(viteLink), { recursive: true });
    await symlink(viteRoot, viteLink, platform() === 'win32' ? 'junction' : 'dir');

    const moduleEntries = [
      {
        id: path.join(reactRoot, 'cjs', 'react.production.js'),
        renderedLength: 41,
      },
      {
        id: path.join(reactDomRoot, 'cjs', 'react-dom.production.js'),
        renderedLength: 37,
      },
      {
        id: path.join(schedulerRoot, 'cjs', 'scheduler.production.js'),
        renderedLength: 31,
      },
      { id: '\0vite/modulepreload-polyfill.js', renderedLength: 29 },
      { id: path.join(zodRoot, 'index.js'), renderedLength: 23 },
      { id: path.join(root, 'apps', 'web', 'src', 'main.tsx'), renderedLength: 17 },
    ];
    const provenance = {
      schemaVersion: 1,
      chunks: [{ fileName: 'assets/index-a1b2c3.js', modules: moduleEntries }],
    };
    const reordered = {
      schemaVersion: 1,
      chunks: [
        {
          fileName: 'assets/index-a1b2c3.js',
          modules: [...moduleEntries].reverse(),
        },
      ],
    };

    const first = await createBundleAttribution(provenance, root);
    const second = await createBundleAttribution(reordered, root);
    assert.deepEqual(second, first);
    assert.deepEqual(
      first.packages.map(({ name, version }) => `${name}@${version}`),
      ['react@19.2.7', 'react-dom@19.2.7', 'scheduler@0.27.0', 'vite@7.3.6', 'zod@4.4.3'],
    );
    assert.equal(
      first.packages.some(({ name }) => name === 'abstract-logging'),
      false,
    );
    const lockfileText = await readFile(path.join(root, 'pnpm-lock.yaml'), 'utf8');
    const graph = parsePnpmLockGraph(lockfileText);
    assert.equal(graph.packages.has('abstract-logging@2.0.1'), true);
    assert.deepEqual(
      first.packages.map(({ lockSnapshot }) => lockSnapshot),
      [
        'react@19.2.7',
        'react-dom@19.2.7(react@19.2.7)',
        'scheduler@0.27.0',
        'vite@7.3.6(@types/node@24.13.3)(tsx@4.23.1)',
        'zod@4.4.3',
      ],
    );
    assert.deepEqual(
      first.packages.flatMap(({ contributions }) =>
        contributions.flatMap(({ modules }) => modules.map(({ path }) => path)),
      ),
      [
        'cjs/react.production.js',
        'cjs/react-dom.production.js',
        'cjs/scheduler.production.js',
        'virtual:vite/modulepreload-polyfill.js',
        'index.js',
      ],
    );

    const notice = createThirdPartyNotice(first);
    validateThirdPartyNotice(notice, first, lockfileText);
    assert.throws(
      () =>
        validateThirdPartyNotice(
          Buffer.concat([notice, Buffer.from('tampered\n')]),
          first,
          lockfileText,
        ),
      /content is not canonical/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('bundle attribution binds manifest identity to the exact frozen virtual-store snapshot', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-bundle-identity-'));
  try {
    const packageRoot = await writePackageEvidence(
      root,
      'identity-check',
      '1.0.0',
      { 'index.js': 'export const identity = true;\n' },
      { manifestVersion: '9.9.9' },
    );
    await assert.rejects(
      createBundleAttribution(
        {
          schemaVersion: 1,
          chunks: [
            {
              fileName: 'assets/index-identity.js',
              modules: [{ id: path.join(packageRoot, 'index.js'), renderedLength: 13 }],
            },
          ],
        },
        root,
      ),
      /differs from frozen graph identity-check@1\.0\.0/,
    );

    const mismatchedRoot = await writePackageEvidence(
      root,
      'path-check',
      '1.0.0',
      { 'index.js': 'export const pathCheck = true;\n' },
      { virtualStoreDirectory: 'path-check@1.0.0_wrong@1.0.0' },
    );
    await assert.rejects(
      createBundleAttribution(
        {
          schemaVersion: 1,
          chunks: [
            {
              fileName: 'assets/index-path.js',
              modules: [{ id: path.join(mismatchedRoot, 'index.js'), renderedLength: 11 }],
            },
          ],
        },
        root,
      ),
      /does not represent a frozen lock snapshot/,
    );
  } finally {
    graphEntriesByRoot.delete(root);
    await rm(root, { force: true, recursive: true });
  }
});

test('verifier rejects manifest and legal evidence from another package root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-bundle-cross-root-'));
  try {
    const firstRoot = await writePackageEvidence(root, 'first-package', '1.0.0', {
      'index.js': 'export const first = true;\n',
    });
    const secondRoot = await writePackageEvidence(root, 'second-package', '2.0.0', {
      'index.js': 'export const second = true;\n',
    });
    const attribution = await createBundleAttribution(
      {
        schemaVersion: 1,
        chunks: [
          {
            fileName: 'assets/index-cross-root.js',
            modules: [
              { id: path.join(firstRoot, 'index.js'), renderedLength: 7 },
              { id: path.join(secondRoot, 'index.js'), renderedLength: 9 },
            ],
          },
        ],
      },
      root,
    );
    const lockfileText = await readFile(path.join(root, 'pnpm-lock.yaml'), 'utf8');
    const wrongManifest = cloneJson(attribution);
    wrongManifest.packages[0].packageManifest.path = wrongManifest.packages[1].packageManifest.path;
    assert.throws(
      () => validateThirdPartyAttribution(wrongManifest, lockfileText),
      /package manifest provenance path is invalid/,
    );

    const wrongLegal = cloneJson(attribution);
    wrongLegal.packages[0].legalFiles[0].path = wrongLegal.packages[1].legalFiles[0].path;
    assert.throws(
      () => validateThirdPartyAttribution(wrongLegal, lockfileText),
      /legal-file provenance path is invalid/,
    );
  } finally {
    graphEntriesByRoot.delete(root);
    await rm(root, { force: true, recursive: true });
  }
});

test('bundle attribution rejects an embedded package without legal-file evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-bundle-missing-license-'));
  try {
    const packageRoot = await writePackageEvidence(
      root,
      'abstract-logging',
      '2.0.1',
      { 'index.js': 'export default {};\n' },
      { includeLicense: false },
    );
    await assert.rejects(
      createBundleAttribution(
        {
          schemaVersion: 1,
          chunks: [
            {
              fileName: 'assets/index-missing.js',
              modules: [{ id: path.join(packageRoot, 'index.js'), renderedLength: 9 }],
            },
          ],
        },
        root,
      ),
      /must have exactly one top-level license file/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('bundle attribution fails closed for unknown virtual and non-JavaScript asset modules', async () => {
  const virtualRoot = await mkdtemp(path.join(tmpdir(), 'dii-bundle-virtual-'));
  const assetRoot = await mkdtemp(path.join(tmpdir(), 'dii-bundle-asset-'));
  try {
    await writePackageEvidence(virtualRoot, 'unused-package', '1.0.0', {
      'index.js': 'export const unused = true;\n',
    });
    await assert.rejects(
      createBundleAttribution(
        {
          schemaVersion: 1,
          chunks: [
            {
              fileName: 'assets/index-virtual.js',
              modules: [{ id: '\0unknown-runtime.js', renderedLength: 1 }],
            },
          ],
        },
        virtualRoot,
      ),
      /unclassified virtual module/,
    );

    const packageRoot = await writePackageEvidence(assetRoot, 'example-style', '1.0.0', {
      'styles.css': '.example {}\n',
    });
    await assert.rejects(
      createBundleAttribution(
        {
          schemaVersion: 1,
          chunks: [
            {
              fileName: 'assets/index-style.js',
              modules: [{ id: path.join(packageRoot, 'styles.css'), renderedLength: 0 }],
            },
          ],
        },
        assetRoot,
      ),
      /may emit an unattributed non-JavaScript asset/,
    );
  } finally {
    await rm(virtualRoot, { force: true, recursive: true });
    await rm(assetRoot, { force: true, recursive: true });
  }
});

test('release capture fails closed when its required environment or plugin output is absent', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-capture-precondition-'));
  try {
    const outputPath = path.join(root, 'vite-provenance.json');
    assert.equal(createViteBundleAttributionPlugin({}), false);
    assert.throws(
      () => createViteBundleAttributionPlugin({ DII_RELEASE_ARTIFACT_BUILD: '1' }),
      /DII_BUNDLE_ATTRIBUTION_OUTPUT is required/,
    );
    assert.throws(
      () => createViteBundleAttributionPlugin({ DII_BUNDLE_ATTRIBUTION_OUTPUT: outputPath }),
      /DII_RELEASE_ARTIFACT_BUILD=1 is required/,
    );
    assert.equal(
      createViteBundleAttributionPlugin({
        DII_BUNDLE_ATTRIBUTION_OUTPUT: outputPath,
        DII_RELEASE_ARTIFACT_BUILD: '1',
      }).name,
      'dii-bundle-attribution',
    );
    assert.throws(
      () => readRawBundleAttribution(outputPath),
      /bundle attribution output is missing or invalid JSON/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('release builder removes every exact artifact-consumed output root before build', async () => {
  assert.deepEqual(releaseBuildOutputRoots, [
    'apps/api/dist',
    'apps/web/dist',
    'packages/agent-core/dist',
    'packages/datahub-client/dist',
    'packages/shared-types/dist',
  ]);

  const root = await mkdtemp(path.join(tmpdir(), 'dii-release-clean-'));
  try {
    for (const relativeRoot of releaseBuildOutputRoots) {
      const absoluteRoot = path.join(root, ...relativeRoot.split('/'));
      await mkdir(path.join(absoluteRoot, 'nested'), { recursive: true });
      await writeFile(path.join(absoluteRoot, 'nested', 'qa-stale.js'), 'stale\n');
    }
    const unrelatedOutput = path.join(root, 'packages', 'evaluation', 'dist', 'keep.js');
    const userFile = path.join(root, 'operator-note.txt');
    await mkdir(path.dirname(unrelatedOutput), { recursive: true });
    await writeFile(unrelatedOutput, 'keep\n');
    await writeFile(userFile, 'keep\n');

    await cleanReleaseBuildOutputs(root);

    for (const relativeRoot of releaseBuildOutputRoots) {
      await assert.rejects(
        access(path.join(root, ...relativeRoot.split('/')), constants.F_OK),
        /ENOENT/,
      );
    }
    await access(unrelatedOutput, constants.R_OK);
    await access(userFile, constants.R_OK);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('release builder rejects linked output roots before deleting any safe root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-release-link-'));
  const externalRoot = await mkdtemp(path.join(tmpdir(), 'dii-release-external-'));
  try {
    for (const relativeRoot of releaseBuildOutputRoots.slice(0, -1)) {
      await mkdir(path.join(root, ...relativeRoot.split('/')), { recursive: true });
    }
    const firstSentinel = path.join(root, 'apps', 'api', 'dist', 'qa-stale.js');
    const externalSentinel = path.join(externalRoot, 'outside.js');
    await writeFile(firstSentinel, 'must remain\n');
    await writeFile(externalSentinel, 'must remain\n');

    const linkedRoot = path.join(root, 'packages', 'shared-types', 'dist');
    await mkdir(path.dirname(linkedRoot), { recursive: true });
    await symlink(externalRoot, linkedRoot, platform() === 'win32' ? 'junction' : 'dir');

    await assert.rejects(
      cleanReleaseBuildOutputs(root),
      /must not contain a symbolic link, junction, or reparse target/,
    );
    await access(firstSentinel, constants.R_OK);
    await access(externalSentinel, constants.R_OK);
  } finally {
    await rm(root, { force: true, recursive: true });
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test('attribution and directory verification reject junction or symlink root escapes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-release-evidence-link-'));
  const externalRoot = await mkdtemp(path.join(tmpdir(), 'dii-release-evidence-external-'));
  try {
    const snapshot = 'linked-package@1.0.0';
    const virtualStoreDirectory = virtualStoreDirectoryForSnapshot(snapshot);
    const linkedPackageRoot = path.join(
      root,
      'node_modules',
      '.pnpm',
      virtualStoreDirectory,
      'node_modules',
      'linked-package',
    );
    await mkdir(path.dirname(linkedPackageRoot), { recursive: true });
    await writeFile(
      path.join(externalRoot, 'package.json'),
      `${JSON.stringify({ name: 'linked-package', version: '1.0.0', license: 'MIT' })}\n`,
    );
    await writeFile(path.join(externalRoot, 'LICENSE'), 'External license\n');
    await writeFile(path.join(externalRoot, 'index.js'), 'export const linked = true;\n');
    await symlink(externalRoot, linkedPackageRoot, platform() === 'win32' ? 'junction' : 'dir');
    graphEntriesByRoot.set(root, new Map([[snapshot, { packageKey: snapshot }]]));
    await writeTestLockfile(root);

    await assert.rejects(
      createBundleAttribution(
        {
          schemaVersion: 1,
          chunks: [
            {
              fileName: 'assets/index-linked.js',
              modules: [{ id: path.join(linkedPackageRoot, 'index.js'), renderedLength: 5 }],
            },
          ],
        },
        root,
      ),
      /must remain inside the repository/,
    );

    const linkedVerificationRoot = path.join(root, 'linked-verification-root');
    await symlink(
      externalRoot,
      linkedVerificationRoot,
      platform() === 'win32' ? 'junction' : 'dir',
    );
    await assert.rejects(
      verifyDirectory(linkedVerificationRoot),
      /must not be a symbolic link, junction, or reparse target/,
    );

    await writeFile(path.join(externalRoot, 'linked-input.tar.gz'), 'not an archive');
    const linkedArchiveParent = path.join(root, 'linked-archive-parent');
    await symlink(externalRoot, linkedArchiveParent, platform() === 'win32' ? 'junction' : 'dir');
    await assert.rejects(
      verifyArtifact(path.join(linkedArchiveParent, 'linked-input.tar.gz')),
      /must be canonical and must not traverse a link or reparse target/,
    );
  } finally {
    graphEntriesByRoot.delete(root);
    await rm(root, { force: true, recursive: true });
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test('attribution rejects linked legal and module-source evidence inside a frozen package root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-release-linked-evidence-'));
  const externalRoot = await mkdtemp(path.join(tmpdir(), 'dii-release-linked-source-'));
  try {
    const packageRoot = await writePackageEvidence(
      root,
      'linked-evidence',
      '1.0.0',
      { 'index.js': 'export const linkedEvidence = true;\n' },
      { includeLicense: false },
    );
    const linkedLicense = path.join(packageRoot, 'LICENSE');
    await symlink(externalRoot, linkedLicense, platform() === 'win32' ? 'junction' : 'dir');
    const provenanceFor = (modulePath) => ({
      schemaVersion: 1,
      chunks: [
        {
          fileName: 'assets/index-linked-evidence.js',
          modules: [{ id: modulePath, renderedLength: 5 }],
        },
      ],
    });
    await assert.rejects(
      createBundleAttribution(provenanceFor(path.join(packageRoot, 'index.js')), root),
      /must not contain a symbolic link, junction, or reparse target/,
    );

    await rm(linkedLicense, { force: false, recursive: true });
    await writeFile(linkedLicense, 'Canonical license\n');
    const externalModuleDirectory = path.join(externalRoot, 'module');
    await mkdir(externalModuleDirectory);
    await writeFile(
      path.join(externalModuleDirectory, 'index.js'),
      'export const escaped = true;\n',
    );
    const linkedModuleDirectory = path.join(packageRoot, 'linked-source');
    await symlink(
      externalModuleDirectory,
      linkedModuleDirectory,
      platform() === 'win32' ? 'junction' : 'dir',
    );
    await assert.rejects(
      createBundleAttribution(provenanceFor(path.join(linkedModuleDirectory, 'index.js')), root),
      /must not contain a symbolic link, junction, or reparse target/,
    );
  } finally {
    graphEntriesByRoot.delete(root);
    await rm(root, { force: true, recursive: true });
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test('artifact transaction rejects a linked release output root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-release-output-link-'));
  const externalRoot = await mkdtemp(path.join(tmpdir(), 'dii-release-output-external-'));
  try {
    await mkdir(path.join(root, 'outputs'));
    await symlink(
      externalRoot,
      path.join(root, 'outputs', 'release'),
      platform() === 'win32' ? 'junction' : 'dir',
    );
    await assert.rejects(
      writeArtifactTransaction(
        root,
        'outputs/release/example.tar.gz',
        'outputs/release/example.tar.gz.sha256',
        Buffer.from('archive'),
        'hash  example.tar.gz\n',
      ),
      /must contain only real directories, not links or reparse targets/,
    );
    assert.deepEqual(await readdir(externalRoot), []);
  } finally {
    await rm(root, { force: true, recursive: true });
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test('artifact and sidecar transaction rolls back every partial final output', async () => {
  for (const failure of ['sidecar-write', 'sidecar-rename']) {
    const root = await mkdtemp(path.join(tmpdir(), `dii-release-atomic-${failure}-`));
    try {
      let writeCount = 0;
      let renameCount = 0;
      await assert.rejects(
        writeArtifactTransaction(
          root,
          'outputs/release/example.tar.gz',
          'outputs/release/example.tar.gz.sha256',
          Buffer.from('archive'),
          'hash  example.tar.gz\n',
          {
            writeFile: async (...arguments_) => {
              writeCount += 1;
              if (failure === 'sidecar-write' && writeCount === 2) {
                throw new Error('injected sidecar write failure');
              }
              return writeFile(...arguments_);
            },
            rename: async (...arguments_) => {
              renameCount += 1;
              if (failure === 'sidecar-rename' && renameCount === 2) {
                throw new Error('injected sidecar rename failure');
              }
              return rename(...arguments_);
            },
          },
        ),
        /injected sidecar (?:write|rename) failure/,
      );
      for (const output of ['example.tar.gz', 'example.tar.gz.sha256']) {
        await assert.rejects(
          access(path.join(root, 'outputs', 'release', output), constants.F_OK),
          /ENOENT/,
        );
      }
      assert.deepEqual(await readdir(path.join(root, 'outputs', 'release')), []);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }
});

test('release archive parser rejects a non-gzip payload', () => {
  assert.throws(
    () => parseReleaseArchive(Buffer.from('not-an-archive')),
    /Release artifact verification failed: gzip archive is truncated/,
  );
});
