import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createCanonicalEvaluationArtifacts } from './index.js';

function outputDirectory(arguments_: string[]) {
  const index = arguments_.indexOf('--output-dir');
  if (index === -1) return undefined;
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('The --output-dir option requires one directory path.');
  }
  return resolve(value);
}

const artifacts = await createCanonicalEvaluationArtifacts();
const directory = outputDirectory(process.argv.slice(2));

if (directory) {
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(resolve(directory, 'canonical-evaluation.json'), artifacts.json, 'utf8'),
    writeFile(resolve(directory, 'canonical-evaluation.md'), artifacts.markdown, 'utf8'),
  ]);
  process.stdout.write(`${directory}\n`);
} else {
  process.stdout.write(`${artifacts.json}\n${artifacts.markdown}`);
}
