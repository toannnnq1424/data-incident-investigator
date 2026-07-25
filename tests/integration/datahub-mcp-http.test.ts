import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import {
  DeterministicInvestigationRunner,
  InvestigationExecutionBudget,
  InvestigationLimitError,
} from '../../packages/agent-core/src/index.js';
import {
  createDataHubMcpMetadataAdapter,
  MetadataProviderError,
} from '../../packages/datahub-client/src/index.js';

const responseLimitBytes = 1_024;
const rootUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)';

type TargetResponseMode = 'content-length' | 'chunked-json' | 'chunked-sse';

interface HarnessOptions {
  declaredTargetLength?: number;
  delayFirstSearchMs?: number;
  targetBodyBytes?: number;
  targetResponseMode?: TargetResponseMode;
}

interface HarnessState {
  firstSearchAborted: boolean;
  lateSearchWriteAttempted: boolean;
  toolCalls: string[];
}

function toolDefinitions() {
  return [
    {
      name: 'search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          num_results: { type: 'integer' },
          offset: { type: 'integer' },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'get_lineage',
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

function paddedToolResponse(
  id: unknown,
  targetBodyBytes: number | undefined,
  mode: TargetResponseMode,
) {
  const envelope = (padding: string) => ({
    jsonrpc: '2.0',
    id,
    result: {
      content: [],
      structuredContent: {
        searchResults: [],
        padding,
      },
    },
  });
  const wrap = (json: string) => (mode === 'chunked-sse' ? `data: ${json}\n\n` : json);
  const emptyBody = wrap(JSON.stringify(envelope('')));
  if (targetBodyBytes === undefined) {
    return emptyBody;
  }
  const paddingBytes = targetBodyBytes - Buffer.byteLength(emptyBody);
  if (paddingBytes < 0) {
    throw new Error('The target MCP response size is too small for the protocol envelope.');
  }
  const body = wrap(JSON.stringify(envelope('x'.repeat(paddingBytes))));
  if (Buffer.byteLength(body) !== targetBodyBytes) {
    throw new Error('The MCP response fixture did not reach its exact byte target.');
  }
  return body;
}

function jsonRpcResponse(id: unknown, result: unknown) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function sendChunked(res: ServerResponse, body: string) {
  const firstBoundary = Math.max(1, Math.floor(body.length / 3));
  const secondBoundary = Math.max(firstBoundary + 1, Math.floor((body.length * 2) / 3));
  res.write(body.slice(0, firstBoundary));
  setImmediate(() => {
    if (res.destroyed) {
      return;
    }
    res.write(body.slice(firstBoundary, secondBoundary));
    setImmediate(() => {
      if (!res.destroyed) {
        res.end(body.slice(secondBoundary));
      }
    });
  });
}

async function withMcpHttpHarness<T>(
  options: HarnessOptions,
  operation: (input: {
    adapter: ReturnType<typeof createDataHubMcpMetadataAdapter>;
    state: HarnessState;
  }) => Promise<T>,
) {
  const state: HarnessState = {
    firstSearchAborted: false,
    lateSearchWriteAttempted: false,
    toolCalls: [],
  };
  let searchCalls = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const server = createServer((request, response) => {
    void (async () => {
      if (request.method === 'GET') {
        response.statusCode = 405;
        response.end();
        return;
      }
      if (request.method !== 'POST') {
        response.statusCode = 405;
        response.end();
        return;
      }

      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const message = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
        id?: unknown;
        method?: string;
        params?: { name?: string };
      };
      if (message.id === undefined) {
        response.statusCode = 202;
        response.end();
        return;
      }

      if (message.method === 'initialize') {
        response.setHeader('content-type', 'application/json');
        response.end(
          jsonRpcResponse(message.id, {
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'datahub-mcp-http-fixture', version: 'test-only' },
          }),
        );
        return;
      }
      if (message.method === 'tools/list') {
        response.setHeader('content-type', 'application/json');
        response.end(jsonRpcResponse(message.id, { tools: toolDefinitions() }));
        return;
      }
      if (message.method !== 'tools/call' || typeof message.params?.name !== 'string') {
        response.statusCode = 400;
        response.end();
        return;
      }

      const toolName = message.params.name;
      state.toolCalls.push(toolName);
      if (toolName === 'get_lineage') {
        response.setHeader('content-type', 'application/json');
        response.end(
          jsonRpcResponse(message.id, {
            content: [],
            structuredContent: {
              upstreams: {
                searchResults: [],
                returned: 0,
                offset: 0,
                hasMore: false,
              },
            },
          }),
        );
        return;
      }

      searchCalls += 1;
      const mode = options.targetResponseMode ?? 'content-length';
      const body = paddedToolResponse(message.id, options.targetBodyBytes, mode);
      response.setHeader(
        'content-type',
        mode === 'chunked-sse' ? 'text/event-stream' : 'application/json',
      );
      if (options.declaredTargetLength !== undefined) {
        response.setHeader('content-length', options.declaredTargetLength);
      } else if (mode === 'content-length') {
        response.setHeader('content-length', Buffer.byteLength(body));
      }

      if (searchCalls === 1 && options.delayFirstSearchMs !== undefined) {
        response.on('close', () => {
          if (!response.writableEnded) {
            state.firstSearchAborted = true;
          }
        });
        const timer = setTimeout(() => {
          timers.delete(timer);
          state.lateSearchWriteAttempted = true;
          if (!response.destroyed) {
            response.end(body);
          }
        }, options.delayFirstSearchMs);
        timers.add(timer);
        return;
      }

      if (mode === 'content-length') {
        response.end(body);
      } else {
        sendChunked(response, body);
      }
    })().catch(() => {
      if (!response.headersSent) {
        response.statusCode = 500;
      }
      response.end();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo;
  const adapter = createDataHubMcpMetadataAdapter({
    url: `http://127.0.0.1:${address.port}/mcp`,
    authMode: 'none',
    timeoutMs: 5_000,
    maxResponseBytes: responseLimitBytes,
  });

  try {
    return await operation({ adapter, state });
  } finally {
    for (const timer of timers) {
      clearTimeout(timer);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }
}

describe('DataHub MCP real Streamable HTTP bounds', () => {
  it.each([
    ['declared exact limit', 'content-length', responseLimitBytes, undefined, true],
    [
      'lying oversized Content-Length',
      'content-length',
      responseLimitBytes,
      responseLimitBytes + 1,
      false,
    ],
    ['chunked JSON exact limit', 'chunked-json', responseLimitBytes, undefined, true],
    ['chunked JSON one byte over', 'chunked-json', responseLimitBytes + 1, undefined, false],
    ['chunked SSE exact limit', 'chunked-sse', responseLimitBytes, undefined, true],
    ['chunked SSE one byte over', 'chunked-sse', responseLimitBytes + 1, undefined, false],
  ] as const)(
    'enforces the network body limit for %s',
    async (_label, targetResponseMode, targetBodyBytes, declaredTargetLength, succeeds) => {
      await withMcpHttpHarness(
        {
          targetResponseMode,
          targetBodyBytes,
          ...(declaredTargetLength === undefined ? {} : { declaredTargetLength }),
        },
        async ({ adapter }) => {
          const result = adapter.searchEntities({ query: 'bounded response', limit: 1 });
          if (succeeds) {
            await expect(result).resolves.toEqual([]);
          } else {
            await expect(result).rejects.toMatchObject<MetadataProviderError>({
              status: 'invalid_response',
            });
          }
        },
      );
    },
  );

  it('aborts the in-flight MCP body at the total deadline without late cache or budget mutation', async () => {
    await withMcpHttpHarness(
      {
        delayFirstSearchMs: 700,
        targetResponseMode: 'chunked-json',
      },
      async ({ adapter, state }) => {
        let firstClockRead = true;
        const wallStartedAt = performance.now();
        const executionBudget = new InvestigationExecutionBudget(
          {
            maxAgentSteps: 8,
            maxToolCalls: 12,
            maxLineageDepth: 1,
            maxEntitiesPerQuery: 4,
            maxRetries: 0,
            agentTimeoutMs: 1_000,
            maxModelOutputBytes: 65_536,
          },
          () => {
            if (firstClockRead) {
              firstClockRead = false;
              return 0;
            }
            return 600 + (performance.now() - wallStartedAt);
          },
        );
        const runner = new DeterministicInvestigationRunner();
        let terminalError: unknown;
        try {
          await runner.investigate(
            {
              question: 'Why did daily revenue fail?',
              entityHint: 'analytics.daily_revenue',
            },
            {
              incidentId: '00000000-0000-4000-8000-000000000050',
              metadata: adapter,
              mode: 'datahub-mcp',
              limits: {
                lineageDepth: 1,
                entityCount: 4,
                recentChangeCount: 4,
                toolCalls: 4,
                timeoutMs: 1_000,
              },
              executionBudget,
            },
          );
        } catch (error) {
          terminalError = error;
        }

        expect(terminalError).toMatchObject<InvestigationLimitError>({
          reason: 'duration_limit_reached',
          execution: {
            toolCalls: 2,
            lineageEntitiesVisited: 0,
            terminationReason: 'duration_limit_reached',
          },
        });
        const terminalBudget = executionBudget.snapshot('duration_limit_reached');
        const terminalCalls = [...state.toolCalls];
        await new Promise<void>((resolve) => setTimeout(resolve, 750));
        expect(state.firstSearchAborted).toBe(true);
        expect(state.lateSearchWriteAttempted).toBe(true);
        expect(state.toolCalls).toEqual(terminalCalls);
        expect(executionBudget.snapshot('duration_limit_reached')).toMatchObject({
          toolCalls: terminalBudget.toolCalls,
          lineageEntitiesVisited: terminalBudget.lineageEntitiesVisited,
          retries: terminalBudget.retries,
        });

        const lineage = await adapter.getLineageGraph({
          rootUrn,
          direction: 'upstream',
          depth: 1,
          maxNodes: 4,
        });
        expect(lineage.nodes[0]).toMatchObject({ urn: rootUrn, name: rootUrn });
      },
    );
  });
});
