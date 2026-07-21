import { describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicHypothesisScorer,
  DeterministicIncidentContextGatherer,
  DeterministicSuspiciousChangeDetector,
} from '../../packages/agent-core/src/index.js';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';
import {
  formatUntrustedEvidence,
  hypothesisConfidenceExplanation,
  hypothesisConfidenceLevel,
  IncidentContextCompletedStageSchema,
  IncidentRequestSchema,
  InvestigationDraftReportSchema,
  InvestigationReportSchema,
  ScoredHypothesisConfidenceSchema,
  type Evidence,
  type IncidentContextCompletedStage,
  type MetadataRecentChange,
  type SuspiciousChangeDetectionResult,
} from '../../packages/shared-types/src/index.js';

async function canonicalContext() {
  return new DeterministicIncidentContextGatherer().gather(
    IncidentRequestSchema.parse(canonicalIncident.request),
    {
      metadata: createFixtureMetadataAdapter(),
      mode: 'fixture',
      limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
    },
  );
}

function withChanges(
  base: IncidentContextCompletedStage,
  changes: MetadataRecentChange[],
  overrides: Partial<IncidentContextCompletedStage> = {},
) {
  const response = base.facts.recentChanges[0];
  if (!response) throw new Error('Expected canonical recent changes.');
  return IncidentContextCompletedStageSchema.parse({
    ...base,
    ...overrides,
    facts: {
      ...base.facts,
      ...overrides.facts,
      recentChanges: [
        {
          ...response,
          entityUrn: changes[0]?.entityUrn ?? response.entityUrn,
          returnedCount: changes.length,
          changes: [...changes].sort((left, right) =>
            left.timestamp === right.timestamp
              ? left.id.localeCompare(right.id)
              : right.timestamp.localeCompare(left.timestamp),
          ),
        },
      ],
    },
  });
}

function evidenceFor(
  context: IncidentContextCompletedStage,
  suspicious: SuspiciousChangeDetectionResult,
  includeLineage = true,
): Evidence[] {
  if (suspicious.status !== 'completed') return [];
  const entities = new Map(
    [...context.facts.candidateEntities, ...(context.facts.lineage?.nodes ?? [])].map((entity) => [
      entity.urn,
      entity,
    ]),
  );
  const changes = context.facts.recentChanges.flatMap((response) => response.changes);
  const evidence = suspicious.candidates.map((candidate) => {
    const entity = entities.get(candidate.entityUrn);
    const change = changes.find((item) => item.id === candidate.changeId);
    if (!entity || !change) throw new Error('Expected exact candidate facts.');
    return {
      id: change.id,
      category:
        change.category === 'schema'
          ? ('schema-change' as const)
          : change.category === 'pipeline'
            ? ('pipeline' as const)
            : change.category === 'ownership'
              ? ('ownership' as const)
              : ('metadata' as const),
      statement: formatUntrustedEvidence(change.summary),
      sourceEntity: { urn: entity.urn, name: entity.name, kind: entity.kind },
      observedAt: change.timestamp,
    };
  });
  const candidateEntity = entities.get(suspicious.candidates[0]!.entityUrn);
  if (includeLineage && candidateEntity) {
    evidence.push({
      id: 'lineage-support',
      category: 'lineage',
      statement: 'Validated lineage support.',
      sourceEntity: {
        urn: candidateEntity.urn,
        name: candidateEntity.name,
        kind: candidateEntity.kind,
      },
    });
  }
  return evidence;
}

function score(
  context: IncidentContextCompletedStage,
  evidenceTransform: (evidence: Evidence[]) => Evidence[] = (evidence) => evidence,
) {
  const suspicious = new DeterministicSuspiciousChangeDetector().detect(context);
  return new DeterministicHypothesisScorer().score(
    context,
    suspicious,
    evidenceTransform(evidenceFor(context, suspicious)),
  );
}

function topScore(result: ReturnType<typeof score>) {
  if (result.status !== 'completed') throw new Error('Expected completed scoring.');
  const confidence = result.hypotheses[0]?.confidence;
  if (!confidence) throw new Error('Expected top confidence.');
  return confidence;
}

describe('confidence transparency v1', () => {
  it('pins exact stable confidence-band boundaries', () => {
    expect([0, 39, 40, 59, 60, 79, 80, 100].map(hypothesisConfidenceLevel)).toEqual([
      'indeterminate',
      'indeterminate',
      'low',
      'low',
      'medium',
      'medium',
      'high',
      'high',
    ]);
  });

  it('rejects reason, contribution, cap, score, band, or explanation drift', async () => {
    const confidence = topScore(score(await canonicalContext()));
    expect(ScoredHypothesisConfidenceSchema.safeParse(confidence).success).toBe(true);
    const firstFactor = confidence.factors[0]!;
    const withFirstFactor = (factor: typeof firstFactor) => ({
      ...confidence,
      factors: [factor, ...confidence.factors.slice(1)],
    });
    expect(
      ScoredHypothesisConfidenceSchema.safeParse(
        withFirstFactor({ ...firstFactor, contributionBasisPoints: 2_400 }),
      ).success,
    ).toBe(false);
    expect(
      ScoredHypothesisConfidenceSchema.safeParse(
        withFirstFactor({ ...firstFactor, weightBasisPoints: 2_600 }),
      ).success,
    ).toBe(false);
    expect(
      ScoredHypothesisConfidenceSchema.safeParse({ ...confidence, scorePercent: 100 }).success,
    ).toBe(false);
    expect(
      ScoredHypothesisConfidenceSchema.safeParse({ ...confidence, level: 'low' }).success,
    ).toBe(false);
    expect(
      ScoredHypothesisConfidenceSchema.safeParse({
        ...confidence,
        explanation: 'Why: raw metadata says this is certain.',
      }).success,
    ).toBe(false);

    const clampedFactors = confidence.factors.map((factor) => {
      if (factor.code === 'temporal_proximity') {
        return {
          ...factor,
          reasonCode: 'temporal_unknown' as const,
          contributionBasisPoints: 0,
          evidenceIds: [],
          signalCodes: [],
        };
      }
      if (factor.code === 'lineage_relationship') {
        return {
          ...factor,
          reasonCode: 'lineage_none' as const,
          contributionBasisPoints: 0,
          evidenceIds: [],
          signalCodes: [],
        };
      }
      if (factor.code === 'schema_or_freshness_evidence') {
        return {
          ...factor,
          reasonCode: 'schema_freshness_absent' as const,
          contributionBasisPoints: 0,
          evidenceIds: [],
          signalCodes: [],
        };
      }
      if (factor.code === 'independent_evidence_diversity') {
        return {
          ...factor,
          reasonCode: 'evidence_sources_none' as const,
          contributionBasisPoints: 0,
          evidenceIds: [],
          signalCodes: [],
        };
      }
      if (factor.code === 'contradictory_evidence') {
        return {
          ...factor,
          reasonCode: 'contradiction_present' as const,
          contributionBasisPoints: -2_000,
          evidenceIds: ['counter-evidence'],
          signalCodes: [],
        };
      }
      return {
        ...factor,
        reasonCode: 'required_information_multiple_missing' as const,
        contributionBasisPoints: -2_000,
        evidenceIds: [],
        signalCodes: [],
      };
    });
    expect(
      ScoredHypothesisConfidenceSchema.safeParse({
        ...confidence,
        scorePercent: 0,
        level: 'indeterminate',
        explanation: hypothesisConfidenceExplanation(clampedFactors),
        factors: clampedFactors,
      }).success,
    ).toBe(true);
  });

  it('scores temporal near, related, far, and unknown boundaries deterministically', async () => {
    const base = await canonicalContext();
    const original = base.facts.recentChanges[0]?.changes[0];
    if (!original) throw new Error('Expected canonical change.');
    const at = (timestamp: string) => withChanges(base, [{ ...original, timestamp }]);
    const incidentEnd = Date.parse(base.intent.timeWindow.endTime!);
    const beforeIncident = (hours: number, extraMilliseconds = 0) =>
      new Date(incidentEnd - hours * 60 * 60 * 1_000 - extraMilliseconds).toISOString();
    const near = topScore(score(at('2026-07-18T02:30:00.000Z')));
    const related = topScore(score(at('2026-07-17T15:00:00.000Z')));
    const far = topScore(score(at('2026-07-16T03:00:00.000Z')));
    const nearBoundary = topScore(score(at(beforeIncident(6))));
    const relatedBoundary = topScore(score(at(beforeIncident(24))));
    const farBoundary = topScore(score(at(beforeIncident(24, 1))));
    const unknownContext = withChanges(base, [original], {
      intent: {
        ...base.intent,
        question: 'Which schema changed?',
        symptoms: [],
        timeWindow: { basis: 'provider_default', hours: 168 },
      },
    });
    const unknown = topScore(score(unknownContext));

    expect(near.factors[0]).toMatchObject({
      reasonCode: 'temporal_near',
      contributionBasisPoints: 2_500,
    });
    expect(related.factors[0]).toMatchObject({
      reasonCode: 'temporal_related',
      contributionBasisPoints: 1_800,
    });
    expect(far.factors[0]).toMatchObject({
      reasonCode: 'temporal_far',
      contributionBasisPoints: 800,
    });
    expect(nearBoundary.factors[0].reasonCode).toBe('temporal_near');
    expect(relatedBoundary.factors[0].reasonCode).toBe('temporal_related');
    expect(farBoundary.factors[0].reasonCode).toBe('temporal_far');
    expect(unknown.factors[0]).toMatchObject({
      reasonCode: 'temporal_unknown',
      contributionBasisPoints: 0,
    });
    expect(unknown.factors[5]).toMatchObject({
      reasonCode: 'required_information_multiple_missing',
      contributionBasisPoints: -2_000,
    });
  });

  it('distinguishes direct, indirect, and selected-entity lineage without inventing a relation', async () => {
    const base = await canonicalContext();
    const original = base.facts.recentChanges[0]?.changes[0];
    const lineage = base.facts.lineage;
    if (!original || !lineage) throw new Error('Expected canonical lineage facts.');
    const upstream = lineage.nodes.find((node) => node.urn === original.entityUrn);
    if (!upstream) throw new Error('Expected upstream node.');
    const indirect = withChanges(base, [original], {
      facts: {
        ...base.facts,
        lineage: {
          ...lineage,
          nodes: lineage.nodes.map((node) =>
            node.urn === upstream.urn ? { ...node, depth: 2 } : node,
          ),
        },
      },
    });
    const selected = base.facts.selectedEntity;
    if (!selected) throw new Error('Expected selected entity.');
    const selectedChange = {
      ...original,
      id: 'change-selected-schema',
      entityUrn: selected.urn,
      summary: 'Column gross_revenue was removed from analytics.daily_revenue.',
    };
    const selectedContext = withChanges(base, [selectedChange]);

    expect(topScore(score(base)).factors[1]).toMatchObject({
      reasonCode: 'lineage_direct_upstream',
      contributionBasisPoints: 2_000,
    });
    expect(topScore(score(indirect)).factors[1]).toMatchObject({
      reasonCode: 'lineage_indirect_upstream',
      contributionBasisPoints: 800,
    });
    expect(topScore(score(selectedContext)).factors[1]).toMatchObject({
      reasonCode: 'lineage_selected_entity',
      contributionBasisPoints: 1_200,
    });
    const noLineage = IncidentContextCompletedStageSchema.parse({
      ...base,
      facts: {
        ...base.facts,
        lineage: undefined,
        recentChanges: [],
      },
      missingInformation: [
        ...base.missingInformation,
        {
          code: 'lineage_not_found',
          message: 'No upstream lineage facts were available for the selected entity.',
        },
      ],
    });
    const noLineageDetection = new DeterministicSuspiciousChangeDetector().detect(noLineage);
    expect(noLineageDetection.status).toBe('insufficient');
    expect(
      new DeterministicHypothesisScorer().score(noLineage, noLineageDetection, []),
    ).toMatchObject({
      status: 'insufficient',
      hypotheses: [],
    });
  });

  it('uses schema or pipeline freshness evidence and deduplicates independent source categories', async () => {
    const base = await canonicalContext();
    const original = base.facts.recentChanges[0]?.changes[0];
    if (!original) throw new Error('Expected canonical change.');
    const pipelineContext = withChanges(
      base,
      [
        {
          ...original,
          id: 'change-pipeline-freshness',
          category: 'pipeline',
          operation: 'modified',
          summary: 'Pipeline freshness metadata was modified for raw.orders.',
          field: undefined,
        },
      ],
      {
        intent: {
          ...base.intent,
          question: 'Which pipeline freshness metadata changed?',
        },
      },
    );
    const pipelineConfidence = topScore(score(pipelineContext));
    expect(pipelineConfidence.factors[2]).toMatchObject({
      reasonCode: 'pipeline_freshness_present',
      contributionBasisPoints: 1_500,
    });

    const first = score(base);
    const singleSource = score(base, (evidence) =>
      evidence.filter((item) => item.id !== 'lineage-support'),
    );
    const thirdSource = score(base, (evidence) => [
      ...evidence,
      {
        id: 'metadata-support',
        category: 'metadata',
        statement: 'Validated metadata support.',
        sourceEntity: evidence[0]!.sourceEntity,
      },
    ]);
    const duplicateLineage = score(base, (evidence) => [
      ...evidence,
      {
        ...evidence.find((item) => item.id === 'lineage-support')!,
        id: 'lineage-support-duplicate',
      },
    ]);
    expect(duplicateLineage).toEqual(first);
    expect(topScore(first).factors[3]).toMatchObject({
      reasonCode: 'evidence_sources_two',
      contributionBasisPoints: 1_800,
      evidenceIds: expect.arrayContaining(['lineage-support']),
    });
    expect(topScore(singleSource).factors[3]).toMatchObject({
      reasonCode: 'evidence_sources_one',
      contributionBasisPoints: 700,
    });
    expect(topScore(thirdSource).factors[3]).toMatchObject({
      reasonCode: 'evidence_sources_three_plus',
      contributionBasisPoints: 2_700,
    });
  });

  it('caps contradiction and missing-information penalties and rejects unresolved counter-evidence', async () => {
    const base = await canonicalContext();
    const removed = base.facts.recentChanges[0]?.changes[0];
    if (!removed) throw new Error('Expected canonical change.');
    const added: MetadataRecentChange = {
      ...removed,
      id: 'change-added-gross-revenue',
      timestamp: '2026-07-18T08:00:00.000Z',
      operation: 'added',
      summary: 'Column gross_revenue was added to raw.orders.',
    };
    const contradictory = withChanges(base, [added, removed]);
    const scored = score(contradictory);
    if (scored.status !== 'completed') throw new Error('Expected contradictory scored hypotheses.');
    const removedHypothesis = scored.hypotheses.find(
      (hypothesis) => hypothesis.sourceChangeId === removed.id,
    );
    expect(removedHypothesis?.confidence.factors[4]).toMatchObject({
      reasonCode: 'contradiction_present',
      contributionBasisPoints: -2_000,
      evidenceIds: [added.id],
    });
    expect(removedHypothesis?.confidence.scorePercent).toBe(61);

    const unresolved = score(contradictory, (evidence) =>
      evidence.filter((item) => item.id !== added.id),
    );
    expect(unresolved).toMatchObject({
      status: 'insufficient',
      hypotheses: [],
      missingInformation: [expect.objectContaining({ code: 'evidence_reference_unresolved' })],
    });
  });

  it('is byte-stable under evidence ordering and does not leak raw intake or metadata into Why text', async () => {
    const base = await canonicalContext();
    const first = score(base);
    const reversed = score(base, (evidence) => [...evidence].reverse());
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(first));
    const confidence = topScore(first);
    expect(confidence.scorePercent).toBeGreaterThanOrEqual(0);
    expect(confidence.scorePercent).toBeLessThanOrEqual(100);
    expect(confidence.explanation).not.toMatch(
      /Why did revenue|gross_revenue|raw\.orders|Ignore previous instructions|token|private reasoning/i,
    );
  });

  it('rejects arbitrary runner/model confidence before deterministic scoring', () => {
    const draft = {
      incidentId: 'incident-confidence-draft',
      summary: 'Factual draft report.',
      entities: [],
      evidence: [
        {
          id: 'evidence-1',
          category: 'metadata',
          statement: 'A bounded factual observation.',
        },
      ],
      hypotheses: [
        {
          id: 'hypothesis-1',
          summary: 'A plausible contributor remains to be scored.',
          confidence: {
            status: 'not_scored',
            reasonCode: 'deterministic_scoring_pending',
            explanation:
              'Confidence is not scored until validated evidence signals are evaluated by the code-owned formula.',
          },
          evidenceIds: ['evidence-1'],
        },
      ],
      recommendations: [],
      assumptions: [],
      missingInformation: [],
    };
    expect(InvestigationDraftReportSchema.safeParse(draft).success).toBe(true);
    expect(InvestigationReportSchema.safeParse(draft).success).toBe(false);
    expect(
      InvestigationDraftReportSchema.safeParse({
        ...draft,
        blastRadius: { status: 'complete' },
      }).success,
    ).toBe(false);
    expect(
      InvestigationDraftReportSchema.safeParse({
        ...draft,
        hypotheses: [{ ...draft.hypotheses[0], confidence: 0.99 }],
      }).success,
    ).toBe(false);
    expect(
      InvestigationDraftReportSchema.safeParse({
        ...draft,
        hypotheses: [
          {
            ...draft.hypotheses[0],
            confidence: {
              status: 'scored',
              formulaVersion: 'evidence-confidence-v1',
              scorePercent: 99,
              level: 'high',
              explanation: 'Model-authored confidence.',
              factors: [],
            },
          },
        ],
      }).success,
    ).toBe(false);
  });
});
