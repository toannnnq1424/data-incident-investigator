import { describe, expect, it } from 'vitest';
import { getCompletedReportContent } from '../../apps/web/src/App.js';
import { IncidentRetrievalResponseSchema } from '../../packages/shared-types/src/index.js';

describe('completed report presentation', () => {
  it('selects the completed status, report summary, and top ranked hypothesis', () => {
    const incident = IncidentRetrievalResponseSchema.parse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'completed',
      report: {
        incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
        summary: 'The removed source column is the strongest evidence-backed inference.',
        entities: [],
        evidence: [
          {
            id: 'change-1',
            category: 'schema-change',
            statement: 'The fixture records a removed source column.',
          },
        ],
        hypotheses: [
          {
            id: 'hypothesis-1',
            summary: 'A schema change caused the incident.',
            confidence: 0.92,
            evidenceIds: ['change-1'],
          },
        ],
        recommendations: ['Restore or intentionally replace the source field.'],
        assumptions: ['The fixture snapshot covers the incident window.'],
        missingInformation: ['Runtime query logs are unavailable.'],
      },
    });
    if (incident.status !== 'completed') {
      throw new Error('Expected a completed incident fixture.');
    }

    expect(getCompletedReportContent(incident)).toEqual({
      status: 'completed',
      summary: 'The removed source column is the strongest evidence-backed inference.',
      topHypothesis: 'A schema change caused the incident.',
    });
  });
});
