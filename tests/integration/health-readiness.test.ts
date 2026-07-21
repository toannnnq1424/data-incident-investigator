import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../../apps/api/src/index.js';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';
import {
  HealthResponseSchema,
  ReadinessResponseSchema,
  type MetadataHealthStatus,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

function providerResult(status: MetadataHealthStatus, message = 'Safe test result.') {
  return { status, message };
}

describe('health and readiness API', () => {
  it('keeps liveness process-only while every external dependency fails', async () => {
    const metadataHealthCheck = vi
      .fn()
      .mockRejectedValue(new Error('private-datahub.internal authorization token-secret stack'));
    const modelHealthCheck = vi
      .fn()
      .mockRejectedValue(new Error('private-model.internal .env-value provider-body'));
    const server = buildServer({
      logger: false,
      metadataHealth: { healthCheck: metadataHealthCheck },
      mode: 'datahub',
      modelHealth: { healthCheck: modelHealthCheck },
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(HealthResponseSchema.parse(response.json())).toEqual({ status: 'ok' });
    expect(response.json()).toEqual({ status: 'ok' });
    expect(metadataHealthCheck).not.toHaveBeenCalled();
    expect(modelHealthCheck).not.toHaveBeenCalled();
  });

  it('reports fixture readiness without reading DataHub or model configuration', async () => {
    const environment = new Proxy<NodeJS.ProcessEnv>(
      { APP_MODE: 'fixture' },
      {
        get(target, property, receiver) {
          if (
            property === 'DATAHUB_GMS_URL' ||
            property === 'DATAHUB_TOKEN' ||
            property === 'OPENAI_API_KEY'
          ) {
            throw new Error('Fixture readiness must not read external credentials.');
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const modelHealthCheck = vi.fn().mockResolvedValue(providerResult('unavailable'));
    const server = buildServer({
      environment,
      logger: false,
      modelHealth: { healthCheck: modelHealthCheck },
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(ReadinessResponseSchema.parse(response.json())).toEqual({
      status: 'ready',
      mode: 'fixture',
      checks: [{ name: 'fixture_assets', status: 'ready' }],
    });
    expect(modelHealthCheck).not.toHaveBeenCalled();
  });

  it('keeps the process live and fails fixture readiness predictably for invalid assets', async () => {
    const metadata = createFixtureMetadataAdapter({
      rawSecret: 'private-fixture.internal fixture-token stack-trace',
    });
    const server = buildServer({ logger: false, metadata, mode: 'fixture' });
    servers.push(server);

    const healthResponse = await server.inject({ method: 'GET', url: '/health' });
    const readinessResponse = await server.inject({ method: 'GET', url: '/ready' });

    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json()).toEqual({ status: 'ok' });
    expect(readinessResponse.statusCode).toBe(503);
    expect(ReadinessResponseSchema.parse(readinessResponse.json())).toEqual({
      status: 'not_ready',
      mode: 'fixture',
      checks: [
        {
          name: 'fixture_assets',
          status: 'not_ready',
          reasonCode: 'FIXTURE_ASSETS_INVALID',
        },
      ],
    });
    expect(readinessResponse.body).not.toMatch(
      /private-fixture\.internal|fixture-token|stack-trace/i,
    );
  });

  it('classifies missing live configuration without a provider network call', async () => {
    const server = buildServer({
      environment: { APP_MODE: 'datahub' },
      logger: false,
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(503);
    expect(ReadinessResponseSchema.parse(response.json())).toEqual({
      status: 'not_ready',
      mode: 'datahub',
      checks: [
        {
          name: 'datahub',
          status: 'not_ready',
          reasonCode: 'DATAHUB_CONFIG_MISSING',
        },
        { name: 'investigation_runtime', status: 'ready' },
        {
          name: 'model',
          status: 'not_required',
          reasonCode: 'MODEL_NOT_REQUIRED',
        },
      ],
    });
  });

  it('does not report live readiness when the required investigation runtime is invalid', async () => {
    const metadata = createFixtureMetadataAdapter({
      rawSecret: 'private-runtime.internal runtime-token stack-trace',
    });
    const server = buildServer({
      logger: false,
      metadata,
      metadataHealth: { healthCheck: vi.fn().mockResolvedValue(providerResult('ready')) },
      mode: 'datahub',
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(503);
    expect(ReadinessResponseSchema.parse(response.json())).toEqual({
      status: 'not_ready',
      mode: 'datahub',
      checks: [
        { name: 'datahub', status: 'ready' },
        {
          name: 'investigation_runtime',
          status: 'not_ready',
          reasonCode: 'INVESTIGATION_RUNTIME_INVALID',
        },
        {
          name: 'model',
          status: 'not_required',
          reasonCode: 'MODEL_NOT_REQUIRED',
        },
      ],
    });
    expect(response.body).not.toMatch(/private-runtime\.internal|runtime-token|stack-trace/i);
  });

  it.each([
    ['unconfigured', 'DATAHUB_CONFIG_MISSING', 503, 'not_ready'],
    ['unauthorized', 'DATAHUB_UNAUTHORIZED', 503, 'not_ready'],
    ['unavailable', 'DATAHUB_UNAVAILABLE', 503, 'not_ready'],
    ['timeout', 'DATAHUB_TIMEOUT', 503, 'not_ready'],
    ['invalid_response', 'DATAHUB_INVALID_RESPONSE', 503, 'not_ready'],
    ['ready', undefined, 200, 'ready'],
  ] as const)(
    'maps DataHub %s to a stable live readiness result',
    async (providerStatus, reasonCode, statusCode, overallStatus) => {
      const server = buildServer({
        logger: false,
        metadataHealth: {
          healthCheck: vi
            .fn()
            .mockResolvedValue(
              providerResult(providerStatus, 'private-datahub.internal token-secret'),
            ),
        },
        mode: 'datahub',
      });
      servers.push(server);

      const response = await server.inject({ method: 'GET', url: '/ready' });
      const parsed = ReadinessResponseSchema.parse(response.json());

      expect(response.statusCode).toBe(statusCode);
      expect(parsed.status).toBe(overallStatus);
      expect(parsed.mode).toBe('datahub');
      expect(parsed.checks[0]).toEqual(
        reasonCode
          ? { name: 'datahub', status: 'not_ready', reasonCode }
          : { name: 'datahub', status: 'ready' },
      );
      expect(parsed.checks[1]).toEqual({ name: 'investigation_runtime', status: 'ready' });
      expect(parsed.checks[2]).toEqual({
        name: 'model',
        status: 'not_required',
        reasonCode: 'MODEL_NOT_REQUIRED',
      });
      expect(response.body).not.toMatch(/private-datahub\.internal|token-secret/i);
    },
  );

  it.each([
    ['unconfigured', 'MODEL_CONFIG_MISSING', 503, 'not_ready'],
    ['unauthorized', 'MODEL_UNAUTHORIZED', 503, 'not_ready'],
    ['unavailable', 'MODEL_UNAVAILABLE', 503, 'not_ready'],
    ['timeout', 'MODEL_TIMEOUT', 503, 'not_ready'],
    ['invalid_response', 'MODEL_INVALID_RESPONSE', 503, 'not_ready'],
    ['ready', undefined, 200, 'ready'],
  ] as const)(
    'maps an attached model dependency %s result without changing mode',
    async (providerStatus, reasonCode, statusCode, overallStatus) => {
      const server = buildServer({
        logger: false,
        metadataHealth: { healthCheck: vi.fn().mockResolvedValue(providerResult('ready')) },
        mode: 'datahub',
        modelHealth: {
          healthCheck: vi
            .fn()
            .mockResolvedValue(
              providerResult(providerStatus, 'private-model.internal provider-body'),
            ),
        },
      });
      servers.push(server);

      const response = await server.inject({ method: 'GET', url: '/ready' });
      const parsed = ReadinessResponseSchema.parse(response.json());

      expect(response.statusCode).toBe(statusCode);
      expect(parsed.status).toBe(overallStatus);
      expect(parsed.mode).toBe('datahub');
      expect(parsed.checks[0]).toEqual({ name: 'datahub', status: 'ready' });
      expect(parsed.checks[1]).toEqual({ name: 'investigation_runtime', status: 'ready' });
      expect(parsed.checks[2]).toEqual(
        reasonCode
          ? { name: 'model', status: 'not_ready', reasonCode }
          : { name: 'model', status: 'ready' },
      );
      expect(response.body).not.toMatch(/private-model\.internal|provider-body/i);
    },
  );

  it('bounds a dependency that ignores abort without sleeping', async () => {
    vi.useFakeTimers();
    const healthCheck = vi.fn((options?: { signal?: AbortSignal }) => {
      void options;
      return new Promise<never>(() => undefined);
    });
    const server = buildServer({
      logger: false,
      metadataHealth: { healthCheck },
      mode: 'datahub',
      readinessTimeoutMs: 10,
    });
    servers.push(server);

    const responsePromise = server.inject({ method: 'GET', url: '/ready' });
    await vi.advanceTimersByTimeAsync(10);
    const response = await responsePromise;

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: 'not_ready',
      mode: 'datahub',
      checks: [
        { name: 'datahub', status: 'not_ready', reasonCode: 'DATAHUB_TIMEOUT' },
        { name: 'investigation_runtime', status: 'ready' },
        { name: 'model', status: 'not_required', reasonCode: 'MODEL_NOT_REQUIRED' },
      ],
    });
    expect(healthCheck).toHaveBeenCalledOnce();
    expect(healthCheck.mock.calls[0]?.[0]?.signal.aborted).toBe(true);
  });

  it('sanitizes provider failures in both response and structured readiness logs', async () => {
    const rawSecret =
      'https://private-provider.internal Authorization Bearer token-secret .env-value stack-trace';
    const server = buildServer({
      logger: false,
      metadataHealth: {
        healthCheck: vi.fn().mockResolvedValue(providerResult('unavailable', rawSecret)),
      },
      mode: 'datahub',
      modelHealth: {
        healthCheck: vi.fn().mockRejectedValue(new Error(rawSecret)),
      },
    });
    servers.push(server);
    const warning = vi.spyOn(server.log, 'warn');

    const response = await server.inject({ method: 'GET', url: '/ready' });
    const serialized = JSON.stringify({ body: response.json(), logs: warning.mock.calls });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: 'not_ready',
      mode: 'datahub',
      checks: [
        {
          name: 'datahub',
          status: 'not_ready',
          reasonCode: 'DATAHUB_UNAVAILABLE',
        },
        { name: 'investigation_runtime', status: 'ready' },
        {
          name: 'model',
          status: 'not_ready',
          reasonCode: 'MODEL_UNAVAILABLE',
        },
      ],
    });
    expect(serialized).not.toMatch(
      /private-provider\.internal|Authorization|Bearer|token-secret|\.env-value|stack-trace/i,
    );
    expect(warning).toHaveBeenCalledWith(
      {
        mode: 'datahub',
        reasonCodes: ['DATAHUB_UNAVAILABLE', 'MODEL_UNAVAILABLE'],
      },
      'Service is not ready',
    );
  });
});
