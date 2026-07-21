import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, readRuntimeLimitConfig } from '../../apps/api/src/index.js';
import {
  InvestigationExecutionBudget,
  InvestigationLimitError,
} from '../../packages/agent-core/src/index.js';
import {
  DEFAULT_RUNTIME_LIMIT_CONFIG,
  IncidentRetrievalResponseSchema,
  INVESTIGATION_LIMIT_MESSAGES,
  RuntimeLimitConfigSchema,
  type RuntimeLimitConfig,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

function runtimeLimits(overrides: Partial<RuntimeLimitConfig> = {}) {
  return RuntimeLimitConfigSchema.parse({
    ...DEFAULT_RUNTIME_LIMIT_CONFIG,
    ...overrides,
  });
}

function expectLimit(
  action: () => unknown,
  reason: Exclude<InstanceType<typeof InvestigationLimitError>['reason'], 'completed'>,
) {
  try {
    action();
    throw new Error(`Expected ${reason}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(InvestigationLimitError);
    expect(error).toMatchObject({
      reason,
      message: INVESTIGATION_LIMIT_MESSAGES[reason],
      execution: { terminationReason: reason },
    });
  }
}

async function submitCanonicalIncident(server: ReturnType<typeof buildServer>) {
  const response = await server.inject({
    method: 'POST',
    url: '/incidents',
    payload: {
      question: 'Why did revenue drop after the morning warehouse refresh?',
      entityHint: 'analytics.daily_revenue',
      occurredAt: '2026-07-18T08:30:00.000Z',
      symptom: 'Revenue is 42% below the seven-day baseline.',
    },
  });
  expect(response.statusCode).toBe(202);
  return response.json<{ incidentId: string }>().incidentId;
}

async function waitForTerminal(server: ReturnType<typeof buildServer>, incidentId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await server.inject({ method: 'GET', url: `/incidents/${incidentId}` });
    const incident = IncidentRetrievalResponseSchema.parse(response.json());
    if (incident.status !== 'processing') {
      return { incident, response };
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('Investigation did not reach a terminal state.');
}

describe('runtime limit configuration', () => {
  it('uses the documented safe defaults and canonical environment units', () => {
    expect(readRuntimeLimitConfig({})).toEqual(DEFAULT_RUNTIME_LIMIT_CONFIG);
    expect(
      readRuntimeLimitConfig({
        MAX_AGENT_STEPS: '8',
        MAX_TOOL_CALLS: '12',
        MAX_LINEAGE_DEPTH: '3',
        MAX_ENTITIES_PER_QUERY: '30',
        AGENT_TIMEOUT_SECONDS: '90',
        MAX_RETRIES: '2',
        MAX_MODEL_OUTPUT_BYTES: '65536',
      }),
    ).toEqual(DEFAULT_RUNTIME_LIMIT_CONFIG);
  });

  it('accepts documented legacy names only as canonical fallbacks', () => {
    expect(
      readRuntimeLimitConfig({
        MAX_LINEAGE_ENTITIES: '24',
        INVESTIGATION_TIMEOUT_MS: '45000',
      }),
    ).toMatchObject({ maxEntitiesPerQuery: 24, agentTimeoutMs: 45_000 });

    expect(() =>
      readRuntimeLimitConfig({
        MAX_ENTITIES_PER_QUERY: '30',
        MAX_LINEAGE_ENTITIES: '24',
      }),
    ).toThrow(/MAX_ENTITIES_PER_QUERY cannot be combined with legacy MAX_LINEAGE_ENTITIES/);
    expect(() =>
      readRuntimeLimitConfig({
        AGENT_TIMEOUT_SECONDS: '90',
        INVESTIGATION_TIMEOUT_MS: '45000',
      }),
    ).toThrow(/AGENT_TIMEOUT_SECONDS cannot be combined with legacy INVESTIGATION_TIMEOUT_MS/);
  });

  it('accepts the supported lower and upper startup boundaries', () => {
    expect(
      readRuntimeLimitConfig({
        MAX_AGENT_STEPS: '1',
        MAX_TOOL_CALLS: '1',
        MAX_LINEAGE_DEPTH: '1',
        MAX_ENTITIES_PER_QUERY: '1',
        MAX_RETRIES: '0',
        AGENT_TIMEOUT_SECONDS: '1',
        MAX_MODEL_OUTPUT_BYTES: '1024',
      }),
    ).toMatchObject({
      maxAgentSteps: 1,
      maxToolCalls: 1,
      maxLineageDepth: 1,
      maxEntitiesPerQuery: 1,
      maxRetries: 0,
      agentTimeoutMs: 1_000,
      maxModelOutputBytes: 1_024,
    });
    expect(
      readRuntimeLimitConfig({
        MAX_AGENT_STEPS: '64',
        MAX_TOOL_CALLS: '64',
        MAX_LINEAGE_DEPTH: '5',
        MAX_ENTITIES_PER_QUERY: '100',
        MAX_RETRIES: '5',
        AGENT_TIMEOUT_SECONDS: '300',
        MAX_MODEL_OUTPUT_BYTES: '1048576',
      }),
    ).toMatchObject({
      maxAgentSteps: 64,
      maxToolCalls: 64,
      maxLineageDepth: 5,
      maxEntitiesPerQuery: 100,
      maxRetries: 5,
      agentTimeoutMs: 300_000,
      maxModelOutputBytes: 1_048_576,
    });
  });

  it('validates every startup boundary without echoing rejected values', () => {
    const invalidEnvironments: Array<[string, NodeJS.ProcessEnv]> = [
      ['MAX_AGENT_STEPS', { MAX_AGENT_STEPS: '0' }],
      ['MAX_AGENT_STEPS', { MAX_AGENT_STEPS: '1.5' }],
      ['MAX_TOOL_CALLS', { MAX_TOOL_CALLS: '65' }],
      ['MAX_LINEAGE_DEPTH', { MAX_LINEAGE_DEPTH: '6' }],
      ['MAX_ENTITIES_PER_QUERY', { MAX_ENTITIES_PER_QUERY: '101' }],
      ['MAX_RETRIES', { MAX_RETRIES: '6' }],
      ['AGENT_TIMEOUT_SECONDS', { AGENT_TIMEOUT_SECONDS: '301' }],
      ['MAX_MODEL_OUTPUT_BYTES', { MAX_MODEL_OUTPUT_BYTES: '1023' }],
    ];

    for (const [name, environment] of invalidEnvironments) {
      expect(() => buildServer({ environment, logger: false })).toThrow(name);
      try {
        readRuntimeLimitConfig(environment);
      } catch (error) {
        expect(String(error)).not.toContain(Object.values(environment)[0] ?? '');
      }
    }
  });
});

describe('deterministic investigation execution budget', () => {
  it('allows every exact boundary and reports only events that actually ran', () => {
    let now = 0;
    const budget = new InvestigationExecutionBudget(
      runtimeLimits({
        maxAgentSteps: 2,
        maxToolCalls: 2,
        maxLineageDepth: 2,
        maxEntitiesPerQuery: 2,
        maxRetries: 1,
        agentTimeoutMs: 1_000,
        maxModelOutputBytes: 1_024,
      }),
      () => now,
    );

    budget.beginAgentStep();
    budget.beginAgentStep();
    budget.recordToolCall();
    budget.recordToolCall();
    budget.assertLineageRequest(2, 2);
    budget.recordLineageEntities(['urn:one', 'urn:two']);
    budget.recordRetry();
    budget.assertModelOutput('x'.repeat(1_024));
    now = 250;
    expect(budget.remainingDurationMs()).toBe(750);
    now = 1_000;

    expect(budget.snapshot()).toEqual({
      toolCalls: 2,
      agentSteps: 2,
      durationMs: 1_000,
      lineageEntitiesVisited: 2,
      terminationReason: 'completed',
    });
  });

  it('uses a stable reason for each one-over-limit boundary without sleeping', () => {
    let now = 0;
    const makeBudget = (overrides: Partial<RuntimeLimitConfig>) =>
      new InvestigationExecutionBudget(runtimeLimits(overrides), () => now);

    const agentSteps = makeBudget({ maxAgentSteps: 1 });
    agentSteps.beginAgentStep();
    expectLimit(() => agentSteps.beginAgentStep(), 'agent_step_limit_reached');

    const toolCalls = makeBudget({ maxToolCalls: 1 });
    toolCalls.recordToolCall();
    expectLimit(() => toolCalls.recordToolCall(), 'tool_call_limit_reached');

    expectLimit(
      () => makeBudget({ maxLineageDepth: 1 }).assertLineageRequest(2, 1),
      'lineage_depth_limit_reached',
    );
    expectLimit(
      () => makeBudget({ maxEntitiesPerQuery: 1 }).assertEntityQuery(2),
      'entity_limit_reached',
    );
    expectLimit(() => makeBudget({ maxRetries: 0 }).recordRetry(), 'retry_limit_reached');

    const duration = makeBudget({ agentTimeoutMs: 1_000 });
    now = 1_001;
    expectLimit(() => duration.assertDuration(), 'duration_limit_reached');

    now = 0;
    expectLimit(
      () => makeBudget({ maxModelOutputBytes: 1_024 }).assertModelOutput('x'.repeat(1_025)),
      'model_output_limit_reached',
    );
  });
});

describe('public incident execution metadata', () => {
  it('rejects completed output without completed metadata and unstable failure messages', () => {
    const failed = {
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'failed',
      execution: {
        toolCalls: 1,
        agentSteps: 1,
        durationMs: 10,
        lineageEntitiesVisited: 0,
        terminationReason: 'tool_call_limit_reached',
      },
      error: {
        code: 'INVESTIGATION_LIMIT_REACHED',
        message: 'Caller-controlled message.',
      },
    };

    expect(IncidentRetrievalResponseSchema.safeParse(failed).success).toBe(false);
    expect(
      IncidentRetrievalResponseSchema.safeParse({
        ...failed,
        execution: { ...failed.execution, terminationReason: 'completed' },
      }).success,
    ).toBe(false);
  });

  it('returns schema-valid factual execution metadata for a completed fixture investigation', async () => {
    const server = buildServer({
      environment: {},
      executionClock: () => 0,
      logger: false,
      processingDelayMs: 0,
    });
    servers.push(server);
    const incidentId = await submitCanonicalIncident(server);

    const { incident, response } = await waitForTerminal(server, incidentId);

    expect(response.statusCode).toBe(200);
    expect(incident).toMatchObject({
      status: 'completed',
      execution: {
        toolCalls: 8,
        agentSteps: 5,
        durationMs: 0,
        lineageEntitiesVisited: 3,
        terminationReason: 'completed',
      },
    });
  });

  it('returns failed, never completed, when a tool-call budget blocks the workflow', async () => {
    const server = buildServer({
      environment: {},
      executionClock: () => 0,
      logger: false,
      processingDelayMs: 0,
      runtimeLimits: runtimeLimits({ maxToolCalls: 4 }),
    });
    servers.push(server);
    const incidentId = await submitCanonicalIncident(server);

    const { incident } = await waitForTerminal(server, incidentId);

    expect(incident).toEqual({
      incidentId,
      status: 'failed',
      execution: {
        toolCalls: 4,
        agentSteps: 3,
        durationMs: 0,
        lineageEntitiesVisited: 2,
        terminationReason: 'tool_call_limit_reached',
      },
      error: {
        code: 'INVESTIGATION_LIMIT_REACHED',
        message: INVESTIGATION_LIMIT_MESSAGES.tool_call_limit_reached,
      },
    });
    expect(incident).not.toHaveProperty('report');
  });

  it('enforces the serialized runner-output boundary before publishing a report', async () => {
    const server = buildServer({
      environment: {},
      executionClock: () => 0,
      logger: false,
      processingDelayMs: 0,
      runtimeLimits: runtimeLimits({ maxModelOutputBytes: 1_024 }),
    });
    servers.push(server);
    const incidentId = await submitCanonicalIncident(server);

    const { incident } = await waitForTerminal(server, incidentId);

    expect(incident).toMatchObject({
      status: 'failed',
      execution: { terminationReason: 'model_output_limit_reached' },
      error: {
        code: 'INVESTIGATION_LIMIT_REACHED',
        message: INVESTIGATION_LIMIT_MESSAGES.model_output_limit_reached,
      },
    });
    expect(incident).not.toHaveProperty('report');
  });

  it('keeps limit counters isolated per server instance', async () => {
    const limitedRuntime = runtimeLimits({ maxAgentSteps: 1 });
    const first = buildServer({
      environment: {},
      executionClock: () => 0,
      logger: false,
      processingDelayMs: 0,
      runtimeLimits: limitedRuntime,
    });
    const second = buildServer({
      environment: {},
      executionClock: () => 0,
      logger: false,
      processingDelayMs: 0,
      runtimeLimits: limitedRuntime,
    });
    servers.push(first, second);
    const firstId = await submitCanonicalIncident(first);
    const secondId = await submitCanonicalIncident(second);

    const [firstResult, secondResult] = await Promise.all([
      waitForTerminal(first, firstId),
      waitForTerminal(second, secondId),
    ]);

    expect(firstResult.incident).toMatchObject({
      status: 'failed',
      execution: { agentSteps: 1, terminationReason: 'agent_step_limit_reached' },
    });
    expect(secondResult.incident).toMatchObject({
      status: 'failed',
      execution: { agentSteps: 1, terminationReason: 'agent_step_limit_reached' },
    });
  });
});
