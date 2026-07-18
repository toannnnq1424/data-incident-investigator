import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicIncidentContextGatherer,
  DeterministicInvestigationRunner,
  FIXTURE_INVESTIGATION_LIMITS,
  type IncidentContextGatherer,
  type IncidentContextGatheringLimits,
  type InvestigationLimits,
  type InvestigationRunner,
} from '@dii/agent-core';
import {
  createDataHubHealthClient,
  createDataHubLineageClient,
  createDataHubRecentChangesClient,
  createDataHubSearchClient,
  createFixtureMetadataAdapter,
  MetadataProviderError,
  type MetadataAdapter,
  type MetadataHealthProvider,
  type MetadataLineageProvider,
  type MetadataRecentChangesProvider,
  type MetadataSearchProvider,
} from '@dii/datahub-client';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
  IncidentContextStageSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
  MetadataSourceModeSchema,
  type IncidentContextStage,
  type InvestigationReport,
  type MetadataHealthResponse,
  type MetadataSourceMode,
} from '@dii/shared-types';
import Fastify from 'fastify';

interface BuildServerOptions {
  environment?: NodeJS.ProcessEnv;
  logger?: boolean;
  metadata?: MetadataAdapter;
  metadataHealth?: MetadataHealthProvider;
  metadataLineage?: MetadataLineageProvider;
  metadataRecentChanges?: MetadataRecentChangesProvider;
  metadataSearch?: MetadataSearchProvider;
  mode?: MetadataSourceMode;
  contextGatherer?: IncidentContextGatherer;
  contextLimits?: IncidentContextGatheringLimits;
  runner?: InvestigationRunner;
  limits?: InvestigationLimits;
}

type StoredIncident =
  | { status: 'processing'; contextStage: IncidentContextStage }
  | { status: 'completed'; contextStage: IncidentContextStage; report: InvestigationReport }
  | { status: 'failed' };

const fixtureProcessingDelayMs = 250;

function metadataMode(value: string | undefined): MetadataSourceMode {
  const parsedMode = MetadataSourceModeSchema.safeParse(value);
  return parsedMode.success ? parsedMode.data : 'fixture';
}

function unavailableMetadataHealth(mode: MetadataSourceMode): MetadataHealthResponse {
  return MetadataHealthResponseSchema.parse({
    mode,
    status: 'unavailable',
    message:
      mode === 'datahub'
        ? 'DataHub metadata is unavailable. Check the service and network connection.'
        : 'Fixture metadata is unavailable. Restart the application and try again.',
  });
}

const metadataSearchFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    httpStatus: 503,
    message: 'Metadata search is not configured. Check the metadata source settings.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    httpStatus: 502,
    message: 'Metadata search authorization failed. Check the configured access token.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    httpStatus: 503,
    message: 'Metadata search is unavailable. Check the service and network connection.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    httpStatus: 504,
    message: 'Metadata search timed out. Try again shortly.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    httpStatus: 502,
    message: 'Metadata search returned an unexpected response.',
  },
  not_found: {
    code: 'NOT_FOUND',
    httpStatus: 404,
    message: 'The requested metadata entity was not found.',
  },
} as const;

const metadataLineageFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    httpStatus: 503,
    message: 'Metadata lineage is not configured. Check the metadata source settings.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    httpStatus: 502,
    message: 'Metadata lineage authorization failed. Check the configured access token.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    httpStatus: 503,
    message: 'Metadata lineage is unavailable. Check the service and network connection.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    httpStatus: 504,
    message: 'Metadata lineage timed out. Try again shortly.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    httpStatus: 502,
    message: 'Metadata lineage returned an unexpected response.',
  },
  not_found: {
    code: 'NOT_FOUND',
    httpStatus: 404,
    message: 'The requested metadata entity was not found.',
  },
} as const;

const metadataRecentChangesFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    httpStatus: 503,
    message: 'Metadata recent changes are not configured. Check the metadata source settings.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    httpStatus: 502,
    message: 'Metadata recent-changes authorization failed. Check the configured access token.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    httpStatus: 503,
    message: 'Metadata recent changes are unavailable. Check the service and network connection.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    httpStatus: 504,
    message: 'Metadata recent changes timed out. Try again shortly.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    httpStatus: 502,
    message: 'Metadata recent changes returned an unexpected response.',
  },
  not_found: {
    code: 'NOT_FOUND',
    httpStatus: 404,
    message: 'The requested metadata entity was not found.',
  },
} as const;

const incidentContextFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    message: 'Incident context metadata is not configured.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    message: 'Incident context metadata authorization failed.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    message: 'Incident context metadata is unavailable.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    message: 'Incident context gathering timed out.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    message: 'Incident context metadata returned an unexpected response.',
  },
  not_found: {
    code: 'METADATA_INVALID_RESPONSE',
    message: 'An incident context entity could not be resolved.',
  },
} as const;

function failedIncidentContext(error: unknown): IncidentContextStage {
  if (error instanceof MetadataProviderError) {
    const failure = incidentContextFailures[error.status];
    return IncidentContextStageSchema.parse({
      status: 'failed',
      error: failure,
    });
  }

  return IncidentContextStageSchema.parse({
    status: 'failed',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Incident context could not be gathered.',
    },
  });
}

export function buildServer(options: BuildServerOptions = {}) {
  const server = Fastify({ logger: options.logger ?? true });
  const environment = options.environment ?? process.env;
  const mode = options.mode ?? metadataMode(environment.APP_MODE);
  const metadata = options.metadata ?? createFixtureMetadataAdapter();
  const metadataHealth =
    options.metadataHealth ??
    (mode === 'fixture'
      ? metadata
      : createDataHubHealthClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataSearch =
    options.metadataSearch ??
    (mode === 'fixture'
      ? metadata
      : createDataHubSearchClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataLineage =
    options.metadataLineage ??
    (mode === 'fixture'
      ? metadata
      : createDataHubLineageClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataRecentChanges =
    options.metadataRecentChanges ??
    (mode === 'fixture'
      ? metadata
      : createDataHubRecentChangesClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const contextGatherer = options.contextGatherer ?? new DeterministicIncidentContextGatherer();
  const contextLimits = options.contextLimits ?? DEFAULT_INCIDENT_CONTEXT_LIMITS;
  const contextMetadata = {
    healthCheck: metadataHealth.healthCheck.bind(metadataHealth),
    searchEntities: metadataSearch.searchEntities.bind(metadataSearch),
    getLineageGraph: metadataLineage.getLineageGraph.bind(metadataLineage),
    getRecentChangesForEntity:
      metadataRecentChanges.getRecentChangesForEntity.bind(metadataRecentChanges),
  };
  const runner = options.runner ?? new DeterministicInvestigationRunner();
  const limits = options.limits ?? FIXTURE_INVESTIGATION_LIMITS;
  const incidents = new Map<string, StoredIncident>();

  server.get('/health', async () => ({
    status: 'ok',
    service: 'data-incident-investigator-api',
    mode,
  }));

  server.get('/metadata/health', async (_request, reply) => {
    let response: MetadataHealthResponse;

    try {
      const providerHealth = await metadataHealth.healthCheck();
      response = MetadataHealthResponseSchema.parse({ mode, ...providerHealth });
    } catch {
      response = unavailableMetadataHealth(mode);
    }

    if (response.status !== 'ready') {
      server.log.warn(
        { mode: response.mode, status: response.status },
        'Metadata source is not ready',
      );
    }

    return reply.code(200).send(response);
  });

  server.post('/metadata/search', async (request, reply) => {
    const parsedRequest = MetadataEntitySearchRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.code(400).send(
        ApiErrorSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The metadata search request is invalid.',
            issues: parsedRequest.error.issues.map((issue) => ({
              path: issue.path.map(String).join('.') || 'request',
              message: issue.message,
            })),
          },
        }),
      );
    }

    try {
      const results = await metadataSearch.searchEntities(parsedRequest.data);
      const parsedResponse = MetadataEntitySearchResponseSchema.safeParse({
        ...parsedRequest.data,
        results,
      });
      if (!parsedResponse.success) {
        throw new MetadataProviderError('invalid_response');
      }

      server.log.info(
        {
          mode,
          resultCount: parsedResponse.data.results.length,
          entityType: parsedResponse.data.entityType ?? 'all',
        },
        'Metadata entity search completed',
      );
      return reply.code(200).send(parsedResponse.data);
    } catch (error) {
      const status = error instanceof MetadataProviderError ? error.status : 'unavailable';
      const failure = metadataSearchFailures[status];
      server.log.warn({ mode, status }, 'Metadata entity search failed');
      return reply.code(failure.httpStatus).send(
        ApiErrorSchema.parse({
          error: {
            code: failure.code,
            message: failure.message,
          },
        }),
      );
    }
  });

  server.post('/metadata/lineage', async (request, reply) => {
    const parsedRequest = MetadataLineageRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.code(400).send(
        ApiErrorSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The metadata lineage request is invalid.',
            issues: parsedRequest.error.issues.map((issue) => ({
              path: issue.path.map(String).join('.') || 'request',
              message: issue.message,
            })),
          },
        }),
      );
    }

    try {
      const lineage = await metadataLineage.getLineageGraph(parsedRequest.data);
      const parsedResponse = MetadataLineageResponseSchema.safeParse(lineage);
      if (
        !parsedResponse.success ||
        parsedResponse.data.rootUrn !== parsedRequest.data.rootUrn ||
        parsedResponse.data.direction !== parsedRequest.data.direction ||
        parsedResponse.data.requestedDepth !== parsedRequest.data.depth ||
        parsedResponse.data.maxNodes !== parsedRequest.data.maxNodes
      ) {
        throw new MetadataProviderError('invalid_response');
      }

      server.log.info(
        {
          mode,
          direction: parsedResponse.data.direction,
          visitedNodeCount: parsedResponse.data.visitedNodeCount,
          truncated: parsedResponse.data.truncated,
        },
        'Metadata lineage completed',
      );
      return reply.code(200).send(parsedResponse.data);
    } catch (error) {
      const status = error instanceof MetadataProviderError ? error.status : 'unavailable';
      const failure = metadataLineageFailures[status];
      server.log.warn({ mode, status }, 'Metadata lineage failed');
      return reply.code(failure.httpStatus).send(
        ApiErrorSchema.parse({
          error: {
            code: failure.code,
            message: failure.message,
          },
        }),
      );
    }
  });

  server.post('/metadata/recent-changes', async (request, reply) => {
    const parsedRequest = MetadataRecentChangesRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.code(400).send(
        ApiErrorSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The metadata recent-changes request is invalid.',
            issues: parsedRequest.error.issues.map((issue) => ({
              path: issue.path.map(String).join('.') || 'request',
              message: issue.message,
            })),
          },
        }),
      );
    }

    try {
      const recentChanges = await metadataRecentChanges.getRecentChangesForEntity(
        parsedRequest.data,
      );
      const parsedResponse = MetadataRecentChangesResponseSchema.safeParse(recentChanges);
      if (
        !parsedResponse.success ||
        parsedResponse.data.entityUrn !== parsedRequest.data.entityUrn ||
        parsedResponse.data.window.hours !== parsedRequest.data.windowHours ||
        parsedResponse.data.limit !== parsedRequest.data.limit ||
        (parsedRequest.data.endTime &&
          parsedResponse.data.window.endTime !== parsedRequest.data.endTime)
      ) {
        throw new MetadataProviderError('invalid_response');
      }

      server.log.info(
        {
          mode,
          returnedCount: parsedResponse.data.returnedCount,
          truncated: parsedResponse.data.truncated,
          windowHours: parsedResponse.data.window.hours,
        },
        'Metadata recent changes completed',
      );
      return reply.code(200).send(parsedResponse.data);
    } catch (error) {
      const status = error instanceof MetadataProviderError ? error.status : 'unavailable';
      const failure = metadataRecentChangesFailures[status];
      server.log.warn({ mode, status }, 'Metadata recent changes failed');
      return reply.code(failure.httpStatus).send(
        ApiErrorSchema.parse({
          error: {
            code: failure.code,
            message: failure.message,
          },
        }),
      );
    }
  });

  server.post('/incidents', async (request, reply) => {
    const parsedRequest = IncidentRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      const error = ApiErrorSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The incident request is invalid.',
          issues: parsedRequest.error.issues.map((issue) => ({
            path: issue.path.map(String).join('.') || 'request',
            message: issue.message,
          })),
        },
      });

      return reply.code(400).send(error);
    }

    const response = IncidentAcceptedResponseSchema.parse({
      incidentId: randomUUID(),
      status: 'processing',
    });
    incidents.set(response.incidentId, {
      status: 'processing',
      contextStage: IncidentContextStageSchema.parse({ status: 'gathering' }),
    });
    server.log.info({ incidentId: response.incidentId, mode }, 'Investigation accepted');

    setTimeout(() => {
      void (async () => {
        let contextStage: IncidentContextStage;
        try {
          contextStage = await contextGatherer.gather(parsedRequest.data, {
            metadata: contextMetadata,
            mode,
            limits: contextLimits,
          });
          incidents.set(response.incidentId, { status: 'processing', contextStage });
          server.log.info(
            {
              incidentId: response.incidentId,
              mode,
              candidateCount: contextStage.facts.candidateEntities.length,
              lineageNodeCount: contextStage.facts.lineage?.nodes.length ?? 0,
              recentChangeCount: contextStage.facts.recentChanges.reduce(
                (count, recentChanges) => count + recentChanges.returnedCount,
                0,
              ),
              missingInformationCount: contextStage.missingInformation.length,
            },
            'Incident context gathered',
          );
        } catch (error: unknown) {
          contextStage = failedIncidentContext(error);
          incidents.set(response.incidentId, { status: 'processing', contextStage });
          server.log.warn(
            {
              incidentId: response.incidentId,
              mode,
              contextErrorCode:
                contextStage.status === 'failed' ? contextStage.error.code : 'INTERNAL_ERROR',
            },
            'Incident context gathering failed',
          );
        }

        try {
          const report = await runner.investigate(parsedRequest.data, {
            incidentId: response.incidentId,
            metadata,
            limits,
          });
          incidents.set(response.incidentId, { status: 'completed', contextStage, report });
          server.log.info(
            {
              incidentId: response.incidentId,
              entityCount: report.entities.length,
              evidenceCount: report.evidence.length,
            },
            'Fixture investigation completed',
          );
        } catch (error: unknown) {
          incidents.set(response.incidentId, { status: 'failed' });
          server.log.error(
            {
              incidentId: response.incidentId,
              errorType: error instanceof Error ? error.name : 'UnknownError',
            },
            'Fixture investigation failed',
          );
        }
      })();
    }, fixtureProcessingDelayMs);

    return reply.code(202).send(response);
  });

  server.get<{ Params: { incidentId: string } }>(
    '/incidents/:incidentId',
    async (request, reply) => {
      const { incidentId } = request.params;
      const incident = incidents.get(incidentId);

      if (!incident) {
        return reply.code(404).send(
          ApiErrorSchema.parse({
            error: {
              code: 'NOT_FOUND',
              message: 'The requested incident was not found.',
            },
          }),
        );
      }

      if (incident.status === 'failed') {
        return reply.code(500).send(
          ApiErrorSchema.parse({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'The investigation could not be completed.',
            },
          }),
        );
      }

      return reply.code(200).send(
        IncidentRetrievalResponseSchema.parse(
          incident.status === 'completed'
            ? {
                incidentId,
                status: 'completed',
                contextStage: incident.contextStage,
                report: incident.report,
              }
            : { incidentId, status: 'processing', contextStage: incident.contextStage },
        ),
      );
    },
  );

  return server;
}

async function start() {
  const server = buildServer();
  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '127.0.0.1';

  await server.listen({ host, port });
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
