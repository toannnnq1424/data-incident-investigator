import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getMetadataLineagePresentation,
  type MetadataLineageState,
} from '../../apps/web/src/App.js';
import { MetadataLineageResponseSchema } from '../../packages/shared-types/src/index.js';

function successState({ edges = true, truncated = false } = {}) {
  const rootUrn = 'urn:li:dataset:root';
  return {
    kind: 'success',
    response: MetadataLineageResponseSchema.parse({
      rootUrn,
      direction: 'downstream',
      requestedDepth: 2,
      maxNodes: 8,
      visitedNodeCount: edges ? 2 : 1,
      truncated,
      nodes: edges
        ? [
            { urn: rootUrn, kind: 'dataset', name: 'Root', depth: 0 },
            { urn: 'urn:li:dashboard:child', kind: 'dashboard', name: 'Child', depth: 1 },
          ]
        : [{ urn: rootUrn, kind: 'dataset', name: 'Root', depth: 0 }],
      edges: edges ? [{ sourceUrn: rootUrn, targetUrn: 'urn:li:dashboard:child' }] : [],
    }),
  } satisfies MetadataLineageState;
}

describe('metadata lineage presentation', () => {
  it('presents idle and controlled loading states', () => {
    expect(getMetadataLineagePresentation({ kind: 'idle' })).toEqual({
      heading: 'Bounded lineage',
      message: 'Choose upstream or downstream on a search result to inspect its lineage.',
      tone: 'idle',
    });
    expect(
      getMetadataLineagePresentation({
        kind: 'loading',
        direction: 'upstream',
        rootName: 'analytics.revenue',
      }),
    ).toEqual({
      heading: 'Loading upstream lineage',
      message: 'Tracing bounded upstream lineage for analytics.revenue…',
      tone: 'loading',
    });
  });

  it('presents success, empty, and truncated graphs distinctly', () => {
    expect(getMetadataLineagePresentation(successState())).toEqual({
      heading: 'Downstream lineage',
      message: '1 connected node within depth 2.',
      tone: 'success',
    });
    expect(getMetadataLineagePresentation(successState({ edges: false }))).toEqual({
      heading: 'No downstream lineage',
      message: 'The root entity exists, but no lineage was found within the requested bounds.',
      tone: 'empty',
    });
    expect(getMetadataLineagePresentation(successState({ truncated: true }))).toEqual({
      heading: 'Downstream lineage',
      message:
        'Showing 1 connected node; the graph reached a depth, node, edge, or provider-step bound.',
      tone: 'truncated',
    });
  });

  it('presents only the safe API error and rejects stale completion ownership', () => {
    expect(
      getMetadataLineagePresentation({
        kind: 'api-error',
        message: 'Metadata lineage timed out. Try again shortly.',
      }),
    ).toEqual({
      heading: 'Lineage failed',
      message: 'Metadata lineage timed out. Try again shortly.',
      tone: 'error',
    });

    const guard = createLatestRequestGuard();
    const olderLineage = guard.begin();
    const newerLineage = guard.begin();
    expect(guard.isCurrent(olderLineage)).toBe(false);
    expect(guard.isCurrent(newerLineage)).toBe(true);
  });
});
