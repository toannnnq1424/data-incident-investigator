import { describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicIncidentContextGatherer,
  DeterministicSuspiciousChangeDetector,
  type IncidentContextMetadata,
} from '../../packages/agent-core/src/index.js';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';
import {
  IncidentContextCompletedStageSchema,
  IncidentRequestSchema,
  SUSPICIOUS_CHANGE_MAX_CANDIDATES,
} from '../../packages/shared-types/src/index.js';

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

async function canonicalContext() {
  const gatherer = new DeterministicIncidentContextGatherer();
  return gatherer.gather(IncidentRequestSchema.parse(canonicalIncident.request), {
    metadata: createFixtureMetadataAdapter(),
    mode: 'fixture',
    limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
  });
}

describe('deterministic suspicious-change detector', () => {
  it('marks the canonical upstream schema removal with exact factual references and signals', async () => {
    const detector = new DeterministicSuspiciousChangeDetector();
    const first = detector.detect(await canonicalContext());
    const second = detector.detect(await canonicalContext());

    expect(second).toEqual(first);
    expect(first.status).toBe('completed');
    if (first.status !== 'completed') {
      throw new Error('Expected the canonical suspicious-change candidate.');
    }
    expect(first.candidates[0]).toMatchObject({
      changeId: 'change-removed-gross-revenue',
      entityUrn: 'urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)',
      entityName: 'raw.orders',
      category: 'schema',
      operation: 'removed',
      field: 'gross_revenue',
      signals: [
        { code: 'incident_window' },
        { code: 'upstream_lineage' },
        { code: 'disruptive_operation' },
      ],
    });
    expect(JSON.stringify(first)).not.toMatch(
      /hypothesis|confidence|rootCause|recommendation|remediation/i,
    );
  });

  it('uses stable priority/tie-break ordering and enforces the five-candidate cap', async () => {
    const base = await canonicalContext();
    const recentChanges = base.facts.recentChanges[0];
    const canonicalChange = recentChanges?.changes[0];
    if (!recentChanges || !canonicalChange) {
      throw new Error('Expected canonical recent-change facts.');
    }
    const changes = Array.from({ length: 7 }, (_, index) => ({
      ...canonicalChange,
      id: `change-cap-${index + 1}`,
      timestamp: new Date(Date.parse('2026-07-18T08:20:00.000Z') - index * 60_000).toISOString(),
      summary: `Column field_${index + 1} was removed from raw.orders.`,
      field: `field_${index + 1}`,
    }));
    const boundedContext = IncidentContextCompletedStageSchema.parse({
      ...base,
      facts: {
        ...base.facts,
        recentChanges: [
          {
            ...recentChanges,
            returnedCount: changes.length,
            changes,
          },
        ],
      },
    });

    const result = new DeterministicSuspiciousChangeDetector().detect(boundedContext);

    expect(result.status).toBe('completed');
    if (result.status !== 'completed') {
      throw new Error('Expected capped suspicious-change output.');
    }
    expect(result.candidates).toHaveLength(SUSPICIOUS_CHANGE_MAX_CANDIDATES);
    expect(result.candidates.map((candidate) => candidate.changeId)).toEqual([
      'change-cap-1',
      'change-cap-2',
      'change-cap-3',
      'change-cap-4',
      'change-cap-5',
    ]);
    expect(result.missingInformation.map((item) => item.code)).toContain('candidate_limit_reached');
  });

  it('returns insufficient for missing incident-specific signals or empty recent history', async () => {
    const base = await canonicalContext();
    const withoutIncidentSignals = IncidentContextCompletedStageSchema.parse({
      ...base,
      intent: {
        question: 'What changed?',
        entityHints: base.intent.entityHints,
        symptoms: [],
        timeWindow: { basis: 'provider_default', hours: 168 },
      },
    });
    const withoutHistory = IncidentContextCompletedStageSchema.parse({
      ...base,
      facts: {
        ...base.facts,
        recentChanges: base.facts.recentChanges.map((response) => ({
          ...response,
          returnedCount: 0,
          truncated: false,
          changes: [],
        })),
      },
    });
    const detector = new DeterministicSuspiciousChangeDetector();

    expect(detector.detect(withoutIncidentSignals)).toMatchObject({
      status: 'insufficient',
      candidates: [],
      missingInformation: expect.arrayContaining([
        expect.objectContaining({ code: 'incident_time_not_supplied' }),
        expect.objectContaining({ code: 'symptom_not_supplied' }),
        expect.objectContaining({ code: 'no_matching_signals' }),
      ]),
    });
    expect(detector.detect(withoutHistory)).toMatchObject({
      status: 'insufficient',
      candidates: [],
      missingInformation: expect.arrayContaining([
        expect.objectContaining({ code: 'recent_changes_not_found' }),
      ]),
    });
  });

  it('rejects gathering, failed, and duplicate-change contexts instead of fabricating output', async () => {
    const detector = new DeterministicSuspiciousChangeDetector();
    const base = await canonicalContext();
    const recentChanges = base.facts.recentChanges[0];
    const change = recentChanges?.changes[0];
    if (!recentChanges || !change) {
      throw new Error('Expected canonical recent-change facts.');
    }

    expect(() => detector.detect({ status: 'gathering' } as never)).toThrow();
    expect(() =>
      detector.detect({
        status: 'failed',
        error: { code: 'METADATA_TIMEOUT', message: 'Safe timeout.' },
      } as never),
    ).toThrow();
    expect(() =>
      detector.detect({
        ...base,
        facts: {
          ...base.facts,
          recentChanges: [
            {
              ...recentChanges,
              returnedCount: 2,
              changes: [change, change],
            },
          ],
        },
      } as never),
    ).toThrow();
  });

  it('performs zero additional adapter calls', async () => {
    const counted = countedFixtureMetadata();
    const context = await new DeterministicIncidentContextGatherer().gather(
      IncidentRequestSchema.parse(canonicalIncident.request),
      {
        metadata: counted.metadata,
        mode: 'fixture',
        limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
      },
    );
    const callsAfterGather = { ...counted.calls };

    new DeterministicSuspiciousChangeDetector().detect(context);

    expect(counted.calls).toEqual(callsAfterGather);
    expect(counted.calls).toEqual({ health: 1, search: 1, lineage: 1, recentChanges: 1 });
  });
});
