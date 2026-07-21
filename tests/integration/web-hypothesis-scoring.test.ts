import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getHypothesisScoringPresentation,
} from '../../apps/web/src/App.js';
import {
  HYPOTHESIS_SCORE_FACTOR_LABELS,
  HYPOTHESIS_SCORE_FACTOR_WEIGHTS,
  HypothesisScoringStageSchema,
  hypothesisConfidenceExplanation,
  type HypothesisScoreFactor,
} from '../../packages/shared-types/src/index.js';

function completedScoring() {
  const factor = (
    code: HypothesisScoreFactor['code'],
    reasonCode: HypothesisScoreFactor['reasonCode'],
    contributionBasisPoints: number,
    evidenceIds: string[] = [],
  ): HypothesisScoreFactor => ({
    code,
    label: HYPOTHESIS_SCORE_FACTOR_LABELS[code],
    reasonCode,
    contributionBasisPoints,
    weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS[code],
    evidenceIds,
    signalCodes: [],
  });
  const factors = [
    factor('temporal_proximity', 'temporal_near', 2_500, ['change-removed-column']),
    factor('lineage_relationship', 'lineage_direct_upstream', 2_000, ['change-removed-column']),
    factor('schema_or_freshness_evidence', 'schema_change_present', 1_800, [
      'change-removed-column',
    ]),
    factor('independent_evidence_diversity', 'evidence_sources_one', 700, [
      'change-removed-column',
    ]),
    factor('contradictory_evidence', 'contradiction_none', 0),
    factor('missing_required_information', 'required_information_complete', 0),
  ];
  return HypothesisScoringStageSchema.parse({
    status: 'completed',
    hypotheses: [
      {
        id: 'hypothesis-change-removed-column',
        rank: 1,
        sourceChangeId: 'change-removed-column',
        observedAt: '2026-07-18T07:45:00.000Z',
        summary:
          'Plausible contributor: the removed schema change on raw.orders may have contributed to the incident.',
        confidence: {
          status: 'scored',
          formulaVersion: 'evidence-confidence-v1',
          scorePercent: 70,
          level: 'medium',
          explanation: hypothesisConfidenceExplanation(factors),
          factors,
        },
        evidenceIds: ['change-removed-column'],
      },
    ],
    missingInformation: [],
  });
}

describe('hypothesis-scoring presentation', () => {
  it('presents an explicit loading state while scoring is active', () => {
    expect(getHypothesisScoringPresentation({ status: 'scoring' })).toEqual({
      heading: 'Scoring evidence-linked hypotheses',
      message: 'Applying the deterministic basis-point formula to resolved factual evidence…',
      tone: 'loading',
    });
  });

  it('labels completed output as ranked plausible-contributor inferences', () => {
    const presentation = getHypothesisScoringPresentation(completedScoring());

    expect(presentation).toEqual({
      heading: 'Ranked evidence-linked hypotheses',
      message: '1 plausible-contributor inference scored by transparent factors.',
      tone: 'success',
    });
    expect(`${presentation.heading} ${presentation.message}`).not.toMatch(
      /confirmed cause|recommendation|remediation/i,
    );
  });

  it('distinguishes insufficient and safe unavailable terminal states', () => {
    expect(
      getHypothesisScoringPresentation(
        HypothesisScoringStageSchema.parse({
          status: 'insufficient',
          hypotheses: [],
          missingInformation: [
            {
              code: 'suspicious_changes_insufficient',
              message: 'Suspicious-change detection returned no candidate to score.',
            },
          ],
        }),
      ),
    ).toEqual({
      heading: 'Insufficient evidence for hypothesis scoring',
      message: 'No ranked inference was produced from the bounded factual inputs.',
      tone: 'missing',
    });
    expect(
      getHypothesisScoringPresentation(
        HypothesisScoringStageSchema.parse({
          status: 'unavailable',
          error: {
            code: 'CONTEXT_UNAVAILABLE',
            message: 'Hypothesis scoring is unavailable because context did not complete.',
          },
        }),
      ),
    ).toEqual({
      heading: 'Hypothesis scoring unavailable',
      message: 'Hypothesis scoring is unavailable because context did not complete.',
      tone: 'error',
    });
  });

  it('inherits stale-safe ownership from the incident retrieval guard', () => {
    const guard = createLatestRequestGuard();
    const olderScoring = guard.begin();
    const newerScoring = guard.begin();

    expect(guard.isCurrent(olderScoring)).toBe(false);
    expect(guard.isCurrent(newerScoring)).toBe(true);
  });
});
