import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../../apps/api/src/index.js';
import { MetadataHealthResponseSchema } from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('metadata health API', () => {
  it('returns deterministic fixture readiness without reading DataHub credentials', async () => {
    const environment = new Proxy<NodeJS.ProcessEnv>(
      { APP_MODE: 'fixture' },
      {
        get(target, property, receiver) {
          if (property === 'DATAHUB_GMS_URL' || property === 'DATAHUB_TOKEN') {
            throw new Error('Fixture mode must not read DataHub configuration.');
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const server = buildServer({ environment, logger: false });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/metadata/health' });
    const health = MetadataHealthResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(health).toEqual({
      mode: 'fixture',
      status: 'ready',
      message: 'Fixture metadata is ready.',
    });
  });

  it('returns the normalized DataHub result from the health boundary', async () => {
    const healthCheck = vi.fn().mockResolvedValue({
      status: 'unauthorized',
      message: 'DataHub rejected the configured credentials. Check the access token.',
    });
    const server = buildServer({
      logger: false,
      metadataHealth: { healthCheck },
      mode: 'datahub',
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/metadata/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      mode: 'datahub',
      status: 'unauthorized',
      message: 'DataHub rejected the configured credentials. Check the access token.',
    });
    expect(healthCheck).toHaveBeenCalledOnce();
  });

  it('normalizes an unexpected provider exception without exposing its details', async () => {
    const rawSecret = 'https://secret.example.invalid?token=do-not-leak';
    const server = buildServer({
      logger: false,
      metadataHealth: {
        healthCheck: vi.fn().mockRejectedValue(new Error(rawSecret)),
      },
      mode: 'datahub',
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/metadata/health' });
    const serializedResponse = response.body;

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      mode: 'datahub',
      status: 'unavailable',
      message: 'DataHub metadata is unavailable. Check the service and network connection.',
    });
    expect(serializedResponse).not.toContain(rawSecret);
    expect(serializedResponse.toLowerCase()).not.toContain('authorization');
  });
});
