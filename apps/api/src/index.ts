import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  DeterministicInvestigationRunner,
  FIXTURE_INVESTIGATION_LIMITS,
  type InvestigationLimits,
  type InvestigationRunner,
} from '@dii/agent-core';
import { createFixtureMetadataAdapter, type MetadataAdapter } from '@dii/datahub-client';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  type InvestigationReport,
} from '@dii/shared-types';
import Fastify from 'fastify';

interface BuildServerOptions {
  logger?: boolean;
  metadata?: MetadataAdapter;
  runner?: InvestigationRunner;
  limits?: InvestigationLimits;
}

type StoredIncident =
  | { status: 'processing' }
  | { status: 'completed'; report: InvestigationReport }
  | { status: 'failed' };

const fixtureProcessingDelayMs = 250;

export function buildServer(options: BuildServerOptions = {}) {
  const server = Fastify({ logger: options.logger ?? true });
  const metadata = options.metadata ?? createFixtureMetadataAdapter();
  const runner = options.runner ?? new DeterministicInvestigationRunner();
  const limits = options.limits ?? FIXTURE_INVESTIGATION_LIMITS;
  const incidents = new Map<string, StoredIncident>();

  server.get('/health', async () => ({
    status: 'ok',
    service: 'data-incident-investigator-api',
    mode: process.env.APP_MODE ?? 'fixture',
  }));

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
