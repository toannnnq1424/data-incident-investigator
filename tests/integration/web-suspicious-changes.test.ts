import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getSuspiciousChangePresentation,
} from '../../apps/web/src/App.js';
import {
  SUSPICIOUS_CHANGE_SIGNAL_LABELS,
  SuspiciousChangeDetectionStageSchema,
} from '../../packages/shared-types/src/index.js';

function completedDetection() {
  return SuspiciousChangeDetectionStageSchema.parse({
    status: 'completed',
    candidates: [
      {
        changeId: 'change-removed-column',
        entityUrn: 'urn:li:dataset:raw.orders',
        entityName: 'raw.orders',
        category: 'schema',
        operation: 'removed',
        observedAt: '2026-07-18T07:45:00.000Z',
        summary: 'Column gross_revenue was removed from raw.orders.',
        field: 'gross_revenue',
        signals: [
          {
            code: 'incident_window',
            label: SUSPICIOUS_CHANGE_SIGNAL_LABELS.incident_window,
          },
          {
            code: 'upstream_lineage',
            label: SUSPICIOUS_CHANGE_SIGNAL_LABELS.upstream_lineage,
          },
          {
            code: 'disruptive_operation',
            label: SUSPICIOUS_CHANGE_SIGNAL_LABELS.disruptive_operation,
          },
        ],
      },
    ],
    missingInformation: [],
  });
}

describe('suspicious-change presentation', () => {
  it('presents a semantic loading state while context is gathering', () => {
    expect(getSuspiciousChangePresentation({ status: 'detecting' })).toEqual({
      heading: 'Detecting potentially relevant changes',
      message: 'Applying bounded deterministic signals to the gathered change factsâ€¦',
      tone: 'loading',
    });
  });

  it('labels completed candidates as potentially relevant without causal or confidence copy', () => {
    const presentation = getSuspiciousChangePresentation(completedDetection());

    expect(presentation).toEqual({
      heading: 'Potentially relevant metadata changes',
      message: '1 bounded change candidates have transparent suspicious signals.',
      tone: 'success',
    });
    expect(`${presentation.heading} ${presentation.message}`).not.toMatch(
      /caused|root cause|confidence|recommend/i,
    );
  });

  it('distinguishes insufficient and safe unavailable terminal states', () => {
    expect(
      getSuspiciousChangePresentation(
        SuspiciousChangeDetectionStageSchema.parse({
          status: 'insufficient',
          candidates: [],
          missingInformation: [
            {
              code: 'recent_changes_not_found',
              message: 'No recent metadata change facts were available.',
            },
          ],
        }),
      ),
    ).toEqual({
      heading: 'Insufficient suspicious-change signals',
      message: 'No recent change met the bounded incident-specific signal rules.',
      tone: 'missing',
    });
    expect(
      getSuspiciousChangePresentation(
        SuspiciousChangeDetectionStageSchema.parse({
          status: 'unavailable',
          error: {
            code: 'CONTEXT_UNAVAILABLE',
            message: 'Suspicious-change detection is unavailable because context did not complete.',
          },
        }),
      ),
    ).toEqual({
      heading: 'Suspicious-change detection unavailable',
      message: 'Suspicious-change detection is unavailable because context did not complete.',
      tone: 'error',
    });
  });

  it('inherits stale-safe ownership from the incident retrieval guard', () => {
    const guard = createLatestRequestGuard();
    const olderDetection = guard.begin();
    const newerDetection = guard.begin();

    expect(guard.isCurrent(olderDetection)).toBe(false);
    expect(guard.isCurrent(newerDetection)).toBe(true);
  });
});
