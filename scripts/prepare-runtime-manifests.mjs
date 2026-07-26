import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimePackages = [
  'packages/agent-core/package.json',
  'packages/datahub-client/package.json',
  'packages/shared-types/package.json',
];

function fail(message) {
  throw new Error(`Runtime manifest preparation failed: ${message}`);
}

export function createRuntimeManifest(manifest, manifestPath) {
  if (
    manifest?.exports?.['.']?.types !== './src/index.ts' ||
    manifest?.exports?.['.']?.import !== './src/index.ts'
  ) {
    fail(`${manifestPath} does not have the expected source exports`);
  }
  return {
    ...manifest,
    exports: {
      ...manifest.exports,
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    },
  };
}

async function main() {
  for (const manifestPath of runtimePackages) {
    const absolutePath = path.join(repositoryRoot, ...manifestPath.split('/'));
    const manifest = JSON.parse(await readFile(absolutePath, 'utf8'));
    const runtimeManifest = createRuntimeManifest(manifest, manifestPath);
    await writeFile(absolutePath, `${JSON.stringify(runtimeManifest, null, 2)}\n`, 'utf8');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Runtime manifest preparation failed.');
    process.exitCode = 1;
  });
}
