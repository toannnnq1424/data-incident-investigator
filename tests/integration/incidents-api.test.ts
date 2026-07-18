import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('POST /incidents', () => {
  it('returns a stable validation error envelope for invalid input', async () => {
    const server = buildServer();
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

  it('accepts a valid incident and returns a processing identifier', async () => {
    const server = buildServer();
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: {
        question: 'Why did revenue drop today?',
        entityHint: 'warehouse.analytics.daily_revenue',
        occurredAt: '2026-07-18T08:30:00.000Z',
        symptom: 'Revenue is 42% below the seven-day baseline.',
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      incidentId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      status: 'processing',
    });
  });
});
