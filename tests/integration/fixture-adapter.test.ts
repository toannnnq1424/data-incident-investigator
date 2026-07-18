import { describe, expect, it } from 'vitest';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';

describe('fixture metadata adapter', () => {
  it('returns only bounded entities, lineage, and recent changes from the canonical fixture', async () => {
    const adapter = createFixtureMetadataAdapter();
    await expect(adapter.healthCheck()).resolves.toEqual({
      status: 'ready',
      message: 'Fixture metadata is ready.',
    });

    const matches = await adapter.searchEntities({ query: 'analytics.daily_revenue', limit: 1 });
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

  it('returns deterministic multiple, empty, and entity-type filtered public searches', async () => {
    const adapter = createFixtureMetadataAdapter();

    const multiple = await adapter.searchEntities({ query: 'revenue', limit: 10 });
    const empty = await adapter.searchEntities({
      query: 'unrelated customer support tickets',
      limit: 10,
    });
    const datasets = await adapter.searchEntities({
      query: 'revenue',
      entityType: 'dataset',
      limit: 10,
    });

    expect(multiple.map((entity) => entity.name)).toEqual([
      'analytics.daily_revenue',
      'Revenue overview',
    ]);
    expect(empty).toEqual([]);
    expect(datasets.map((entity) => entity.name)).toEqual(['analytics.daily_revenue']);
    expect(multiple[0]).toMatchObject({
      qualifiedName: 'snowflake.analytics.daily_revenue',
      description: 'Daily revenue metrics derived from raw order records.',
    });
  });

  it('uses the declared fixture seed only when the incident runner requests fallback', async () => {
    const adapter = createFixtureMetadataAdapter();

    const matches = await adapter.searchEntities({
      query: 'unrelated customer support tickets',
      limit: 2,
      fallbackToDefault: true,
    });

    expect(matches.map((entity) => entity.name)).toEqual(['analytics.daily_revenue']);
  });
});
