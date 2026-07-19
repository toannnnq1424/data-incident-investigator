import {
  MetadataProviderError,
  type MetadataAdapter,
  type MetadataChange,
  type MetadataHealthProvider,
  type MetadataLineageProvider,
  type MetadataRecentChangesProvider,
  type MetadataSearchProvider,
} from '@dii/datahub-client';
import {
  INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS,
  INCIDENT_CONTEXT_MAX_CANDIDATES,
  INCIDENT_CONTEXT_MAX_CHANGE_ENTITIES,
  EvidenceSchema,
  HYPOTHESIS_SCORE_BASIS_POINTS,
  HYPOTHESIS_SCORE_FACTOR_LABELS,
  HYPOTHESIS_SCORE_FACTOR_ORDER,
  HYPOTHESIS_SCORE_FACTOR_WEIGHTS,
  HYPOTHESIS_SCORING_MAX_HYPOTHESES,
  HypothesisScoringResultSchema,
  IncidentContextCompletedStageSchema,
  IncidentHypothesisScoringSchema,
  IncidentSuspiciousChangeDetectionSchema,
  IncidentIntentSchema,
  IncidentRequestSchema,
  InvestigationReportSchema,
  METADATA_LINEAGE_MAX_DEPTH,
  METADATA_LINEAGE_MAX_NODES,
  METADATA_RECENT_CHANGES_MAX_LIMIT,
  METADATA_RECENT_CHANGES_MAX_WINDOW_HOURS,
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesResponseSchema,
  SUSPICIOUS_CHANGE_MAX_CANDIDATES,
  SUSPICIOUS_CHANGE_SIGNAL_LABELS,
  SUSPICIOUS_CHANGE_SIGNAL_ORDER,
  SUSPICIOUS_CHANGE_SIGNAL_WEIGHTS,
  type Evidence,
  type IncidentContextCompletedStage,
  type IncidentContextMissingInformation,
  type IncidentIntent,
  type IncidentRequest,
  type InvestigationReport,
  type HypothesisScoreFactor,
  type HypothesisScoringMissingInformation,
  type HypothesisScoringResult,
  type MetadataRecentChangeCategory,
  type MetadataSourceMode,
  type SuspiciousChangeCandidate,
  type SuspiciousChangeDetectionResult,
  type SuspiciousChangeMissingInformation,
  type SuspiciousChangeSignal,
  type SuspiciousChangeSignalCode,
} from '@dii/shared-types';

export interface IncidentContextGatheringLimits {
  candidateEntityCount: number;
  lineageDepth: number;
  lineageEntityCount: number;
  recentChangeEntityCount: number;
  recentChangeCount: number;
  recentChangeWindowHours: number;
  toolCalls: number;
  timeoutMs: number;
}

export interface IncidentContextMetadata
  extends
    MetadataHealthProvider,
    MetadataSearchProvider,
    MetadataLineageProvider,
    MetadataRecentChangesProvider {}

export interface IncidentContextGatheringContext {
  metadata: IncidentContextMetadata;
  mode: MetadataSourceMode;
  limits: IncidentContextGatheringLimits;
}

export interface IncidentContextGatherer {
  gather(
    request: IncidentRequest,
    context: IncidentContextGatheringContext,
  ): Promise<IncidentContextCompletedStage>;
}

export const DEFAULT_INCIDENT_CONTEXT_LIMITS: IncidentContextGatheringLimits = Object.freeze({
  candidateEntityCount: INCIDENT_CONTEXT_MAX_CANDIDATES,
  lineageDepth: 2,
  lineageEntityCount: 5,
  recentChangeEntityCount: INCIDENT_CONTEXT_MAX_CHANGE_ENTITIES,
  recentChangeCount: 10,
  recentChangeWindowHours: INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS,
  toolCalls: 3 + INCIDENT_CONTEXT_MAX_CHANGE_ENTITIES,
  timeoutMs: 2_000,
});

function normalizedIncidentText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function parseIncidentIntent(
  request: IncidentRequest,
  windowHours = INCIDENT_CONTEXT_DEFAULT_WINDOW_HOURS,
): IncidentIntent {
  const parsedRequest = IncidentRequestSchema.parse(request);
  return IncidentIntentSchema.parse({
    question: normalizedIncidentText(parsedRequest.question),
    entityHints: parsedRequest.entityHint ? [normalizedIncidentText(parsedRequest.entityHint)] : [],
    symptoms: parsedRequest.symptom ? [normalizedIncidentText(parsedRequest.symptom)] : [],
    timeWindow: parsedRequest.occurredAt
      ? {
          endTime: new Date(parsedRequest.occurredAt).toISOString(),
          hours: windowHours,
          basis: 'incident_time',
        }
      : {
          hours: windowHours,
          basis: 'provider_default',
        },
  });
}

function validateContextLimits(limits: IncidentContextGatheringLimits) {
  const requiredToolCalls = 3 + limits.recentChangeEntityCount;
  if (
    !Number.isInteger(limits.candidateEntityCount) ||
    limits.candidateEntityCount < 1 ||
    limits.candidateEntityCount > INCIDENT_CONTEXT_MAX_CANDIDATES ||
    !Number.isInteger(limits.lineageDepth) ||
    limits.lineageDepth < 1 ||
    limits.lineageDepth > METADATA_LINEAGE_MAX_DEPTH ||
    !Number.isInteger(limits.lineageEntityCount) ||
    limits.lineageEntityCount < 1 ||
    limits.lineageEntityCount > METADATA_LINEAGE_MAX_NODES ||
    !Number.isInteger(limits.recentChangeEntityCount) ||
    limits.recentChangeEntityCount < 1 ||
    limits.recentChangeEntityCount > INCIDENT_CONTEXT_MAX_CHANGE_ENTITIES ||
    !Number.isInteger(limits.recentChangeCount) ||
    limits.recentChangeCount < 1 ||
    limits.recentChangeCount > METADATA_RECENT_CHANGES_MAX_LIMIT ||
    !Number.isInteger(limits.recentChangeWindowHours) ||
    limits.recentChangeWindowHours < 1 ||
    limits.recentChangeWindowHours > METADATA_RECENT_CHANGES_MAX_WINDOW_HOURS ||
    !Number.isInteger(limits.toolCalls) ||
    limits.toolCalls < requiredToolCalls ||
    limits.toolCalls > 10 ||
    !Number.isInteger(limits.timeoutMs) ||
    limits.timeoutMs < 1 ||
    limits.timeoutMs > 10_000
  ) {
    throw new Error('Incident context limits exceed the supported deterministic bounds.');
  }
}

function addMissingInformation(
  missingInformation: IncidentContextMissingInformation[],
  item: IncidentContextMissingInformation,
) {
  if (!missingInformation.some((existing) => existing.code === item.code)) {
    missingInformation.push(item);
  }
}

function assertContextActive(signal: AbortSignal) {
  if (signal.aborted) {
    throw new MetadataProviderError('timeout');
  }
}

export class DeterministicIncidentContextGatherer implements IncidentContextGatherer {
  async gather(
    request: IncidentRequest,
    context: IncidentContextGatheringContext,
  ): Promise<IncidentContextCompletedStage> {
    validateContextLimits(context.limits);
    const intent = parseIncidentIntent(request, context.limits.recentChangeWindowHours);
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new MetadataProviderError('timeout'));
      }, context.limits.timeoutMs);
    });

    try {
      return await Promise.race([
        this.gatherBounded(intent, context, controller.signal),
        timeoutPromise,
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private async gatherBounded(
    intent: IncidentIntent,
    context: IncidentContextGatheringContext,
    signal: AbortSignal,
  ): Promise<IncidentContextCompletedStage> {
    const { limits, metadata, mode } = context;
    const missingInformation: IncidentContextMissingInformation[] = [];
    if (intent.entityHints.length === 0) {
      addMissingInformation(missingInformation, {
        code: 'entity_hint_not_supplied',
        message: 'No entity hint was supplied; candidate search used the incident question.',
      });
    }
    if (intent.timeWindow.basis === 'provider_default') {
      addMissingInformation(missingInformation, {
        code: 'incident_time_not_supplied',
        message: 'No incident time was supplied; the metadata source selected the window end.',
      });
    }
    if (intent.symptoms.length === 0) {
      addMissingInformation(missingInformation, {
        code: 'symptom_not_supplied',
        message: 'No observed symptom was supplied for this intake.',
      });
    }

    assertContextActive(signal);
    const healthResult = await metadata.healthCheck({ signal });
    assertContextActive(signal);
    const parsedHealth = MetadataHealthResponseSchema.safeParse({ mode, ...healthResult });
    if (!parsedHealth.success) {
      throw new MetadataProviderError('invalid_response');
    }
    const health = parsedHealth.data;
    if (health.status !== 'ready') {
      throw new MetadataProviderError(health.status);
    }

    const query = intent.entityHints[0] ?? intent.question;
    assertContextActive(signal);
    const searchResults = await metadata.searchEntities({
      query,
      limit: limits.candidateEntityCount,
      fallbackToDefault: false,
      signal,
    });
    assertContextActive(signal);
    const parsedSearch = MetadataEntitySearchResponseSchema.safeParse({
      query,
      limit: limits.candidateEntityCount,
      results: searchResults,
    });
    if (!parsedSearch.success) {
      throw new MetadataProviderError('invalid_response');
    }
    const candidateEntities = parsedSearch.data.results;
    const selectedEntity = candidateEntities[0];

    if (!selectedEntity) {
      addMissingInformation(missingInformation, {
        code: 'entity_not_found',
        message: 'The metadata source returned no candidate entity for the normalized intake.',
      });
      return IncidentContextCompletedStageSchema.parse({
        status: 'completed',
        intent,
        facts: {
          sourceMode: mode,
          candidateEntities,
          recentChanges: [],
        },
        missingInformation,
      });
    }

    const lineageRequest = {
      rootUrn: selectedEntity.urn,
      direction: 'upstream',
      depth: limits.lineageDepth,
      maxNodes: limits.lineageEntityCount,
      signal,
    } as const;
    assertContextActive(signal);
    const lineageResponse = await metadata.getLineageGraph(lineageRequest);
    assertContextActive(signal);
    const parsedLineage = MetadataLineageResponseSchema.safeParse(lineageResponse);
    if (
      !parsedLineage.success ||
      parsedLineage.data.rootUrn !== lineageRequest.rootUrn ||
      parsedLineage.data.direction !== lineageRequest.direction ||
      parsedLineage.data.requestedDepth !== lineageRequest.depth ||
      parsedLineage.data.maxNodes !== lineageRequest.maxNodes
    ) {
      throw new MetadataProviderError('invalid_response');
    }
    const lineage = parsedLineage.data;
    if (lineage.edges.length === 0) {
      addMissingInformation(missingInformation, {
        code: 'lineage_not_found',
        message: 'No upstream lineage was returned within the selected bounds.',
      });
    }
    if (lineage.truncated) {
      addMissingInformation(missingInformation, {
        code: 'lineage_truncated',
        message: 'Additional upstream lineage exists outside the selected bounds.',
      });
    }

    const changeEntities = lineage.nodes.slice(1, 1 + limits.recentChangeEntityCount);
    if (changeEntities.length === 0) {
      const rootEntity = lineage.nodes[0];
      if (!rootEntity) {
        throw new MetadataProviderError('invalid_response');
      }
      changeEntities.push(rootEntity);
    }
    const recentChanges = [];
    for (const entity of changeEntities) {
      const recentChangeRequest = {
        entityUrn: entity.urn,
        ...(intent.timeWindow.endTime ? { endTime: intent.timeWindow.endTime } : {}),
        windowHours: intent.timeWindow.hours,
        limit: limits.recentChangeCount,
        signal,
      } as const;
      assertContextActive(signal);
      const recentChangesResponse = await metadata.getRecentChangesForEntity(recentChangeRequest);
      assertContextActive(signal);
      const parsedRecentChanges =
        MetadataRecentChangesResponseSchema.safeParse(recentChangesResponse);
      if (
        !parsedRecentChanges.success ||
        parsedRecentChanges.data.entityUrn !== recentChangeRequest.entityUrn ||
        parsedRecentChanges.data.window.hours !== recentChangeRequest.windowHours ||
        parsedRecentChanges.data.limit !== recentChangeRequest.limit ||
        (recentChangeRequest.endTime &&
          parsedRecentChanges.data.window.endTime !== recentChangeRequest.endTime)
      ) {
        throw new MetadataProviderError('invalid_response');
      }
      recentChanges.push(parsedRecentChanges.data);
    }

    if (recentChanges.every((response) => response.changes.length === 0)) {
      addMissingInformation(missingInformation, {
        code: 'recent_changes_not_found',
        message: 'No recent metadata changes were returned for the bounded context entities.',
      });
    }
    if (recentChanges.some((response) => response.truncated)) {
      addMissingInformation(missingInformation, {
        code: 'recent_changes_truncated',
        message: 'Additional metadata change history exists outside the selected bounds.',
      });
    }

    return IncidentContextCompletedStageSchema.parse({
      status: 'completed',
      intent,
      facts: {
        sourceMode: mode,
        candidateEntities,
        selectedEntity,
        lineage,
        recentChanges,
      },
      missingInformation,
    });
  }
}

export interface SuspiciousChangeDetector {
  detect(contextStage: IncidentContextCompletedStage): SuspiciousChangeDetectionResult;
}

const suspiciousChangeCategoryTerms: Readonly<
  Record<MetadataRecentChangeCategory, readonly string[]>
> = Object.freeze({
  schema: ['schema', 'column', 'columns', 'field', 'fields', 'type', 'types'],
  ownership: ['owner', 'ownership', 'steward'],
  tag: ['tag', 'tags', 'classification'],
  domain: ['domain'],
  documentation: ['documentation', 'description', 'docs'],
  glossary: ['glossary', 'term', 'terms'],
  relationship: ['relationship', 'lineage', 'upstream', 'downstream', 'dependency'],
  'structured-property': ['property', 'properties'],
  application: ['application', 'app'],
  'asset-membership': ['asset', 'collection', 'membership'],
  pipeline: ['pipeline', 'job', 'jobs', 'refresh', 'stale', 'delay', 'delayed', 'ingestion'],
});

const suspiciousChangeMaxIntentTokens = 128;

function boundedIntentTokens(contextStage: IncidentContextCompletedStage) {
  const tokens = [contextStage.intent.question, ...contextStage.intent.symptoms]
    .join(' ')
    .toLowerCase()
    .match(/[a-z0-9]+(?:[-_][a-z0-9]+)*/g);
  return new Set((tokens ?? []).slice(0, suspiciousChangeMaxIntentTokens));
}

function suspiciousChangeSignal(code: SuspiciousChangeSignalCode): SuspiciousChangeSignal {
  return {
    code,
    label: SUSPICIOUS_CHANGE_SIGNAL_LABELS[code],
  };
}

function compareSuspiciousCandidates(
  left: SuspiciousChangeCandidate,
  right: SuspiciousChangeCandidate,
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

function addSuspiciousChangeMissingInformation(
  missingInformation: SuspiciousChangeMissingInformation[],
  item: SuspiciousChangeMissingInformation,
) {
  if (!missingInformation.some((existing) => existing.code === item.code)) {
    missingInformation.push(item);
  }
}

export class DeterministicSuspiciousChangeDetector implements SuspiciousChangeDetector {
  detect(contextStage: IncidentContextCompletedStage): SuspiciousChangeDetectionResult {
    const parsedContext = IncidentContextCompletedStageSchema.parse(contextStage);
    const missingInformation: SuspiciousChangeMissingInformation[] = [];
    if (parsedContext.intent.timeWindow.basis !== 'incident_time') {
      addSuspiciousChangeMissingInformation(missingInformation, {
        code: 'incident_time_not_supplied',
        message: 'No incident time was supplied, so an incident-window signal was not assigned.',
      });
    }
    if (parsedContext.intent.symptoms.length === 0) {
      addSuspiciousChangeMissingInformation(missingInformation, {
        code: 'symptom_not_supplied',
        message: 'No symptom was supplied; category matching used only bounded question terms.',
      });
    }
    if (parsedContext.facts.recentChanges.some((response) => response.truncated)) {
      addSuspiciousChangeMissingInformation(missingInformation, {
        code: 'context_changes_truncated',
        message: 'The gathered recent-change facts were truncated by an existing context bound.',
      });
    }

    const changesById = new Map(
      parsedContext.facts.recentChanges.flatMap((response) =>
        response.changes.map((change) => [change.id, change] as const),
      ),
    );
    if (changesById.size === 0) {
      addSuspiciousChangeMissingInformation(missingInformation, {
        code: 'recent_changes_not_found',
        message: 'No recent metadata change facts were available for deterministic detection.',
      });
    }

    const intentTokens = boundedIntentTokens(parsedContext);
    const lineageNodes = new Map(
      parsedContext.facts.lineage?.nodes.map((node) => [node.urn, node] as const) ?? [],
    );
    const incidentEndTime = parsedContext.intent.timeWindow.endTime;
    const incidentStartTime = incidentEndTime
      ? Date.parse(incidentEndTime) - parsedContext.intent.timeWindow.hours * 60 * 60 * 1_000
      : undefined;
    const candidates: SuspiciousChangeCandidate[] = [];

    for (const change of changesById.values()) {
      const signals: SuspiciousChangeSignal[] = [];
      if (suspiciousChangeCategoryTerms[change.category].some((term) => intentTokens.has(term))) {
        signals.push(suspiciousChangeSignal('category_intent_match'));
      }
      const observedAt = Date.parse(change.timestamp);
      if (
        parsedContext.intent.timeWindow.basis === 'incident_time' &&
        incidentEndTime &&
        incidentStartTime !== undefined &&
        observedAt >= incidentStartTime &&
        observedAt <= Date.parse(incidentEndTime)
      ) {
        signals.push(suspiciousChangeSignal('incident_window'));
      }
      if (change.entityUrn === parsedContext.facts.selectedEntity?.urn) {
        signals.push(suspiciousChangeSignal('selected_entity'));
      } else if ((lineageNodes.get(change.entityUrn)?.depth ?? 0) > 0) {
        signals.push(suspiciousChangeSignal('upstream_lineage'));
      }
      if (change.operation === 'removed' || change.operation === 'modified') {
        signals.push(suspiciousChangeSignal('disruptive_operation'));
      }
      signals.sort(
        (left, right) =>
          SUSPICIOUS_CHANGE_SIGNAL_ORDER.indexOf(left.code) -
          SUSPICIOUS_CHANGE_SIGNAL_ORDER.indexOf(right.code),
      );

      const hasIncidentSignal = signals.some(
        (signal) => signal.code === 'category_intent_match' || signal.code === 'incident_window',
      );
      const entityName = lineageNodes.get(change.entityUrn)?.name;
      if (!hasIncidentSignal || signals.length < 2 || !entityName) {
        continue;
      }

      candidates.push({
        changeId: change.id,
        entityUrn: change.entityUrn,
        entityName,
        category: change.category,
        operation: change.operation,
        observedAt: change.timestamp,
        summary: change.summary,
        ...(change.field ? { field: change.field } : {}),
        signals,
      });
    }

    candidates.sort(compareSuspiciousCandidates);
    if (candidates.length > SUSPICIOUS_CHANGE_MAX_CANDIDATES) {
      addSuspiciousChangeMissingInformation(missingInformation, {
        code: 'candidate_limit_reached',
        message: 'Additional qualifying changes were omitted by the five-candidate output cap.',
      });
    }
    const boundedCandidates = candidates.slice(0, SUSPICIOUS_CHANGE_MAX_CANDIDATES);
    if (boundedCandidates.length === 0) {
      addSuspiciousChangeMissingInformation(missingInformation, {
        code: 'no_matching_signals',
        message: 'No recent change had enough deterministic incident-specific signals.',
      });
    }

    const result =
      boundedCandidates.length > 0
        ? {
            status: 'completed' as const,
            candidates: boundedCandidates,
            missingInformation,
          }
        : {
            status: 'insufficient' as const,
            candidates: [],
            missingInformation,
          };

    return IncidentSuspiciousChangeDetectionSchema.parse({
      contextStage: parsedContext,
      result,
    }).result;
  }
}

export interface HypothesisScorer {
  score(
    contextStage: IncidentContextCompletedStage,
    suspiciousChangeResult: SuspiciousChangeDetectionResult,
    evidence: Evidence[],
  ): HypothesisScoringResult;
}

const scoringTokenLimit = 128;
const scoringStopWords = new Set([
  'after',
  'before',
  'change',
  'changed',
  'from',
  'have',
  'incident',
  'metadata',
  'reported',
  'the',
  'this',
  'today',
  'what',
  'when',
  'where',
  'which',
  'with',
]);

function boundedScoringTokens(values: readonly string[]) {
  const tokens = values
    .join(' ')
    .toLowerCase()
    .match(/[a-z0-9]+/g);
  return new Set(
    (tokens ?? [])
      .filter((token) => token.length >= 3 && !scoringStopWords.has(token))
      .slice(0, scoringTokenLimit),
  );
}

function scoringEvidenceCategory(category: MetadataRecentChangeCategory): Evidence['category'] {
  if (category === 'schema') return 'schema-change';
  if (category === 'pipeline') return 'pipeline';
  if (category === 'ownership') return 'ownership';
  return 'metadata';
}

function hypothesisScoreFactor(
  code: HypothesisScoreFactor['code'],
  contributionBasisPoints: number,
): HypothesisScoreFactor {
  return {
    code,
    label: HYPOTHESIS_SCORE_FACTOR_LABELS[code],
    contributionBasisPoints,
    weightBasisPoints: HYPOTHESIS_SCORE_FACTOR_WEIGHTS[code],
  };
}

function addHypothesisScoringMissingInformation(
  missingInformation: HypothesisScoringMissingInformation[],
  item: HypothesisScoringMissingInformation,
) {
  if (!missingInformation.some((existing) => existing.code === item.code)) {
    missingInformation.push(item);
  }
}

function insufficientHypothesisScoring(
  missingInformation: HypothesisScoringMissingInformation[],
): HypothesisScoringResult {
  return HypothesisScoringResultSchema.parse({
    status: 'insufficient',
    hypotheses: [],
    missingInformation,
  });
}

function exactCandidateEvidence(
  candidate: SuspiciousChangeCandidate,
  evidence: Evidence,
  contextStage: IncidentContextCompletedStage,
) {
  const entity = contextStage.facts.lineage?.nodes.find((node) => node.urn === candidate.entityUrn);
  return (
    entity !== undefined &&
    evidence.id === candidate.changeId &&
    evidence.category === scoringEvidenceCategory(candidate.category) &&
    evidence.statement === candidate.summary &&
    evidence.observedAt === candidate.observedAt &&
    evidence.sourceEntity?.urn === candidate.entityUrn &&
    evidence.sourceEntity.name === candidate.entityName &&
    evidence.sourceEntity.kind === entity.kind
  );
}

function candidateScoreFactors(
  candidate: SuspiciousChangeCandidate,
  contextStage: IncidentContextCompletedStage,
) {
  const signalCodes = new Set(candidate.signals.map((signal) => signal.code));
  const lineageDepth = contextStage.facts.lineage?.nodes.find(
    (node) => node.urn === candidate.entityUrn,
  )?.depth;
  const incidentTokens = boundedScoringTokens([
    contextStage.intent.question,
    ...contextStage.intent.symptoms,
  ]);
  const candidateTokens = boundedScoringTokens([
    candidate.summary,
    candidate.field ?? '',
    candidate.category,
  ]);
  const hasBoundedTokenFit = [...candidateTokens].some((token) => incidentTokens.has(token));

  const factors = [
    hypothesisScoreFactor('change_recency', signalCodes.has('incident_window') ? 3_000 : 0),
    hypothesisScoreFactor(
      'lineage_position',
      lineageDepth === 1 ? 2_000 : lineageDepth === 0 ? 1_000 : lineageDepth ? 1_200 : 0,
    ),
    hypothesisScoreFactor(
      'symptom_category_fit',
      signalCodes.has('category_intent_match') ? 3_000 : hasBoundedTokenFit ? 1_500 : 0,
    ),
    hypothesisScoreFactor(
      'evidence_quality',
      contextStage.facts.lineage?.truncated ? 1_000 : 2_000,
    ),
  ];

  return factors.sort(
    (left, right) =>
      HYPOTHESIS_SCORE_FACTOR_ORDER.indexOf(left.code) -
      HYPOTHESIS_SCORE_FACTOR_ORDER.indexOf(right.code),
  );
}

export class DeterministicHypothesisScorer implements HypothesisScorer {
  score(
    contextStage: IncidentContextCompletedStage,
    suspiciousChangeResult: SuspiciousChangeDetectionResult,
    evidence: Evidence[],
  ): HypothesisScoringResult {
    const parsedContext = IncidentContextCompletedStageSchema.parse(contextStage);
    const parsedEvidence = EvidenceSchema.array().max(100).parse(evidence);
    const missingInformation: HypothesisScoringMissingInformation[] = [];

    if (parsedContext.intent.timeWindow.basis !== 'incident_time') {
      addHypothesisScoringMissingInformation(missingInformation, {
        code: 'incident_time_not_supplied',
        message: 'No incident time was supplied, so the recency factor contributes zero.',
      });
    }
    if (parsedContext.intent.symptoms.length === 0) {
      addHypothesisScoringMissingInformation(missingInformation, {
        code: 'symptom_not_supplied',
        message: 'No symptom was supplied; bounded fit uses only the incident question.',
      });
    }

    if (suspiciousChangeResult.status === 'insufficient') {
      addHypothesisScoringMissingInformation(missingInformation, {
        code: 'suspicious_changes_insufficient',
        message: 'Suspicious-change detection returned no candidate to score.',
      });
      return insufficientHypothesisScoring(missingInformation);
    }

    const validatedDetection = IncidentSuspiciousChangeDetectionSchema.parse({
      contextStage: parsedContext,
      result: suspiciousChangeResult,
    }).result;
    const materiallyTruncated =
      parsedContext.facts.recentChanges.some((response) => response.truncated) ||
      validatedDetection.missingInformation.some((item) =>
        ['context_changes_truncated', 'candidate_limit_reached'].includes(item.code),
      );
    if (materiallyTruncated) {
      addHypothesisScoringMissingInformation(missingInformation, {
        code: 'context_changes_truncated',
        message:
          'Recent-change evidence is truncated, so a complete deterministic rank is unavailable.',
      });
      return insufficientHypothesisScoring(missingInformation);
    }

    const evidenceIds = new Set(parsedEvidence.map((item) => item.id));
    const unresolvedEvidence =
      evidenceIds.size !== parsedEvidence.length ||
      validatedDetection.candidates.some((candidate) => {
        const candidateEvidence = parsedEvidence.find((item) => item.id === candidate.changeId);
        return (
          !candidateEvidence || !exactCandidateEvidence(candidate, candidateEvidence, parsedContext)
        );
      });
    if (unresolvedEvidence) {
      addHypothesisScoringMissingInformation(missingInformation, {
        code: 'evidence_reference_unresolved',
        message: 'A suspicious change did not resolve to exact factual report evidence.',
      });
      return insufficientHypothesisScoring(missingInformation);
    }

    const generated = validatedDetection.candidates.map((candidate) => {
      const factors = candidateScoreFactors(candidate, parsedContext);
      const totalBasisPoints = Math.min(
        HYPOTHESIS_SCORE_BASIS_POINTS,
        Math.max(
          0,
          factors.reduce((total, factor) => total + factor.contributionBasisPoints, 0),
        ),
      );
      return {
        id: `hypothesis-${candidate.changeId}`,
        sourceChangeId: candidate.changeId,
        observedAt: candidate.observedAt,
        summary: `Plausible contributor: the ${candidate.operation} ${candidate.category} change on ${candidate.entityName} may have contributed to the incident.`,
        confidence: totalBasisPoints / HYPOTHESIS_SCORE_BASIS_POINTS,
        evidenceIds: [candidate.changeId],
        factors,
      };
    });

    generated.sort((left, right) => {
      if (left.confidence !== right.confidence) return right.confidence - left.confidence;
      if (left.observedAt !== right.observedAt) return left.observedAt > right.observedAt ? -1 : 1;
      if (left.sourceChangeId !== right.sourceChangeId) {
        return left.sourceChangeId < right.sourceChangeId ? -1 : 1;
      }
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });

    if (generated.length > HYPOTHESIS_SCORING_MAX_HYPOTHESES) {
      addHypothesisScoringMissingInformation(missingInformation, {
        code: 'hypothesis_limit_reached',
        message: 'Additional scored hypotheses were omitted by the three-hypothesis output cap.',
      });
    }
    const result = HypothesisScoringResultSchema.parse({
      status: 'completed',
      hypotheses: generated
        .slice(0, HYPOTHESIS_SCORING_MAX_HYPOTHESES)
        .map((hypothesis, index) => ({ ...hypothesis, rank: index + 1 })),
      missingInformation,
    });
    if (result.status !== 'completed') {
      throw new Error('Completed hypothesis scoring unexpectedly became insufficient.');
    }

    return IncidentHypothesisScoringSchema.parse({
      contextStage: parsedContext,
      suspiciousChangeResult: validatedDetection,
      evidence: parsedEvidence,
      result,
    }).result;
  }
}

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
      ? `Plausible contributor: the recent ${leadingChange.category} change on ${leadingChange.entity.name} may have contributed to the reported incident.`
      : `Available fixture metadata is insufficient to identify a plausible recent-change contributor for ${lineage.seed.name}.`;
    const legacyIncidentTokens = boundedScoringTokens([request.question, request.symptom ?? '']);
    const legacyChangeTokens = boundedScoringTokens([leadingChange?.summary ?? '']);
    const legacyFitContribution = [...legacyChangeTokens].some((token) =>
      legacyIncidentTokens.has(token),
    )
      ? 1_500
      : 0;
    const legacyLineageContribution = leadingChange
      ? lineage.upstream.some((entity) => entity.urn === leadingChange.entity.urn)
        ? 2_000
        : leadingChange.entity.urn === lineage.seed.urn
          ? 1_000
          : 0
      : 0;
    const legacyConfidenceBasisPoints = Math.min(
      HYPOTHESIS_SCORE_BASIS_POINTS,
      (leadingChange ? 3_000 : 0) +
        legacyLineageContribution +
        legacyFitContribution +
        (leadingChange ? 2_000 : 1_000),
    );

    return InvestigationReportSchema.parse({
      incidentId: context.incidentId,
      summary: `The strongest evidence-backed inference is: ${hypothesisSummary}`,
      entities,
      evidence,
      hypotheses: [
        {
          id: 'hypothesis-recent-change',
          summary: hypothesisSummary,
          confidence: legacyConfidenceBasisPoints / HYPOTHESIS_SCORE_BASIS_POINTS,
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
