import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataHubHealthClient } from '../../packages/datahub-client/src/index.js';

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

describe('DataHub health client', () => {
  it('probes the official GMS config endpoint and returns only a safe ready result', async () => {
    const fakeToken = 'test-only-token-value';
    const providerSecret = 'raw-provider-secret';
    const baseUrl = await startFakeDataHub((request, response) => {
      expect(request.url).toBe('/api/gms/config');
      expect(request.headers.authorization).toBe(`Bearer ${fakeToken}`);
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ noCode: 'false', providerSecret }));
    });
    const client = createDataHubHealthClient({
      gmsUrl: `${baseUrl}/api/gms/`,
      token: fakeToken,
    });

    const health = await client.healthCheck();
    const serializedHealth = JSON.stringify(health);

    expect(health).toEqual({ status: 'ready', message: 'DataHub metadata is ready.' });
    expect(serializedHealth).not.toContain(fakeToken);
    expect(serializedHealth).not.toContain(providerSecret);
    expect(serializedHealth).not.toContain(baseUrl);
    expect(serializedHealth.toLowerCase()).not.toContain('authorization');
  });

  it('returns unconfigured without making a request when URL or token configuration is missing', async () => {
    const missingUrl = createDataHubHealthClient({ gmsUrl: '', token: 'test-token' });
    const missingToken = createDataHubHealthClient({
      gmsUrl: 'http://127.0.0.1:8080',
      token: '',
    });
    const credentialInUrl = createDataHubHealthClient({
      gmsUrl: 'https://user:password@example.invalid',
      token: 'test-token',
    });

    await expect(missingUrl.healthCheck()).resolves.toMatchObject({ status: 'unconfigured' });
    await expect(missingToken.healthCheck()).resolves.toMatchObject({ status: 'unconfigured' });
    await expect(credentialInUrl.healthCheck()).resolves.toMatchObject({
      status: 'unconfigured',
    });
  });

  it.each([401, 403])('normalizes HTTP %i as unauthorized', async (statusCode) => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(statusCode, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'raw authorization failure' }));
    });
    const client = createDataHubHealthClient({ gmsUrl: baseUrl, token: 'test-token' });

    await expect(client.healthCheck()).resolves.toEqual({
      status: 'unauthorized',
      message: 'DataHub rejected the configured credentials. Check the access token.',
    });
  });

  it('normalizes provider refusal and non-success responses as unavailable', async () => {
    const unavailableBaseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(503, { 'content-type': 'text/plain' });
      response.end('raw unavailable response');
    });
    const unavailableClient = createDataHubHealthClient({
      gmsUrl: unavailableBaseUrl,
      token: 'test-token',
    });
    await expect(unavailableClient.healthCheck()).resolves.toMatchObject({
      status: 'unavailable',
    });

    const refusedServer = servers.pop();
    if (!refusedServer) {
      throw new Error('Expected the fake server to be registered.');
    }
    const refusedAddress = refusedServer.address() as AddressInfo;
    await closeServer(refusedServer);
    const refusedClient = createDataHubHealthClient({
      gmsUrl: `http://127.0.0.1:${refusedAddress.port}`,
      token: 'test-token',
      timeoutMs: 100,
    });

    await expect(refusedClient.healthCheck()).resolves.toMatchObject({ status: 'unavailable' });
  });

  it.each([
    ['non-JSON content type', 'text/plain', '{"raw":"secret"}'],
    ['malformed JSON', 'application/json', '{"raw-secret":'],
    ['non-object JSON', 'application/json', '["raw-secret"]'],
  ])('normalizes %s as invalid_response', async (_label, contentType, body) => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      response.writeHead(200, { 'content-type': contentType });
      response.end(body);
    });
    const client = createDataHubHealthClient({ gmsUrl: baseUrl, token: 'test-token' });

    const health = await client.healthCheck();

    expect(health.status).toBe('invalid_response');
    expect(JSON.stringify(health)).not.toContain('raw-secret');
  });

  it('aborts a slow provider at the bounded timeout', async () => {
    const baseUrl = await startFakeDataHub((_request, response) => {
      setTimeout(() => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
      }, 100);
    });
    const client = createDataHubHealthClient({
      gmsUrl: baseUrl,
      token: 'test-token',
      timeoutMs: 10,
    });

    await expect(client.healthCheck()).resolves.toEqual({
      status: 'timeout',
      message: 'DataHub metadata did not respond in time. Check the service and try again.',
    });
  });
});
