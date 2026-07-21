import { describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicIncidentContextGatherer,
  parseIncidentIntent,
  type IncidentContextMetadata,
} from '../../packages/agent-core/src/index.js';
import {
  createFixtureMetadataAdapter,
  MetadataProviderError,
} from '../../packages/datahub-client/src/index.js';
import { IncidentRequestSchema } from '../../packages/shared-types/src/index.js';
import type { MetadataInvestigationOperation } from '../../packages/shared-types/src/index.js';

function countedFixtureMetadata() {
  const adapter = createFixtureMetadataAdapter();
  const calls = { health: 0, search: 0, lineage: 0, recentChanges: 0 };
  const metadata: IncidentContextMetadata = {
    async healthCheck(options) {
      calls.health += 1;
      return adapter.healthCheck(options);
    },
    async searchEntities(options) {
      calls.search += 1;
      return adapter.searchEntities(options);
    },
    async getLineageGraph(options) {
      calls.lineage += 1;
      return adapter.getLineageGraph(options);
    },
    async getRecentChangesForEntity(options) {
      calls.recentChanges += 1;
      return adapter.getRecentChangesForEntity(options);
    },
  };
  return { calls, metadata };
}

describe('deterministic incident context gatherer', () => {
  it('normalizes intake and gathers only bounded adapter-evidenced facts', async () => {
    const request = IncidentRequestSchema.parse({
      ...canonicalIncident.request,
      question: '  Why did revenue\n drop after the morning warehouse refresh?  ',
    });
    const first = countedFixtureMetadata();
    const second = countedFixtureMetadata();
    const gatherer = new DeterministicIncidentContextGatherer();
    const firstOperations: MetadataInvestigationOperation[] = [];
    const secondOperations: MetadataInvestigationOperation[] = [];

    const firstContext = await gatherer.gather(request, {
      metadata: first.metadata,
      mode: 'fixture',
      limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
      recordCompletedOperation: (operation) => firstOperations.push(operation),
    });
    const secondContext = await gatherer.gather(request, {
      metadata: second.metadata,
      mode: 'fixture',
      limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
      recordCompletedOperation: (operation) => secondOperations.push(operation),
    });

    expect(firstContext).toEqual(secondContext);
    expect(firstContext.intent).toMatchObject({
      question: 'Why did revenue drop after the morning warehouse refresh?',
      entityHints: ['analytics.daily_revenue'],
      symptoms: ['Revenue is 42% below the seven-day baseline.'],
      timeWindow: {
        endTime: '2026-07-18T08:30:00.000Z',
        hours: 168,
        basis: 'incident_time',
      },
    });
    expect(firstContext.facts.selectedEntity).toEqual(firstContext.facts.candidateEntities[0]);
    expect(firstContext.facts.lineage?.rootUrn).toBe(firstContext.facts.selectedEntity?.urn);
    expect(
      firstContext.facts.recentChanges.flatMap((response) =>
        response.changes.map((change) => change.id),
      ),
    ).toContain('change-removed-gross-revenue');
    expect(firstContext).not.toHaveProperty('hypotheses');
    expect(first.calls).toEqual({ health: 1, search: 1, lineage: 1, recentChanges: 1 });
    expect(firstOperations).toEqual([
      'metadata_health',
      'entity_search',
      'lineage',
      'recent_changes',
    ]);
    expect(secondOperations).toEqual(firstOperations);
  });

  it('uses the entity hint or question deterministically and never invents a no-match entity', async () => {
    const queries: string[] = [];
    let lineageCalls = 0;
    let recentChangeCalls = 0;
    const metadata: IncidentContextMetadata = {
      async healthCheck() {
        return { status: 'ready', message: 'Ready.' };
      },
      async searchEntities(options) {
        queries.push(options.query);
        return [];
      },
      async getLineageGraph() {
        lineageCalls += 1;
        throw new Error('Lineage must not run without an adapter candidate.');
      },
      async getRecentChangesForEntity() {
        recentChangeCalls += 1;
        throw new Error('Recent changes must not run without an adapter candidate.');
      },
    };
    const gatherer = new DeterministicIncidentContextGatherer();
    const withHint = IncidentRequestSchema.parse({
      question: 'Why is this dashboard stale?',
      entityHint: 'finance.revenue',
    });
    const withoutHint = IncidentRequestSchema.parse({
      question: '  Which pipeline\n stopped updating? ',
    });

    const hintedContext = await gatherer.gather(withHint, {
      metadata,
      mode: 'fixture',
      limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
    });
    const questionContext = await gatherer.gather(withoutHint, {
      metadata,
      mode: 'fixture',
      limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
    });

    expect(queries).toEqual(['finance.revenue', 'Which pipeline stopped updating?']);
    expect(hintedContext.facts.candidateEntities).toEqual([]);
    expect(hintedContext.facts.selectedEntity).toBeUndefined();
    expect(questionContext.facts.selectedEntity).toBeUndefined();
    expect(hintedContext.missingInformation.map((item) => item.code)).toContain('entity_not_found');
    expect(lineageCalls).toBe(0);
    expect(recentChangeCalls).toBe(0);
  });

  it('enforces limits before calls and converts one total timeout into a typed provider failure', async () => {
    const gatherer = new DeterministicIncidentContextGatherer();
    const request = IncidentRequestSchema.parse({ question: 'Why is revenue missing?' });
    let calls = 0;
    const completedOperations: MetadataInvestigationOperation[] = [];
    const metadata: IncidentContextMetadata = {
      async healthCheck() {
        calls += 1;
        return new Promise(() => undefined);
      },
      async searchEntities() {
        throw new Error('Unexpected search.');
      },
      async getLineageGraph() {
        throw new Error('Unexpected lineage.');
      },
      async getRecentChangesForEntity() {
        throw new Error('Unexpected recent changes.');
      },
    };

    await expect(
      gatherer.gather(request, {
        metadata,
        mode: 'fixture',
        limits: { ...DEFAULT_INCIDENT_CONTEXT_LIMITS, candidateEntityCount: 6 },
      }),
    ).rejects.toThrow('Incident context limits exceed the supported deterministic bounds.');
    expect(calls).toBe(0);

    try {
      await gatherer.gather(request, {
        metadata,
        mode: 'fixture',
        limits: { ...DEFAULT_INCIDENT_CONTEXT_LIMITS, timeoutMs: 5 },
        recordCompletedOperation: (operation) => completedOperations.push(operation),
      });
      throw new Error('Expected incident context gathering to time out.');
    } catch (error) {
      expect(error).toBeInstanceOf(MetadataProviderError);
      expect((error as MetadataProviderError).status).toBe('timeout');
    }
    expect(calls).toBe(1);
    expect(completedOperations).toEqual([]);
  });

  it('does not fan out after a provider ignores the aborted signal', async () => {
    const gatherer = new DeterministicIncidentContextGatherer();
    const request = IncidentRequestSchema.parse({ question: 'Why is revenue missing?' });
    let searchCalls = 0;
    const metadata: IncidentContextMetadata = {
      async healthCheck() {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { status: 'ready', message: 'Ready.' };
      },
      async searchEntities() {
        searchCalls += 1;
        return [];
      },
      async getLineageGraph() {
        throw new Error('Lineage must not run after timeout.');
      },
      async getRecentChangesForEntity() {
        throw new Error('Recent changes must not run after timeout.');
      },
    };

    await expect(
      gatherer.gather(request, {
        metadata,
        mode: 'fixture',
        limits: { ...DEFAULT_INCIDENT_CONTEXT_LIMITS, timeoutMs: 5 },
      }),
    ).rejects.toMatchObject({ status: 'timeout' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(searchCalls).toBe(0);
  });

  it('keeps fixture context byte-stable when DataHub credential variables change', async () => {
    const request = IncidentRequestSchema.parse(canonicalIncident.request);
    const gatherer = new DeterministicIncidentContextGatherer();
    const originalUrl = process.env.DATAHUB_GMS_URL;
    const originalToken = process.env.DATAHUB_TOKEN;
    const baseline = await gatherer.gather(request, {
      metadata: createFixtureMetadataAdapter(),
      mode: 'fixture',
      limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
    });

    try {
      process.env.DATAHUB_GMS_URL = 'https://credentials-must-not-affect-fixtures.invalid';
      process.env.DATAHUB_TOKEN = 'fixture-must-not-read-this-value';
      const withCredentialVariables = await gatherer.gather(request, {
        metadata: createFixtureMetadataAdapter(),
        mode: 'fixture',
        limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
      });
      expect(withCredentialVariables).toEqual(baseline);
    } finally {
      if (originalUrl === undefined) {
        delete process.env.DATAHUB_GMS_URL;
      } else {
        process.env.DATAHUB_GMS_URL = originalUrl;
      }
      if (originalToken === undefined) {
        delete process.env.DATAHUB_TOKEN;
      } else {
        process.env.DATAHUB_TOKEN = originalToken;
      }
    }
  });

  it('parses offset incident times into a canonical UTC context window', () => {
    expect(
      parseIncidentIntent({
        question: 'Why is revenue stale?',
        occurredAt: '2026-07-18T15:30:00+07:00',
      }).timeWindow,
    ).toEqual({
      endTime: '2026-07-18T08:30:00.000Z',
      hours: 168,
      basis: 'incident_time',
    });
  });
});
