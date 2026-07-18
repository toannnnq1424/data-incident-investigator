import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  getMetadataSearchPresentation,
  type MetadataSearchState,
} from '../../apps/web/src/App.js';
import { MetadataEntitySearchResponseSchema } from '../../packages/shared-types/src/index.js';

function successState(results: Array<{ kind: 'dataset'; name: string; urn: string }>) {
  return {
    kind: 'success',
    response: MetadataEntitySearchResponseSchema.parse({
      query: 'revenue',
      limit: 10,
      results,
    }),
  } satisfies MetadataSearchState;
}

describe('metadata entity search presentation', () => {
  it('presents idle and loading states with controlled status copy', () => {
    expect(getMetadataSearchPresentation({ kind: 'idle' })).toEqual({
      heading: 'Search results',
      message: 'Enter a metadata query to find datasets, dashboards, charts, or pipelines.',
      tone: 'idle',
    });
    expect(getMetadataSearchPresentation({ kind: 'loading' })).toEqual({
      heading: 'Searching metadata',
      message: 'Searching the selected metadata source…',
      tone: 'loading',
    });
  });

  it('presents successful and empty responses explicitly', () => {
    expect(
      getMetadataSearchPresentation(
        successState([
          {
            urn: 'urn:li:dataset:daily-revenue',
            kind: 'dataset',
            name: 'analytics.daily_revenue',
          },
        ]),
      ),
    ).toEqual({
      heading: 'Search results',
      message: '1 metadata entity found.',
      tone: 'success',
    });
    expect(getMetadataSearchPresentation(successState([]))).toEqual({
      heading: 'No results',
      message: 'No metadata entities matched “revenue”.',
      tone: 'empty',
    });
  });

  it('presents client validation and safe API errors distinctly', () => {
    expect(
      getMetadataSearchPresentation({
        kind: 'validation-error',
        message: 'Query must contain at least two characters.',
      }),
    ).toEqual({
      heading: 'Check the search query',
      message: 'Query must contain at least two characters.',
      tone: 'error',
    });
    expect(
      getMetadataSearchPresentation({
        kind: 'api-error',
        message: 'Metadata search timed out. Try again shortly.',
      }),
    ).toEqual({
      heading: 'Search failed',
      message: 'Metadata search timed out. Try again shortly.',
      tone: 'error',
    });
  });

  it('prevents an older request from becoming current after a newer request begins', () => {
    const guard = createLatestRequestGuard();
    const olderRequest = guard.begin();
    const newerRequest = guard.begin();

    expect(guard.isCurrent(olderRequest)).toBe(false);
    expect(guard.isCurrent(newerRequest)).toBe(true);
  });
});
