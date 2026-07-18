import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  InvestigationReportSchema,
  MetadataHealthResponseSchema,
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

  it('accepts every normalized metadata health status and rejects provider-specific values', () => {
    const statuses = [
      'ready',
      'unconfigured',
      'unauthorized',
      'unavailable',
      'timeout',
      'invalid_response',
    ] as const;

    for (const status of statuses) {
      expect(
        MetadataHealthResponseSchema.safeParse({
          mode: status === 'ready' ? 'fixture' : 'datahub',
          status,
          message: 'Safe metadata health message.',
        }).success,
      ).toBe(true);
    }

    expect(
      MetadataHealthResponseSchema.safeParse({
        mode: 'datahub',
        status: 'ECONNREFUSED',
        message: 'Provider-specific error.',
      }).success,
    ).toBe(false);
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
          evidenceIds: ['missing-evidence'],
        },
      ],
      recommendations: ['Restore the source column.'],
      assumptions: [],
      missingInformation: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepts a completed incident only when hypothesis references resolve', () => {
    const result = IncidentRetrievalResponseSchema.safeParse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'completed',
      report: {
        incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
        summary: 'A removed source column is the strongest inference.',
        entities: [],
        evidence: [
          {
            id: 'change-1',
            category: 'schema-change',
            statement: 'The fixture records a removed column.',
          },
        ],
        hypotheses: [
          {
            id: 'hypothesis-1',
            summary: 'The removed column caused the incident.',
            confidence: 0.9,
            evidenceIds: ['change-1'],
          },
        ],
        recommendations: ['Restore or intentionally replace the column.'],
        assumptions: ['The fixture snapshot covers the incident window.'],
        missingInformation: ['Runtime query logs are unavailable.'],
      },
    });

    expect(result.success).toBe(true);
  });
});
