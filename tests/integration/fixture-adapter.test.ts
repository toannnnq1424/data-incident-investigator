import { describe, expect, it } from 'vitest';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';

describe('fixture metadata adapter', () => {
  it('keeps invalid fixture assets safely observable through health', async () => {
    const adapter = createFixtureMetadataAdapter({
      rawSecret: 'fixture-token-secret private-fixture.internal stack-trace',
    });

    const health = await adapter.healthCheck();
    expect(health).toEqual({
      status: 'invalid_response',
      message: 'Fixture runtime assets are invalid.',
    });
    expect(JSON.stringify(health)).not.toMatch(
      /fixture-token-secret|private-fixture\.internal|stack-trace/i,
    );
    await expect(adapter.searchEntities({ query: 'revenue', limit: 1 })).rejects.toMatchObject({
      status: 'invalid_response',
    });
  });

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

  it('returns deterministic multi-depth and branching lineage while terminating cycles and self-loops', async () => {
    const adapter = createFixtureMetadataAdapter();
    const rootUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)';

    const upstream = await adapter.getLineageGraph({
      rootUrn,
      direction: 'upstream',
      depth: 2,
      maxNodes: 8,
    });
    const downstream = await adapter.getLineageGraph({
      rootUrn,
      direction: 'downstream',
      depth: 2,
      maxNodes: 8,
    });

    expect(upstream.nodes.map((node) => `${node.depth}:${node.name}`)).toContain(
      '2:lineage.demo.upstream_raw',
    );
    expect(downstream.nodes.map((node) => node.name)).toEqual([
      'lineage.demo.root',
      'Lineage demo chart',
      'Lineage demo dashboard',
      'lineage.demo.upstream_stage',
    ]);
    expect(downstream.edges).toContainEqual({ sourceUrn: rootUrn, targetUrn: rootUrn });
    expect(new Set(downstream.nodes.map((node) => node.urn)).size).toBe(downstream.nodes.length);
    expect(new Set(downstream.edges.map((edge) => JSON.stringify(edge))).size).toBe(
      downstream.edges.length,
    );
    expect(downstream.truncated).toBe(false);
  });

  it('reports empty, missing-root, depth-truncated, and node-truncated fixture lineage safely', async () => {
    const adapter = createFixtureMetadataAdapter();
    const rootUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)';
    const emptyUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.empty_source,PROD)';

    const empty = await adapter.getLineageGraph({
      rootUrn: emptyUrn,
      direction: 'upstream',
      depth: 2,
      maxNodes: 8,
    });
    const depthTruncated = await adapter.getLineageGraph({
      rootUrn,
      direction: 'upstream',
      depth: 1,
      maxNodes: 8,
    });
    const nodeTruncated = await adapter.getLineageGraph({
      rootUrn,
      direction: 'downstream',
      depth: 2,
      maxNodes: 3,
    });

    expect(empty).toMatchObject({ visitedNodeCount: 1, truncated: false, edges: [] });
    expect(depthTruncated.truncated).toBe(true);
    expect(nodeTruncated).toMatchObject({ visitedNodeCount: 3, truncated: true });
    expect(nodeTruncated.nodes.map((node) => node.name)).toEqual([
      'lineage.demo.root',
      'Lineage demo chart',
      'Lineage demo dashboard',
    ]);
    await expect(
      adapter.getLineageGraph({
        rootUrn: 'urn:li:dataset:missing',
        direction: 'upstream',
        depth: 2,
        maxNodes: 8,
      }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'not_found' });
  });

  it('returns deterministic deduplicated recent changes with window and limit truncation', async () => {
    const adapter = createFixtureMetadataAdapter();
    const rootUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)';

    const full = await adapter.getRecentChangesForEntity({
      entityUrn: rootUrn,
      endTime: '2026-07-19T08:30:00.000Z',
      windowHours: 168,
      limit: 10,
    });
    const limited = await adapter.getRecentChangesForEntity({
      entityUrn: rootUrn,
      endTime: '2026-07-19T08:30:00.000Z',
      windowHours: 168,
      limit: 2,
    });
    const shortWindow = await adapter.getRecentChangesForEntity({
      entityUrn: rootUrn,
      endTime: '2026-07-19T08:30:00.000Z',
      windowHours: 24,
      limit: 10,
    });

    expect(full.changes.map((change) => change.id)).toEqual([
      'change-root-owner',
      'change-root-schema',
      'change-root-tag',
    ]);
    expect(full.changes.map((change) => change.category)).toEqual(['ownership', 'schema', 'tag']);
    expect(full.changes[1]).toMatchObject({
      timestamp: '2026-07-19T07:45:00.000Z',
      operation: 'modified',
      field: 'gross_revenue',
      source: 'fixture',
    });
    expect(full).toMatchObject({ returnedCount: 3, truncated: true });
    expect(limited.changes.map((change) => change.id)).toEqual([
      'change-root-owner',
      'change-root-schema',
    ]);
    expect(limited).toMatchObject({ returnedCount: 2, truncated: true });
    expect(shortWindow.changes.map((change) => change.id)).toEqual([
      'change-root-owner',
      'change-root-schema',
    ]);
    expect(shortWindow.truncated).toBe(true);
  });

  it('reports empty, missing-entity, and aborted fixture recent-change requests safely', async () => {
    const adapter = createFixtureMetadataAdapter();
    const emptyUrn = 'urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.empty_source,PROD)';
    const empty = await adapter.getRecentChangesForEntity({
      entityUrn: emptyUrn,
      endTime: '2026-07-19T08:30:00.000Z',
      windowHours: 168,
      limit: 10,
    });
    expect(empty).toMatchObject({ returnedCount: 0, truncated: false, changes: [] });

    await expect(
      adapter.getRecentChangesForEntity({
        entityUrn: 'urn:li:dataset:missing',
        windowHours: 168,
        limit: 10,
      }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'not_found' });

    const controller = new AbortController();
    controller.abort();
    await expect(
      adapter.getRecentChangesForEntity({
        entityUrn: emptyUrn,
        windowHours: 168,
        limit: 10,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'MetadataProviderError', status: 'timeout' });
  });
});
