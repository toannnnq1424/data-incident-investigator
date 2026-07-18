import { afterEach, describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import { buildServer } from '../../apps/api/src/index.js';
import {
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  type IncidentRetrievalResponse,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function waitForCompleted(
  server: ReturnType<typeof buildServer>,
  incidentId: string,
): Promise<Extract<IncidentRetrievalResponse, { status: 'completed' }>> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await server.inject({
      method: 'GET',
      url: `/incidents/${incidentId}`,
    });
    const incident = IncidentRetrievalResponseSchema.parse(response.json());
    if (incident.status === 'completed') {
      return incident;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Fixture investigation did not complete in the test window.');
}

describe('incident API', () => {
  it('returns a stable validation error envelope for invalid input', async () => {
    const server = buildServer({ logger: false });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: { question: 'x' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The incident request is invalid.',
        issues: [
          {
            path: 'question',
            message: 'Too small: expected string to have >=3 characters',
          },
        ],
      },
    });
  });

  it('preserves the Slice 1.1 processing response for a valid incident', async () => {
    const server = buildServer({ logger: false });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      incidentId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      status: 'processing',
    });
  });

  it('retrieves the completed schema-valid canonical report', async () => {
    const server = buildServer({ logger: false });
    servers.push(server);
    const accepted = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });
    const incidentId = accepted.json<{ incidentId: string }>().incidentId;

    const completed = await waitForCompleted(server, incidentId);

    expect(completed.incidentId).toBe(incidentId);
    expect(completed.report.incidentId).toBe(incidentId);
    expect(completed.report.hypotheses[0]?.evidenceIds).toContain('change-removed-gross-revenue');
  });

  it('returns the stable not-found error for an unknown incident', async () => {
    const server = buildServer({ logger: false });
    servers.push(server);

    const response = await server.inject({
      method: 'GET',
      url: '/incidents/ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested incident was not found.',
      },
    });
  });
});
