import { afterEach, describe, expect, it, vi } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import { buildServer } from '../../apps/api/src/index.js';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  InvestigationModelProviderTimeoutError,
  type InvestigationRunner,
} from '../../packages/agent-core/src/index.js';
import {
  createFixtureMetadataAdapter,
  MetadataProviderError,
} from '../../packages/datahub-client/src/index.js';
import {
  DEFAULT_RUNTIME_LIMIT_CONFIG,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  INVESTIGATION_TERMINATION_MESSAGES,
  type IncidentRetrievalResponse,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];
const request = IncidentRequestSchema.parse(canonicalIncident.request);

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function submitAndWait(
  options: Parameters<typeof buildServer>[0],
  payload: unknown = request,
): Promise<Exclude<IncidentRetrievalResponse, { status: 'processing' }>> {
  const server = buildServer({ logger: false, processingDelayMs: 0, ...options });
  servers.push(server);
  const accepted = await server.inject({ method: 'POST', url: '/incidents', payload });
  expect(accepted.statusCode).toBe(202);
  const incidentId = accepted.json<{ incidentId: string }>().incidentId;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await server.inject({ method: 'GET', url: `/incidents/${incidentId}` });
    const incident = IncidentRetrievalResponseSchema.parse(response.json());
    if (incident.status !== 'processing') return incident;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('Investigation did not reach a terminal state.');
}

function expectDegraded(incident: Exclude<IncidentRetrievalResponse, { status: 'processing' }>) {
  expect(incident.status).toBe('degraded');
  if (incident.status !== 'degraded') throw new Error('Expected a degraded investigation.');
  return incident;
}

function dataHubProviders() {
  const fixture = createFixtureMetadataAdapter();
  return {
    metadataHealth: fixture,
    metadataSearch: fixture,
    metadataLineage: fixture,
    metadataRecentChanges: fixture,
  };
}

describe('graceful investigation degradation', () => {
  it('does not silently run the fixture report when live DataHub health is unavailable', async () => {
    const investigate = vi.fn<InvestigationRunner['investigate']>();
    const rawSecret = 'https://private-provider.invalid token-secret stack-trace';
    const terminal = expectDegraded(
      await submitAndWait({
        mode: 'datahub',
        metadataHealth: {
          healthCheck: async () => ({ status: 'unavailable', message: rawSecret }),
        },
        runner: { investigate },
      }),
    );

    expect(investigate).not.toHaveBeenCalled();
    expect(terminal).toMatchObject({
      execution: { terminationReason: 'metadata_unavailable', retries: 0 },
      error: {
        code: 'METADATA_UNAVAILABLE',
        message: INVESTIGATION_TERMINATION_MESSAGES.metadata_unavailable,
      },
      failedOperation: 'metadata_health',
      contextStage: { status: 'degraded', facts: { candidateEntities: [] } },
    });
    expect(terminal.nextSteps.map((step) => step.id)).toContain('continue_fixture_mode');
    expect(terminal.warnings.map((warning) => warning.code)).not.toContain('partial_evidence');
    expect(JSON.stringify(terminal)).not.toContain(rawSecret);
    expect(terminal).not.toHaveProperty('report');
  });

  it('preserves validated facts when DataHub becomes unavailable after lineage collection', async () => {
    const investigate = vi.fn<InvestigationRunner['investigate']>();
    const terminal = expectDegraded(
      await submitAndWait({
        mode: 'datahub',
        ...dataHubProviders(),
        metadataRecentChanges: {
          getRecentChangesForEntity: async () => {
            throw new MetadataProviderError('unavailable');
          },
        },
        runner: { investigate },
      }),
    );

    expect(investigate).not.toHaveBeenCalled();
    expect(terminal).toMatchObject({
      execution: { terminationReason: 'metadata_unavailable', retries: 0 },
      error: { code: 'METADATA_UNAVAILABLE' },
      failedOperation: 'recent_changes',
      contextStage: {
        status: 'degraded',
        facts: { sourceMode: 'datahub', selectedEntity: { urn: expect.any(String) } },
      },
    });
    expect(terminal.warnings.map((warning) => warning.code)).toContain('partial_evidence');
    expect(terminal.nextSteps.map((step) => step.id)).toContain('continue_fixture_mode');
    expect(terminal).not.toHaveProperty('report');
  });

  it('asks for a candidate or more context when entity search returns no match', async () => {
    const investigate = vi.fn<InvestigationRunner['investigate']>();
    const terminal = expectDegraded(
      await submitAndWait({
        metadataSearch: { searchEntities: async () => [] },
        runner: { investigate },
      }),
    );

    expect(investigate).not.toHaveBeenCalled();
    expect(terminal).toMatchObject({
      execution: { terminationReason: 'entity_not_found', retries: 0 },
      error: { code: 'ENTITY_NOT_FOUND' },
      contextStage: { status: 'completed', facts: { candidateEntities: [] } },
      hypothesisScoringStage: { status: 'insufficient' },
      remediationStage: { status: 'insufficient' },
    });
    expect(terminal.nextSteps.map((step) => step.id)).toEqual([
      'provide_entity_candidate',
      'add_incident_context',
    ]);
    expect(terminal).not.toHaveProperty('report');
  });

  it.each([
    {
      operation: 'metadata_health' as const,
      override: {
        metadataHealth: {
          healthCheck: async () => {
            throw new MetadataProviderError('invalid_response');
          },
        },
      },
      preservesEvidence: false,
    },
    {
      operation: 'entity_search' as const,
      override: {
        metadataSearch: {
          searchEntities: async () => {
            throw new MetadataProviderError('invalid_response');
          },
        },
      },
      preservesEvidence: false,
    },
    {
      operation: 'lineage' as const,
      override: {
        metadataLineage: {
          getLineageGraph: async () => {
            throw new MetadataProviderError('invalid_response');
          },
        },
      },
      preservesEvidence: true,
    },
    {
      operation: 'recent_changes' as const,
      override: {
        metadataRecentChanges: {
          getRecentChangesForEntity: async () => {
            throw new MetadataProviderError('invalid_response');
          },
        },
      },
      preservesEvidence: true,
    },
  ])(
    'records only the failed $operation operation and preserves evidence only when collected',
    async ({ operation, override, preservesEvidence }) => {
      const terminal = expectDegraded(
        await submitAndWait({ mode: 'datahub', ...dataHubProviders(), ...override }),
      );

      expect(terminal).toMatchObject({
        execution: { terminationReason: 'tool_failure', retries: 0 },
        error: { code: 'METADATA_INVALID_RESPONSE' },
        failedOperation: operation,
        contextStage: { status: 'degraded' },
      });
      expect(terminal.warnings.map((warning) => warning.code).includes('partial_evidence')).toBe(
        preservesEvidence,
      );
      if (terminal.contextStage.status !== 'degraded') {
        throw new Error('Expected degraded context evidence.');
      }
      expect(terminal.contextStage.facts.candidateEntities.length > 0).toBe(preservesEvidence);
      expect(terminal).not.toHaveProperty('report');
    },
  );

  it('returns a partial report with an explicit incomplete-lineage termination', async () => {
    const terminal = expectDegraded(
      await submitAndWait({
        contextLimits: {
          ...DEFAULT_INCIDENT_CONTEXT_LIMITS,
          lineageDepth: 1,
          lineageEntityCount: 1,
        },
      }),
    );

    expect(terminal).toMatchObject({
      execution: { terminationReason: 'lineage_truncated', retries: 0 },
      error: { code: 'LINEAGE_TRUNCATED' },
      contextStage: { status: 'completed', facts: { lineage: { truncated: true } } },
    });
    expect(terminal.failedOperation).toBeUndefined();
    expect(terminal.warnings.map((warning) => warning.code)).toEqual([
      'partial_evidence',
      'incomplete_lineage',
    ]);
    expect(terminal.report?.missingInformation).toContain(
      'The lineage graph is incomplete because configured depth or entity bounds omitted reachable entities.',
    );
  });

  it('distinguishes model-provider timeout from total duration exhaustion and preserves context', async () => {
    let now = 0;
    const withinBudget = expectDegraded(
      await submitAndWait({
        executionClock: () => now,
        runner: {
          investigate: async () => {
            throw new InvestigationModelProviderTimeoutError();
          },
        },
      }),
    );
    expect(withinBudget).toMatchObject({
      execution: { terminationReason: 'model_provider_timeout', retries: 0 },
      error: { code: 'MODEL_TIMEOUT' },
      failedOperation: 'model_provider',
      contextStage: { status: 'completed' },
    });

    now = 0;
    const beyondBudget = expectDegraded(
      await submitAndWait({
        executionClock: () => now,
        runtimeLimits: { ...DEFAULT_RUNTIME_LIMIT_CONFIG, agentTimeoutMs: 90_000 },
        runner: {
          investigate: async () => {
            now = 90_001;
            throw new InvestigationModelProviderTimeoutError();
          },
        },
      }),
    );
    expect(beyondBudget).toMatchObject({
      execution: { terminationReason: 'duration_limit_reached', durationMs: 90_001, retries: 0 },
      error: { code: 'INVESTIGATION_LIMIT_REACHED' },
      contextStage: { status: 'completed' },
    });
    expect(beyondBudget.failedOperation).toBeUndefined();
  });

  it.each([
    { maxRetries: 0, expectedCalls: 1 },
    { maxRetries: 2, expectedCalls: 3 },
    { maxRetries: 5, expectedCalls: 6 },
  ])(
    'rejects invalid structured output after exactly $maxRetries configured retries',
    async ({ maxRetries, expectedCalls }) => {
      const investigate = vi.fn(async () => ({ unsafe: 'provider-payload-secret' }) as never);
      const terminal = expectDegraded(
        await submitAndWait({
          runner: { investigate },
          runtimeLimits: { ...DEFAULT_RUNTIME_LIMIT_CONFIG, maxRetries },
        }),
      );

      expect(investigate).toHaveBeenCalledTimes(expectedCalls);
      expect(terminal).toMatchObject({
        execution: { terminationReason: 'model_output_invalid', retries: maxRetries },
        error: { code: 'MODEL_OUTPUT_INVALID' },
        failedOperation: 'structured_output',
        contextStage: { status: 'completed' },
      });
      expect(terminal.warnings.map((warning) => warning.code)).toContain(
        'structured_output_rejected',
      );
      expect(JSON.stringify(terminal)).not.toContain('provider-payload-secret');
      expect(terminal).not.toHaveProperty('report');
    },
  );

  it('keeps the credential-free fixture flow completed with zero retries', async () => {
    const terminal = await submitAndWait({
      environment: {
        APP_MODE: 'fixture',
        DATAHUB_GMS_URL: 'https://must-not-be-read.invalid',
        DATAHUB_TOKEN: 'must-not-be-read',
        MODEL_API_KEY: 'must-not-be-read',
      },
    });

    expect(terminal).toMatchObject({
      status: 'completed',
      execution: { terminationReason: 'completed', retries: 0 },
    });
  });
});
