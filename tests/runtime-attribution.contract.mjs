import assert from 'node:assert/strict';
import process from 'node:process';
import { test } from 'node:test';

import {
  collectExternalDependencies,
  createRuntimeNotice,
} from '../scripts/runtime-attribution.mjs';
import { createRuntimeManifest } from '../scripts/prepare-runtime-manifests.mjs';

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
  };

  const first = createRuntimeNotice(attribution);
  const second = createRuntimeNotice(attribution);
  assert.deepEqual(first, second);
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
