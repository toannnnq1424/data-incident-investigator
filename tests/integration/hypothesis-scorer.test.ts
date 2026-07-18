import { describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicHypothesisScorer,
  DeterministicIncidentContextGatherer,
  DeterministicSuspiciousChangeDetector,
  type IncidentContextMetadata,
} from '../../packages/agent-core/src/index.js';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';
import {
  IncidentContextCompletedStageSchema,
  IncidentRequestSchema,
  type Evidence,
  type IncidentContextCompletedStage,
  type SuspiciousChangeDetectionResult,
} from '../../packages/shared-types/src/index.js';

async function canonicalContext() {
  return new DeterministicIncidentContextGatherer().gather(
    IncidentRequestSchema.parse(canonicalIncident.request),
    {
      metadata: createFixtureMetadataAdapter(),
      mode: 'fixture',
      limits: DEFAULT_INCIDENT_CONTEXT_LIMITS,
    },
  );
}

function evidenceFor(
  context: IncidentContextCompletedStage,
  suspicious: SuspiciousChangeDetectionResult,
): Evidence[] {
  if (suspicious.status !== 'completed') return [];
  return suspicious.candidates.map((candidate) => {
    const entity = context.facts.lineage?.nodes.find((node) => node.urn === candidate.entityUrn);
    if (!entity) throw new Error('Expected candidate entity in factual lineage.');
    return {
      id: candidate.changeId,
      category:
        candidate.category === 'schema'
          ? 'schema-change'
          : candidate.category === 'pipeline'
            ? 'pipeline'
            : candidate.category === 'ownership'
              ? 'ownership'
              : 'metadata',
      statement: candidate.summary,
      sourceEntity: { urn: entity.urn, name: entity.name, kind: entity.kind },
      observedAt: candidate.observedAt,
    };
  });
}

function contextWithChanges(
  base: IncidentContextCompletedStage,
  changes: NonNullable<IncidentContextCompletedStage['facts']['recentChanges'][number]>['changes'],
  overrides: Partial<IncidentContextCompletedStage['intent']> = {},
) {
  const recentChanges = base.facts.recentChanges[0];
  if (!recentChanges) throw new Error('Expected canonical recent-change response.');
  return IncidentContextCompletedStageSchema.parse({
    ...base,
    intent: { ...base.intent, ...overrides },
    facts: {
      ...base.facts,
      recentChanges: [{ ...recentChanges, returnedCount: changes.length, changes }],
    },
  });
}

describe('deterministic evidence-linked hypothesis scorer', () => {
  it('scores the canonical removed column as a stable 0.85 plausible contributor', async () => {
    const context = await canonicalContext();
    const suspicious = new DeterministicSuspiciousChangeDetector().detect(context);
    const evidence = evidenceFor(context, suspicious);
    const scorer = new DeterministicHypothesisScorer();

    const first = scorer.score(context, suspicious, evidence);
    const second = scorer.score(context, suspicious, evidence);

    expect(second).toEqual(first);
    expect(first).toEqual({
      status: 'completed',
      hypotheses: [
        {
          id: 'hypothesis-change-removed-gross-revenue',
          rank: 1,
          sourceChangeId: 'change-removed-gross-revenue',
          observedAt: '2026-07-18T07:45:00.000Z',
          summary:
            'Plausible contributor: the removed schema change on raw.orders may have contributed to the incident.',
          confidence: 0.85,
          evidenceIds: ['change-removed-gross-revenue'],
          factors: [
            expect.objectContaining({ code: 'change_recency', contributionBasisPoints: 3_000 }),
            expect.objectContaining({ code: 'lineage_position', contributionBasisPoints: 2_000 }),
            expect.objectContaining({
              code: 'symptom_category_fit',
              contributionBasisPoints: 1_500,
            }),
            expect.objectContaining({ code: 'evidence_quality', contributionBasisPoints: 2_000 }),
          ],
        },
      ],
      missingInformation: [],
    });
    expect(JSON.stringify(first)).not.toMatch(/confirmed cause|recommendation|remediation|action/i);
  });

  it('uses confidence, timestamp, change ID, and the three-hypothesis cap deterministically', async () => {
    const base = await canonicalContext();
    const canonicalChange = base.facts.recentChanges[0]?.changes[0];
    if (!canonicalChange) throw new Error('Expected canonical change.');
    const changes = ['a', 'b', 'c', 'd'].map((suffix) => ({
      ...canonicalChange,
      id: `change-${suffix}`,
      timestamp: '2026-07-18T07:40:00.000Z',
      summary:
        suffix === 'd'
          ? 'Revenue column field_d was removed from raw.orders.'
          : `Column field_${suffix} was removed from raw.orders.`,
      field: `field_${suffix}`,
    }));
    const context = contextWithChanges(base, changes);
    const suspicious = new DeterministicSuspiciousChangeDetector().detect(context);
    const result = new DeterministicHypothesisScorer().score(
      context,
      suspicious,
      evidenceFor(context, suspicious),
    );

    expect(result.status).toBe('completed');
    if (result.status !== 'completed') throw new Error('Expected ranked hypotheses.');
    expect(result.hypotheses.map((hypothesis) => hypothesis.sourceChangeId)).toEqual([
      'change-d',
      'change-a',
      'change-b',
    ]);
    expect(result.hypotheses.map((hypothesis) => hypothesis.rank)).toEqual([1, 2, 3]);
    expect(result.missingInformation).toContainEqual(
      expect.objectContaining({ code: 'hypothesis_limit_reached' }),
    );
  });

  it('keeps missing time and symptom explicit while scoring available category evidence', async () => {
    const base = await canonicalContext();
    const context = IncidentContextCompletedStageSchema.parse({
      ...base,
      intent: {
        question: 'Which schema column changed?',
        entityHints: base.intent.entityHints,
        symptoms: [],
        timeWindow: { basis: 'provider_default', hours: 168 },
      },
    });
    const suspicious = new DeterministicSuspiciousChangeDetector().detect(context);
    const result = new DeterministicHypothesisScorer().score(
      context,
      suspicious,
      evidenceFor(context, suspicious),
    );

    expect(result.status).toBe('completed');
    if (result.status !== 'completed') throw new Error('Expected category-scored hypothesis.');
    expect(result.hypotheses[0]?.confidence).toBe(0.7);
    expect(result.hypotheses[0]?.factors.map((factor) => factor.contributionBasisPoints)).toEqual([
      0, 2_000, 3_000, 2_000,
    ]);
    expect(result.missingInformation.map((item) => item.code)).toEqual([
      'incident_time_not_supplied',
      'symptom_not_supplied',
    ]);
  });

  it('returns insufficient for suspicious gaps, material truncation, or unresolved evidence', async () => {
    const base = await canonicalContext();
    const detector = new DeterministicSuspiciousChangeDetector();
    const suspicious = detector.detect(base);
    const recentChanges = base.facts.recentChanges[0];
    if (!recentChanges) throw new Error('Expected recent changes.');
    const truncated = IncidentContextCompletedStageSchema.parse({
      ...base,
      facts: {
        ...base.facts,
        recentChanges: [{ ...recentChanges, truncated: true }],
      },
      missingInformation: [
        {
          code: 'recent_changes_truncated',
          message: 'Additional metadata change history exists outside the selected bounds.',
        },
      ],
    });
    const truncatedSuspicious = detector.detect(truncated);
    const scorer = new DeterministicHypothesisScorer();
    const lowQuality = IncidentContextCompletedStageSchema.parse({
      ...base,
      facts: {
        ...base.facts,
        lineage: base.facts.lineage ? { ...base.facts.lineage, truncated: true } : undefined,
      },
      missingInformation: [
        {
          code: 'lineage_truncated',
          message: 'Additional upstream lineage exists outside the selected bounds.',
        },
      ],
    });
    const lowQualitySuspicious = detector.detect(lowQuality);
    const lowQualityResult = scorer.score(
      lowQuality,
      lowQualitySuspicious,
      evidenceFor(lowQuality, lowQualitySuspicious),
    );

    expect(lowQualityResult.status).toBe('completed');
    if (lowQualityResult.status !== 'completed') {
      throw new Error('Expected a bounded low-quality score.');
    }
    expect(lowQualityResult.hypotheses[0]?.confidence).toBe(0.75);
    expect(lowQualityResult.hypotheses[0]?.factors[3]).toMatchObject({
      code: 'evidence_quality',
      contributionBasisPoints: 1_000,
    });

    expect(
      scorer.score(truncated, truncatedSuspicious, evidenceFor(truncated, truncatedSuspicious)),
    ).toMatchObject({
      status: 'insufficient',
      hypotheses: [],
      missingInformation: expect.arrayContaining([
        expect.objectContaining({ code: 'context_changes_truncated' }),
      ]),
    });
    expect(scorer.score(base, suspicious, [])).toMatchObject({
      status: 'insufficient',
      hypotheses: [],
      missingInformation: [expect.objectContaining({ code: 'evidence_reference_unresolved' })],
    });
    expect(
      scorer.score(
        base,
        {
          status: 'insufficient',
          candidates: [],
          missingInformation: [
            { code: 'recent_changes_not_found', message: 'No recent changes were available.' },
          ],
        },
        [],
      ),
    ).toMatchObject({
      status: 'insufficient',
      hypotheses: [],
      missingInformation: [expect.objectContaining({ code: 'suspicious_changes_insufficient' })],
    });
  });

  it('rejects invalid upstream lifecycle input and has no provider or environment dependency', async () => {
    const scorer = new DeterministicHypothesisScorer();
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
    const context = await new DeterministicIncidentContextGatherer().gather(
      IncidentRequestSchema.parse(canonicalIncident.request),
      { metadata, mode: 'fixture', limits: DEFAULT_INCIDENT_CONTEXT_LIMITS },
    );
    const suspicious = new DeterministicSuspiciousChangeDetector().detect(context);
    const callsBeforeScoring = { ...calls };
    const originalEnvironment = process.env.DATAHUB_TOKEN;

    expect(() => scorer.score({ status: 'gathering' } as never, suspicious, [])).toThrow();
    expect(() =>
      scorer.score(
        {
          status: 'failed',
          error: { code: 'METADATA_TIMEOUT', message: 'Safe timeout.' },
        } as never,
        suspicious,
        [],
      ),
    ).toThrow();
    scorer.score(context, suspicious, evidenceFor(context, suspicious));

    expect(calls).toEqual(callsBeforeScoring);
    expect(calls).toEqual({ health: 1, search: 1, lineage: 1, recentChanges: 1 });
    expect(process.env.DATAHUB_TOKEN).toBe(originalEnvironment);
  });
});
