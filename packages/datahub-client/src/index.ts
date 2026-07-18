import { readFileSync } from 'node:fs';
import {
  MetadataEntitySearchResultSchema,
  type EntityKind,
  type EntityRef,
  type MetadataEntitySearchRequest,
  type MetadataEntitySearchResult,
  type MetadataHealthStatus,
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

export const MetadataChangeCategorySchema = z.enum([
  'schema',
  'ownership',
  'tag',
  'domain',
  'pipeline',
]);

export interface MetadataChange {
  id: string;
  entity: EntityRef;
  category: z.infer<typeof MetadataChangeCategorySchema>;
  observedAt: string;
  summary: string;
}

export interface LineageResult {
  seed: EntityRef;
  upstream: EntityRef[];
  downstream: EntityRef[];
  truncated: boolean;
}

export interface MetadataAdapter extends MetadataHealthProvider, MetadataSearchProvider {
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
          category: MetadataChangeCategorySchema,
          observedAt: z.iso.datetime(),
          summary: z.string().min(1),
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

type MetadataProviderFailureStatus = Exclude<MetadataHealthStatus, 'ready'>;

export class MetadataProviderError extends Error {
  readonly status: MetadataProviderFailureStatus;

  constructor(status: MetadataProviderFailureStatus) {
    super(metadataHealthMessages[status]);
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
  return value?.trim().slice(0, maximumLength);
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
