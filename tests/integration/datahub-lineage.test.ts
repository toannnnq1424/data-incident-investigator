import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataHubLineageClient } from '../../packages/datahub-client/src/index.js';

const servers: Server[] = [];

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

function dataset(urn: string, name: string) {
  return {
    urn,
    type: 'DATASET',
    properties: { name, description: `Safe description for ${name}.` },
  };
}

async function readRequestBody(request: Parameters<RequestListener>[0]) {
  let body = '';
  request.setEncoding('utf8');
  for await (const chunk of request) {
    body += chunk;
  }
  return JSON.parse(body) as {
    query: string;
    variables: {
      urn: string;
      input: {
        count: number;
        direction: string;
        orFilters: Array<{ and: Array<{ field: string; values: string[] }> }>;
        query: string;
        start: number;
        urn: string;
      };
    };
  };
}

describe('DataHub bounded lineage client', () => {
  it('uses official one-hop semantics and deterministically terminates branching cycles', async () => {
    const rootUrn = 'urn:li:dataset:root';
    const aUrn = 'urn:li:dataset:a';
    const bUrn = 'urn:li:dataset:b';
    const cUrn = 'urn:li:dataset:c';
    const entities = new Map([
      [rootUrn, dataset(rootUrn, 'Root')],
      [aUrn, dataset(aUrn, 'Alpha')],
      [bUrn, dataset(bUrn, 'Beta')],
      [cUrn, dataset(cUrn, 'Charlie')],
    ]);
    const graph = new Map([
      [
        rootUrn,
        [entities.get(bUrn), entities.get(aUrn), entities.get(rootUrn), entities.get(aUrn)],
      ],
      [aUrn, [entities.get(cUrn), entities.get(rootUrn)]],
      [bUrn, [entities.get(cUrn)]],
      [cUrn, [entities.get(rootUrn)]],
    ]);
    const observed: Array<{
      authorization?: string;
      body: Awaited<ReturnType<typeof readRequestBody>>;
      url?: string;
    }> = [];
    const baseUrl = await startFakeDataHub((request, response) => {
      void readRequestBody(request).then((body) => {
        observed.push({
          authorization: request.headers.authorization,
          body,
          url: request.url,
        });
        const adjacent = (graph.get(body.variables.urn) ?? []).filter(
          (entity): entity is NonNullable<typeof entity> => Boolean(entity),
        );
        jsonResponse(response, {
          data: {
            root: entities.get(body.variables.urn),
            searchAcrossLineage: {
              total: adjacent.length,
              searchResults: adjacent.map((entity) => ({ degree: 1, entity })),
            },
          },
        });
      });
    });
    const client = createDataHubLineageClient({
      gmsUrl: baseUrl,
      token: 'test-only-token-value',
    });

    const lineage = await client.getLineageGraph({
      rootUrn,
      direction: 'downstream',
      depth: 2,
      maxNodes: 4,
    });

    expect(observed).toHaveLength(4);
    expect(observed[0]?.url).toBe('/api/graphql');
    expect(
      observed.every((request) => request.authorization === 'Bearer test-only-token-value'),
    ).toBe(true);
    expect(observed[0]?.body.query).toContain('searchAcrossLineage(input: $input)');
    expect(observed[0]?.body.variables).toEqual({
      urn: rootUrn,
      input: {
        urn: rootUrn,
        query: '*',
        start: 0,
        count: 26,
        direction: 'DOWNSTREAM',
        orFilters: [{ and: [{ field: 'degree', values: ['1'] }] }],
      },
    });
    expect(lineage.nodes.map((node) => `${node.depth}:${node.name}`)).toEqual([
      '0:Root',
      '1:Alpha',
      '1:Beta',
      '2:Charlie',
    ]);
    expect(lineage.edges).toContainEqual({ sourceUrn: rootUrn, targetUrn: rootUrn });
    expect(lineage.edges).toContainEqual({ sourceUrn: aUrn, targetUrn: rootUrn });
    expect(lineage).toMatchObject({ visitedNodeCount: 4, truncated: false });
    expect(new Set(lineage.nodes.map((node) => node.urn)).size).toBe(4);
    expect(new Set(lineage.edges.map((edge) => JSON.stringify(edge))).size).toBe(
      lineage.edges.length,
    );
    expect(JSON.stringify(lineage)).not.toContain('test-only-token-value');
    expect(JSON.stringify(lineage)).not.toContain(baseUrl);
  });

  it('enforces node and provider-step caps without unbounded fan-out', async () => {
    const rootUrn = 'urn:li:dataset:root';
    const children = Array.from({ length: 24 }, (_, index) =>
      dataset(`urn:li:dataset:child-${String(index).padStart(2, '0')}`, `Child ${index}`),
    );
    let requestCount = 0;
    const baseUrl = await startFakeDataHub((request, response) => {
      void readRequestBody(request).then((body) => {
        requestCount += 1;
        const root =
          body.variables.urn === rootUrn
            ? dataset(rootUrn, 'Root')
            : children.find((child) => child.urn === body.variables.urn);
        const adjacent = body.variables.urn === rootUrn ? children : [dataset(rootUrn, 'Root')];
        jsonResponse(response, {
          data: {
            root,
            searchAcrossLineage: {
              total: adjacent.length,
              searchResults: adjacent.map((entity) => ({ degree: 1, entity })),
            },
          },
        });
      });
    });
    const client = createDataHubLineageClient({ gmsUrl: baseUrl, token: 'test-token' });

    const lineage = await client.getLineageGraph({
      rootUrn,
      direction: 'downstream',
      depth: 2,
      maxNodes: 25,
    });

    expect(requestCount).toBe(25);
    expect(lineage.visitedNodeCount).toBe(25);
    expect(lineage.edges).toHaveLength(48);
    expect(lineage.truncated).toBe(false);

    requestCount = 0;
    const truncated = await client.getLineageGraph({
      rootUrn,
      direction: 'downstream',
      depth: 2,
      maxNodes: 2,
    });
    expect(requestCount).toBe(2);
    expect(truncated).toMatchObject({ visitedNodeCount: 2, truncated: true });
  });

  it('returns safe unconfigured and missing-root errors', async () => {
    const unconfigured = createDataHubLineageClient({ gmsUrl: '', token: '' });
    await expect(
      unconfigured.getLineageGraph({
        rootUrn: 'urn:li:dataset:root',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'unconfigured' });

    const baseUrl = await startFakeDataHub((_request, response) => {
      jsonResponse(response, {
        data: {
          root: null,
          searchAcrossLineage: { total: 0, searchResults: [] },
        },
      });
    });
    const missing = createDataHubLineageClient({ gmsUrl: baseUrl, token: 'test-token' });
    await expect(
      missing.getLineageGraph({
        rootUrn: 'urn:li:dataset:missing',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'not_found' });
  });

  it.each([401, 403])('normalizes HTTP %i as unauthorized', async (statusCode) => {
    const rawSecret = 'raw authorization failure';
    const baseUrl = await startFakeDataHub((_request, response) => {
      jsonResponse(response, { message: rawSecret }, statusCode);
    });
    const client = createDataHubLineageClient({ gmsUrl: baseUrl, token: 'test-token' });

    const failure = await client
      .getLineageGraph({
        rootUrn: 'urn:li:dataset:root',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: 'MetadataProviderError', status: 'unauthorized' });
    expect(String(failure)).not.toContain(rawSecret);
    expect(String(failure)).not.toContain(baseUrl);
  });

  it('normalizes provider 5xx and connection refusal as unavailable', async () => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(503, { 'content-type': 'text/plain' });
      response.end('raw unavailable response');
    });
    const unavailable = createDataHubLineageClient({ gmsUrl: baseUrl, token: 'test-token' });
    await expect(
      unavailable.getLineageGraph({
        rootUrn: 'urn:li:dataset:root',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      }),
    ).rejects.toMatchObject({ status: 'unavailable' });

    const refusedServer = servers.pop();
    if (!refusedServer) {
      throw new Error('Expected the fake server to be registered.');
    }
    const refusedAddress = refusedServer.address() as AddressInfo;
    await closeServer(refusedServer);
    const refused = createDataHubLineageClient({
      gmsUrl: `http://127.0.0.1:${refusedAddress.port}`,
      token: 'test-token',
      timeoutMs: 100,
    });
    await expect(
      refused.getLineageGraph({
        rootUrn: 'urn:li:dataset:root',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      }),
    ).rejects.toMatchObject({ status: 'unavailable' });
  });

  it.each([
    ['non-JSON content', 'text/plain', '{"data":{}}'],
    ['invalid JSON', 'application/json', '{"raw-secret":'],
    ['invalid shape', 'application/json', '{"data":{"searchAcrossLineage":[]}}'],
    [
      'GraphQL error',
      'application/json',
      '{"data":null,"errors":[{"message":"raw-provider-secret"}]}',
    ],
    [
      'non-direct result',
      'application/json',
      '{"data":{"root":{"urn":"urn:li:dataset:root","type":"DATASET","properties":{"name":"Root"}},"searchAcrossLineage":{"total":1,"searchResults":[{"degree":2,"entity":{"urn":"urn:li:dataset:other","type":"DATASET","properties":{"name":"Other"}}}]}}}',
    ],
  ])('normalizes %s without exposing provider details', async (_label, contentType, body) => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(200, { 'content-type': contentType });
      response.end(body);
    });
    const client = createDataHubLineageClient({ gmsUrl: baseUrl, token: 'test-token' });

    const failure = await client
      .getLineageGraph({
        rootUrn: 'urn:li:dataset:root',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: 'MetadataProviderError', status: 'invalid_response' });
    expect(String(failure)).not.toContain('raw-provider-secret');
    expect(String(failure)).not.toContain(baseUrl);
  });

  it('aborts the total traversal at the bounded timeout', async () => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      setTimeout(
        () =>
          jsonResponse(response, {
            data: {
              root: dataset('urn:li:dataset:root', 'Root'),
              searchAcrossLineage: { total: 0, searchResults: [] },
            },
          }),
        100,
      );
    });
    const client = createDataHubLineageClient({
      gmsUrl: baseUrl,
      token: 'test-token',
      timeoutMs: 10,
    });

    await expect(
      client.getLineageGraph({
        rootUrn: 'urn:li:dataset:root',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'timeout' });
  });
});
