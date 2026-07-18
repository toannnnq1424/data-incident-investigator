import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getMetadataRecentChangesPresentation,
  type MetadataRecentChangesState,
} from '../../apps/web/src/App.js';
import { MetadataRecentChangesResponseSchema } from '../../packages/shared-types/src/index.js';

const entityUrn = 'urn:li:dataset:root';

function successState({ changes = true, truncated = false } = {}) {
  return {
    kind: 'success',
    response: MetadataRecentChangesResponseSchema.parse({
      entityUrn,
      window: {
        startTime: '2026-07-12T08:30:00.000Z',
        endTime: '2026-07-19T08:30:00.000Z',
        hours: 168,
      },
      limit: 10,
      returnedCount: changes ? 1 : 0,
      truncated,
      changes: changes
        ? [
            {
              id: 'change-schema',
              entityUrn,
              timestamp: '2026-07-19T07:45:00.000Z',
              category: 'schema',
              operation: 'modified',
              source: 'fixture',
              summary: 'Schema modified: gross_revenue.',
              field: 'gross_revenue',
            },
          ]
        : [],
    }),
  } satisfies MetadataRecentChangesState;
}

describe('metadata recent changes presentation', () => {
  it('presents idle and controlled loading states as facts only', () => {
    expect(getMetadataRecentChangesPresentation({ kind: 'idle' })).toEqual({
      heading: 'Recent metadata changes',
      message: 'Choose recent changes on a search result or lineage node to inspect facts.',
      tone: 'idle',
    });
    expect(
      getMetadataRecentChangesPresentation({
        kind: 'loading',
        entityName: 'analytics.revenue',
      }),
    ).toEqual({
      heading: 'Loading recent changes',
      message: 'Loading bounded metadata history for analytics.revenue…',
      tone: 'loading',
    });
  });

  it('presents success, empty, and truncated results distinctly', () => {
    expect(getMetadataRecentChangesPresentation(successState())).toEqual({
      heading: 'Recent metadata changes',
      message: '1 metadata change found in the selected window.',
      tone: 'success',
    });
    expect(getMetadataRecentChangesPresentation(successState({ changes: false }))).toEqual({
      heading: 'No recent changes',
      message: 'No metadata changes were recorded for this entity in the selected window.',
      tone: 'empty',
    });
    expect(getMetadataRecentChangesPresentation(successState({ truncated: true }))).toEqual({
      heading: 'Recent metadata changes',
      message: 'Showing 1 bounded changes; older or additional history was omitted.',
      tone: 'truncated',
    });
    expect(
      getMetadataRecentChangesPresentation(successState({ changes: false, truncated: true })),
    ).toEqual({
      heading: 'No changes in this window',
      message: 'Older metadata history exists outside the selected bounded window.',
      tone: 'truncated',
    });
  });

  it('presents only safe API errors and rejects stale completion ownership', () => {
    expect(
      getMetadataRecentChangesPresentation({
        kind: 'api-error',
        message: 'Metadata recent changes timed out. Try again shortly.',
      }),
    ).toEqual({
      heading: 'Recent changes failed',
      message: 'Metadata recent changes timed out. Try again shortly.',
      tone: 'error',
    });

    const guard = createLatestRequestGuard();
    const olderHistory = guard.begin();
    const newerHistory = guard.begin();
    expect(guard.isCurrent(olderHistory)).toBe(false);
    expect(guard.isCurrent(newerHistory)).toBe(true);
  });
});
