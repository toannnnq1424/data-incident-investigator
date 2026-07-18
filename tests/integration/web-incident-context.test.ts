import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getIncidentContextPresentation,
} from '../../apps/web/src/App.js';
import {
  IncidentContextStageSchema,
  type IncidentContextStage,
} from '../../packages/shared-types/src/index.js';

function completedContext({ selected = true } = {}): IncidentContextStage {
  const rootUrn = 'urn:li:dataset:analytics.revenue';
  const upstreamUrn = 'urn:li:dataset:raw.orders';
  const candidate = { urn: rootUrn, kind: 'dataset' as const, name: 'analytics.revenue' };
  return IncidentContextStageSchema.parse(
    selected
      ? {
          status: 'completed',
          intent: {
            question: 'Why did revenue drop?',
            entityHints: ['analytics.revenue'],
            symptoms: ['Revenue is below baseline.'],
            timeWindow: {
              basis: 'incident_time',
              endTime: '2026-07-18T08:30:00.000Z',
              hours: 168,
            },
          },
          facts: {
            sourceMode: 'fixture',
            candidateEntities: [candidate],
            selectedEntity: candidate,
            lineage: {
              rootUrn,
              direction: 'upstream',
              requestedDepth: 2,
              maxNodes: 5,
              visitedNodeCount: 2,
              truncated: false,
              nodes: [
                { ...candidate, depth: 0 },
                { urn: upstreamUrn, kind: 'dataset', name: 'raw.orders', depth: 1 },
              ],
              edges: [{ sourceUrn: upstreamUrn, targetUrn: rootUrn }],
            },
            recentChanges: [
              {
                entityUrn: upstreamUrn,
                window: {
                  startTime: '2026-07-11T08:30:00.000Z',
                  endTime: '2026-07-18T08:30:00.000Z',
                  hours: 168,
                },
                limit: 10,
                returnedCount: 1,
                truncated: false,
                changes: [
                  {
                    id: 'change-removed-column',
                    entityUrn: upstreamUrn,
                    timestamp: '2026-07-18T07:45:00.000Z',
                    category: 'schema',
                    operation: 'removed',
                    source: 'fixture',
                    summary: 'Column gross_revenue was removed from raw.orders.',
                  },
                ],
              },
            ],
          },
          missingInformation: [],
        }
      : {
          status: 'completed',
          intent: {
            question: 'Which unknown dataset is stale?',
            entityHints: [],
            symptoms: [],
            timeWindow: { basis: 'provider_default', hours: 168 },
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
  );
}

describe('incident context presentation', () => {
  it('presents a semantic loading stage before facts are available', () => {
    expect(getIncidentContextPresentation({ status: 'gathering' })).toEqual({
      heading: 'Gathering investigation context',
      message: 'Parsing the intake and retrieving bounded metadata facts…',
      tone: 'loading',
    });
  });

  it('presents retrieved facts without adding a causal hypothesis', () => {
    const presentation = getIncidentContextPresentation(completedContext());

    expect(presentation).toEqual({
      heading: 'Investigation context gathered',
      message: '1 candidate entities and 1 recent metadata changes were retrieved as facts.',
      tone: 'success',
    });
    expect(presentation.message).not.toMatch(/cause|hypothesis|confidence/i);
  });

  it('distinguishes missing entity context and safe terminal errors', () => {
    expect(getIncidentContextPresentation(completedContext({ selected: false }))).toEqual({
      heading: 'Context gathered with missing information',
      message: 'The intake was parsed, but no adapter-evidenced entity candidate was returned.',
      tone: 'missing',
    });
    expect(
      getIncidentContextPresentation({
        status: 'failed',
        error: {
          code: 'METADATA_TIMEOUT',
          message: 'Incident context gathering timed out.',
        },
      }),
    ).toEqual({
      heading: 'Context gathering failed',
      message: 'Incident context gathering timed out.',
      tone: 'error',
    });
  });

  it('rejects an older incident response after a newer submission owns the view', () => {
    const guard = createLatestRequestGuard();
    const olderIncident = guard.begin();
    const newerIncident = guard.begin();

    expect(guard.isCurrent(olderIncident)).toBe(false);
    expect(guard.isCurrent(newerIncident)).toBe(true);
  });
});
