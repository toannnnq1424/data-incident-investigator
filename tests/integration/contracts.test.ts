import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
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

  it('accepts the incident processing response contract', () => {
    const response = IncidentAcceptedResponseSchema.parse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'processing',
    });

    expect(response.status).toBe('processing');
  });

  it('accepts the stable validation error envelope', () => {
    const response = ApiErrorSchema.parse({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The incident request is invalid.',
        issues: [{ path: 'question', message: 'Too small' }],
      },
    });

    expect(response.error.code).toBe('VALIDATION_ERROR');
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
