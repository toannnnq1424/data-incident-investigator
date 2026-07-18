import { describe, expect, it } from 'vitest';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';

describe('fixture metadata adapter', () => {
  it('returns only bounded entities, lineage, and recent changes from the canonical fixture', async () => {
    const adapter = createFixtureMetadataAdapter();
    await expect(adapter.healthCheck()).resolves.toEqual({
      status: 'ready',
      message: 'Fixture metadata is ready.',
    });

    const matches = await adapter.searchEntities('analytics.daily_revenue', 1);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.name).toBe('analytics.daily_revenue');

    const seed = matches[0];
    expect(seed).toBeDefined();
    if (!seed) {
      throw new Error('Expected the canonical fixture seed.');
    }

    const boundedLineage = await adapter.getLineage(seed, 1, 1);
    expect(boundedLineage.upstream.map((entity) => entity.name)).toEqual(['raw.orders']);
    expect(boundedLineage.downstream).toEqual([]);
    expect(boundedLineage.truncated).toBe(true);

    const fullLineage = await adapter.getLineage(seed, 1, 4);
    expect(fullLineage.downstream.map((entity) => entity.name)).toEqual(['Revenue overview']);

    const changes = await adapter.getRecentChanges(
      [seed, ...fullLineage.upstream],
      '2026-07-11T08:30:00.000Z',
      1,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]?.id).toBe('change-removed-gross-revenue');
  });

  it('uses the declared fixture seed when a query has no fixture match', async () => {
    const adapter = createFixtureMetadataAdapter();

    const matches = await adapter.searchEntities('unrelated customer support metric', 2);

    expect(matches.map((entity) => entity.name)).toEqual(['analytics.daily_revenue']);
  });
});
