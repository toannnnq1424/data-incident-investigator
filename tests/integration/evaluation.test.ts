import { describe, expect, it } from 'vitest';
import {
  CANONICAL_EVALUATION_CASE_IDS,
  CanonicalEvaluationSuiteSchema,
  EvaluationCaseSchema,
  EvaluationObservationSchema,
  EvaluationReportSchema,
  type EvaluationObservation,
} from '../../packages/shared-types/src/index.js';
import {
  CanonicalFakeEvaluationPipeline,
  calculateEvaluationMetrics,
  canonicalEvaluationCases,
  createCanonicalEvaluationArtifacts,
  evaluateCanonicalCase,
  renderEvaluationJson,
  renderEvaluationMarkdown,
  runCanonicalEvaluation,
  type EvaluationPipeline,
} from '../../packages/evaluation/src/index.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe('canonical deterministic evaluation', () => {
  it('owns exactly seven strict cases in the shared stable order with resolved references', () => {
    expect(canonicalEvaluationCases.map((evaluationCase) => evaluationCase.id)).toEqual([
      'removed-schema-column',
      'stale-pipeline',
      'upstream-type-change',
      'wrong-dashboard-dataset',
      'delayed-ingestion',
      'incorrect-owner-or-domain',
      'insufficient-evidence',
    ]);
    expect(canonicalEvaluationCases).toHaveLength(7);
    expect(CANONICAL_EVALUATION_CASE_IDS).toHaveLength(7);
    expect(CanonicalEvaluationSuiteSchema.safeParse(canonicalEvaluationCases).success).toBe(true);
    expect(Object.isFrozen(canonicalEvaluationCases)).toBe(true);
    expect(Object.isFrozen(canonicalEvaluationCases[0]?.expected)).toBe(true);

    const wrongOrder = clone(canonicalEvaluationCases);
    [wrongOrder[0], wrongOrder[1]] = [wrongOrder[1]!, wrongOrder[0]!];
    expect(CanonicalEvaluationSuiteSchema.safeParse(wrongOrder).success).toBe(false);

    const unknownField = { ...clone(canonicalEvaluationCases[0]), unexpected: true };
    expect(EvaluationCaseSchema.safeParse(unknownField).success).toBe(false);
  });

  it('rejects duplicate and dangling expected or observed references without inventing support', async () => {
    const danglingExpected = clone(canonicalEvaluationCases[0]!);
    danglingExpected.expected.hypotheses[0]!.evidenceIds = ['evidence-does-not-exist'];
    expect(EvaluationCaseSchema.safeParse(danglingExpected).success).toBe(false);

    const duplicateEvidence = clone(canonicalEvaluationCases[0]!);
    duplicateEvidence.expected.evidence.push(clone(duplicateEvidence.expected.evidence[0]!));
    expect(EvaluationCaseSchema.safeParse(duplicateEvidence).success).toBe(false);

    const pipeline = new CanonicalFakeEvaluationPipeline();
    const observed = await pipeline.evaluate(canonicalEvaluationCases[0]!);
    const danglingObserved = clone(observed);
    danglingObserved.remediations[0]!.hypothesisIds = ['hypothesis-does-not-exist'];
    expect(EvaluationObservationSchema.safeParse(danglingObserved).success).toBe(false);

    const danglingClaim = clone(observed);
    danglingClaim.claims[0]!.evidenceIds = ['evidence-does-not-exist'];
    expect(EvaluationObservationSchema.safeParse(danglingClaim).success).toBe(false);
  });

  it('computes bounded metric math, explicit unsupported claims, and zero denominators', async () => {
    const pipeline = new CanonicalFakeEvaluationPipeline();
    const removedColumnCase = canonicalEvaluationCases[0]!;
    const observation = clone(await pipeline.evaluate(removedColumnCase));
    observation.entities.push({
      urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,audit.extra_entity,PROD)',
      name: 'audit.extra_entity',
      kind: 'dataset',
    });
    observation.evidence.push({
      id: 'evidence-extra-audit-fact',
      statement: 'Extra fixture evidence is valid but is not part of the expected answer key.',
      factIds: ['fact-removed-schema-column-retrieval'],
      entityUrns: ['urn:li:dataset:(urn:li:dataPlatform:snowflake,audit.extra_entity,PROD)'],
      changeIds: [],
    });
    observation.claims.push({
      id: 'claim-unsupported-audit-example',
      kind: 'inference',
      statement: 'This explicit audit example has no evidence support.',
      evidenceIds: [],
    });
    const parsed = EvaluationObservationSchema.parse(observation);
    const metrics = calculateEvaluationMetrics(removedColumnCase, parsed);

    expect(metrics.retrieval.precision).toEqual({ numerator: 3, denominator: 4, value: 0.75 });
    expect(metrics.retrieval.recall.value).toBe(1);
    expect(metrics.evidence.precision).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
    expect(metrics.evidence.recall.value).toBe(1);
    expect(metrics.unsupportedClaims).toEqual({
      count: 1,
      rate: { numerator: 1, denominator: 4, value: 0.25 },
    });
    expect(metrics.evidence.referenceSupport.value).toBe(1);

    const insufficientCase = canonicalEvaluationCases[6]!;
    const insufficient = await pipeline.evaluate(insufficientCase);
    const zeroMetrics = calculateEvaluationMetrics(insufficientCase, insufficient);
    expect(zeroMetrics.hypotheses.top1Accuracy).toEqual({
      numerator: 0,
      denominator: 0,
      value: 0,
    });
    expect(zeroMetrics.hypotheses.top3Recall.value).toBe(0);
    expect(zeroMetrics.evidence.precision.value).toBe(0);
    expect(zeroMetrics.evidence.recall.value).toBe(0);
    expect(zeroMetrics.unsupportedClaims.rate.value).toBe(0);
  });

  it('produces byte-repeatable JSON and Markdown from one validated report', async () => {
    const first = await createCanonicalEvaluationArtifacts();
    const second = await createCanonicalEvaluationArtifacts();

    expect(second).toEqual(first);
    expect(EvaluationReportSchema.safeParse(first.report).success).toBe(true);
    expect(JSON.parse(first.json)).toEqual(first.report);
    expect(first.json).toBe(renderEvaluationJson(first.report));
    expect(first.markdown).toBe(renderEvaluationMarkdown(first.report));
    expect(first.json).not.toMatch(/generatedAt|evaluatedAt|confirmed cause/i);
    expect(first.markdown).not.toMatch(/confirmed cause/i);

    let previousIndex = -1;
    for (const caseId of CANONICAL_EVALUATION_CASE_IDS) {
      const index = first.markdown.indexOf(`| ${caseId} |`);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
    expect(first.markdown).toContain(
      `Retrieval recall | ${first.report.metrics.retrieval.recall.numerator}/${first.report.metrics.retrieval.recall.denominator} (${first.report.metrics.retrieval.recall.value.toFixed(6)})`,
    );
    expect(first.markdown).toContain(
      `Token use (prompt / completion / total) | 0 / 0 / ${first.report.metrics.tokenUsage.totalTokens}`,
    );
  });

  it('reports exact canonical metrics from declared fake telemetry and the zero-model boundary', async () => {
    const report = await runCanonicalEvaluation();

    expect(report).toMatchObject({
      caseCount: 7,
      completedCaseCount: 7,
      failedCaseCount: 0,
      metrics: {
        retrieval: {
          precision: { numerator: 14, denominator: 14, value: 1 },
          recall: { numerator: 14, denominator: 14, value: 1 },
        },
        hypotheses: {
          top1Accuracy: { numerator: 6, denominator: 6, value: 1 },
          top3Recall: { numerator: 6, denominator: 6, value: 1 },
        },
        evidence: {
          precision: { numerator: 6, denominator: 6, value: 1 },
          recall: { numerator: 6, denominator: 6, value: 1 },
        },
        unsupportedClaims: {
          count: 0,
          rate: { numerator: 0, denominator: 18, value: 0 },
        },
        latencyMs: { total: 168, average: 24, max: 29 },
        toolCalls: { total: 26, average: 3.714286, max: 4 },
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      },
    });
    expect(
      report.results.every(
        (result) =>
          result.status === 'completed' &&
          result.metrics.tokenUsage.totalTokens === 0 &&
          result.observation.telemetry.tokenUsage.totalTokens === 0,
      ),
    ).toBe(true);
    expect(
      report.results.flatMap((result) =>
        result.status === 'completed'
          ? result.observation.telemetry.toolCalls.map((call) => call.tool)
          : [],
      ),
    ).toEqual(
      expect.arrayContaining([
        'metadata.health',
        'metadata.search',
        'metadata.lineage',
        'metadata.recent_changes',
      ]),
    );
  });

  it('sanitizes a case failure, continues the ordered suite, and preserves zero token use', async () => {
    const fallback = new CanonicalFakeEvaluationPipeline();
    const pipeline: EvaluationPipeline = {
      async evaluate(evaluationCase) {
        if (evaluationCase.id === 'removed-schema-column') {
          throw new Error('raw provider https://secret.invalid?token=do-not-leak');
        }
        return fallback.evaluate(evaluationCase);
      },
    };
    const report = await runCanonicalEvaluation(pipeline);
    const serialized = `${renderEvaluationJson(report)}\n${renderEvaluationMarkdown(report)}`;

    expect(report.completedCaseCount).toBe(6);
    expect(report.failedCaseCount).toBe(1);
    expect(report.results[0]).toEqual({
      caseId: 'removed-schema-column',
      status: 'failed',
      error: {
        code: 'evaluation_case_failed',
        message: 'Canonical evaluation case failed safely.',
      },
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });
    expect(report.results.slice(1).every((result) => result.status === 'completed')).toBe(true);
    expect(serialized).not.toContain('secret.invalid');
    expect(serialized).not.toContain('do-not-leak');

    const malformedPipeline: EvaluationPipeline = {
      async evaluate(evaluationCase) {
        const observed = clone(await fallback.evaluate(evaluationCase));
        observed.claims[0]!.evidenceIds = ['dangling-evidence'];
        return observed as EvaluationObservation;
      },
    };
    const failed = await evaluateCanonicalCase(canonicalEvaluationCases[0]!, malformedPipeline);
    expect(failed.status).toBe('failed');
    expect(failed).not.toHaveProperty('observation');
  });

  it('rejects inconsistent report aggregates and caller-supplied telemetry counts', async () => {
    const report = await runCanonicalEvaluation();
    const wrongAggregate = clone(report);
    wrongAggregate.metrics.retrieval.recall.numerator -= 1;
    wrongAggregate.metrics.retrieval.recall.value = Number(
      (
        wrongAggregate.metrics.retrieval.recall.numerator /
        wrongAggregate.metrics.retrieval.recall.denominator
      ).toFixed(6),
    );
    expect(EvaluationReportSchema.safeParse(wrongAggregate).success).toBe(false);

    const wrongToolCount = clone(report);
    const first = wrongToolCount.results[0];
    if (first?.status !== 'completed') throw new Error('Expected a completed fixture result.');
    first.metrics.toolCallCount -= 1;
    expect(EvaluationReportSchema.safeParse(wrongToolCount).success).toBe(false);
  });
});
