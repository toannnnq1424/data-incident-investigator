import { describe, expect, it } from 'vitest';
import {
  getCompletedReportContent,
  getDegradedInvestigationPresentation,
} from '../../apps/web/src/App.js';
import {
  IncidentRetrievalResponseSchema,
  INVESTIGATION_NEXT_STEP_TEXT,
  INVESTIGATION_TERMINATION_MESSAGES,
  INVESTIGATION_WARNING_MESSAGES,
  REMEDIATION_FALLBACK_STEP_TEXT,
} from '../../packages/shared-types/src/index.js';

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
          candidateEntities: [
            {
              urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
              name: 'analytics.daily_revenue',
              kind: 'dataset',
            },
          ],
          selectedEntity: {
            urn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)',
            name: 'analytics.daily_revenue',
            kind: 'dataset',
          },
          recentChanges: [],
        },
        missingInformation: [],
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
      remediationStage: {
        status: 'insufficient',
        recommendations: [],
        missingInformation: [
          {
            code: 'scored_hypotheses_insufficient',
            message: 'Scored hypotheses are insufficient for remediation planning.',
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
      },
      execution: {
        toolCalls: 8,
        agentSteps: 5,
        durationMs: 250,
        lineageEntitiesVisited: 3,
        retries: 0,
        terminationReason: 'completed',
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

describe('degraded investigation presentation', () => {
  it('shows safe warnings and explicit fixture continuation without claiming completion', () => {
    const incident = IncidentRetrievalResponseSchema.parse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'degraded',
      contextStage: {
        status: 'degraded',
        intent: {
          question: 'Why did revenue drop?',
          entityHints: [],
          symptoms: [],
          timeWindow: { basis: 'provider_default' },
        },
        facts: { sourceMode: 'datahub', candidateEntities: [], recentChanges: [] },
        missingInformation: [],
        failedOperation: 'metadata_health',
        error: {
          code: 'METADATA_UNAVAILABLE',
          message: 'Incident context metadata is unavailable.',
        },
      },
      suspiciousChangeStage: {
        status: 'unavailable',
        error: {
          code: 'CONTEXT_UNAVAILABLE',
          message:
            'Suspicious-change detection is unavailable because incident context did not complete.',
        },
      },
      hypothesisScoringStage: {
        status: 'unavailable',
        error: {
          code: 'CONTEXT_UNAVAILABLE',
          message: 'Hypothesis scoring is unavailable because incident context did not complete.',
        },
      },
      remediationStage: {
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
          code: 'CONTEXT_UNAVAILABLE',
          message: 'Remediation planning is unavailable because incident context did not complete.',
        },
      },
      execution: {
        toolCalls: 1,
        agentSteps: 1,
        durationMs: 20,
        lineageEntitiesVisited: 0,
        retries: 0,
        terminationReason: 'metadata_unavailable',
      },
      error: {
        code: 'METADATA_UNAVAILABLE',
        message: INVESTIGATION_TERMINATION_MESSAGES.metadata_unavailable,
      },
      failedOperation: 'metadata_health',
      warnings: [
        {
          code: 'external_dependency_failed',
          message: INVESTIGATION_WARNING_MESSAGES.external_dependency_failed,
        },
      ],
      nextSteps: [
        {
          id: 'review_provider_availability',
          kind: 'safe_diagnostic',
          status: 'not_executed',
          description: INVESTIGATION_NEXT_STEP_TEXT.review_provider_availability,
        },
        {
          id: 'continue_fixture_mode',
          kind: 'fixture_continuation',
          status: 'not_executed',
          description: INVESTIGATION_NEXT_STEP_TEXT.continue_fixture_mode,
        },
      ],
    });
    if (incident.status !== 'degraded') throw new Error('Expected degraded fixture.');

    expect(getDegradedInvestigationPresentation(incident)).toEqual({
      heading: 'Investigation degraded safely',
      message: INVESTIGATION_TERMINATION_MESSAGES.metadata_unavailable,
      failedOperation: 'metadata_health',
      warningMessages: [INVESTIGATION_WARNING_MESSAGES.external_dependency_failed],
      nextStepDescriptions: [
        INVESTIGATION_NEXT_STEP_TEXT.review_provider_availability,
        INVESTIGATION_NEXT_STEP_TEXT.continue_fixture_mode,
      ],
      hasPartialReport: false,
    });
  });
});
