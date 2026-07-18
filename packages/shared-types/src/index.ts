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

export const METADATA_LINEAGE_DEFAULT_DEPTH = 2;
export const METADATA_LINEAGE_MAX_DEPTH = 5;
export const METADATA_LINEAGE_DEFAULT_MAX_NODES = 8;
export const METADATA_LINEAGE_MAX_NODES = 25;
export const METADATA_LINEAGE_MAX_EDGES = 100;

export const MetadataLineageDirectionSchema = z.enum(['upstream', 'downstream']);

export const MetadataLineageRequestSchema = z
  .object({
    rootUrn: z.string().trim().min(1).max(1_000),
    direction: MetadataLineageDirectionSchema,
    depth: z
      .number()
      .int()
      .min(1)
      .max(METADATA_LINEAGE_MAX_DEPTH)
      .default(METADATA_LINEAGE_DEFAULT_DEPTH),
    maxNodes: z
      .number()
      .int()
      .min(1)
      .max(METADATA_LINEAGE_MAX_NODES)
      .default(METADATA_LINEAGE_DEFAULT_MAX_NODES),
  })
  .strict();

export const MetadataLineageNodeSchema = EntityRefSchema.extend({
  urn: z.string().trim().min(1).max(1_000),
  name: z.string().trim().min(1).max(300),
  depth: z.number().int().min(0).max(METADATA_LINEAGE_MAX_DEPTH),
  platform: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(1_000).optional(),
}).strict();

export const MetadataLineageEdgeSchema = z
  .object({
    sourceUrn: z.string().trim().min(1).max(1_000),
    targetUrn: z.string().trim().min(1).max(1_000),
  })
  .strict();

function compareLineageNodes(
  left: z.infer<typeof MetadataLineageNodeSchema>,
  right: z.infer<typeof MetadataLineageNodeSchema>,
) {
  if (left.depth !== right.depth) {
    return left.depth - right.depth;
  }
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

function compareLineageEdges(
  left: z.infer<typeof MetadataLineageEdgeSchema>,
  right: z.infer<typeof MetadataLineageEdgeSchema>,
) {
  if (left.sourceUrn !== right.sourceUrn) {
    return left.sourceUrn < right.sourceUrn ? -1 : 1;
  }
  return left.targetUrn < right.targetUrn ? -1 : left.targetUrn > right.targetUrn ? 1 : 0;
}

export const MetadataLineageResponseSchema = z
  .object({
    rootUrn: z.string().trim().min(1).max(1_000),
    direction: MetadataLineageDirectionSchema,
    requestedDepth: z.number().int().min(1).max(METADATA_LINEAGE_MAX_DEPTH),
    maxNodes: z.number().int().min(1).max(METADATA_LINEAGE_MAX_NODES),
    visitedNodeCount: z.number().int().min(1).max(METADATA_LINEAGE_MAX_NODES),
    truncated: z.boolean(),
    nodes: z.array(MetadataLineageNodeSchema).min(1).max(METADATA_LINEAGE_MAX_NODES),
    edges: z.array(MetadataLineageEdgeSchema).max(METADATA_LINEAGE_MAX_EDGES),
  })
  .strict()
  .superRefine((response, context) => {
    if (response.nodes.length > response.maxNodes) {
      context.addIssue({
        code: 'custom',
        message: 'Lineage nodes exceed the accepted limit.',
        path: ['nodes'],
      });
    }
    if (response.visitedNodeCount !== response.nodes.length) {
      context.addIssue({
        code: 'custom',
        message: 'Visited node count does not match the returned nodes.',
        path: ['visitedNodeCount'],
      });
    }

    const nodeUrns = new Set<string>();
    let rootCount = 0;
    response.nodes.forEach((node, index) => {
      if (nodeUrns.has(node.urn)) {
        context.addIssue({
          code: 'custom',
          message: `Lineage node URN is duplicated: ${node.urn}`,
          path: ['nodes', index, 'urn'],
        });
      }
      nodeUrns.add(node.urn);
      if (node.urn === response.rootUrn) {
        rootCount += 1;
        if (node.depth !== 0) {
          context.addIssue({
            code: 'custom',
            message: 'The lineage root must have depth zero.',
            path: ['nodes', index, 'depth'],
          });
        }
      } else if (node.depth === 0 || node.depth > response.requestedDepth) {
        context.addIssue({
          code: 'custom',
          message: 'A lineage node has an invalid traversal depth.',
          path: ['nodes', index, 'depth'],
        });
      }

      const previous = response.nodes[index - 1];
      if (previous && compareLineageNodes(previous, node) > 0) {
        context.addIssue({
          code: 'custom',
          message: 'Lineage nodes are not in deterministic order.',
          path: ['nodes', index],
        });
      }
    });
    if (rootCount !== 1 || response.nodes[0]?.urn !== response.rootUrn) {
      context.addIssue({
        code: 'custom',
        message: 'The lineage root must be present exactly once as the first node.',
        path: ['nodes'],
      });
    }

    const edgeKeys = new Set<string>();
    response.edges.forEach((edge, index) => {
      const key = `${edge.sourceUrn}\u0000${edge.targetUrn}`;
      if (edgeKeys.has(key)) {
        context.addIssue({
          code: 'custom',
          message: 'Lineage edge is duplicated.',
          path: ['edges', index],
        });
      }
      edgeKeys.add(key);
      if (!nodeUrns.has(edge.sourceUrn) || !nodeUrns.has(edge.targetUrn)) {
        context.addIssue({
          code: 'custom',
          message: 'Lineage edge references a node outside the response.',
          path: ['edges', index],
        });
      }

      const previous = response.edges[index - 1];
      if (previous && compareLineageEdges(previous, edge) > 0) {
        context.addIssue({
          code: 'custom',
          message: 'Lineage edges are not in deterministic order.',
          path: ['edges', index],
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
export type MetadataLineageDirection = z.infer<typeof MetadataLineageDirectionSchema>;
export type MetadataLineageRequest = z.infer<typeof MetadataLineageRequestSchema>;
export type MetadataLineageNode = z.infer<typeof MetadataLineageNodeSchema>;
export type MetadataLineageEdge = z.infer<typeof MetadataLineageEdgeSchema>;
export type MetadataLineageResponse = z.infer<typeof MetadataLineageResponseSchema>;
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
