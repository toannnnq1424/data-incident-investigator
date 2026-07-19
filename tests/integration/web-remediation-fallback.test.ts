import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getRemediationPresentation,
  RemediationStage,
} from '../../apps/web/src/App.js';
import {
  REMEDIATION_FALLBACK_STEP_TEXT,
  RemediationPlanningStageSchema,
  type RemediationPlanningStage,
} from '../../packages/shared-types/src/index.js';

function completedRemediation(): RemediationPlanningStage {
  return RemediationPlanningStageSchema.parse({
    status: 'completed',
    recommendations: [
      {
        id: 'verify-change-removed-column',
        type: 'recommended_verification',
        priority: 'high',
        status: 'not_executed',
        sourceHypothesisRank: 1,
        title: 'Recommended verification: confirm the observed schema change',
        rationale:
          'Exact factual evidence supports human review of a plausible contributor, not a confirmed cause.',
        verificationStep: 'Verify the current schema contract in a read-only review.',
        reversibilityNote: 'Read-only verification requires no rollback.',
        references: {
          hypothesisIds: ['hypothesis-change-removed-column'],
          evidenceIds: ['change-removed-column'],
          entityUrns: ['urn:li:dataset:raw.orders'],
          changeIds: ['change-removed-column'],
        },
      },
    ],
    missingInformation: [],
    nextSteps: [],
  });
}

function insufficientRemediation(): RemediationPlanningStage {
  return RemediationPlanningStageSchema.parse({
    status: 'insufficient',
    recommendations: [],
    missingInformation: [
      {
        code: 'scored_hypotheses_insufficient',
        message: 'No complete scored hypothesis is available.',
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
  });
}

describe('remediation and safe-fallback presentation', () => {
  it('presents a semantic planning/loading state', () => {
    expect(getRemediationPresentation({ status: 'planning' })).toEqual({
      heading: 'Planning safe verification and remediation',
      message: 'Deriving bounded human-review steps from scored factual references…',
      tone: 'loading',
    });
    const markup = renderToStaticMarkup(
      createElement(RemediationStage, { stage: { status: 'planning' } }),
    );
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('data-remediation-status="planning"');
  });

  it('renders completed references, verification, reversibility, and not-executed semantics', () => {
    const stage = completedRemediation();
    const presentation = getRemediationPresentation(stage);
    const markup = renderToStaticMarkup(createElement(RemediationStage, { stage }));

    expect(presentation).toEqual({
      heading: 'Safe recommendations for human review',
      message: '1 evidence-linked recommendation; none has been executed.',
      tone: 'success',
    });
    expect(markup).toContain('<ol class="remediation-recommendation-list">');
    expect(markup).toContain('Not executed');
    expect(markup).toContain('Safe verification:');
    expect(markup).toContain('Reversibility:');
    expect(markup).toContain('href="#scored-hypothesis-change-removed-column"');
    expect(markup).toContain('href="#evidence-change-removed-column"');
    expect(markup).toContain('urn:li:dataset:raw.orders');
    expect(markup).not.toMatch(/confirmed root cause|caused the incident/i);
  });

  it('renders reference-free insufficient and provider-safe unavailable fallback states', () => {
    const insufficient = insufficientRemediation();
    const unavailable = RemediationPlanningStageSchema.parse({
      status: 'unavailable',
      recommendations: [],
      missingInformation: [
        {
          code: 'scoring_unavailable',
          message: 'Validated scored hypotheses are unavailable for safe remediation planning.',
        },
      ],
      nextSteps: [
        {
          id: 'review_provider_availability',
          kind: 'safe_diagnostic',
          status: 'not_executed',
          description: REMEDIATION_FALLBACK_STEP_TEXT.review_provider_availability,
        },
        {
          id: 'continue_fixture_mode',
          kind: 'fixture_continuation',
          status: 'not_executed',
          description: REMEDIATION_FALLBACK_STEP_TEXT.continue_fixture_mode,
        },
      ],
      error: {
        code: 'SCORING_UNAVAILABLE',
        message: 'Remediation planning is unavailable because scored hypotheses did not complete.',
      },
    });
    const insufficientMarkup = renderToStaticMarkup(
      createElement(RemediationStage, { stage: insufficient }),
    );
    const unavailableMarkup = renderToStaticMarkup(
      createElement(RemediationStage, { stage: unavailable }),
    );

    expect(getRemediationPresentation(insufficient)).toMatchObject({
      heading: 'Inconclusive remediation planning',
      tone: 'missing',
    });
    expect(insufficientMarkup).toContain('Safe fallback next steps');
    expect(insufficientMarkup).toContain('continue_fixture_mode');
    expect(insufficientMarkup).not.toContain('Linked factual references');
    expect(getRemediationPresentation(unavailable)).toEqual({
      heading: 'Remediation planning unavailable',
      message: 'Remediation planning is unavailable because scored hypotheses did not complete.',
      tone: 'error',
    });
    expect(unavailableMarkup).toContain('role="alert"');
    expect(unavailableMarkup).not.toMatch(/provider\.invalid|secret|stack/i);
  });

  it('inherits stale-response ownership from the incident retrieval guard', () => {
    const guard = createLatestRequestGuard();
    const olderPlanning = guard.begin();
    const newerPlanning = guard.begin();

    expect(guard.isCurrent(olderPlanning)).toBe(false);
    expect(guard.isCurrent(newerPlanning)).toBe(true);
  });
});
