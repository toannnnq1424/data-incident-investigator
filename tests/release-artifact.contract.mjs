import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { constants } from 'node:fs';
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { platform, tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createBundleAttribution } from '../scripts/bundle-attribution.mjs';
import {
  cleanReleaseBuildOutputs,
  releaseBuildOutputRoots,
} from '../scripts/build-release-artifact.mjs';
import {
  createThirdPartyNotice,
  isAllowedPayloadPath,
  isSafeReleasePath,
  parseReleaseArchive,
  validateThirdPartyNotice,
} from '../scripts/verify-release-artifact.mjs';

async function writePackageEvidence(root, packageName, version, files, options = {}) {
  const packageRoot = path.join(
    root,
    'node_modules',
    '.pnpm',
    `${packageName.replace('/', '+')}@${version}`,
    'node_modules',
    ...packageName.split('/'),
  );
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: packageName,
        version,
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
  ];

  assert.equal(safePaths.every(isSafeReleasePath), true);
  assert.equal(unsafePaths.some(isSafeReleasePath), false);
});

test('release payload allows compiled runtime workspaces and excludes their source', () => {
  for (const packageName of ['agent-core', 'datahub-client', 'shared-types']) {
    assert.equal(isAllowedPayloadPath(`packages/${packageName}/dist/index.js`), true);
    assert.equal(isAllowedPayloadPath(`packages/${packageName}/dist/index.d.ts`), true);
    assert.equal(isAllowedPayloadPath(`packages/${packageName}/src/index.ts`), false);
  }
});

test('bundle attribution deterministically maps rendered package and Vite virtual modules', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dii-bundle-attribution-'));
  try {
    const reactRoot = await writePackageEvidence(
      root,
      'react',
      '19.2.7',
      { 'cjs/react.production.js': 'export const value = 1;\n' },
      { licenseFile: 'LICENSE.md' },
    );
    const reactDomRoot = await writePackageEvidence(root, 'react-dom', '19.2.7', {
      'cjs/react-dom.production.js': 'export const dom = true;\n',
    });
    const viteRoot = path.join(root, 'apps', 'web', 'node_modules', 'vite');
    await mkdir(path.join(viteRoot, 'dist', 'node', 'chunks'), { recursive: true });
    await writeFile(
      path.join(viteRoot, 'package.json'),
      `${JSON.stringify({ name: 'vite', version: '7.3.1', license: 'MIT' }, null, 2)}\n`,
    );
    await writeFile(path.join(viteRoot, 'LICENSE.md'), 'Vite license\n');
    await writeFile(
      path.join(viteRoot, 'dist', 'node', 'chunks', 'config.js'),
      'export const helper = true;\n',
    );

    const moduleEntries = [
      {
        id: path.join(reactRoot, 'cjs', 'react.production.js'),
        renderedLength: 41,
      },
      {
        id: path.join(reactDomRoot, 'cjs', 'react-dom.production.js'),
        renderedLength: 37,
      },
      { id: '\0vite/modulepreload-polyfill.js', renderedLength: 29 },
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
      ['react@19.2.7', 'react-dom@19.2.7', 'vite@7.3.1'],
    );
    assert.deepEqual(
      first.packages.flatMap(({ contributions }) =>
        contributions.flatMap(({ modules }) => modules.map(({ path }) => path)),
      ),
      [
        'cjs/react.production.js',
        'cjs/react-dom.production.js',
        'virtual:vite/modulepreload-polyfill.js',
      ],
    );

    const notice = createThirdPartyNotice(first);
    validateThirdPartyNotice(notice, first);
    assert.throws(
      () => validateThirdPartyNotice(Buffer.concat([notice, Buffer.from('tampered\n')]), first),
      /content is not canonical/,
    );
  } finally {
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
      /must be a real directory, not a link or reparse target/,
    );
    await access(firstSentinel, constants.R_OK);
    await access(externalSentinel, constants.R_OK);
  } finally {
    await rm(root, { force: true, recursive: true });
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test('release archive parser rejects a non-gzip payload', () => {
  assert.throws(
    () => parseReleaseArchive(Buffer.from('not-an-archive')),
    /Release artifact verification failed: gzip archive is truncated/,
  );
});
