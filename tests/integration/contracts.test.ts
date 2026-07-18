import { describe, expect, it } from 'vitest';
import {
  IncidentRequestSchema,
  InvestigationReportSchema,
} from '../../packages/shared-types/src/index.js';

describe('shared investigation contracts', () => {
  it('accepts the minimum incident request', () => {
    const result = IncidentRequestSchema.safeParse({
      question: 'Why did revenue drop today?',
    });

    expect(result.success).toBe(true);
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
          evidenceIds: [],
        },
      ],
      recommendations: ['Restore the source column.'],
      assumptions: [],
      missingInformation: [],
    });

    expect(result.success).toBe(false);
  });
});
