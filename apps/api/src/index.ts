import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  DeterministicInvestigationRunner,
  FIXTURE_INVESTIGATION_LIMITS,
  type InvestigationLimits,
  type InvestigationRunner,
} from '@dii/agent-core';
import {
  createDataHubHealthClient,
  createDataHubSearchClient,
  createFixtureMetadataAdapter,
  MetadataProviderError,
  type MetadataAdapter,
  type MetadataHealthProvider,
  type MetadataSearchProvider,
} from '@dii/datahub-client';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataSourceModeSchema,
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
  metadataSearch?: MetadataSearchProvider;
  mode?: MetadataSourceMode;
  runner?: InvestigationRunner;
  limits?: InvestigationLimits;
}

type StoredIncident =
  | { status: 'processing' }
  | { status: 'completed'; report: InvestigationReport }
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
} as const;

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
    incidents.set(response.incidentId, { status: 'processing' });
    server.log.info(
      { incidentId: response.incidentId, mode: 'fixture' },
      'Fixture investigation accepted',
    );

    setTimeout(() => {
      void runner
        .investigate(parsedRequest.data, {
          incidentId: response.incidentId,
          metadata,
          limits,
        })
        .then((report) => {
          incidents.set(response.incidentId, { status: 'completed', report });
          server.log.info(
            {
              incidentId: response.incidentId,
              entityCount: report.entities.length,
              evidenceCount: report.evidence.length,
            },
            'Fixture investigation completed',
          );
        })
        .catch((error: unknown) => {
          incidents.set(response.incidentId, { status: 'failed' });
          server.log.error(
            {
              incidentId: response.incidentId,
              errorType: error instanceof Error ? error.name : 'UnknownError',
            },
            'Fixture investigation failed',
          );
        });
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

      return reply
        .code(200)
        .send(
          IncidentRetrievalResponseSchema.parse(
            incident.status === 'completed'
              ? { incidentId, status: 'completed', report: incident.report }
              : { incidentId, status: 'processing' },
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
