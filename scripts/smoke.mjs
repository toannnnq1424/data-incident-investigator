import { access } from 'node:fs/promises';

const requiredArtifacts = ['apps/api/dist/index.js', 'apps/web/dist/index.html'];

await Promise.all(requiredArtifacts.map((artifact) => access(artifact)));

console.log(`Smoke check passed: ${requiredArtifacts.join(', ')}`);
