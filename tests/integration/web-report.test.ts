import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  getCompletedReportContent,
  getDegradedInvestigationPresentation,
  FailedInvestigation,
  InvestigationActivity,
} from '../../apps/web/src/App.js';
import {
  IncidentRetrievalResponseSchema,
  INVESTIGATION_COMPLETED_EVENT_SUMMARY,
  INVESTIGATION_EVENT_ACTION_SUMMARIES,
  INVESTIGATION_NEXT_STEP_TEXT,
  INVESTIGATION_TERMINATION_MESSAGES,
  INVESTIGATION_WARNING_MESSAGES,
  InvestigationEventTrailSchema,
  REMEDIATION_FALLBACK_STEP_TEXT,
} from '../../packages/shared-types/src/index.js';

const requireFromWeb = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { createElement } = await import(pathToFileURL(requireFromWeb.resolve('react')).href);
const { renderToStaticMarkup } = await import(
  pathToFileURL(requireFromWeb.resolve('react-dom/server')).href
);

describe('investigation activity presentation', () => {
  it('renders an accessible ordered timeline with time, evidence links, and terminal duration', () => {
    const events = InvestigationEventTrailSchema.parse([
      {
        id: 'event-0001',
        sequence: 1,
        timestamp: '2026-07-21T00:00:00.000Z',
        actionType: 'evidence_collected',
        summary: INVESTIGATION_EVENT_ACTION_SUMMARIES.evidence_collected,
        evidenceIds: ['change-1'],
      },
      {
        id: 'event-0002',
        sequence: 2,
        timestamp: '2026-07-21T00:00:01.000Z',
        actionType: 'investigation_terminated',
        summary: INVESTIGATION_COMPLETED_EVENT_SUMMARY,
        terminationReason: 'completed',
        durationMs: 250,
      },
    ]);
    const markup = renderToStaticMarkup(
      createElement(InvestigationActivity, { events, linkEvidence: true }),
    );

    expect(markup).toContain('aria-labelledby="investigation-activity-heading"');
    expect(markup).toContain('<h3 id="investigation-activity-heading">Investigation activity</h3>');
    expect(markup).toContain('<ol class="investigation-event-list">');
    expect(markup).toContain('<time dateTime="2026-07-21T00:00:00.000Z">');
    expect(markup).toContain('href="#evidence-change-1"');
    expect(markup).toContain('investigation_terminated');
    expect(markup).toContain('Duration: 250 ms');
  });

  it('keeps a limit-terminated failed response visible with its safe activity trail', () => {
    const incident = IncidentRetrievalResponseSchema.parse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'failed',
      execution: {
        toolCalls: 1,
        agentSteps: 1,
        durationMs: 10,
        lineageEntitiesVisited: 0,
        retries: 0,
        terminationReason: 'tool_call_limit_reached',
      },
      eventTrail: [
        {
          id: 'event-0001',
          sequence: 1,
          timestamp: '2026-07-21T00:00:00.000Z',
          actionType: 'question_normalized',
          summary: INVESTIGATION_EVENT_ACTION_SUMMARIES.question_normalized,
        },
        {
          id: 'event-0002',
          sequence: 2,
          timestamp: '2026-07-21T00:00:01.000Z',
          actionType: 'investigation_terminated',
          summary: INVESTIGATION_TERMINATION_MESSAGES.tool_call_limit_reached,
          terminationReason: 'tool_call_limit_reached',
          durationMs: 10,
        },
      ],
      error: {
        code: 'INVESTIGATION_LIMIT_REACHED',
        message: INVESTIGATION_TERMINATION_MESSAGES.tool_call_limit_reached,
      },
    });
    if (incident.status !== 'failed') throw new Error('Expected failed incident fixture.');

    const markup = renderToStaticMarkup(createElement(FailedInvestigation, { incident }));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('The investigation did not complete');
    expect(markup).toContain('tool_call_limit_reached');
    expect(markup).toContain('Investigation activity');
  });
});

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
      eventTrail: [
        {
          id: 'event-0001',
          sequence: 1,
          timestamp: '2026-07-21T00:00:00.000Z',
          actionType: 'question_normalized',
          summary: INVESTIGATION_EVENT_ACTION_SUMMARIES.question_normalized,
        },
        {
          id: 'event-0002',
          sequence: 2,
          timestamp: '2026-07-21T00:00:01.000Z',
          actionType: 'investigation_terminated',
          summary: INVESTIGATION_COMPLETED_EVENT_SUMMARY,
          terminationReason: 'completed',
          durationMs: 250,
        },
      ],
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
            confidence: {
              status: 'not_scored',
              reasonCode: 'insufficient_evidence',
              explanation: 'Confidence was not scored because validated evidence was insufficient.',
            },
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
          confidence: {
            status: 'not_scored',
            reasonCode: 'insufficient_evidence',
            explanation: 'Confidence was not scored because validated evidence was insufficient.',
          },
          confidenceLabel: 'Confidence not scored',
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
      eventTrail: [
        {
          id: 'event-0001',
          sequence: 1,
          timestamp: '2026-07-21T00:00:00.000Z',
          actionType: 'question_normalized',
          summary: INVESTIGATION_EVENT_ACTION_SUMMARIES.question_normalized,
        },
        {
          id: 'event-0002',
          sequence: 2,
          timestamp: '2026-07-21T00:00:01.000Z',
          actionType: 'warning_raised',
          warningCode: 'external_dependency_failed',
          summary: INVESTIGATION_WARNING_MESSAGES.external_dependency_failed,
        },
        {
          id: 'event-0003',
          sequence: 3,
          timestamp: '2026-07-21T00:00:02.000Z',
          actionType: 'investigation_terminated',
          summary: INVESTIGATION_TERMINATION_MESSAGES.metadata_unavailable,
          terminationReason: 'metadata_unavailable',
          durationMs: 20,
        },
      ],
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
