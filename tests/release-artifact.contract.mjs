import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import { isSafeReleasePath, parseReleaseArchive } from '../scripts/verify-release-artifact.mjs';

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

test('release archive parser rejects a non-gzip payload', () => {
  assert.throws(
    () => parseReleaseArchive(Buffer.from('not-an-archive')),
    /Release artifact verification failed: gzip archive is truncated/,
  );
});
