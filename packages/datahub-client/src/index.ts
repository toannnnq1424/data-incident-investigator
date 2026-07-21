import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  METADATA_LINEAGE_MAX_EDGES,
  METADATA_LINEAGE_MAX_NODES,
  MetadataEntitySearchResultSchema,
  MetadataLineageNodeSchema,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangeCategorySchema,
  MetadataRecentChangeOperationSchema,
  MetadataRecentChangeSchema,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
  sanitizeUntrustedDisplayText,
  type EntityKind,
  type EntityRef,
  type MetadataEntitySearchRequest,
  type MetadataEntitySearchResult,
  type MetadataHealthStatus,
  type MetadataLineageDirection,
  type MetadataLineageEdge,
  type MetadataLineageNode,
  type MetadataLineageRequest,
  type MetadataLineageResponse,
  type MetadataRecentChange,
  type MetadataRecentChangeCategory,
  type MetadataRecentChangesRequest,
  type MetadataRecentChangesResponse,
} from '@dii/shared-types';
import { z } from 'zod';

export interface MetadataHealthResult {
  status: MetadataHealthStatus;
  message: string;
}

export interface MetadataHealthCheckOptions {
  signal?: AbortSignal;
}

export interface MetadataHealthProvider {
  healthCheck(options?: MetadataHealthCheckOptions): Promise<MetadataHealthResult>;
}

export interface MetadataEntitySearchOptions extends MetadataEntitySearchRequest {
  signal?: AbortSignal;
  fallbackToDefault?: boolean;
}

export interface MetadataSearchProvider {
  searchEntities(options: MetadataEntitySearchOptions): Promise<MetadataEntitySearchResult[]>;
}

export interface MetadataLineageOptions extends MetadataLineageRequest {
  signal?: AbortSignal;
}

export interface MetadataLineageProvider {
  getLineageGraph(options: MetadataLineageOptions): Promise<MetadataLineageResponse>;
}

export interface MetadataRecentChangesOptions extends MetadataRecentChangesRequest {
  signal?: AbortSignal;
}

export interface MetadataRecentChangesProvider {
  getRecentChangesForEntity(
    options: MetadataRecentChangesOptions,
  ): Promise<MetadataRecentChangesResponse>;
}

export interface MetadataChange {
  id: string;
  entity: EntityRef;
  category: MetadataRecentChangeCategory;
  observedAt: string;
  summary: string;
}

export interface LineageResult {
  seed: EntityRef;
  upstream: EntityRef[];
  downstream: EntityRef[];
  truncated: boolean;
}

export interface MetadataAdapter
  extends
    MetadataHealthProvider,
    MetadataSearchProvider,
    MetadataLineageProvider,
    MetadataRecentChangesProvider {
  getLineage(entity: EntityRef, depth: number, entityLimit: number): Promise<LineageResult>;
  getRecentChanges(
    entities: EntityRef[],
    since: string,
    changeLimit: number,
  ): Promise<MetadataChange[]>;
}

const FixtureMetadataSchema = z
  .object({
    scenarioId: z.string().min(1),
    snapshotAt: z.iso.datetime(),
    defaultSeedUrn: z.string().min(1),
    entities: z.array(MetadataEntitySearchResultSchema).min(1).max(10),
    lineage: z
      .array(
        z.object({
          upstreamUrn: z.string().min(1),
          downstreamUrn: z.string().min(1),
        }),
      )
      .max(20),
    changes: z
      .array(
        z.object({
          id: z.string().min(1),
          entityUrn: z.string().min(1),
          category: MetadataRecentChangeCategorySchema,
          operation: MetadataRecentChangeOperationSchema,
          observedAt: z.iso.datetime(),
          summary: z
            .string()
            .transform(sanitizeUntrustedDisplayText)
            .pipe(z.string().min(1).max(500)),
          actor: z
            .string()
            .transform(sanitizeUntrustedDisplayText)
            .pipe(z.string().min(1).max(100))
            .optional(),
          field: z
            .string()
            .transform(sanitizeUntrustedDisplayText)
            .pipe(z.string().min(1).max(300))
            .optional(),
        }),
      )
      .max(20),
  })
  .superRefine((fixture, context) => {
    const entityUrns = new Set(fixture.entities.map((entity) => entity.urn));
    const referencedUrns = [
      fixture.defaultSeedUrn,
      ...fixture.lineage.flatMap((edge) => [edge.upstreamUrn, edge.downstreamUrn]),
      ...fixture.changes.map((change) => change.entityUrn),
    ];

    referencedUrns.forEach((urn) => {
      if (!entityUrns.has(urn)) {
        context.addIssue({
          code: 'custom',
          message: `Fixture references an unknown entity: ${urn}`,
        });
      }
    });
  });

type FixtureMetadata = z.infer<typeof FixtureMetadataSchema>;

const metadataHealthMessages: Record<MetadataHealthStatus, string> = {
  ready: 'DataHub metadata is ready.',
  unconfigured: 'DataHub metadata is not configured. Set DATAHUB_GMS_URL and DATAHUB_TOKEN.',
  unauthorized: 'DataHub rejected the configured credentials. Check the access token.',
  unavailable: 'DataHub metadata is unavailable. Check the service and network connection.',
  timeout: 'DataHub metadata did not respond in time. Check the service and try again.',
  invalid_response: 'DataHub returned an unexpected response. Check the configured GMS endpoint.',
};

const defaultDataHubHealthTimeoutMs = 2_000;
const minimumDataHubHealthTimeoutMs = 10;
const maximumDataHubHealthTimeoutMs = 10_000;

type MetadataProviderFailureStatus = Exclude<MetadataHealthStatus, 'ready'> | 'not_found';

const metadataProviderFailureMessages: Record<MetadataProviderFailureStatus, string> = {
  unconfigured: metadataHealthMessages.unconfigured,
  unauthorized: metadataHealthMessages.unauthorized,
  unavailable: metadataHealthMessages.unavailable,
  timeout: metadataHealthMessages.timeout,
  invalid_response: metadataHealthMessages.invalid_response,
  not_found: 'The requested metadata entity was not found.',
};

export class MetadataProviderError extends Error {
  readonly status: MetadataProviderFailureStatus;

  constructor(status: MetadataProviderFailureStatus) {
    super(metadataProviderFailureMessages[status]);
    this.name = 'MetadataProviderError';
    this.status = status;
  }
}

function metadataHealthResult(status: MetadataHealthStatus): MetadataHealthResult {
  return { status, message: metadataHealthMessages[status] };
}

function fixtureHealthResult(): MetadataHealthResult {
  return { status: 'ready', message: 'Fixture metadata is ready.' };
}

function boundedHealthTimeout(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return defaultDataHubHealthTimeoutMs;
  }

  return Math.min(
    maximumDataHubHealthTimeoutMs,
    Math.max(minimumDataHubHealthTimeoutMs, Math.floor(value)),
  );
}

function dataHubConfigUrl(value: string | undefined): URL | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }

    url.pathname = `${url.pathname.replace(/\/+$/, '')}/config`;
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return undefined;
  }
}

function dataHubGraphqlUrl(value: string | undefined): URL | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }

    const basePath = url.pathname.replace(/\/+$/, '');
    if (/\/api\/graphql$/i.test(basePath)) {
      url.pathname = basePath;
    } else if (/\/api\/gms$/i.test(basePath)) {
      url.pathname = basePath.replace(/\/gms$/i, '/graphql');
    } else {
      url.pathname = `${basePath}/api/graphql`;
    }
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return undefined;
  }
}

function isJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type')?.toLowerCase();
  return contentType?.includes('application/json') || contentType?.includes('+json') || false;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface DataHubHealthClientConfig {
  gmsUrl: string | undefined;
  token: string | undefined;
  timeoutMs?: number;
}

export class DataHubHealthClient implements MetadataHealthProvider {
  private readonly configUrl: URL | undefined;
  private readonly timeoutMs: number;
  private readonly token: string | undefined;

  constructor(config: DataHubHealthClientConfig) {
    this.configUrl = dataHubConfigUrl(config.gmsUrl);
    this.timeoutMs = boundedHealthTimeout(config.timeoutMs);
    this.token = config.token?.trim() || undefined;
  }

  async healthCheck(options: MetadataHealthCheckOptions = {}): Promise<MetadataHealthResult> {
    if (!this.configUrl || !this.token) {
      return metadataHealthResult('unconfigured');
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    const timeout = setTimeout(abort, this.timeoutMs);

    if (options.signal?.aborted) {
      controller.abort();
    } else {
      options.signal?.addEventListener('abort', abort, { once: true });
    }

    try {
      const response = await fetch(this.configUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.token}`,
        },
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        return metadataHealthResult('unauthorized');
      }
      if (response.status !== 200) {
        return response.ok
          ? metadataHealthResult('invalid_response')
          : metadataHealthResult('unavailable');
      }
      if (!isJsonResponse(response)) {
        return metadataHealthResult('invalid_response');
      }

      try {
        const body: unknown = await response.json();
        return isJsonObject(body)
          ? metadataHealthResult('ready')
          : metadataHealthResult('invalid_response');
      } catch {
        return metadataHealthResult('invalid_response');
      }
    } catch {
      return controller.signal.aborted
        ? metadataHealthResult('timeout')
        : metadataHealthResult('unavailable');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
    }
  }
}

const DataHubSearchEntitySchema = z.object({
  urn: z.string().min(1).max(2_000),
  type: z.enum(['DATASET', 'DASHBOARD', 'CHART', 'DATA_FLOW', 'DATA_JOB']),
  name: z.string().nullish(),
  properties: z
    .object({
      name: z.string().nullish(),
      description: z.string().nullish(),
      qualifiedName: z.string().nullish(),
    })
    .nullish(),
  editableProperties: z
    .object({
      name: z.string().nullish(),
      description: z.string().nullish(),
    })
    .nullish(),
});

const DataHubSearchResponseSchema = z.object({
  data: z
    .object({
      searchAcrossEntities: z.object({
        searchResults: z.array(z.object({ entity: DataHubSearchEntitySchema })).max(100),
      }),
    })
    .nullish(),
  errors: z.array(z.unknown()).optional(),
});

const dataHubSearchQuery = `
  query MetadataEntitySearch($input: SearchAcrossEntitiesInput!) {
    searchAcrossEntities(input: $input) {
      searchResults {
        entity {
          urn
          type
          ... on Dataset {
            name
            properties { name description qualifiedName }
            editableProperties { name description }
          }
          ... on Dashboard {
            properties { name description }
            editableProperties { description }
          }
          ... on Chart {
            properties { name description }
            editableProperties { description }
          }
          ... on DataFlow {
            properties { name description }
            editableProperties { description }
          }
          ... on DataJob {
            properties { name description }
            editableProperties { description }
          }
        }
      }
    }
  }
`;

const dataHubTypesByEntityKind: Record<EntityKind, string[]> = {
  dataset: ['DATASET'],
  dashboard: ['DASHBOARD'],
  chart: ['CHART'],
  pipeline: ['DATA_FLOW', 'DATA_JOB'],
};

const dataHubEntityKind = {
  DATASET: 'dataset',
  DASHBOARD: 'dashboard',
  CHART: 'chart',
  DATA_FLOW: 'pipeline',
  DATA_JOB: 'pipeline',
} as const satisfies Record<z.infer<typeof DataHubSearchEntitySchema>['type'], EntityKind>;

function safeProviderText(values: Array<string | null | undefined>, maximumLength: number) {
  const value = values.find((candidate) => candidate?.trim());
  if (!value) {
    return undefined;
  }
  return sanitizeUntrustedDisplayText(value).slice(0, maximumLength) || undefined;
}

function compareEntitySearchResults(
  left: MetadataEntitySearchResult,
  right: MetadataEntitySearchResult,
) {
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

function normalizeSearchResults(
  results: MetadataEntitySearchResult[],
  limit: number,
): MetadataEntitySearchResult[] {
  const unique = new Map<string, MetadataEntitySearchResult>();
  results.forEach((result) => {
    const parsed = MetadataEntitySearchResultSchema.parse(result);
    if (!unique.has(parsed.urn)) {
      unique.set(parsed.urn, parsed);
    }
  });
  return [...unique.values()].sort(compareEntitySearchResults).slice(0, boundedInteger(limit));
}

function normalizeDataHubSearchEntity(
  entity: z.infer<typeof DataHubSearchEntitySchema>,
): MetadataEntitySearchResult {
  const urn = entity.urn.trim();
  const name =
    safeProviderText(
      [
        entity.editableProperties?.name,
        entity.properties?.name,
        entity.name,
        entity.properties?.qualifiedName,
        urn,
      ],
      300,
    ) ?? urn;
  const description = safeProviderText(
    [entity.editableProperties?.description, entity.properties?.description],
    1_000,
  );
  const qualifiedName = safeProviderText([entity.properties?.qualifiedName], 500);

  return MetadataEntitySearchResultSchema.parse({
    urn,
    kind: dataHubEntityKind[entity.type],
    name,
    ...(description ? { description } : {}),
    ...(qualifiedName ? { qualifiedName } : {}),
  });
}

export type DataHubSearchClientConfig = DataHubHealthClientConfig;

export class DataHubSearchClient implements MetadataSearchProvider {
  private readonly graphqlUrl: URL | undefined;
  private readonly timeoutMs: number;
  private readonly token: string | undefined;

  constructor(config: DataHubSearchClientConfig) {
    this.graphqlUrl = dataHubGraphqlUrl(config.gmsUrl);
    this.timeoutMs = boundedHealthTimeout(config.timeoutMs);
    this.token = config.token?.trim() || undefined;
  }

  async searchEntities(
    options: MetadataEntitySearchOptions,
  ): Promise<MetadataEntitySearchResult[]> {
    if (!this.graphqlUrl || !this.token) {
      throw new MetadataProviderError('unconfigured');
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    const timeout = setTimeout(abort, this.timeoutMs);
    if (options.signal?.aborted) {
      controller.abort();
    } else {
      options.signal?.addEventListener('abort', abort, { once: true });
    }

    const requestedTypes = options.entityType
      ? dataHubTypesByEntityKind[options.entityType]
      : Object.values(dataHubTypesByEntityKind).flat();

    try {
      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: dataHubSearchQuery,
          variables: {
            input: {
              types: requestedTypes,
              query: options.query.trim(),
              start: 0,
              count: boundedInteger(options.limit),
            },
          },
        }),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new MetadataProviderError('unauthorized');
      }
      if (!response.ok) {
        throw new MetadataProviderError('unavailable');
      }
      if (response.status !== 200 || !isJsonResponse(response)) {
        throw new MetadataProviderError('invalid_response');
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new MetadataProviderError('invalid_response');
      }
      const parsedBody = DataHubSearchResponseSchema.safeParse(body);
      if (
        !parsedBody.success ||
        !parsedBody.data.data ||
        (parsedBody.data.errors?.length ?? 0) > 0
      ) {
        throw new MetadataProviderError('invalid_response');
      }

      try {
        return normalizeSearchResults(
          parsedBody.data.data.searchAcrossEntities.searchResults.map(({ entity }) =>
            normalizeDataHubSearchEntity(entity),
          ),
          options.limit,
        );
      } catch {
        throw new MetadataProviderError('invalid_response');
      }
    } catch (error) {
      if (error instanceof MetadataProviderError) {
        throw error;
      }
      throw new MetadataProviderError(controller.signal.aborted ? 'timeout' : 'unavailable');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
    }
  }
}

const dataHubLineageResultLimit = METADATA_LINEAGE_MAX_NODES + 1;
const dataHubLineageRequestLimit = METADATA_LINEAGE_MAX_NODES;

const DataHubLineageResponseSchema = z.object({
  data: z
    .object({
      root: DataHubSearchEntitySchema.nullish(),
      searchAcrossLineage: z.object({
        total: z.number().int().nonnegative(),
        searchResults: z
          .array(
            z.object({
              degree: z.number().int().min(1),
              entity: DataHubSearchEntitySchema,
            }),
          )
          .max(dataHubLineageResultLimit),
      }),
    })
    .nullish(),
  errors: z.array(z.unknown()).optional(),
});

const dataHubLineageQuery = `
  query MetadataBoundedLineage($urn: String!, $input: SearchAcrossLineageInput!) {
    root: entity(urn: $urn) {
      urn
      type
      ... on Dataset {
        name
        properties { name description qualifiedName }
        editableProperties { name description }
      }
      ... on Dashboard {
        properties { name description }
        editableProperties { description }
      }
      ... on Chart {
        properties { name description }
        editableProperties { description }
      }
      ... on DataFlow {
        properties { name description }
        editableProperties { description }
      }
      ... on DataJob {
        properties { name description }
        editableProperties { description }
      }
    }
    searchAcrossLineage(input: $input) {
      total
      searchResults {
        degree
        entity {
          urn
          type
          ... on Dataset {
            name
            properties { name description qualifiedName }
            editableProperties { name description }
          }
          ... on Dashboard {
            properties { name description }
            editableProperties { description }
          }
          ... on Chart {
            properties { name description }
            editableProperties { description }
          }
          ... on DataFlow {
            properties { name description }
            editableProperties { description }
          }
          ... on DataJob {
            properties { name description }
            editableProperties { description }
          }
        }
      }
    }
  }
`;

function compareLineageNodes(left: MetadataLineageNode, right: MetadataLineageNode) {
  if (left.depth !== right.depth) {
    return left.depth - right.depth;
  }
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

function compareLineageEdges(left: MetadataLineageEdge, right: MetadataLineageEdge) {
  if (left.sourceUrn !== right.sourceUrn) {
    return left.sourceUrn < right.sourceUrn ? -1 : 1;
  }
  return left.targetUrn < right.targetUrn ? -1 : left.targetUrn > right.targetUrn ? 1 : 0;
}

function normalizedLineageResponse(
  request: MetadataLineageRequest,
  nodesByUrn: Map<string, MetadataLineageNode>,
  edgesByKey: Map<string, MetadataLineageEdge>,
  truncated: boolean,
) {
  const nodes = [...nodesByUrn.values()].sort(compareLineageNodes);
  const edges = [...edgesByKey.values()].sort(compareLineageEdges);
  return MetadataLineageResponseSchema.parse({
    rootUrn: request.rootUrn,
    direction: request.direction,
    requestedDepth: request.depth,
    maxNodes: request.maxNodes,
    visitedNodeCount: nodes.length,
    truncated,
    nodes,
    edges,
  });
}

function addLineageEdge(edgesByKey: Map<string, MetadataLineageEdge>, edge: MetadataLineageEdge) {
  const key = `${edge.sourceUrn}\u0000${edge.targetUrn}`;
  if (edgesByKey.has(key)) {
    return true;
  }
  if (edgesByKey.size >= METADATA_LINEAGE_MAX_EDGES) {
    return false;
  }
  edgesByKey.set(key, edge);
  return true;
}

function normalizeDataHubLineageNode(
  entity: z.infer<typeof DataHubSearchEntitySchema>,
  depth: number,
) {
  const normalized = normalizeDataHubSearchEntity(entity);
  return MetadataLineageNodeSchema.parse({
    urn: normalized.urn,
    kind: normalized.kind,
    name: normalized.name,
    depth,
    ...(normalized.description ? { description: normalized.description } : {}),
  });
}

interface DataHubOneHopLineage {
  root: z.infer<typeof DataHubSearchEntitySchema> | null | undefined;
  adjacent: Array<z.infer<typeof DataHubSearchEntitySchema>>;
  hasMore: boolean;
}

export type DataHubLineageClientConfig = DataHubHealthClientConfig;

export class DataHubLineageClient implements MetadataLineageProvider {
  private readonly graphqlUrl: URL | undefined;
  private readonly timeoutMs: number;
  private readonly token: string | undefined;

  constructor(config: DataHubLineageClientConfig) {
    this.graphqlUrl = dataHubGraphqlUrl(config.gmsUrl);
    this.timeoutMs = boundedHealthTimeout(config.timeoutMs);
    this.token = config.token?.trim() || undefined;
  }

  async getLineageGraph(options: MetadataLineageOptions): Promise<MetadataLineageResponse> {
    if (!this.graphqlUrl || !this.token) {
      throw new MetadataProviderError('unconfigured');
    }

    const { signal, ...input } = options;
    const request = MetadataLineageRequestSchema.parse(input);
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timeout = setTimeout(abort, this.timeoutMs);
    if (signal?.aborted) {
      controller.abort();
    } else {
      signal?.addEventListener('abort', abort, { once: true });
    }

    const nodesByUrn = new Map<string, MetadataLineageNode>();
    const edgesByKey = new Map<string, MetadataLineageEdge>();
    const visited = new Set([request.rootUrn]);
    const frontier: Array<{ urn: string; depth: number }> = [{ urn: request.rootUrn, depth: 0 }];
    let requestCount = 0;
    let truncated = false;

    try {
      while (frontier.length > 0) {
        if (requestCount >= dataHubLineageRequestLimit) {
          truncated = true;
          break;
        }

        const current = frontier.shift();
        if (!current) {
          break;
        }
        const oneHop = await this.requestOneHop(current.urn, request.direction, controller.signal);
        requestCount += 1;

        if (!oneHop.root || oneHop.root.urn.trim() !== current.urn) {
          throw new MetadataProviderError(current.depth === 0 ? 'not_found' : 'invalid_response');
        }
        if (current.depth === 0) {
          nodesByUrn.set(current.urn, normalizeDataHubLineageNode(oneHop.root, 0));
        }
        if (oneHop.hasMore) {
          truncated = true;
        }

        const adjacentByUrn = new Map<string, z.infer<typeof DataHubSearchEntitySchema>>();
        for (const entity of oneHop.adjacent) {
          const urn = entity.urn.trim();
          if (!adjacentByUrn.has(urn)) {
            adjacentByUrn.set(urn, entity);
          }
        }
        const adjacent = [...adjacentByUrn.values()].sort((left, right) =>
          left.urn.localeCompare(right.urn),
        );

        for (const entity of adjacent) {
          const adjacentUrn = entity.urn.trim();
          if (!visited.has(adjacentUrn)) {
            if (current.depth >= request.depth || nodesByUrn.size >= request.maxNodes) {
              truncated = true;
              continue;
            }
            const nextDepth = current.depth + 1;
            visited.add(adjacentUrn);
            nodesByUrn.set(adjacentUrn, normalizeDataHubLineageNode(entity, nextDepth));
            frontier.push({ urn: adjacentUrn, depth: nextDepth });
          }

          if (nodesByUrn.has(adjacentUrn)) {
            const edge =
              request.direction === 'upstream'
                ? { sourceUrn: adjacentUrn, targetUrn: current.urn }
                : { sourceUrn: current.urn, targetUrn: adjacentUrn };
            if (!addLineageEdge(edgesByKey, edge)) {
              truncated = true;
            }
          }
        }
      }

      return normalizedLineageResponse(request, nodesByUrn, edgesByKey, truncated);
    } catch (error) {
      if (error instanceof MetadataProviderError) {
        throw error;
      }
      throw new MetadataProviderError(controller.signal.aborted ? 'timeout' : 'unavailable');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  private async requestOneHop(
    urn: string,
    direction: MetadataLineageDirection,
    signal: AbortSignal,
  ): Promise<DataHubOneHopLineage> {
    const response = await fetch(this.graphqlUrl!, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: dataHubLineageQuery,
        variables: {
          urn,
          input: {
            urn,
            query: '*',
            start: 0,
            count: dataHubLineageResultLimit,
            direction: direction.toUpperCase(),
            orFilters: [{ and: [{ field: 'degree', values: ['1'] }] }],
          },
        },
      }),
      signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new MetadataProviderError('unauthorized');
    }
    if (!response.ok) {
      throw new MetadataProviderError('unavailable');
    }
    if (response.status !== 200 || !isJsonResponse(response)) {
      throw new MetadataProviderError('invalid_response');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new MetadataProviderError('invalid_response');
    }
    const parsedBody = DataHubLineageResponseSchema.safeParse(body);
    if (!parsedBody.success || !parsedBody.data.data || (parsedBody.data.errors?.length ?? 0) > 0) {
      throw new MetadataProviderError('invalid_response');
    }

    const lineage = parsedBody.data.data.searchAcrossLineage;
    if (lineage.searchResults.some((result) => result.degree !== 1)) {
      throw new MetadataProviderError('invalid_response');
    }
    return {
      root: parsedBody.data.data.root,
      adjacent: lineage.searchResults.map((result) => result.entity),
      hasMore: lineage.total > lineage.searchResults.length,
    };
  }
}

const dataHubTimelineTransactionLimit = 100;

const DataHubTimelineCategorySchema = z.enum([
  'DOCUMENTATION',
  'GLOSSARY_TERM',
  'OWNERSHIP',
  'TECHNICAL_SCHEMA',
  'TAG',
  'PARENT',
  'RELATED_ENTITIES',
  'DOMAIN',
  'STRUCTURED_PROPERTY',
  'APPLICATION',
  'ASSET_MEMBERSHIP',
]);

const DataHubTimelineOperationSchema = z.enum(['ADD', 'MODIFY', 'REMOVE']);

const DataHubTimelineResponseSchema = z.object({
  data: z
    .object({
      root: z.object({ urn: z.string().min(1).max(2_000) }).nullish(),
      getTimeline: z
        .object({
          changeTransactions: z
            .array(
              z.object({
                timestampMillis: z.number().int().min(0).max(8_640_000_000_000_000),
                lastSemanticVersion: z.string().max(200),
                versionStamp: z.string().max(500),
                changeType: DataHubTimelineOperationSchema,
                actor: z.string().max(2_000).nullish(),
                changes: z
                  .array(
                    z.object({
                      urn: z.string().min(1).max(2_000),
                      category: DataHubTimelineCategorySchema,
                      operation: DataHubTimelineOperationSchema,
                      modifier: z.string().max(2_000).nullish(),
                      parameters: z
                        .array(
                          z.object({
                            key: z.string().max(200).nullish(),
                            value: z.string().max(2_000).nullish(),
                          }),
                        )
                        .max(100)
                        .nullish(),
                      auditStamp: z
                        .object({
                          actor: z.string().max(2_000).nullish(),
                          time: z.number().int().min(0).max(8_640_000_000_000_000),
                        })
                        .nullish(),
                      description: z.string().max(10_000).nullish(),
                    }),
                  )
                  .max(100),
              }),
            )
            .max(dataHubTimelineTransactionLimit),
        })
        .nullish(),
    })
    .nullish(),
  errors: z.array(z.unknown()).optional(),
});

const dataHubRecentChangesQuery = `
  query MetadataRecentChanges($urn: String!, $input: GetTimelineInput!) {
    root: entity(urn: $urn) { urn }
    getTimeline(input: $input) {
      changeTransactions {
        timestampMillis
        lastSemanticVersion
        versionStamp
        changeType
        actor
        changes {
          urn
          category
          operation
          modifier
          parameters { key value }
          auditStamp { actor time }
          description
        }
      }
    }
  }
`;

const recentChangeCategoryByDataHubCategory = {
  DOCUMENTATION: 'documentation',
  GLOSSARY_TERM: 'glossary',
  OWNERSHIP: 'ownership',
  TECHNICAL_SCHEMA: 'schema',
  TAG: 'tag',
  PARENT: 'relationship',
  RELATED_ENTITIES: 'relationship',
  DOMAIN: 'domain',
  STRUCTURED_PROPERTY: 'structured-property',
  APPLICATION: 'application',
  ASSET_MEMBERSHIP: 'asset-membership',
} as const satisfies Record<
  z.infer<typeof DataHubTimelineCategorySchema>,
  MetadataRecentChangeCategory
>;

const recentChangeOperationByDataHubOperation = {
  ADD: 'added',
  MODIFY: 'modified',
  REMOVE: 'removed',
} as const satisfies Record<
  z.infer<typeof DataHubTimelineOperationSchema>,
  MetadataRecentChange['operation']
>;

const recentChangeCategoryLabels: Record<MetadataRecentChangeCategory, string> = {
  schema: 'Schema',
  ownership: 'Ownership',
  tag: 'Tag',
  domain: 'Domain',
  documentation: 'Documentation',
  glossary: 'Glossary term',
  relationship: 'Related entity',
  'structured-property': 'Structured property',
  application: 'Application association',
  'asset-membership': 'Asset membership',
  pipeline: 'Pipeline metadata',
};

function canonicalRecentChangeWindow(request: MetadataRecentChangesRequest, fallbackEndTime: Date) {
  const endTime = new Date(request.endTime ?? fallbackEndTime).toISOString();
  const startTime = new Date(
    Date.parse(endTime) - request.windowHours * 60 * 60 * 1_000,
  ).toISOString();
  return { startTime, endTime, hours: request.windowHours };
}

function compareRecentChanges(left: MetadataRecentChange, right: MetadataRecentChange) {
  if (left.timestamp !== right.timestamp) {
    return left.timestamp > right.timestamp ? -1 : 1;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function normalizedRecentChangesResponse(
  request: MetadataRecentChangesRequest,
  window: { startTime: string; endTime: string; hours: number },
  candidates: MetadataRecentChange[],
  providerTruncated = false,
) {
  const startTimestamp = Date.parse(window.startTime);
  const endTimestamp = Date.parse(window.endTime);
  const withinWindow = candidates.filter((change) => {
    const timestamp = Date.parse(change.timestamp);
    return timestamp >= startTimestamp && timestamp <= endTimestamp;
  });
  const unique = new Map<string, MetadataRecentChange>();
  withinWindow.sort(compareRecentChanges).forEach((change) => {
    const parsed = MetadataRecentChangeSchema.parse(change);
    if (!unique.has(parsed.id)) {
      unique.set(parsed.id, parsed);
    }
  });
  const ordered = [...unique.values()].sort(compareRecentChanges);
  const changes = ordered.slice(0, request.limit);

  return MetadataRecentChangesResponseSchema.parse({
    entityUrn: request.entityUrn,
    window,
    limit: request.limit,
    returnedCount: changes.length,
    truncated:
      providerTruncated ||
      candidates.length > withinWindow.length ||
      ordered.length > request.limit,
    changes,
  });
}

function safeTimelineField(
  modifier: string | null | undefined,
  parameters:
    | Array<{
        key?: string | null | undefined;
        value?: string | null | undefined;
      }>
    | null
    | undefined,
) {
  const parameter = parameters?.find(({ key }) =>
    ['field', 'fieldpath', 'aspect', 'aspectname'].includes(key?.trim().toLowerCase() ?? ''),
  );
  const candidate = safeProviderText([modifier, parameter?.value], 300);
  if (!candidate) {
    return undefined;
  }
  const withoutControlCharacters = [...candidate]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('');
  const normalized = withoutControlCharacters.replace(/\s+/g, ' ').trim();
  return normalized && !normalized.includes('@') ? normalized.slice(0, 300) : undefined;
}

function safeTimelineActor(actor: string | null | undefined) {
  if (!actor?.trim()) {
    return undefined;
  }
  return /(?:__datahub_system|datahub-system|system)$/i.test(actor.trim())
    ? 'DataHub system'
    : 'DataHub user';
}

function dataHubRecentChangeId(parts: string[]) {
  return `datahub-${createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 24)}`;
}

export interface DataHubRecentChangesClientConfig extends DataHubHealthClientConfig {
  now?: () => Date;
}

export class DataHubRecentChangesClient implements MetadataRecentChangesProvider {
  private readonly graphqlUrl: URL | undefined;
  private readonly now: () => Date;
  private readonly timeoutMs: number;
  private readonly token: string | undefined;

  constructor(config: DataHubRecentChangesClientConfig) {
    this.graphqlUrl = dataHubGraphqlUrl(config.gmsUrl);
    this.now = config.now ?? (() => new Date());
    this.timeoutMs = boundedHealthTimeout(config.timeoutMs);
    this.token = config.token?.trim() || undefined;
  }

  async getRecentChangesForEntity(
    options: MetadataRecentChangesOptions,
  ): Promise<MetadataRecentChangesResponse> {
    if (!this.graphqlUrl || !this.token) {
      throw new MetadataProviderError('unconfigured');
    }

    const { signal, ...input } = options;
    const request = MetadataRecentChangesRequestSchema.parse(input);
    const window = canonicalRecentChangeWindow(request, this.now());
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timeout = setTimeout(abort, this.timeoutMs);
    if (signal?.aborted) {
      controller.abort();
    } else {
      signal?.addEventListener('abort', abort, { once: true });
    }

    try {
      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: dataHubRecentChangesQuery,
          variables: { urn: request.entityUrn, input: { urn: request.entityUrn } },
        }),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new MetadataProviderError('unauthorized');
      }
      if (!response.ok) {
        throw new MetadataProviderError('unavailable');
      }
      if (response.status !== 200 || !isJsonResponse(response)) {
        throw new MetadataProviderError('invalid_response');
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new MetadataProviderError('invalid_response');
      }
      const parsedBody = DataHubTimelineResponseSchema.safeParse(body);
      if (
        !parsedBody.success ||
        !parsedBody.data.data ||
        (parsedBody.data.errors?.length ?? 0) > 0
      ) {
        throw new MetadataProviderError('invalid_response');
      }
      const { root, getTimeline } = parsedBody.data.data;
      if (!root) {
        throw new MetadataProviderError('not_found');
      }
      if (root.urn.trim() !== request.entityUrn || !getTimeline) {
        throw new MetadataProviderError('invalid_response');
      }

      const candidates: MetadataRecentChange[] = [];
      for (const transaction of getTimeline.changeTransactions) {
        const timestamp = new Date(transaction.timestampMillis).toISOString();
        for (const change of transaction.changes) {
          if (change.urn.trim() !== request.entityUrn) {
            throw new MetadataProviderError('invalid_response');
          }
          const category = recentChangeCategoryByDataHubCategory[change.category];
          const operation = recentChangeOperationByDataHubOperation[change.operation];
          const field = safeTimelineField(change.modifier, change.parameters);
          const summary = `${recentChangeCategoryLabels[category]} ${operation}${field ? `: ${field}` : ''}.`;
          const id = dataHubRecentChangeId([
            request.entityUrn,
            timestamp,
            category,
            operation,
            field ?? '',
            transaction.lastSemanticVersion,
            transaction.versionStamp,
            transaction.actor ?? '',
            change.auditStamp?.actor ?? '',
            String(change.auditStamp?.time ?? ''),
            change.modifier ?? '',
            JSON.stringify(change.parameters ?? []),
            change.description ?? '',
          ]);
          candidates.push(
            MetadataRecentChangeSchema.parse({
              id,
              entityUrn: request.entityUrn,
              timestamp,
              category,
              operation,
              ...(safeTimelineActor(change.auditStamp?.actor ?? transaction.actor)
                ? { actor: safeTimelineActor(change.auditStamp?.actor ?? transaction.actor) }
                : {}),
              source: 'datahub',
              summary,
              ...(field ? { field } : {}),
            }),
          );
        }
      }

      return normalizedRecentChangesResponse(
        request,
        window,
        candidates,
        getTimeline.changeTransactions.length === dataHubTimelineTransactionLimit,
      );
    } catch (error) {
      if (error instanceof MetadataProviderError) {
        throw error;
      }
      throw new MetadataProviderError(controller.signal.aborted ? 'timeout' : 'unavailable');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
}

const defaultFixtureUrl = new URL(
  '../../../fixtures/metadata/removed-schema-column.json',
  import.meta.url,
);

function boundedInteger(value: number) {
  return Math.max(0, Math.floor(value));
}

function loadDefaultFixture(): unknown {
  return JSON.parse(readFileSync(defaultFixtureUrl, 'utf8')) as unknown;
}

function fixtureLineageNode(entity: MetadataEntitySearchResult, depth: number) {
  const platform = /urn:li:dataPlatform:([^,)]+)/.exec(entity.urn)?.[1]?.trim().slice(0, 200);
  return MetadataLineageNodeSchema.parse({
    urn: entity.urn,
    kind: entity.kind,
    name: entity.name,
    depth,
    ...(platform ? { platform } : {}),
    ...(entity.description ? { description: entity.description } : {}),
  });
}

export class FixtureMetadataAdapter implements MetadataAdapter {
  private readonly fixture: FixtureMetadata;
  private readonly entitiesByUrn: Map<string, MetadataEntitySearchResult>;

  constructor(fixture: unknown = loadDefaultFixture()) {
    this.fixture = FixtureMetadataSchema.parse(fixture);
    this.entitiesByUrn = new Map(
      this.fixture.entities.map((entity) => [entity.urn, entity] as const),
    );
  }

  async healthCheck(): Promise<MetadataHealthResult> {
    if (!this.entitiesByUrn.has(this.fixture.defaultSeedUrn)) {
      throw new Error('Fixture metadata is unavailable.');
    }

    return fixtureHealthResult();
  }

  async searchEntities(
    options: MetadataEntitySearchOptions,
  ): Promise<MetadataEntitySearchResult[]> {
    const resultLimit = boundedInteger(options.limit);
    if (resultLimit === 0) {
      return [];
    }

    const normalizedQuery = options.query.toLowerCase().trim();
    const tokens = normalizedQuery.split(/[^a-z0-9]+/).filter((token) => token.length > 1);
    const scored = this.fixture.entities
      .filter((entity) => !options.entityType || entity.kind === options.entityType)
      .map((entity) => {
        const haystack =
          `${entity.name} ${entity.urn} ${entity.description ?? ''} ${entity.qualifiedName ?? ''}`.toLowerCase();
        const score = tokens.reduce(
          (total, token) => total + (haystack.includes(token) ? 1 : 0),
          0,
        );
        return { entity, score };
      })
      .filter(({ score }) => score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.entity.urn.localeCompare(right.entity.urn),
      );

    const matchedEntities = scored.map(({ entity }) => entity);
    const fallbackEntity = this.entitiesByUrn.get(this.fixture.defaultSeedUrn);
    const candidates =
      matchedEntities.length > 0
        ? matchedEntities
        : options.fallbackToDefault &&
            fallbackEntity &&
            (!options.entityType || fallbackEntity.kind === options.entityType)
          ? [fallbackEntity]
          : [];

    return normalizeSearchResults(candidates, resultLimit);
  }

  async getLineageGraph(options: MetadataLineageOptions): Promise<MetadataLineageResponse> {
    const { signal, ...input } = options;
    const request = MetadataLineageRequestSchema.parse(input);
    if (signal?.aborted) {
      throw new MetadataProviderError('timeout');
    }

    const root = this.entitiesByUrn.get(request.rootUrn);
    if (!root) {
      throw new MetadataProviderError('not_found');
    }

    const nodesByUrn = new Map<string, MetadataLineageNode>([
      [root.urn, fixtureLineageNode(root, 0)],
    ]);
    const edgesByKey = new Map<string, MetadataLineageEdge>();
    const visited = new Set([root.urn]);
    const frontier: Array<{ urn: string; depth: number }> = [{ urn: root.urn, depth: 0 }];
    let truncated = false;

    while (frontier.length > 0) {
      if (signal?.aborted) {
        throw new MetadataProviderError('timeout');
      }
      const current = frontier.shift();
      if (!current) {
        break;
      }
      const adjacentEdges = this.fixture.lineage
        .filter((edge) =>
          request.direction === 'upstream'
            ? edge.downstreamUrn === current.urn
            : edge.upstreamUrn === current.urn,
        )
        .sort(
          (left, right) =>
            left.upstreamUrn.localeCompare(right.upstreamUrn) ||
            left.downstreamUrn.localeCompare(right.downstreamUrn),
        );

      for (const edge of adjacentEdges) {
        const adjacentUrn =
          request.direction === 'upstream' ? edge.upstreamUrn : edge.downstreamUrn;
        if (!visited.has(adjacentUrn)) {
          if (current.depth >= request.depth || nodesByUrn.size >= request.maxNodes) {
            truncated = true;
            continue;
          }
          const adjacent = this.entitiesByUrn.get(adjacentUrn);
          if (!adjacent) {
            throw new MetadataProviderError('invalid_response');
          }
          const nextDepth = current.depth + 1;
          visited.add(adjacentUrn);
          nodesByUrn.set(adjacentUrn, fixtureLineageNode(adjacent, nextDepth));
          frontier.push({ urn: adjacentUrn, depth: nextDepth });
        }

        if (nodesByUrn.has(adjacentUrn)) {
          const normalizedEdge = {
            sourceUrn: edge.upstreamUrn,
            targetUrn: edge.downstreamUrn,
          };
          if (!addLineageEdge(edgesByKey, normalizedEdge)) {
            truncated = true;
          }
        }
      }
    }

    return normalizedLineageResponse(request, nodesByUrn, edgesByKey, truncated);
  }

  async getLineage(entity: EntityRef, depth: number, entityLimit: number): Promise<LineageResult> {
    const seed = this.entitiesByUrn.get(entity.urn);
    if (!seed) {
      throw new Error('The requested entity does not exist in the fixture.');
    }

    const lineageDepth = boundedInteger(depth);
    const resultLimit = boundedInteger(entityLimit);
    const allUpstream = this.collectLineage(seed.urn, lineageDepth, 'upstream');
    const allDownstream = this.collectLineage(seed.urn, lineageDepth, 'downstream');
    const upstream = allUpstream.slice(0, resultLimit);
    const downstream = allDownstream.slice(0, Math.max(0, resultLimit - upstream.length));

    return {
      seed,
      upstream,
      downstream,
      truncated: allUpstream.length + allDownstream.length > resultLimit,
    };
  }

  async getRecentChangesForEntity(
    options: MetadataRecentChangesOptions,
  ): Promise<MetadataRecentChangesResponse> {
    const { signal, ...input } = options;
    const request = MetadataRecentChangesRequestSchema.parse(input);
    if (signal?.aborted) {
      throw new MetadataProviderError('timeout');
    }
    if (!this.entitiesByUrn.has(request.entityUrn)) {
      throw new MetadataProviderError('not_found');
    }

    const window = canonicalRecentChangeWindow(request, new Date(this.fixture.snapshotAt));
    const candidates = this.fixture.changes
      .filter((change) => change.entityUrn === request.entityUrn)
      .map((change) =>
        MetadataRecentChangeSchema.parse({
          id: change.id,
          entityUrn: change.entityUrn,
          timestamp: new Date(change.observedAt).toISOString(),
          category: change.category,
          operation: change.operation,
          ...(change.actor ? { actor: change.actor } : {}),
          source: 'fixture',
          summary: change.summary,
          ...(change.field ? { field: change.field } : {}),
        }),
      );
    return normalizedRecentChangesResponse(request, window, candidates);
  }

  async getRecentChanges(
    entities: EntityRef[],
    since: string,
    changeLimit: number,
  ): Promise<MetadataChange[]> {
    const sinceTimestamp = Date.parse(since);
    if (Number.isNaN(sinceTimestamp)) {
      throw new Error('The recent-change boundary must be an ISO timestamp.');
    }

    const entityUrns = new Set(entities.map((entity) => entity.urn));
    return this.fixture.changes
      .filter(
        (change) =>
          entityUrns.has(change.entityUrn) && Date.parse(change.observedAt) >= sinceTimestamp,
      )
      .sort(
        (left, right) =>
          right.observedAt.localeCompare(left.observedAt) || left.id.localeCompare(right.id),
      )
      .slice(0, boundedInteger(changeLimit))
      .map((change) => ({
        id: change.id,
        entity: this.entitiesByUrn.get(change.entityUrn)!,
        category: change.category,
        observedAt: change.observedAt,
        summary: change.summary,
      }));
  }

  private collectLineage(
    seedUrn: string,
    depth: number,
    direction: 'upstream' | 'downstream',
  ): EntityRef[] {
    const visited = new Set([seedUrn]);
    const collected: EntityRef[] = [];
    let frontier = [seedUrn];

    for (let currentDepth = 0; currentDepth < depth && frontier.length > 0; currentDepth += 1) {
      const nextFrontier: string[] = [];

      for (const currentUrn of frontier) {
        const adjacentUrns = this.fixture.lineage
          .filter((edge) =>
            direction === 'upstream'
              ? edge.downstreamUrn === currentUrn
              : edge.upstreamUrn === currentUrn,
          )
          .map((edge) => (direction === 'upstream' ? edge.upstreamUrn : edge.downstreamUrn))
          .sort();

        for (const adjacentUrn of adjacentUrns) {
          if (visited.has(adjacentUrn)) {
            continue;
          }

          visited.add(adjacentUrn);
          const adjacentEntity = this.entitiesByUrn.get(adjacentUrn);
          if (adjacentEntity) {
            collected.push(adjacentEntity);
            nextFrontier.push(adjacentUrn);
          }
        }
      }

      frontier = nextFrontier;
    }

    return collected;
  }
}

export function createFixtureMetadataAdapter() {
  return new FixtureMetadataAdapter();
}

export function createDataHubHealthClient(config: DataHubHealthClientConfig) {
  return new DataHubHealthClient(config);
}

export function createDataHubSearchClient(config: DataHubSearchClientConfig) {
  return new DataHubSearchClient(config);
}

export function createDataHubLineageClient(config: DataHubLineageClientConfig) {
  return new DataHubLineageClient(config);
}

export function createDataHubRecentChangesClient(config: DataHubRecentChangesClientConfig) {
  return new DataHubRecentChangesClient(config);
}
