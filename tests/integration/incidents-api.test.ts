import { afterEach, describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import { buildServer } from '../../apps/api/src/index.js';
import { MetadataProviderError } from '../../packages/datahub-client/src/index.js';
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

    const retrieval = await server.inject({
      method: 'GET',
      url: `/incidents/${response.json<{ incidentId: string }>().incidentId}`,
    });
    expect(retrieval.statusCode).toBe(200);
    expect(IncidentRetrievalResponseSchema.parse(retrieval.json())).toMatchObject({
      status: 'processing',
      contextStage: { status: 'gathering' },
      suspiciousChangeStage: { status: 'detecting' },
      hypothesisScoringStage: { status: 'scoring' },
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
    expect(completed.contextStage.status).toBe('completed');
    if (completed.contextStage.status !== 'completed') {
      throw new Error('Expected completed fixture context.');
    }
    expect(completed.contextStage.facts.selectedEntity?.name).toBe('analytics.daily_revenue');
    expect(
      completed.contextStage.facts.recentChanges.flatMap((response) =>
        response.changes.map((change) => change.id),
      ),
    ).toContain('change-removed-gross-revenue');
    expect(completed.suspiciousChangeStage).toMatchObject({
      status: 'completed',
      candidates: [
        {
          changeId: 'change-removed-gross-revenue',
          entityUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
          signals: [
            { code: 'incident_window' },
            { code: 'upstream_lineage' },
            { code: 'disruptive_operation' },
          ],
        },
      ],
    });
    expect(completed.contextStage).not.toHaveProperty('hypotheses');
    expect(completed.suspiciousChangeStage).not.toHaveProperty('confidence');
    expect(completed.hypothesisScoringStage).toMatchObject({
      status: 'completed',
      hypotheses: [
        {
          rank: 1,
          sourceChangeId: 'change-removed-gross-revenue',
          confidence: 0.85,
          evidenceIds: ['change-removed-gross-revenue'],
          factors: [
            { code: 'change_recency', contributionBasisPoints: 3_000 },
            { code: 'lineage_position', contributionBasisPoints: 2_000 },
            { code: 'symptom_category_fit', contributionBasisPoints: 1_500 },
            { code: 'evidence_quality', contributionBasisPoints: 2_000 },
          ],
        },
      ],
    });
    expect(completed.report.incidentId).toBe(incidentId);
    expect(completed.report.hypotheses[0]?.evidenceIds).toContain('change-removed-gross-revenue');
    if (completed.hypothesisScoringStage.status !== 'completed') {
      throw new Error('Expected completed hypothesis scoring.');
    }
    expect(completed.report.hypotheses).toEqual(completed.hypothesisScoringStage.hypotheses);
  });

  it('uses the same provider-neutral context contracts in DataHub mode', async () => {
    const selectedEntity = {
      urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
      kind: 'dataset' as const,
      name: 'analytics.daily_revenue',
    };
    const server = buildServer({
      logger: false,
      mode: 'datahub',
      metadataHealth: {
        async healthCheck() {
          return { status: 'ready', message: 'DataHub metadata is ready.' };
        },
      },
      metadataSearch: {
        async searchEntities() {
          return [selectedEntity];
        },
      },
      metadataLineage: {
        async getLineageGraph(options) {
          return {
            rootUrn: options.rootUrn,
            direction: options.direction,
            requestedDepth: options.depth,
            maxNodes: options.maxNodes,
            visitedNodeCount: 1,
            truncated: false,
            nodes: [{ ...selectedEntity, depth: 0 }],
            edges: [],
          };
        },
      },
      metadataRecentChanges: {
        async getRecentChangesForEntity(options) {
          const endTime = options.endTime ?? '2026-07-18T08:30:00.000Z';
          const startTime = new Date(
            Date.parse(endTime) - options.windowHours * 60 * 60 * 1_000,
          ).toISOString();
          return {
            entityUrn: options.entityUrn,
            window: { startTime, endTime, hours: options.windowHours },
            limit: options.limit,
            returnedCount: 0,
            truncated: false,
            changes: [],
          };
        },
      },
    });
    servers.push(server);
    const accepted = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });

    const completed = await waitForCompleted(
      server,
      accepted.json<{ incidentId: string }>().incidentId,
    );

    expect(completed.contextStage).toMatchObject({
      status: 'completed',
      facts: {
        sourceMode: 'datahub',
        selectedEntity,
      },
    });
    expect(completed.suspiciousChangeStage).toMatchObject({
      status: 'insufficient',
      candidates: [],
      missingInformation: expect.arrayContaining([
        expect.objectContaining({ code: 'recent_changes_not_found' }),
      ]),
    });
    expect(completed.hypothesisScoringStage).toMatchObject({
      status: 'insufficient',
      hypotheses: [],
      missingInformation: expect.arrayContaining([
        expect.objectContaining({ code: 'suspicious_changes_insufficient' }),
      ]),
    });
  });

  it('returns insufficient scoring when suspicious changes do not resolve to report evidence', async () => {
    const server = buildServer({
      logger: false,
      runner: {
        async investigate(_request, context) {
          return {
            incidentId: context.incidentId,
            summary: 'Legacy fixture report retained for compatibility.',
            entities: [],
            evidence: [
              {
                id: 'metadata-seed',
                category: 'metadata',
                statement: 'Fixture metadata was available.',
              },
            ],
            hypotheses: [
              {
                id: 'legacy-metadata-hypothesis',
                summary: 'Available metadata is insufficient for a scored change inference.',
                confidence: 0.2,
                evidenceIds: ['metadata-seed'],
              },
            ],
            recommendations: [],
            assumptions: [],
            missingInformation: ['The exact suspicious change is absent from report evidence.'],
          };
        },
      },
    });
    servers.push(server);
    const accepted = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });

    const completed = await waitForCompleted(
      server,
      accepted.json<{ incidentId: string }>().incidentId,
    );

    expect(completed.suspiciousChangeStage.status).toBe('completed');
    expect(completed.hypothesisScoringStage).toMatchObject({
      status: 'insufficient',
      hypotheses: [],
      missingInformation: [expect.objectContaining({ code: 'evidence_reference_unresolved' })],
    });
    expect(completed.report.hypotheses[0]?.id).toBe('legacy-metadata-hypothesis');
  });

  it('returns a safe context-stage timeout without exposing provider errors or breaking the report', async () => {
    let detectorCalls = 0;
    const server = buildServer({
      logger: false,
      metadataSearch: {
        async searchEntities() {
          throw new MetadataProviderError('timeout');
        },
      },
      suspiciousChangeDetector: {
        detect() {
          detectorCalls += 1;
          throw new Error('Detector must not run after context failure.');
        },
      },
    });
    servers.push(server);
    const accepted = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });

    const completed = await waitForCompleted(
      server,
      accepted.json<{ incidentId: string }>().incidentId,
    );

    expect(completed.contextStage).toEqual({
      status: 'failed',
      error: {
        code: 'METADATA_TIMEOUT',
        message: 'Incident context gathering timed out.',
      },
    });
    expect(JSON.stringify(completed.contextStage)).not.toContain('MetadataProviderError');
    expect(completed.suspiciousChangeStage).toEqual({
      status: 'unavailable',
      error: {
        code: 'CONTEXT_UNAVAILABLE',
        message:
          'Suspicious-change detection is unavailable because incident context did not complete.',
      },
    });
    expect(detectorCalls).toBe(0);
    expect(completed.hypothesisScoringStage).toEqual({
      status: 'unavailable',
      error: {
        code: 'CONTEXT_UNAVAILABLE',
        message: 'Hypothesis scoring is unavailable because incident context did not complete.',
      },
    });
    expect(completed.report.hypotheses).toHaveLength(1);
  });

  it('normalizes detector validation failure without leaking details or breaking the report', async () => {
    const server = buildServer({
      logger: false,
      suspiciousChangeDetector: {
        detect() {
          throw new Error('raw detector details https://provider.invalid secret-token');
        },
      },
    });
    servers.push(server);
    const accepted = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });

    const completed = await waitForCompleted(
      server,
      accepted.json<{ incidentId: string }>().incidentId,
    );

    expect(completed.suspiciousChangeStage).toEqual({
      status: 'unavailable',
      error: {
        code: 'DETECTION_INVALID',
        message: 'Suspicious-change detection could not validate the gathered context.',
      },
    });
    expect(JSON.stringify(completed.suspiciousChangeStage)).not.toMatch(
      /provider\.invalid|secret/i,
    );
    expect(completed.hypothesisScoringStage).toEqual({
      status: 'unavailable',
      error: {
        code: 'SUSPICIOUS_CHANGES_UNAVAILABLE',
        message:
          'Hypothesis scoring is unavailable because suspicious-change detection did not complete.',
      },
    });
    expect(completed.report.hypotheses).toHaveLength(1);
  });

  it('normalizes scorer validation failure without leaking details or adding provider work', async () => {
    let scorerCalls = 0;
    const server = buildServer({
      logger: false,
      hypothesisScorer: {
        score() {
          scorerCalls += 1;
          throw new Error('raw model/provider details https://provider.invalid secret-token');
        },
      },
    });
    servers.push(server);
    const accepted = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });

    const completed = await waitForCompleted(
      server,
      accepted.json<{ incidentId: string }>().incidentId,
    );

    expect(scorerCalls).toBe(1);
    expect(completed.hypothesisScoringStage).toEqual({
      status: 'unavailable',
      error: {
        code: 'SCORING_INVALID',
        message: 'Hypothesis scoring could not validate the factual evidence mapping.',
      },
    });
    expect(JSON.stringify(completed.hypothesisScoringStage)).not.toMatch(
      /provider\.invalid|secret|model/i,
    );
    expect(completed.report.hypotheses).toHaveLength(1);
  });

  it('normalizes malformed provider context responses without leaking raw details', async () => {
    const server = buildServer({
      logger: false,
      metadataSearch: {
        async searchEntities() {
          return [{ urn: 'urn:provider:invalid', name: 'Invalid', kind: 'unknown' }] as never;
        },
      },
    });
    servers.push(server);
    const accepted = await server.inject({
      method: 'POST',
      url: '/incidents',
      payload: IncidentRequestSchema.parse(canonicalIncident.request),
    });

    const completed = await waitForCompleted(
      server,
      accepted.json<{ incidentId: string }>().incidentId,
    );

    expect(completed.contextStage).toEqual({
      status: 'failed',
      error: {
        code: 'METADATA_INVALID_RESPONSE',
        message: 'Incident context metadata returned an unexpected response.',
      },
    });
    expect(JSON.stringify(completed.contextStage)).not.toContain('urn:provider:invalid');
    expect(completed.hypothesisScoringStage).toMatchObject({
      status: 'unavailable',
      error: { code: 'CONTEXT_UNAVAILABLE' },
    });
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
