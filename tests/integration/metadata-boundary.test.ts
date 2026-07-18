import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/index.js';
import {
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesResponseSchema,
  type MetadataSourceMode,
} from '../../packages/shared-types/src/index.js';

const servers: Server[] = [];
const rootUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)';
const endTime = '2026-07-19T08:30:00.000Z';

async function startFakeDataHub(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
});

function jsonResponse(response: Parameters<RequestListener>[1], body: unknown, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: Parameters<RequestListener>[0]) {
  let body = '';
  request.setEncoding('utf8');
  for await (const chunk of request) {
    body += chunk;
  }
  return JSON.parse(body) as { query?: string };
}

function dataHubEntity() {
  return {
    urn: rootUrn,
    type: 'DATASET',
    properties: {
      name: 'lineage.demo.root',
      qualifiedName: 'snowflake.lineage.demo.root',
      description: 'Provider-neutral contract root.',
    },
    rawProviderMarker: 'must-not-cross-boundary',
  };
}

function handleGraphQl(query: string | undefined) {
  if (query?.includes('searchAcrossEntities')) {
    return {
      data: {
        searchAcrossEntities: { searchResults: [{ entity: dataHubEntity() }] },
      },
    };
  }
  if (query?.includes('searchAcrossLineage')) {
    return {
      data: {
        root: dataHubEntity(),
        searchAcrossLineage: { total: 0, searchResults: [] },
      },
    };
  }
  if (query?.includes('getTimeline')) {
    const timestampMillis = Date.parse('2026-07-19T07:45:00.000Z');
    return {
      data: {
        root: { urn: rootUrn },
        getTimeline: {
          changeTransactions: [
            {
              timestampMillis,
              lastSemanticVersion: '1.0.0',
              versionStamp: 'contract-test',
              changeType: 'MODIFY',
              actor: 'urn:li:corpuser:contract-test',
              changes: [
                {
                  urn: rootUrn,
                  category: 'TECHNICAL_SCHEMA',
                  operation: 'MODIFY',
                  modifier: 'gross_revenue',
                  parameters: [],
                  auditStamp: {
                    actor: 'urn:li:corpuser:contract-test',
                    time: timestampMillis,
                  },
                  description: 'must-not-cross-boundary',
                },
              ],
            },
          ],
        },
      },
    };
  }
  return { errors: [{ message: 'Unsupported contract-test query.' }] };
}

type TestServer = ReturnType<typeof buildServer>;

async function exerciseMetadataBoundary(server: TestServer, mode: MetadataSourceMode) {
  const healthReply = await server.inject({ method: 'GET', url: '/metadata/health' });
  const searchReply = await server.inject({
    method: 'POST',
    url: '/metadata/search',
    payload: { query: 'cycles', limit: 1 },
  });
  const lineageReply = await server.inject({
    method: 'POST',
    url: '/metadata/lineage',
    payload: { rootUrn, direction: 'downstream', depth: 1, maxNodes: 2 },
  });
  const recentChangesReply = await server.inject({
    method: 'POST',
    url: '/metadata/recent-changes',
    payload: { entityUrn: rootUrn, endTime, windowHours: 168, limit: 1 },
  });

  expect([
    healthReply.statusCode,
    searchReply.statusCode,
    lineageReply.statusCode,
    recentChangesReply.statusCode,
  ]).toEqual([200, 200, 200, 200]);

  const health = MetadataHealthResponseSchema.parse(healthReply.json() as unknown);
  const search = MetadataEntitySearchResponseSchema.parse(searchReply.json() as unknown);
  const lineage = MetadataLineageResponseSchema.parse(lineageReply.json() as unknown);
  const recentChanges = MetadataRecentChangesResponseSchema.parse(
    recentChangesReply.json() as unknown,
  );

  expect(health).toMatchObject({ mode, status: 'ready' });
  expect(search.results[0]).toMatchObject({ urn: rootUrn, kind: 'dataset' });
  expect(lineage).toMatchObject({ rootUrn, direction: 'downstream' });
  expect(recentChanges).toMatchObject({ entityUrn: rootUrn, returnedCount: 1 });

  return { health, search, lineage, recentChanges };
}

describe('provider-neutral metadata boundary', () => {
  it('runs the same shared contract through fixture and fake-backed DataHub adapters', async () => {
    const baseUrl = await startFakeDataHub((request, response) => {
      if (request.url === '/config') {
        jsonResponse(response, { models: {} });
        return;
      }

      void readJsonBody(request)
        .then((body) => jsonResponse(response, handleGraphQl(body.query)))
        .catch(() => jsonResponse(response, { errors: [{}] }, 400));
    });
    const fixtureServer = buildServer({ logger: false, mode: 'fixture' });
    const dataHubServer = buildServer({
      logger: false,
      mode: 'datahub',
      environment: {
        APP_MODE: 'datahub',
        DATAHUB_GMS_URL: baseUrl,
        DATAHUB_TOKEN: 'contract-test-token',
      },
    });

    try {
      const fixture = await exerciseMetadataBoundary(fixtureServer, 'fixture');
      const datahub = await exerciseMetadataBoundary(dataHubServer, 'datahub');

      expect(Object.keys(fixture.health).sort()).toEqual(Object.keys(datahub.health).sort());
      expect(Object.keys(fixture.search).sort()).toEqual(Object.keys(datahub.search).sort());
      expect(Object.keys(fixture.lineage).sort()).toEqual(Object.keys(datahub.lineage).sort());
      expect(Object.keys(fixture.recentChanges).sort()).toEqual(
        Object.keys(datahub.recentChanges).sort(),
      );

      const serialized = JSON.stringify(datahub);
      expect(serialized).not.toContain('must-not-cross-boundary');
      expect(serialized).not.toContain('contract-test-token');
      expect(serialized).not.toContain(baseUrl);
      expect(serialized).not.toContain('searchAcrossEntities');
      expect(serialized).not.toContain('searchAcrossLineage');
      expect(serialized).not.toContain('changeTransactions');
      expect(serialized).not.toContain('auditStamp');
    } finally {
      await Promise.all([fixtureServer.close(), dataHubServer.close()]);
    }
  });
});
