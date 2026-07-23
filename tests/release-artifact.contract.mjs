import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { constants } from 'node:fs';
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { platform, tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  cleanReleaseBuildOutputs,
  releaseBuildOutputRoots,
} from '../scripts/build-release-artifact.mjs';
import {
  isAllowedPayloadPath,
  isSafeReleasePath,
  parseReleaseArchive,
} from '../scripts/verify-release-artifact.mjs';

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
