import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  DeterministicIncidentContextGatherer,
  DeterministicHypothesisScorer,
  DeterministicInvestigationRunner,
  DeterministicRemediationPlanner,
  DeterministicSuspiciousChangeDetector,
  FIXTURE_INVESTIGATION_LIMITS,
  InvestigationExecutionBudget,
  InvestigationLimitError,
  type IncidentContextGatherer,
  type IncidentContextGatheringLimits,
  type HypothesisScorer,
  type InvestigationLimits,
  type InvestigationRunner,
  type RemediationPlanner,
  type SuspiciousChangeDetector,
} from '@dii/agent-core';
import {
  createDataHubHealthClient,
  createDataHubLineageClient,
  createDataHubRecentChangesClient,
  createDataHubSearchClient,
  createFixtureMetadataAdapter,
  MetadataProviderError,
  type MetadataAdapter,
  type MetadataHealthProvider,
  type MetadataLineageProvider,
  type MetadataRecentChangesProvider,
  type MetadataSearchProvider,
} from '@dii/datahub-client';
import {
  ApiErrorSchema,
  DEFAULT_PUBLIC_INGRESS_CONFIG,
  DEFAULT_RUNTIME_LIMIT_CONFIG,
  INCIDENT_CONTEXT_MAX_CANDIDATES,
  INVESTIGATION_TERMINATION_MESSAGES,
  IncidentAcceptedResponseSchema,
  IncidentContextStageSchema,
  IncidentIdParamsSchema,
  HypothesisScoringStageSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  InvestigationReportSchema,
  METADATA_ENTITY_SEARCH_MAX_LIMIT,
  METADATA_LINEAGE_MAX_NODES,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  MetadataHealthResponseSchema,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
  MetadataSourceModeSchema,
  REMEDIATION_FALLBACK_STEP_TEXT,
  RemediationPlanningStageSchema,
  PublicIngressConfigSchema,
  RuntimeLimitConfigSchema,
  SuspiciousChangeDetectionStageSchema,
  type IncidentContextStage,
  type HypothesisScoringStage,
  type InvestigationReport,
  type InvestigationExecutionMetadata,
  type MetadataHealthResponse,
  type MetadataSourceMode,
  type PublicIngressConfig,
  type RemediationPlanningStage,
  type RuntimeLimitConfig,
  type SuspiciousChangeDetectionStage,
} from '@dii/shared-types';
import Fastify from 'fastify';

interface BuildServerOptions {
  environment?: NodeJS.ProcessEnv;
  executionClock?: () => number;
  logger?: boolean;
  metadata?: MetadataAdapter;
  metadataHealth?: MetadataHealthProvider;
  metadataLineage?: MetadataLineageProvider;
  metadataRecentChanges?: MetadataRecentChangesProvider;
  metadataSearch?: MetadataSearchProvider;
  mode?: MetadataSourceMode;
  processingDelayMs?: number;
  contextGatherer?: IncidentContextGatherer;
  contextLimits?: IncidentContextGatheringLimits;
  suspiciousChangeDetector?: SuspiciousChangeDetector;
  hypothesisScorer?: HypothesisScorer;
  remediationPlanner?: RemediationPlanner;
  runner?: InvestigationRunner;
  limits?: InvestigationLimits;
  runtimeLimits?: RuntimeLimitConfig;
  publicIngress?: PublicIngressConfig;
  requestClock?: () => number;
}

type StoredIncident =
  | {
      status: 'processing';
      contextStage: IncidentContextStage;
      suspiciousChangeStage: SuspiciousChangeDetectionStage;
      hypothesisScoringStage: HypothesisScoringStage;
      remediationStage: RemediationPlanningStage;
    }
  | {
      status: 'completed';
      contextStage: IncidentContextStage;
      suspiciousChangeStage: SuspiciousChangeDetectionStage;
      hypothesisScoringStage: HypothesisScoringStage;
      remediationStage: RemediationPlanningStage;
      report: InvestigationReport;
      execution: InvestigationExecutionMetadata;
    }
  | {
      status: 'execution-failed';
      execution: InvestigationExecutionMetadata;
      error: {
        code: 'INVESTIGATION_LIMIT_REACHED' | 'METADATA_TIMEOUT';
        message: string;
      };
    }
  | { status: 'failed' };

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
  const parsedMode = MetadataSourceModeSchema.safeParse(value);
  return parsedMode.success ? parsedMode.data : 'fixture';
}

function unavailableMetadataHealth(mode: MetadataSourceMode): MetadataHealthResponse {
  return MetadataHealthResponseSchema.parse({
    mode,
    status: 'unavailable',
    message:
      mode === 'datahub'
        ? 'DataHub metadata is unavailable. Check the service and network connection.'
        : 'Fixture metadata is unavailable. Restart the application and try again.',
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
  });
  const requestClock = options.requestClock ?? (() => Date.now());
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
  const metadata = options.metadata ?? createFixtureMetadataAdapter();
  const metadataHealth =
    options.metadataHealth ??
    (mode === 'fixture'
      ? metadata
      : createDataHubHealthClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataSearch =
    options.metadataSearch ??
    (mode === 'fixture'
      ? metadata
      : createDataHubSearchClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataLineage =
    options.metadataLineage ??
    (mode === 'fixture'
      ? metadata
      : createDataHubLineageClient({
          gmsUrl: environment.DATAHUB_GMS_URL,
          token: environment.DATAHUB_TOKEN,
        }));
  const metadataRecentChanges =
    options.metadataRecentChanges ??
    (mode === 'fixture'
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

  server.get('/health', async () => ({
    status: 'ok',
    service: 'data-incident-investigator-api',
    mode,
  }));

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
    incidents.set(response.incidentId, {
      status: 'processing',
      contextStage: IncidentContextStageSchema.parse({ status: 'gathering' }),
      suspiciousChangeStage: SuspiciousChangeDetectionStageSchema.parse({ status: 'detecting' }),
      hypothesisScoringStage: HypothesisScoringStageSchema.parse({ status: 'scoring' }),
      remediationStage: RemediationPlanningStageSchema.parse({ status: 'planning' }),
    });
    server.log.info({ incidentId: response.incidentId, mode }, 'Investigation accepted');
    const executionBudget = new InvestigationExecutionBudget(runtimeLimits, options.executionClock);

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

    const runBackgroundInvestigation = () => {
      void (async () => {
        try {
          let contextStage: IncidentContextStage;
          let suspiciousChangeStage: SuspiciousChangeDetectionStage;
          let hypothesisScoringStage: HypothesisScoringStage;
          let remediationStage: RemediationPlanningStage;
          try {
            executionBudget.beginAgentStep();
            contextStage = await contextGatherer.gather(parsedRequest.data, {
              metadata: contextMetadata,
              mode,
              limits: contextLimits,
              executionBudget,
            });
            try {
              executionBudget.beginAgentStep();
              suspiciousChangeStage = suspiciousChangeDetector.detect(contextStage);
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

          executionBudget.beginAgentStep();
          const report = InvestigationReportSchema.parse(
            await runner.investigate(parsedRequest.data, {
              incidentId: response.incidentId,
              metadata,
              limits,
              executionBudget,
            }),
          );
          let completedReport = report;
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
                completedReport = InvestigationReportSchema.parse({
                  ...report,
                  summary: `The strongest evidence-backed inference is: ${topHypothesis.summary}`,
                  hypotheses: hypothesisScoringStage.hypotheses,
                });
              }
            } catch (error: unknown) {
              const terminationError = terminationErrorFrom(error);
              if (terminationError) {
                throw terminationError;
              }
              hypothesisScoringStage = unavailableHypothesisScoring('SCORING_INVALID');
            }
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
          executionBudget.assertModelOutput(JSON.stringify(completedReport));
          const execution = executionBudget.snapshot();
          incidents.set(response.incidentId, {
            status: 'completed',
            contextStage,
            suspiciousChangeStage,
            hypothesisScoringStage,
            remediationStage,
            report: completedReport,
            execution,
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
              terminationReason: execution.terminationReason,
            },
            'Fixture investigation completed',
          );
        } catch (error: unknown) {
          const terminationError = terminationErrorFrom(error);
          if (terminationError) {
            const providerTimedOut = terminationError instanceof InvestigationProviderTimeoutError;
            incidents.set(response.incidentId, {
              status: 'execution-failed',
              execution: terminationError.execution,
              error: {
                code: providerTimedOut ? 'METADATA_TIMEOUT' : 'INVESTIGATION_LIMIT_REACHED',
                message: terminationError.message,
              },
            });
            server.log.warn(
              {
                incidentId: response.incidentId,
                mode,
                toolCalls: terminationError.execution.toolCalls,
                agentSteps: terminationError.execution.agentSteps,
                durationMs: terminationError.execution.durationMs,
                lineageEntitiesVisited: terminationError.execution.lineageEntitiesVisited,
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
            'Fixture investigation failed',
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

      if (incident.status === 'failed') {
        return reply.code(500).send(
          ApiErrorSchema.parse({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'The investigation could not be completed.',
            },
          }),
        );
      }

      if (incident.status === 'execution-failed') {
        return reply.code(200).send(
          IncidentRetrievalResponseSchema.parse({
            incidentId,
            status: 'failed',
            execution: incident.execution,
            error: incident.error,
          }),
        );
      }

      return reply.code(200).send(
        IncidentRetrievalResponseSchema.parse(
          incident.status === 'completed'
            ? {
                incidentId,
                status: 'completed',
                contextStage: incident.contextStage,
                suspiciousChangeStage: incident.suspiciousChangeStage,
                hypothesisScoringStage: incident.hypothesisScoringStage,
                remediationStage: incident.remediationStage,
                execution: incident.execution,
                report: incident.report,
              }
            : {
                incidentId,
                status: 'processing',
                contextStage: incident.contextStage,
                suspiciousChangeStage: incident.suspiciousChangeStage,
                hypothesisScoringStage: incident.hypothesisScoringStage,
                remediationStage: incident.remediationStage,
              },
        ),
      );
    },
  );

  return server;
}

async function start() {
  const server = buildServer();
  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '127.0.0.1';

  await server.listen({ host, port });
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
