import { z } from 'zod';

export const MetadataSourceModeSchema = z.enum(['fixture', 'datahub']);

export const MetadataHealthStatusSchema = z.enum([
  'ready',
  'unconfigured',
  'unauthorized',
  'unavailable',
  'timeout',
  'invalid_response',
]);

export const MetadataHealthResponseSchema = z.object({
  mode: MetadataSourceModeSchema,
  status: MetadataHealthStatusSchema,
  message: z.string().min(1).max(300),
});

export const EntityKindSchema = z.enum(['dataset', 'dashboard', 'pipeline', 'chart']);

export const EntityRefSchema = z.object({
  urn: z.string().min(1),
  name: z.string().min(1),
  kind: EntityKindSchema,
});

export const MetadataEntitySearchRequestSchema = z
  .object({
    query: z.string().trim().min(2).max(200),
    entityType: EntityKindSchema.optional(),
    limit: z.number().int().min(1).max(20).default(10),
  })
  .strict();

export const MetadataEntitySearchResultSchema = EntityRefSchema.extend({
  urn: z.string().trim().min(1).max(1_000),
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(1_000).optional(),
  qualifiedName: z.string().trim().min(1).max(500).optional(),
}).strict();

function compareSearchResults(
  left: z.infer<typeof MetadataEntitySearchResultSchema>,
  right: z.infer<typeof MetadataEntitySearchResultSchema>,
) {
  const leftName = left.name.toLowerCase();
  const rightName = right.name.toLowerCase();
  if (leftName !== rightName) {
    return leftName < rightName ? -1 : 1;
  }
  if (left.kind !== right.kind) {
    return left.kind < right.kind ? -1 : 1;
  }
  return left.urn < right.urn ? -1 : left.urn > right.urn ? 1 : 0;
}

export const MetadataEntitySearchResponseSchema = z
  .object({
    query: z.string().trim().min(2).max(200),
    entityType: EntityKindSchema.optional(),
    limit: z.number().int().min(1).max(20),
    results: z.array(MetadataEntitySearchResultSchema).max(20),
  })
  .strict()
  .superRefine((response, context) => {
    if (response.results.length > response.limit) {
      context.addIssue({
        code: 'custom',
        message: 'Search results exceed the accepted limit.',
        path: ['results'],
      });
    }

    const urns = new Set<string>();
    response.results.forEach((result, index) => {
      if (urns.has(result.urn)) {
        context.addIssue({
          code: 'custom',
          message: `Search result URN is duplicated: ${result.urn}`,
          path: ['results', index, 'urn'],
        });
      }
      urns.add(result.urn);

      const previous = response.results[index - 1];
      if (previous && compareSearchResults(previous, result) > 0) {
        context.addIssue({
          code: 'custom',
          message: 'Search results are not in deterministic order.',
          path: ['results', index],
        });
      }
    });
  });

export const IncidentRequestSchema = z.object({
  question: z.string().trim().min(3).max(2_000),
  entityHint: z.string().trim().min(1).max(500).optional(),
  occurredAt: z.iso.datetime().optional(),
  symptom: z.string().trim().min(1).max(2_000).optional(),
});

export const IncidentStatusSchema = z.enum(['processing', 'completed']);

export const IncidentAcceptedResponseSchema = z.object({
  incidentId: z.uuid(),
  status: z.literal('processing'),
});

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'INTERNAL_ERROR',
  'METADATA_UNCONFIGURED',
  'METADATA_UNAUTHORIZED',
  'METADATA_UNAVAILABLE',
  'METADATA_TIMEOUT',
  'METADATA_INVALID_RESPONSE',
]);

export const ApiErrorIssueSchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    issues: z.array(ApiErrorIssueSchema).optional(),
  }),
});

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['metadata', 'lineage', 'schema-change', 'pipeline', 'ownership']),
  statement: z.string().min(1),
  sourceEntity: EntityRefSchema.optional(),
  observedAt: z.iso.datetime().optional(),
});

export const HypothesisSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

export const InvestigationReportSchema = z
  .object({
    incidentId: z.string().min(1),
    summary: z.string().min(1),
    entities: z.array(EntityRefSchema),
    evidence: z.array(EvidenceSchema),
    hypotheses: z.array(HypothesisSchema).min(1),
    recommendations: z.array(z.string().min(1)),
    assumptions: z.array(z.string().min(1)),
    missingInformation: z.array(z.string().min(1)),
  })
  .superRefine((report, context) => {
    const evidenceIds = new Set(report.evidence.map((evidence) => evidence.id));

    report.hypotheses.forEach((hypothesis, hypothesisIndex) => {
      hypothesis.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!evidenceIds.has(evidenceId)) {
          context.addIssue({
            code: 'custom',
            message: `Hypothesis evidence reference does not exist: ${evidenceId}`,
            path: ['hypotheses', hypothesisIndex, 'evidenceIds', evidenceIndex],
          });
        }
      });
    });
  });

export const IncidentRetrievalResponseSchema = z.discriminatedUnion('status', [
  IncidentAcceptedResponseSchema,
  z.object({
    incidentId: z.uuid(),
    status: z.literal('completed'),
    report: InvestigationReportSchema,
  }),
]);

export type EntityKind = z.infer<typeof EntityKindSchema>;
export type EntityRef = z.infer<typeof EntityRefSchema>;
export type MetadataEntitySearchRequest = z.infer<typeof MetadataEntitySearchRequestSchema>;
export type MetadataEntitySearchResult = z.infer<typeof MetadataEntitySearchResultSchema>;
export type MetadataEntitySearchResponse = z.infer<typeof MetadataEntitySearchResponseSchema>;
export type MetadataSourceMode = z.infer<typeof MetadataSourceModeSchema>;
export type MetadataHealthStatus = z.infer<typeof MetadataHealthStatusSchema>;
export type MetadataHealthResponse = z.infer<typeof MetadataHealthResponseSchema>;
export type IncidentRequest = z.infer<typeof IncidentRequestSchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type IncidentAcceptedResponse = z.infer<typeof IncidentAcceptedResponseSchema>;
export type IncidentRetrievalResponse = z.infer<typeof IncidentRetrievalResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type InvestigationReport = z.infer<typeof InvestigationReportSchema>;
