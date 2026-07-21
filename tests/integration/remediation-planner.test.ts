import { describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicHypothesisScorer,
  DeterministicIncidentContextGatherer,
  DeterministicInvestigationRunner,
  DeterministicRemediationPlanner,
  DeterministicSuspiciousChangeDetector,
  FIXTURE_INVESTIGATION_LIMITS,
  type IncidentContextMetadata,
} from '../../packages/agent-core/src/index.js';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';
import {
  formatUntrustedEvidence,
  IncidentContextCompletedStageSchema,
  IncidentRequestSchema,
  InvestigationReportSchema,
  type Evidence,
  type HypothesisScoringStage,
  type IncidentContextCompletedStage,
  type SuspiciousChangeDetectionResult,
} from '../../packages/shared-types/src/index.js';

const incidentId = 'remediation-fixture-incident';

function evidenceFor(
  context: IncidentContextCompletedStage,
  suspicious: SuspiciousChangeDetectionResult,
): Evidence[] {
  if (suspicious.status !== 'completed') return [];
  return suspicious.candidates.map((candidate) => {
    const entity = context.facts.lineage?.nodes.find((node) => node.urn === candidate.entityUrn);
    if (!entity) throw new Error('Expected candidate entity in factual lineage.');
    return {
      id: candidate.changeId,
      category:
        candidate.category === 'schema'
          ? 'schema-change'
          : candidate.category === 'pipeline'
            ? 'pipeline'
            : candidate.category === 'ownership'
              ? 'ownership'
              : 'metadata',
      statement: formatUntrustedEvidence(candidate.summary),
      sourceEntity: { urn: entity.urn, name: entity.name, kind: entity.kind },
      observedAt: candidate.observedAt,
    };
  });
}

async function canonicalInputs(metadata?: IncidentContextMetadata) {
  const adapter = createFixtureMetadataAdapter();
  const request = IncidentRequestSchema.parse(canonicalIncident.request);
  const context = await new DeterministicIncidentContextGatherer().gather(request, {
    metadata: metadata ?? adapter,
    mode: 'fixture',
    limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
  });
  const suspicious = new DeterministicSuspiciousChangeDetector().detect(context);
  const report = await new DeterministicInvestigationRunner().investigate(request, {
    incidentId,
    metadata: adapter,
    limits: FIXTURE_INVESTIGATION_LIMITS,
  });
  const scoring = new DeterministicHypothesisScorer().score(context, suspicious, report.evidence);
  if (scoring.status !== 'completed') throw new Error('Expected completed canonical scoring.');
  const scoredReport = InvestigationReportSchema.parse({
    ...report,
    summary: `The strongest evidence-backed inference is: ${scoring.hypotheses[0]?.summary ?? ''}`,
    hypotheses: scoring.hypotheses,
  });
  return { context, suspicious, scoring, report: scoredReport };
}

describe('deterministic remediation and safe fallback planner', () => {
  it('derives the exact canonical manual recommendations with stable resolved references', async () => {
    const { context, scoring, report } = await canonicalInputs();
    const planner = new DeterministicRemediationPlanner();

    const first = planner.plan(context, scoring, report);
    const second = planner.plan(context, scoring, report);

    expect(second).toEqual(first);
    expect(first).toEqual({
      status: 'completed',
      recommendations: [
        {
          id: 'verify-change-removed-gross-revenue',
          type: 'recommended_verification',
          priority: 'high',
          status: 'not_executed',
          sourceHypothesisRank: 1,
          title: 'Recommended verification: confirm the observed schema change',
          rationale:
            'The rank-linked removed schema fact on raw.orders is cited by exact evidence change-removed-gross-revenue; it supports human review of a plausible contributor, not a confirmed cause.',
          verificationStep:
            'Verify the current schema contract and downstream field usage against the cited change evidence in a read-only review.',
          reversibilityNote: 'Read-only verification makes no change, so no rollback is required.',
          references: {
            hypothesisIds: ['hypothesis-change-removed-gross-revenue'],
            evidenceIds: ['change-removed-gross-revenue'],
            entityUrns: ['urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)'],
            changeIds: ['change-removed-gross-revenue'],
          },
        },
        {
          id: 'remediate-change-removed-gross-revenue',
          type: 'potential_remediation',
          priority: 'high',
          status: 'not_executed',
          sourceHypothesisRank: 1,
          title: 'Potential remediation: prepare a reversible schema compatibility change',
          rationale:
            'The rank-linked removed schema fact on raw.orders is cited by exact evidence change-removed-gross-revenue; it supports human review of a plausible contributor, not a confirmed cause.',
          verificationStep:
            'Verify in a non-production review that the proposed compatibility change preserves downstream consumers before approval.',
          reversibilityNote:
            'Do not apply automatically; require a versioned backup and a reviewed rollback to the prior schema contract.',
          references: {
            hypothesisIds: ['hypothesis-change-removed-gross-revenue'],
            evidenceIds: ['change-removed-gross-revenue'],
            entityUrns: ['urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)'],
            changeIds: ['change-removed-gross-revenue'],
          },
        },
      ],
      missingInformation: [],
      nextSteps: [],
    });
    const referenceCatalog = {
      hypotheses: new Set(scoring.hypotheses.map((hypothesis) => hypothesis.id)),
      evidence: new Set(report.evidence.map((evidence) => evidence.id)),
      entities: new Set(report.entities.map((entity) => entity.urn)),
      changes: new Set(
        context.facts.recentChanges.flatMap((response) =>
          response.changes.map((change) => change.id),
        ),
      ),
    };
    if (first.status !== 'completed') throw new Error('Expected completed remediation planning.');
    for (const recommendation of first.recommendations) {
      expect(
        recommendation.references.hypothesisIds.every((id) => referenceCatalog.hypotheses.has(id)),
      ).toBe(true);
      expect(
        recommendation.references.evidenceIds.every((id) => referenceCatalog.evidence.has(id)),
      ).toBe(true);
      expect(
        recommendation.references.entityUrns.every((id) => referenceCatalog.entities.has(id)),
      ).toBe(true);
      expect(
        recommendation.references.changeIds.every((id) => referenceCatalog.changes.has(id)),
      ).toBe(true);
    }
    expect(
      first.recommendations.every((recommendation) => recommendation.status === 'not_executed'),
    ).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/"status":"executed"|confirmed root cause/i);
  });

  it('caps and orders multi-hypothesis recommendations without introducing another score', async () => {
    const canonical = await canonicalInputs();
    const recentChanges = canonical.context.facts.recentChanges[0];
    const canonicalChange = recentChanges?.changes[0];
    if (!recentChanges || !canonicalChange)
      throw new Error('Expected canonical recent-change fact.');
    const changes = ['a', 'b', 'c'].map((suffix) => ({
      ...canonicalChange,
      id: `change-${suffix}`,
      timestamp: `2026-07-18T07:4${3 - ['a', 'b', 'c'].indexOf(suffix)}:00.000Z`,
      summary: `Revenue column field_${suffix} was removed from raw.orders.`,
      field: `field_${suffix}`,
    }));
    const context = IncidentContextCompletedStageSchema.parse({
      ...canonical.context,
      facts: {
        ...canonical.context.facts,
        recentChanges: [{ ...recentChanges, returnedCount: changes.length, changes }],
      },
    });
    const suspicious = new DeterministicSuspiciousChangeDetector().detect(context);
    const evidence = evidenceFor(context, suspicious);
    const scoring = new DeterministicHypothesisScorer().score(context, suspicious, evidence);
    if (scoring.status !== 'completed') throw new Error('Expected multi-hypothesis scoring.');
    const report = InvestigationReportSchema.parse({
      ...canonical.report,
      evidence: [
        ...canonical.report.evidence.filter((item) => item.id !== 'change-removed-gross-revenue'),
        ...evidence,
      ],
      hypotheses: scoring.hypotheses,
    });

    const result = new DeterministicRemediationPlanner().plan(context, scoring, report);

    expect(result.status).toBe('completed');
    if (result.status !== 'completed') throw new Error('Expected capped recommendations.');
    expect(result.recommendations).toHaveLength(5);
    expect(result.recommendations.map((recommendation) => recommendation.type)).toEqual([
      'recommended_verification',
      'potential_remediation',
      'recommended_verification',
      'potential_remediation',
      'recommended_verification',
    ]);
    expect(result.recommendations.map((recommendation) => recommendation.priority)).toEqual([
      'high',
      'high',
      'medium',
      'medium',
      'low',
    ]);
    expect(result.missingInformation).toEqual([
      expect.objectContaining({ code: 'recommendation_limit_reached' }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(/confidence|basisPoints|score/i);
  });

  it('returns reference-free insufficient and unavailable fallbacks with fixture continuation', async () => {
    const { context, scoring, report } = await canonicalInputs();
    const planner = new DeterministicRemediationPlanner();
    const insufficientScoring: HypothesisScoringStage = {
      status: 'insufficient',
      hypotheses: [],
      missingInformation: [
        {
          code: 'suspicious_changes_insufficient',
          message: 'Suspicious changes were insufficient.',
        },
      ],
    };

    const planning = planner.plan({ status: 'gathering' }, { status: 'scoring' });
    const insufficient = planner.plan(context, insufficientScoring, report);
    const unavailable = planner.plan(
      context,
      {
        status: 'unavailable',
        error: {
          code: 'SCORING_INVALID',
          message: 'Safe upstream scoring error.',
        },
      },
      report,
    );
    const incompleteReport = InvestigationReportSchema.parse({
      ...report,
      entities: report.entities.filter(
        (entity) => entity.urn !== 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
      ),
    });
    const unresolved = planner.plan(context, scoring, incompleteReport);
    const unsupportedContext = IncidentContextCompletedStageSchema.parse({
      ...context,
      facts: {
        ...context.facts,
        recentChanges: context.facts.recentChanges.map((response) => ({
          ...response,
          changes: response.changes.map((change) => ({
            ...change,
            category: 'documentation',
          })),
        })),
      },
    });
    const unsupported = planner.plan(unsupportedContext, scoring, report);

    expect(planning).toEqual({ status: 'planning' });
    for (const fallback of [insufficient, unavailable, unresolved, unsupported]) {
      expect(fallback.status).not.toBe('completed');
      if (fallback.status === 'planning' || fallback.status === 'completed') {
        throw new Error('Expected terminal fallback.');
      }
      expect(fallback.recommendations).toEqual([]);
      expect(fallback.nextSteps.some((step) => step.id === 'continue_fixture_mode')).toBe(true);
      expect(JSON.stringify(fallback)).not.toMatch(
        /references|provider\.invalid|secret|confirmed cause/i,
      );
    }
    expect(unsupported).toEqual(
      expect.objectContaining({
        status: 'insufficient',
        missingInformation: [expect.objectContaining({ code: 'unsupported_change_category' })],
      }),
    );
  });

  it('performs zero provider, network, model, credential, or mutation work during planning', async () => {
    const adapter = createFixtureMetadataAdapter();
    const calls = { health: 0, search: 0, lineage: 0, recentChanges: 0 };
    const metadata: IncidentContextMetadata = {
      async healthCheck(options) {
        calls.health += 1;
        return adapter.healthCheck(options);
      },
      async searchEntities(options) {
        calls.search += 1;
        return adapter.searchEntities(options);
      },
      async getLineageGraph(options) {
        calls.lineage += 1;
        return adapter.getLineageGraph(options);
      },
      async getRecentChangesForEntity(options) {
        calls.recentChanges += 1;
        return adapter.getRecentChangesForEntity(options);
      },
    };
    const inputs = await canonicalInputs(metadata);
    const callsBeforePlanning = { ...calls };
    const planner = new DeterministicRemediationPlanner();

    planner.plan(inputs.context, inputs.scoring, inputs.report);

    expect(calls).toEqual(callsBeforePlanning);
    expect(Object.keys(planner)).toEqual([]);
    expect(calls).toEqual({ health: 1, search: 1, lineage: 1, recentChanges: 1 });
  });
});
