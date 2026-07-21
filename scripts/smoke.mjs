import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const requiredArtifacts = ['apps/api/dist/index.js', 'apps/web/dist/index.html'];

await Promise.all(requiredArtifacts.map((artifact) => access(artifact)));

const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const tsxApiUrl = pathToFileURL(requireFromApi.resolve('tsx/esm/api')).href;
const { tsImport } = await import(tsxApiUrl);
const { buildServer } = await tsImport('../apps/api/dist/index.js', import.meta.url);
const server = buildServer({
  environment: { APP_MODE: 'fixture' },
  logger: false,
});

try {
  await server.listen({ host: '127.0.0.1', port: 0 });
  const address = server.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Smoke server did not expose a TCP address.');
  }

  const origin = `http://127.0.0.1:${address.port}`;
  const healthResponse = await fetch(`${origin}/health`);
  const readinessResponse = await fetch(`${origin}/ready`);
  const health = await healthResponse.json();
  const readiness = await readinessResponse.json();

  if (
    healthResponse.status !== 200 ||
    JSON.stringify(health) !== JSON.stringify({ status: 'ok' })
  ) {
    throw new Error('Built API liveness smoke failed.');
  }
  if (
    readinessResponse.status !== 200 ||
    JSON.stringify(readiness) !==
      JSON.stringify({
        status: 'ready',
        mode: 'fixture',
        checks: [{ name: 'fixture_assets', status: 'ready' }],
      })
  ) {
    throw new Error('Built API readiness smoke failed.');
  }
} finally {
  await server.close();
}

console.log(`Smoke check passed: ${requiredArtifacts.join(', ')}, GET /health, GET /ready`);
