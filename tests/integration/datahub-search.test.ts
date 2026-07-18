import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataHubSearchClient } from '../../packages/datahub-client/src/index.js';

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

describe('DataHub entity search client', () => {
  it('uses official searchAcrossEntities semantics and normalizes supported entities', async () => {
    const observed: { authorization?: string; body?: unknown; url?: string } = {};
    const rawProviderSecret = 'raw-provider-secret';
    const baseUrl = await startFakeDataHub((request, response) => {
      observed.url = request.url;
      observed.authorization = request.headers.authorization;
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        observed.body = JSON.parse(body) as unknown;
        jsonResponse(response, {
          data: {
            searchAcrossEntities: {
              searchResults: [
                {
                  entity: {
                    urn: 'urn:li:dashboard:(looker,revenue-overview)',
                    type: 'DASHBOARD',
                    properties: {
                      name: 'Revenue overview',
                      description: 'Provider dashboard description.',
                    },
                  },
                },
                {
                  entity: {
                    urn: 'urn:li:dataset:(snowflake,analytics.daily_revenue,PROD)',
                    type: 'DATASET',
                    name: 'daily_revenue',
                    properties: {
                      name: 'analytics.daily_revenue',
                      description: 'Provider dataset description.',
                      qualifiedName: 'snowflake.analytics.daily_revenue',
                    },
                    providerSecret: rawProviderSecret,
                  },
                },
                {
                  entity: {
                    urn: 'urn:li:chart:(looker,revenue-by-region)',
                    type: 'CHART',
                    properties: { name: 'Revenue by region' },
                  },
                },
                {
                  entity: {
                    urn: 'urn:li:dataFlow:(airflow,revenue-dag,PROD)',
                    type: 'DATA_FLOW',
                    properties: { name: 'Revenue DAG' },
                  },
                },
                {
                  entity: {
                    urn: 'urn:li:dataJob:(airflow,revenue-dag,aggregate,PROD)',
                    type: 'DATA_JOB',
                    properties: { name: 'Revenue aggregation task' },
                  },
                },
              ],
            },
          },
        });
      });
    });
    const client = createDataHubSearchClient({
      gmsUrl: baseUrl,
      token: 'test-only-token-value',
    });

    const results = await client.searchEntities({ query: '  revenue  ', limit: 10 });
    const requestBody = observed.body as {
      query: string;
      variables: { input: { count: number; query: string; start: number; types: string[] } };
    };

    expect(observed.url).toBe('/api/graphql');
    expect(observed.authorization).toBe('Bearer test-only-token-value');
    expect(requestBody.query).toContain('searchAcrossEntities(input: $input)');
    expect(requestBody.variables.input).toEqual({
      types: ['DATASET', 'DASHBOARD', 'CHART', 'DATA_FLOW', 'DATA_JOB'],
      query: 'revenue',
      start: 0,
      count: 10,
    });
    expect(results.map(({ name, kind }) => `${name}:${kind}`)).toEqual([
      'analytics.daily_revenue:dataset',
      'Revenue aggregation task:pipeline',
      'Revenue by region:chart',
      'Revenue DAG:pipeline',
      'Revenue overview:dashboard',
    ]);
    expect(results[0]).toMatchObject({
      urn: 'urn:li:dataset:(snowflake,analytics.daily_revenue,PROD)',
      description: 'Provider dataset description.',
      qualifiedName: 'snowflake.analytics.daily_revenue',
    });
    expect(JSON.stringify(results)).not.toContain(rawProviderSecret);
    expect(JSON.stringify(results)).not.toContain(baseUrl);
  });

  it('maps an entity-type filter, deduplicates URNs, and enforces the result limit', async () => {
    let requestedTypes: string[] | undefined;
    const baseUrl = await startFakeDataHub((request, response) => {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        requestedTypes = (JSON.parse(body) as { variables: { input: { types: string[] } } })
          .variables.input.types;
        jsonResponse(response, {
          data: {
            searchAcrossEntities: {
              searchResults: [
                {
                  entity: {
                    urn: 'urn:li:dataFlow:(airflow,zeta,PROD)',
                    type: 'DATA_FLOW',
                    properties: { name: 'Zeta pipeline' },
                  },
                },
                {
                  entity: {
                    urn: 'urn:li:dataJob:(airflow,alpha,task,PROD)',
                    type: 'DATA_JOB',
                    properties: { name: 'Alpha task' },
                  },
                },
                {
                  entity: {
                    urn: 'urn:li:dataJob:(airflow,alpha,task,PROD)',
                    type: 'DATA_JOB',
                    properties: { name: 'Duplicate alpha task' },
                  },
                },
              ],
            },
          },
        });
      });
    });
    const client = createDataHubSearchClient({ gmsUrl: baseUrl, token: 'test-token' });

    const results = await client.searchEntities({
      query: 'pipeline',
      entityType: 'pipeline',
      limit: 2,
    });

    expect(requestedTypes).toEqual(['DATA_FLOW', 'DATA_JOB']);
    expect(results.map((result) => result.name)).toEqual(['Alpha task', 'Zeta pipeline']);
  });

  it('returns a safe unconfigured error without making a request', async () => {
    const client = createDataHubSearchClient({ gmsUrl: '', token: '' });

    await expect(client.searchEntities({ query: 'revenue', limit: 10 })).rejects.toMatchObject({
      name: 'MetadataProviderError',
      status: 'unconfigured',
    });
  });

  it.each([401, 403])('normalizes HTTP %i as unauthorized', async (statusCode) => {
    const rawBody = 'raw authorization failure';
    const baseUrl = await startFakeDataHub((_request, response) => {
      jsonResponse(response, { message: rawBody }, statusCode);
    });
    const client = createDataHubSearchClient({ gmsUrl: baseUrl, token: 'test-token' });

    const failure = await client
      .searchEntities({ query: 'revenue', limit: 10 })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: 'MetadataProviderError', status: 'unauthorized' });
    expect(String(failure)).not.toContain(rawBody);
    expect(String(failure)).not.toContain(baseUrl);
  });

  it('normalizes provider 5xx and connection refusal as unavailable', async () => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(503, { 'content-type': 'text/plain' });
      response.end('raw unavailable response');
    });
    const unavailable = createDataHubSearchClient({ gmsUrl: baseUrl, token: 'test-token' });
    await expect(unavailable.searchEntities({ query: 'revenue', limit: 10 })).rejects.toMatchObject(
      { status: 'unavailable' },
    );

    const refusedServer = servers.pop();
    if (!refusedServer) {
      throw new Error('Expected the fake server to be registered.');
    }
    const refusedAddress = refusedServer.address() as AddressInfo;
    await closeServer(refusedServer);
    const refused = createDataHubSearchClient({
      gmsUrl: `http://127.0.0.1:${refusedAddress.port}`,
      token: 'test-token',
      timeoutMs: 100,
    });

    await expect(refused.searchEntities({ query: 'revenue', limit: 10 })).rejects.toMatchObject({
      status: 'unavailable',
    });
  });

  it.each([
    ['non-JSON content type', 'text/plain', '{"data":{}}'],
    ['invalid JSON', 'application/json', '{"raw-secret":'],
    ['invalid response shape', 'application/json', '{"data":{"searchAcrossEntities":[]}}'],
    [
      'GraphQL error',
      'application/json',
      '{"data":null,"errors":[{"message":"raw-provider-secret"}]}',
    ],
    [
      'entity that fails shared normalization',
      'application/json',
      '{"data":{"searchAcrossEntities":{"searchResults":[{"entity":{"urn":" ","type":"DATASET","properties":{"name":"invalid"}}}]}}}',
    ],
  ])('normalizes %s without exposing the raw body', async (_label, contentType, body) => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(200, { 'content-type': contentType });
      response.end(body);
    });
    const client = createDataHubSearchClient({ gmsUrl: baseUrl, token: 'test-token' });

    const failure = await client
      .searchEntities({ query: 'revenue', limit: 10 })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({
      name: 'MetadataProviderError',
      status: 'invalid_response',
    });
    expect(String(failure)).not.toContain('raw-secret');
    expect(String(failure)).not.toContain(baseUrl);
  });

  it('aborts a slow provider at the bounded timeout', async () => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      setTimeout(() => jsonResponse(response, { data: {} }), 100);
    });
    const client = createDataHubSearchClient({
      gmsUrl: baseUrl,
      token: 'test-token',
      timeoutMs: 10,
    });

    await expect(client.searchEntities({ query: 'revenue', limit: 10 })).rejects.toMatchObject({
      name: 'MetadataProviderError',
      status: 'timeout',
    });
  });
});
