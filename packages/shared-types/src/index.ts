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

export const METADATA_RECENT_CHANGES_DEFAULT_WINDOW_HOURS = 7 * 24;
export const METADATA_RECENT_CHANGES_MAX_WINDOW_HOURS = 30 * 24;
export const METADATA_RECENT_CHANGES_DEFAULT_LIMIT = 10;
export const METADATA_RECENT_CHANGES_MAX_LIMIT = 20;

const CanonicalUtcTimestampSchema = z.iso
  .datetime()
  .refine(
    (timestamp) => timestamp === new Date(timestamp).toISOString(),
    'Timestamp must be canonical UTC.',
  );

export const MetadataRecentChangeCategorySchema = z.enum([
  'schema',
  'ownership',
  'tag',
  'domain',
  'documentation',
  'glossary',
  'relationship',
  'structured-property',
  'application',
  'asset-membership',
  'pipeline',
]);

export const MetadataRecentChangeOperationSchema = z.enum(['added', 'modified', 'removed']);

export const MetadataRecentChangesRequestSchema = z
  .object({
    entityUrn: z.string().trim().min(1).max(1_000),
    endTime: CanonicalUtcTimestampSchema.optional(),
    windowHours: z
      .number()
      .int()
      .min(1)
      .max(METADATA_RECENT_CHANGES_MAX_WINDOW_HOURS)
      .default(METADATA_RECENT_CHANGES_DEFAULT_WINDOW_HOURS),
    limit: z
      .number()
      .int()
      .min(1)
      .max(METADATA_RECENT_CHANGES_MAX_LIMIT)
      .default(METADATA_RECENT_CHANGES_DEFAULT_LIMIT),
  })
  .strict();

export const MetadataRecentChangeSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    entityUrn: z.string().trim().min(1).max(1_000),
    timestamp: CanonicalUtcTimestampSchema,
    category: MetadataRecentChangeCategorySchema,
    operation: MetadataRecentChangeOperationSchema,
    actor: z.string().trim().min(1).max(100).optional(),
    source: MetadataSourceModeSchema,
    summary: z.string().trim().min(1).max(500),
    field: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

function compareRecentChanges(
  left: z.infer<typeof MetadataRecentChangeSchema>,
  right: z.infer<typeof MetadataRecentChangeSchema>,
) {
  if (left.timestamp !== right.timestamp) {
    return left.timestamp > right.timestamp ? -1 : 1;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export const MetadataRecentChangesResponseSchema = z
  .object({
    entityUrn: z.string().trim().min(1).max(1_000),
    window: z
      .object({
        startTime: CanonicalUtcTimestampSchema,
        endTime: CanonicalUtcTimestampSchema,
        hours: z.number().int().min(1).max(METADATA_RECENT_CHANGES_MAX_WINDOW_HOURS),
      })
      .strict(),
    limit: z.number().int().min(1).max(METADATA_RECENT_CHANGES_MAX_LIMIT),
    returnedCount: z.number().int().min(0).max(METADATA_RECENT_CHANGES_MAX_LIMIT),
    truncated: z.boolean(),
    changes: z.array(MetadataRecentChangeSchema).max(METADATA_RECENT_CHANGES_MAX_LIMIT),
  })
  .strict()
  .superRefine((response, context) => {
    const startTime = Date.parse(response.window.startTime);
    const endTime = Date.parse(response.window.endTime);
    if (endTime - startTime !== response.window.hours * 60 * 60 * 1_000) {
      context.addIssue({
        code: 'custom',
        message: 'Recent-change window timestamps do not match the requested hours.',
        path: ['window'],
      });
    }
    if (response.returnedCount !== response.changes.length) {
      context.addIssue({
        code: 'custom',
        message: 'Returned count does not match recent changes.',
        path: ['returnedCount'],
      });
    }
    if (response.changes.length > response.limit) {
      context.addIssue({
        code: 'custom',
        message: 'Recent changes exceed the accepted limit.',
        path: ['changes'],
      });
    }

    const ids = new Set<string>();
    response.changes.forEach((change, index) => {
      if (ids.has(change.id)) {
        context.addIssue({
          code: 'custom',
          message: `Recent-change ID is duplicated: ${change.id}`,
          path: ['changes', index, 'id'],
        });
      }
      ids.add(change.id);
      if (change.entityUrn !== response.entityUrn) {
        context.addIssue({
          code: 'custom',
          message: 'Recent change belongs to a different entity.',
          path: ['changes', index, 'entityUrn'],
        });
      }
      const timestamp = Date.parse(change.timestamp);
      if (timestamp < startTime || timestamp > endTime) {
        context.addIssue({
          code: 'custom',
          message: 'Recent change falls outside the requested window.',
          path: ['changes', index, 'timestamp'],
        });
      }

      const previous = response.changes[index - 1];
      if (previous && compareRecentChanges(previous, change) > 0) {
        context.addIssue({
          code: 'custom',
          message: 'Recent changes are not in deterministic order.',
          path: ['changes', index],
        });
      }
    });
  });

export const INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS = METADATA_RECENT_CHANGES_DEFAULT_WINDOW_HOURS;
export const INCIDENT_CONTEXT_MAX_ENTITY_HINTS = 3;
export const INCIDENT_CONTEXT_MAX_SYMPTOMS = 3;
export const INCIDENT_CONTEXT_MAX_CANDIDATES = 5;
export const INCIDENT_CONTEXT_MAX_CHANGE_ENTITIES = 1;
export const INCIDENT_CONTEXT_MAX_MISSING_INFORMATION = 10;

export const IncidentRequestSchema = z
  .object({
    question: z.string().trim().min(3).max(2_000),
    entityHint: z.string().trim().min(2).max(500).optional(),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
    symptom: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict();

export const CANONICAL_INCIDENT_SCENARIO_IDS = [
  'removed-schema-column',
  'stale-pipeline',
  'upstream-type-change',
  'wrong-dashboard-dataset',
  'delayed-ingestion',
  'incorrect-owner-or-domain',
  'insufficient-evidence',
] as const;

export const CanonicalIncidentScenarioIdSchema = z.enum(CANONICAL_INCIDENT_SCENARIO_IDS);

export const CanonicalIncidentScenarioSchema = z
  .object({
    id: CanonicalIncidentScenarioIdSchema,
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
    incident: IncidentRequestSchema,
  })
  .strict();

export const CanonicalIncidentScenarioCatalogSchema = z
  .array(CanonicalIncidentScenarioSchema)
  .length(CANONICAL_INCIDENT_SCENARIO_IDS.length)
  .superRefine((scenarios, context) => {
    scenarios.forEach((scenario, index) => {
      if (scenario.id !== CANONICAL_INCIDENT_SCENARIO_IDS[index]) {
        context.addIssue({
          code: 'custom',
          message: 'Canonical incident scenarios must follow the shared stable order.',
          path: [index, 'id'],
        });
      }
    });
  });

const canonicalIncidentScenarioInputs = [
  {
    id: 'removed-schema-column',
    title: 'Removed schema column',
    description:
      'Trace a removed upstream revenue column through lineage and recent metadata evidence.',
    incident: {
      question: 'Why did revenue drop after the morning warehouse refresh?',
      entityHint: 'analytics.daily_revenue',
      occurredAt: '2026-07-18T08:30:00.000Z',
      symptom: 'Revenue is 42% below the seven-day baseline.',
    },
  },
  {
    id: 'stale-pipeline',
    title: 'Stale pipeline',
    description: 'Investigate a failed refresh that leaves daily orders behind schedule.',
    incident: {
      question: 'Why has the daily orders table stopped refreshing?',
      entityHint: 'analytics.daily_orders',
      occurredAt: '2026-07-18T09:00:00.000Z',
      symptom: 'The table is six hours behind its expected refresh.',
    },
  },
  {
    id: 'upstream-type-change',
    title: 'Upstream type change',
    description:
      'Inspect an upstream type change after session aggregation starts rejecting records.',
    incident: {
      question: 'Why did customer session aggregation start rejecting records?',
      entityHint: 'analytics.customer_sessions',
      occurredAt: '2026-07-18T10:00:00.000Z',
      symptom: 'Session builds reject customer_id values after the upstream refresh.',
    },
  },
  {
    id: 'wrong-dashboard-dataset',
    title: 'Dashboard linked to the wrong dataset',
    description: 'Follow a dashboard source-link change from certified production data to staging.',
    incident: {
      question: 'Why does the executive revenue dashboard show staging values?',
      entityHint: 'Executive revenue dashboard',
      occurredAt: '2026-07-18T11:00:00.000Z',
      symptom: 'Dashboard totals match staging instead of the certified production dataset.',
    },
  },
  {
    id: 'delayed-ingestion',
    title: 'Delayed ingestion',
    description: 'Check delayed mobile-event ingestion behind a missing morning funnel.',
    incident: {
      question: 'Why are mobile events missing from the morning funnel?',
      entityHint: 'analytics.mobile_funnel',
      occurredAt: '2026-07-18T12:00:00.000Z',
      symptom: 'The newest mobile events are four hours late.',
    },
  },
  {
    id: 'incorrect-owner-or-domain',
    title: 'Incorrect owner or domain',
    description: 'Review an ownership change that routes a finance incident to the wrong team.',
    incident: {
      question: 'Why was the finance dataset routed to the wrong incident owner?',
      entityHint: 'finance.monthly_close',
      occurredAt: '2026-07-18T13:00:00.000Z',
      symptom: 'The catalog routes escalation to marketing instead of finance.',
    },
  },
  {
    id: 'insufficient-evidence',
    title: 'Insufficient evidence to conclude',
    description:
      'Exercise the safe fallback when retained change evidence cannot support a conclusion.',
    incident: {
      question: 'Why did the unknown metric move without retained metadata history?',
      entityHint: 'analytics.unknown_metric',
      occurredAt: '2026-07-18T08:30:00.000Z',
      symptom: 'The metric changed, but the bounded fixture has no retained change evidence.',
    },
  },
] as const;

export const CANONICAL_INCIDENT_SCENARIOS = Object.freeze(
  CanonicalIncidentScenarioCatalogSchema.parse(canonicalIncidentScenarioInputs).map((scenario) =>
    Object.freeze({
      ...scenario,
      incident: Object.freeze({ ...scenario.incident }),
    }),
  ),
);

export const CANONICAL_EVALUATION_CASE_IDS = CANONICAL_INCIDENT_SCENARIO_IDS;
export const CanonicalEvaluationCaseIdSchema = CanonicalIncidentScenarioIdSchema;

export const IncidentIntentSchema = z
  .object({
    question: z.string().trim().min(3).max(2_000),
    entityHints: z.array(z.string().trim().min(2).max(500)).max(INCIDENT_CONTEXT_MAX_ENTITY_HINTS),
    symptoms: z.array(z.string().trim().min(1).max(2_000)).max(INCIDENT_CONTEXT_MAX_SYMPTOMS),
    timeWindow: z
      .object({
        endTime: CanonicalUtcTimestampSchema.optional(),
        hours: z
          .number()
          .int()
          .min(1)
          .max(METADATA_RECENT_CHANGES_MAX_WINDOW_HOURS)
          .default(INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS),
        basis: z.enum(['incident_time', 'provider_default']),
      })
      .strict(),
  })
  .strict()
  .superRefine((intent, context) => {
    if (intent.timeWindow.basis === 'incident_time' && !intent.timeWindow.endTime) {
      context.addIssue({
        code: 'custom',
        message: 'An incident-time window requires a canonical end time.',
        path: ['timeWindow', 'endTime'],
      });
    }
    if (intent.timeWindow.basis === 'provider_default' && intent.timeWindow.endTime) {
      context.addIssue({
        code: 'custom',
        message: 'A provider-default window cannot declare an incident end time.',
        path: ['timeWindow', 'endTime'],
      });
    }
  });

export const IncidentContextMissingInformationCodeSchema = z.enum([
  'entity_hint_not_supplied',
  'incident_time_not_supplied',
  'symptom_not_supplied',
  'entity_not_found',
  'lineage_not_found',
  'lineage_truncated',
  'recent_changes_not_found',
  'recent_changes_truncated',
]);

export const IncidentContextMissingInformationSchema = z
  .object({
    code: IncidentContextMissingInformationCodeSchema,
    message: z.string().trim().min(1).max(300),
  })
  .strict();

export const IncidentContextFactsSchema = z
  .object({
    sourceMode: MetadataSourceModeSchema,
    candidateEntities: z
      .array(MetadataEntitySearchResultSchema)
      .max(INCIDENT_CONTEXT_MAX_CANDIDATES),
    selectedEntity: MetadataEntitySearchResultSchema.optional(),
    lineage: MetadataLineageResponseSchema.optional(),
    recentChanges: z
      .array(MetadataRecentChangesResponseSchema)
      .max(INCIDENT_CONTEXT_MAX_CHANGE_ENTITIES),
  })
  .strict()
  .superRefine((facts, context) => {
    const candidateUrns = new Set<string>();
    facts.candidateEntities.forEach((candidate, index) => {
      if (candidateUrns.has(candidate.urn)) {
        context.addIssue({
          code: 'custom',
          message: 'Incident context candidate URNs must be unique.',
          path: ['candidateEntities', index, 'urn'],
        });
      }
      candidateUrns.add(candidate.urn);
    });

    if (facts.candidateEntities.length > 0 && !facts.selectedEntity) {
      context.addIssue({
        code: 'custom',
        message: 'Incident context with candidates requires one selected entity.',
        path: ['selectedEntity'],
      });
    }
    if (facts.selectedEntity) {
      const matchingCandidate = facts.candidateEntities.find(
        (candidate) => candidate.urn === facts.selectedEntity?.urn,
      );
      if (
        !matchingCandidate ||
        JSON.stringify(matchingCandidate) !== JSON.stringify(facts.selectedEntity)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'The selected entity must exactly match one retrieved candidate.',
          path: ['selectedEntity'],
        });
      }
    }
    if (!facts.selectedEntity && (facts.lineage || facts.recentChanges.length > 0)) {
      context.addIssue({
        code: 'custom',
        message: 'Lineage and recent-change facts require an adapter-selected entity.',
        path: ['selectedEntity'],
      });
    }
    if (facts.lineage && facts.lineage.rootUrn !== facts.selectedEntity?.urn) {
      context.addIssue({
        code: 'custom',
        message: 'Lineage facts must use the selected entity as their root.',
        path: ['lineage', 'rootUrn'],
      });
    }

    const lineageUrns = new Set(facts.lineage?.nodes.map((node) => node.urn) ?? []);
    const recentChangeUrns = new Set<string>();
    facts.recentChanges.forEach((recentChanges, index) => {
      if (recentChangeUrns.has(recentChanges.entityUrn)) {
        context.addIssue({
          code: 'custom',
          message: 'Recent-change facts must contain at most one window per entity.',
          path: ['recentChanges', index, 'entityUrn'],
        });
      }
      recentChangeUrns.add(recentChanges.entityUrn);
      if (!lineageUrns.has(recentChanges.entityUrn)) {
        context.addIssue({
          code: 'custom',
          message: 'Recent-change facts must reference a returned lineage entity.',
          path: ['recentChanges', index, 'entityUrn'],
        });
      }
    });
  });

export const IncidentContextCompletedStageSchema = z
  .object({
    status: z.literal('completed'),
    intent: IncidentIntentSchema,
    facts: IncidentContextFactsSchema,
    missingInformation: z
      .array(IncidentContextMissingInformationSchema)
      .max(INCIDENT_CONTEXT_MAX_MISSING_INFORMATION),
  })
  .strict()
  .superRefine((stage, context) => {
    const missingCodes = new Set<string>();
    stage.missingInformation.forEach((item, index) => {
      if (missingCodes.has(item.code)) {
        context.addIssue({
          code: 'custom',
          message: 'Incident context missing-information codes must be unique.',
          path: ['missingInformation', index, 'code'],
        });
      }
      missingCodes.add(item.code);
    });
    if (stage.facts.candidateEntities.length === 0 && !missingCodes.has('entity_not_found')) {
      context.addIssue({
        code: 'custom',
        message: 'A no-match context must identify the missing entity information.',
        path: ['missingInformation'],
      });
    }
  });

export const IncidentContextErrorCodeSchema = z.enum([
  'METADATA_UNCONFIGURED',
  'METADATA_UNAUTHORIZED',
  'METADATA_UNAVAILABLE',
  'METADATA_TIMEOUT',
  'METADATA_INVALID_RESPONSE',
  'INTERNAL_ERROR',
]);

export const IncidentContextFailedStageSchema = z
  .object({
    status: z.literal('failed'),
    error: z
      .object({
        code: IncidentContextErrorCodeSchema,
        message: z.string().trim().min(1).max(300),
      })
      .strict(),
  })
  .strict();

export const IncidentContextStageSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('gathering') }).strict(),
  IncidentContextCompletedStageSchema,
  IncidentContextFailedStageSchema,
]);

export const SUSPICIOUS_CHANGE_MAX_CANDIDATES = 5;

export const SUSPICIOUS_CHANGE_SIGNAL_ORDER = [
  'category_intent_match',
  'incident_window',
  'selected_entity',
  'upstream_lineage',
  'disruptive_operation',
] as const;

export const SUSPICIOUS_CHANGE_SIGNAL_LABELS = {
  category_intent_match: 'Change category matches bounded incident terms.',
  incident_window: 'Change was observed within the supplied incident window.',
  selected_entity: 'Change belongs to the adapter-selected entity.',
  upstream_lineage: 'Change belongs to an adapter-evidenced upstream entity.',
  disruptive_operation: 'Change operation is removed or modified.',
} as const;

export const SuspiciousChangeSignalCodeSchema = z.enum(SUSPICIOUS_CHANGE_SIGNAL_ORDER);

export const SuspiciousChangeSignalSchema = z
  .object({
    code: SuspiciousChangeSignalCodeSchema,
    label: z.string().trim().min(1).max(120),
  })
  .strict()
  .superRefine((signal, context) => {
    if (signal.label !== SUSPICIOUS_CHANGE_SIGNAL_LABELS[signal.code]) {
      context.addIssue({
        code: 'custom',
        message: 'Suspicious-change signal labels must match the shared allowlist.',
        path: ['label'],
      });
    }
  });

export const SUSPICIOUS_CHANGE_SIGNAL_WEIGHTS = {
  category_intent_match: 4,
  incident_window: 3,
  selected_entity: 2,
  upstream_lineage: 2,
  disruptive_operation: 2,
} as const;

export const SuspiciousChangeCandidateSchema = z
  .object({
    changeId: z.string().trim().min(1).max(200),
    entityUrn: z.string().trim().min(1).max(1_000),
    entityName: z.string().trim().min(1).max(300),
    category: MetadataRecentChangeCategorySchema,
    operation: MetadataRecentChangeOperationSchema,
    observedAt: CanonicalUtcTimestampSchema,
    summary: z.string().trim().min(1).max(500),
    field: z.string().trim().min(1).max(300).optional(),
    signals: z.array(SuspiciousChangeSignalSchema).min(2).max(5),
  })
  .strict()
  .superRefine((candidate, context) => {
    const seenSignals = new Set<string>();
    let previousSignalIndex = -1;
    candidate.signals.forEach((signal, index) => {
      const signalIndex = SUSPICIOUS_CHANGE_SIGNAL_ORDER.indexOf(signal.code);
      if (seenSignals.has(signal.code)) {
        context.addIssue({
          code: 'custom',
          message: 'Suspicious-change signals must be unique.',
          path: ['signals', index, 'code'],
        });
      }
      if (signalIndex <= previousSignalIndex) {
        context.addIssue({
          code: 'custom',
          message: 'Suspicious-change signals must follow the shared deterministic order.',
          path: ['signals', index],
        });
      }
      seenSignals.add(signal.code);
      previousSignalIndex = signalIndex;
    });
    if (!seenSignals.has('category_intent_match') && !seenSignals.has('incident_window')) {
      context.addIssue({
        code: 'custom',
        message: 'A suspicious-change candidate requires an incident-specific signal.',
        path: ['signals'],
      });
    }
  });

export const SuspiciousChangeMissingInformationCodeSchema = z.enum([
  'incident_time_not_supplied',
  'symptom_not_supplied',
  'recent_changes_not_found',
  'no_matching_signals',
  'context_changes_truncated',
  'candidate_limit_reached',
]);

export const SuspiciousChangeMissingInformationSchema = z
  .object({
    code: SuspiciousChangeMissingInformationCodeSchema,
    message: z.string().trim().min(1).max(300),
  })
  .strict();

function compareSuspiciousChangeCandidates(
  left: z.infer<typeof SuspiciousChangeCandidateSchema>,
  right: z.infer<typeof SuspiciousChangeCandidateSchema>,
) {
  const leftPriority = left.signals.reduce(
    (total, signal) => total + SUSPICIOUS_CHANGE_SIGNAL_WEIGHTS[signal.code],
    0,
  );
  const rightPriority = right.signals.reduce(
    (total, signal) => total + SUSPICIOUS_CHANGE_SIGNAL_WEIGHTS[signal.code],
    0,
  );
  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority;
  }
  if (left.observedAt !== right.observedAt) {
    return left.observedAt > right.observedAt ? -1 : 1;
  }
  return left.changeId < right.changeId ? -1 : left.changeId > right.changeId ? 1 : 0;
}

function refineSuspiciousChangeResult(
  result: {
    candidates: z.infer<typeof SuspiciousChangeCandidateSchema>[];
    missingInformation: z.infer<typeof SuspiciousChangeMissingInformationSchema>[];
  },
  context: z.RefinementCtx,
) {
  const changeIds = new Set<string>();
  result.candidates.forEach((candidate, index) => {
    if (changeIds.has(candidate.changeId)) {
      context.addIssue({
        code: 'custom',
        message: 'Suspicious-change candidate IDs must be unique.',
        path: ['candidates', index, 'changeId'],
      });
    }
    changeIds.add(candidate.changeId);
    const previous = result.candidates[index - 1];
    if (previous && compareSuspiciousChangeCandidates(previous, candidate) > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Suspicious-change candidates must use deterministic priority order.',
        path: ['candidates', index],
      });
    }
  });

  const missingCodes = new Set<string>();
  result.missingInformation.forEach((item, index) => {
    if (missingCodes.has(item.code)) {
      context.addIssue({
        code: 'custom',
        message: 'Suspicious-change missing-information codes must be unique.',
        path: ['missingInformation', index, 'code'],
      });
    }
    missingCodes.add(item.code);
  });
}

export const SuspiciousChangeDetectionCompletedSchema = z
  .object({
    status: z.literal('completed'),
    candidates: z
      .array(SuspiciousChangeCandidateSchema)
      .min(1)
      .max(SUSPICIOUS_CHANGE_MAX_CANDIDATES),
    missingInformation: z.array(SuspiciousChangeMissingInformationSchema).max(6),
  })
  .strict()
  .superRefine(refineSuspiciousChangeResult);

export const SuspiciousChangeDetectionInsufficientSchema = z
  .object({
    status: z.literal('insufficient'),
    candidates: z.array(SuspiciousChangeCandidateSchema).max(0),
    missingInformation: z.array(SuspiciousChangeMissingInformationSchema).min(1).max(6),
  })
  .strict()
  .superRefine(refineSuspiciousChangeResult);

export const SuspiciousChangeDetectionResultSchema = z.discriminatedUnion('status', [
  SuspiciousChangeDetectionCompletedSchema,
  SuspiciousChangeDetectionInsufficientSchema,
]);

function refineSuspiciousChangeReferences(
  value: {
    contextStage: IncidentContextCompletedStage;
    result: z.infer<typeof SuspiciousChangeDetectionResultSchema>;
  },
  context: z.RefinementCtx,
) {
  const changesById = new Map(
    value.contextStage.facts.recentChanges.flatMap((response) =>
      response.changes.map((change) => [change.id, change] as const),
    ),
  );
  const entityNames = new Map([
    ...value.contextStage.facts.candidateEntities.map(
      (entity) => [entity.urn, entity.name] as const,
    ),
    ...(value.contextStage.facts.lineage?.nodes.map(
      (entity) => [entity.urn, entity.name] as const,
    ) ?? []),
  ]);
  const lineageDepths = new Map(
    value.contextStage.facts.lineage?.nodes.map((entity) => [entity.urn, entity.depth] as const) ??
      [],
  );

  value.result.candidates.forEach((candidate, index) => {
    const change = changesById.get(candidate.changeId);
    if (
      !change ||
      change.entityUrn !== candidate.entityUrn ||
      change.category !== candidate.category ||
      change.operation !== candidate.operation ||
      change.timestamp !== candidate.observedAt ||
      change.summary !== candidate.summary ||
      change.field !== candidate.field
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Suspicious-change candidates must exactly reference a retrieved change fact.',
        path: ['result', 'candidates', index],
      });
    }
    if (entityNames.get(candidate.entityUrn) !== candidate.entityName) {
      context.addIssue({
        code: 'custom',
        message: 'Suspicious-change entity labels must resolve to the completed context graph.',
        path: ['result', 'candidates', index, 'entityName'],
      });
    }

    const signalCodes = new Set(candidate.signals.map((signal) => signal.code));
    if (
      signalCodes.has('selected_entity') &&
      candidate.entityUrn !== value.contextStage.facts.selectedEntity?.urn
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The selected-entity signal must reference the adapter-selected entity.',
        path: ['result', 'candidates', index, 'signals'],
      });
    }
    if (signalCodes.has('upstream_lineage') && (lineageDepths.get(candidate.entityUrn) ?? 0) < 1) {
      context.addIssue({
        code: 'custom',
        message: 'The upstream-lineage signal must reference a returned upstream node.',
        path: ['result', 'candidates', index, 'signals'],
      });
    }
    if (
      signalCodes.has('disruptive_operation') &&
      !['removed', 'modified'].includes(candidate.operation)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The disruptive-operation signal requires a removed or modified fact.',
        path: ['result', 'candidates', index, 'signals'],
      });
    }
    if (signalCodes.has('incident_window')) {
      const endTime = value.contextStage.intent.timeWindow.endTime;
      const startTime = endTime
        ? Date.parse(endTime) - value.contextStage.intent.timeWindow.hours * 60 * 60 * 1_000
        : Number.NaN;
      const observedAt = Date.parse(candidate.observedAt);
      if (
        value.contextStage.intent.timeWindow.basis !== 'incident_time' ||
        !endTime ||
        observedAt < startTime ||
        observedAt > Date.parse(endTime)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'The incident-window signal requires a fact inside the supplied incident window.',
          path: ['result', 'candidates', index, 'signals'],
        });
      }
    }
  });
}

export const IncidentSuspiciousChangeDetectionSchema = z
  .object({
    contextStage: IncidentContextCompletedStageSchema,
    result: SuspiciousChangeDetectionResultSchema,
  })
  .strict()
  .superRefine(refineSuspiciousChangeReferences);

export const SuspiciousChangeDetectionUnavailableCodeSchema = z.enum([
  'CONTEXT_UNAVAILABLE',
  'DETECTION_INVALID',
]);

export const SuspiciousChangeDetectionStageSchema = z.union([
  z.object({ status: z.literal('detecting') }).strict(),
  SuspiciousChangeDetectionCompletedSchema,
  SuspiciousChangeDetectionInsufficientSchema,
  z
    .object({
      status: z.literal('unavailable'),
      error: z
        .object({
          code: SuspiciousChangeDetectionUnavailableCodeSchema,
          message: z.string().trim().min(1).max(300),
        })
        .strict(),
    })
    .strict(),
]);

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

export const EvidenceSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum(['metadata', 'lineage', 'schema-change', 'pipeline', 'ownership']),
    statement: z.string().min(1),
    sourceEntity: EntityRefSchema.optional(),
    observedAt: z.iso.datetime().optional(),
  })
  .strict();

export const HYPOTHESIS_SCORING_MAX_HYPOTHESES = 3;
export const HYPOTHESIS_SCORE_BASIS_POINTS = 10_000;

export const HYPOTHESIS_SCORE_FACTOR_ORDER = [
  'change_recency',
  'lineage_position',
  'symptom_category_fit',
  'evidence_quality',
] as const;

export const HYPOTHESIS_SCORE_FACTOR_LABELS = {
  change_recency: 'Change recency within the supplied incident window.',
  lineage_position: 'Adapter-evidenced selected or upstream lineage position.',
  symptom_category_fit: 'Bounded incident symptom or category fit.',
  evidence_quality: 'Resolved factual evidence quality and context completeness.',
} as const;

export const HYPOTHESIS_SCORE_FACTOR_WEIGHTS = {
  change_recency: 3_000,
  lineage_position: 2_000,
  symptom_category_fit: 3_000,
  evidence_quality: 2_000,
} as const;

export const HypothesisScoreFactorCodeSchema = z.enum(HYPOTHESIS_SCORE_FACTOR_ORDER);

export const HypothesisScoreFactorSchema = z
  .object({
    code: HypothesisScoreFactorCodeSchema,
    label: z.string().trim().min(1).max(120),
    contributionBasisPoints: z.number().int().min(0).max(HYPOTHESIS_SCORE_BASIS_POINTS),
    weightBasisPoints: z.number().int().min(1).max(HYPOTHESIS_SCORE_BASIS_POINTS),
  })
  .strict()
  .superRefine((factor, context) => {
    if (factor.label !== HYPOTHESIS_SCORE_FACTOR_LABELS[factor.code]) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis score-factor labels must match the shared allowlist.',
        path: ['label'],
      });
    }
    if (factor.weightBasisPoints !== HYPOTHESIS_SCORE_FACTOR_WEIGHTS[factor.code]) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis score-factor weights must match the code-owned formula.',
        path: ['weightBasisPoints'],
      });
    }
    if (factor.contributionBasisPoints > factor.weightBasisPoints) {
      context.addIssue({
        code: 'custom',
        message: 'A hypothesis score-factor contribution cannot exceed its weight.',
        path: ['contributionBasisPoints'],
      });
    }
    if (factor.contributionBasisPoints % 100 !== 0) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis score-factor contributions use canonical 100-basis-point precision.',
        path: ['contributionBasisPoints'],
      });
    }
  });

export const ScoredHypothesisSchema = z
  .object({
    id: z.string().trim().min(1).max(240),
    rank: z.number().int().min(1).max(HYPOTHESIS_SCORING_MAX_HYPOTHESES),
    sourceChangeId: z.string().trim().min(1).max(200),
    observedAt: CanonicalUtcTimestampSchema,
    summary: z.string().trim().min(1).max(500),
    confidence: z.number().min(0).max(1),
    evidenceIds: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
    factors: z.array(HypothesisScoreFactorSchema).length(HYPOTHESIS_SCORE_FACTOR_ORDER.length),
  })
  .strict()
  .superRefine((hypothesis, context) => {
    if (
      !hypothesis.summary.startsWith('Plausible contributor:') ||
      /\b(?:confirmed cause|root cause|caused the incident|recommendation|remediation|action)\b/i.test(
        hypothesis.summary,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A scored hypothesis must be labeled as a non-causal plausible contributor.',
        path: ['summary'],
      });
    }

    const evidenceIds = new Set<string>();
    hypothesis.evidenceIds.forEach((evidenceId, index) => {
      if (evidenceIds.has(evidenceId)) {
        context.addIssue({
          code: 'custom',
          message: 'Scored hypothesis evidence references must be unique.',
          path: ['evidenceIds', index],
        });
      }
      evidenceIds.add(evidenceId);
    });
    if (!evidenceIds.has(hypothesis.sourceChangeId)) {
      context.addIssue({
        code: 'custom',
        message: 'A scored hypothesis must cite its exact source change as evidence.',
        path: ['evidenceIds'],
      });
    }

    hypothesis.factors.forEach((factor, index) => {
      if (factor.code !== HYPOTHESIS_SCORE_FACTOR_ORDER[index]) {
        context.addIssue({
          code: 'custom',
          message: 'Hypothesis score factors must follow the shared deterministic order.',
          path: ['factors', index, 'code'],
        });
      }
    });
    const totalBasisPoints = hypothesis.factors.reduce(
      (total, factor) => total + factor.contributionBasisPoints,
      0,
    );
    if (totalBasisPoints > HYPOTHESIS_SCORE_BASIS_POINTS) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis score-factor contributions exceed the confidence clamp.',
        path: ['factors'],
      });
    }
    if (hypothesis.confidence !== totalBasisPoints / HYPOTHESIS_SCORE_BASIS_POINTS) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis confidence must equal the exact factor-contribution sum.',
        path: ['confidence'],
      });
    }
    if (Number(hypothesis.confidence.toFixed(2)) !== hypothesis.confidence) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis confidence must use at most two decimal places.',
        path: ['confidence'],
      });
    }
  });

function compareScoredHypotheses(
  left: z.infer<typeof ScoredHypothesisSchema>,
  right: z.infer<typeof ScoredHypothesisSchema>,
) {
  if (left.confidence !== right.confidence) {
    return right.confidence - left.confidence;
  }
  if (left.observedAt !== right.observedAt) {
    return left.observedAt > right.observedAt ? -1 : 1;
  }
  if (left.sourceChangeId !== right.sourceChangeId) {
    return left.sourceChangeId < right.sourceChangeId ? -1 : 1;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export const HypothesisScoringMissingInformationCodeSchema = z.enum([
  'suspicious_changes_insufficient',
  'incident_time_not_supplied',
  'symptom_not_supplied',
  'context_changes_truncated',
  'evidence_reference_unresolved',
  'hypothesis_limit_reached',
]);

export const HypothesisScoringMissingInformationSchema = z
  .object({
    code: HypothesisScoringMissingInformationCodeSchema,
    message: z.string().trim().min(1).max(300),
  })
  .strict();

function refineHypothesisScoringResult(
  result: {
    hypotheses: z.infer<typeof ScoredHypothesisSchema>[];
    missingInformation: z.infer<typeof HypothesisScoringMissingInformationSchema>[];
  },
  context: z.RefinementCtx,
) {
  const hypothesisIds = new Set<string>();
  const sourceChangeIds = new Set<string>();
  result.hypotheses.forEach((hypothesis, index) => {
    if (hypothesisIds.has(hypothesis.id)) {
      context.addIssue({
        code: 'custom',
        message: 'Scored hypothesis IDs must be unique.',
        path: ['hypotheses', index, 'id'],
      });
    }
    if (sourceChangeIds.has(hypothesis.sourceChangeId)) {
      context.addIssue({
        code: 'custom',
        message: 'A factual source change can produce at most one scored hypothesis.',
        path: ['hypotheses', index, 'sourceChangeId'],
      });
    }
    if (hypothesis.rank !== index + 1) {
      context.addIssue({
        code: 'custom',
        message: 'Scored hypothesis ranks must be contiguous from one.',
        path: ['hypotheses', index, 'rank'],
      });
    }
    const previous = result.hypotheses[index - 1];
    if (previous && compareScoredHypotheses(previous, hypothesis) > 0) {
      context.addIssue({
        code: 'custom',
        message:
          'Scored hypotheses must follow deterministic confidence and factual tie-break order.',
        path: ['hypotheses', index],
      });
    }
    hypothesisIds.add(hypothesis.id);
    sourceChangeIds.add(hypothesis.sourceChangeId);
  });

  const missingCodes = new Set<string>();
  result.missingInformation.forEach((item, index) => {
    if (missingCodes.has(item.code)) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis-scoring missing-information codes must be unique.',
        path: ['missingInformation', index, 'code'],
      });
    }
    missingCodes.add(item.code);
  });
}

export const HypothesisScoringCompletedSchema = z
  .object({
    status: z.literal('completed'),
    hypotheses: z.array(ScoredHypothesisSchema).min(1).max(HYPOTHESIS_SCORING_MAX_HYPOTHESES),
    missingInformation: z.array(HypothesisScoringMissingInformationSchema).max(6),
  })
  .strict()
  .superRefine(refineHypothesisScoringResult);

export const HypothesisScoringInsufficientSchema = z
  .object({
    status: z.literal('insufficient'),
    hypotheses: z.array(ScoredHypothesisSchema).max(0),
    missingInformation: z.array(HypothesisScoringMissingInformationSchema).min(1).max(6),
  })
  .strict()
  .superRefine(refineHypothesisScoringResult);

export const HypothesisScoringResultSchema = z.discriminatedUnion('status', [
  HypothesisScoringCompletedSchema,
  HypothesisScoringInsufficientSchema,
]);

export const HypothesisScoringUnavailableCodeSchema = z.enum([
  'CONTEXT_UNAVAILABLE',
  'SUSPICIOUS_CHANGES_UNAVAILABLE',
  'SCORING_INVALID',
]);

export const HypothesisScoringStageSchema = z.union([
  z.object({ status: z.literal('scoring') }).strict(),
  HypothesisScoringCompletedSchema,
  HypothesisScoringInsufficientSchema,
  z
    .object({
      status: z.literal('unavailable'),
      error: z
        .object({
          code: HypothesisScoringUnavailableCodeSchema,
          message: z.string().trim().min(1).max(300),
        })
        .strict(),
    })
    .strict(),
]);

function expectedEvidenceCategory(category: MetadataRecentChangeCategory) {
  if (category === 'schema') return 'schema-change' as const;
  if (category === 'pipeline') return 'pipeline' as const;
  if (category === 'ownership') return 'ownership' as const;
  return 'metadata' as const;
}

export const IncidentHypothesisScoringSchema = z
  .object({
    contextStage: IncidentContextCompletedStageSchema,
    suspiciousChangeResult: SuspiciousChangeDetectionCompletedSchema,
    evidence: z.array(EvidenceSchema).max(100),
    result: HypothesisScoringCompletedSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !IncidentSuspiciousChangeDetectionSchema.safeParse({
        contextStage: value.contextStage,
        result: value.suspiciousChangeResult,
      }).success
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Scoring input must resolve to completed suspicious-change facts.',
        path: ['suspiciousChangeResult'],
      });
      return;
    }

    const candidatesByChangeId = new Map(
      value.suspiciousChangeResult.candidates.map((candidate) => [candidate.changeId, candidate]),
    );
    const evidenceById = new Map(value.evidence.map((evidence) => [evidence.id, evidence]));
    if (evidenceById.size !== value.evidence.length) {
      context.addIssue({
        code: 'custom',
        message: 'Hypothesis-scoring evidence IDs must be unique.',
        path: ['evidence'],
      });
    }
    const entitiesByUrn = new Map([
      ...value.contextStage.facts.candidateEntities.map((entity) => [entity.urn, entity] as const),
      ...(value.contextStage.facts.lineage?.nodes.map((entity) => [entity.urn, entity] as const) ??
        []),
    ]);

    value.result.hypotheses.forEach((hypothesis, hypothesisIndex) => {
      const candidate = candidatesByChangeId.get(hypothesis.sourceChangeId);
      if (!candidate || candidate.observedAt !== hypothesis.observedAt) {
        context.addIssue({
          code: 'custom',
          message: 'A scored hypothesis must resolve to one exact suspicious-change candidate.',
          path: ['result', 'hypotheses', hypothesisIndex, 'sourceChangeId'],
        });
        return;
      }

      hypothesis.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!evidenceById.has(evidenceId)) {
          context.addIssue({
            code: 'custom',
            message: `Scored hypothesis evidence reference does not exist: ${evidenceId}`,
            path: ['result', 'hypotheses', hypothesisIndex, 'evidenceIds', evidenceIndex],
          });
        }
      });

      const changeEvidence = evidenceById.get(candidate.changeId);
      const entity = entitiesByUrn.get(candidate.entityUrn);
      if (
        !changeEvidence ||
        !entity ||
        changeEvidence.category !== expectedEvidenceCategory(candidate.category) ||
        changeEvidence.statement !== candidate.summary ||
        changeEvidence.observedAt !== candidate.observedAt ||
        changeEvidence.sourceEntity?.urn !== candidate.entityUrn ||
        changeEvidence.sourceEntity.name !== candidate.entityName ||
        changeEvidence.sourceEntity.kind !== entity.kind
      ) {
        context.addIssue({
          code: 'custom',
          message: 'The scored source change must resolve to exact factual report evidence.',
          path: ['evidence'],
        });
      }
    });
  });

export const REMEDIATION_MAX_RECOMMENDATIONS = 5;
export const REMEDIATION_MAX_FALLBACK_STEPS = 5;

export const REMEDIATION_RECOMMENDATION_TYPE_ORDER = [
  'recommended_verification',
  'potential_remediation',
] as const;
export const REMEDIATION_PRIORITY_ORDER = ['high', 'medium', 'low'] as const;
export const REMEDIATION_SUPPORTED_CHANGE_CATEGORIES = [
  'schema',
  'pipeline',
  'ownership',
  'domain',
  'tag',
] as const;
const remediationSupportedChangeCategorySet = new Set<string>(
  REMEDIATION_SUPPORTED_CHANGE_CATEGORIES,
);

export const RemediationRecommendationTypeSchema = z.enum(REMEDIATION_RECOMMENDATION_TYPE_ORDER);
export const RemediationPrioritySchema = z.enum(REMEDIATION_PRIORITY_ORDER);

const RemediationReferencesSchema = z
  .object({
    hypothesisIds: z.array(z.string().trim().min(1).max(240)).min(1).max(3),
    evidenceIds: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
    entityUrns: z.array(z.string().trim().min(1).max(500)).min(1).max(5),
    changeIds: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  })
  .strict()
  .superRefine((references, context) => {
    for (const [key, values] of Object.entries(references)) {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        if (seen.has(value)) {
          context.addIssue({
            code: 'custom',
            message: 'Remediation references must be unique within each reference kind.',
            path: [key, index],
          });
        }
        seen.add(value);
      });
    }
  });

export const RemediationRecommendationSchema = z
  .object({
    id: z.string().trim().min(1).max(240),
    type: RemediationRecommendationTypeSchema,
    priority: RemediationPrioritySchema,
    status: z.literal('not_executed'),
    sourceHypothesisRank: z.number().int().min(1).max(HYPOTHESIS_SCORING_MAX_HYPOTHESES),
    title: z.string().trim().min(1).max(200),
    rationale: z.string().trim().min(1).max(500),
    verificationStep: z.string().trim().min(1).max(500),
    reversibilityNote: z.string().trim().min(1).max(500),
    references: RemediationReferencesSchema,
  })
  .strict()
  .superRefine((recommendation, context) => {
    const requiredTitlePrefix =
      recommendation.type === 'recommended_verification'
        ? 'Recommended verification:'
        : 'Potential remediation:';
    if (!recommendation.title.startsWith(requiredTitlePrefix)) {
      context.addIssue({
        code: 'custom',
        message: 'Recommendation titles must use the allowlisted non-executing language.',
        path: ['title'],
      });
    }
    const recommendationCopy = `${recommendation.title} ${recommendation.rationale} ${recommendation.verificationStep} ${recommendation.reversibilityNote}`;
    const assertedCausalCopy = recommendationCopy.replace(
      /\bnot (?:a |the )?confirmed (?:root )?cause\b/gi,
      '',
    );
    if (
      /\b(?:confirmed (?:root )?cause|caused the incident|will fix|definitive remediation)\b/i.test(
        assertedCausalCopy,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Recommendations cannot claim a confirmed cause or guaranteed outcome.',
        path: ['rationale'],
      });
    }
    const expectedPriority = ['high', 'medium', 'low'][recommendation.sourceHypothesisRank - 1];
    if (recommendation.priority !== expectedPriority) {
      context.addIssue({
        code: 'custom',
        message: 'Recommendation priority must preserve the scored-hypothesis rank.',
        path: ['priority'],
      });
    }
  });

export const REMEDIATION_FALLBACK_STEP_TEXT = {
  inspect_scored_evidence:
    'Review the available factual evidence and scored-hypothesis gaps before proposing a change.',
  collect_runtime_records:
    'Collect bounded runtime query or pipeline records for the incident window without changing production state.',
  verify_metadata_history:
    'Verify metadata history and lineage completeness through read-only provider access.',
  review_provider_availability:
    'Review metadata-provider availability and retry the investigation only after the provider is healthy.',
  continue_fixture_mode:
    'Continue in deterministic fixture mode with the checked-in scenario; no credential is required.',
} as const;

export const REMEDIATION_FALLBACK_STEP_ORDER = [
  'inspect_scored_evidence',
  'review_provider_availability',
  'collect_runtime_records',
  'verify_metadata_history',
  'continue_fixture_mode',
] as const;

export const RemediationFallbackStepCodeSchema = z.enum(REMEDIATION_FALLBACK_STEP_ORDER);

export const RemediationFallbackStepSchema = z
  .object({
    id: RemediationFallbackStepCodeSchema,
    kind: z.enum(['safe_diagnostic', 'fixture_continuation']),
    status: z.literal('not_executed'),
    description: z.string().trim().min(1).max(300),
  })
  .strict()
  .superRefine((step, context) => {
    if (step.description !== REMEDIATION_FALLBACK_STEP_TEXT[step.id]) {
      context.addIssue({
        code: 'custom',
        message: 'Fallback-step text must match the provider-neutral safety allowlist.',
        path: ['description'],
      });
    }
    const expectedKind =
      step.id === 'continue_fixture_mode' ? 'fixture_continuation' : 'safe_diagnostic';
    if (step.kind !== expectedKind) {
      context.addIssue({
        code: 'custom',
        message: 'Fallback-step kind must match its allowlisted behavior.',
        path: ['kind'],
      });
    }
  });

export const REMEDIATION_MISSING_INFORMATION_ORDER = [
  'scored_hypotheses_insufficient',
  'scoring_unavailable',
  'report_evidence_incomplete',
  'reference_unresolved',
  'unsupported_change_category',
  'recommendation_limit_reached',
] as const;

export const RemediationMissingInformationCodeSchema = z.enum(
  REMEDIATION_MISSING_INFORMATION_ORDER,
);

export const RemediationMissingInformationSchema = z
  .object({
    code: RemediationMissingInformationCodeSchema,
    message: z.string().trim().min(1).max(300),
  })
  .strict();

function compareRemediationRecommendations(
  left: z.infer<typeof RemediationRecommendationSchema>,
  right: z.infer<typeof RemediationRecommendationSchema>,
) {
  if (left.sourceHypothesisRank !== right.sourceHypothesisRank) {
    return left.sourceHypothesisRank - right.sourceHypothesisRank;
  }
  const typeDifference =
    REMEDIATION_RECOMMENDATION_TYPE_ORDER.indexOf(left.type) -
    REMEDIATION_RECOMMENDATION_TYPE_ORDER.indexOf(right.type);
  if (typeDifference !== 0) return typeDifference;
  const priorityDifference =
    REMEDIATION_PRIORITY_ORDER.indexOf(left.priority) -
    REMEDIATION_PRIORITY_ORDER.indexOf(right.priority);
  if (priorityDifference !== 0) return priorityDifference;
  const leftChangeId = left.references.changeIds[0] ?? '';
  const rightChangeId = right.references.changeIds[0] ?? '';
  if (leftChangeId !== rightChangeId) return leftChangeId < rightChangeId ? -1 : 1;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function refineRemediationTerminal(
  value: {
    recommendations: z.infer<typeof RemediationRecommendationSchema>[];
    missingInformation: z.infer<typeof RemediationMissingInformationSchema>[];
    nextSteps: z.infer<typeof RemediationFallbackStepSchema>[];
  },
  context: z.RefinementCtx,
) {
  const recommendationIds = new Set<string>();
  const recommendationKeys = new Set<string>();
  value.recommendations.forEach((recommendation, index) => {
    if (recommendationIds.has(recommendation.id)) {
      context.addIssue({
        code: 'custom',
        message: 'Remediation recommendation IDs must be unique.',
        path: ['recommendations', index, 'id'],
      });
    }
    const semanticKey = `${recommendation.type}:${recommendation.references.hypothesisIds.join('|')}:${recommendation.references.changeIds.join('|')}`;
    if (recommendationKeys.has(semanticKey)) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate remediation recommendations are not allowed.',
        path: ['recommendations', index],
      });
    }
    const previous = value.recommendations[index - 1];
    if (previous && compareRemediationRecommendations(previous, recommendation) > 0) {
      context.addIssue({
        code: 'custom',
        message:
          'Recommendations must follow deterministic hypothesis/type/priority/reference order.',
        path: ['recommendations', index],
      });
    }
    recommendationIds.add(recommendation.id);
    recommendationKeys.add(semanticKey);
  });

  const missingCodes = new Set<string>();
  value.missingInformation.forEach((item, index) => {
    if (missingCodes.has(item.code)) {
      context.addIssue({
        code: 'custom',
        message: 'Remediation missing-information codes must be unique.',
        path: ['missingInformation', index, 'code'],
      });
    }
    const previous = value.missingInformation[index - 1];
    if (
      previous &&
      REMEDIATION_MISSING_INFORMATION_ORDER.indexOf(previous.code) >
        REMEDIATION_MISSING_INFORMATION_ORDER.indexOf(item.code)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Remediation missing information must follow deterministic code order.',
        path: ['missingInformation', index],
      });
    }
    missingCodes.add(item.code);
  });

  const nextStepIds = new Set<string>();
  value.nextSteps.forEach((step, index) => {
    if (nextStepIds.has(step.id)) {
      context.addIssue({
        code: 'custom',
        message: 'Fallback next-step IDs must be unique.',
        path: ['nextSteps', index, 'id'],
      });
    }
    const previous = value.nextSteps[index - 1];
    if (
      previous &&
      REMEDIATION_FALLBACK_STEP_ORDER.indexOf(previous.id) >
        REMEDIATION_FALLBACK_STEP_ORDER.indexOf(step.id)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Fallback next steps must follow deterministic allowlist order.',
        path: ['nextSteps', index],
      });
    }
    nextStepIds.add(step.id);
  });
  if (value.nextSteps.length > 0 && !nextStepIds.has('continue_fixture_mode')) {
    context.addIssue({
      code: 'custom',
      message: 'A fallback must include the credential-free fixture continuation step.',
      path: ['nextSteps'],
    });
  }
}

export const RemediationPlanningCompletedSchema = z
  .object({
    status: z.literal('completed'),
    recommendations: z
      .array(RemediationRecommendationSchema)
      .min(1)
      .max(REMEDIATION_MAX_RECOMMENDATIONS),
    missingInformation: z.array(RemediationMissingInformationSchema).max(5),
    nextSteps: z.array(RemediationFallbackStepSchema).max(0),
  })
  .strict()
  .superRefine(refineRemediationTerminal);

export const RemediationPlanningInsufficientSchema = z
  .object({
    status: z.literal('insufficient'),
    recommendations: z.array(RemediationRecommendationSchema).max(0),
    missingInformation: z.array(RemediationMissingInformationSchema).min(1).max(5),
    nextSteps: z.array(RemediationFallbackStepSchema).min(1).max(REMEDIATION_MAX_FALLBACK_STEPS),
  })
  .strict()
  .superRefine(refineRemediationTerminal);

export const RemediationPlanningUnavailableCodeSchema = z.enum([
  'CONTEXT_UNAVAILABLE',
  'SCORING_UNAVAILABLE',
  'PLANNING_INVALID',
]);

export const RemediationPlanningUnavailableSchema = z
  .object({
    status: z.literal('unavailable'),
    recommendations: z.array(RemediationRecommendationSchema).max(0),
    missingInformation: z.array(RemediationMissingInformationSchema).min(1).max(5),
    nextSteps: z.array(RemediationFallbackStepSchema).min(1).max(REMEDIATION_MAX_FALLBACK_STEPS),
    error: z
      .object({
        code: RemediationPlanningUnavailableCodeSchema,
        message: z.string().trim().min(1).max(300),
      })
      .strict(),
  })
  .strict()
  .superRefine(refineRemediationTerminal);

export const RemediationPlanningStageSchema = z.union([
  z.object({ status: z.literal('planning') }).strict(),
  RemediationPlanningCompletedSchema,
  RemediationPlanningInsufficientSchema,
  RemediationPlanningUnavailableSchema,
]);

export const LegacyHypothesisSchema = z
  .object({
    id: z.string().min(1),
    summary: z.string().min(1),
    confidence: z.number().min(0).max(1),
    evidenceIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const HypothesisSchema = z.union([ScoredHypothesisSchema, LegacyHypothesisSchema]);

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
  .strict()
  .superRefine((report, context) => {
    const evidenceIds = new Set(report.evidence.map((evidence) => evidence.id));

    if (evidenceIds.size !== report.evidence.length) {
      context.addIssue({
        code: 'custom',
        message: 'Investigation report evidence IDs must be unique.',
        path: ['evidence'],
      });
    }

    const hypothesisIds = new Set<string>();

    report.hypotheses.forEach((hypothesis, hypothesisIndex) => {
      if (hypothesisIds.has(hypothesis.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Investigation report hypothesis IDs must be unique.',
          path: ['hypotheses', hypothesisIndex, 'id'],
        });
      }
      hypothesisIds.add(hypothesis.id);
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

    const scoredHypotheses = report.hypotheses.filter((hypothesis) => 'rank' in hypothesis);
    if (scoredHypotheses.length > 0 && scoredHypotheses.length !== report.hypotheses.length) {
      context.addIssue({
        code: 'custom',
        message: 'A report cannot mix legacy and scored hypotheses.',
        path: ['hypotheses'],
      });
    }
    scoredHypotheses.forEach((hypothesis, index) => {
      if (hypothesis.rank !== index + 1) {
        context.addIssue({
          code: 'custom',
          message: 'Report scored-hypothesis ranks must be contiguous from one.',
          path: ['hypotheses', index, 'rank'],
        });
      }
      const previous = scoredHypotheses[index - 1];
      if (previous && compareScoredHypotheses(previous, hypothesis) > 0) {
        context.addIssue({
          code: 'custom',
          message: 'Report scored hypotheses must use deterministic rank ordering.',
          path: ['hypotheses', index],
        });
      }
    });
  });

export const IncidentRemediationPlanningSchema = z
  .object({
    contextStage: IncidentContextCompletedStageSchema,
    scoringResult: HypothesisScoringCompletedSchema,
    report: InvestigationReportSchema,
    result: RemediationPlanningCompletedSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      JSON.stringify(value.report.hypotheses) !== JSON.stringify(value.scoringResult.hypotheses)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Remediation planning requires the exact scored hypotheses in the report.',
        path: ['report', 'hypotheses'],
      });
    }

    const hypothesesById = new Map(
      value.scoringResult.hypotheses.map((hypothesis) => [hypothesis.id, hypothesis]),
    );
    const evidenceIds = new Set(value.report.evidence.map((evidence) => evidence.id));
    const reportEntityUrns = new Set(value.report.entities.map((entity) => entity.urn));
    const contextEntityUrns = new Set([
      ...value.contextStage.facts.candidateEntities.map((entity) => entity.urn),
      ...(value.contextStage.facts.lineage?.nodes.map((entity) => entity.urn) ?? []),
    ]);
    const changesById = new Map(
      value.contextStage.facts.recentChanges.flatMap((response) =>
        response.changes.map((change) => [change.id, change] as const),
      ),
    );

    value.result.recommendations.forEach((recommendation, recommendationIndex) => {
      const referencedHypotheses = recommendation.references.hypothesisIds.map((hypothesisId) =>
        hypothesesById.get(hypothesisId),
      );
      if (referencedHypotheses.some((hypothesis) => hypothesis === undefined)) {
        context.addIssue({
          code: 'custom',
          message: 'A recommendation hypothesis reference does not exist.',
          path: ['result', 'recommendations', recommendationIndex, 'references', 'hypothesisIds'],
        });
        return;
      }
      const hypotheses = referencedHypotheses.filter(
        (hypothesis): hypothesis is z.infer<typeof ScoredHypothesisSchema> =>
          hypothesis !== undefined,
      );
      if (
        hypotheses.some((hypothesis) => hypothesis.rank !== recommendation.sourceHypothesisRank)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Recommendation rank must resolve to its scored hypothesis.',
          path: ['result', 'recommendations', recommendationIndex, 'sourceHypothesisRank'],
        });
      }

      const citedEvidenceIds = new Set(hypotheses.flatMap((hypothesis) => hypothesis.evidenceIds));
      recommendation.references.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!evidenceIds.has(evidenceId) || !citedEvidenceIds.has(evidenceId)) {
          context.addIssue({
            code: 'custom',
            message: 'Recommendation evidence must resolve to evidence cited by its hypothesis.',
            path: [
              'result',
              'recommendations',
              recommendationIndex,
              'references',
              'evidenceIds',
              evidenceIndex,
            ],
          });
        }
      });

      recommendation.references.entityUrns.forEach((entityUrn, entityIndex) => {
        if (!reportEntityUrns.has(entityUrn) || !contextEntityUrns.has(entityUrn)) {
          context.addIssue({
            code: 'custom',
            message: 'Recommendation entities must resolve to report and context facts.',
            path: [
              'result',
              'recommendations',
              recommendationIndex,
              'references',
              'entityUrns',
              entityIndex,
            ],
          });
        }
      });

      recommendation.references.changeIds.forEach((changeId, changeIndex) => {
        const change = changesById.get(changeId);
        if (
          !change ||
          !hypotheses.some((hypothesis) => hypothesis.sourceChangeId === changeId) ||
          !recommendation.references.entityUrns.includes(change.entityUrn) ||
          !recommendation.references.evidenceIds.includes(changeId)
        ) {
          context.addIssue({
            code: 'custom',
            message:
              'Recommendation changes must resolve to exact hypothesis, evidence, and entity facts.',
            path: [
              'result',
              'recommendations',
              recommendationIndex,
              'references',
              'changeIds',
              changeIndex,
            ],
          });
        }
        if (change && !remediationSupportedChangeCategorySet.has(change.category)) {
          context.addIssue({
            code: 'custom',
            message: 'Recommendation source changes must use the bounded category allowlist.',
            path: [
              'result',
              'recommendations',
              recommendationIndex,
              'references',
              'changeIds',
              changeIndex,
            ],
          });
        }
      });

      const primaryChangeId = recommendation.references.changeIds[0];
      const expectedId = `${recommendation.type === 'recommended_verification' ? 'verify' : 'remediate'}-${primaryChangeId ?? ''}`;
      if (recommendation.id !== expectedId) {
        context.addIssue({
          code: 'custom',
          message: 'Recommendation IDs must be stable derivations of type and source change.',
          path: ['result', 'recommendations', recommendationIndex, 'id'],
        });
      }
    });
  });

export const IncidentRetrievalResponseSchema = z
  .discriminatedUnion('status', [
    z
      .object({
        incidentId: z.uuid(),
        status: z.literal('processing'),
        contextStage: IncidentContextStageSchema,
        suspiciousChangeStage: SuspiciousChangeDetectionStageSchema,
        hypothesisScoringStage: HypothesisScoringStageSchema,
        remediationStage: RemediationPlanningStageSchema,
      })
      .strict(),
    z
      .object({
        incidentId: z.uuid(),
        status: z.literal('completed'),
        contextStage: z.union([
          IncidentContextCompletedStageSchema,
          IncidentContextFailedStageSchema,
        ]),
        suspiciousChangeStage: SuspiciousChangeDetectionStageSchema,
        hypothesisScoringStage: HypothesisScoringStageSchema,
        remediationStage: RemediationPlanningStageSchema,
        report: InvestigationReportSchema,
      })
      .strict(),
  ])
  .superRefine((response, context) => {
    const detection = response.suspiciousChangeStage;
    const scoring = response.hypothesisScoringStage;
    const remediation = response.remediationStage;
    if (response.contextStage.status === 'gathering' && remediation.status !== 'planning') {
      context.addIssue({
        code: 'custom',
        message: 'A gathering context requires an active remediation-planning stage.',
        path: ['remediationStage'],
      });
    }
    if (response.status === 'completed' && remediation.status === 'planning') {
      context.addIssue({
        code: 'custom',
        message: 'A completed incident cannot retain an active remediation-planning stage.',
        path: ['remediationStage'],
      });
    }
    if (scoring.status === 'scoring' && remediation.status !== 'planning') {
      context.addIssue({
        code: 'custom',
        message: 'Active hypothesis scoring requires active remediation planning.',
        path: ['remediationStage'],
      });
    }
    if (
      scoring.status === 'insufficient' &&
      remediation.status !== 'insufficient' &&
      (remediation.status !== 'unavailable' || remediation.error.code !== 'PLANNING_INVALID')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Insufficient hypothesis scoring requires a safe remediation fallback.',
        path: ['remediationStage'],
      });
    }
    if (
      scoring.status === 'unavailable' &&
      (remediation.status !== 'unavailable' ||
        remediation.error.code !==
          (scoring.error.code === 'CONTEXT_UNAVAILABLE'
            ? 'CONTEXT_UNAVAILABLE'
            : 'SCORING_UNAVAILABLE'))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unavailable scoring requires a provider-safe unavailable remediation fallback.',
        path: ['remediationStage'],
      });
    }
    if (remediation.status === 'completed') {
      if (
        response.status !== 'completed' ||
        response.contextStage.status !== 'completed' ||
        scoring.status !== 'completed'
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Completed remediation requires completed context, scoring, and report stages.',
          path: ['remediationStage'],
        });
      } else if (
        !IncidentRemediationPlanningSchema.safeParse({
          contextStage: response.contextStage,
          scoringResult: scoring,
          report: response.report,
          result: remediation,
        }).success
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Remediation recommendations do not resolve to exact scored and factual inputs.',
          path: ['remediationStage'],
        });
      }
    }
    if (response.contextStage.status === 'gathering' && scoring.status !== 'scoring') {
      context.addIssue({
        code: 'custom',
        message: 'A gathering context requires an active hypothesis-scoring stage.',
        path: ['hypothesisScoringStage'],
      });
    }
    if (
      response.contextStage.status === 'failed' &&
      (scoring.status !== 'unavailable' || scoring.error.code !== 'CONTEXT_UNAVAILABLE')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A failed context requires safe context-unavailable hypothesis scoring.',
        path: ['hypothesisScoringStage'],
      });
    }
    if (
      response.contextStage.status === 'completed' &&
      detection.status === 'unavailable' &&
      (scoring.status !== 'unavailable' || scoring.error.code !== 'SUSPICIOUS_CHANGES_UNAVAILABLE')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unavailable suspicious changes require safe unavailable hypothesis scoring.',
        path: ['hypothesisScoringStage'],
      });
    }
    if (
      response.status === 'completed' &&
      response.contextStage.status === 'completed' &&
      detection.status === 'insufficient' &&
      scoring.status !== 'insufficient'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Insufficient suspicious changes require insufficient hypothesis scoring.',
        path: ['hypothesisScoringStage'],
      });
    }
    if (response.status === 'completed' && scoring.status === 'scoring') {
      context.addIssue({
        code: 'custom',
        message: 'A completed incident cannot retain an active hypothesis-scoring stage.',
        path: ['hypothesisScoringStage'],
      });
    }
    if (scoring.status === 'completed') {
      if (
        response.contextStage.status !== 'completed' ||
        detection.status !== 'completed' ||
        response.status !== 'completed'
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Completed scoring requires completed factual, suspicious, and report stages.',
          path: ['hypothesisScoringStage'],
        });
      } else {
        const scoringReferences = IncidentHypothesisScoringSchema.safeParse({
          contextStage: response.contextStage,
          suspiciousChangeResult: detection,
          evidence: response.report.evidence,
          result: scoring,
        });
        if (!scoringReferences.success) {
          context.addIssue({
            code: 'custom',
            message: 'Scored hypotheses do not resolve to exact context and report evidence.',
            path: ['hypothesisScoringStage'],
          });
        }
        if (JSON.stringify(response.report.hypotheses) !== JSON.stringify(scoring.hypotheses)) {
          context.addIssue({
            code: 'custom',
            message: 'Completed reports must use the exact ranked scored hypotheses.',
            path: ['report', 'hypotheses'],
          });
        }
      }
    }
    if (response.contextStage.status === 'gathering' && detection.status !== 'detecting') {
      context.addIssue({
        code: 'custom',
        message: 'A gathering context requires a detecting suspicious-change stage.',
        path: ['suspiciousChangeStage'],
      });
      return;
    }
    if (
      response.contextStage.status === 'failed' &&
      (detection.status !== 'unavailable' || detection.error.code !== 'CONTEXT_UNAVAILABLE')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A failed context requires a safe context-unavailable detection stage.',
        path: ['suspiciousChangeStage'],
      });
      return;
    }
    if (response.contextStage.status !== 'completed') {
      return;
    }
    if (detection.status === 'detecting') {
      context.addIssue({
        code: 'custom',
        message: 'A completed context cannot retain a detecting suspicious-change stage.',
        path: ['suspiciousChangeStage'],
      });
      return;
    }
    if (detection.status === 'unavailable') {
      if (detection.error.code !== 'DETECTION_INVALID') {
        context.addIssue({
          code: 'custom',
          message: 'A completed context can only use the safe detection-invalid unavailable state.',
          path: ['suspiciousChangeStage', 'error', 'code'],
        });
      }
      return;
    }
    const crossReferences = IncidentSuspiciousChangeDetectionSchema.safeParse({
      contextStage: response.contextStage,
      result: detection,
    });
    if (!crossReferences.success) {
      context.addIssue({
        code: 'custom',
        message: 'Suspicious-change results do not resolve to the completed incident context.',
        path: ['suspiciousChangeStage'],
      });
    }
  });

export const EVALUATION_MAX_FACTS = 20;
export const EVALUATION_MAX_ENTITIES = 20;
export const EVALUATION_MAX_CHANGES = 10;
export const EVALUATION_MAX_EVIDENCE = 20;
export const EVALUATION_MAX_HYPOTHESES = 3;
export const EVALUATION_MAX_REMEDIATIONS = 5;
export const EVALUATION_MAX_CLAIMS = 30;
export const EVALUATION_MAX_TOOL_CALLS = 10;
export const EVALUATION_MAX_LATENCY_MS = 120_000;
export const EVALUATION_RATE_DECIMALS = 6;

const EvaluationStableIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/);
const EvaluationUrnSchema = z.string().trim().min(1).max(1_000);
const EvaluationReferenceArraySchema = z.array(EvaluationStableIdSchema).max(10);
const EvaluationEntityReferenceArraySchema = z.array(EvaluationUrnSchema).max(10);

export const EvaluationEntitySchema = z
  .object({
    urn: EvaluationUrnSchema,
    name: z.string().trim().min(1).max(300),
    kind: EntityKindSchema,
  })
  .strict();

export const EvaluationChangeSchema = z
  .object({
    id: EvaluationStableIdSchema,
    entityUrn: EvaluationUrnSchema,
    category: z.enum(['schema', 'pipeline', 'lineage', 'ingestion', 'ownership', 'domain']),
    operation: z.enum(['added', 'modified', 'removed', 'failed', 'delayed']),
    observedAt: CanonicalUtcTimestampSchema,
    summary: z.string().trim().min(1).max(500),
  })
  .strict();

export const EvaluationFactSchema = z
  .object({
    id: EvaluationStableIdSchema,
    statement: z.string().trim().min(1).max(500),
    entityUrns: EvaluationEntityReferenceArraySchema,
    changeIds: EvaluationReferenceArraySchema,
  })
  .strict();

export const EvaluationEvidenceSchema = z
  .object({
    id: EvaluationStableIdSchema,
    statement: z.string().trim().min(1).max(500),
    factIds: EvaluationReferenceArraySchema,
    entityUrns: EvaluationEntityReferenceArraySchema,
    changeIds: EvaluationReferenceArraySchema,
  })
  .strict();

export const EvaluationHypothesisSchema = z
  .object({
    id: EvaluationStableIdSchema,
    rank: z.number().int().min(1).max(EVALUATION_MAX_HYPOTHESES),
    summary: z.string().trim().min(1).max(500),
    evidenceIds: EvaluationReferenceArraySchema.min(1),
    entityUrns: EvaluationEntityReferenceArraySchema,
    changeIds: EvaluationReferenceArraySchema,
  })
  .strict()
  .superRefine((hypothesis, context) => {
    const assertedCopy = hypothesis.summary.replace(
      /\bnot (?:a |the )?confirmed (?:root )?cause\b/gi,
      '',
    );
    if (
      !hypothesis.summary.startsWith('Plausible contributor:') ||
      /\b(?:confirmed (?:root )?cause|caused the incident|definitive cause)\b/i.test(assertedCopy)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation hypotheses must remain non-causal plausible contributors.',
        path: ['summary'],
      });
    }
  });

export const EvaluationRemediationSchema = z
  .object({
    id: EvaluationStableIdSchema,
    title: z.string().trim().min(1).max(300),
    status: z.literal('not_executed'),
    hypothesisIds: EvaluationReferenceArraySchema.min(1),
    evidenceIds: EvaluationReferenceArraySchema.min(1),
    entityUrns: EvaluationEntityReferenceArraySchema,
    changeIds: EvaluationReferenceArraySchema,
  })
  .strict()
  .superRefine((remediation, context) => {
    if (!/^(?:Recommended verification|Potential remediation):/.test(remediation.title)) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation remediation must use bounded non-executing wording.',
        path: ['title'],
      });
    }
  });

const EvaluationOutcomeShape = {
  facts: z.array(EvaluationFactSchema).max(EVALUATION_MAX_FACTS),
  entities: z.array(EvaluationEntitySchema).max(EVALUATION_MAX_ENTITIES),
  changes: z.array(EvaluationChangeSchema).max(EVALUATION_MAX_CHANGES),
  evidence: z.array(EvaluationEvidenceSchema).max(EVALUATION_MAX_EVIDENCE),
  hypotheses: z.array(EvaluationHypothesisSchema).max(EVALUATION_MAX_HYPOTHESES),
  remediations: z.array(EvaluationRemediationSchema).max(EVALUATION_MAX_REMEDIATIONS),
};

type EvaluationOutcomeForRefinement = {
  facts: z.infer<typeof EvaluationFactSchema>[];
  entities: z.infer<typeof EvaluationEntitySchema>[];
  changes: z.infer<typeof EvaluationChangeSchema>[];
  evidence: z.infer<typeof EvaluationEvidenceSchema>[];
  hypotheses: z.infer<typeof EvaluationHypothesisSchema>[];
  remediations: z.infer<typeof EvaluationRemediationSchema>[];
};

function refineEvaluationReferenceArray(
  values: string[],
  available: Set<string>,
  context: z.RefinementCtx,
  path: (string | number)[],
  kind: string,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: 'custom',
        message: `Evaluation ${kind} references must be unique.`,
        path: [...path, index],
      });
    }
    if (!available.has(value)) {
      context.addIssue({
        code: 'custom',
        message: `Evaluation ${kind} reference does not resolve: ${value}`,
        path: [...path, index],
      });
    }
    seen.add(value);
  });
}

function refineEvaluationCatalog(items: { id: string }[], context: z.RefinementCtx, path: string) {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) {
      context.addIssue({
        code: 'custom',
        message: `Evaluation ${path} IDs must be unique.`,
        path: [path, index, 'id'],
      });
    }
    ids.add(item.id);
  });
}

function refineEvaluationOutcome(value: EvaluationOutcomeForRefinement, context: z.RefinementCtx) {
  refineEvaluationCatalog(value.facts, context, 'facts');
  refineEvaluationCatalog(value.changes, context, 'changes');
  refineEvaluationCatalog(value.evidence, context, 'evidence');
  refineEvaluationCatalog(value.hypotheses, context, 'hypotheses');
  refineEvaluationCatalog(value.remediations, context, 'remediations');

  const entityUrns = new Set<string>();
  value.entities.forEach((entity, index) => {
    if (entityUrns.has(entity.urn)) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation entity URNs must be unique.',
        path: ['entities', index, 'urn'],
      });
    }
    entityUrns.add(entity.urn);
  });
  const factIds = new Set(value.facts.map((item) => item.id));
  const changeIds = new Set(value.changes.map((item) => item.id));
  const evidenceIds = new Set(value.evidence.map((item) => item.id));
  const hypothesisIds = new Set(value.hypotheses.map((item) => item.id));

  value.changes.forEach((change, index) => {
    refineEvaluationReferenceArray(
      [change.entityUrn],
      entityUrns,
      context,
      ['changes', index, 'entityUrn'],
      'change entity',
    );
  });
  value.facts.forEach((fact, index) => {
    refineEvaluationReferenceArray(
      fact.entityUrns,
      entityUrns,
      context,
      ['facts', index, 'entityUrns'],
      'fact entity',
    );
    refineEvaluationReferenceArray(
      fact.changeIds,
      changeIds,
      context,
      ['facts', index, 'changeIds'],
      'fact change',
    );
  });
  value.evidence.forEach((evidence, index) => {
    refineEvaluationReferenceArray(
      evidence.factIds,
      factIds,
      context,
      ['evidence', index, 'factIds'],
      'evidence fact',
    );
    refineEvaluationReferenceArray(
      evidence.entityUrns,
      entityUrns,
      context,
      ['evidence', index, 'entityUrns'],
      'evidence entity',
    );
    refineEvaluationReferenceArray(
      evidence.changeIds,
      changeIds,
      context,
      ['evidence', index, 'changeIds'],
      'evidence change',
    );
  });
  value.hypotheses.forEach((hypothesis, index) => {
    if (hypothesis.rank !== index + 1) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation hypothesis ranks must be contiguous from one.',
        path: ['hypotheses', index, 'rank'],
      });
    }
    refineEvaluationReferenceArray(
      hypothesis.evidenceIds,
      evidenceIds,
      context,
      ['hypotheses', index, 'evidenceIds'],
      'hypothesis evidence',
    );
    refineEvaluationReferenceArray(
      hypothesis.entityUrns,
      entityUrns,
      context,
      ['hypotheses', index, 'entityUrns'],
      'hypothesis entity',
    );
    refineEvaluationReferenceArray(
      hypothesis.changeIds,
      changeIds,
      context,
      ['hypotheses', index, 'changeIds'],
      'hypothesis change',
    );
  });
  value.remediations.forEach((remediation, index) => {
    refineEvaluationReferenceArray(
      remediation.hypothesisIds,
      hypothesisIds,
      context,
      ['remediations', index, 'hypothesisIds'],
      'remediation hypothesis',
    );
    refineEvaluationReferenceArray(
      remediation.evidenceIds,
      evidenceIds,
      context,
      ['remediations', index, 'evidenceIds'],
      'remediation evidence',
    );
    refineEvaluationReferenceArray(
      remediation.entityUrns,
      entityUrns,
      context,
      ['remediations', index, 'entityUrns'],
      'remediation entity',
    );
    refineEvaluationReferenceArray(
      remediation.changeIds,
      changeIds,
      context,
      ['remediations', index, 'changeIds'],
      'remediation change',
    );
  });
}

export const EvaluationExpectedOutcomeSchema = z
  .object(EvaluationOutcomeShape)
  .strict()
  .superRefine(refineEvaluationOutcome);

export const EvaluationCaseSchema = z
  .object({
    id: CanonicalEvaluationCaseIdSchema,
    title: z.string().trim().min(1).max(200),
    sourceMode: z.literal('fixture'),
    incident: IncidentRequestSchema,
    expected: EvaluationExpectedOutcomeSchema,
  })
  .strict();

export const CanonicalEvaluationSuiteSchema = z
  .array(EvaluationCaseSchema)
  .length(CANONICAL_EVALUATION_CASE_IDS.length)
  .superRefine((cases, context) => {
    cases.forEach((evaluationCase, index) => {
      if (evaluationCase.id !== CANONICAL_EVALUATION_CASE_IDS[index]) {
        context.addIssue({
          code: 'custom',
          message: 'Canonical evaluation cases must follow the shared stable order.',
          path: [index, 'id'],
        });
      }
    });
  });

export const EvaluationToolNameSchema = z.enum([
  'metadata.health',
  'metadata.search',
  'metadata.lineage',
  'metadata.recent_changes',
]);

export const EvaluationToolCallSchema = z
  .object({
    sequence: z.number().int().min(1).max(EVALUATION_MAX_TOOL_CALLS),
    tool: EvaluationToolNameSchema,
    status: z.enum(['completed', 'failed']),
    durationMs: z.number().int().min(0).max(EVALUATION_MAX_LATENCY_MS),
  })
  .strict();

export const EvaluationTokenUsageSchema = z
  .object({
    promptTokens: z.literal(0),
    completionTokens: z.literal(0),
    totalTokens: z.literal(0),
  })
  .strict();

export const EvaluationTelemetrySchema = z
  .object({
    latencyMs: z.number().int().min(0).max(EVALUATION_MAX_LATENCY_MS),
    toolCalls: z.array(EvaluationToolCallSchema).max(EVALUATION_MAX_TOOL_CALLS),
    tokenUsage: EvaluationTokenUsageSchema,
  })
  .strict()
  .superRefine((telemetry, context) => {
    telemetry.toolCalls.forEach((call, index) => {
      if (call.sequence !== index + 1) {
        context.addIssue({
          code: 'custom',
          message: 'Evaluation tool calls must have contiguous stable sequence numbers.',
          path: ['toolCalls', index, 'sequence'],
        });
      }
    });
    const declaredToolDuration = telemetry.toolCalls.reduce(
      (total, call) => total + call.durationMs,
      0,
    );
    if (declaredToolDuration > telemetry.latencyMs) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation tool-call durations cannot exceed declared case latency.',
        path: ['latencyMs'],
      });
    }
  });

export const EvaluationClaimSchema = z
  .object({
    id: EvaluationStableIdSchema,
    kind: z.enum(['fact', 'inference', 'recommendation']),
    statement: z.string().trim().min(1).max(500),
    evidenceIds: EvaluationReferenceArraySchema,
  })
  .strict();

export const EvaluationObservationSchema = z
  .object({
    ...EvaluationOutcomeShape,
    claims: z.array(EvaluationClaimSchema).max(EVALUATION_MAX_CLAIMS),
    telemetry: EvaluationTelemetrySchema,
  })
  .strict()
  .superRefine((observation, context) => {
    refineEvaluationOutcome(observation, context);
    refineEvaluationCatalog(observation.claims, context, 'claims');
    const evidenceIds = new Set(observation.evidence.map((item) => item.id));
    observation.claims.forEach((claim, index) => {
      refineEvaluationReferenceArray(
        claim.evidenceIds,
        evidenceIds,
        context,
        ['claims', index, 'evidenceIds'],
        'claim evidence',
      );
    });
  });

function evaluationRoundedRatio(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(EVALUATION_RATE_DECIMALS));
}

export const EvaluationMetricRateSchema = z
  .object({
    numerator: z.number().int().min(0),
    denominator: z.number().int().min(0),
    value: z.number().min(0).max(1),
  })
  .strict()
  .superRefine((metric, context) => {
    if (metric.numerator > metric.denominator) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation metric numerator cannot exceed its denominator.',
        path: ['numerator'],
      });
    }
    if (metric.value !== evaluationRoundedRatio(metric.numerator, metric.denominator)) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation metric value does not match the shared ratio definition.',
        path: ['value'],
      });
    }
  });

export const EvaluationMetricSetSchema = z
  .object({
    retrieval: z
      .object({
        precision: EvaluationMetricRateSchema,
        recall: EvaluationMetricRateSchema,
      })
      .strict(),
    hypotheses: z
      .object({
        top1Match: z.boolean(),
        top1Accuracy: EvaluationMetricRateSchema,
        top3Recall: EvaluationMetricRateSchema,
      })
      .strict(),
    evidence: z
      .object({
        precision: EvaluationMetricRateSchema,
        recall: EvaluationMetricRateSchema,
        referenceSupport: EvaluationMetricRateSchema,
      })
      .strict(),
    unsupportedClaims: z
      .object({
        count: z.number().int().min(0).max(EVALUATION_MAX_CLAIMS),
        rate: EvaluationMetricRateSchema,
      })
      .strict(),
    latencyMs: z.number().int().min(0).max(EVALUATION_MAX_LATENCY_MS),
    toolCallCount: z.number().int().min(0).max(EVALUATION_MAX_TOOL_CALLS),
    tokenUsage: EvaluationTokenUsageSchema,
  })
  .strict()
  .superRefine((metrics, context) => {
    if (metrics.hypotheses.top1Match !== (metrics.hypotheses.top1Accuracy.numerator === 1)) {
      context.addIssue({
        code: 'custom',
        message: 'Top-1 match must agree with its accuracy numerator.',
        path: ['hypotheses', 'top1Match'],
      });
    }
    if (metrics.unsupportedClaims.count !== metrics.unsupportedClaims.rate.numerator) {
      context.addIssue({
        code: 'custom',
        message: 'Unsupported-claim count must agree with its rate numerator.',
        path: ['unsupportedClaims', 'count'],
      });
    }
  });

export const EvaluationCaseSuccessSchema = z
  .object({
    caseId: CanonicalEvaluationCaseIdSchema,
    status: z.literal('completed'),
    observation: EvaluationObservationSchema,
    metrics: EvaluationMetricSetSchema,
  })
  .strict()
  .superRefine((result, context) => {
    if (result.metrics.latencyMs !== result.observation.telemetry.latencyMs) {
      context.addIssue({
        code: 'custom',
        message: 'Case latency metric must come from validated observation telemetry.',
        path: ['metrics', 'latencyMs'],
      });
    }
    if (result.metrics.toolCallCount !== result.observation.telemetry.toolCalls.length) {
      context.addIssue({
        code: 'custom',
        message: 'Case tool-call count must come from validated observation telemetry.',
        path: ['metrics', 'toolCallCount'],
      });
    }
  });

export const EvaluationCaseFailureSchema = z
  .object({
    caseId: CanonicalEvaluationCaseIdSchema,
    status: z.literal('failed'),
    error: z
      .object({
        code: z.literal('evaluation_case_failed'),
        message: z.literal('Canonical evaluation case failed safely.'),
      })
      .strict(),
    tokenUsage: EvaluationTokenUsageSchema,
  })
  .strict();

export const EvaluationCaseResultSchema = z.discriminatedUnion('status', [
  EvaluationCaseSuccessSchema,
  EvaluationCaseFailureSchema,
]);

const EvaluationSummarySchema = z
  .object({
    total: z.number().int().min(0),
    average: z.number().min(0),
    max: z.number().int().min(0),
  })
  .strict();

export const EvaluationAggregateMetricsSchema = z
  .object({
    retrieval: z
      .object({
        precision: EvaluationMetricRateSchema,
        recall: EvaluationMetricRateSchema,
      })
      .strict(),
    hypotheses: z
      .object({
        top1Accuracy: EvaluationMetricRateSchema,
        top3Recall: EvaluationMetricRateSchema,
      })
      .strict(),
    evidence: z
      .object({
        precision: EvaluationMetricRateSchema,
        recall: EvaluationMetricRateSchema,
        referenceSupport: EvaluationMetricRateSchema,
      })
      .strict(),
    unsupportedClaims: z
      .object({
        count: z.number().int().min(0),
        rate: EvaluationMetricRateSchema,
      })
      .strict(),
    latencyMs: EvaluationSummarySchema,
    toolCalls: EvaluationSummarySchema,
    tokenUsage: EvaluationTokenUsageSchema,
  })
  .strict();

export const EvaluationReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    suiteId: z.literal('canonical-incidents-v1'),
    caseOrder: z
      .array(CanonicalEvaluationCaseIdSchema)
      .length(CANONICAL_EVALUATION_CASE_IDS.length),
    caseCount: z.literal(CANONICAL_EVALUATION_CASE_IDS.length),
    completedCaseCount: z.number().int().min(0).max(CANONICAL_EVALUATION_CASE_IDS.length),
    failedCaseCount: z.number().int().min(0).max(CANONICAL_EVALUATION_CASE_IDS.length),
    results: z.array(EvaluationCaseResultSchema).length(CANONICAL_EVALUATION_CASE_IDS.length),
    metrics: EvaluationAggregateMetricsSchema,
  })
  .strict()
  .superRefine((report, context) => {
    report.caseOrder.forEach((caseId, index) => {
      if (caseId !== CANONICAL_EVALUATION_CASE_IDS[index]) {
        context.addIssue({
          code: 'custom',
          message: 'Evaluation report case order must match the canonical suite.',
          path: ['caseOrder', index],
        });
      }
      if (report.results[index]?.caseId !== caseId) {
        context.addIssue({
          code: 'custom',
          message: 'Evaluation results must follow the declared canonical case order.',
          path: ['results', index, 'caseId'],
        });
      }
    });
    const completed = report.results.filter((result) => result.status === 'completed');
    const failed = report.results.length - completed.length;
    if (report.completedCaseCount !== completed.length || report.failedCaseCount !== failed) {
      context.addIssue({
        code: 'custom',
        message: 'Evaluation report lifecycle counts do not match case results.',
        path: ['completedCaseCount'],
      });
    }

    const rates = [
      ['retrieval', 'precision', report.metrics.retrieval.precision],
      ['retrieval', 'recall', report.metrics.retrieval.recall],
      ['hypotheses', 'top1Accuracy', report.metrics.hypotheses.top1Accuracy],
      ['hypotheses', 'top3Recall', report.metrics.hypotheses.top3Recall],
      ['evidence', 'precision', report.metrics.evidence.precision],
      ['evidence', 'recall', report.metrics.evidence.recall],
      ['evidence', 'referenceSupport', report.metrics.evidence.referenceSupport],
      ['unsupportedClaims', 'rate', report.metrics.unsupportedClaims.rate],
    ] as const;
    for (const [group, metricName, aggregate] of rates) {
      const componentRates = completed.map((result) => {
        if (group === 'retrieval') return result.metrics.retrieval[metricName];
        if (group === 'hypotheses') return result.metrics.hypotheses[metricName];
        if (group === 'evidence') return result.metrics.evidence[metricName];
        return result.metrics.unsupportedClaims.rate;
      });
      const numerator = componentRates.reduce((total, metric) => total + metric.numerator, 0);
      const denominator = componentRates.reduce((total, metric) => total + metric.denominator, 0);
      if (
        aggregate.numerator !== numerator ||
        aggregate.denominator !== denominator ||
        aggregate.value !== evaluationRoundedRatio(numerator, denominator)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Aggregate evaluation rates must be recomputed from summed case counts.',
          path: ['metrics', group, metricName],
        });
      }
    }

    const latencyValues = completed.map((result) => result.metrics.latencyMs);
    const toolValues = completed.map((result) => result.metrics.toolCallCount);
    const validateSummary = (
      values: number[],
      summary: z.infer<typeof EvaluationSummarySchema>,
      path: string,
    ) => {
      const total = values.reduce((sum, value) => sum + value, 0);
      const average = values.length
        ? Number((total / values.length).toFixed(EVALUATION_RATE_DECIMALS))
        : 0;
      const max = values.length ? Math.max(...values) : 0;
      if (summary.total !== total || summary.average !== average || summary.max !== max) {
        context.addIssue({
          code: 'custom',
          message: `Aggregate ${path} summary must be recomputed from completed cases.`,
          path: ['metrics', path],
        });
      }
    };
    validateSummary(latencyValues, report.metrics.latencyMs, 'latencyMs');
    validateSummary(toolValues, report.metrics.toolCalls, 'toolCalls');
    const unsupportedCount = completed.reduce(
      (total, result) => total + result.metrics.unsupportedClaims.count,
      0,
    );
    if (report.metrics.unsupportedClaims.count !== unsupportedCount) {
      context.addIssue({
        code: 'custom',
        message: 'Aggregate unsupported-claim count must equal completed case counts.',
        path: ['metrics', 'unsupportedClaims', 'count'],
      });
    }
  });

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
export type MetadataRecentChangeCategory = z.infer<typeof MetadataRecentChangeCategorySchema>;
export type MetadataRecentChangeOperation = z.infer<typeof MetadataRecentChangeOperationSchema>;
export type MetadataRecentChangesRequest = z.infer<typeof MetadataRecentChangesRequestSchema>;
export type MetadataRecentChange = z.infer<typeof MetadataRecentChangeSchema>;
export type MetadataRecentChangesResponse = z.infer<typeof MetadataRecentChangesResponseSchema>;
export type MetadataSourceMode = z.infer<typeof MetadataSourceModeSchema>;
export type MetadataHealthStatus = z.infer<typeof MetadataHealthStatusSchema>;
export type MetadataHealthResponse = z.infer<typeof MetadataHealthResponseSchema>;
export type IncidentRequest = z.infer<typeof IncidentRequestSchema>;
export type IncidentIntent = z.infer<typeof IncidentIntentSchema>;
export type IncidentContextMissingInformationCode = z.infer<
  typeof IncidentContextMissingInformationCodeSchema
>;
export type IncidentContextMissingInformation = z.infer<
  typeof IncidentContextMissingInformationSchema
>;
export type IncidentContextFacts = z.infer<typeof IncidentContextFactsSchema>;
export type IncidentContextCompletedStage = z.infer<typeof IncidentContextCompletedStageSchema>;
export type IncidentContextStage = z.infer<typeof IncidentContextStageSchema>;
export type SuspiciousChangeSignalCode = z.infer<typeof SuspiciousChangeSignalCodeSchema>;
export type SuspiciousChangeSignal = z.infer<typeof SuspiciousChangeSignalSchema>;
export type SuspiciousChangeCandidate = z.infer<typeof SuspiciousChangeCandidateSchema>;
export type SuspiciousChangeMissingInformation = z.infer<
  typeof SuspiciousChangeMissingInformationSchema
>;
export type SuspiciousChangeDetectionResult = z.infer<typeof SuspiciousChangeDetectionResultSchema>;
export type SuspiciousChangeDetectionStage = z.infer<typeof SuspiciousChangeDetectionStageSchema>;
export type HypothesisScoreFactorCode = z.infer<typeof HypothesisScoreFactorCodeSchema>;
export type HypothesisScoreFactor = z.infer<typeof HypothesisScoreFactorSchema>;
export type ScoredHypothesis = z.infer<typeof ScoredHypothesisSchema>;
export type HypothesisScoringMissingInformation = z.infer<
  typeof HypothesisScoringMissingInformationSchema
>;
export type HypothesisScoringResult = z.infer<typeof HypothesisScoringResultSchema>;
export type HypothesisScoringStage = z.infer<typeof HypothesisScoringStageSchema>;
export type RemediationRecommendationType = z.infer<typeof RemediationRecommendationTypeSchema>;
export type RemediationPriority = z.infer<typeof RemediationPrioritySchema>;
export type RemediationRecommendation = z.infer<typeof RemediationRecommendationSchema>;
export type RemediationFallbackStep = z.infer<typeof RemediationFallbackStepSchema>;
export type RemediationMissingInformation = z.infer<typeof RemediationMissingInformationSchema>;
export type RemediationPlanningStage = z.infer<typeof RemediationPlanningStageSchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type IncidentAcceptedResponse = z.infer<typeof IncidentAcceptedResponseSchema>;
export type IncidentRetrievalResponse = z.infer<typeof IncidentRetrievalResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type InvestigationReport = z.infer<typeof InvestigationReportSchema>;
export type CanonicalIncidentScenarioId = z.infer<typeof CanonicalIncidentScenarioIdSchema>;
export type CanonicalIncidentScenario = z.infer<typeof CanonicalIncidentScenarioSchema>;
export type CanonicalEvaluationCaseId = z.infer<typeof CanonicalEvaluationCaseIdSchema>;
export type EvaluationEntity = z.infer<typeof EvaluationEntitySchema>;
export type EvaluationChange = z.infer<typeof EvaluationChangeSchema>;
export type EvaluationFact = z.infer<typeof EvaluationFactSchema>;
export type EvaluationEvidence = z.infer<typeof EvaluationEvidenceSchema>;
export type EvaluationHypothesis = z.infer<typeof EvaluationHypothesisSchema>;
export type EvaluationRemediation = z.infer<typeof EvaluationRemediationSchema>;
export type EvaluationExpectedOutcome = z.infer<typeof EvaluationExpectedOutcomeSchema>;
export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;
export type EvaluationToolCall = z.infer<typeof EvaluationToolCallSchema>;
export type EvaluationTokenUsage = z.infer<typeof EvaluationTokenUsageSchema>;
export type EvaluationTelemetry = z.infer<typeof EvaluationTelemetrySchema>;
export type EvaluationClaim = z.infer<typeof EvaluationClaimSchema>;
export type EvaluationObservation = z.infer<typeof EvaluationObservationSchema>;
export type EvaluationMetricRate = z.infer<typeof EvaluationMetricRateSchema>;
export type EvaluationMetricSet = z.infer<typeof EvaluationMetricSetSchema>;
export type EvaluationCaseResult = z.infer<typeof EvaluationCaseResultSchema>;
export type EvaluationAggregateMetrics = z.infer<typeof EvaluationAggregateMetricsSchema>;
export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;
