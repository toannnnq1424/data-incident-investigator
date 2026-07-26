import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, readListenConfig } from '../../apps/api/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];
const staticRoots: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(
    staticRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('production same-origin host', () => {
  it('serves the built web root while preserving API routes under /api', async () => {
    const staticRoot = await mkdtemp(path.join(tmpdir(), 'dii-production-host-'));
    staticRoots.push(staticRoot);
    await mkdir(path.join(staticRoot, 'assets'));
    await writeFile(
      path.join(staticRoot, 'index.html'),
      '<!doctype html><title>Data Incident Investigator</title>',
      'utf8',
    );
    await writeFile(
      path.join(staticRoot, 'assets', 'app.js'),
      'export const ready = true;',
      'utf8',
    );

    const server = buildServer({
      environment: { APP_MODE: 'fixture' },
      logger: false,
      staticRoot,
    });
    servers.push(server);

    const [rootResponse, assetResponse, healthResponse, readinessResponse] = await Promise.all([
      server.inject({ method: 'GET', url: '/' }),
      server.inject({ method: 'GET', url: '/assets/app.js' }),
      server.inject({ method: 'GET', url: '/api/health' }),
      server.inject({ method: 'GET', url: '/api/ready' }),
    ]);

    expect(rootResponse.statusCode).toBe(200);
    expect(rootResponse.headers['content-type']).toContain('text/html');
    expect(rootResponse.body).toContain('Data Incident Investigator');
    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.body).toContain('ready = true');
    expect(healthResponse.json()).toEqual({ status: 'ok' });
    expect(readinessResponse.json()).toEqual({
      status: 'ready',
      mode: 'fixture',
      checks: [{ name: 'fixture_assets', status: 'ready' }],
    });
  });

  it('uses Cloud Run PORT and an external bind without changing local defaults', () => {
    expect(readListenConfig({})).toEqual({ host: '127.0.0.1', port: 3001 });
    expect(readListenConfig({ API_PORT: '3002' })).toEqual({
      host: '127.0.0.1',
      port: 3002,
    });
    expect(readListenConfig({ PORT: '8080' })).toEqual({ host: '0.0.0.0', port: 8080 });
    expect(readListenConfig({ API_HOST: '::', PORT: '8080' })).toEqual({
      host: '::',
      port: 8080,
    });
    expect(() => readListenConfig({ PORT: 'invalid' })).toThrow('PORT');
  });
});
