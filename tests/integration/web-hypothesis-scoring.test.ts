import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getHypothesisScoringPresentation,
} from '../../apps/web/src/App.js';
import {
  HYPOTHESIS_SCORE_FACTOR_LABELS,
  HYPOTHESIS_SCORE_FACTOR_WEIGHTS,
  HypothesisScoringStageSchema,
} from '../../packages/shared-types/src/index.js';

function completedScoring() {
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
        confidence: 0.85,
        evidenceIds: ['change-removed-column'],
        factors: [
          {
            code: 'change_recency',
            label: HYPOTHESIS_SCORE_FACTOR_LABELS.change_recency,
            contributionBasisPoints: 3_000,
            weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.change_recency,
          },
          {
            code: 'lineage_position',
            label: HYPOTHESIS_SCORE_FACTOR_LABELS.lineage_position,
            contributionBasisPoints: 2_000,
            weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.lineage_position,
          },
          {
            code: 'symptom_category_fit',
            label: HYPOTHESIS_SCORE_FACTOR_LABELS.symptom_category_fit,
            contributionBasisPoints: 1_500,
            weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.symptom_category_fit,
          },
          {
            code: 'evidence_quality',
            label: HYPOTHESIS_SCORE_FACTOR_LABELS.evidence_quality,
            contributionBasisPoints: 2_000,
            weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS.evidence_quality,
          },
        ],
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
