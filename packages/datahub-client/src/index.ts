import { readFileSync } from 'node:fs';
import { EntityRefSchema, type EntityRef, type MetadataHealthStatus } from '@dii/shared-types';
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

export interface MetadataAdapter extends MetadataHealthProvider {
  searchEntities(query: string, limit: number): Promise<EntityRef[]>;
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
    entities: z.array(EntityRefSchema).min(1).max(10),
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
  private readonly entitiesByUrn: Map<string, EntityRef>;

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

  async searchEntities(query: string, limit: number): Promise<EntityRef[]> {
    const resultLimit = boundedInteger(limit);
    if (resultLimit === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const tokens = normalizedQuery.split(/[^a-z0-9]+/).filter((token) => token.length > 1);
    const scored = this.fixture.entities
      .map((entity) => {
        const haystack = `${entity.name} ${entity.urn}`.toLowerCase();
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
      matchedEntities.length > 0 ? matchedEntities : fallbackEntity ? [fallbackEntity] : [];

    return candidates.slice(0, resultLimit);
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
