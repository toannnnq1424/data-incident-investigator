import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../apps/api/src/index.js';
import {
  HealthResponseSchema,
  ReadinessResponseSchema,
} from '../../packages/shared-types/src/index.js';

let server: FastifyInstance | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('API health endpoint', () => {
  it('reports only process liveness without probing an unavailable dependency', async () => {
    const healthCheck = vi.fn().mockRejectedValue(new Error('private-host.internal token-secret'));
    server = buildServer({ metadataHealth: { healthCheck }, mode: 'datahub', logger: false });
    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(HealthResponseSchema.parse(response.json())).toEqual({ status: 'ok' });
    expect(response.json()).toEqual({ status: 'ok' });
    expect(healthCheck).not.toHaveBeenCalled();
  });

  it('reports fixture readiness from validated runtime assets', async () => {
    server = buildServer({ logger: false });
    const response = await server.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(ReadinessResponseSchema.parse(response.json())).toEqual({
      status: 'ready',
      mode: 'fixture',
      checks: [{ name: 'fixture_assets', status: 'ready' }],
    });
  });
});
