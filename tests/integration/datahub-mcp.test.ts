import { describe, expect, it } from 'vitest';
import { buildServer, RuntimeConfigurationError } from '../../apps/api/src/index.js';
import {
  createDataHubMcpMetadataAdapter,
  createFixtureMetadataAdapter,
  DataHubMcpConfigurationError,
  MetadataProviderError,
  type DataHubMcpTransportFactory,
} from '../../packages/datahub-client/src/index.js';
import {
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  MetadataRecentChangesResponseSchema,
  ReadinessResponseSchema,
} from '../../packages/shared-types/src/index.js';

interface RecordedProtocolRequest {
  method: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
}

interface ProtocolFixtureOptions {
  omitLineageTool?: boolean;
  tools?: unknown[];
  malformedLineagePayload?: boolean;
  malformedSearchPayload?: boolean;
  oversizedSearchResponse?: boolean;
  stallTool?: 'search' | 'get_lineage';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function officialToolDefinitions() {
  return [
    {
      name: 'search',
      description: 'Read-only DataHub entity search.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          num_results: { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'get_lineage',
      description: 'Read-only DataHub lineage lookup.',
      inputSchema: {
        type: 'object',
        properties: {
          urn: { type: 'string' },
          upstream: { type: 'boolean' },
          max_hops: { type: 'integer' },
          max_results: { type: 'integer' },
          offset: { type: 'integer' },
        },
        required: ['urn'],
      },
      annotations: { readOnlyHint: true },
    },
  ];
}

function toolDefinitionsWithProperty(
  toolName: 'search' | 'get_lineage',
  propertyName: string,
  propertySchema: unknown,
) {
  const tools = structuredClone(officialToolDefinitions()) as unknown[];
  const tool = tools.find((candidate) => isRecord(candidate) && candidate.name === toolName);
  const inputSchema = isRecord(tool) && isRecord(tool.inputSchema) ? tool.inputSchema : undefined;
  const properties =
    inputSchema && isRecord(inputSchema.properties) ? inputSchema.properties : undefined;
  if (!properties) {
    throw new Error('The test tool definition is malformed.');
  }
  if (propertySchema === undefined) {
    delete properties[propertyName];
  } else {
    properties[propertyName] = propertySchema;
  }
  return tools;
}

function toolDefinitionsWithRequired(toolName: 'search' | 'get_lineage', required: string[]) {
  const tools = structuredClone(officialToolDefinitions()) as unknown[];
  const tool = tools.find((candidate) => isRecord(candidate) && candidate.name === toolName);
  const inputSchema = isRecord(tool) && isRecord(tool.inputSchema) ? tool.inputSchema : undefined;
  if (!inputSchema) {
    throw new Error('The test tool definition is malformed.');
  }
  inputSchema.required = required;
  return tools;
}

function toolDefinitionsWithAdditionalRequired(
  toolName: 'search' | 'get_lineage',
  propertyName: string,
  propertySchema: unknown,
) {
  const tools = toolDefinitionsWithProperty(toolName, propertyName, propertySchema);
  const tool = tools.find((candidate) => isRecord(candidate) && candidate.name === toolName);
  const inputSchema = isRecord(tool) && isRecord(tool.inputSchema) ? tool.inputSchema : undefined;
  if (!inputSchema) {
    throw new Error('The test tool definition is malformed.');
  }
  inputSchema.required = [
    ...(Array.isArray(inputSchema.required) ? inputSchema.required : []),
    propertyName,
  ];
  return tools;
}

class DataHubMcpProtocolTransport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: unknown) => void;
  sessionId?: string;

  constructor(
    private readonly requests: RecordedProtocolRequest[],
    private readonly options: ProtocolFixtureOptions,
  ) {}

  async start() {}

  async close() {
    this.onclose?.();
  }

  async send(message: unknown) {
    if (!isRecord(message) || typeof message.method !== 'string') {
      throw new Error('The protocol fixture received an invalid JSON-RPC message.');
    }
    if (!('id' in message)) {
      return;
    }

    const params = isRecord(message.params) ? message.params : {};
    const request: RecordedProtocolRequest = { method: message.method };
    if (message.method === 'tools/call') {
      request.toolName = typeof params.name === 'string' ? params.name : undefined;
      request.arguments = isRecord(params.arguments) ? params.arguments : undefined;
    }
    this.requests.push(request);

    if (message.method === 'tools/call' && request.toolName === this.options.stallTool) {
      return;
    }

    let result: unknown;
    if (message.method === 'initialize') {
      const requestedVersion =
        typeof params.protocolVersion === 'string' ? params.protocolVersion : '2025-06-18';
      result = {
        protocolVersion: requestedVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'datahub-mcp-protocol-fixture', version: 'test-only' },
      };
    } else if (message.method === 'tools/list') {
      const tools =
        this.options.tools ??
        officialToolDefinitions().filter(
          (tool) => !this.options.omitLineageTool || tool.name !== 'get_lineage',
        );
      result = {
        tools,
      };
    } else if (message.method === 'tools/call' && request.toolName === 'search') {
      const largeDescription = this.options.oversizedSearchResponse ? 'x'.repeat(2_000) : undefined;
      result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              searchResults: this.options.malformedSearchPayload
                ? 'not-an-array'
                : [
                    {
                      entity: {
                        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
                        properties: { name: 'analytics.daily_revenue' },
                        ...(largeDescription ? { description: largeDescription } : {}),
                      },
                    },
                  ],
            }),
          },
        ],
      };
    } else if (message.method === 'tools/call' && request.toolName === 'get_lineage') {
      result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              upstreams: {
                searchResults: [
                  {
                    degree: this.options.malformedLineagePayload ? 'one' : 1,
                    entity: {
                      urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
                      type: 'DATASET',
                      name: 'raw.orders',
                    },
                  },
                ],
                returned: 1,
                offset: 0,
                hasMore: false,
              },
            }),
          },
        ],
      };
    } else {
      throw new Error(`Unexpected protocol request: ${message.method}`);
    }

    queueMicrotask(() => {
      this.onmessage?.({
        jsonrpc: '2.0',
        id: message.id,
        result,
      });
    });
  }
}

function protocolFixture(
  requests: RecordedProtocolRequest[],
  options: ProtocolFixtureOptions = {},
): DataHubMcpTransportFactory {
  return () =>
    new DataHubMcpProtocolTransport(
      requests,
      options,
    ) as unknown as ReturnType<DataHubMcpTransportFactory>;
}

function testAdapter(requests: RecordedProtocolRequest[], options: ProtocolFixtureOptions = {}) {
  return createDataHubMcpMetadataAdapter({
    url: 'http://127.0.0.1:8080/mcp',
    authMode: 'none',
    timeoutMs: 250,
    maxResponseBytes: 16_384,
    transportFactory: protocolFixture(requests, options),
  });
}

async function completedIncident(server: ReturnType<typeof buildServer>, incidentId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await server.inject({
      method: 'GET',
      url: `/incidents/${incidentId}`,
    });
    const incident = IncidentRetrievalResponseSchema.parse(response.json());
    if (incident.status !== 'processing') {
      return incident;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('The deterministic MCP investigation did not finish.');
}

describe('DataHub MCP Server provider', () => {
  it('requires an explicit safe endpoint/auth configuration and never falls back to fixtures', () => {
    expect(() =>
      createDataHubMcpMetadataAdapter({
        url: 'https://user:password@example.invalid/mcp',
        authMode: 'bearer',
        token: 'test-only-token',
      }),
    ).toThrow(DataHubMcpConfigurationError);
    expect(() =>
      createDataHubMcpMetadataAdapter({
        url: 'https://example.invalid/mcp',
        authMode: 'bearer',
      }),
    ).toThrow(DataHubMcpConfigurationError);
    let plaintextBearerFailure: unknown;
    try {
      createDataHubMcpMetadataAdapter({
        url: 'http://example.invalid/mcp',
        authMode: 'bearer',
        token: 'plaintext-bearer-must-not-appear',
      });
    } catch (error) {
      plaintextBearerFailure = error;
    }
    expect(plaintextBearerFailure).toMatchObject({
      name: 'DataHubMcpConfigurationError',
      variableName: 'DATAHUB_MCP_URL',
    });
    expect(String(plaintextBearerFailure)).not.toContain('plaintext-bearer-must-not-appear');
    expect(() =>
      createDataHubMcpMetadataAdapter({
        url: 'http://127.0.0.1:8080/mcp',
        authMode: 'none',
        token: 'ambiguous-test-token',
      }),
    ).toThrow(DataHubMcpConfigurationError);
    expect(() =>
      createDataHubMcpMetadataAdapter({
        url: 'https://example.invalid/mcp?token=unsafe',
        authMode: 'bearer',
        token: 'test-only-token',
      }),
    ).toThrow(DataHubMcpConfigurationError);
    expect(() =>
      buildServer({
        environment: { APP_MODE: 'datahub-mcp' },
        logger: false,
      }),
    ).toThrow(RuntimeConfigurationError);
    expect(() =>
      buildServer({
        environment: { APP_MODE: 'unknown-provider' },
        logger: false,
      }),
    ).toThrow(RuntimeConfigurationError);
  });

  it.each([
    ['unconfigured', 'DATAHUB_MCP_CONFIG_MISSING'],
    ['unauthorized', 'DATAHUB_MCP_UNAUTHORIZED'],
    ['unavailable', 'DATAHUB_MCP_UNAVAILABLE'],
    ['timeout', 'DATAHUB_MCP_TIMEOUT'],
    ['invalid_response', 'DATAHUB_MCP_INVALID_RESPONSE'],
  ] as const)('maps MCP %s readiness to %s', async (status, reasonCode) => {
    const server = buildServer({
      logger: false,
      mode: 'datahub-mcp',
      metadata: createFixtureMetadataAdapter(),
      metadataHealth: {
        async healthCheck() {
          return { status, message: 'Provider detail must not cross readiness.' };
        },
      },
    });
    try {
      const response = await server.inject({ method: 'GET', url: '/ready' });
      expect(response.statusCode).toBe(503);
      expect(ReadinessResponseSchema.parse(response.json())).toEqual({
        status: 'not_ready',
        mode: 'datahub-mcp',
        checks: [
          { name: 'datahub_mcp', status: 'not_ready', reasonCode },
          { name: 'model', status: 'not_required', reasonCode: 'MODEL_NOT_REQUIRED' },
        ],
      });
      expect(response.body).not.toContain('Provider detail');
    } finally {
      await server.close();
    }
  });

  it('discovers and calls only the official read-only search and get_lineage tools', async () => {
    const requests: RecordedProtocolRequest[] = [];
    const adapter = testAdapter(requests);

    await expect(adapter.healthCheck()).resolves.toEqual({
      status: 'ready',
      message: 'DataHub MCP Server is ready.',
    });
    const entities = await adapter.searchEntities({
      query: 'daily revenue',
      limit: 3,
      fallbackToDefault: false,
    });
    const lineage = await adapter.getLineageGraph({
      rootUrn: entities[0]!.urn,
      direction: 'upstream',
      depth: 1,
      maxNodes: 4,
    });
    const recentChanges = await adapter.getRecentChangesForEntity({
      entityUrn: entities[0]!.urn,
      endTime: '2026-07-18T08:30:00.000Z',
      windowHours: 24,
      limit: 4,
    });

    expect(entities).toEqual([
      expect.objectContaining({ name: 'analytics.daily_revenue', kind: 'dataset' }),
    ]);
    expect(lineage).toMatchObject({
      requestedDepth: 1,
      maxNodes: 4,
      visitedNodeCount: 2,
      truncated: false,
      edges: [
        {
          sourceUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
          targetUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
        },
      ],
    });
    expect(MetadataRecentChangesResponseSchema.parse(recentChanges)).toMatchObject({
      capability: 'unsupported',
      returnedCount: 0,
      truncated: false,
      changes: [],
    });
    expect(requests.filter(({ method }) => method === 'tools/call')).toEqual([
      {
        method: 'tools/call',
        toolName: 'search',
        arguments: {
          query: 'daily revenue',
          num_results: 3,
          offset: 0,
        },
      },
      {
        method: 'tools/call',
        toolName: 'get_lineage',
        arguments: {
          urn: entities[0]!.urn,
          upstream: true,
          max_hops: 1,
          max_results: 3,
          offset: 0,
        },
      },
    ]);
  });

  it.each([
    ['search query type', toolDefinitionsWithProperty('search', 'query', { type: 'integer' })],
    ['search num_results field', toolDefinitionsWithProperty('search', 'num_results', undefined)],
    ['search offset field', toolDefinitionsWithProperty('search', 'offset', undefined)],
    ['lineage urn type', toolDefinitionsWithProperty('get_lineage', 'urn', { type: 'integer' })],
    [
      'lineage upstream type',
      toolDefinitionsWithProperty('get_lineage', 'upstream', { type: 'string' }),
    ],
    ['lineage max_hops field', toolDefinitionsWithProperty('get_lineage', 'max_hops', undefined)],
    [
      'lineage max_results type',
      toolDefinitionsWithProperty('get_lineage', 'max_results', { type: 'number' }),
    ],
    ['lineage offset field', toolDefinitionsWithProperty('get_lineage', 'offset', undefined)],
    [
      'additional required search tenant',
      toolDefinitionsWithAdditionalRequired('search', 'tenant', { type: 'string' }),
    ],
    [
      'additional required lineage tenant',
      toolDefinitionsWithAdditionalRequired('get_lineage', 'tenant', { type: 'string' }),
    ],
    [
      'unique search definition',
      [...officialToolDefinitions(), structuredClone(officialToolDefinitions()[0])],
    ],
    [
      'present lineage definition',
      officialToolDefinitions().filter(({ name }) => name !== 'get_lineage'),
    ],
    [
      'read-only annotation',
      officialToolDefinitions().map((tool) =>
        tool.name === 'search' ? { ...tool, annotations: { readOnlyHint: false } } : tool,
      ),
    ],
  ])('fails readiness for an incompatible %s', async (_label, tools) => {
    await expect(testAdapter([], { tools }).healthCheck()).resolves.toMatchObject({
      status: 'invalid_response',
    });
  });

  it('accepts an optional official search query while sending the bounded query explicitly', async () => {
    const requests: RecordedProtocolRequest[] = [];
    const adapter = testAdapter(requests);

    await expect(adapter.healthCheck()).resolves.toMatchObject({ status: 'ready' });
    await adapter.searchEntities({ query: 'daily revenue', limit: 2 });
    expect(requests.filter(({ method }) => method === 'tools/call')).toEqual([
      expect.objectContaining({
        toolName: 'search',
        arguments: { query: 'daily revenue', num_results: 2, offset: 0 },
      }),
    ]);
  });

  it('accepts an optional lineage urn while sending every lineage parameter explicitly', async () => {
    const requests: RecordedProtocolRequest[] = [];
    const adapter = testAdapter(requests, {
      tools: toolDefinitionsWithRequired('get_lineage', []),
    });

    await expect(adapter.healthCheck()).resolves.toMatchObject({ status: 'ready' });
    await adapter.getLineageGraph({
      rootUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
      direction: 'upstream',
      depth: 1,
      maxNodes: 4,
    });
    expect(requests.filter(({ method }) => method === 'tools/call')).toEqual([
      expect.objectContaining({
        toolName: 'get_lineage',
        arguments: expect.objectContaining({
          urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
          upstream: true,
          max_hops: 1,
          max_results: 3,
          offset: 0,
        }),
      }),
    ]);
  });

  it('ignores unrelated discovered tools while keeping them uncallable', async () => {
    const requests: RecordedProtocolRequest[] = [];
    const adapter = testAdapter(requests, {
      tools: [
        ...officialToolDefinitions(),
        {
          name: 'delete_entity',
          inputSchema: { type: 'object', properties: {}, required: [] },
          annotations: { readOnlyHint: false },
        },
      ],
    });

    await expect(adapter.healthCheck()).resolves.toMatchObject({ status: 'ready' });
    await adapter.searchEntities({ query: 'daily revenue', limit: 1 });
    expect(requests.filter(({ method }) => method === 'tools/call')).toEqual([
      expect.objectContaining({ toolName: 'search' }),
    ]);
  });

  it('fails safely for missing tools, timeouts, and oversized responses', async () => {
    const missingTool = testAdapter([], { omitLineageTool: true });
    await expect(missingTool.healthCheck()).resolves.toMatchObject({
      status: 'invalid_response',
    });

    const timeoutRequests: RecordedProtocolRequest[] = [];
    const timeoutAdapter = createDataHubMcpMetadataAdapter({
      url: 'http://127.0.0.1:8080/mcp',
      authMode: 'none',
      timeoutMs: 100,
      maxResponseBytes: 16_384,
      transportFactory: protocolFixture(timeoutRequests, { stallTool: 'search' }),
    });
    await expect(
      timeoutAdapter.searchEntities({ query: 'daily revenue', limit: 3 }),
    ).rejects.toMatchObject<MetadataProviderError>({ status: 'timeout' });

    const oversizedAdapter = createDataHubMcpMetadataAdapter({
      url: 'http://127.0.0.1:8080/mcp',
      authMode: 'none',
      timeoutMs: 250,
      maxResponseBytes: 1_024,
      transportFactory: protocolFixture([], { oversizedSearchResponse: true }),
    });
    await expect(
      oversizedAdapter.searchEntities({ query: 'daily revenue', limit: 3 }),
    ).rejects.toMatchObject<MetadataProviderError>({ status: 'invalid_response' });
  });

  it('normalizes malformed search and lineage payload schemas as invalid_response', async () => {
    await expect(
      testAdapter([], { malformedSearchPayload: true }).searchEntities({
        query: 'daily revenue',
        limit: 3,
      }),
    ).rejects.toMatchObject<MetadataProviderError>({ status: 'invalid_response' });

    await expect(
      testAdapter([], { malformedLineagePayload: true }).getLineageGraph({
        rootUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
        direction: 'upstream',
        depth: 1,
        maxNodes: 4,
      }),
    ).rejects.toMatchObject<MetadataProviderError>({ status: 'invalid_response' });
  });

  it('runs intake through MCP evidence and a deterministic report with zero model calls', async () => {
    const requests: RecordedProtocolRequest[] = [];
    const adapter = testAdapter(requests);
    const server = buildServer({
      logger: false,
      mode: 'datahub-mcp',
      metadata: adapter,
      processingDelayMs: 0,
      runtimeLimits: {
        maxAgentSteps: 8,
        maxToolCalls: 12,
        maxLineageDepth: 1,
        maxEntitiesPerQuery: 4,
        maxRetries: 0,
        agentTimeoutMs: 2_000,
        maxModelOutputBytes: 65_536,
      },
    });
    try {
      const liveness = await server.inject({ method: 'GET', url: '/health' });
      expect(liveness.statusCode).toBe(200);
      expect(liveness.json()).toEqual({ status: 'ok' });
      const metadataHealth = await server.inject({
        method: 'GET',
        url: '/metadata/health',
      });
      expect(metadataHealth.statusCode).toBe(200);
      expect(metadataHealth.json()).toEqual({
        mode: 'datahub-mcp',
        status: 'ready',
        message: 'DataHub MCP Server is ready.',
      });
      const readiness = await server.inject({ method: 'GET', url: '/ready' });
      expect(ReadinessResponseSchema.parse(readiness.json())).toEqual({
        status: 'ready',
        mode: 'datahub-mcp',
        checks: [
          { name: 'datahub_mcp', status: 'ready' },
          { name: 'model', status: 'not_required', reasonCode: 'MODEL_NOT_REQUIRED' },
        ],
      });

      const accepted = await server.inject({
        method: 'POST',
        url: '/incidents',
        payload: IncidentRequestSchema.parse({
          question: 'Why did daily revenue fail after the upstream schema changed?',
          entityHint: 'analytics.daily_revenue',
          occurredAt: '2026-07-18T08:30:00.000Z',
          symptom: 'The daily revenue dashboard failed.',
        }),
      });
      expect(accepted.statusCode).toBe(202);
      const incident = await completedIncident(
        server,
        accepted.json<{ incidentId: string }>().incidentId,
      );

      expect(incident.status).toBe('completed');
      if (incident.status !== 'completed') {
        throw new Error('Expected a completed deterministic MCP investigation.');
      }
      expect(incident.execution).toMatchObject({
        toolCalls: 8,
        retries: 0,
        terminationReason: 'completed',
      });
      expect(incident.contextStage).toMatchObject({
        status: 'completed',
        facts: {
          sourceMode: 'datahub-mcp',
          selectedEntity: expect.objectContaining({ name: 'analytics.daily_revenue' }),
        },
        missingInformation: expect.arrayContaining([
          expect.objectContaining({ code: 'recent_changes_unsupported' }),
        ]),
      });
      expect(incident.suspiciousChangeStage).toMatchObject({
        status: 'insufficient',
        missingInformation: expect.arrayContaining([
          expect.objectContaining({ code: 'recent_changes_unsupported' }),
        ]),
      });
      expect(incident.report.evidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'metadata-seed',
            statement: expect.stringContaining('DataHub MCP Server metadata'),
          }),
          expect.objectContaining({
            id: 'lineage-upstream-1',
            statement: expect.stringContaining('DataHub MCP Server lineage'),
          }),
        ]),
      );
      expect(incident.report.hypotheses[0]?.evidenceIds).toEqual(
        expect.arrayContaining(['metadata-seed']),
      );
      expect(JSON.stringify(incident)).not.toMatch(/openai|model call|api key/i);

      const toolCalls = requests.filter(({ method }) => method === 'tools/call');
      expect(toolCalls.map(({ toolName }) => toolName)).toEqual([
        'search',
        'get_lineage',
        'search',
        'get_lineage',
      ]);
      expect(new Set(toolCalls.map(({ toolName }) => toolName))).toEqual(
        new Set(['search', 'get_lineage']),
      );
    } finally {
      await server.close();
    }
  });
});
