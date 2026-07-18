import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataHubRecentChangesClient } from '../../packages/datahub-client/src/index.js';

const servers: Server[] = [];
const entityUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.revenue,PROD)';
const now = () => new Date('2026-07-19T08:30:00.000Z');

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

function change(
  category: string,
  operation: string,
  modifier?: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    urn: entityUrn,
    category,
    operation,
    modifier: modifier ?? null,
    parameters: [],
    auditStamp: {
      actor: 'urn:li:corpuser:person@example.com',
      time: Date.parse('2026-07-19T07:45:00.000Z'),
    },
    description: 'raw-provider-secret person@example.com',
    ...overrides,
  };
}

function transaction(timestampMillis: number, changes: unknown[]) {
  return {
    timestampMillis,
    lastSemanticVersion: '1.2.3',
    versionStamp: 'none',
    changeType: 'MODIFY',
    actor: 'urn:li:corpuser:person@example.com',
    changes,
  };
}

function timelineBody(changeTransactions: unknown[]) {
  return {
    data: {
      root: { urn: entityUrn },
      getTimeline: { changeTransactions },
    },
  };
}

describe('DataHub recent metadata changes client', () => {
  it('uses official getTimeline variables and normalizes bounded facts safely', async () => {
    const observed: { authorization?: string; body?: unknown; requestCount: number; url?: string } =
      {
        requestCount: 0,
      };
    const baseUrl = await startFakeDataHub((request, response) => {
      observed.requestCount += 1;
      observed.url = request.url;
      observed.authorization = request.headers.authorization;
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        observed.body = JSON.parse(body) as unknown;
        jsonResponse(
          response,
          timelineBody([
            transaction(Date.parse('2026-07-19T07:45:00.000Z'), [
              change('TECHNICAL_SCHEMA', 'MODIFY', 'gross_revenue'),
              change('OWNERSHIP', 'MODIFY'),
              change('TECHNICAL_SCHEMA', 'MODIFY', 'gross_revenue'),
            ]),
            transaction(Date.parse('2026-07-18T06:00:00.000Z'), [
              change('TAG', 'ADD', 'certified'),
            ]),
            transaction(Date.parse('2026-07-10T08:00:00.000Z'), [
              change('DOCUMENTATION', 'MODIFY'),
            ]),
          ]),
        );
      });
    });
    const client = createDataHubRecentChangesClient({
      gmsUrl: baseUrl,
      token: 'test-only-token-value',
      now,
    });

    const result = await client.getRecentChangesForEntity({
      entityUrn,
      windowHours: 168,
      limit: 10,
    });
    const requestBody = observed.body as {
      query: string;
      variables: { input: { urn: string }; urn: string };
    };

    expect(observed).toMatchObject({
      requestCount: 1,
      url: '/api/graphql',
      authorization: 'Bearer test-only-token-value',
    });
    expect(requestBody.query).toContain('getTimeline(input: $input)');
    expect(requestBody.query).toContain('root: entity(urn: $urn)');
    expect(requestBody.variables).toEqual({ urn: entityUrn, input: { urn: entityUrn } });
    expect(result.window).toEqual({
      startTime: '2026-07-12T08:30:00.000Z',
      endTime: '2026-07-19T08:30:00.000Z',
      hours: 168,
    });
    expect(result.changes).toHaveLength(3);
    expect(new Set(result.changes.map(({ id }) => id)).size).toBe(3);
    expect(result.changes.map(({ category }) => category).sort()).toEqual([
      'ownership',
      'schema',
      'tag',
    ]);
    expect(result.changes.map(({ timestamp }) => timestamp)).toEqual(
      [...result.changes.map(({ timestamp }) => timestamp)].sort().reverse(),
    );
    const sameTimestampIds = result.changes
      .filter(({ timestamp }) => timestamp === '2026-07-19T07:45:00.000Z')
      .map(({ id }) => id);
    expect(sameTimestampIds).toHaveLength(2);
    expect(sameTimestampIds).toEqual([...sameTimestampIds].sort());
    expect(result.changes.find(({ category }) => category === 'schema')).toMatchObject({
      operation: 'modified',
      actor: 'DataHub user',
      field: 'gross_revenue',
      source: 'datahub',
      summary: 'Schema modified: gross_revenue.',
    });
    expect(result).toMatchObject({ returnedCount: 3, truncated: true });
    expect(JSON.stringify(result)).not.toContain('person@example.com');
    expect(JSON.stringify(result)).not.toContain('raw-provider-secret');
    expect(JSON.stringify(result)).not.toContain(baseUrl);
  });

  it('returns true empty history and marks count truncation', async () => {
    let responseBody = timelineBody([]);
    const baseUrl = await startFakeDataHub((_request, response) => {
      jsonResponse(response, responseBody);
    });
    const client = createDataHubRecentChangesClient({ gmsUrl: baseUrl, token: 'test-token', now });

    await expect(
      client.getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 }),
    ).resolves.toMatchObject({ returnedCount: 0, truncated: false, changes: [] });

    responseBody = timelineBody([
      transaction(Date.parse('2026-07-19T07:45:00.000Z'), [
        change('OWNERSHIP', 'MODIFY'),
        change('TECHNICAL_SCHEMA', 'MODIFY', 'gross_revenue'),
        change('TAG', 'ADD', 'certified'),
      ]),
    ]);
    const limited = await client.getRecentChangesForEntity({
      entityUrn,
      windowHours: 168,
      limit: 2,
    });
    expect(limited).toMatchObject({ returnedCount: 2, truncated: true });

    responseBody = timelineBody(
      Array.from({ length: 100 }, () =>
        transaction(Date.parse('2026-07-19T07:45:00.000Z'), [change('TAG', 'ADD')]),
      ),
    );
    const providerCapped = await client.getRecentChangesForEntity({
      entityUrn,
      windowHours: 168,
      limit: 10,
    });
    expect(providerCapped).toMatchObject({ returnedCount: 1, truncated: true });
  });

  it('returns safe unconfigured and missing-entity errors', async () => {
    const unconfigured = createDataHubRecentChangesClient({ gmsUrl: '', token: '' });
    await expect(
      unconfigured.getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'unconfigured' });

    const baseUrl = await startFakeDataHub((_request, response) => {
      jsonResponse(response, { data: { root: null, getTimeline: { changeTransactions: [] } } });
    });
    const missing = createDataHubRecentChangesClient({
      gmsUrl: baseUrl,
      token: 'test-token',
      now,
    });
    await expect(
      missing.getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'not_found' });
  });

  it.each([401, 403])('normalizes HTTP %i as unauthorized', async (statusCode) => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      jsonResponse(response, { message: 'raw authorization failure' }, statusCode);
    });
    const client = createDataHubRecentChangesClient({ gmsUrl: baseUrl, token: 'test-token', now });

    const failure = await client
      .getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 })
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: 'MetadataProviderError', status: 'unauthorized' });
    expect(String(failure)).not.toContain('raw authorization failure');
    expect(String(failure)).not.toContain(baseUrl);
  });

  it('normalizes 5xx and connection refusal as unavailable', async () => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(503, { 'content-type': 'text/plain' });
      response.end('raw unavailable response');
    });
    const unavailable = createDataHubRecentChangesClient({
      gmsUrl: baseUrl,
      token: 'test-token',
      now,
    });
    await expect(
      unavailable.getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 }),
    ).rejects.toMatchObject({ status: 'unavailable' });

    const refusedServer = servers.pop();
    if (!refusedServer) {
      throw new Error('Expected the fake server to be registered.');
    }
    const refusedAddress = refusedServer.address() as AddressInfo;
    await closeServer(refusedServer);
    const refused = createDataHubRecentChangesClient({
      gmsUrl: `http://127.0.0.1:${refusedAddress.port}`,
      token: 'test-token',
      timeoutMs: 100,
      now,
    });
    await expect(
      refused.getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 }),
    ).rejects.toMatchObject({ status: 'unavailable' });
  });

  it.each([
    ['non-JSON content', 'text/plain', JSON.stringify(timelineBody([]))],
    ['invalid JSON', 'application/json', '{"raw-secret":'],
    ['GraphQL error', 'application/json', '{"data":null,"errors":[{"message":"raw-secret"}]}'],
    [
      'invalid timestamp',
      'application/json',
      JSON.stringify(timelineBody([transaction(-1, [change('TAG', 'ADD')])])),
    ],
    [
      'mismatched event entity',
      'application/json',
      JSON.stringify(
        timelineBody([
          transaction(Date.parse('2026-07-19T07:45:00.000Z'), [
            change('TAG', 'ADD', undefined, { urn: 'urn:li:dataset:other' }),
          ]),
        ]),
      ),
    ],
  ])('normalizes %s without exposing provider details', async (_label, contentType, body) => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(200, { 'content-type': contentType });
      response.end(body);
    });
    const client = createDataHubRecentChangesClient({ gmsUrl: baseUrl, token: 'test-token', now });
    const failure = await client
      .getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({
      name: 'MetadataProviderError',
      status: 'invalid_response',
    });
    expect(String(failure)).not.toContain('raw-secret');
    expect(String(failure)).not.toContain(baseUrl);
  });

  it('aborts a slow provider at the total timeout and honors caller abort', async () => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      setTimeout(() => jsonResponse(response, timelineBody([])), 100);
    });
    const client = createDataHubRecentChangesClient({
      gmsUrl: baseUrl,
      token: 'test-token',
      timeoutMs: 10,
      now,
    });
    await expect(
      client.getRecentChangesForEntity({ entityUrn, windowHours: 168, limit: 10 }),
    ).rejects.toMatchObject({ status: 'timeout' });

    const controller = new AbortController();
    controller.abort();
    await expect(
      client.getRecentChangesForEntity({
        entityUrn,
        windowHours: 168,
        limit: 10,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ status: 'timeout' });
  });
});
