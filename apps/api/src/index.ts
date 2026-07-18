import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
} from '@dii/shared-types';
import Fastify from 'fastify';

export function buildServer() {
  const server = Fastify({ logger: true });

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

    return reply.code(202).send(response);
  });

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
