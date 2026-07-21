import {
  CANONICAL_EVALUATION_CASE_IDS,
  CANONICAL_INCIDENT_SCENARIOS,
  CanonicalEvaluationSuiteSchema,
  EvaluationCaseFailureSchema,
  EvaluationCaseSuccessSchema,
  EvaluationMetricRateSchema,
  EvaluationObservationSchema,
  EvaluationReportSchema,
  EvaluationTokenUsageSchema,
  HYPOTHESIS_CONFIDENCE_FORMULA_VERSION,
  HYPOTHESIS_SCORE_FACTOR_LABELS,
  HYPOTHESIS_SCORE_FACTOR_WEIGHTS,
  hypothesisConfidenceExplanation,
  hypothesisConfidenceLevel,
  type CanonicalEvaluationCaseId,
  type EvaluationCase as SharedEvaluationCase,
  type EvaluationCaseResult,
  type EvaluationExpectedOutcome,
  type EvaluationMetricRate,
  type EvaluationMetricSet,
  type EvaluationObservation,
  type EvaluationReport,
  type EvaluationTokenUsage,
  type HypothesisScoreFactor,
  type HypothesisScoreReasonCode,
} from '@dii/shared-types';

export type EvaluationCase = SharedEvaluationCase;
export type EvaluationResult = EvaluationCaseResult;

const ZERO_TOKEN_USAGE: EvaluationTokenUsage = Object.freeze({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
});

interface ResolvedCaseInput {
  id: Exclude<CanonicalEvaluationCaseId, 'insufficient-evidence'>;
  entities: EvaluationExpectedOutcome['entities'];
  change: EvaluationExpectedOutcome['changes'][number];
  hypothesisSummary: string;
}

function getCanonicalScenario(id: CanonicalEvaluationCaseId) {
  const scenario = CANONICAL_INCIDENT_SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) {
    throw new Error('Canonical evaluation case must reference a shared incident scenario.');
  }
  return scenario;
}

function evaluationConfidenceFactor(
  code: HypothesisScoreFactor['code'],
  reasonCode: HypothesisScoreReasonCode,
  contributionBasisPoints: number,
  evidenceIds: string[] = [],
): HypothesisScoreFactor {
  return {
    code,
    label: HYPOTHESIS_SCORE_FACTOR_LABELS[code],
    reasonCode,
    contributionBasisPoints,
    weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS[code],
    evidenceIds,
    signalCodes: [],
  };
}

function createEvaluationConfidence(
  input: ResolvedCaseInput,
  evidenceId: string,
  occurredAt: string | undefined,
) {
  const distanceMs = occurredAt
    ? Date.parse(occurredAt) - Date.parse(input.change.observedAt)
    : undefined;
  const temporal =
    distanceMs === undefined || distanceMs < 0
      ? evaluationConfidenceFactor('temporal_proximity', 'temporal_unknown', 0)
      : distanceMs <= 6 * 60 * 60 * 1_000
        ? evaluationConfidenceFactor('temporal_proximity', 'temporal_near', 2_500, [evidenceId])
        : distanceMs <= 24 * 60 * 60 * 1_000
          ? evaluationConfidenceFactor('temporal_proximity', 'temporal_related', 1_800, [
              evidenceId,
            ])
          : evaluationConfidenceFactor('temporal_proximity', 'temporal_far', 800, [evidenceId]);
  const primaryEntity = input.entities[0];
  const lineage =
    primaryEntity?.urn === input.change.entityUrn
      ? evaluationConfidenceFactor('lineage_relationship', 'lineage_selected_entity', 1_200, [
          evidenceId,
        ])
      : evaluationConfidenceFactor('lineage_relationship', 'lineage_direct_upstream', 2_000, [
          evidenceId,
        ]);
  const schemaOrFreshness =
    input.change.category === 'schema'
      ? evaluationConfidenceFactor('schema_or_freshness_evidence', 'schema_change_present', 1_800, [
          evidenceId,
        ])
      : input.change.category === 'pipeline' || input.change.category === 'ingestion'
        ? evaluationConfidenceFactor(
            'schema_or_freshness_evidence',
            'pipeline_freshness_present',
            1_500,
            [evidenceId],
          )
        : evaluationConfidenceFactor('schema_or_freshness_evidence', 'schema_freshness_absent', 0);
  const factors = [
    temporal,
    lineage,
    schemaOrFreshness,
    evaluationConfidenceFactor('independent_evidence_diversity', 'evidence_sources_one', 700, [
      evidenceId,
    ]),
    evaluationConfidenceFactor('contradictory_evidence', 'contradiction_none', 0),
    evaluationConfidenceFactor('missing_required_information', 'required_information_complete', 0),
  ];
  const scorePercent =
    factors.reduce((total, factor) => total + factor.contributionBasisPoints, 0) / 100;
  return {
    status: 'scored' as const,
    formulaVersion: HYPOTHESIS_CONFIDENCE_FORMULA_VERSION,
    scorePercent,
    level: hypothesisConfidenceLevel(scorePercent),
    explanation: hypothesisConfidenceExplanation(factors),
    factors,
  };
}

function createResolvedCase(input: ResolvedCaseInput): EvaluationCase {
  const scenario = getCanonicalScenario(input.id);
  const evidenceId = input.change.id;
  const hypothesisId = `hypothesis-${input.change.id}`;
  const primaryEntity = input.entities.find((entity) => entity.urn === input.change.entityUrn);
  if (!primaryEntity) {
    throw new Error('Canonical fixture change must reference a declared fixture entity.');
  }

  return {
    id: scenario.id,
    title: scenario.title,
    sourceMode: 'fixture',
    incident: scenario.incident,
    expected: {
      facts: [
        {
          id: `fact-${input.id}-retrieval`,
          statement: `Fixture retrieval identifies ${input.entities.map((entity) => entity.name).join(', ')} as bounded incident context.`,
          entityUrns: input.entities.map((entity) => entity.urn),
          changeIds: [],
        },
        {
          id: `fact-${input.id}-change`,
          statement: `Fixture metadata records: ${input.change.summary}`,
          entityUrns: [input.change.entityUrn],
          changeIds: [input.change.id],
        },
      ],
      entities: input.entities,
      changes: [input.change],
      evidence: [
        {
          id: evidenceId,
          statement: input.change.summary,
          factIds: [`fact-${input.id}-change`],
          entityUrns: [input.change.entityUrn],
          changeIds: [input.change.id],
        },
      ],
      hypotheses: [
        {
          id: hypothesisId,
          rank: 1,
          summary: input.hypothesisSummary,
          confidence: createEvaluationConfidence(input, evidenceId, scenario.incident.occurredAt),
          evidenceIds: [evidenceId],
          entityUrns: [input.change.entityUrn],
          changeIds: [input.change.id],
        },
      ],
      remediations: [
        {
          id: `verify-${input.change.id}`,
          title: `Recommended verification: inspect ${primaryEntity.name} evidence in read-only mode`,
          status: 'not_executed',
          hypothesisIds: [hypothesisId],
          evidenceIds: [evidenceId],
          entityUrns: [input.change.entityUrn],
          changeIds: [input.change.id],
        },
      ],
    },
  };
}

const unresolvedScenario = getCanonicalScenario('insufficient-evidence');

const unresolvedCase: EvaluationCase = {
  id: unresolvedScenario.id,
  title: unresolvedScenario.title,
  sourceMode: 'fixture',
  incident: unresolvedScenario.incident,
  expected: {
    facts: [
      {
        id: 'fact-insufficient-evidence-bounded-search',
        statement:
          'Fixture retrieval identifies the requested metric but contains no recent change evidence or supported plausible contributor.',
        entityUrns: [
          'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.unknown_metric,PROD)',
        ],
        changeIds: [],
      },
    ],
    entities: [
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.unknown_metric,PROD)',
        name: 'analytics.unknown_metric',
        kind: 'dataset',
      },
    ],
    changes: [],
    evidence: [],
    hypotheses: [],
    remediations: [],
  },
};

const canonicalCaseInputs: EvaluationCase[] = [
  createResolvedCase({
    id: 'removed-schema-column',
    entities: [
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
        name: 'analytics.daily_revenue',
        kind: 'dataset',
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
        name: 'raw.orders',
        kind: 'dataset',
      },
      {
        urn: 'urn:li:dashboard:(looker,revenue-overview)',
        name: 'Revenue overview',
        kind: 'dashboard',
      },
    ],
    change: {
      id: 'change-removed-gross-revenue',
      entityUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
      category: 'schema',
      operation: 'removed',
      observedAt: '2026-07-18T07:45:00.000Z',
      summary: 'Column gross_revenue was removed from raw.orders.',
    },
    hypothesisSummary:
      'Plausible contributor: the removed gross_revenue column on upstream raw.orders may have contributed to the revenue incident.',
  }),
  createResolvedCase({
    id: 'stale-pipeline',
    entities: [
      {
        urn: 'urn:li:dataJob:(airflow,warehouse,daily-orders)',
        name: 'warehouse.daily_orders',
        kind: 'pipeline',
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_orders,PROD)',
        name: 'analytics.daily_orders',
        kind: 'dataset',
      },
    ],
    change: {
      id: 'change-daily-orders-run-failed',
      entityUrn: 'urn:li:dataJob:(airflow,warehouse,daily-orders)',
      category: 'pipeline',
      operation: 'failed',
      observedAt: '2026-07-18T04:05:00.000Z',
      summary: 'The fixture records a failed daily orders pipeline run.',
    },
    hypothesisSummary:
      'Plausible contributor: the recorded failed daily orders pipeline run may have contributed to stale output.',
  }),
  createResolvedCase({
    id: 'upstream-type-change',
    entities: [
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.customer_events,PROD)',
        name: 'raw.customer_events',
        kind: 'dataset',
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.customer_sessions,PROD)',
        name: 'analytics.customer_sessions',
        kind: 'dataset',
      },
    ],
    change: {
      id: 'change-customer-id-type',
      entityUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.customer_events,PROD)',
      category: 'schema',
      operation: 'modified',
      observedAt: '2026-07-18T09:20:00.000Z',
      summary: 'The fixture records customer_id changing from integer to string upstream.',
    },
    hypothesisSummary:
      'Plausible contributor: the recorded upstream customer_id type change may have contributed to rejected session records.',
  }),
  createResolvedCase({
    id: 'wrong-dashboard-dataset',
    entities: [
      {
        urn: 'urn:li:dashboard:(looker,executive-revenue)',
        name: 'Executive revenue dashboard',
        kind: 'dashboard',
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.revenue_certified,PROD)',
        name: 'analytics.revenue_certified',
        kind: 'dataset',
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,staging.revenue_preview,PROD)',
        name: 'staging.revenue_preview',
        kind: 'dataset',
      },
    ],
    change: {
      id: 'change-dashboard-source-link',
      entityUrn: 'urn:li:dashboard:(looker,executive-revenue)',
      category: 'lineage',
      operation: 'modified',
      observedAt: '2026-07-18T10:35:00.000Z',
      summary: 'The fixture records the dashboard source link changing to staging.revenue_preview.',
    },
    hypothesisSummary:
      'Plausible contributor: the recorded dashboard source-link change may have contributed to staging values appearing.',
  }),
  createResolvedCase({
    id: 'delayed-ingestion',
    entities: [
      {
        urn: 'urn:li:dataJob:(airflow,ingestion,mobile-events)',
        name: 'ingestion.mobile_events',
        kind: 'pipeline',
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.mobile_funnel,PROD)',
        name: 'analytics.mobile_funnel',
        kind: 'dataset',
      },
    ],
    change: {
      id: 'change-mobile-events-delay',
      entityUrn: 'urn:li:dataJob:(airflow,ingestion,mobile-events)',
      category: 'ingestion',
      operation: 'delayed',
      observedAt: '2026-07-18T08:15:00.000Z',
      summary: 'The fixture records mobile event ingestion four hours behind schedule.',
    },
    hypothesisSummary:
      'Plausible contributor: the recorded mobile ingestion delay may have contributed to missing funnel events.',
  }),
  createResolvedCase({
    id: 'incorrect-owner-or-domain',
    entities: [
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,finance.monthly_close,PROD)',
        name: 'finance.monthly_close',
        kind: 'dataset',
      },
    ],
    change: {
      id: 'change-monthly-close-owner',
      entityUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,finance.monthly_close,PROD)',
      category: 'ownership',
      operation: 'modified',
      observedAt: '2026-07-18T12:20:00.000Z',
      summary:
        'The fixture records finance.monthly_close ownership changing to the marketing team.',
    },
    hypothesisSummary:
      'Plausible contributor: the recorded ownership change may have contributed to incorrect incident routing.',
  }),
  unresolvedCase,
];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export const canonicalEvaluationCases: readonly EvaluationCase[] = deepFreeze(
  CanonicalEvaluationSuiteSchema.parse(canonicalCaseInputs),
);

const declaredLatencyByCase: Record<CanonicalEvaluationCaseId, number> = {
  'removed-schema-column': 24,
  'stale-pipeline': 25,
  'upstream-type-change': 26,
  'wrong-dashboard-dataset': 27,
  'delayed-ingestion': 28,
  'incorrect-owner-or-domain': 29,
  'insufficient-evidence': 9,
};

export interface EvaluationPipeline {
  evaluate(evaluationCase: EvaluationCase): Promise<EvaluationObservation>;
}

export class CanonicalFakeEvaluationPipeline implements EvaluationPipeline {
  async evaluate(evaluationCase: EvaluationCase): Promise<EvaluationObservation> {
    const hasEvidence = evaluationCase.expected.evidence.length > 0;
    const toolCalls = hasEvidence
      ? [
          {
            sequence: 1,
            tool: 'metadata.health' as const,
            status: 'completed' as const,
            durationMs: 3,
          },
          {
            sequence: 2,
            tool: 'metadata.search' as const,
            status: 'completed' as const,
            durationMs: 5,
          },
          {
            sequence: 3,
            tool: 'metadata.lineage' as const,
            status: 'completed' as const,
            durationMs: 6,
          },
          {
            sequence: 4,
            tool: 'metadata.recent_changes' as const,
            status: 'completed' as const,
            durationMs: 7,
          },
        ]
      : [
          {
            sequence: 1,
            tool: 'metadata.health' as const,
            status: 'completed' as const,
            durationMs: 3,
          },
          {
            sequence: 2,
            tool: 'metadata.search' as const,
            status: 'completed' as const,
            durationMs: 4,
          },
        ];
    const claims = [
      ...evaluationCase.expected.evidence.map((evidence) => ({
        id: `claim-${evaluationCase.id}-${evidence.id}`,
        kind: 'fact' as const,
        statement: evidence.statement,
        evidenceIds: [evidence.id],
      })),
      ...evaluationCase.expected.hypotheses.map((hypothesis) => ({
        id: `claim-${evaluationCase.id}-${hypothesis.id}`,
        kind: 'inference' as const,
        statement: hypothesis.summary,
        evidenceIds: hypothesis.evidenceIds,
      })),
      ...evaluationCase.expected.remediations.map((remediation) => ({
        id: `claim-${evaluationCase.id}-${remediation.id}`,
        kind: 'recommendation' as const,
        statement: remediation.title,
        evidenceIds: remediation.evidenceIds,
      })),
    ];

    return EvaluationObservationSchema.parse({
      ...evaluationCase.expected,
      claims,
      telemetry: {
        latencyMs: declaredLatencyByCase[evaluationCase.id],
        toolCalls,
        tokenUsage: ZERO_TOKEN_USAGE,
      },
    });
  }
}

function metricRate(numerator: number, denominator: number): EvaluationMetricRate {
  return EvaluationMetricRateSchema.parse({
    numerator,
    denominator,
    value: denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6)),
  });
}

function matchingCount(expectedIds: string[], observedIds: string[]) {
  const expected = new Set(expectedIds);
  return new Set(observedIds.filter((id) => expected.has(id))).size;
}

function observedReferenceCounts(observation: EvaluationObservation) {
  const entityUrns = new Set(observation.entities.map((entity) => entity.urn));
  const factIds = new Set(observation.facts.map((fact) => fact.id));
  const changeIds = new Set(observation.changes.map((change) => change.id));
  const evidenceIds = new Set(observation.evidence.map((evidence) => evidence.id));
  const hypothesisIds = new Set(observation.hypotheses.map((hypothesis) => hypothesis.id));
  const references: [string, Set<string>][] = [];
  const add = (values: string[], catalog: Set<string>) => {
    values.forEach((value) => references.push([value, catalog]));
  };
  observation.changes.forEach((change) => add([change.entityUrn], entityUrns));
  observation.facts.forEach((fact) => {
    add(fact.entityUrns, entityUrns);
    add(fact.changeIds, changeIds);
  });
  observation.evidence.forEach((evidence) => {
    add(evidence.factIds, factIds);
    add(evidence.entityUrns, entityUrns);
    add(evidence.changeIds, changeIds);
  });
  observation.hypotheses.forEach((hypothesis) => {
    add(hypothesis.evidenceIds, evidenceIds);
    add(hypothesis.entityUrns, entityUrns);
    add(hypothesis.changeIds, changeIds);
  });
  observation.remediations.forEach((remediation) => {
    add(remediation.hypothesisIds, hypothesisIds);
    add(remediation.evidenceIds, evidenceIds);
    add(remediation.entityUrns, entityUrns);
    add(remediation.changeIds, changeIds);
  });
  observation.claims.forEach((claim) => add(claim.evidenceIds, evidenceIds));
  return {
    supported: references.filter(([value, catalog]) => catalog.has(value)).length,
    total: references.length,
  };
}

export function calculateEvaluationMetrics(
  evaluationCase: EvaluationCase,
  observation: EvaluationObservation,
): EvaluationMetricSet {
  const expectedEntityUrns = evaluationCase.expected.entities.map((entity) => entity.urn);
  const observedEntityUrns = observation.entities.map((entity) => entity.urn);
  const retrievedEntities = matchingCount(expectedEntityUrns, observedEntityUrns);
  const expectedHypothesisIds = evaluationCase.expected.hypotheses.map((item) => item.id);
  const observedHypothesisIds = observation.hypotheses.map((item) => item.id);
  const top1Eligible = expectedHypothesisIds.length > 0;
  const top1Match =
    top1Eligible && new Set(expectedHypothesisIds).has(observedHypothesisIds[0] ?? '');
  const top3Matches = matchingCount(expectedHypothesisIds, observedHypothesisIds.slice(0, 3));
  const expectedEvidenceIds = evaluationCase.expected.evidence.map((item) => item.id);
  const observedEvidenceIds = observation.evidence.map((item) => item.id);
  const matchingEvidence = matchingCount(expectedEvidenceIds, observedEvidenceIds);
  const references = observedReferenceCounts(observation);
  const unsupportedClaims = observation.claims.filter(
    (claim) => claim.evidenceIds.length === 0,
  ).length;

  return {
    retrieval: {
      precision: metricRate(retrievedEntities, observedEntityUrns.length),
      recall: metricRate(retrievedEntities, expectedEntityUrns.length),
    },
    hypotheses: {
      top1Match,
      top1Accuracy: metricRate(top1Match ? 1 : 0, top1Eligible ? 1 : 0),
      top3Recall: metricRate(top3Matches, expectedHypothesisIds.length),
    },
    evidence: {
      precision: metricRate(matchingEvidence, observedEvidenceIds.length),
      recall: metricRate(matchingEvidence, expectedEvidenceIds.length),
      referenceSupport: metricRate(references.supported, references.total),
    },
    unsupportedClaims: {
      count: unsupportedClaims,
      rate: metricRate(unsupportedClaims, observation.claims.length),
    },
    latencyMs: observation.telemetry.latencyMs,
    toolCallCount: observation.telemetry.toolCalls.length,
    tokenUsage: EvaluationTokenUsageSchema.parse(observation.telemetry.tokenUsage),
  };
}

export async function evaluateCanonicalCase(
  evaluationCase: EvaluationCase,
  pipeline: EvaluationPipeline,
): Promise<EvaluationCaseResult> {
  try {
    const observation = EvaluationObservationSchema.parse(await pipeline.evaluate(evaluationCase));
    return EvaluationCaseSuccessSchema.parse({
      caseId: evaluationCase.id,
      status: 'completed',
      observation,
      metrics: calculateEvaluationMetrics(evaluationCase, observation),
    });
  } catch {
    return EvaluationCaseFailureSchema.parse({
      caseId: evaluationCase.id,
      status: 'failed',
      error: {
        code: 'evaluation_case_failed',
        message: 'Canonical evaluation case failed safely.',
      },
      tokenUsage: ZERO_TOKEN_USAGE,
    });
  }
}

function aggregateRates(rates: EvaluationMetricRate[]): EvaluationMetricRate {
  return metricRate(
    rates.reduce((total, rate) => total + rate.numerator, 0),
    rates.reduce((total, rate) => total + rate.denominator, 0),
  );
}

function metricSummary(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    total,
    average: values.length ? Number((total / values.length).toFixed(6)) : 0,
    max: values.length ? Math.max(...values) : 0,
  };
}

export async function runCanonicalEvaluation(
  pipeline: EvaluationPipeline = new CanonicalFakeEvaluationPipeline(),
): Promise<EvaluationReport> {
  const cases = CanonicalEvaluationSuiteSchema.parse(canonicalEvaluationCases);
  const results: EvaluationCaseResult[] = [];
  for (const evaluationCase of cases) {
    results.push(await evaluateCanonicalCase(evaluationCase, pipeline));
  }
  const completed = results.filter((result) => result.status === 'completed');
  const unsupportedCount = completed.reduce(
    (total, result) => total + result.metrics.unsupportedClaims.count,
    0,
  );

  return EvaluationReportSchema.parse({
    schemaVersion: 1,
    suiteId: 'canonical-incidents-v1',
    caseOrder: [...CANONICAL_EVALUATION_CASE_IDS],
    caseCount: CANONICAL_EVALUATION_CASE_IDS.length,
    completedCaseCount: completed.length,
    failedCaseCount: results.length - completed.length,
    results,
    metrics: {
      retrieval: {
        precision: aggregateRates(completed.map((result) => result.metrics.retrieval.precision)),
        recall: aggregateRates(completed.map((result) => result.metrics.retrieval.recall)),
      },
      hypotheses: {
        top1Accuracy: aggregateRates(
          completed.map((result) => result.metrics.hypotheses.top1Accuracy),
        ),
        top3Recall: aggregateRates(completed.map((result) => result.metrics.hypotheses.top3Recall)),
      },
      evidence: {
        precision: aggregateRates(completed.map((result) => result.metrics.evidence.precision)),
        recall: aggregateRates(completed.map((result) => result.metrics.evidence.recall)),
        referenceSupport: aggregateRates(
          completed.map((result) => result.metrics.evidence.referenceSupport),
        ),
      },
      unsupportedClaims: {
        count: unsupportedCount,
        rate: aggregateRates(completed.map((result) => result.metrics.unsupportedClaims.rate)),
      },
      latencyMs: metricSummary(completed.map((result) => result.metrics.latencyMs)),
      toolCalls: metricSummary(completed.map((result) => result.metrics.toolCallCount)),
      tokenUsage: ZERO_TOKEN_USAGE,
    },
  });
}

function renderRate(rate: EvaluationMetricRate) {
  return `${rate.numerator}/${rate.denominator} (${rate.value.toFixed(6)})`;
}

function escapeMarkdown(value: string) {
  return value.replaceAll('|', '\\|');
}

export function renderEvaluationJson(report: EvaluationReport) {
  return `${JSON.stringify(EvaluationReportSchema.parse(report), null, 2)}\n`;
}

export function renderEvaluationMarkdown(report: EvaluationReport) {
  const parsed = EvaluationReportSchema.parse(report);
  const lines = [
    '# Canonical incident evaluation',
    '',
    `Suite: \`${parsed.suiteId}\` (schema ${parsed.schemaVersion})`,
    '',
    `Cases: ${parsed.caseCount}; completed: ${parsed.completedCaseCount}; failed: ${parsed.failedCaseCount}.`,
    '',
    '## Aggregate metrics',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Retrieval precision | ${renderRate(parsed.metrics.retrieval.precision)} |`,
    `| Retrieval recall | ${renderRate(parsed.metrics.retrieval.recall)} |`,
    `| Plausible hypothesis top-1 accuracy | ${renderRate(parsed.metrics.hypotheses.top1Accuracy)} |`,
    `| Plausible hypothesis top-3 recall | ${renderRate(parsed.metrics.hypotheses.top3Recall)} |`,
    `| Evidence precision | ${renderRate(parsed.metrics.evidence.precision)} |`,
    `| Evidence recall | ${renderRate(parsed.metrics.evidence.recall)} |`,
    `| Reference support | ${renderRate(parsed.metrics.evidence.referenceSupport)} |`,
    `| Unsupported claims | ${parsed.metrics.unsupportedClaims.count}; ${renderRate(parsed.metrics.unsupportedClaims.rate)} |`,
    `| Latency (total / average / max ms) | ${parsed.metrics.latencyMs.total} / ${parsed.metrics.latencyMs.average} / ${parsed.metrics.latencyMs.max} |`,
    `| Tool calls (total / average / max) | ${parsed.metrics.toolCalls.total} / ${parsed.metrics.toolCalls.average} / ${parsed.metrics.toolCalls.max} |`,
    `| Token use (prompt / completion / total) | ${parsed.metrics.tokenUsage.promptTokens} / ${parsed.metrics.tokenUsage.completionTokens} / ${parsed.metrics.tokenUsage.totalTokens} |`,
    '',
    '## Case metrics',
    '',
    '| Case | Status | Confidence | Retrieval recall | Top-1 | Top-3 recall | Evidence recall | Reference support | Unsupported | Latency ms | Tool calls | Tokens |',
    '| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const result of parsed.results) {
    if (result.status === 'failed') {
      lines.push(
        `| ${escapeMarkdown(result.caseId)} | failed: ${result.error.code} | — | — | — | — | — | — | — | — | — | ${result.tokenUsage.totalTokens} |`,
      );
      continue;
    }
    const confidence = result.observation.hypotheses[0]?.confidence;
    const confidenceCell = confidence
      ? `${confidence.scorePercent}% ${confidence.level} (${confidence.formulaVersion})`
      : 'not scored (insufficient evidence)';
    lines.push(
      `| ${escapeMarkdown(result.caseId)} | completed | ${confidenceCell} | ${renderRate(result.metrics.retrieval.recall)} | ${result.metrics.hypotheses.top1Match ? 'match' : 'no match'} | ${renderRate(result.metrics.hypotheses.top3Recall)} | ${renderRate(result.metrics.evidence.recall)} | ${renderRate(result.metrics.evidence.referenceSupport)} | ${result.metrics.unsupportedClaims.count}; ${renderRate(result.metrics.unsupportedClaims.rate)} | ${result.metrics.latencyMs} | ${result.metrics.toolCallCount} | ${result.metrics.tokenUsage.totalTokens} |`,
    );
  }
  lines.push(
    '',
    'All hypothesis confidence uses the code-owned `evidence-confidence-v1` formula; plausible contributors remain non-causal, recommendations remain `not_executed`, and token use is zero because this suite has no model boundary.',
    '',
  );
  return lines.join('\n');
}

export async function createCanonicalEvaluationArtifacts(
  pipeline: EvaluationPipeline = new CanonicalFakeEvaluationPipeline(),
) {
  const report = await runCanonicalEvaluation(pipeline);
  return {
    report,
    json: renderEvaluationJson(report),
    markdown: renderEvaluationMarkdown(report),
  };
}
