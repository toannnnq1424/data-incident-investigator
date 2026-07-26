import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import fastifyStatic from '@fastify/static';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicBlastRadiusAnalyzer,
  DeterministicIncidentContextGatherer,
  DeterministicHypothesisScorer,
  DeterministicInvestigationRunner,
  DeterministicRemediationPlanner,
  DeterministicSuspiciousChangeDetector,
  FIXTURE_INVESTIGATION_LIMITS,
  IncidentContextOperationError,
  InvestigationExecutionBudget,
  InvestigationLimitError,
  InvestigationModelProviderTimeoutError,
  type IncidentContextGatherer,
  type IncidentContextGatheringLimits,
  type BlastRadiusAnalyzer,
  type HypothesisScorer,
  type InvestigationLimits,
  type InvestigationRunner,
  type RemediationPlanner,
  type SuspiciousChangeDetector,
} from '@dii/agent-core';
import {
  createDataHubHealthClient,
  createDataHubLineageClient,
  createDataHubMcpMetadataAdapter,
  createDataHubRecentChangesClient,
  createDataHubSearchClient,
  createFixtureMetadataAdapter,
  dataHubMcpConfigFromEnvironment,
  DataHubMcpConfigurationError,
  MetadataProviderError,
  type MetadataAdapter,
  type MetadataHealthProvider,
  type MetadataLineageProvider,
  type MetadataRecentChangesProvider,
  type MetadataSearchProvider,
} from '@dii/datahub-client';
import {
  ApiErrorSchema,
  BLAST_RADIUS_ANALYSIS_VERSION,
  BLAST_RADIUS_MAX_ROOT_ENTITIES,
  BLAST_RADIUS_STATUS_EXPLANATIONS,
  BlastRadiusAnalysisSchema,
  DEFAULT_PUBLIC_INGRESS_CONFIG,
  DEFAULT_RUNTIME_LIMIT_CONFIG,
  createIncidentMarkdownExport,
  HealthResponseSchema,
  INCIDENT_CONTEXT_MAX_CANDIDATES,
  INVESTIGATION_COMPLETED_EVENT_SUMMARY,
  INVESTIGATION_EVENT_ACTION_SUMMARIES,
  INVESTIGATION_NEXT_STEP_TEXT,
  INVESTIGATION_TERMINATION_MESSAGES,
  INVESTIGATION_WARNING_MESSAGES,
  IncidentAcceptedResponseSchema,
  IncidentContextStageSchema,
  IncidentIdParamsSchema,
  InvestigationEventSchema,
  InvestigationEventTrailSchema,
  HypothesisScoringStageSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  InvestigationDegradedResponseSchema,
  InvestigationDraftReportSchema,
  InvestigationReportSchema,
  METADATA_ENTITY_SEARCH_MAX_LIMIT,
  METADATA_LINEAGE_MAX_NODES,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataHealthStatusSchema,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
  MetadataSourceModeSchema,
  REMEDIATION_FALLBACK_STEP_TEXT,
  RemediationPlanningStageSchema,
  PublicIngressConfigSchema,
  ReadinessResponseSchema,
  RuntimeLimitConfigSchema,
  SuspiciousChangeDetectionStageSchema,
  UNSCORED_CONFIDENCE_EXPLANATIONS,
  type IncidentContextStage,
  type IncidentRetrievalResponse,
  type BlastRadiusAnalysis,
  type HypothesisScoringStage,
  type InvestigationDraftReport,
  type InvestigationReport,
  type InvestigationExecutionMetadata,
  type InvestigationDegradedResponse,
  type InvestigationNextStep,
  type InvestigationEventActionType,
  type InvestigationEventTrail,
  type InvestigationOperation,
  type InvestigationTerminationReason,
  type MetadataHealthResponse,
  type MetadataInvestigationOperation,
  type MetadataSourceMode,
  type PublicIngressConfig,
  type RemediationPlanningStage,
  type RuntimeLimitConfig,
  type SuspiciousChangeDetectionStage,
  type InvestigationWarning,
  type MetadataHealthStatus,
  type ReadinessCheck,
  type ReadinessReasonCode,
  type ReadinessResponse,
} from '@dii/shared-types';
import Fastify from 'fastify';

interface BuildServerOptions {
  environment?: NodeJS.ProcessEnv;
  executionClock?: () => number;
  eventClock?: () => number;
  logger?: boolean;
  metadata?: MetadataAdapter;
  metadataHealth?: MetadataHealthProvider;
  modelHealth?: MetadataHealthProvider;
  metadataLineage?: MetadataLineageProvider;
  metadataRecentChanges?: MetadataRecentChangesProvider;
  metadataSearch?: MetadataSearchProvider;
  mode?: MetadataSourceMode;
  processingDelayMs?: number;
  contextGatherer?: IncidentContextGatherer;
  contextLimits?: IncidentContextGatheringLimits;
  blastRadiusAnalyzer?: BlastRadiusAnalyzer;
  suspiciousChangeDetector?: SuspiciousChangeDetector;
  hypothesisScorer?: HypothesisScorer;
  remediationPlanner?: RemediationPlanner;
  runner?: InvestigationRunner;
  limits?: InvestigationLimits;
  runtimeLimits?: RuntimeLimitConfig;
  publicIngress?: PublicIngressConfig;
  requestClock?: () => number;
  readinessTimeoutMs?: number;
  staticRoot?: string;
}

type StoredIncident =
  | {
      status: 'processing';
      contextStage: IncidentContextStage;
      suspiciousChangeStage: SuspiciousChangeDetectionStage;
      hypothesisScoringStage: HypothesisScoringStage;
      remediationStage: RemediationPlanningStage;
      eventTrail: InvestigationEventTrail;
    }
  | {
      status: 'completed';
      contextStage: IncidentContextStage;
      suspiciousChangeStage: SuspiciousChangeDetectionStage;
      hypothesisScoringStage: HypothesisScoringStage;
      remediationStage: RemediationPlanningStage;
      report: InvestigationReport;
      execution: InvestigationExecutionMetadata;
      eventTrail: InvestigationEventTrail;
    }
  | {
      status: 'execution-failed';
      execution: InvestigationExecutionMetadata;
      error: {
        code: 'INVESTIGATION_LIMIT_REACHED' | 'METADATA_TIMEOUT';
        message: string;
      };
      eventTrail: InvestigationEventTrail;
    }
  | { status: 'degraded'; response: InvestigationDegradedResponse }
  | { status: 'failed' };

function publicIncidentResponse(
  incidentId: string,
  incident: StoredIncident,
): IncidentRetrievalResponse | undefined {
  if (incident.status === 'failed') {
    return undefined;
  }
  if (incident.status === 'degraded') {
    return IncidentRetrievalResponseSchema.parse(incident.response);
  }
  if (incident.status === 'execution-failed') {
    return IncidentRetrievalResponseSchema.parse({
      incidentId,
      status: 'failed',
      execution: incident.execution,
      eventTrail: incident.eventTrail,
      error: incident.error,
    });
  }
  return IncidentRetrievalResponseSchema.parse(
    incident.status === 'completed'
      ? {
          incidentId,
          status: 'completed',
          contextStage: incident.contextStage,
          suspiciousChangeStage: incident.suspiciousChangeStage,
          hypothesisScoringStage: incident.hypothesisScoringStage,
          remediationStage: incident.remediationStage,
          execution: incident.execution,
          eventTrail: incident.eventTrail,
          report: incident.report,
        }
      : {
          incidentId,
          status: 'processing',
          contextStage: incident.contextStage,
          suspiciousChangeStage: incident.suspiciousChangeStage,
          hypothesisScoringStage: incident.hypothesisScoringStage,
          remediationStage: incident.remediationStage,
          eventTrail: incident.eventTrail,
        },
  );
}

type ObservableInvestigationEventAction = Exclude<
  InvestigationEventActionType,
  'warning_raised' | 'investigation_terminated'
>;

type InvestigationEventDraft =
  | {
      actionType: ObservableInvestigationEventAction;
      summary: string;
      evidenceIds?: string[];
    }
  | {
      actionType: 'warning_raised';
      warningCode: InvestigationWarning['code'];
      summary: string;
    }
  | {
      actionType: 'investigation_terminated';
      terminationReason: InvestigationTerminationReason;
      durationMs: number;
      summary: string;
    };

const metadataOperationEventActions: Record<
  MetadataInvestigationOperation,
  ObservableInvestigationEventAction
> = {
  metadata_health: 'metadata_health_checked',
  entity_search: 'entity_search_completed',
  lineage: 'lineage_retrieved',
  recent_changes: 'recent_changes_retrieved',
};

class InvestigationEventRecorder {
  private readonly events: InvestigationEventTrail[number][] = [];
  private lastTimestampMs = Number.NEGATIVE_INFINITY;

  constructor(private readonly clock: () => number = Date.now) {}

  private timestamp() {
    const observedTimestamp = this.clock();
    if (!Number.isFinite(observedTimestamp)) {
      throw new Error('The investigation event clock returned an invalid timestamp.');
    }
    this.lastTimestampMs = Math.max(this.lastTimestampMs, Math.floor(observedTimestamp));
    return new Date(this.lastTimestampMs).toISOString();
  }

  private append(event: InvestigationEventDraft) {
    if (this.events.at(-1)?.actionType === 'investigation_terminated') {
      throw new Error('An investigation event cannot be recorded after termination.');
    }
    const sequence = this.events.length + 1;
    this.events.push(
      InvestigationEventSchema.parse({
        id: `event-${String(sequence).padStart(4, '0')}`,
        sequence,
        timestamp: this.timestamp(),
        ...event,
      }),
    );
  }

  recordAction(actionType: ObservableInvestigationEventAction, evidenceIds?: string[]) {
    this.append({
      actionType,
      summary: INVESTIGATION_EVENT_ACTION_SUMMARIES[actionType],
      ...(evidenceIds ? { evidenceIds } : {}),
    });
  }

  recordWarning(warning: InvestigationWarning) {
    if (
      this.events.some(
        (event) => event.actionType === 'warning_raised' && event.warningCode === warning.code,
      )
    ) {
      return;
    }
    this.append({
      actionType: 'warning_raised',
      warningCode: warning.code,
      summary: warning.message,
    });
  }

  recordReportFlow(
    report: InvestigationReport,
    scoring: HypothesisScoringStage,
    remediation: RemediationPlanningStage,
  ) {
    const evidenceIds = report.evidence.map((evidence) => evidence.id);
    this.recordAction('evidence_collected', evidenceIds);
    if (scoring.status === 'completed') {
      this.recordAction('hypotheses_produced', [
        ...new Set(scoring.hypotheses.flatMap((hypothesis) => hypothesis.evidenceIds)),
      ]);
    }
    if (remediation.status === 'completed' && remediation.recommendations.length > 0) {
      this.recordAction('recommendations_produced');
    }
    this.recordAction('report_produced');
  }

  terminate(execution: InvestigationExecutionMetadata) {
    this.append({
      actionType: 'investigation_terminated',
      terminationReason: execution.terminationReason,
      durationMs: execution.durationMs,
      summary:
        execution.terminationReason === 'completed'
          ? INVESTIGATION_COMPLETED_EVENT_SUMMARY
          : INVESTIGATION_TERMINATION_MESSAGES[execution.terminationReason],
    });
  }

  snapshot() {
    return InvestigationEventTrailSchema.parse(this.events);
  }
}

class InvestigationProviderTimeoutError extends Error {
  readonly reason = 'provider_timeout' as const;

  constructor(readonly execution: InvestigationExecutionMetadata) {
    super(INVESTIGATION_TERMINATION_MESSAGES.provider_timeout);
    this.name = 'InvestigationProviderTimeoutError';
  }
}

const fixtureProcessingDelayMs = 250;

export class RuntimeConfigurationError extends Error {
  constructor(variableName: string, detail = 'must use a supported integer value') {
    super(`Invalid runtime configuration: ${variableName} ${detail}.`);
    this.name = 'RuntimeConfigurationError';
  }
}

function configuredInteger(environment: NodeJS.ProcessEnv, variableName: string) {
  const rawValue = environment[variableName]?.trim();
  if (!rawValue) {
    return undefined;
  }
  if (!/^\d+$/.test(rawValue)) {
    throw new RuntimeConfigurationError(variableName);
  }
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value)) {
    throw new RuntimeConfigurationError(variableName);
  }
  return value;
}

function legacyCompatibleInteger(
  environment: NodeJS.ProcessEnv,
  canonicalName: string,
  legacyName: string,
  fallback: number,
) {
  const canonicalValue = configuredInteger(environment, canonicalName);
  const legacyValue = configuredInteger(environment, legacyName);
  if (canonicalValue !== undefined && legacyValue !== undefined) {
    throw new RuntimeConfigurationError(
      canonicalName,
      `cannot be combined with legacy ${legacyName}`,
    );
  }
  return canonicalValue ?? legacyValue ?? fallback;
}

export function readRuntimeLimitConfig(environment: NodeJS.ProcessEnv): RuntimeLimitConfig {
  const timeoutSeconds = configuredInteger(environment, 'AGENT_TIMEOUT_SECONDS');
  const timeoutMilliseconds = configuredInteger(environment, 'INVESTIGATION_TIMEOUT_MS');
  if (timeoutSeconds !== undefined && timeoutMilliseconds !== undefined) {
    throw new RuntimeConfigurationError(
      'AGENT_TIMEOUT_SECONDS',
      'cannot be combined with legacy INVESTIGATION_TIMEOUT_MS',
    );
  }
  const requestedConfig = {
    maxAgentSteps:
      configuredInteger(environment, 'MAX_AGENT_STEPS') ??
      DEFAULT_RUNTIME_LIMIT_CONFIG.maxAgentSteps,
    maxToolCalls:
      configuredInteger(environment, 'MAX_TOOL_CALLS') ?? DEFAULT_RUNTIME_LIMIT_CONFIG.maxToolCalls,
    maxLineageDepth:
      configuredInteger(environment, 'MAX_LINEAGE_DEPTH') ??
      DEFAULT_RUNTIME_LIMIT_CONFIG.maxLineageDepth,
    maxEntitiesPerQuery: legacyCompatibleInteger(
      environment,
      'MAX_ENTITIES_PER_QUERY',
      'MAX_LINEAGE_ENTITIES',
      DEFAULT_RUNTIME_LIMIT_CONFIG.maxEntitiesPerQuery,
    ),
    maxRetries:
      configuredInteger(environment, 'MAX_RETRIES') ?? DEFAULT_RUNTIME_LIMIT_CONFIG.maxRetries,
    agentTimeoutMs:
      timeoutSeconds !== undefined
        ? timeoutSeconds * 1_000
        : (timeoutMilliseconds ?? DEFAULT_RUNTIME_LIMIT_CONFIG.agentTimeoutMs),
    maxModelOutputBytes:
      configuredInteger(environment, 'MAX_MODEL_OUTPUT_BYTES') ??
      DEFAULT_RUNTIME_LIMIT_CONFIG.maxModelOutputBytes,
  };
  const parsedConfig = RuntimeLimitConfigSchema.safeParse(requestedConfig);
  if (!parsedConfig.success) {
    const internalName = String(parsedConfig.error.issues[0]?.path[0] ?? 'runtime limits');
    const environmentNames: Record<string, string> = {
      maxAgentSteps: 'MAX_AGENT_STEPS',
      maxToolCalls: 'MAX_TOOL_CALLS',
      maxLineageDepth: 'MAX_LINEAGE_DEPTH',
      maxEntitiesPerQuery: 'MAX_ENTITIES_PER_QUERY',
      maxRetries: 'MAX_RETRIES',
      agentTimeoutMs:
        timeoutMilliseconds === undefined ? 'AGENT_TIMEOUT_SECONDS' : 'INVESTIGATION_TIMEOUT_MS',
      maxModelOutputBytes: 'MAX_MODEL_OUTPUT_BYTES',
    };
    throw new RuntimeConfigurationError(environmentNames[internalName] ?? 'runtime limits');
  }
  return parsedConfig.data;
}

export function readPublicIngressConfig(environment: NodeJS.ProcessEnv): PublicIngressConfig {
  const rateLimitWindowSeconds = configuredInteger(environment, 'RATE_LIMIT_WINDOW_SECONDS');
  const requestedConfig = {
    maxBodyBytes:
      configuredInteger(environment, 'MAX_REQUEST_BODY_BYTES') ??
      DEFAULT_PUBLIC_INGRESS_CONFIG.maxBodyBytes,
    rateLimitWindowMs:
      rateLimitWindowSeconds === undefined
        ? DEFAULT_PUBLIC_INGRESS_CONFIG.rateLimitWindowMs
        : rateLimitWindowSeconds * 1_000,
    rateLimitMaxRequests:
      configuredInteger(environment, 'RATE_LIMIT_MAX_REQUESTS') ??
      DEFAULT_PUBLIC_INGRESS_CONFIG.rateLimitMaxRequests,
  };
  const parsedConfig = PublicIngressConfigSchema.safeParse(requestedConfig);
  if (!parsedConfig.success) {
    const internalName = String(parsedConfig.error.issues[0]?.path[0] ?? 'public ingress');
    const environmentNames: Record<string, string> = {
      maxBodyBytes: 'MAX_REQUEST_BODY_BYTES',
      rateLimitWindowMs: 'RATE_LIMIT_WINDOW_SECONDS',
      rateLimitMaxRequests: 'RATE_LIMIT_MAX_REQUESTS',
    };
    throw new RuntimeConfigurationError(environmentNames[internalName] ?? 'public ingress');
  }
  return parsedConfig.data;
}

function safeValidationIssues(issues: ReadonlyArray<{ path: PropertyKey[] }>) {
  return issues.slice(0, 20).map((issue) => ({
    path: issue.path.map(String).join('.') || 'request',
    message: 'Invalid value.',
  }));
}

function metadataMode(value: string | undefined): MetadataSourceMode {
  if (!value?.trim()) {
    return 'fixture';
  }
  const parsedMode = MetadataSourceModeSchema.safeParse(value);
  if (!parsedMode.success) {
    throw new RuntimeConfigurationError('APP_MODE', 'must select fixture, datahub, or datahub-mcp');
  }
  return parsedMode.data;
}

function unavailableMetadataHealth(mode: MetadataSourceMode): MetadataHealthResponse {
  return MetadataHealthResponseSchema.parse({
    mode,
    status: 'unavailable',
    message:
      mode === 'datahub'
        ? 'DataHub metadata is unavailable. Check the service and network connection.'
        : mode === 'datahub-mcp'
          ? 'DataHub MCP Server is unavailable. Check the service and network connection.'
          : 'Fixture metadata is unavailable. Restart the application and try again.',
  });
}

const defaultReadinessTimeoutMs = 2_000;
const minimumReadinessTimeoutMs = 10;
const maximumReadinessTimeoutMs = 10_000;

const dataHubReadinessReasons = {
  unconfigured: 'DATAHUB_CONFIG_MISSING',
  unauthorized: 'DATAHUB_UNAUTHORIZED',
  unavailable: 'DATAHUB_UNAVAILABLE',
  timeout: 'DATAHUB_TIMEOUT',
  invalid_response: 'DATAHUB_INVALID_RESPONSE',
} as const satisfies Record<Exclude<MetadataHealthStatus, 'ready'>, ReadinessReasonCode>;

const dataHubMcpReadinessReasons = {
  unconfigured: 'DATAHUB_MCP_CONFIG_MISSING',
  unauthorized: 'DATAHUB_MCP_UNAUTHORIZED',
  unavailable: 'DATAHUB_MCP_UNAVAILABLE',
  timeout: 'DATAHUB_MCP_TIMEOUT',
  invalid_response: 'DATAHUB_MCP_INVALID_RESPONSE',
} as const satisfies Record<Exclude<MetadataHealthStatus, 'ready'>, ReadinessReasonCode>;

const modelReadinessReasons = {
  unconfigured: 'MODEL_CONFIG_MISSING',
  unauthorized: 'MODEL_UNAUTHORIZED',
  unavailable: 'MODEL_UNAVAILABLE',
  timeout: 'MODEL_TIMEOUT',
  invalid_response: 'MODEL_INVALID_RESPONSE',
} as const satisfies Record<Exclude<MetadataHealthStatus, 'ready'>, ReadinessReasonCode>;

function boundedReadinessTimeout(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return defaultReadinessTimeoutMs;
  }
  return Math.min(
    maximumReadinessTimeoutMs,
    Math.max(minimumReadinessTimeoutMs, Math.floor(value)),
  );
}

async function probeHealthStatus(
  provider: MetadataHealthProvider,
  timeoutMs: number,
): Promise<MetadataHealthStatus> {
  const controller = new AbortController();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (status: MetadataHealthStatus) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(status);
    };

    const timeout = setTimeout(() => {
      controller.abort();
      finish('timeout');
    }, timeoutMs);

    void Promise.resolve()
      .then(() => provider.healthCheck({ signal: controller.signal }))
      .then(
        (result) => {
          const parsedStatus = MetadataHealthStatusSchema.safeParse(result.status);
          finish(parsedStatus.success ? parsedStatus.data : 'invalid_response');
        },
        () => finish('unavailable'),
      );
  });
}

function dependencyReadinessCheck(
  name: 'datahub' | 'datahub_mcp' | 'model',
  status: MetadataHealthStatus,
): ReadinessCheck {
  if (status === 'ready') {
    return { name, status: 'ready' };
  }
  return {
    name,
    status: 'not_ready',
    reasonCode:
      name === 'datahub'
        ? dataHubReadinessReasons[status]
        : name === 'datahub_mcp'
          ? dataHubMcpReadinessReasons[status]
          : modelReadinessReasons[status],
  };
}

function readinessResponse(mode: MetadataSourceMode, checks: ReadinessCheck[]): ReadinessResponse {
  return ReadinessResponseSchema.parse({
    status: checks.some((check) => check.status === 'not_ready') ? 'not_ready' : 'ready',
    mode,
    checks,
  });
}

const metadataSearchFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    httpStatus: 503,
    message: 'Metadata search is not configured. Check the metadata source settings.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    httpStatus: 502,
    message: 'Metadata search authorization failed. Check the configured access token.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    httpStatus: 503,
    message: 'Metadata search is unavailable. Check the service and network connection.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    httpStatus: 504,
    message: 'Metadata search timed out. Try again shortly.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    httpStatus: 502,
    message: 'Metadata search returned an unexpected response.',
  },
  not_found: {
    code: 'NOT_FOUND',
    httpStatus: 404,
    message: 'The requested metadata entity was not found.',
  },
} as const;

const metadataLineageFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    httpStatus: 503,
    message: 'Metadata lineage is not configured. Check the metadata source settings.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    httpStatus: 502,
    message: 'Metadata lineage authorization failed. Check the configured access token.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    httpStatus: 503,
    message: 'Metadata lineage is unavailable. Check the service and network connection.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    httpStatus: 504,
    message: 'Metadata lineage timed out. Try again shortly.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    httpStatus: 502,
    message: 'Metadata lineage returned an unexpected response.',
  },
  not_found: {
    code: 'NOT_FOUND',
    httpStatus: 404,
    message: 'The requested metadata entity was not found.',
  },
} as const;

const metadataRecentChangesFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    httpStatus: 503,
    message: 'Metadata recent changes are not configured. Check the metadata source settings.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    httpStatus: 502,
    message: 'Metadata recent-changes authorization failed. Check the configured access token.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    httpStatus: 503,
    message: 'Metadata recent changes are unavailable. Check the service and network connection.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    httpStatus: 504,
    message: 'Metadata recent changes timed out. Try again shortly.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    httpStatus: 502,
    message: 'Metadata recent changes returned an unexpected response.',
  },
  not_found: {
    code: 'NOT_FOUND',
    httpStatus: 404,
    message: 'The requested metadata entity was not found.',
  },
} as const;

const incidentContextFailures = {
  unconfigured: {
    code: 'METADATA_UNCONFIGURED',
    message: 'Incident context metadata is not configured.',
  },
  unauthorized: {
    code: 'METADATA_UNAUTHORIZED',
    message: 'Incident context metadata authorization failed.',
  },
  unavailable: {
    code: 'METADATA_UNAVAILABLE',
    message: 'Incident context metadata is unavailable.',
  },
  timeout: {
    code: 'METADATA_TIMEOUT',
    message: 'Incident context gathering timed out.',
  },
  invalid_response: {
    code: 'METADATA_INVALID_RESPONSE',
    message: 'Incident context metadata returned an unexpected response.',
  },
  not_found: {
    code: 'METADATA_INVALID_RESPONSE',
    message: 'An incident context entity could not be resolved.',
  },
} as const;

function failedIncidentContext(error: unknown): IncidentContextStage {
  if (error instanceof MetadataProviderError) {
    const failure = incidentContextFailures[error.status];
    return IncidentContextStageSchema.parse({
      status: 'failed',
      error: failure,
    });
  }

  return IncidentContextStageSchema.parse({
    status: 'failed',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Incident context could not be gathered.',
    },
  });
}

function unavailableSuspiciousChanges(
  code: 'CONTEXT_UNAVAILABLE' | 'DETECTION_INVALID',
): SuspiciousChangeDetectionStage {
  return SuspiciousChangeDetectionStageSchema.parse({
    status: 'unavailable',
    error: {
      code,
      message:
        code === 'CONTEXT_UNAVAILABLE'
          ? 'Suspicious-change detection is unavailable because incident context did not complete.'
          : 'Suspicious-change detection could not validate the gathered context.',
    },
  });
}

function unavailableHypothesisScoring(
  code: 'CONTEXT_UNAVAILABLE' | 'SUSPICIOUS_CHANGES_UNAVAILABLE' | 'SCORING_INVALID',
): HypothesisScoringStage {
  const messages = {
    CONTEXT_UNAVAILABLE:
      'Hypothesis scoring is unavailable because incident context did not complete.',
    SUSPICIOUS_CHANGES_UNAVAILABLE:
      'Hypothesis scoring is unavailable because suspicious-change detection did not complete.',
    SCORING_INVALID: 'Hypothesis scoring could not validate the factual evidence mapping.',
  } as const;
  return HypothesisScoringStageSchema.parse({
    status: 'unavailable',
    error: { code, message: messages[code] },
  });
}

function invalidRemediationPlanning(): RemediationPlanningStage {
  return RemediationPlanningStageSchema.parse({
    status: 'unavailable',
    recommendations: [],
    missingInformation: [
      {
        code: 'report_evidence_incomplete',
        message: 'Validated factual references are incomplete for remediation planning.',
      },
    ],
    nextSteps: [
      {
        id: 'inspect_scored_evidence',
        kind: 'safe_diagnostic',
        status: 'not_executed',
        description: REMEDIATION_FALLBACK_STEP_TEXT.inspect_scored_evidence,
      },
      {
        id: 'continue_fixture_mode',
        kind: 'fixture_continuation',
        status: 'not_executed',
        description: REMEDIATION_FALLBACK_STEP_TEXT.continue_fixture_mode,
      },
    ],
    error: {
      code: 'PLANNING_INVALID',
      message: 'Remediation planning could not validate the factual recommendation references.',
    },
  });
}

function finalizeUnscoredReport(
  report: InvestigationDraftReport,
  reasonCode: 'insufficient_evidence' | 'scoring_unavailable',
  blastRadius: BlastRadiusAnalysis,
): InvestigationReport {
  return InvestigationReportSchema.parse({
    ...report,
    hypotheses: report.hypotheses.map((hypothesis) => ({
      ...hypothesis,
      confidence: {
        status: 'not_scored',
        reasonCode,
        explanation: UNSCORED_CONFIDENCE_EXPLANATIONS[reasonCode],
      },
    })),
    blastRadius,
  });
}

function unavailableBlastRadius(runtimeLimits: RuntimeLimitConfig): BlastRadiusAnalysis {
  return BlastRadiusAnalysisSchema.parse({
    analysisVersion: BLAST_RADIUS_ANALYSIS_VERSION,
    status: 'unavailable',
    explanation: BLAST_RADIUS_STATUS_EXPLANATIONS.unavailable,
    impacts: [],
    summary: { total: 0, datasets: 0, pipelines: 0, dashboards: 0 },
    coverage: {
      reasonCodes: ['tool_failure'],
      rootsConsidered: 0,
      rootsAnalyzed: 0,
      visitedEntities: 0,
      truncatedGraphs: 0,
      appliedLimits: {
        maxDepth: runtimeLimits.maxLineageDepth,
        maxEntities: Math.min(runtimeLimits.maxEntitiesPerQuery, METADATA_LINEAGE_MAX_NODES),
        maxRootEntities: BLAST_RADIUS_MAX_ROOT_ENTITIES,
      },
    },
  });
}

function unavailableRemediationPlanning(
  code: 'CONTEXT_UNAVAILABLE' | 'SCORING_UNAVAILABLE',
): RemediationPlanningStage {
  return RemediationPlanningStageSchema.parse({
    status: 'unavailable',
    recommendations: [],
    missingInformation: [
      {
        code: 'scoring_unavailable',
        message: 'Validated scored hypotheses are unavailable for safe remediation planning.',
      },
    ],
    nextSteps: [
      {
        id: 'review_provider_availability',
        kind: 'safe_diagnostic',
        status: 'not_executed',
        description: REMEDIATION_FALLBACK_STEP_TEXT.review_provider_availability,
      },
      {
        id: 'continue_fixture_mode',
        kind: 'fixture_continuation',
        status: 'not_executed',
        description: REMEDIATION_FALLBACK_STEP_TEXT.continue_fixture_mode,
      },
    ],
    error: {
      code,
      message:
        code === 'CONTEXT_UNAVAILABLE'
          ? 'Remediation planning is unavailable because incident context did not complete.'
          : 'Remediation planning is unavailable because scored hypotheses did not complete.',
    },
  });
}

function investigationWarning(code: InvestigationWarning['code']): InvestigationWarning {
  return {
    code,
    message: INVESTIGATION_WARNING_MESSAGES[code],
  };
}

function investigationNextStep(id: InvestigationNextStep['id']): InvestigationNextStep {
  return {
    id,
    kind:
      id === 'continue_fixture_mode'
        ? 'fixture_continuation'
        : id === 'provide_entity_candidate' || id === 'add_incident_context'
          ? 'user_input'
          : 'safe_diagnostic',
    status: 'not_executed',
    description: INVESTIGATION_NEXT_STEP_TEXT[id],
  };
}

function hasPreservedContextEvidence(contextStage: IncidentContextStage) {
  return (
    (contextStage.status === 'completed' || contextStage.status === 'degraded') &&
    (contextStage.facts.candidateEntities.length > 0 ||
      Boolean(contextStage.facts.lineage) ||
      contextStage.facts.recentChanges.length > 0)
  );
}

export function buildServer(options: BuildServerOptions = {}) {
  const environment = options.environment ?? process.env;
  const runtimeLimits = RuntimeLimitConfigSchema.parse(
    options.runtimeLimits ?? readRuntimeLimitConfig(environment),
  );
  const publicIngress = PublicIngressConfigSchema.parse(
    options.publicIngress ?? readPublicIngressConfig(environment),
  );
  const server = Fastify({
    bodyLimit: publicIngress.maxBodyBytes,
    logger: options.logger ?? true,
    requestTimeout: runtimeLimits.agentTimeoutMs,
    rewriteUrl: (request) => {
      const url = request.url ?? '/';
      return url === '/api' ? '/' : url.startsWith('/api/') ? url.slice(4) : url;
    },
  });
  if (options.staticRoot) {
    void server.register(fastifyStatic, {
      root: options.staticRoot,
    });
  }
  const requestClock = options.requestClock ?? (() => Date.now());
  const readinessTimeoutMs = boundedReadinessTimeout(options.readinessTimeoutMs);
  const protectedPostRoutes = new Set([
    '/metadata/search',
    '/metadata/lineage',
    '/metadata/recent-changes',
    '/incidents',
  ]);
  let rateLimitWindowStartedAt: number | undefined;
  let rateLimitRequestCount = 0;

  server.addHook('onRequest', async (request, reply) => {
    if (
      request.method !== 'POST' ||
      !protectedPostRoutes.has(request.routeOptions.url ?? request.url)
    ) {
      return;
    }

    const now = requestClock();
    if (!Number.isFinite(now)) {
      throw new Error('The request clock returned an invalid value.');
    }
    const currentTime = Math.max(0, Math.floor(now));
    if (
      rateLimitWindowStartedAt === undefined ||
      currentTime < rateLimitWindowStartedAt ||
      currentTime - rateLimitWindowStartedAt >= publicIngress.rateLimitWindowMs
    ) {
      rateLimitWindowStartedAt = currentTime;
      rateLimitRequestCount = 0;
    }

    if (rateLimitRequestCount >= publicIngress.rateLimitMaxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (rateLimitWindowStartedAt + publicIngress.rateLimitWindowMs - currentTime) / 1_000,
        ),
      );
      server.log.warn(
        {
          method: request.method,
          route: request.routeOptions.url,
          retryAfterSeconds,
        },
        'Public POST rate limit exceeded',
      );
      return reply
        .header('Retry-After', String(retryAfterSeconds))
        .code(429)
        .send(
          ApiErrorSchema.parse({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Retry after the indicated delay.',
            },
          }),
        );
    }

    rateLimitRequestCount += 1;
  });

  server.setErrorHandler((error, request, reply) => {
    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : undefined;
    if (errorCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      server.log.warn(
        { method: request.method, route: request.routeOptions.url },
        'Request body limit exceeded',
      );
      return reply.code(413).send(
        ApiErrorSchema.parse({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'The request body exceeds the allowed size.',
          },
        }),
      );
    }

    if (
      errorCode === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
      errorCode === 'FST_ERR_CTP_INVALID_CONTENT_LENGTH'
    ) {
      server.log.warn(
        { method: request.method, route: request.routeOptions.url },
        'Invalid JSON request body',
      );
      return reply.code(400).send(
        ApiErrorSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The JSON request body is invalid.',
          },
        }),
      );
    }

    server.log.error(
      {
        method: request.method,
        route: request.routeOptions.url ?? 'unmatched',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorCode: errorCode ?? 'UNEXPECTED_ERROR',
      },
      'API request failed',
    );
    return reply.code(500).send(
      ApiErrorSchema.parse({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'The request could not be completed.',
        },
      }),
    );
  });
  const mode = options.mode ?? metadataMode(environment.APP_MODE);
  let metadata = options.metadata;
  if (!metadata) {
    if (mode === 'datahub-mcp') {
      try {
        metadata = createDataHubMcpMetadataAdapter(dataHubMcpConfigFromEnvironment(environment));
      } catch (error) {
        if (error instanceof DataHubMcpConfigurationError) {
          throw new RuntimeConfigurationError(
            error.variableName,
            'must use a supported DataHub MCP value',
          );
        }
        throw error;
      }
    } else {
      metadata = createFixtureMetadataAdapter();
    }
  }
  const adapterBackedProvider = mode === 'fixture' || mode === 'datahub-mcp';
  const metadataHealth =
    options.metadataHealth ??
    (adapterBackedProvider
      ? metadata
      : createDataHubHealthClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const modelHealth = options.modelHealth;
  const metadataSearch =
    options.metadataSearch ??
    (adapterBackedProvider
      ? metadata
      : createDataHubSearchClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataLineage =
    options.metadataLineage ??
    (adapterBackedProvider
      ? metadata
      : createDataHubLineageClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataRecentChanges =
    options.metadataRecentChanges ??
    (adapterBackedProvider
      ? metadata
      : createDataHubRecentChangesClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const contextGatherer = options.contextGatherer ?? new DeterministicIncidentContextGatherer();
  const contextLimits =
    options.contextLimits ??
    Object.freeze({
      ...DEFAULT_INCIDENT_CONTEXT_LIMITS,
      candidateEntityCount: Math.min(
        runtimeLimits.maxEntitiesPerQuery,
        INCIDENT_CONTEXT_MAX_CANDIDATES,
      ),
      lineageDepth: runtimeLimits.maxLineageDepth,
      lineageEntityCount: Math.min(runtimeLimits.maxEntitiesPerQuery, METADATA_LINEAGE_MAX_NODES),
      toolCalls: Math.max(4, runtimeLimits.maxToolCalls),
      timeoutMs: runtimeLimits.agentTimeoutMs,
    });
  const suspiciousChangeDetector =
    options.suspiciousChangeDetector ?? new DeterministicSuspiciousChangeDetector();
  const hypothesisScorer = options.hypothesisScorer ?? new DeterministicHypothesisScorer();
  const blastRadiusAnalyzer = options.blastRadiusAnalyzer ?? new DeterministicBlastRadiusAnalyzer();
  const remediationPlanner = options.remediationPlanner ?? new DeterministicRemediationPlanner();
  const contextMetadata = {
    healthCheck: metadataHealth.healthCheck.bind(metadataHealth),
    searchEntities: metadataSearch.searchEntities.bind(metadataSearch),
    getLineageGraph: metadataLineage.getLineageGraph.bind(metadataLineage),
    getRecentChangesForEntity:
      metadataRecentChanges.getRecentChangesForEntity.bind(metadataRecentChanges),
  };
  const runner = options.runner ?? new DeterministicInvestigationRunner();
  const limits =
    options.limits ??
    Object.freeze({
      ...FIXTURE_INVESTIGATION_LIMITS,
      lineageDepth: runtimeLimits.maxLineageDepth,
      entityCount: Math.min(runtimeLimits.maxEntitiesPerQuery, METADATA_ENTITY_SEARCH_MAX_LIMIT),
      toolCalls: Math.max(4, runtimeLimits.maxToolCalls),
      timeoutMs: runtimeLimits.agentTimeoutMs,
    });
  const incidents = new Map<string, StoredIncident>();

  server.get('/health', async (_request, reply) =>
    reply.code(200).send(HealthResponseSchema.parse({ status: 'ok' })),
  );

  server.get('/ready', async (_request, reply) => {
    let response: ReadinessResponse;

    if (mode === 'fixture') {
      const fixtureStatus = await probeHealthStatus(metadataHealth, readinessTimeoutMs);
      response = readinessResponse('fixture', [
        fixtureStatus === 'ready'
          ? { name: 'fixture_assets', status: 'ready' }
          : {
              name: 'fixture_assets',
              status: 'not_ready',
              reasonCode: 'FIXTURE_ASSETS_INVALID',
            },
      ]);
    } else if (mode === 'datahub-mcp') {
      const dataHubMcpStatus = await probeHealthStatus(metadataHealth, readinessTimeoutMs);
      const modelCheck: ReadinessCheck = modelHealth
        ? dependencyReadinessCheck(
            'model',
            await probeHealthStatus(modelHealth, readinessTimeoutMs),
          )
        : { name: 'model', status: 'not_required', reasonCode: 'MODEL_NOT_REQUIRED' };
      response = readinessResponse('datahub-mcp', [
        dependencyReadinessCheck('datahub_mcp', dataHubMcpStatus),
        modelCheck,
      ]);
    } else {
      const dataHubStatusPromise = probeHealthStatus(metadataHealth, readinessTimeoutMs);
      const investigationRuntimeStatusPromise = probeHealthStatus(metadata, readinessTimeoutMs);
      const modelStatusPromise = modelHealth
        ? probeHealthStatus(modelHealth, readinessTimeoutMs)
        : undefined;
      const [dataHubStatus, investigationRuntimeStatus] = await Promise.all([
        dataHubStatusPromise,
        investigationRuntimeStatusPromise,
      ]);
      const investigationRuntimeCheck: ReadinessCheck =
        investigationRuntimeStatus === 'ready'
          ? { name: 'investigation_runtime', status: 'ready' }
          : {
              name: 'investigation_runtime',
              status: 'not_ready',
              reasonCode: 'INVESTIGATION_RUNTIME_INVALID',
            };
      const modelCheck: ReadinessCheck = modelStatusPromise
        ? dependencyReadinessCheck('model', await modelStatusPromise)
        : { name: 'model', status: 'not_required', reasonCode: 'MODEL_NOT_REQUIRED' };
      response = readinessResponse('datahub', [
        dependencyReadinessCheck('datahub', dataHubStatus),
        investigationRuntimeCheck,
        modelCheck,
      ]);
    }

    if (response.status === 'not_ready') {
      server.log.warn(
        {
          mode: response.mode,
          reasonCodes: response.checks.flatMap((check) =>
            check.reasonCode === undefined ? [] : [check.reasonCode],
          ),
        },
        'Service is not ready',
      );
    }

    return reply.code(response.status === 'ready' ? 200 : 503).send(response);
  });

  server.get('/metadata/health', async (_request, reply) => {
    let response: MetadataHealthResponse;

    try {
      const providerHealth = await metadataHealth.healthCheck();
      response = MetadataHealthResponseSchema.parse({ mode, ...providerHealth });
    } catch {
      response = unavailableMetadataHealth(mode);
    }

    if (response.status !== 'ready') {
      server.log.warn(
        { mode: response.mode, status: response.status },
        'Metadata source is not ready',
      );
    }

    return reply.code(200).send(response);
  });

  server.post('/metadata/search', async (request, reply) => {
    const parsedRequest = MetadataEntitySearchRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.code(400).send(
        ApiErrorSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The metadata search request is invalid.',
            issues: safeValidationIssues(parsedRequest.error.issues),
          },
        }),
      );
    }

    try {
      const results = await metadataSearch.searchEntities(parsedRequest.data);
      const parsedResponse = MetadataEntitySearchResponseSchema.safeParse({
        ...parsedRequest.data,
        results,
      });
      if (!parsedResponse.success) {
        throw new MetadataProviderError('invalid_response');
      }

      server.log.info(
        {
          mode,
          resultCount: parsedResponse.data.results.length,
          entityType: parsedResponse.data.entityType ?? 'all',
        },
        'Metadata entity search completed',
      );
      return reply.code(200).send(parsedResponse.data);
    } catch (error) {
      const status = error instanceof MetadataProviderError ? error.status : 'unavailable';
      const failure = metadataSearchFailures[status];
      server.log.warn({ mode, status }, 'Metadata entity search failed');
      return reply.code(failure.httpStatus).send(
        ApiErrorSchema.parse({
          error: {
            code: failure.code,
            message: failure.message,
          },
        }),
      );
    }
  });

  server.post('/metadata/lineage', async (request, reply) => {
    const parsedRequest = MetadataLineageRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.code(400).send(
        ApiErrorSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The metadata lineage request is invalid.',
            issues: safeValidationIssues(parsedRequest.error.issues),
          },
        }),
      );
    }

    try {
      const lineage = await metadataLineage.getLineageGraph(parsedRequest.data);
      const parsedResponse = MetadataLineageResponseSchema.safeParse(lineage);
      if (
        !parsedResponse.success ||
        parsedResponse.data.rootUrn !== parsedRequest.data.rootUrn ||
        parsedResponse.data.direction !== parsedRequest.data.direction ||
        parsedResponse.data.requestedDepth !== parsedRequest.data.depth ||
        parsedResponse.data.maxNodes !== parsedRequest.data.maxNodes
      ) {
        throw new MetadataProviderError('invalid_response');
      }

      server.log.info(
        {
          mode,
          direction: parsedResponse.data.direction,
          visitedNodeCount: parsedResponse.data.visitedNodeCount,
          truncated: parsedResponse.data.truncated,
        },
        'Metadata lineage completed',
      );
      return reply.code(200).send(parsedResponse.data);
    } catch (error) {
      const status = error instanceof MetadataProviderError ? error.status : 'unavailable';
      const failure = metadataLineageFailures[status];
      server.log.warn({ mode, status }, 'Metadata lineage failed');
      return reply.code(failure.httpStatus).send(
        ApiErrorSchema.parse({
          error: {
            code: failure.code,
            message: failure.message,
          },
        }),
      );
    }
  });

  server.post('/metadata/recent-changes', async (request, reply) => {
    const parsedRequest = MetadataRecentChangesRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.code(400).send(
        ApiErrorSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The metadata recent-changes request is invalid.',
            issues: safeValidationIssues(parsedRequest.error.issues),
          },
        }),
      );
    }

    try {
      const recentChanges = await metadataRecentChanges.getRecentChangesForEntity(
        parsedRequest.data,
      );
      const parsedResponse = MetadataRecentChangesResponseSchema.safeParse(recentChanges);
      if (
        !parsedResponse.success ||
        parsedResponse.data.entityUrn !== parsedRequest.data.entityUrn ||
        parsedResponse.data.window.hours !== parsedRequest.data.windowHours ||
        parsedResponse.data.limit !== parsedRequest.data.limit ||
        (parsedRequest.data.endTime &&
          parsedResponse.data.window.endTime !== parsedRequest.data.endTime)
      ) {
        throw new MetadataProviderError('invalid_response');
      }

      server.log.info(
        {
          mode,
          returnedCount: parsedResponse.data.returnedCount,
          truncated: parsedResponse.data.truncated,
          windowHours: parsedResponse.data.window.hours,
        },
        'Metadata recent changes completed',
      );
      return reply.code(200).send(parsedResponse.data);
    } catch (error) {
      const status = error instanceof MetadataProviderError ? error.status : 'unavailable';
      const failure = metadataRecentChangesFailures[status];
      server.log.warn({ mode, status }, 'Metadata recent changes failed');
      return reply.code(failure.httpStatus).send(
        ApiErrorSchema.parse({
          error: {
            code: failure.code,
            message: failure.message,
          },
        }),
      );
    }
  });

  server.post('/incidents', async (request, reply) => {
    const parsedRequest = IncidentRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      const error = ApiErrorSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The incident request is invalid.',
          issues: safeValidationIssues(parsedRequest.error.issues),
        },
      });

      return reply.code(400).send(error);
    }

    const response = IncidentAcceptedResponseSchema.parse({
      incidentId: randomUUID(),
      status: 'processing',
    });
    const eventRecorder = new InvestigationEventRecorder(options.eventClock);
    eventRecorder.recordAction('question_normalized');
    incidents.set(response.incidentId, {
      status: 'processing',
      contextStage: IncidentContextStageSchema.parse({ status: 'gathering' }),
      suspiciousChangeStage: SuspiciousChangeDetectionStageSchema.parse({ status: 'detecting' }),
      hypothesisScoringStage: HypothesisScoringStageSchema.parse({ status: 'scoring' }),
      remediationStage: RemediationPlanningStageSchema.parse({ status: 'planning' }),
      eventTrail: eventRecorder.snapshot(),
    });
    server.log.info({ incidentId: response.incidentId, mode }, 'Investigation accepted');
    const executionBudget = new InvestigationExecutionBudget(runtimeLimits, options.executionClock);

    const updateProcessingEventTrail = () => {
      const storedIncident = incidents.get(response.incidentId);
      if (storedIncident?.status === 'processing') {
        incidents.set(response.incidentId, {
          ...storedIncident,
          eventTrail: eventRecorder.snapshot(),
        });
      }
    };

    const recordCompletedOperation = (operation: MetadataInvestigationOperation) => {
      eventRecorder.recordAction(metadataOperationEventActions[operation]);
      updateProcessingEventTrail();
    };

    const terminationErrorFrom = (error: unknown) => {
      if (
        error instanceof InvestigationLimitError ||
        error instanceof InvestigationProviderTimeoutError
      ) {
        return error;
      }
      if (error instanceof MetadataProviderError && error.status === 'timeout') {
        const execution = executionBudget.snapshot('provider_timeout');
        if (execution.durationMs > executionBudget.limits.agentTimeoutMs) {
          return new InvestigationLimitError('duration_limit_reached', {
            ...execution,
            terminationReason: 'duration_limit_reached',
          });
        }
        return new InvestigationProviderTimeoutError(execution);
      }
      return undefined;
    };

    const storeDegradedIncident = (input: {
      contextStage: InvestigationDegradedResponse['contextStage'];
      suspiciousChangeStage: SuspiciousChangeDetectionStage;
      hypothesisScoringStage: HypothesisScoringStage;
      remediationStage: RemediationPlanningStage;
      execution: InvestigationExecutionMetadata;
      errorCode: InvestigationDegradedResponse['error']['code'];
      failedOperation?: InvestigationOperation;
      warnings: InvestigationWarning[];
      nextSteps: InvestigationNextStep[];
      report?: InvestigationReport;
    }) => {
      if (input.execution.terminationReason === 'completed') {
        throw new Error('A degraded incident cannot use completed execution metadata.');
      }
      if (input.report) {
        eventRecorder.recordReportFlow(
          input.report,
          input.hypothesisScoringStage,
          input.remediationStage,
        );
      }
      input.warnings.forEach((warning) => eventRecorder.recordWarning(warning));
      eventRecorder.terminate(input.execution);
      const degraded = InvestigationDegradedResponseSchema.parse({
        incidentId: response.incidentId,
        status: 'degraded',
        contextStage: input.contextStage,
        suspiciousChangeStage: input.suspiciousChangeStage,
        hypothesisScoringStage: input.hypothesisScoringStage,
        remediationStage: input.remediationStage,
        execution: input.execution,
        eventTrail: eventRecorder.snapshot(),
        error: {
          code: input.errorCode,
          message: INVESTIGATION_TERMINATION_MESSAGES[input.execution.terminationReason],
        },
        ...(input.failedOperation ? { failedOperation: input.failedOperation } : {}),
        warnings: input.warnings,
        nextSteps: input.nextSteps,
        ...(input.report ? { report: input.report } : {}),
      });
      incidents.set(response.incidentId, { status: 'degraded', response: degraded });
      server.log.warn(
        {
          incidentId: response.incidentId,
          mode,
          failedOperation: degraded.failedOperation,
          warningCodes: degraded.warnings.map((warning) => warning.code),
          toolCalls: degraded.execution.toolCalls,
          agentSteps: degraded.execution.agentSteps,
          retries: degraded.execution.retries,
          durationMs: degraded.execution.durationMs,
          lineageEntitiesVisited: degraded.execution.lineageEntitiesVisited,
          terminationReason: degraded.execution.terminationReason,
        },
        'Investigation returned a controlled degraded result',
      );
    };

    const runBackgroundInvestigation = () => {
      void (async () => {
        let contextStage: IncidentContextStage = IncidentContextStageSchema.parse({
          status: 'gathering',
        });
        let suspiciousChangeStage: SuspiciousChangeDetectionStage =
          SuspiciousChangeDetectionStageSchema.parse({ status: 'detecting' });
        let hypothesisScoringStage: HypothesisScoringStage = HypothesisScoringStageSchema.parse({
          status: 'scoring',
        });
        let remediationStage: RemediationPlanningStage = RemediationPlanningStageSchema.parse({
          status: 'planning',
        });
        try {
          try {
            executionBudget.beginAgentStep();
            contextStage = await contextGatherer.gather(parsedRequest.data, {
              metadata: contextMetadata,
              mode,
              limits: contextLimits,
              executionBudget,
              recordCompletedOperation,
            });
            try {
              executionBudget.beginAgentStep();
              suspiciousChangeStage = suspiciousChangeDetector.detect(contextStage);
              eventRecorder.recordAction('suspicious_changes_classified');
              hypothesisScoringStage = HypothesisScoringStageSchema.parse({ status: 'scoring' });
              remediationStage = RemediationPlanningStageSchema.parse({ status: 'planning' });
            } catch (error: unknown) {
              const terminationError = terminationErrorFrom(error);
              if (terminationError) {
                throw terminationError;
              }
              suspiciousChangeStage = unavailableSuspiciousChanges('DETECTION_INVALID');
              hypothesisScoringStage = unavailableHypothesisScoring(
                'SUSPICIOUS_CHANGES_UNAVAILABLE',
              );
              remediationStage = unavailableRemediationPlanning('SCORING_UNAVAILABLE');
            }
            incidents.set(response.incidentId, {
              status: 'processing',
              contextStage,
              suspiciousChangeStage,
              hypothesisScoringStage,
              remediationStage,
              eventTrail: eventRecorder.snapshot(),
            });
            server.log.info(
              {
                incidentId: response.incidentId,
                mode,
                candidateCount: contextStage.facts.candidateEntities.length,
                lineageNodeCount: contextStage.facts.lineage?.nodes.length ?? 0,
                recentChangeCount: contextStage.facts.recentChanges.reduce(
                  (count, recentChanges) => count + recentChanges.returnedCount,
                  0,
                ),
                missingInformationCount: contextStage.missingInformation.length,
                suspiciousChangeStatus: suspiciousChangeStage.status,
                suspiciousChangeCandidateCount:
                  suspiciousChangeStage.status === 'completed'
                    ? suspiciousChangeStage.candidates.length
                    : 0,
              },
              'Incident context gathered and suspicious changes classified',
            );
          } catch (error: unknown) {
            const terminationError = terminationErrorFrom(error);
            if (terminationError) {
              throw terminationError;
            }
            if (error instanceof IncidentContextOperationError) {
              contextStage = error.contextStage;
              suspiciousChangeStage = unavailableSuspiciousChanges('CONTEXT_UNAVAILABLE');
              hypothesisScoringStage = unavailableHypothesisScoring('CONTEXT_UNAVAILABLE');
              remediationStage = unavailableRemediationPlanning('CONTEXT_UNAVAILABLE');
              const contextCode = contextStage.error.code;
              let reason: InvestigationTerminationReason = [
                'METADATA_UNCONFIGURED',
                'METADATA_UNAUTHORIZED',
                'METADATA_UNAVAILABLE',
              ].includes(contextCode)
                ? 'metadata_unavailable'
                : 'tool_failure';
              let execution: InvestigationExecutionMetadata;
              let errorCode: InvestigationDegradedResponse['error']['code'] = contextCode;
              let failedOperation: InvestigationOperation | undefined = error.operation;
              if (contextCode === 'METADATA_TIMEOUT') {
                execution = executionBudget.snapshot('provider_timeout');
                if (execution.durationMs > executionBudget.limits.agentTimeoutMs) {
                  reason = 'duration_limit_reached';
                  execution = { ...execution, terminationReason: reason };
                  errorCode = 'INVESTIGATION_LIMIT_REACHED';
                  failedOperation = undefined;
                } else {
                  reason = 'provider_timeout';
                }
              } else {
                execution = executionBudget.snapshot(reason);
              }
              const warnings = [investigationWarning('external_dependency_failed')];
              const nextSteps = [investigationNextStep('review_provider_availability')];
              if (hasPreservedContextEvidence(contextStage)) {
                warnings.unshift(investigationWarning('partial_evidence'));
                nextSteps.unshift(investigationNextStep('review_partial_evidence'));
              }
              if (mode !== 'fixture') {
                nextSteps.push(investigationNextStep('continue_fixture_mode'));
              }
              storeDegradedIncident({
                contextStage,
                suspiciousChangeStage,
                hypothesisScoringStage,
                remediationStage,
                execution,
                errorCode,
                ...(failedOperation ? { failedOperation } : {}),
                warnings,
                nextSteps,
              });
              return;
            }
            contextStage = failedIncidentContext(error);
            suspiciousChangeStage = unavailableSuspiciousChanges('CONTEXT_UNAVAILABLE');
            hypothesisScoringStage = unavailableHypothesisScoring('CONTEXT_UNAVAILABLE');
            remediationStage = unavailableRemediationPlanning('CONTEXT_UNAVAILABLE');
            incidents.set(response.incidentId, {
              status: 'processing',
              contextStage,
              suspiciousChangeStage,
              hypothesisScoringStage,
              remediationStage,
              eventTrail: eventRecorder.snapshot(),
            });
            server.log.warn(
              {
                incidentId: response.incidentId,
                mode,
                contextErrorCode:
                  contextStage.status === 'failed' ? contextStage.error.code : 'INTERNAL_ERROR',
              },
              'Incident context gathering failed',
            );
          }

          if (contextStage.status !== 'completed') {
            incidents.set(response.incidentId, { status: 'failed' });
            return;
          }

          if (!contextStage.facts.selectedEntity) {
            if (
              suspiciousChangeStage.status !== 'completed' &&
              suspiciousChangeStage.status !== 'insufficient'
            ) {
              throw new Error('A no-match context requires terminal suspicious-change detection.');
            }
            executionBudget.beginAgentStep();
            hypothesisScoringStage = hypothesisScorer.score(
              contextStage,
              suspiciousChangeStage,
              [],
            );
            executionBudget.beginAgentStep();
            remediationStage = remediationPlanner.plan(contextStage, hypothesisScoringStage);
            const nextSteps = [
              investigationNextStep('provide_entity_candidate'),
              investigationNextStep('add_incident_context'),
            ];
            if (mode !== 'fixture') {
              nextSteps.push(investigationNextStep('continue_fixture_mode'));
            }
            storeDegradedIncident({
              contextStage,
              suspiciousChangeStage,
              hypothesisScoringStage,
              remediationStage,
              execution: executionBudget.snapshot('entity_not_found'),
              errorCode: 'ENTITY_NOT_FOUND',
              warnings: [investigationWarning('no_entity_match')],
              nextSteps,
            });
            return;
          }

          let report: InvestigationDraftReport | undefined;
          while (!report) {
            executionBudget.beginAgentStep();
            let rawReport: unknown;
            try {
              rawReport = await runner.investigate(parsedRequest.data, {
                incidentId: response.incidentId,
                metadata,
                limits,
                ...(mode === 'datahub-mcp' ? { mode } : {}),
                executionBudget,
              });
            } catch (error: unknown) {
              if (error instanceof InvestigationModelProviderTimeoutError) {
                const execution = executionBudget.snapshot('model_provider_timeout');
                if (execution.durationMs > executionBudget.limits.agentTimeoutMs) {
                  throw new InvestigationLimitError('duration_limit_reached', {
                    ...execution,
                    terminationReason: 'duration_limit_reached',
                  });
                }
                hypothesisScoringStage = unavailableHypothesisScoring('SCORING_INVALID');
                remediationStage = unavailableRemediationPlanning('SCORING_UNAVAILABLE');
                const nextSteps = [
                  investigationNextStep('review_partial_evidence'),
                  investigationNextStep('review_provider_availability'),
                ];
                if (mode !== 'fixture') {
                  nextSteps.push(investigationNextStep('continue_fixture_mode'));
                }
                storeDegradedIncident({
                  contextStage,
                  suspiciousChangeStage,
                  hypothesisScoringStage,
                  remediationStage,
                  execution,
                  errorCode: 'MODEL_TIMEOUT',
                  failedOperation: 'model_provider',
                  warnings: [
                    investigationWarning('partial_evidence'),
                    investigationWarning('external_dependency_failed'),
                  ],
                  nextSteps,
                });
                return;
              }
              throw error;
            }

            const serializedReport = JSON.stringify(rawReport);
            executionBudget.assertModelOutput(serializedReport);
            const parsedReport = InvestigationDraftReportSchema.safeParse(rawReport);
            if (parsedReport.success) {
              report = parsedReport.data;
              break;
            }
            if (executionBudget.canRetry()) {
              eventRecorder.recordWarning(investigationWarning('structured_output_rejected'));
              updateProcessingEventTrail();
              executionBudget.recordRetry();
              continue;
            }

            hypothesisScoringStage = unavailableHypothesisScoring('SCORING_INVALID');
            remediationStage = unavailableRemediationPlanning('SCORING_UNAVAILABLE');
            const nextSteps = [investigationNextStep('review_partial_evidence')];
            if (mode !== 'fixture') {
              nextSteps.push(investigationNextStep('continue_fixture_mode'));
            }
            storeDegradedIncident({
              contextStage,
              suspiciousChangeStage,
              hypothesisScoringStage,
              remediationStage,
              execution: executionBudget.snapshot('model_output_invalid'),
              errorCode: 'MODEL_OUTPUT_INVALID',
              failedOperation: 'structured_output',
              warnings: [
                investigationWarning('partial_evidence'),
                investigationWarning('structured_output_rejected'),
              ],
              nextSteps,
            });
            return;
          }
          if (!report) {
            throw new Error('Structured report retry loop ended without a validated result.');
          }
          if (
            contextStage.status === 'completed' &&
            (suspiciousChangeStage.status === 'completed' ||
              suspiciousChangeStage.status === 'insufficient')
          ) {
            try {
              executionBudget.beginAgentStep();
              hypothesisScoringStage = hypothesisScorer.score(
                contextStage,
                suspiciousChangeStage,
                report.evidence,
              );
              if (hypothesisScoringStage.status === 'completed') {
                const topHypothesis = hypothesisScoringStage.hypotheses[0];
                if (!topHypothesis) {
                  throw new Error('Completed hypothesis scoring returned no top inference.');
                }
              }
            } catch (error: unknown) {
              const terminationError = terminationErrorFrom(error);
              if (terminationError) {
                throw terminationError;
              }
              hypothesisScoringStage = unavailableHypothesisScoring('SCORING_INVALID');
            }
          }

          let blastRadius: BlastRadiusAnalysis;
          try {
            executionBudget.beginAgentStep();
            blastRadius = await blastRadiusAnalyzer.analyze(
              hypothesisScoringStage,
              report.evidence,
              {
                metadata: metadataLineage,
                maxDepth: runtimeLimits.maxLineageDepth,
                maxEntities: Math.min(
                  runtimeLimits.maxEntitiesPerQuery,
                  METADATA_LINEAGE_MAX_NODES,
                ),
                timeoutMs: runtimeLimits.agentTimeoutMs,
                executionBudget,
              },
            );
          } catch (error: unknown) {
            const terminationError = terminationErrorFrom(error);
            if (terminationError) {
              throw terminationError;
            }
            blastRadius = unavailableBlastRadius(runtimeLimits);
          }

          let completedReport: InvestigationReport;
          if (hypothesisScoringStage.status === 'completed') {
            const topHypothesis = hypothesisScoringStage.hypotheses[0];
            if (!topHypothesis) {
              throw new Error('Completed hypothesis scoring returned no top inference.');
            }
            completedReport = InvestigationReportSchema.parse({
              ...report,
              summary: `The strongest evidence-backed inference is: ${topHypothesis.summary}`,
              hypotheses: hypothesisScoringStage.hypotheses,
              blastRadius,
            });
          } else {
            completedReport = finalizeUnscoredReport(
              report,
              hypothesisScoringStage.status === 'insufficient'
                ? 'insufficient_evidence'
                : 'scoring_unavailable',
              blastRadius,
            );
          }
          try {
            executionBudget.beginAgentStep();
            remediationStage = remediationPlanner.plan(
              contextStage,
              hypothesisScoringStage,
              completedReport,
            );
          } catch (error: unknown) {
            const terminationError = terminationErrorFrom(error);
            if (terminationError) {
              throw terminationError;
            }
            remediationStage = invalidRemediationPlanning();
          }
          const lineageTruncated = contextStage.facts.lineage?.truncated === true;
          if (lineageTruncated) {
            completedReport = InvestigationReportSchema.parse({
              ...completedReport,
              missingInformation: [
                ...completedReport.missingInformation
                  .filter((item) => item !== INVESTIGATION_WARNING_MESSAGES.incomplete_lineage)
                  .slice(0, 19),
                INVESTIGATION_WARNING_MESSAGES.incomplete_lineage,
              ],
            });
          }
          executionBudget.assertModelOutput(JSON.stringify(completedReport));
          if (lineageTruncated) {
            storeDegradedIncident({
              contextStage,
              suspiciousChangeStage,
              hypothesisScoringStage,
              remediationStage,
              execution: executionBudget.snapshot('lineage_truncated'),
              errorCode: 'LINEAGE_TRUNCATED',
              warnings: [
                investigationWarning('partial_evidence'),
                investigationWarning('incomplete_lineage'),
              ],
              nextSteps: [investigationNextStep('review_partial_evidence')],
              report: completedReport,
            });
            return;
          }
          const execution = executionBudget.snapshot();
          eventRecorder.recordReportFlow(completedReport, hypothesisScoringStage, remediationStage);
          eventRecorder.terminate(execution);
          incidents.set(response.incidentId, {
            status: 'completed',
            contextStage,
            suspiciousChangeStage,
            hypothesisScoringStage,
            remediationStage,
            report: completedReport,
            execution,
            eventTrail: eventRecorder.snapshot(),
          });
          server.log.info(
            {
              incidentId: response.incidentId,
              entityCount: completedReport.entities.length,
              evidenceCount: completedReport.evidence.length,
              hypothesisScoringStatus: hypothesisScoringStage.status,
              remediationStatus: remediationStage.status,
              remediationRecommendationCount:
                remediationStage.status === 'completed'
                  ? remediationStage.recommendations.length
                  : 0,
              toolCalls: execution.toolCalls,
              agentSteps: execution.agentSteps,
              durationMs: execution.durationMs,
              lineageEntitiesVisited: execution.lineageEntitiesVisited,
              retries: execution.retries,
              terminationReason: execution.terminationReason,
            },
            'Investigation completed',
          );
        } catch (error: unknown) {
          const terminationError = terminationErrorFrom(error);
          if (terminationError) {
            const providerTimedOut = terminationError instanceof InvestigationProviderTimeoutError;
            if (
              (contextStage.status === 'completed' || contextStage.status === 'degraded') &&
              hasPreservedContextEvidence(contextStage)
            ) {
              if (suspiciousChangeStage.status === 'detecting') {
                suspiciousChangeStage = unavailableSuspiciousChanges(
                  contextStage.status === 'completed' ? 'DETECTION_INVALID' : 'CONTEXT_UNAVAILABLE',
                );
              }
              if (hypothesisScoringStage.status === 'scoring') {
                hypothesisScoringStage = unavailableHypothesisScoring(
                  contextStage.status !== 'completed'
                    ? 'CONTEXT_UNAVAILABLE'
                    : suspiciousChangeStage.status === 'unavailable'
                      ? 'SUSPICIOUS_CHANGES_UNAVAILABLE'
                      : 'SCORING_INVALID',
                );
              }
              if (remediationStage.status === 'planning') {
                remediationStage = unavailableRemediationPlanning(
                  contextStage.status === 'completed'
                    ? 'SCORING_UNAVAILABLE'
                    : 'CONTEXT_UNAVAILABLE',
                );
              }
              const warnings = [investigationWarning('partial_evidence')];
              const nextSteps = [investigationNextStep('review_partial_evidence')];
              if (providerTimedOut) {
                warnings.push(investigationWarning('external_dependency_failed'));
                nextSteps.push(investigationNextStep('review_provider_availability'));
                if (mode !== 'fixture') {
                  nextSteps.push(investigationNextStep('continue_fixture_mode'));
                }
              }
              storeDegradedIncident({
                contextStage,
                suspiciousChangeStage,
                hypothesisScoringStage,
                remediationStage,
                execution: terminationError.execution,
                errorCode: providerTimedOut ? 'METADATA_TIMEOUT' : 'INVESTIGATION_LIMIT_REACHED',
                warnings,
                nextSteps,
              });
              return;
            }
            incidents.set(response.incidentId, {
              status: 'execution-failed',
              execution: terminationError.execution,
              error: {
                code: providerTimedOut ? 'METADATA_TIMEOUT' : 'INVESTIGATION_LIMIT_REACHED',
                message: terminationError.message,
              },
              eventTrail: (() => {
                eventRecorder.terminate(terminationError.execution);
                return eventRecorder.snapshot();
              })(),
            });
            server.log.warn(
              {
                incidentId: response.incidentId,
                mode,
                toolCalls: terminationError.execution.toolCalls,
                agentSteps: terminationError.execution.agentSteps,
                durationMs: terminationError.execution.durationMs,
                lineageEntitiesVisited: terminationError.execution.lineageEntitiesVisited,
                retries: terminationError.execution.retries,
                terminationReason: terminationError.reason,
              },
              'Investigation stopped before completion',
            );
            return;
          }
          incidents.set(response.incidentId, { status: 'failed' });
          server.log.error(
            {
              incidentId: response.incidentId,
              errorType: error instanceof Error ? error.name : 'UnknownError',
            },
            'Investigation failed',
          );
        }
      })();
    };
    const processingDelayMs = options.processingDelayMs ?? fixtureProcessingDelayMs;
    if (processingDelayMs === 0) {
      queueMicrotask(runBackgroundInvestigation);
    } else {
      setTimeout(runBackgroundInvestigation, processingDelayMs);
    }

    return reply.code(202).send(response);
  });

  server.get<{ Params: { incidentId: string } }>(
    '/incidents/:incidentId',
    async (request, reply) => {
      const parsedParams = IncidentIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send(
          ApiErrorSchema.parse({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'The incident identifier is invalid.',
              issues: safeValidationIssues(parsedParams.error.issues),
            },
          }),
        );
      }
      const { incidentId } = parsedParams.data;
      const incident = incidents.get(incidentId);

      if (!incident) {
        return reply.code(404).send(
          ApiErrorSchema.parse({
            error: {
              code: 'NOT_FOUND',
              message: 'The requested incident was not found.',
            },
          }),
        );
      }

      const response = publicIncidentResponse(incidentId, incident);
      if (!response) {
        return reply.code(500).send(
          ApiErrorSchema.parse({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'The investigation could not be completed.',
            },
          }),
        );
      }
      return reply.code(200).send(response);
    },
  );

  server.get<{ Params: { incidentId: string } }>(
    '/incidents/:incidentId/report.md',
    async (request, reply) => {
      const parsedParams = IncidentIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send(
          ApiErrorSchema.parse({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'The incident identifier is invalid.',
              issues: safeValidationIssues(parsedParams.error.issues),
            },
          }),
        );
      }
      const { incidentId } = parsedParams.data;
      const incident = incidents.get(incidentId);
      if (!incident) {
        return reply.code(404).send(
          ApiErrorSchema.parse({
            error: {
              code: 'NOT_FOUND',
              message: 'The requested incident was not found.',
            },
          }),
        );
      }
      const response = publicIncidentResponse(incidentId, incident);
      if (!response) {
        return reply.code(500).send(
          ApiErrorSchema.parse({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'The investigation could not be completed.',
            },
          }),
        );
      }
      if (response.status === 'processing') {
        return reply.code(409).send(
          ApiErrorSchema.parse({
            error: {
              code: 'REPORT_NOT_READY',
              message: 'The incident report is still processing.',
            },
          }),
        );
      }

      const exportArtifact = createIncidentMarkdownExport(response);
      return reply
        .header('Cache-Control', 'no-store')
        .header('Content-Disposition', `attachment; filename="${exportArtifact.filename}"`)
        .header('X-Content-Type-Options', 'nosniff')
        .type('text/markdown; charset=utf-8')
        .code(200)
        .send(exportArtifact.markdown);
    },
  );

  return server;
}

export function readListenConfig(environment: NodeJS.ProcessEnv = process.env) {
  const port = Number(environment.PORT ?? environment.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RuntimeConfigurationError(
      environment.PORT === undefined ? 'API_PORT' : 'PORT',
      'must be an integer from 0 through 65535',
    );
  }
  const host = environment.API_HOST ?? (environment.PORT ? '0.0.0.0' : '127.0.0.1');
  return { host, port };
}

async function start() {
  const server = buildServer({
    ...(process.env.WEB_DIST_DIR ? { staticRoot: process.env.WEB_DIST_DIR } : {}),
  });
  const { host, port } = readListenConfig();

  await server.listen({ host, port });
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
