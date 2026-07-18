import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';

export function buildServer() {
  const server = Fastify({ logger: true });

  server.get('/health', async () => ({
    status: 'ok',
    service: 'data-incident-investigator-api',
    mode: process.env.APP_MODE ?? 'fixture',
  }));

  return server;
}

async function start() {
  const server = buildServer();
  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '127.0.0.1';

  await server.listen({ host, port });
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
