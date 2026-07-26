import { isPortableRelativePath } from './release-path-safety.mjs';

const packageNamePattern =
  /^(?:@[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?\/)?[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const versionPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function fail(message) {
  throw new Error(`pnpm graph identity failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function parsePackageIdentity(value, label) {
  const separator = value.lastIndexOf('@');
  assert(separator > 0, `${label} has no version separator`);
  const name = value.slice(0, separator);
  const version = value.slice(separator + 1);
  assert(packageNamePattern.test(name), `${label} has an invalid package name`);
  assert(versionPattern.test(version), `${label} has an unsupported package version`);
  return { name, version };
}

function extractSectionKeys(lockfileText, sectionName) {
  const lines = lockfileText.split('\n');
  const sectionIndex = lines.indexOf(`${sectionName}:`);
  assert(sectionIndex !== -1, `pnpm lockfile is missing ${sectionName}`);
  const keys = [];
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.length > 0 && !line.startsWith(' ')) break;
    if (!line.startsWith('  ') || line.startsWith('    ') || line.trim().length === 0) continue;
    const match = /^ {2}(?:(?:'([^']+)')|([^:'"][^:]*)):\s*(?:.*)?$/.exec(line);
    assert(match, `pnpm lockfile ${sectionName} key syntax is unsupported`);
    keys.push(match[1] ?? match[2]);
  }
  assert(keys.length > 0, `pnpm lockfile ${sectionName} is empty`);
  assert(
    new Set(keys).size === keys.length,
    `pnpm lockfile ${sectionName} contains duplicate keys`,
  );
  return keys;
}

export function parsePnpmSnapshotKey(snapshotKey) {
  assert(typeof snapshotKey === 'string' && snapshotKey.length > 0, 'snapshot key is empty');
  const peerStart = snapshotKey.indexOf('(');
  const packageKey = peerStart === -1 ? snapshotKey : snapshotKey.slice(0, peerStart);
  const identity = parsePackageIdentity(packageKey, `snapshot ${snapshotKey}`);
  const peers = [];
  let offset = packageKey.length;
  while (offset < snapshotKey.length) {
    assert(snapshotKey[offset] === '(', `snapshot ${snapshotKey} has an unsupported peer suffix`);
    const close = snapshotKey.indexOf(')', offset + 1);
    assert(close !== -1, `snapshot ${snapshotKey} has an unterminated peer suffix`);
    const peerKey = snapshotKey.slice(offset + 1, close);
    assert(!peerKey.includes('('), `snapshot ${snapshotKey} has a nested peer suffix`);
    parsePackageIdentity(peerKey, `snapshot ${snapshotKey} peer`);
    peers.push(peerKey);
    offset = close + 1;
  }
  return { ...identity, packageKey, peers, snapshotKey };
}

export function virtualStoreDirectoryForSnapshot(snapshotKey) {
  const parsed = parsePnpmSnapshotKey(snapshotKey);
  const encoded = [parsed.packageKey, ...parsed.peers].map((value) => value.replaceAll('/', '+'));
  const virtualStoreDirectory = encoded.join('_');
  assert(
    !virtualStoreDirectory.includes('(') && !virtualStoreDirectory.includes(')'),
    `snapshot ${snapshotKey} has an unsupported virtual-store encoding`,
  );
  return virtualStoreDirectory;
}

export function parsePnpmLockGraph(lockfileText) {
  assert(typeof lockfileText === 'string', 'pnpm lockfile must be UTF-8 text');
  assert(!lockfileText.includes('\r'), 'pnpm lockfile must use LF line endings');
  assert(lockfileText.startsWith("lockfileVersion: '9.0'\n"), 'only pnpm lockfile v9 is supported');
  const packageKeys = extractSectionKeys(lockfileText, 'packages');
  const snapshotKeys = extractSectionKeys(lockfileText, 'snapshots');
  const packages = new Set(packageKeys);
  for (const snapshotKey of snapshotKeys) {
    const packageKey = snapshotKey.split('(', 1)[0];
    assert(packages.has(packageKey), `snapshot ${snapshotKey} has no packages entry`);
  }
  return { packages, snapshotKeys: new Set(snapshotKeys) };
}

export function resolvePnpmPackageRootIdentity(packageRoot, graph) {
  assert(isPortableRelativePath(packageRoot), 'package root path is unsafe');
  const segments = packageRoot.split('/');
  assert(
    segments.length === 5 || segments.length === 6,
    `package root ${packageRoot} has an unsupported pnpm virtual-store path`,
  );
  assert(
    segments[0] === 'node_modules' && segments[1] === '.pnpm' && segments[3] === 'node_modules',
    `package root ${packageRoot} is not in the pnpm virtual store`,
  );
  const packageSegments = segments.slice(4);
  const packageName = packageSegments[0].startsWith('@')
    ? `${packageSegments[0]}/${packageSegments[1] ?? ''}`
    : packageSegments[0];
  assert(
    packageSegments.length === (packageName.startsWith('@') ? 2 : 1) &&
      packageNamePattern.test(packageName),
    `package root ${packageRoot} has an invalid package name`,
  );
  const candidates = [];
  for (const snapshotKey of graph.snapshotKeys) {
    const packageKey = snapshotKey.split('(', 1)[0];
    const baseIdentity = parsePackageIdentity(packageKey, `snapshot ${snapshotKey}`);
    if (baseIdentity.name !== packageName) continue;
    const parsed = parsePnpmSnapshotKey(snapshotKey);
    if (virtualStoreDirectoryForSnapshot(snapshotKey) === segments[2]) candidates.push(parsed);
  }
  assert(
    candidates.length === 1,
    candidates.length === 0
      ? `package root ${packageRoot} does not represent a frozen lock snapshot`
      : `package root ${packageRoot} ambiguously represents multiple frozen lock snapshots`,
  );
  const [snapshot] = candidates;
  assert(
    snapshot.name === packageName,
    `package root ${packageRoot} differs from lock snapshot ${snapshot.snapshotKey}`,
  );
  assert(
    graph.packages.has(snapshot.packageKey),
    `lock package ${snapshot.packageKey} is missing from frozen graph`,
  );
  return {
    lockPackage: snapshot.packageKey,
    lockSnapshot: snapshot.snapshotKey,
    name: snapshot.name,
    packageRoot,
    version: snapshot.version,
  };
}
