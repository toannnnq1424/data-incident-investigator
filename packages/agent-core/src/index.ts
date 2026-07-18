import type { MetadataAdapter, MetadataChange } from '@dii/datahub-client';
import {
  InvestigationReportSchema,
  type Evidence,
  type IncidentRequest,
  type InvestigationReport,
} from '@dii/shared-types';

export interface InvestigationLimits {
  lineageDepth: number;
  entityCount: number;
  recentChangeCount: number;
  toolCalls: number;
  timeoutMs: number;
}

export interface InvestigationContext {
  incidentId: string;
  metadata: MetadataAdapter;
  limits: InvestigationLimits;
}

export interface InvestigationRunner {
  investigate(
    request: IncidentRequest,
    context: InvestigationContext,
  ): Promise<InvestigationReport>;
}

export const FIXTURE_INVESTIGATION_LIMITS: InvestigationLimits = Object.freeze({
  lineageDepth: 1,
  entityCount: 4,
  recentChangeCount: 4,
  toolCalls: 4,
  timeoutMs: 2_000,
});

const requiredToolCalls = 4;
const fixtureFallbackSince = '1970-01-01T00:00:00.000Z';

function recentChangeBoundary(occurredAt: string | undefined) {
  if (!occurredAt) {
    return fixtureFallbackSince;
  }

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1_000;
  return new Date(Date.parse(occurredAt) - sevenDaysMs).toISOString();
}

function changeEvidenceCategory(change: MetadataChange): Evidence['category'] {
  if (change.category === 'schema') {
    return 'schema-change';
  }
  if (change.category === 'pipeline') {
    return 'pipeline';
  }
  if (change.category === 'ownership') {
    return 'ownership';
  }
  return 'metadata';
}

function validateLimits(limits: InvestigationLimits) {
  if (
    limits.lineageDepth < 0 ||
    limits.entityCount < 1 ||
    limits.recentChangeCount < 0 ||
    limits.toolCalls < requiredToolCalls ||
    limits.timeoutMs < 1
  ) {
    throw new Error('Investigation limits do not permit the required bounded fixture workflow.');
  }
}

export class DeterministicInvestigationRunner implements InvestigationRunner {
  async investigate(
    request: IncidentRequest,
    context: InvestigationContext,
  ): Promise<InvestigationReport> {
    validateLimits(context.limits);

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('The fixture investigation exceeded its duration limit.')),
        context.limits.timeoutMs,
      );
    });

    try {
      return await Promise.race([this.runInvestigation(request, context), timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private async runInvestigation(
    request: IncidentRequest,
    context: InvestigationContext,
  ): Promise<InvestigationReport> {
    const { metadata, limits } = context;
    await metadata.healthCheck();

    const candidates = await metadata.searchEntities({
      query: request.entityHint ?? request.question,
      limit: limits.entityCount,
      fallbackToDefault: true,
    });
    const seed = candidates[0];
    if (!seed) {
      throw new Error('The fixture did not return an investigation seed.');
    }

    const lineage = await metadata.getLineage(
      seed,
      limits.lineageDepth,
      Math.max(0, limits.entityCount - 1),
    );
    const entities = [
      ...new Map(
        [lineage.seed, ...lineage.upstream, ...lineage.downstream].map(
          (entity) => [entity.urn, entity] as const,
        ),
      ).values(),
    ];
    const changes = await metadata.getRecentChanges(
      entities,
      recentChangeBoundary(request.occurredAt),
      limits.recentChangeCount,
    );

    const evidence: Evidence[] = [
      {
        id: 'metadata-seed',
        category: 'metadata',
        statement: `Fixture metadata identifies ${lineage.seed.name} as the investigation seed.`,
        sourceEntity: lineage.seed,
      },
      ...lineage.upstream.map((entity, index) => ({
        id: `lineage-upstream-${index + 1}`,
        category: 'lineage' as const,
        statement: `Fixture lineage shows ${entity.name} upstream of ${lineage.seed.name}.`,
        sourceEntity: entity,
      })),
      ...lineage.downstream.map((entity, index) => ({
        id: `lineage-downstream-${index + 1}`,
        category: 'lineage' as const,
        statement: `Fixture lineage shows ${entity.name} downstream of ${lineage.seed.name}.`,
        sourceEntity: entity,
      })),
      ...changes.map((change) => ({
        id: change.id,
        category: changeEvidenceCategory(change),
        statement: change.summary,
        sourceEntity: change.entity,
        observedAt: change.observedAt,
      })),
    ];

    const leadingChange = changes.find((change) => change.category === 'schema') ?? changes[0];
    const lineageEvidenceId = evidence.find((item) => item.category === 'lineage')?.id;
    const hypothesisEvidenceIds = leadingChange
      ? [leadingChange.id, ...(lineageEvidenceId ? [lineageEvidenceId] : [])]
      : ['metadata-seed'];
    const hypothesisSummary = leadingChange
      ? `A recent ${leadingChange.category} change on ${leadingChange.entity.name} likely caused the reported incident.`
      : `The available fixture metadata points to ${lineage.seed.name}, but no recent change was captured.`;

    return InvestigationReportSchema.parse({
      incidentId: context.incidentId,
      summary: `The strongest evidence-backed inference is: ${hypothesisSummary}`,
      entities,
      evidence,
      hypotheses: [
        {
          id: 'hypothesis-recent-change',
          summary: hypothesisSummary,
          confidence: leadingChange ? 0.92 : 0.35,
          evidenceIds: hypothesisEvidenceIds,
        },
      ],
      recommendations: leadingChange
        ? [
            `Confirm the schema contract for ${leadingChange.entity.name} and restore or intentionally replace the removed field.`,
          ]
        : [`Inspect runtime records for ${lineage.seed.name} before changing production data.`],
      assumptions: ['The canonical fixture snapshot represents the incident investigation window.'],
      missingInformation: [
        'Runtime query logs and production pipeline execution records are not included in this bounded fixture.',
      ],
    });
  }
}
