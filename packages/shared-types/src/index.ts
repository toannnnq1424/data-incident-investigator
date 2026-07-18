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

export const IncidentRetrievalResponseSchema = z
  .discriminatedUnion('status', [
    z
      .object({
        incidentId: z.uuid(),
        status: z.literal('processing'),
        contextStage: IncidentContextStageSchema,
        suspiciousChangeStage: SuspiciousChangeDetectionStageSchema,
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
        report: InvestigationReportSchema,
      })
      .strict(),
  ])
  .superRefine((response, context) => {
    const detection = response.suspiciousChangeStage;
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
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type IncidentAcceptedResponse = z.infer<typeof IncidentAcceptedResponseSchema>;
export type IncidentRetrievalResponse = z.infer<typeof IncidentRetrievalResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type InvestigationReport = z.infer<typeof InvestigationReportSchema>;
