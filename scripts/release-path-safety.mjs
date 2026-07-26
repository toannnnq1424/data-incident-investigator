import { lstat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';

const windowsDevicePattern =
  /^(?:aux|clock\$|com[1-9¹²³]|con|conin\$|conout\$|lpt[1-9¹²³]|nul|prn)(?:[. ]|$)/i;

function fail(message) {
  throw new Error(`Release path safety failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function comparablePath(value) {
  const normalized = path.normalize(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

async function lstatIfPresent(absolutePath) {
  try {
    return await lstat(absolutePath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

export function isPortablePathSegment(segment) {
  return (
    typeof segment === 'string' &&
    segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    segment.normalize('NFC') === segment &&
    !segment.includes('/') &&
    !segment.includes('\\') &&
    !segment.includes(':') &&
    ![...segment].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 0x1f || codePoint === 0x7f;
    }) &&
    !/[. ]$/.test(segment) &&
    !windowsDevicePattern.test(segment)
  );
}

export function isPortableRelativePath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.normalize('NFC') !== value ||
    value.includes('\\') ||
    value.startsWith('/') ||
    value.startsWith('//') ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value)
  ) {
    return false;
  }
  const segments = value.split('/');
  return segments.join('/') === value && segments.every(isPortablePathSegment);
}

export function portablePathKey(value) {
  assert(isPortableRelativePath(value), `unsafe portable path ${JSON.stringify(value)}`);
  return value.toLowerCase();
}

export function assertUniquePortablePaths(values, label = 'paths') {
  const seen = new Set();
  for (const value of values) {
    const key = portablePathKey(value);
    assert(!seen.has(key), `${label} contain a Windows-ambiguous duplicate: ${value}`);
    seen.add(key);
  }
}

export async function assertCanonicalRoot(rootPath, label = 'root') {
  const resolvedRoot = path.resolve(rootPath);
  const rootStat = await lstat(resolvedRoot);
  assert(
    rootStat.isDirectory() && !rootStat.isSymbolicLink(),
    `${label} must be a real directory, not a link or reparse target`,
  );
  const canonicalRoot = await realpath(resolvedRoot);
  assert(
    comparablePath(canonicalRoot) === comparablePath(resolvedRoot),
    `${label} must be canonical and must not traverse a link or reparse target`,
  );
  return canonicalRoot;
}

export async function assertCanonicalContainedPath(
  rootPath,
  relativePath,
  { label = relativePath, type = 'file' } = {},
) {
  assert(isPortableRelativePath(relativePath), `${label} has an unsafe relative path`);
  const canonicalRoot = await assertCanonicalRoot(rootPath, `${label} containment root`);
  const segments = relativePath.split('/');
  let current = canonicalRoot;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const entryStat = await lstat(current);
    assert(
      !entryStat.isSymbolicLink(),
      `${label} must not contain a symbolic link, junction, or reparse target`,
    );
    if (index < segments.length - 1) {
      assert(entryStat.isDirectory(), `${label} has a non-directory ancestor`);
    } else if (type === 'directory') {
      assert(entryStat.isDirectory(), `${label} is not a directory`);
    } else {
      assert(entryStat.isFile(), `${label} is not a regular file`);
    }
  }

  const canonicalPath = await realpath(current);
  const relativeCanonical = path.relative(canonicalRoot, canonicalPath);
  assert(
    comparablePath(canonicalPath) === comparablePath(current) &&
      relativeCanonical !== '' &&
      relativeCanonical !== '..' &&
      !relativeCanonical.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativeCanonical),
    `${label} must remain canonical and inside its containment root`,
  );
  return canonicalPath;
}

export async function assertCanonicalStandalonePath(
  absolutePath,
  { label = 'path', type = 'file' } = {},
) {
  const resolvedPath = path.resolve(absolutePath);
  const entryStat = await lstat(resolvedPath);
  assert(
    !entryStat.isSymbolicLink(),
    `${label} must not be a symbolic link, junction, or reparse target`,
  );
  assert(
    type === 'directory' ? entryStat.isDirectory() : entryStat.isFile(),
    `${label} is not a ${type === 'directory' ? 'directory' : 'regular file'}`,
  );
  const canonicalPath = await realpath(resolvedPath);
  assert(
    comparablePath(canonicalPath) === comparablePath(resolvedPath),
    `${label} must be canonical and must not traverse a link or reparse target`,
  );
  return canonicalPath;
}

export async function ensureCanonicalContainedDirectory(
  rootPath,
  relativePath,
  label = relativePath,
) {
  assert(isPortableRelativePath(relativePath), `${label} has an unsafe relative path`);
  const canonicalRoot = await assertCanonicalRoot(rootPath, `${label} containment root`);
  let current = canonicalRoot;
  for (const segment of relativePath.split('/')) {
    current = path.join(current, segment);
    let entryStat = await lstatIfPresent(current);
    if (!entryStat) {
      await mkdir(current, { recursive: false });
      entryStat = await lstat(current);
    }
    assert(
      entryStat.isDirectory() && !entryStat.isSymbolicLink(),
      `${label} must contain only real directories, not links or reparse targets`,
    );
    const canonicalCurrent = await realpath(current);
    assert(
      comparablePath(canonicalCurrent) === comparablePath(current),
      `${label} must remain canonical and inside its containment root`,
    );
  }
  return current;
}
