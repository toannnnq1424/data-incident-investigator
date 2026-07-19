import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  HYPOTHESIS_SCORE_FACTOR_LABELS,
  HYPOTHESIS_SCORE_FACTOR_WEIGHTS,
  HypothesisScoringResultSchema,
  INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS,
  IncidentContextCompletedStageSchema,
  IncidentContextFactsSchema,
  IncidentHypothesisScoringSchema,
  IncidentSuspiciousChangeDetectionSchema,
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
  SUSPICIOUS_CHANGE_SIGNAL_LABELS,
  SuspiciousChangeDetectionResultSchema,
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

  it('strictly bounds suspicious-change output and resolves exact context facts', () => {
    const selected = {
      urn: 'urn:li:dataset:analytics.revenue',
      kind: 'dataset' as const,
      name: 'analytics.revenue',
    };
    const upstream = {
      urn: 'urn:li:dataset:raw.orders',
      kind: 'dataset' as const,
      name: 'raw.orders',
    };
    const contextStage = IncidentContextCompletedStageSchema.parse({
      status: 'completed',
      intent: {
        question: 'Which schema column changed?',
        entityHints: ['analytics.revenue'],
        symptoms: ['A revenue field is missing.'],
        timeWindow: {
          basis: 'incident_time',
          endTime: '2026-07-18T08:30:00.000Z',
          hours: 168,
        },
      },
      facts: {
        sourceMode: 'fixture',
        candidateEntities: [selected],
        selectedEntity: selected,
        lineage: {
          rootUrn: selected.urn,
          direction: 'upstream',
          requestedDepth: 2,
          maxNodes: 5,
          visitedNodeCount: 2,
          truncated: false,
          nodes: [
            { ...selected, depth: 0 },
            { ...upstream, depth: 1 },
          ],
          edges: [{ sourceUrn: upstream.urn, targetUrn: selected.urn }],
        },
        recentChanges: [
          {
            entityUrn: upstream.urn,
            window: {
              startTime: '2026-07-11T08:30:00.000Z',
              endTime: '2026-07-18T08:30:00.000Z',
              hours: 168,
            },
            limit: 10,
            returnedCount: 1,
            truncated: false,
            changes: [
              {
                id: 'change-removed-column',
                entityUrn: upstream.urn,
                timestamp: '2026-07-18T07:45:00.000Z',
                category: 'schema',
                operation: 'removed',
                source: 'fixture',
                summary: 'Column gross_revenue was removed from raw.orders.',
                field: 'gross_revenue',
              },
            ],
          },
        ],
      },
      missingInformation: [],
    });
    const candidate = {
      changeId: 'change-removed-column',
      entityUrn: upstream.urn,
      entityName: upstream.name,
      category: 'schema' as const,
      operation: 'removed' as const,
      observedAt: '2026-07-18T07:45:00.000Z',
      summary: 'Column gross_revenue was removed from raw.orders.',
      field: 'gross_revenue',
      signals: [
        {
          code: 'category_intent_match' as const,
          label: SUSPICIOUS_CHANGE_SIGNAL_LABELS.category_intent_match,
        },
        {
          code: 'incident_window' as const,
          label: SUSPICIOUS_CHANGE_SIGNAL_LABELS.incident_window,
        },
        {
          code: 'upstream_lineage' as const,
          label: SUSPICIOUS_CHANGE_SIGNAL_LABELS.upstream_lineage,
        },
        {
          code: 'disruptive_operation' as const,
          label: SUSPICIOUS_CHANGE_SIGNAL_LABELS.disruptive_operation,
        },
      ],
    };
    const result = {
      status: 'completed' as const,
      candidates: [candidate],
      missingInformation: [],
    };

    expect(
      IncidentSuspiciousChangeDetectionSchema.safeParse({ contextStage, result }).success,
    ).toBe(true);
    expect(
      IncidentSuspiciousChangeDetectionSchema.safeParse({
        contextStage,
        result: {
          ...result,
          candidates: [{ ...candidate, changeId: 'invented-change' }],
        },
      }).success,
    ).toBe(false);
    expect(
      IncidentSuspiciousChangeDetectionSchema.safeParse({
        contextStage,
        result: {
          ...result,
          candidates: [{ ...candidate, entityUrn: 'urn:li:dataset:invented' }],
        },
      }).success,
    ).toBe(false);
    expect(
      SuspiciousChangeDetectionResultSchema.safeParse({
        ...result,
        candidates: [{ ...candidate, confidence: 0.9 }],
      }).success,
    ).toBe(false);
    expect(
      SuspiciousChangeDetectionResultSchema.safeParse({
        ...result,
        hypothesis: 'The change caused the incident.',
      }).success,
    ).toBe(false);
    expect(
      SuspiciousChangeDetectionResultSchema.safeParse({
        ...result,
        candidates: Array.from({ length: 6 }, (_, index) => ({
          ...candidate,
          changeId: `change-${index}`,
        })),
      }).success,
    ).toBe(false);

    const factors = [
      {
        code: 'change_recency' as const,
        label: HYPOTHESIS_SCORE_FACTOR_LABELS.change_recency,
        contributionBasisPoints: 3_000,
        weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.change_recency,
      },
      {
        code: 'lineage_position' as const,
        label: HYPOTHESIS_SCORE_FACTOR_LABELS.lineage_position,
        contributionBasisPoints: 2_000,
        weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.lineage_position,
      },
      {
        code: 'symptom_category_fit' as const,
        label: HYPOTHESIS_SCORE_FACTOR_LABELS.symptom_category_fit,
        contributionBasisPoints: 3_000,
        weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.symptom_category_fit,
      },
      {
        code: 'evidence_quality' as const,
        label: HYPOTHESIS_SCORE_FACTOR_LABELS.evidence_quality,
        contributionBasisPoints: 2_000,
        weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.evidence_quality,
      },
    ];
    const hypothesis = {
      id: 'hypothesis-change-removed-column',
      rank: 1,
      sourceChangeId: candidate.changeId,
      observedAt: candidate.observedAt,
      summary:
        'Plausible contributor: the removed schema change on raw.orders may have contributed to the incident.',
      confidence: 1,
      evidenceIds: [candidate.changeId],
      factors,
    };
    const scoringResult = {
      status: 'completed' as const,
      hypotheses: [hypothesis],
      missingInformation: [],
    };
    const evidence = [
      {
        id: candidate.changeId,
        category: 'schema-change' as const,
        statement: candidate.summary,
        sourceEntity: upstream,
        observedAt: candidate.observedAt,
      },
    ];

    expect(
      IncidentHypothesisScoringSchema.safeParse({
        contextStage,
        suspiciousChangeResult: result,
        evidence,
        result: scoringResult,
      }).success,
    ).toBe(true);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: [{ ...hypothesis, confidence: 0.99 }],
      }).success,
    ).toBe(false);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: [{ ...hypothesis, rank: 2 }],
      }).success,
    ).toBe(false);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: [
          {
            ...hypothesis,
            id: 'hypothesis-change-z',
            sourceChangeId: 'change-z',
            evidenceIds: ['change-z'],
          },
          {
            ...hypothesis,
            id: 'hypothesis-change-a',
            rank: 2,
            sourceChangeId: 'change-a',
            evidenceIds: ['change-a'],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: [{ ...hypothesis, factors: [...factors].reverse() }],
      }).success,
    ).toBe(false);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: [{ ...hypothesis, evidenceIds: [candidate.changeId, candidate.changeId] }],
      }).success,
    ).toBe(false);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: [{ ...hypothesis, summary: 'The change caused the incident.' }],
      }).success,
    ).toBe(false);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: [
          {
            ...hypothesis,
            recommendation: 'Restore the field.',
            rawProviderPayload: { confidence: 0.99 },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      IncidentHypothesisScoringSchema.safeParse({
        contextStage,
        suspiciousChangeResult: result,
        evidence: [{ ...evidence[0], id: 'different-evidence' }],
        result: scoringResult,
      }).success,
    ).toBe(false);
    expect(
      IncidentHypothesisScoringSchema.safeParse({
        contextStage,
        suspiciousChangeResult: result,
        evidence: [evidence[0], evidence[0]],
        result: scoringResult,
      }).success,
    ).toBe(false);
    expect(
      HypothesisScoringResultSchema.safeParse({
        ...scoringResult,
        hypotheses: Array.from({ length: 4 }, (_, index) => ({
          ...hypothesis,
          id: `hypothesis-${index}`,
          rank: index + 1,
          sourceChangeId: `change-${index}`,
          evidenceIds: [`change-${index}`],
        })),
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
      suspiciousChangeStage: {
        status: 'insufficient',
        candidates: [],
        missingInformation: [
          {
            code: 'recent_changes_not_found',
            message: 'No recent metadata change facts were available for deterministic detection.',
          },
        ],
      },
      hypothesisScoringStage: {
        status: 'insufficient',
        hypotheses: [],
        missingInformation: [
          {
            code: 'suspicious_changes_insufficient',
            message: 'Suspicious-change detection returned no candidate to score.',
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
            summary: 'The removed column is a plausible contributor.',
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
