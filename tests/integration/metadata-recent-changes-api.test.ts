import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../../apps/api/src/index.js';
import { MetadataProviderError } from '../../packages/datahub-client/src/index.js';
import {
  MetadataRecentChangesResponseSchema,
  type MetadataRecentChangesResponse,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];
const rootUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)';

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

function responseFixture(overrides: Partial<MetadataRecentChangesResponse> = {}) {
  return {
    entityUrn: rootUrn,
    window: {
      startTime: '2026-07-12T08:30:00.000Z',
      endTime: '2026-07-19T08:30:00.000Z',
      hours: 168,
    },
    limit: 10,
    returnedCount: 1,
    truncated: false,
    changes: [
      {
        id: 'change-root-schema',
        entityUrn: rootUrn,
        timestamp: '2026-07-19T07:45:00.000Z',
        category: 'schema' as const,
        operation: 'modified' as const,
        source: 'datahub' as const,
        summary: 'Schema modified: gross_revenue.',
        field: 'gross_revenue',
      },
    ],
    ...overrides,
  } satisfies MetadataRecentChangesResponse;
}

describe('metadata recent changes API', () => {
  it('returns schema-valid deterministic fixture history without reading credentials', async () => {
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

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/recent-changes',
      payload: { entityUrn: rootUrn },
    });
    const recentChanges = MetadataRecentChangesResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(recentChanges).toMatchObject({
      entityUrn: rootUrn,
      window: {
        startTime: '2026-07-12T08:30:00.000Z',
        endTime: '2026-07-19T08:30:00.000Z',
        hours: 168,
      },
      limit: 10,
      returnedCount: 3,
      truncated: true,
    });
    expect(recentChanges.changes.map(({ id }) => id)).toEqual([
      'change-root-owner',
      'change-root-schema',
      'change-root-tag',
    ]);
  });

  it.each([
    [{ entityUrn: '' }, 'entityUrn'],
    [{ entityUrn: rootUrn, endTime: '2026-07-19T08:30:00Z' }, 'endTime'],
    [{ entityUrn: rootUrn, windowHours: 0 }, 'windowHours'],
    [{ entityUrn: rootUrn, windowHours: 721 }, 'windowHours'],
    [{ entityUrn: rootUrn, limit: 0 }, 'limit'],
    [{ entityUrn: rootUrn, limit: 21 }, 'limit'],
    [{ entityUrn: rootUrn, query: '{}' }, 'request'],
  ])('rejects an invalid request with the stable error contract', async (payload, path) => {
    const server = buildServer({ logger: false });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/recent-changes',
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The metadata recent-changes request is invalid.',
      },
    });
    expect(
      response.json<{ error: { issues: Array<{ path: string }> } }>().error.issues[0]?.path,
    ).toBe(path);
  });

  it('passes defaults to the composed provider and validates the response echo', async () => {
    const recentChanges = responseFixture();
    const getRecentChangesForEntity = vi.fn().mockResolvedValue(recentChanges);
    const server = buildServer({
      logger: false,
      mode: 'datahub',
      metadataHealth: { healthCheck: vi.fn() },
      metadataRecentChanges: { getRecentChangesForEntity },
    });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/recent-changes',
      payload: { entityUrn: rootUrn },
    });

    expect(response.statusCode).toBe(200);
    expect(MetadataRecentChangesResponseSchema.parse(response.json())).toEqual(recentChanges);
    expect(getRecentChangesForEntity).toHaveBeenCalledWith({
      entityUrn: rootUrn,
      windowHours: 168,
      limit: 10,
    });
  });

  it.each([
    ['unconfigured', 503, 'METADATA_UNCONFIGURED'],
    ['unauthorized', 502, 'METADATA_UNAUTHORIZED'],
    ['unavailable', 503, 'METADATA_UNAVAILABLE'],
    ['timeout', 504, 'METADATA_TIMEOUT'],
    ['invalid_response', 502, 'METADATA_INVALID_RESPONSE'],
    ['not_found', 404, 'NOT_FOUND'],
  ] as const)('returns a safe %s provider error', async (status, httpStatus, code) => {
    const rawSecret = 'https://secret.example.invalid?token=do-not-leak';
    const server = buildServer({
      logger: false,
      mode: 'datahub',
      metadataHealth: { healthCheck: vi.fn() },
      metadataRecentChanges: {
        getRecentChangesForEntity: vi.fn().mockRejectedValue(new MetadataProviderError(status)),
      },
    });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/recent-changes',
      payload: { entityUrn: rootUrn },
    });

    expect(response.statusCode).toBe(httpStatus);
    expect(response.json()).toMatchObject({ error: { code } });
    expect(response.body).not.toContain(rawSecret);
    expect(response.body.toLowerCase()).not.toContain('bearer ');
  });

  it('normalizes unexpected exceptions and schema-invalid provider history', async () => {
    const unexpectedServer = buildServer({
      logger: false,
      metadataRecentChanges: {
        getRecentChangesForEntity: vi
          .fn()
          .mockRejectedValue(new Error('raw provider exception and token')),
      },
    });
    const invalidServer = buildServer({
      logger: false,
      metadataRecentChanges: {
        getRecentChangesForEntity: vi.fn().mockResolvedValue(
          responseFixture({
            returnedCount: 1,
            changes: [
              {
                ...responseFixture().changes[0]!,
                timestamp: '2026-07-11T07:45:00.000Z',
              },
            ],
          }),
        ),
      },
    });
    servers.push(unexpectedServer, invalidServer);

    const unexpected = await unexpectedServer.inject({
      method: 'POST',
      url: '/metadata/recent-changes',
      payload: { entityUrn: rootUrn },
    });
    const invalid = await invalidServer.inject({
      method: 'POST',
      url: '/metadata/recent-changes',
      payload: { entityUrn: rootUrn },
    });

    expect(unexpected.statusCode).toBe(503);
    expect(unexpected.json()).toMatchObject({ error: { code: 'METADATA_UNAVAILABLE' } });
    expect(unexpected.body).not.toContain('raw provider exception');
    expect(invalid.statusCode).toBe(502);
    expect(invalid.json()).toMatchObject({ error: { code: 'METADATA_INVALID_RESPONSE' } });
  });
});
