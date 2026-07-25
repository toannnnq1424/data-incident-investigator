import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { FetchLike, Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  METADATA_LINEAGE_MAX_NODES,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResultSchema,
  MetadataLineageNodeSchema,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
  type EntityKind,
  type EntityRef,
  type MetadataEntitySearchResult,
  type MetadataLineageEdge,
  type MetadataLineageResponse,
  type MetadataRecentChangesRequest,
} from '@dii/shared-types';
import { z } from 'zod';
import {
  MetadataProviderError,
  type LineageResult,
  type MetadataAdapter,
  type MetadataChange,
  type MetadataEntitySearchOptions,
  type MetadataHealthCheckOptions,
  type MetadataHealthResult,
  type MetadataLineageOptions,
  type MetadataOperationOptions,
  type MetadataRecentChangesOptions,
} from './index.js';

const DATAHUB_MCP_ALLOWED_TOOLS = ['search', 'get_lineage'] as const;
const DATAHUB_MCP_TOOL_INPUTS = {
  search: {
    properties: {
      query: 'string',
      num_results: 'integer',
      offset: 'integer',
    },
  },
  get_lineage: {
    properties: {
      urn: 'string',
      upstream: 'boolean',
      max_hops: 'integer',
      max_results: 'integer',
      offset: 'integer',
    },
  },
} as const;
const DEFAULT_DATAHUB_MCP_TIMEOUT_MS = 5_000;
const MIN_DATAHUB_MCP_TIMEOUT_MS = 100;
const MAX_DATAHUB_MCP_TIMEOUT_MS = 30_000;
const DEFAULT_DATAHUB_MCP_MAX_RESPONSE_BYTES = 262_144;
const MIN_DATAHUB_MCP_MAX_RESPONSE_BYTES = 1_024;
const MAX_DATAHUB_MCP_MAX_RESPONSE_BYTES = 1_048_576;

const DataHubMcpAuthModeSchema = z.enum(['none', 'bearer']);

export type DataHubMcpAuthMode = z.infer<typeof DataHubMcpAuthModeSchema>;
export type DataHubMcpTransportFactory = () => Transport;

export interface DataHubMcpClientConfig {
  url: string | undefined;
  authMode: string | undefined;
  token?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  transportFactory?: DataHubMcpTransportFactory;
}

export class DataHubMcpConfigurationError extends Error {
  constructor(readonly variableName: string) {
    super(`Invalid DataHub MCP configuration: ${variableName}.`);
    this.name = 'DataHubMcpConfigurationError';
  }
}

interface ResolvedDataHubMcpConfig {
  url: URL;
  authMode: DataHubMcpAuthMode;
  token?: string;
  timeoutMs: number;
  maxResponseBytes: number;
  transportFactory?: DataHubMcpTransportFactory;
}

function configuredBoundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  variableName: string,
) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < minimum || resolved > maximum) {
    throw new DataHubMcpConfigurationError(variableName);
  }
  return resolved;
}

function resolveDataHubMcpConfig(config: DataHubMcpClientConfig): ResolvedDataHubMcpConfig {
  const rawUrl = config.url?.trim();
  if (!rawUrl) {
    throw new DataHubMcpConfigurationError('DATAHUB_MCP_URL');
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new DataHubMcpConfigurationError('DATAHUB_MCP_URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new DataHubMcpConfigurationError('DATAHUB_MCP_URL');
  }

  const parsedAuthMode = DataHubMcpAuthModeSchema.safeParse(config.authMode?.trim());
  if (!parsedAuthMode.success) {
    throw new DataHubMcpConfigurationError('DATAHUB_MCP_AUTH_MODE');
  }
  if (parsedAuthMode.data === 'bearer' && url.protocol !== 'https:') {
    throw new DataHubMcpConfigurationError('DATAHUB_MCP_URL');
  }
  const token = config.token?.trim();
  if (parsedAuthMode.data === 'bearer' && !token) {
    throw new DataHubMcpConfigurationError('DATAHUB_TOKEN');
  }
  if (parsedAuthMode.data === 'none' && token) {
    throw new DataHubMcpConfigurationError('DATAHUB_TOKEN');
  }

  return {
    url,
    authMode: parsedAuthMode.data,
    ...(token ? { token } : {}),
    timeoutMs: configuredBoundedInteger(
      config.timeoutMs,
      DEFAULT_DATAHUB_MCP_TIMEOUT_MS,
      MIN_DATAHUB_MCP_TIMEOUT_MS,
      MAX_DATAHUB_MCP_TIMEOUT_MS,
      'DATAHUB_MCP_TIMEOUT_MS',
    ),
    maxResponseBytes: configuredBoundedInteger(
      config.maxResponseBytes,
      DEFAULT_DATAHUB_MCP_MAX_RESPONSE_BYTES,
      MIN_DATAHUB_MCP_MAX_RESPONSE_BYTES,
      MAX_DATAHUB_MCP_MAX_RESPONSE_BYTES,
      'DATAHUB_MCP_MAX_RESPONSE_BYTES',
    ),
    ...(config.transportFactory ? { transportFactory: config.transportFactory } : {}),
  };
}

function environmentInteger(
  environment: NodeJS.ProcessEnv,
  variableName: string,
): number | undefined {
  const value = environment[variableName]?.trim();
  if (!value) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    throw new DataHubMcpConfigurationError(variableName);
  }
  return Number(value);
}

export function dataHubMcpConfigFromEnvironment(
  environment: NodeJS.ProcessEnv,
): DataHubMcpClientConfig {
  const timeoutMs = environmentInteger(environment, 'DATAHUB_MCP_TIMEOUT_MS');
  const maxResponseBytes = environmentInteger(environment, 'DATAHUB_MCP_MAX_RESPONSE_BYTES');
  return {
    url: environment.DATAHUB_MCP_URL,
    authMode: environment.DATAHUB_MCP_AUTH_MODE,
    ...(environment.DATAHUB_TOKEN ? { token: environment.DATAHUB_TOKEN } : {}),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }),
  };
}

const DataHubMcpEntitySchema = z
  .object({
    urn: z.string().trim().min(1).max(1_000),
    type: z.string().trim().min(1).max(100).optional(),
    name: z.string().max(300).nullish(),
    displayName: z.string().max(300).nullish(),
    description: z.string().max(1_000).nullish(),
    qualifiedName: z.string().max(500).nullish(),
    platform: z.string().max(200).nullish(),
    properties: z
      .object({
        name: z.string().max(300).nullish(),
        description: z.string().max(1_000).nullish(),
        qualifiedName: z.string().max(500).nullish(),
      })
      .passthrough()
      .nullish(),
    editableProperties: z
      .object({
        name: z.string().max(300).nullish(),
        description: z.string().max(1_000).nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

const DataHubMcpSearchResponseSchema = z
  .object({
    searchResults: z
      .array(
        z
          .object({
            entity: DataHubMcpEntitySchema,
          })
          .passthrough(),
      )
      .max(50),
  })
  .passthrough();

const DataHubMcpLineageDirectionSchema = z
  .object({
    searchResults: z
      .array(
        z
          .object({
            degree: z.number().int().min(1).max(100),
            entity: DataHubMcpEntitySchema,
          })
          .passthrough(),
      )
      .max(METADATA_LINEAGE_MAX_NODES),
    hasMore: z.boolean().optional(),
    returned: z.number().int().nonnegative().optional(),
    offset: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const DataHubMcpLineageResponseSchema = z
  .object({
    upstreams: DataHubMcpLineageDirectionSchema.optional(),
    downstreams: DataHubMcpLineageDirectionSchema.optional(),
  })
  .passthrough();

function entityKind(entity: z.infer<typeof DataHubMcpEntitySchema>): EntityKind | undefined {
  const urn = entity.urn.toLowerCase();
  if (urn.startsWith('urn:li:dataset:')) {
    return 'dataset';
  }
  if (urn.startsWith('urn:li:dashboard:')) {
    return 'dashboard';
  }
  if (urn.startsWith('urn:li:chart:')) {
    return 'chart';
  }
  if (
    urn.startsWith('urn:li:dataflow:') ||
    urn.startsWith('urn:li:datajob:') ||
    urn.startsWith('urn:li:pipeline:')
  ) {
    return 'pipeline';
  }

  const type = entity.type?.toUpperCase();
  if (type === 'DATASET') {
    return 'dataset';
  }
  if (type === 'DASHBOARD') {
    return 'dashboard';
  }
  if (type === 'CHART') {
    return 'chart';
  }
  if (type && ['DATA_FLOW', 'DATAFLOW', 'DATA_JOB', 'DATAJOB', 'PIPELINE'].includes(type)) {
    return 'pipeline';
  }
  return undefined;
}

function entityName(entity: z.infer<typeof DataHubMcpEntitySchema>) {
  return (
    entity.editableProperties?.name?.trim() ||
    entity.displayName?.trim() ||
    entity.properties?.name?.trim() ||
    entity.name?.trim() ||
    entity.urn
  );
}

function normalizeEntity(
  entity: z.infer<typeof DataHubMcpEntitySchema>,
): MetadataEntitySearchResult | undefined {
  const kind = entityKind(entity);
  if (!kind) {
    return undefined;
  }
  const description = entity.editableProperties?.description?.trim() || entity.description?.trim();
  const qualifiedName = entity.qualifiedName?.trim() || entity.properties?.qualifiedName?.trim();
  return MetadataEntitySearchResultSchema.parse({
    urn: entity.urn,
    kind,
    name: entityName(entity),
    ...(description ? { description } : {}),
    ...(qualifiedName ? { qualifiedName } : {}),
  });
}

function compareEntities(left: MetadataEntitySearchResult, right: MetadataEntitySearchResult) {
  const leftName = left.name.toLowerCase();
  const rightName = right.name.toLowerCase();
  if (leftName !== rightName) {
    return leftName < rightName ? -1 : 1;
  }
  if (left.kind !== right.kind) {
    return left.kind < right.kind ? -1 : 1;
  }
  return left.urn < right.urn ? -1 : left.urn > right.urn ? 1 : 0;
}

function serializedBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function invalidMcpResponse() {
  return new MetadataProviderError('invalid_response');
}

function declaredContentLengthWithinLimit(response: Response, maxResponseBytes: number) {
  const rawContentLength = response.headers.get('content-length');
  if (rawContentLength === null) {
    return true;
  }
  const normalized = rawContentLength.trim();
  return /^\d+$/u.test(normalized) && BigInt(normalized) <= BigInt(maxResponseBytes);
}

function boundedMcpFetch(maxResponseBytes: number, onResponseLimitExceeded: () => void): FetchLike {
  return async (url, init = {}) => {
    const requestController = new AbortController();
    const sourceSignal = init.signal;
    const abortFromSource = () => requestController.abort(sourceSignal?.reason);
    if (sourceSignal?.aborted) {
      abortFromSource();
    } else {
      sourceSignal?.addEventListener('abort', abortFromSource, { once: true });
    }

    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: requestController.signal });
    } catch (error) {
      sourceSignal?.removeEventListener('abort', abortFromSource);
      throw error;
    }

    if (!declaredContentLengthWithinLimit(response, maxResponseBytes)) {
      const failure = invalidMcpResponse();
      onResponseLimitExceeded();
      try {
        await response.body?.cancel(failure);
      } finally {
        requestController.abort(failure);
        sourceSignal?.removeEventListener('abort', abortFromSource);
      }
      throw failure;
    }
    if (!response.body) {
      sourceSignal?.removeEventListener('abort', abortFromSource);
      return response;
    }

    const reader = response.body.getReader();
    let receivedBytes = 0;
    let finished = false;
    const cleanup = () => {
      sourceSignal?.removeEventListener('abort', abortFromSource);
    };
    const cancel = async (reason?: unknown) => {
      if (finished) {
        return;
      }
      finished = true;
      try {
        await reader.cancel(reason);
      } finally {
        requestController.abort(reason);
        cleanup();
      }
    };
    const boundedBody = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            finished = true;
            cleanup();
            controller.close();
            return;
          }
          if (!value) {
            return;
          }
          const remainingBytes = maxResponseBytes - receivedBytes;
          if (value.byteLength > remainingBytes) {
            receivedBytes = maxResponseBytes + 1;
            const failure = invalidMcpResponse();
            onResponseLimitExceeded();
            await cancel(failure);
            controller.error(failure);
            return;
          }
          receivedBytes += value.byteLength;
          controller.enqueue(value);
        } catch (error) {
          finished = true;
          cleanup();
          controller.error(error);
        }
      },
      async cancel(reason) {
        await cancel(reason);
      },
    });
    return new Response(boundedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

function responsePayload(result: z.infer<typeof CallToolResultSchema>, maxResponseBytes: number) {
  if (serializedBytes(result) > maxResponseBytes) {
    throw new MetadataProviderError('invalid_response');
  }
  if (result.isError) {
    throw new MetadataProviderError('unavailable');
  }

  let payload: unknown = result.structuredContent;
  if (payload === undefined) {
    const textContent = result.content.filter(
      (item): item is Extract<(typeof result.content)[number], { type: 'text' }> =>
        item.type === 'text',
    );
    if (textContent.length !== 1 || textContent.length !== result.content.length) {
      throw new MetadataProviderError('invalid_response');
    }
    try {
      payload = JSON.parse(textContent[0]!.text) as unknown;
    } catch {
      throw new MetadataProviderError('invalid_response');
    }
  }
  return isRecord(payload) && Object.keys(payload).length === 1 && 'result' in payload
    ? payload.result
    : payload;
}

function providerFailure(error: unknown, aborted: boolean) {
  if (error instanceof MetadataProviderError) {
    return error;
  }
  if (aborted || (error instanceof Error && error.name === 'AbortError')) {
    return new MetadataProviderError('timeout');
  }
  if (
    isRecord(error) &&
    (error.code === 401 ||
      error.code === 403 ||
      error.status === 401 ||
      error.status === 403 ||
      error.name === 'UnauthorizedError')
  ) {
    return new MetadataProviderError('unauthorized');
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return new MetadataProviderError('invalid_response');
  }
  return new MetadataProviderError('unavailable');
}

function recentChangeWindow(request: MetadataRecentChangesRequest) {
  const endTime = request.endTime ?? new Date().toISOString();
  return {
    startTime: new Date(Date.parse(endTime) - request.windowHours * 60 * 60 * 1_000).toISOString(),
    endTime,
    hours: request.windowHours,
  };
}

export class DataHubMcpMetadataAdapter implements MetadataAdapter {
  private readonly config: ResolvedDataHubMcpConfig;
  private readonly entitiesByUrn = new Map<string, MetadataEntitySearchResult>();

  constructor(config: DataHubMcpClientConfig) {
    this.config = resolveDataHubMcpConfig(config);
  }

  private transport(responseBoundary: { exceeded: boolean }) {
    if (this.config.transportFactory) {
      return this.config.transportFactory();
    }
    const headers =
      this.config.authMode === 'bearer'
        ? { Authorization: `Bearer ${this.config.token!}` }
        : undefined;
    const transport = new StreamableHTTPClientTransport(this.config.url, {
      ...(headers ? { requestInit: { headers } } : {}),
      fetch: boundedMcpFetch(this.config.maxResponseBytes, () => {
        responseBoundary.exceeded = true;
        void transport.close().catch(() => undefined);
      }),
    });
    return transport as unknown as Transport;
  }

  private async withClient<T>(
    signal: AbortSignal | undefined,
    operation: (client: Client, signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const responseBoundary = { exceeded: false };
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const client = new Client(
      { name: 'data-incident-investigator', version: '1.0.0-rc.1' },
      { capabilities: {} },
    );
    try {
      if (signal?.aborted) {
        controller.abort();
      }
      await client.connect(this.transport(responseBoundary), {
        signal: controller.signal,
        timeout: this.config.timeoutMs,
      });
      const result = await operation(client, controller.signal);
      if (controller.signal.aborted) {
        throw new MetadataProviderError('timeout');
      }
      return result;
    } catch (error) {
      if (responseBoundary.exceeded) {
        throw invalidMcpResponse();
      }
      throw providerFailure(error, controller.signal.aborted);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      await client.close().catch(() => undefined);
    }
  }

  private async verifiedClientTools(client: Client, signal: AbortSignal) {
    const result = await client.request(
      { method: 'tools/list', params: {} },
      ListToolsResultSchema,
      {
        signal,
        timeout: this.config.timeoutMs,
      },
    );
    if (serializedBytes(result) > this.config.maxResponseBytes) {
      throw new MetadataProviderError('invalid_response');
    }
    for (const name of DATAHUB_MCP_ALLOWED_TOOLS) {
      const matchingTools = result.tools.filter((candidate) => candidate.name === name);
      const tool = matchingTools[0];
      const expectedInput = DATAHUB_MCP_TOOL_INPUTS[name];
      if (matchingTools.length !== 1 || !tool || tool.annotations?.readOnlyHint !== true) {
        throw new MetadataProviderError('invalid_response');
      }
      if (
        !isRecord(tool.inputSchema) ||
        tool.inputSchema.type !== 'object' ||
        !isRecord(tool.inputSchema.properties)
      ) {
        throw new MetadataProviderError('invalid_response');
      }
      const requiredProperties = tool.inputSchema.required;
      if (
        requiredProperties !== undefined &&
        (!Array.isArray(requiredProperties) ||
          !requiredProperties.every((property) => typeof property === 'string'))
      ) {
        throw new MetadataProviderError('invalid_response');
      }
      if (
        requiredProperties?.some((property) => !Object.hasOwn(expectedInput.properties, property))
      ) {
        throw new MetadataProviderError('invalid_response');
      }
      for (const [property, expectedType] of Object.entries(expectedInput.properties)) {
        const propertySchema = tool.inputSchema.properties[property];
        if (!isRecord(propertySchema) || propertySchema.type !== expectedType) {
          throw new MetadataProviderError('invalid_response');
        }
      }
    }
    return result.tools;
  }

  private async callAllowedTool(
    name: (typeof DATAHUB_MCP_ALLOWED_TOOLS)[number],
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ) {
    if (!DATAHUB_MCP_ALLOWED_TOOLS.includes(name)) {
      throw new MetadataProviderError('invalid_response');
    }
    return this.withClient(signal, async (client, boundedSignal) => {
      await this.verifiedClientTools(client, boundedSignal);
      const result = await client.request(
        { method: 'tools/call', params: { name, arguments: args } },
        CallToolResultSchema,
        { signal: boundedSignal, timeout: this.config.timeoutMs },
      );
      return responsePayload(result, this.config.maxResponseBytes);
    });
  }

  async healthCheck(options: MetadataHealthCheckOptions = {}): Promise<MetadataHealthResult> {
    try {
      await this.withClient(options.signal, async (client, signal) => {
        await this.verifiedClientTools(client, signal);
      });
      return {
        status: 'ready',
        message: 'DataHub MCP Server is ready.',
      };
    } catch (error) {
      const failure =
        error instanceof MetadataProviderError ? error : new MetadataProviderError('unavailable');
      return {
        status: failure.status === 'not_found' ? 'invalid_response' : failure.status,
        message:
          failure.status === 'unauthorized'
            ? 'DataHub MCP Server authorization failed. Check the configured access token.'
            : failure.status === 'timeout'
              ? 'DataHub MCP Server did not respond before the timeout.'
              : failure.status === 'invalid_response'
                ? 'DataHub MCP Server returned an unexpected response.'
                : 'DataHub MCP Server is unavailable. Check the service and network connection.',
      };
    }
  }

  async searchEntities(
    options: MetadataEntitySearchOptions,
  ): Promise<MetadataEntitySearchResult[]> {
    const { signal, fallbackToDefault: _fallbackToDefault, ...input } = options;
    const request = MetadataEntitySearchRequestSchema.parse(input);
    void _fallbackToDefault;
    try {
      const payload = await this.callAllowedTool(
        'search',
        {
          query: request.query,
          num_results: request.limit,
          offset: 0,
        },
        signal,
      );
      if (signal?.aborted) {
        throw new MetadataProviderError('timeout');
      }
      const response = DataHubMcpSearchResponseSchema.parse(payload);
      const entities = response.searchResults
        .map(({ entity }) => normalizeEntity(entity))
        .filter((entity): entity is MetadataEntitySearchResult => entity !== undefined)
        .filter((entity) => !request.entityType || entity.kind === request.entityType)
        .sort(compareEntities)
        .slice(0, request.limit);
      const unique = [...new Map(entities.map((entity) => [entity.urn, entity] as const)).values()];
      if (signal?.aborted) {
        throw new MetadataProviderError('timeout');
      }
      unique.forEach((entity) => this.entitiesByUrn.set(entity.urn, entity));
      return unique;
    } catch (error) {
      throw providerFailure(error, signal?.aborted === true);
    }
  }

  async getLineageGraph(options: MetadataLineageOptions): Promise<MetadataLineageResponse> {
    const { signal, ...input } = options;
    const request = MetadataLineageRequestSchema.parse(input);
    try {
      const payload = await this.callAllowedTool(
        'get_lineage',
        {
          urn: request.rootUrn,
          upstream: request.direction === 'upstream',
          max_hops: request.depth,
          max_results: Math.max(1, request.maxNodes - 1),
          offset: 0,
        },
        signal,
      );
      if (signal?.aborted) {
        throw new MetadataProviderError('timeout');
      }
      const response = DataHubMcpLineageResponseSchema.parse(payload);
      const directionResult =
        request.direction === 'upstream' ? response.upstreams : response.downstreams;
      if (!directionResult) {
        throw new MetadataProviderError('invalid_response');
      }
      if (
        directionResult.returned !== undefined &&
        directionResult.returned !== directionResult.searchResults.length
      ) {
        throw new MetadataProviderError('invalid_response');
      }

      const root =
        this.entitiesByUrn.get(request.rootUrn) ??
        normalizeEntity(
          DataHubMcpEntitySchema.parse({
            urn: request.rootUrn,
            name: request.rootUrn,
          }),
        );
      if (!root) {
        throw new MetadataProviderError('invalid_response');
      }
      const rootNode = MetadataLineageNodeSchema.parse({ ...root, depth: 0 });
      const rawCandidates = directionResult.searchResults
        .map(({ degree, entity }) => {
          const normalized = normalizeEntity(entity);
          return normalized ? { degree, entity: normalized } : undefined;
        })
        .filter(
          (
            candidate,
          ): candidate is {
            degree: number;
            entity: MetadataEntitySearchResult;
          } => candidate !== undefined && candidate.degree <= request.depth,
        );
      const candidates = [
        ...rawCandidates.reduce((byUrn, candidate) => {
          const existing = byUrn.get(candidate.entity.urn);
          if (!existing || candidate.degree < existing.degree) {
            byUrn.set(candidate.entity.urn, candidate);
          }
          return byUrn;
        }, new Map<string, (typeof rawCandidates)[number]>()),
      ]
        .map(([, candidate]) => candidate)
        .sort(
          (left, right) => left.degree - right.degree || compareEntities(left.entity, right.entity),
        )
        .slice(0, Math.max(0, request.maxNodes - 1));
      const nodes = [
        rootNode,
        ...candidates.map(({ degree, entity }) =>
          MetadataLineageNodeSchema.parse({ ...entity, depth: degree }),
        ),
      ];
      const uniqueNodes = [
        ...new Map(nodes.map((node) => [node.urn, node] as const)).values(),
      ].sort((left, right) => {
        if (left.depth !== right.depth) {
          return left.depth - right.depth;
        }
        return compareEntities(left, right);
      });
      const directCandidates = candidates.filter(({ degree }) => degree === 1);
      const edges: MetadataLineageEdge[] = directCandidates
        .map(({ entity }) =>
          request.direction === 'upstream'
            ? { sourceUrn: entity.urn, targetUrn: request.rootUrn }
            : { sourceUrn: request.rootUrn, targetUrn: entity.urn },
        )
        .sort((left, right) =>
          left.sourceUrn === right.sourceUrn
            ? left.targetUrn.localeCompare(right.targetUrn)
            : left.sourceUrn.localeCompare(right.sourceUrn),
        );
      if (signal?.aborted) {
        throw new MetadataProviderError('timeout');
      }
      uniqueNodes.forEach((node) =>
        this.entitiesByUrn.set(node.urn, {
          urn: node.urn,
          kind: node.kind,
          name: node.name,
          ...(node.description ? { description: node.description } : {}),
        }),
      );
      return MetadataLineageResponseSchema.parse({
        rootUrn: request.rootUrn,
        direction: request.direction,
        requestedDepth: request.depth,
        maxNodes: request.maxNodes,
        visitedNodeCount: uniqueNodes.length,
        truncated:
          directionResult.hasMore === true ||
          directionResult.searchResults.length > candidates.length ||
          candidates.some(({ degree }) => degree > 1),
        nodes: uniqueNodes,
        edges,
      });
    } catch (error) {
      throw providerFailure(error, signal?.aborted === true);
    }
  }

  async getRecentChangesForEntity(
    options: MetadataRecentChangesOptions,
  ): Promise<z.infer<typeof MetadataRecentChangesResponseSchema>> {
    const { signal, ...input } = options;
    const request = MetadataRecentChangesRequestSchema.parse(input);
    if (signal?.aborted) {
      throw new MetadataProviderError('timeout');
    }
    return MetadataRecentChangesResponseSchema.parse({
      entityUrn: request.entityUrn,
      window: recentChangeWindow(request),
      limit: request.limit,
      returnedCount: 0,
      truncated: false,
      capability: 'unsupported',
      changes: [],
    });
  }

  async getLineage(
    entity: EntityRef,
    depth: number,
    entityLimit: number,
    options: MetadataOperationOptions = {},
  ): Promise<LineageResult> {
    if (depth <= 0 || entityLimit <= 0) {
      return { seed: entity, upstream: [], downstream: [], truncated: false };
    }
    if (options.signal?.aborted) {
      throw new MetadataProviderError('timeout');
    }
    this.entitiesByUrn.set(entity.urn, MetadataEntitySearchResultSchema.parse(entity));
    const graph = await this.getLineageGraph({
      rootUrn: entity.urn,
      direction: 'upstream',
      depth,
      maxNodes: Math.min(METADATA_LINEAGE_MAX_NODES, entityLimit + 1),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return {
      seed: entity,
      upstream: graph.nodes
        .filter((node) => node.urn !== entity.urn)
        .map(({ urn, name, kind }) => ({ urn, name, kind })),
      downstream: [],
      truncated: graph.truncated,
    };
  }

  async getRecentChanges(
    entities: EntityRef[],
    since: string,
    changeLimit: number,
    options: MetadataOperationOptions = {},
  ): Promise<MetadataChange[]> {
    void entities;
    void since;
    void changeLimit;
    if (options.signal?.aborted) {
      throw new MetadataProviderError('timeout');
    }
    return [];
  }
}

export function createDataHubMcpMetadataAdapter(config: DataHubMcpClientConfig) {
  return new DataHubMcpMetadataAdapter(config);
}
