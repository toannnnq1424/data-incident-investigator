import { describe, expect, it } from 'vitest';
import { getCompletedReportContent } from '../../apps/web/src/App.js';
import { IncidentRetrievalResponseSchema } from '../../packages/shared-types/src/index.js';

describe('completed report presentation', () => {
  it('selects the completed status, report summary, and top ranked hypothesis', () => {
    const incident = IncidentRetrievalResponseSchema.parse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'completed',
      contextStage: {
        status: 'completed',
        intent: {
          question: 'Why did revenue drop?',
          entityHints: [],
          symptoms: [],
          timeWindow: { basis: 'provider_default' },
        },
        facts: {
          sourceMode: 'fixture',
          candidateEntities: [],
          recentChanges: [],
        },
        missingInformation: [
          {
            code: 'entity_not_found',
            message: 'No adapter-evidenced entity was returned.',
          },
        ],
      },
      suspiciousChangeStage: {
        status: 'insufficient',
        candidates: [],
        missingInformation: [
          {
            code: 'recent_changes_not_found',
            message: 'No recent metadata change facts were available for deterministic detection.',
          },
        ],
      },
      hypothesisScoringStage: {
        status: 'insufficient',
        hypotheses: [],
        missingInformation: [
          {
            code: 'suspicious_changes_insufficient',
            message: 'Suspicious-change detection returned no candidate to score.',
          },
        ],
      },
      report: {
        incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
        summary: 'The removed source column is the strongest evidence-backed inference.',
        entities: [
          {
            urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
            name: 'analytics.daily_revenue',
            kind: 'dataset',
          },
          {
            urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
            name: 'raw.orders',
            kind: 'dataset',
          },
        ],
        evidence: [
          {
            id: 'change-1',
            category: 'schema-change',
            statement: 'The fixture records a removed source column.',
            sourceEntity: {
              urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
              name: 'raw.orders',
              kind: 'dataset',
            },
            observedAt: '2026-07-18T08:20:00.000Z',
          },
          {
            id: 'lineage-upstream-1',
            category: 'lineage',
            statement: 'Fixture lineage shows raw.orders upstream of analytics.daily_revenue.',
            sourceEntity: {
              urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
              name: 'raw.orders',
              kind: 'dataset',
            },
          },
        ],
        hypotheses: [
          {
            id: 'hypothesis-1',
            summary: 'A schema change is a plausible contributor.',
            confidence: 0.8,
            evidenceIds: ['change-1', 'lineage-upstream-1'],
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
      topHypothesis: 'A schema change is a plausible contributor.',
      relatedEntities: [
        {
          urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
          name: 'analytics.daily_revenue',
          kind: 'dataset',
        },
        {
          urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
          name: 'raw.orders',
          kind: 'dataset',
        },
      ],
      facts: [
        {
          id: 'change-1',
          category: 'schema-change',
          statement: 'The fixture records a removed source column.',
          sourceEntity: {
            urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
            name: 'raw.orders',
            kind: 'dataset',
          },
          observedAt: '2026-07-18T08:20:00.000Z',
        },
        {
          id: 'lineage-upstream-1',
          category: 'lineage',
          statement: 'Fixture lineage shows raw.orders upstream of analytics.daily_revenue.',
          sourceEntity: {
            urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
            name: 'raw.orders',
            kind: 'dataset',
          },
        },
      ],
      lineageEvidence: [
        {
          id: 'lineage-upstream-1',
          category: 'lineage',
          statement: 'Fixture lineage shows raw.orders upstream of analytics.daily_revenue.',
          sourceEntity: {
            urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
            name: 'raw.orders',
            kind: 'dataset',
          },
        },
      ],
      inferences: [
        {
          id: 'hypothesis-1',
          summary: 'A schema change is a plausible contributor.',
          confidence: 0.8,
          confidenceLabel: '80%',
          evidenceIds: ['change-1', 'lineage-upstream-1'],
        },
      ],
      recommendations: ['Restore or intentionally replace the source field.'],
      assumptions: ['The fixture snapshot covers the incident window.'],
      missingInformation: ['Runtime query logs are unavailable.'],
    });
  });
});
