import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../../apps/api/src/index.js';
import { MetadataProviderError } from '../../packages/datahub-client/src/index.js';
import {
  MetadataLineageResponseSchema,
  type MetadataLineageResponse,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('metadata lineage API', () => {
  it('returns schema-valid bounded fixture lineage without reading credentials', async () => {
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
    const rootUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)';

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/lineage',
      payload: { rootUrn, direction: 'downstream', depth: 2, maxNodes: 3 },
    });
    const lineage = MetadataLineageResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(lineage).toMatchObject({
      rootUrn,
      direction: 'downstream',
      requestedDepth: 2,
      maxNodes: 3,
      visitedNodeCount: 3,
      truncated: true,
    });
    expect(lineage.nodes.filter((node) => node.urn === rootUrn)).toHaveLength(1);
    const nodeUrns = new Set(lineage.nodes.map((node) => node.urn));
    expect(
      lineage.edges.every((edge) => nodeUrns.has(edge.sourceUrn) && nodeUrns.has(edge.targetUrn)),
    ).toBe(true);
  });

  it.each([
    [{ rootUrn: '', direction: 'upstream' }, 'rootUrn'],
    [{ rootUrn: 'urn:li:dataset:root', direction: 'both' }, 'direction'],
    [{ rootUrn: 'urn:li:dataset:root', direction: 'upstream', depth: 0 }, 'depth'],
    [{ rootUrn: 'urn:li:dataset:root', direction: 'upstream', depth: 6 }, 'depth'],
    [{ rootUrn: 'urn:li:dataset:root', direction: 'downstream', maxNodes: 26 }, 'maxNodes'],
    [{ rootUrn: 'urn:li:dataset:root', direction: 'downstream', query: '{}' }, 'request'],
  ])('rejects an invalid request with the stable error contract', async (payload, path) => {
    const server = buildServer({ logger: false });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/lineage',
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The metadata lineage request is invalid.',
      },
    });
    expect(
      response.json<{ error: { issues: Array<{ path: string }> } }>().error.issues[0]?.path,
    ).toBe(path);
  });

  it('passes defaults to the composed provider and validates the exact response echo', async () => {
    const rootUrn = 'urn:li:dataset:root';
    const lineage: MetadataLineageResponse = {
      rootUrn,
      direction: 'upstream',
      requestedDepth: 2,
      maxNodes: 8,
      visitedNodeCount: 1,
      truncated: false,
      nodes: [{ urn: rootUrn, kind: 'dataset', name: 'Root', depth: 0 }],
      edges: [],
    };
    const getLineageGraph = vi.fn().mockResolvedValue(lineage);
    const server = buildServer({
      logger: false,
      mode: 'datahub',
      metadataHealth: { healthCheck: vi.fn() },
      metadataLineage: { getLineageGraph },
    });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/lineage',
      payload: { rootUrn, direction: 'upstream' },
    });

    expect(response.statusCode).toBe(200);
    expect(MetadataLineageResponseSchema.parse(response.json())).toEqual(lineage);
    expect(getLineageGraph).toHaveBeenCalledWith({
      rootUrn,
      direction: 'upstream',
      depth: 2,
      maxNodes: 8,
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
      metadataLineage: {
        getLineageGraph: vi.fn().mockRejectedValue(new MetadataProviderError(status)),
      },
    });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/metadata/lineage',
      payload: { rootUrn: 'urn:li:dataset:root', direction: 'upstream' },
    });

    expect(response.statusCode).toBe(httpStatus);
    expect(response.json()).toMatchObject({ error: { code } });
    expect(response.body).not.toContain(rawSecret);
    expect(response.body.toLowerCase()).not.toContain('bearer ');
  });

  it('normalizes unexpected exceptions and schema-invalid provider graphs', async () => {
    const rootUrn = 'urn:li:dataset:root';
    const unexpectedServer = buildServer({
      logger: false,
      metadataLineage: {
        getLineageGraph: vi.fn().mockRejectedValue(new Error('raw provider exception and token')),
      },
    });
    const invalidServer = buildServer({
      logger: false,
      metadataLineage: {
        getLineageGraph: vi.fn().mockResolvedValue({
          rootUrn,
          direction: 'upstream',
          requestedDepth: 2,
          maxNodes: 8,
          visitedNodeCount: 1,
          truncated: false,
          nodes: [{ urn: rootUrn, kind: 'dataset', name: 'Root', depth: 0 }],
          edges: [{ sourceUrn: rootUrn, targetUrn: 'urn:li:dataset:missing' }],
        }),
      },
    });
    servers.push(unexpectedServer, invalidServer);

    const unexpected = await unexpectedServer.inject({
      method: 'POST',
      url: '/metadata/lineage',
      payload: { rootUrn, direction: 'upstream' },
    });
    const invalid = await invalidServer.inject({
      method: 'POST',
      url: '/metadata/lineage',
      payload: { rootUrn, direction: 'upstream' },
    });

    expect(unexpected.statusCode).toBe(503);
    expect(unexpected.json()).toMatchObject({ error: { code: 'METADATA_UNAVAILABLE' } });
    expect(unexpected.body).not.toContain('raw provider exception');
    expect(invalid.statusCode).toBe(502);
    expect(invalid.json()).toMatchObject({ error: { code: 'METADATA_INVALID_RESPONSE' } });
  });
});
