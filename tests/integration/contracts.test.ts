import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  CANONICAL_INCIDENT_SCENARIOS,
  CANONICAL_INCIDENT_SCENARIO_IDS,
  CanonicalIncidentScenarioCatalogSchema,
  CanonicalIncidentScenarioSchema,
  formatUntrustedEvidence,
  HealthResponseSchema,
  HYPOTHESIS_SCORE_FACTOR_LABELS,
  HYPOTHESIS_SCORE_FACTOR_WEIGHTS,
  HypothesisScoringResultSchema,
  INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS,
  IncidentContextCompletedStageSchema,
  IncidentContextFactsSchema,
  IncidentHypothesisScoringSchema,
  IncidentRemediationPlanningSchema,
  IncidentSuspiciousChangeDetectionSchema,
  IncidentIntentSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  InvestigationReportSchema,
  INVESTIGATION_COMPLETED_EVENT_SUMMARY,
  INVESTIGATION_EVENT_ACTION_SUMMARIES,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
  REMEDIATION_FALLBACK_STEP_TEXT,
  ReadinessResponseSchema,
  RemediationPlanningStageSchema,
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

  it('owns the strict ordered browser-safe canonical scenario catalog', () => {
    expect(CANONICAL_INCIDENT_SCENARIOS.map((scenario) => scenario.id)).toEqual(
      CANONICAL_INCIDENT_SCENARIO_IDS,
    );
    expect(CANONICAL_INCIDENT_SCENARIOS).toHaveLength(7);
    expect(
      CanonicalIncidentScenarioCatalogSchema.safeParse(CANONICAL_INCIDENT_SCENARIOS).success,
    ).toBe(true);
    expect(
      CanonicalIncidentScenarioSchema.safeParse({
        ...CANONICAL_INCIDENT_SCENARIOS[0],
        expectedRootCause: 'not browser safe',
      }).success,
    ).toBe(false);

    const wrongOrder = structuredClone(CANONICAL_INCIDENT_SCENARIOS);
    [wrongOrder[0], wrongOrder[1]] = [wrongOrder[1]!, wrongOrder[0]!];
    expect(CanonicalIncidentScenarioCatalogSchema.safeParse(wrongOrder).success).toBe(false);
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
        statement: formatUntrustedEvidence(candidate.summary),
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

  it('strictly bounds remediation lifecycle, ordering, fallback, and factual references', () => {
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
        question: 'Why did revenue drop after the schema change?',
        entityHints: [selected.name],
        symptoms: ['Revenue field is missing.'],
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
    const hypothesis = {
      id: 'hypothesis-change-removed-column',
      rank: 1,
      sourceChangeId: 'change-removed-column',
      observedAt: '2026-07-18T07:45:00.000Z',
      summary:
        'Plausible contributor: the removed schema change on raw.orders may have contributed to the incident.',
      confidence: 0.85,
      evidenceIds: ['change-removed-column'],
      factors: [
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
          contributionBasisPoints: 1_500,
          weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.symptom_category_fit,
        },
        {
          code: 'evidence_quality' as const,
          label: HYPOTHESIS_SCORE_FACTOR_LABELS.evidence_quality,
          contributionBasisPoints: 2_000,
          weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.evidence_quality,
        },
      ],
    };
    const scoringResult = {
      status: 'completed' as const,
      hypotheses: [hypothesis],
      missingInformation: [],
    };
    const report = InvestigationReportSchema.parse({
      incidentId: 'incident-remediation-contract',
      summary: 'A scored plausible contributor is available for human review.',
      entities: [selected, upstream],
      evidence: [
        {
          id: 'change-removed-column',
          category: 'schema-change',
          statement: 'Column gross_revenue was removed from raw.orders.',
          sourceEntity: upstream,
          observedAt: '2026-07-18T07:45:00.000Z',
        },
      ],
      hypotheses: [hypothesis],
      recommendations: [],
      assumptions: [],
      missingInformation: [],
    });
    const references = {
      hypothesisIds: [hypothesis.id],
      evidenceIds: ['change-removed-column'],
      entityUrns: [upstream.urn],
      changeIds: ['change-removed-column'],
    };
    const verification = {
      id: 'verify-change-removed-column',
      type: 'recommended_verification' as const,
      priority: 'high' as const,
      status: 'not_executed' as const,
      sourceHypothesisRank: 1,
      title: 'Recommended verification: confirm the observed schema change',
      rationale:
        'The ranked factual change supports human review of a plausible contributor, not a confirmed cause.',
      verificationStep: 'Verify the schema contract in a read-only review.',
      reversibilityNote: 'Read-only verification requires no rollback.',
      references,
    };
    const potentialRemediation = {
      ...verification,
      id: 'remediate-change-removed-column',
      type: 'potential_remediation' as const,
      title: 'Potential remediation: prepare a reversible schema compatibility change',
      verificationStep: 'Verify a non-production compatibility plan before approval.',
      reversibilityNote: 'Do not apply automatically; require a reviewed rollback plan.',
    };
    const result = {
      status: 'completed' as const,
      recommendations: [verification, potentialRemediation],
      missingInformation: [],
      nextSteps: [],
    };

    expect(RemediationPlanningStageSchema.safeParse({ status: 'planning' }).success).toBe(true);
    expect(
      IncidentRemediationPlanningSchema.safeParse({
        contextStage,
        scoringResult,
        report,
        result,
      }).success,
    ).toBe(true);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...result,
        recommendations: [potentialRemediation, verification],
      }).success,
    ).toBe(false);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...result,
        recommendations: [verification, { ...verification, id: 'verify-duplicate' }],
      }).success,
    ).toBe(false);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...result,
        recommendations: Array.from({ length: 6 }, (_, index) => ({
          ...verification,
          id: `verify-change-${index}`,
          references: { ...references, changeIds: [`change-${index}`] },
        })),
      }).success,
    ).toBe(false);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...result,
        recommendations: [{ ...verification, rawProviderPayload: { secret: true } }],
      }).success,
    ).toBe(false);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...result,
        recommendations: [
          {
            ...verification,
            rationale: 'This change is the confirmed root cause and caused the incident.',
          },
        ],
      }).success,
    ).toBe(false);

    for (const [referenceKind, value] of [
      ['hypothesisIds', ['hypothesis-invented']],
      ['evidenceIds', ['evidence-invented']],
      ['entityUrns', ['urn:li:dataset:invented']],
      ['changeIds', ['change-invented']],
    ] as const) {
      expect(
        IncidentRemediationPlanningSchema.safeParse({
          contextStage,
          scoringResult,
          report,
          result: {
            ...result,
            recommendations: [
              {
                ...verification,
                references: { ...references, [referenceKind]: value },
              },
            ],
          },
        }).success,
      ).toBe(false);
    }

    const insufficient = {
      status: 'insufficient' as const,
      recommendations: [],
      missingInformation: [
        {
          code: 'scored_hypotheses_insufficient' as const,
          message: 'No complete scored hypothesis is available.',
        },
      ],
      nextSteps: [
        {
          id: 'inspect_scored_evidence' as const,
          kind: 'safe_diagnostic' as const,
          status: 'not_executed' as const,
          description: REMEDIATION_FALLBACK_STEP_TEXT.inspect_scored_evidence,
        },
        {
          id: 'continue_fixture_mode' as const,
          kind: 'fixture_continuation' as const,
          status: 'not_executed' as const,
          description: REMEDIATION_FALLBACK_STEP_TEXT.continue_fixture_mode,
        },
      ],
    };
    expect(RemediationPlanningStageSchema.safeParse(insufficient).success).toBe(true);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...insufficient,
        nextSteps: insufficient.nextSteps.slice(0, 1),
      }).success,
    ).toBe(false);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...insufficient,
        nextSteps: [...insufficient.nextSteps].reverse(),
      }).success,
    ).toBe(false);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...insufficient,
        recommendations: [verification],
      }).success,
    ).toBe(false);
    expect(
      RemediationPlanningStageSchema.safeParse({
        ...insufficient,
        status: 'unavailable',
        error: {
          code: 'SCORING_UNAVAILABLE',
          message: 'Scored hypotheses are unavailable.',
          stack: 'secret stack',
        },
      }).success,
    ).toBe(false);
    const unsupportedContext = IncidentContextCompletedStageSchema.parse({
      ...contextStage,
      facts: {
        ...contextStage.facts,
        recentChanges: contextStage.facts.recentChanges.map((response) => ({
          ...response,
          changes: response.changes.map((change) => ({
            ...change,
            category: 'documentation',
          })),
        })),
      },
    });
    expect(
      IncidentRemediationPlanningSchema.safeParse({
        contextStage: unsupportedContext,
        scoringResult,
        report,
        result,
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

  it('enforces strict liveness and mode-specific readiness invariants', () => {
    expect(HealthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(HealthResponseSchema.safeParse({ status: 'ok', mode: 'fixture' }).success).toBe(false);

    expect(
      ReadinessResponseSchema.parse({
        status: 'ready',
        mode: 'fixture',
        checks: [{ name: 'fixture_assets', status: 'ready' }],
      }),
    ).toEqual({
      status: 'ready',
      mode: 'fixture',
      checks: [{ name: 'fixture_assets', status: 'ready' }],
    });
    expect(
      ReadinessResponseSchema.safeParse({
        status: 'not_ready',
        mode: 'datahub',
        checks: [
          {
            name: 'datahub',
            status: 'not_ready',
            reasonCode: 'DATAHUB_TIMEOUT',
          },
          { name: 'investigation_runtime', status: 'ready' },
          {
            name: 'model',
            status: 'not_required',
            reasonCode: 'MODEL_NOT_REQUIRED',
          },
        ],
      }).success,
    ).toBe(true);

    for (const invalidResponse of [
      {
        status: 'ready',
        mode: 'datahub',
        checks: [
          {
            name: 'datahub',
            status: 'not_ready',
            reasonCode: 'DATAHUB_UNAVAILABLE',
          },
          { name: 'investigation_runtime', status: 'ready' },
          {
            name: 'model',
            status: 'not_required',
            reasonCode: 'MODEL_NOT_REQUIRED',
          },
        ],
      },
      {
        status: 'ready',
        mode: 'fixture',
        checks: [{ name: 'datahub', status: 'ready' }],
      },
      {
        status: 'ready',
        mode: 'fixture',
        checks: [
          {
            name: 'fixture_assets',
            status: 'ready',
            reasonCode: 'FIXTURE_ASSETS_INVALID',
          },
        ],
      },
      {
        status: 'not_ready',
        mode: 'datahub',
        checks: [
          {
            name: 'datahub',
            status: 'not_ready',
            reasonCode: 'MODEL_TIMEOUT',
          },
          { name: 'investigation_runtime', status: 'ready' },
          {
            name: 'model',
            status: 'not_required',
            reasonCode: 'MODEL_NOT_REQUIRED',
          },
        ],
      },
    ]) {
      expect(ReadinessResponseSchema.safeParse(invalidResponse).success).toBe(false);
    }
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
          candidateEntities: [
            {
              urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
              name: 'analytics.daily_revenue',
              kind: 'dataset',
            },
          ],
          selectedEntity: {
            urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
            name: 'analytics.daily_revenue',
            kind: 'dataset',
          },
          recentChanges: [],
        },
        missingInformation: [],
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
      remediationStage: {
        status: 'insufficient',
        recommendations: [],
        missingInformation: [
          {
            code: 'scored_hypotheses_insufficient',
            message: 'Scored hypotheses are insufficient for remediation planning.',
          },
        ],
        nextSteps: [
          {
            id: 'inspect_scored_evidence',
            kind: 'safe_diagnostic',
            status: 'not_executed',
            description: REMEDIATION_FALLBACK_STEP_TEXT.inspect_scored_evidence,
          },
          {
            id: 'continue_fixture_mode',
            kind: 'fixture_continuation',
            status: 'not_executed',
            description: REMEDIATION_FALLBACK_STEP_TEXT.continue_fixture_mode,
          },
        ],
      },
      execution: {
        toolCalls: 8,
        agentSteps: 5,
        durationMs: 250,
        lineageEntitiesVisited: 3,
        retries: 0,
        terminationReason: 'completed',
      },
      eventTrail: [
        {
          id: 'event-0001',
          sequence: 1,
          timestamp: '2026-07-21T00:00:00.000Z',
          actionType: 'question_normalized',
          summary: INVESTIGATION_EVENT_ACTION_SUMMARIES.question_normalized,
        },
        {
          id: 'event-0002',
          sequence: 2,
          timestamp: '2026-07-21T00:00:01.000Z',
          actionType: 'evidence_collected',
          summary: INVESTIGATION_EVENT_ACTION_SUMMARIES.evidence_collected,
          evidenceIds: ['change-1'],
        },
        {
          id: 'event-0003',
          sequence: 3,
          timestamp: '2026-07-21T00:00:02.000Z',
          actionType: 'investigation_terminated',
          summary: INVESTIGATION_COMPLETED_EVENT_SUMMARY,
          terminationReason: 'completed',
          durationMs: 250,
        },
      ],
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
