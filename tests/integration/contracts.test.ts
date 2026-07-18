import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS,
  IncidentContextCompletedStageSchema,
  IncidentContextFactsSchema,
  IncidentIntentSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  InvestigationReportSchema,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
} from '../../packages/shared-types/src/index.js';

describe('shared investigation contracts', () => {
  it('accepts the minimum incident request', () => {
    const result = IncidentRequestSchema.safeParse({
      question: 'Why did revenue drop today?',
    });

    expect(result.success).toBe(true);
  });

  it('accepts the incident processing response contract', () => {
    const response = IncidentAcceptedResponseSchema.parse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'processing',
    });

    expect(response.status).toBe('processing');
  });

  it('applies normalized incident-intent defaults and enforces hard bounds', () => {
    const intent = IncidentIntentSchema.parse({
      question: 'Why did revenue drop?',
      entityHints: ['analytics.daily_revenue'],
      symptoms: [],
      timeWindow: { basis: 'provider_default' },
    });

    expect(intent.timeWindow.hours).toBe(INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS);
    expect(
      IncidentIntentSchema.safeParse({
        ...intent,
        entityHints: ['one', 'two', 'three', 'four'],
      }).success,
    ).toBe(false);
    expect(
      IncidentIntentSchema.safeParse({
        ...intent,
        timeWindow: { basis: 'provider_default', hours: 721 },
      }).success,
    ).toBe(false);
    expect(
      IncidentRequestSchema.safeParse({
        question: 'Why did revenue drop?',
        providerQuery: '{ rawGraphQL }',
      }).success,
    ).toBe(false);
  });

  it('requires selected and gathered entity facts to resolve to adapter evidence', () => {
    const candidate = {
      urn: 'urn:li:dataset:analytics.revenue',
      kind: 'dataset' as const,
      name: 'analytics.revenue',
    };

    expect(
      IncidentContextFactsSchema.safeParse({
        sourceMode: 'fixture',
        candidateEntities: [candidate],
        selectedEntity: { ...candidate, urn: 'urn:li:dataset:invented' },
        recentChanges: [],
      }).success,
    ).toBe(false);
    expect(
      IncidentContextCompletedStageSchema.safeParse({
        status: 'completed',
        intent: {
          question: 'Why did revenue drop?',
          entityHints: [],
          symptoms: [],
          timeWindow: { basis: 'provider_default' },
        },
        facts: {
          sourceMode: 'fixture',
          candidateEntities: [],
          recentChanges: [],
        },
        missingInformation: [],
      }).success,
    ).toBe(false);
  });

  it('accepts the stable validation error envelope', () => {
    const response = ApiErrorSchema.parse({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The incident request is invalid.',
        issues: [{ path: 'question', message: 'Too small' }],
      },
    });

    expect(response.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts every normalized metadata health status and rejects provider-specific values', () => {
    const statuses = [
      'ready',
      'unconfigured',
      'unauthorized',
      'unavailable',
      'timeout',
      'invalid_response',
    ] as const;

    for (const status of statuses) {
      expect(
        MetadataHealthResponseSchema.safeParse({
          mode: status === 'ready' ? 'fixture' : 'datahub',
          status,
          message: 'Safe metadata health message.',
        }).success,
      ).toBe(true);
    }

    expect(
      MetadataHealthResponseSchema.safeParse({
        mode: 'datahub',
        status: 'ECONNREFUSED',
        message: 'Provider-specific error.',
      }).success,
    ).toBe(false);
  });

  it('trims and bounds metadata entity search requests', () => {
    expect(
      MetadataEntitySearchRequestSchema.parse({
        query: '  revenue  ',
        entityType: 'dataset',
      }),
    ).toEqual({ query: 'revenue', entityType: 'dataset', limit: 10 });

    for (const request of [
      { query: '   ' },
      { query: 'x'.repeat(201) },
      { query: 'revenue', entityType: 'user' },
      { query: 'revenue', limit: 0 },
      { query: 'revenue', limit: 21 },
      { query: 'revenue', limit: 1.5 },
      { query: 'revenue', extra: true },
    ]) {
      expect(MetadataEntitySearchRequestSchema.safeParse(request).success).toBe(false);
    }
  });

  it('requires bounded, unique, deterministically ordered entity search results', () => {
    const response = {
      query: 'revenue',
      limit: 2,
      results: [
        {
          urn: 'urn:li:dataset:daily-revenue',
          kind: 'dataset',
          name: 'analytics.daily_revenue',
          qualifiedName: 'snowflake.analytics.daily_revenue',
        },
        {
          urn: 'urn:li:dashboard:revenue-overview',
          kind: 'dashboard',
          name: 'Revenue overview',
          description: 'Executive revenue dashboard.',
        },
      ],
    };

    expect(MetadataEntitySearchResponseSchema.safeParse(response).success).toBe(true);
    expect(
      MetadataEntitySearchResponseSchema.safeParse({
        ...response,
        results: [...response.results].reverse(),
      }).success,
    ).toBe(false);
    expect(
      MetadataEntitySearchResponseSchema.safeParse({
        ...response,
        results: [response.results[0], response.results[0]],
      }).success,
    ).toBe(false);
    expect(
      MetadataEntitySearchResponseSchema.safeParse({
        ...response,
        limit: 1,
      }).success,
    ).toBe(false);
  });

  it('defaults and strictly bounds metadata lineage requests without accepting provider queries', () => {
    expect(
      MetadataLineageRequestSchema.parse({
        rootUrn: '  urn:li:dataset:lineage-root  ',
        direction: 'upstream',
      }),
    ).toEqual({
      rootUrn: 'urn:li:dataset:lineage-root',
      direction: 'upstream',
      depth: 2,
      maxNodes: 8,
    });

    for (const request of [
      { rootUrn: ' ', direction: 'upstream' },
      { rootUrn: 'x'.repeat(1_001), direction: 'upstream' },
      { rootUrn: 'urn:li:dataset:root', direction: 'both' },
      { rootUrn: 'urn:li:dataset:root', direction: 'upstream', depth: 0 },
      { rootUrn: 'urn:li:dataset:root', direction: 'upstream', depth: 6 },
      { rootUrn: 'urn:li:dataset:root', direction: 'downstream', maxNodes: 0 },
      { rootUrn: 'urn:li:dataset:root', direction: 'downstream', maxNodes: 26 },
      { rootUrn: 'urn:li:dataset:root', direction: 'downstream', maxNodes: 1.5 },
      { rootUrn: 'urn:li:dataset:root', direction: 'upstream', query: '{ rawGraphql }' },
    ]) {
      expect(MetadataLineageRequestSchema.safeParse(request).success).toBe(false);
    }
  });

  it('requires one root, deterministic unique nodes and edges, and no dangling lineage edges', () => {
    const response = {
      rootUrn: 'urn:li:dataset:root',
      direction: 'downstream',
      requestedDepth: 2,
      maxNodes: 3,
      visitedNodeCount: 2,
      truncated: false,
      nodes: [
        {
          urn: 'urn:li:dataset:root',
          kind: 'dataset',
          name: 'Root',
          depth: 0,
        },
        {
          urn: 'urn:li:dashboard:child',
          kind: 'dashboard',
          name: 'Child',
          depth: 1,
        },
      ],
      edges: [
        { sourceUrn: 'urn:li:dataset:root', targetUrn: 'urn:li:dashboard:child' },
        { sourceUrn: 'urn:li:dataset:root', targetUrn: 'urn:li:dataset:root' },
      ],
    };

    expect(MetadataLineageResponseSchema.safeParse(response).success).toBe(true);
    expect(
      MetadataLineageResponseSchema.safeParse({
        ...response,
        nodes: [...response.nodes, response.nodes[0]],
        visitedNodeCount: 3,
      }).success,
    ).toBe(false);
    expect(
      MetadataLineageResponseSchema.safeParse({
        ...response,
        edges: [
          ...response.edges,
          { sourceUrn: 'urn:li:dataset:root', targetUrn: 'urn:li:dataset:missing' },
        ],
      }).success,
    ).toBe(false);
    expect(
      MetadataLineageResponseSchema.safeParse({
        ...response,
        nodes: [...response.nodes].reverse(),
      }).success,
    ).toBe(false);
    expect(
      MetadataLineageResponseSchema.safeParse({
        ...response,
        edges: [...response.edges].reverse(),
      }).success,
    ).toBe(false);
  });

  it('defaults and strictly bounds recent-change requests without provider queries', () => {
    expect(
      MetadataRecentChangesRequestSchema.parse({
        entityUrn: '  urn:li:dataset:recent-root  ',
      }),
    ).toEqual({
      entityUrn: 'urn:li:dataset:recent-root',
      windowHours: 168,
      limit: 10,
    });

    for (const request of [
      { entityUrn: ' ' },
      { entityUrn: 'x'.repeat(1_001) },
      { entityUrn: 'urn:li:dataset:root', endTime: '2026-07-19T08:30:00Z' },
      { entityUrn: 'urn:li:dataset:root', windowHours: 0 },
      { entityUrn: 'urn:li:dataset:root', windowHours: 721 },
      { entityUrn: 'urn:li:dataset:root', limit: 0 },
      { entityUrn: 'urn:li:dataset:root', limit: 21 },
      { entityUrn: 'urn:li:dataset:root', limit: 1.5 },
      { entityUrn: 'urn:li:dataset:root', query: '{ rawGraphql }' },
    ]) {
      expect(MetadataRecentChangesRequestSchema.safeParse(request).success).toBe(false);
    }
  });

  it('requires canonical UTC, unique newest-first recent changes inside the echoed window', () => {
    const response = {
      entityUrn: 'urn:li:dataset:root',
      window: {
        startTime: '2026-07-12T08:30:00.000Z',
        endTime: '2026-07-19T08:30:00.000Z',
        hours: 168,
      },
      limit: 3,
      returnedCount: 3,
      truncated: true,
      changes: [
        {
          id: 'change-owner',
          entityUrn: 'urn:li:dataset:root',
          timestamp: '2026-07-19T07:45:00.000Z',
          category: 'ownership',
          operation: 'modified',
          actor: 'DataHub user',
          source: 'datahub',
          summary: 'Ownership modified.',
        },
        {
          id: 'change-schema',
          entityUrn: 'urn:li:dataset:root',
          timestamp: '2026-07-19T07:45:00.000Z',
          category: 'schema',
          operation: 'modified',
          source: 'datahub',
          summary: 'Schema modified: gross_revenue.',
          field: 'gross_revenue',
        },
        {
          id: 'change-tag',
          entityUrn: 'urn:li:dataset:root',
          timestamp: '2026-07-18T06:00:00.000Z',
          category: 'tag',
          operation: 'added',
          source: 'datahub',
          summary: 'Tag added: certified.',
          field: 'certified',
        },
      ],
    };

    expect(MetadataRecentChangesResponseSchema.safeParse(response).success).toBe(true);
    expect(
      MetadataRecentChangesResponseSchema.safeParse({
        ...response,
        changes: [response.changes[1], response.changes[0], response.changes[2]],
      }).success,
    ).toBe(false);
    expect(
      MetadataRecentChangesResponseSchema.safeParse({
        ...response,
        changes: [response.changes[0], response.changes[0], response.changes[2]],
      }).success,
    ).toBe(false);
    expect(
      MetadataRecentChangesResponseSchema.safeParse({
        ...response,
        changes: [
          response.changes[0],
          response.changes[1],
          { ...response.changes[2], entityUrn: 'urn:li:dataset:other' },
        ],
      }).success,
    ).toBe(false);
    expect(
      MetadataRecentChangesResponseSchema.safeParse({
        ...response,
        changes: [
          response.changes[0],
          response.changes[1],
          { ...response.changes[2], timestamp: '2026-07-11T06:00:00.000Z' },
        ],
      }).success,
    ).toBe(false);
  });

  it('requires every hypothesis to cite evidence', () => {
    const result = InvestigationReportSchema.safeParse({
      incidentId: 'incident-1',
      summary: 'Revenue dropped after an upstream schema change.',
      entities: [],
      evidence: [],
      hypotheses: [
        {
          id: 'hypothesis-1',
          summary: 'A source column was removed.',
          confidence: 0.8,
          evidenceIds: ['missing-evidence'],
        },
      ],
      recommendations: ['Restore the source column.'],
      assumptions: [],
      missingInformation: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepts a completed incident only when hypothesis references resolve', () => {
    const result = IncidentRetrievalResponseSchema.safeParse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'completed',
      contextStage: {
        status: 'completed',
        intent: {
          question: 'Why did revenue drop?',
          entityHints: [],
          symptoms: [],
          timeWindow: { basis: 'provider_default' },
        },
        facts: {
          sourceMode: 'fixture',
          candidateEntities: [],
          recentChanges: [],
        },
        missingInformation: [
          {
            code: 'entity_not_found',
            message: 'No adapter-evidenced entity was returned.',
          },
        ],
      },
      report: {
        incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
        summary: 'A removed source column is the strongest inference.',
        entities: [],
        evidence: [
          {
            id: 'change-1',
            category: 'schema-change',
            statement: 'The fixture records a removed column.',
          },
        ],
        hypotheses: [
          {
            id: 'hypothesis-1',
            summary: 'The removed column caused the incident.',
            confidence: 0.9,
            evidenceIds: ['change-1'],
          },
        ],
        recommendations: ['Restore or intentionally replace the column.'],
        assumptions: ['The fixture snapshot covers the incident window.'],
        missingInformation: ['Runtime query logs are unavailable.'],
      },
    });

    expect(result.success).toBe(true);
  });
});
