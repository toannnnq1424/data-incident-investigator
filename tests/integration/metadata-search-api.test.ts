import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../../apps/api/src/index.js';
import { MetadataProviderError } from '../../packages/datahub-client/src/index.js';
import {
  MetadataEntitySearchResponseSchema,
  type MetadataEntitySearchResult,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('metadata entity search API', () => {
  it('returns deterministic fixture multiple, empty, and filtered results without credentials', async () => {
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

    const multipleResponse = await server.inject({
      method: 'POST',
      url: '/metadata/search',
      payload: { query: '  revenue  ', limit: 10 },
    });
    const multiple = MetadataEntitySearchResponseSchema.parse(multipleResponse.json());
    const emptyResponse = await server.inject({
      method: 'POST',
      url: '/metadata/search',
      payload: { query: 'customer support tickets' },
    });
    const filteredResponse = await server.inject({
      method: 'POST',
      url: '/metadata/search',
      payload: { query: 'revenue', entityType: 'dashboard', limit: 1 },
    });

    expect(multipleResponse.statusCode).toBe(200);
    expect(multiple.query).toBe('revenue');
    expect(multiple.results.map((result) => result.name)).toEqual([
      'analytics.daily_revenue',
      'Revenue overview',
    ]);
    expect(emptyResponse.statusCode).toBe(200);
    expect(emptyResponse.json()).toMatchObject({ results: [] });
    expect(filteredResponse.statusCode).toBe(200);
    expect(filteredResponse.json()).toMatchObject({
      entityType: 'dashboard',
      limit: 1,
      results: [{ kind: 'dashboard', name: 'Revenue overview' }],
    });
  });

  it.each([
    [{ query: ' ' }, 'query'],
    [{ query: 'revenue', entityType: 'user' }, 'entityType'],
    [{ query: 'revenue', limit: 0 }, 'limit'],
    [{ query: 'revenue', limit: 21 }, 'limit'],
    [{ query: 'revenue', limit: 1.5 }, 'limit'],
    [{ query: 'revenue', unexpected: true }, 'request'],
  ])('rejects an invalid request with the stable error contract', async (payload, path) => {
    const server = buildServer({ logger: false });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/search',
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The metadata search request is invalid.',
      },
    });
    expect(
      response.json<{ error: { issues: Array<{ path: string }> } }>().error.issues[0]?.path,
    ).toBe(path);
  });

  it('passes the normalized request to the composed provider and validates the response', async () => {
    const results: MetadataEntitySearchResult[] = [
      {
        urn: 'urn:li:dataset:revenue',
        kind: 'dataset',
        name: 'analytics.revenue',
        description: 'Safe description.',
      },
    ];
    const searchEntities = vi.fn().mockResolvedValue(results);
    const server = buildServer({
      logger: false,
      mode: 'datahub',
      metadataHealth: { healthCheck: vi.fn() },
      metadataSearch: { searchEntities },
    });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/search',
      payload: { query: '  revenue  ', entityType: 'dataset', limit: 4 },
    });

    expect(response.statusCode).toBe(200);
    expect(MetadataEntitySearchResponseSchema.parse(response.json())).toEqual({
      query: 'revenue',
      entityType: 'dataset',
      limit: 4,
      results,
    });
    expect(searchEntities).toHaveBeenCalledWith({
      query: 'revenue',
      entityType: 'dataset',
      limit: 4,
    });
  });

  it.each([
    ['unconfigured', 503, 'METADATA_UNCONFIGURED'],
    ['unauthorized', 502, 'METADATA_UNAUTHORIZED'],
    ['unavailable', 503, 'METADATA_UNAVAILABLE'],
    ['timeout', 504, 'METADATA_TIMEOUT'],
    ['invalid_response', 502, 'METADATA_INVALID_RESPONSE'],
  ] as const)('returns a safe %s provider error', async (status, httpStatus, code) => {
    const rawSecret = 'https://secret.example.invalid?token=do-not-leak';
    const server = buildServer({
      logger: false,
      mode: 'datahub',
      metadataHealth: { healthCheck: vi.fn() },
      metadataSearch: {
        searchEntities: vi.fn().mockRejectedValue(new MetadataProviderError(status)),
      },
    });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/search',
      payload: { query: 'revenue' },
    });

    expect(response.statusCode).toBe(httpStatus);
    expect(response.json()).toMatchObject({ error: { code } });
    expect(response.body).not.toContain(rawSecret);
    expect(response.body.toLowerCase()).not.toContain('bearer ');
  });

  it('normalizes unexpected exceptions and schema-invalid provider results', async () => {
    const unexpectedServer = buildServer({
      logger: false,
      metadataSearch: {
        searchEntities: vi.fn().mockRejectedValue(new Error('raw provider exception and token')),
      },
    });
    const invalidServer = buildServer({
      logger: false,
      metadataSearch: {
        searchEntities: vi
          .fn()
          .mockResolvedValue([{ urn: '', kind: 'dataset', name: 'invalid result' }]),
      },
    });
    servers.push(unexpectedServer, invalidServer);

    const unexpected = await unexpectedServer.inject({
      method: 'POST',
      url: '/metadata/search',
      payload: { query: 'revenue' },
    });
    const invalid = await invalidServer.inject({
      method: 'POST',
      url: '/metadata/search',
      payload: { query: 'revenue' },
    });

    expect(unexpected.statusCode).toBe(503);
    expect(unexpected.json()).toMatchObject({ error: { code: 'METADATA_UNAVAILABLE' } });
    expect(unexpected.body).not.toContain('raw provider exception');
    expect(invalid.statusCode).toBe(502);
    expect(invalid.json()).toMatchObject({ error: { code: 'METADATA_INVALID_RESPONSE' } });
  });
});
