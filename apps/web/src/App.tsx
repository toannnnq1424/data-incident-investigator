import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import {
  ApiErrorSchema,
  CANONICAL_INCIDENT_SCENARIOS,
  METADATA_LINEAGE_DEFAULT_DEPTH,
  METADATA_LINEAGE_DEFAULT_MAX_NODES,
  METADATA_RECENT_CHANGES_DEFAULT_LIMIT,
  METADATA_RECENT_CHANGES_DEFAULT_WINDOW_HOURS,
  type EntityKind,
  type EntityRef,
  type Evidence,
  type CanonicalIncidentScenarioId,
  type HypothesisScoringStage,
  IncidentAcceptedResponseSchema,
  type IncidentContextStage,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  type IncidentAcceptedResponse,
  type IncidentRetrievalResponse,
  type InvestigationEventTrail,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  type MetadataEntitySearchResponse,
  MetadataHealthResponseSchema,
  type MetadataHealthResponse,
  type MetadataLineageDirection,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  type MetadataLineageResponse,
  MetadataRecentChangesRequestSchema,
  MetadataRecentChangesResponseSchema,
  type MetadataRecentChangesResponse,
  type RemediationPlanningStage,
  type SuspiciousChangeDetectionStage,
} from '@dii/shared-types';

type CompletedIncident = Extract<IncidentRetrievalResponse, { status: 'completed' }>;
type DegradedIncident = Extract<IncidentRetrievalResponse, { status: 'degraded' }>;
type ProcessingIncident = Extract<IncidentRetrievalResponse, { status: 'processing' }>;
type FailedIncident = Extract<IncidentRetrievalResponse, { status: 'failed' }>;
type ReportInference = CompletedIncident['report']['hypotheses'][number] & {
  confidenceLabel: string;
};

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'processing'; incident: ProcessingIncident }
  | { kind: 'completed'; incident: CompletedIncident }
  | { kind: 'degraded'; incident: DegradedIncident }
  | { kind: 'failed'; incident: FailedIncident }
  | { kind: 'validation-error'; message: string }
  | { kind: 'api-error'; message: string };

type MetadataHealthState = MetadataHealthResponse | null | undefined;

export type MetadataSearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; response: MetadataEntitySearchResponse }
  | { kind: 'validation-error'; message: string }
  | { kind: 'api-error'; message: string };

export type MetadataLineageState =
  | { kind: 'idle' }
  | { kind: 'loading'; direction: MetadataLineageDirection; rootName: string }
  | { kind: 'success'; response: MetadataLineageResponse }
  | { kind: 'api-error'; message: string };

export type MetadataRecentChangesState =
  | { kind: 'idle' }
  | { kind: 'loading'; entityName: string }
  | { kind: 'success'; response: MetadataRecentChangesResponse }
  | { kind: 'api-error'; message: string };

const problemStatusLabels = {
  unconfigured: 'Setup needed',
  unauthorized: 'Authorization needed',
  unavailable: 'Unavailable',
  timeout: 'Timed out',
  invalid_response: 'Unexpected response',
} as const;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const retrievalAttempts = 30;
const retrievalDelayMs = 100;

export function createLatestRequestGuard() {
  let latestRequest = 0;
  return {
    begin() {
      latestRequest += 1;
      return latestRequest;
    },
    isCurrent(request: number) {
      return request === latestRequest;
    },
  };
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type IncidentFormValues = {
  question: string;
  entityHint: string;
  occurredAt: string;
  symptom: string;
};

export type CanonicalScenarioSelection =
  | { kind: 'manual' }
  | { kind: 'scenario'; scenarioId: CanonicalIncidentScenarioId }
  | { kind: 'custom'; sourceScenarioId: CanonicalIncidentScenarioId };

export const EMPTY_INCIDENT_FORM_VALUES: IncidentFormValues = Object.freeze({
  question: '',
  entityHint: '',
  occurredAt: '',
  symptom: '',
});

function toDatetimeLocalValue(timestamp: string) {
  const date = new Date(timestamp);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

export function createCanonicalScenarioFormState(
  scenarioId: CanonicalIncidentScenarioId | 'manual',
): { selection: CanonicalScenarioSelection; values: IncidentFormValues } {
  if (scenarioId === 'manual') {
    return {
      selection: { kind: 'manual' },
      values: { ...EMPTY_INCIDENT_FORM_VALUES },
    };
  }

  const scenario = CANONICAL_INCIDENT_SCENARIOS.find((candidate) => candidate.id === scenarioId);
  if (!scenario) {
    throw new Error('Canonical scenario selection must resolve to the shared catalog.');
  }

  return {
    selection: { kind: 'scenario', scenarioId },
    values: {
      question: scenario.incident.question,
      entityHint: scenario.incident.entityHint ?? '',
      occurredAt: scenario.incident.occurredAt
        ? toDatetimeLocalValue(scenario.incident.occurredAt)
        : '',
      symptom: scenario.incident.symptom ?? '',
    },
  };
}

export function markCanonicalScenarioCustom(
  selection: CanonicalScenarioSelection,
): CanonicalScenarioSelection {
  if (selection.kind !== 'scenario') {
    return selection;
  }
  return { kind: 'custom', sourceScenarioId: selection.scenarioId };
}

function getScenarioSelectionValue(selection: CanonicalScenarioSelection) {
  if (selection.kind === 'scenario') {
    return selection.scenarioId;
  }
  return selection.kind;
}

function getScenarioSelectionSource(selection: CanonicalScenarioSelection) {
  if (selection.kind === 'manual') {
    return undefined;
  }
  const sourceId =
    selection.kind === 'scenario' ? selection.scenarioId : selection.sourceScenarioId;
  return CANONICAL_INCIDENT_SCENARIOS.find((scenario) => scenario.id === sourceId);
}

export function CanonicalScenarioSelector({
  onReset,
  onSelect,
  selection,
}: {
  onReset: () => void;
  onSelect: (scenarioId: CanonicalIncidentScenarioId | 'manual') => void;
  selection: CanonicalScenarioSelection;
}) {
  const sourceScenario = getScenarioSelectionSource(selection);
  const selectionValue = getScenarioSelectionValue(selection);
  const status =
    selection.kind === 'manual'
      ? 'Manual input is active. Enter or paste incident details.'
      : selection.kind === 'scenario'
        ? `${sourceScenario?.title ?? 'Canonical scenario'} prefill selected. You can edit every field before submitting.`
        : `Custom values based on ${sourceScenario?.title ?? 'a canonical scenario'}. Your edits will be submitted.`;

  return (
    <fieldset className="scenario-selector">
      <legend>Incident playbooks</legend>
      <p className="scenario-selector-help" id="canonical-scenario-help">
        Choose a bounded scenario to prefill the investigation. Every field remains editable, and
        only the removed-column path has the rich canonical browser fixture.
      </p>
      <div className="scenario-preset-grid" aria-describedby="canonical-scenario-help">
        {CANONICAL_INCIDENT_SCENARIOS.map((scenario, index) => {
          const selected =
            selectionValue === scenario.id ||
            (selection.kind === 'custom' && selection.sourceScenarioId === scenario.id);
          return (
            <button
              key={scenario.id}
              className={`scenario-preset${selected ? ' scenario-preset-selected' : ''}`}
              type="button"
              aria-pressed={selected}
              aria-describedby={`scenario-${scenario.id}-description`}
              onClick={() => onSelect(scenario.id)}
            >
              <span className="scenario-preset-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="scenario-preset-copy">
                <strong>{scenario.title}</strong>
                <span id={`scenario-${scenario.id}-description`}>{scenario.description}</span>
              </span>
              {index === 0 && <span className="scenario-preset-badge">Best demo path</span>}
            </button>
          );
        })}
      </div>
      <div className="scenario-selector-footer">
        <p className="scenario-selection-status" id="canonical-scenario-status" aria-live="polite">
          {status}
        </p>
        <button className="scenario-reset" type="button" onClick={onReset}>
          Use manual input
        </button>
      </div>
      {sourceScenario && (
        <p className="scenario-description">
          Selected playbook: <strong>{sourceScenario.title}</strong>
          {selection.kind === 'custom' ? ' · customized' : ' · canonical prefill'}
        </p>
      )}
    </fieldset>
  );
}

export function InvestigationFlow() {
  const steps = [
    {
      label: 'Find context',
      detail: 'Search bounded metadata and select only adapter-returned entities.',
    },
    {
      label: 'Trace lineage',
      detail: 'Follow upstream and downstream relationships within explicit limits.',
    },
    {
      label: 'Test evidence',
      detail: 'Separate factual change signals from evidence-linked inference.',
    },
    {
      label: 'Explain impact',
      detail: 'Show supported blast radius and human-review next steps.',
    },
  ];

  return (
    <section className="investigation-contract" aria-labelledby="investigation-contract-heading">
      <div className="investigation-contract-copy">
        <p className="step-label">Read-only investigation contract</p>
        <h2 id="investigation-contract-heading">From incident signal to auditable answer</h2>
        <p>
          The workflow is deterministic and bounded: no hidden model call, no production mutation,
          and no unsupported evidence is silently filled in.
        </p>
      </div>
      <ol className="investigation-flow">
        {steps.map((step, index) => (
          <li key={step.label}>
            <span aria-hidden="true">{index + 1}</span>
            <strong>{step.label}</strong>
            <p>{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function getCompletedReportDashboard(incident: CompletedIncident) {
  const topHypothesis = incident.report.hypotheses[0];
  if (!topHypothesis) {
    throw new Error('A completed investigation dashboard requires a ranked hypothesis.');
  }
  const confidence = topHypothesis.confidence;

  return {
    verdict: topHypothesis.summary,
    confidenceLabel:
      confidence.status === 'scored'
        ? `${formatConfidence(confidence.scorePercent)} · ${confidence.level}`
        : 'Not scored',
    confidenceScore: confidence.status === 'scored' ? confidence.scorePercent : undefined,
    confidenceDetail: confidence.explanation.replace(/^Why:\s*/u, ''),
    evidenceCount: incident.report.evidence.length,
    impactCount: incident.report.blastRadius.summary.total,
    blastRadiusStatus: incident.report.blastRadius.status,
    toolCalls: incident.execution.toolCalls,
    agentSteps: incident.execution.agentSteps,
  };
}

export function getEvidencePathNodes(incident: CompletedIncident) {
  const selectedEntity = incident.contextStage.facts.selectedEntity;
  const evidence =
    incident.report.evidence.find((item) => item.category !== 'lineage') ??
    incident.report.evidence[0];
  const topHypothesis = incident.report.hypotheses[0];
  const firstImpact = incident.report.blastRadius.impacts[0];

  if (!selectedEntity || !evidence || !topHypothesis) {
    throw new Error('A completed evidence path requires an entity, evidence, and hypothesis.');
  }

  return [
    {
      type: 'Incident',
      label: incident.contextStage.intent.question,
      detail: 'Normalized operator question',
      tone: 'signal',
    },
    {
      type: selectedEntity.kind,
      label: selectedEntity.name,
      detail: 'Adapter-selected entity',
      tone: 'entity',
    },
    {
      type: evidence.category,
      label: evidence.statement,
      detail: evidence.sourceEntity
        ? `Observed on ${evidence.sourceEntity.name}`
        : 'Validated factual evidence',
      tone: 'evidence',
    },
    {
      type: 'Hypothesis',
      label: topHypothesis.summary,
      detail:
        topHypothesis.confidence.status === 'scored'
          ? `${formatConfidence(topHypothesis.confidence.scorePercent)} evidence confidence`
          : 'Confidence not scored',
      tone: 'hypothesis',
    },
    {
      type: 'Downstream impact',
      label: firstImpact?.entity.name ?? 'No downstream impact verified',
      detail: firstImpact
        ? `${firstImpact.entity.kind} · distance ${firstImpact.distance}`
        : incident.report.blastRadius.status === 'complete'
          ? 'No supported impact within bounds'
          : 'Coverage remains explicitly incomplete',
      tone: firstImpact ? 'impact' : 'unknown',
    },
  ] as const;
}

function EvidencePathMap({ incident }: { incident: CompletedIncident }) {
  const nodes = getEvidencePathNodes(incident);

  return (
    <section className="evidence-path-map" aria-labelledby="evidence-path-heading">
      <div className="evidence-path-heading">
        <div>
          <p className="report-label">Validated report graph</p>
          <h3 id="evidence-path-heading">Evidence path</h3>
        </div>
        <p>Every node comes from the terminal report; connectors imply sequence, not causality.</p>
      </div>
      <ol>
        {nodes.map((node, index) => (
          <li key={`${node.type}-${index}`} data-tone={node.tone}>
            <span className="evidence-path-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="evidence-path-type">{node.type}</span>
            <strong>{node.label}</strong>
            <small>{node.detail}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CompletedVerdictDashboard({
  headingRef,
  incident,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null> | undefined;
  incident: CompletedIncident;
}) {
  const dashboard = getCompletedReportDashboard(incident);

  return (
    <section className="verdict-dashboard" aria-labelledby="report-summary-heading">
      <div className="verdict-copy">
        <div className="verdict-kicker">
          <p className="report-label">Evidence-backed verdict</p>
          <span>Completed · read-only</span>
        </div>
        <h3 id="report-summary-heading" ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {dashboard.verdict}
        </h3>
        <p>{incident.report.summary}</p>
      </div>
      <aside className="confidence-card" aria-label="Top hypothesis confidence">
        <span>Evidence confidence</span>
        <strong>{dashboard.confidenceLabel}</strong>
        {dashboard.confidenceScore === undefined ? (
          <div className="confidence-meter confidence-meter-unscored" aria-hidden="true" />
        ) : (
          <div
            className="confidence-meter"
            role="progressbar"
            aria-label="Evidence confidence score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={dashboard.confidenceScore}
          >
            <span style={{ width: `${dashboard.confidenceScore}%` }} />
          </div>
        )}
        <small>{dashboard.confidenceDetail}</small>
      </aside>
      <dl className="verdict-metrics" aria-label="Investigation proof summary">
        <div>
          <dt>Factual evidence</dt>
          <dd>{dashboard.evidenceCount}</dd>
        </div>
        <div>
          <dt>Supported impacts</dt>
          <dd>{dashboard.impactCount}</dd>
        </div>
        <div>
          <dt>Blast-radius coverage</dt>
          <dd>{dashboard.blastRadiusStatus}</dd>
        </div>
        <div>
          <dt>Bounded execution</dt>
          <dd>
            {dashboard.toolCalls} calls · {dashboard.agentSteps} steps
          </dd>
        </div>
      </dl>
      <nav className="report-jump-links" aria-label="Jump to report evidence">
        <a href="#evidence-path-heading">Evidence path</a>
        <a href="#blast-radius-heading">Blast radius</a>
        <a href="#facts-heading">Evidence</a>
        <a href="#recommendations-heading">Human next steps</a>
        <a href="#investigation-activity-heading">Activity trail</a>
      </nav>
    </section>
  );
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatConfidence(scorePercent: number) {
  return `${scorePercent}%`;
}

function formatObservedAt(timestamp: string) {
  return timestamp.replace('T', ' ').replace(/\.000Z$/, 'Z');
}

export function getMetadataHealthPresentation(health: MetadataHealthState) {
  if (health === undefined) {
    return {
      sourceLabel: 'Checking metadata source',
      statusLabel: 'Loading',
      message: 'Checking metadata readiness…',
      tone: 'loading' as const,
    };
  }

  if (health === null) {
    return {
      sourceLabel: 'Metadata source',
      statusLabel: 'Unavailable',
      message: 'Metadata readiness could not be loaded. Refresh the page or check the API service.',
      tone: 'problem' as const,
    };
  }

  const sourceLabel =
    health.mode === 'fixture'
      ? 'Fixture metadata'
      : health.mode === 'datahub-mcp'
        ? 'DataHub MCP Server'
        : 'DataHub metadata';
  if (health.status === 'ready') {
    return {
      sourceLabel,
      statusLabel: 'Ready',
      message: health.message,
      tone: 'ready' as const,
    };
  }

  return {
    sourceLabel,
    statusLabel: problemStatusLabels[health.status],
    message: health.message,
    tone: 'problem' as const,
  };
}

export function getMetadataSearchPresentation(state: MetadataSearchState) {
  if (state.kind === 'idle') {
    return {
      heading: 'Search results',
      message: 'Enter a metadata query to find datasets, dashboards, charts, or pipelines.',
      tone: 'idle' as const,
    };
  }
  if (state.kind === 'loading') {
    return {
      heading: 'Searching metadata',
      message: 'Searching the selected metadata source…',
      tone: 'loading' as const,
    };
  }
  if (state.kind === 'validation-error' || state.kind === 'api-error') {
    return {
      heading: state.kind === 'validation-error' ? 'Check the search query' : 'Search failed',
      message: state.message,
      tone: 'error' as const,
    };
  }
  if (state.response.results.length === 0) {
    return {
      heading: 'No results',
      message: `No metadata entities matched “${state.response.query}”.`,
      tone: 'empty' as const,
    };
  }
  return {
    heading: 'Search results',
    message: `${state.response.results.length} metadata ${
      state.response.results.length === 1 ? 'entity' : 'entities'
    } found.`,
    tone: 'success' as const,
  };
}

export function getMetadataLineagePresentation(state: MetadataLineageState) {
  if (state.kind === 'idle') {
    return {
      heading: 'Bounded lineage',
      message: 'Choose upstream or downstream on a search result to inspect its lineage.',
      tone: 'idle' as const,
    };
  }
  if (state.kind === 'loading') {
    return {
      heading: `Loading ${state.direction} lineage`,
      message: `Tracing bounded ${state.direction} lineage for ${state.rootName}…`,
      tone: 'loading' as const,
    };
  }
  if (state.kind === 'api-error') {
    return {
      heading: 'Lineage failed',
      message: state.message,
      tone: 'error' as const,
    };
  }

  const connectedNodeCount = state.response.nodes.length - 1;
  if (state.response.edges.length === 0) {
    return {
      heading: `No ${state.response.direction} lineage`,
      message: 'The root entity exists, but no lineage was found within the requested bounds.',
      tone: 'empty' as const,
    };
  }
  if (state.response.truncated) {
    return {
      heading: `${state.response.direction === 'upstream' ? 'Upstream' : 'Downstream'} lineage`,
      message: `Showing ${connectedNodeCount} connected ${
        connectedNodeCount === 1 ? 'node' : 'nodes'
      }; the graph reached a depth, node, edge, or provider-step bound.`,
      tone: 'truncated' as const,
    };
  }
  return {
    heading: `${state.response.direction === 'upstream' ? 'Upstream' : 'Downstream'} lineage`,
    message: `${connectedNodeCount} connected ${
      connectedNodeCount === 1 ? 'node' : 'nodes'
    } within depth ${state.response.requestedDepth}.`,
    tone: 'success' as const,
  };
}

export function getMetadataRecentChangesPresentation(state: MetadataRecentChangesState) {
  if (state.kind === 'idle') {
    return {
      heading: 'Recent metadata changes',
      message: 'Choose recent changes on a search result or lineage node to inspect facts.',
      tone: 'idle' as const,
    };
  }
  if (state.kind === 'loading') {
    return {
      heading: 'Loading recent changes',
      message: `Loading bounded metadata history for ${state.entityName}…`,
      tone: 'loading' as const,
    };
  }
  if (state.kind === 'api-error') {
    return {
      heading: 'Recent changes failed',
      message: state.message,
      tone: 'error' as const,
    };
  }
  if (state.response.capability === 'unsupported') {
    return {
      heading: 'Recent-change history unavailable',
      message:
        'The official DataHub MCP Server does not expose recent-change history; no change evidence was returned or inferred.',
      tone: 'empty' as const,
    };
  }
  if (state.response.changes.length === 0) {
    return state.response.truncated
      ? {
          heading: 'No changes in this window',
          message: 'Older metadata history exists outside the selected bounded window.',
          tone: 'truncated' as const,
        }
      : {
          heading: 'No recent changes',
          message: 'No metadata changes were recorded for this entity in the selected window.',
          tone: 'empty' as const,
        };
  }
  if (state.response.truncated) {
    return {
      heading: 'Recent metadata changes',
      message: `Showing ${state.response.returnedCount} bounded changes; older or additional history was omitted.`,
      tone: 'truncated' as const,
    };
  }
  return {
    heading: 'Recent metadata changes',
    message: `${state.response.returnedCount} metadata ${
      state.response.returnedCount === 1 ? 'change' : 'changes'
    } found in the selected window.`,
    tone: 'success' as const,
  };
}

function MetadataSourceStatus({ health }: { health: MetadataHealthState }) {
  const presentation = getMetadataHealthPresentation(health);

  return (
    <section
      className={`metadata-source-status metadata-source-${presentation.tone}`}
      aria-labelledby="metadata-source-heading"
    >
      <div>
        <p className="source-label">Metadata source</p>
        <h2 id="metadata-source-heading">{presentation.sourceLabel}</h2>
      </div>
      <div className="metadata-status-copy">
        <span className="metadata-status-pill">{presentation.statusLabel}</span>
        <p role="status" aria-live="polite" aria-atomic="true">
          {presentation.message}
        </p>
      </div>
    </section>
  );
}

function MetadataSearchResults({
  headingRef,
  lineageLoading,
  onRequestLineage,
  onRequestRecentChanges,
  recentChangesLoading,
  state,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  lineageLoading: boolean;
  onRequestLineage: (
    result: MetadataEntitySearchResponse['results'][number],
    direction: MetadataLineageDirection,
  ) => void;
  onRequestRecentChanges: (result: MetadataEntitySearchResponse['results'][number]) => void;
  recentChangesLoading: boolean;
  state: MetadataSearchState;
}) {
  const presentation = getMetadataSearchPresentation(state);
  const terminal = !['idle', 'loading'].includes(state.kind);

  return (
    <div
      className={`metadata-search-results metadata-search-${presentation.tone}`}
      aria-live="polite"
      aria-atomic="false"
    >
      <h3 ref={headingRef} tabIndex={terminal ? -1 : undefined}>
        {presentation.heading}
      </h3>
      <p
        className="metadata-search-message"
        role={presentation.tone === 'error' ? 'alert' : 'status'}
      >
        {presentation.message}
      </p>
      {state.kind === 'success' && state.response.results.length > 0 && (
        <ul className="metadata-search-result-list">
          {state.response.results.map((result) => (
            <li key={result.urn}>
              <div className="metadata-search-result-heading">
                <strong>{result.name}</strong>
                <span>{result.kind}</span>
              </div>
              {result.qualifiedName && <code>{result.qualifiedName}</code>}
              {result.description && <p>{result.description}</p>}
              <code className="metadata-search-result-urn">{result.urn}</code>
              <div
                className="metadata-lineage-actions"
                aria-label={`Metadata actions for ${result.name}`}
              >
                <button
                  type="button"
                  disabled={lineageLoading}
                  onClick={() => onRequestLineage(result, 'upstream')}
                  aria-label={`View upstream lineage for ${result.name}`}
                >
                  Upstream
                </button>
                <button
                  type="button"
                  disabled={lineageLoading}
                  onClick={() => onRequestLineage(result, 'downstream')}
                  aria-label={`View downstream lineage for ${result.name}`}
                >
                  Downstream
                </button>
                <button
                  type="button"
                  disabled={recentChangesLoading}
                  onClick={() => onRequestRecentChanges(result)}
                  aria-label={`View recent changes for ${result.name}`}
                >
                  Recent changes
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetadataLineageResults({
  headingRef,
  onRequestRecentChanges,
  recentChangesLoading,
  state,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRequestRecentChanges: (node: MetadataLineageResponse['nodes'][number]) => void;
  recentChangesLoading: boolean;
  state: MetadataLineageState;
}) {
  const presentation = getMetadataLineagePresentation(state);
  const terminal = state.kind === 'success' || state.kind === 'api-error';

  return (
    <section
      className={`metadata-lineage-results metadata-lineage-${presentation.tone}`}
      aria-live="polite"
      aria-atomic="false"
      aria-labelledby="metadata-lineage-results-heading"
    >
      <h3
        id="metadata-lineage-results-heading"
        ref={headingRef}
        tabIndex={terminal ? -1 : undefined}
      >
        {presentation.heading}
      </h3>
      <p role={presentation.tone === 'error' ? 'alert' : 'status'}>{presentation.message}</p>
      {state.kind === 'success' && (
        <div className="metadata-lineage-graph">
          <div className="metadata-lineage-summary">
            <span>Root</span>
            <code>{state.response.rootUrn}</code>
            <span>
              {state.response.visitedNodeCount} visited · depth {state.response.requestedDepth} ·
              max {state.response.maxNodes} nodes
            </span>
          </div>
          <h4>Nodes</h4>
          <ul className="metadata-lineage-node-list">
            {state.response.nodes.map((node) => (
              <li
                key={node.urn}
                data-lineage-root={node.urn === state.response.rootUrn || undefined}
              >
                <div>
                  <strong>{node.name}</strong>
                  <span>
                    {node.urn === state.response.rootUrn ? 'root' : `depth ${node.depth}`}
                  </span>
                </div>
                <code>{node.urn}</code>
                <p>
                  {node.kind}
                  {node.platform ? ` · ${node.platform}` : ''}
                </p>
                {node.description && <p>{node.description}</p>}
                <button
                  type="button"
                  className="metadata-node-recent-changes"
                  disabled={recentChangesLoading}
                  onClick={() => onRequestRecentChanges(node)}
                  aria-label={`View recent changes for ${node.name}`}
                >
                  Recent changes
                </button>
              </li>
            ))}
          </ul>
          <h4>Directed edges</h4>
          {state.response.edges.length === 0 ? (
            <p className="metadata-lineage-empty-edges">No directed edges were returned.</p>
          ) : (
            <ul className="metadata-lineage-edge-list">
              {state.response.edges.map((edge) => (
                <li key={`${edge.sourceUrn}\u0000${edge.targetUrn}`}>
                  <code>{edge.sourceUrn}</code>
                  <span aria-label="flows to">→</span>
                  <code>{edge.targetUrn}</code>
                </li>
              ))}
            </ul>
          )}
          {state.response.truncated && (
            <p className="metadata-lineage-truncation-note" role="status">
              Truncated: increase a bounded control to inspect more reachable lineage.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function MetadataRecentChangesResults({
  headingRef,
  state,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  state: MetadataRecentChangesState;
}) {
  const presentation = getMetadataRecentChangesPresentation(state);
  const terminal = state.kind === 'success' || state.kind === 'api-error';

  return (
    <section
      className={`metadata-recent-changes metadata-recent-changes-${presentation.tone}`}
      aria-live="polite"
      aria-atomic="false"
      aria-labelledby="metadata-recent-changes-heading"
    >
      <h3
        id="metadata-recent-changes-heading"
        ref={headingRef}
        tabIndex={terminal ? -1 : undefined}
      >
        {presentation.heading}
      </h3>
      <p role={presentation.tone === 'error' ? 'alert' : 'status'}>{presentation.message}</p>
      {state.kind === 'success' && (
        <div className="metadata-recent-changes-content">
          <p className="metadata-recent-changes-window">
            Window:{' '}
            <time dateTime={state.response.window.startTime}>
              {formatObservedAt(state.response.window.startTime)}
            </time>{' '}
            to{' '}
            <time dateTime={state.response.window.endTime}>
              {formatObservedAt(state.response.window.endTime)}
            </time>{' '}
            · limit {state.response.limit}
          </p>
          {state.response.changes.length > 0 && (
            <ol className="metadata-recent-change-list">
              {state.response.changes.map((change) => (
                <li key={change.id} data-change-id={change.id}>
                  <div className="metadata-recent-change-heading">
                    <div>
                      <span>{change.category}</span>
                      <strong>{change.operation}</strong>
                    </div>
                    <time dateTime={change.timestamp}>{formatObservedAt(change.timestamp)}</time>
                  </div>
                  <p>{change.summary}</p>
                  {change.field && <code>{change.field}</code>}
                  <small>
                    Source: {change.source}
                    {change.actor ? ` · ${change.actor}` : ''}
                  </small>
                </li>
              ))}
            </ol>
          )}
          {state.response.truncated && (
            <p className="metadata-recent-changes-truncation" role="status">
              Truncated: the selected window, limit, or provider cap omitted additional history.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function getCompletedReportContent(incident: CompletedIncident) {
  const topInference = incident.report.hypotheses[0];
  if (!topInference) {
    throw new Error('A completed investigation report must include a ranked hypothesis.');
  }

  return {
    status: incident.status,
    summary: incident.report.summary,
    topHypothesis: topInference.summary,
    relatedEntities: incident.report.entities,
    blastRadius: incident.report.blastRadius,
    facts: incident.report.evidence,
    lineageEvidence: incident.report.evidence.filter((evidence) => evidence.category === 'lineage'),
    inferences: incident.report.hypotheses.map((hypothesis) => ({
      ...hypothesis,
      confidenceLabel:
        hypothesis.confidence.status === 'scored'
          ? `${formatConfidence(hypothesis.confidence.scorePercent)} · ${hypothesis.confidence.level}`
          : 'Confidence not scored',
    })),
    recommendations: incident.report.recommendations,
    assumptions: incident.report.assumptions,
    missingInformation: incident.report.missingInformation,
  };
}

export function getIncidentContextPresentation(stage: IncidentContextStage) {
  if (stage.status === 'gathering') {
    return {
      heading: 'Gathering investigation context',
      message: 'Parsing the intake and retrieving bounded metadata facts…',
      tone: 'loading' as const,
    };
  }

  if (stage.status === 'failed') {
    return {
      heading: 'Context gathering failed',
      message: stage.error.message,
      tone: 'error' as const,
    };
  }

  if (!stage.facts.selectedEntity) {
    return {
      heading: 'Context gathered with missing information',
      message: 'The intake was parsed, but no adapter-evidenced entity candidate was returned.',
      tone: 'missing' as const,
    };
  }

  return {
    heading:
      stage.missingInformation.length > 0
        ? 'Context gathered with bounded gaps'
        : 'Investigation context gathered',
    message: `${stage.facts.candidateEntities.length} candidate entities and ${stage.facts.recentChanges.reduce(
      (count, recentChanges) => count + recentChanges.returnedCount,
      0,
    )} recent metadata changes were retrieved as facts.`,
    tone: stage.missingInformation.length > 0 ? ('missing' as const) : ('success' as const),
  };
}

function IncidentContextStage({ stage }: { stage: IncidentContextStage }) {
  const presentation = getIncidentContextPresentation(stage);

  return (
    <section
      className={`incident-context-stage context-${presentation.tone}`}
      aria-labelledby="incident-context-heading"
      data-context-status={stage.status}
    >
      <p className="report-label">Parse and gather · facts only</p>
      <h3 id="incident-context-heading" tabIndex={-1}>
        {presentation.heading}
      </h3>
      <p>{presentation.message}</p>

      {stage.status === 'failed' && (
        <p className="incident-context-error" role="alert">
          <code>{stage.error.code}</code>
        </p>
      )}

      {stage.status === 'completed' && (
        <div className="incident-context-content">
          <section aria-labelledby="parsed-intent-heading">
            <h4 id="parsed-intent-heading">Parsed incident intent</h4>
            <dl className="incident-context-intent">
              <div>
                <dt>Question</dt>
                <dd>{stage.intent.question}</dd>
              </div>
              <div>
                <dt>Entity hints</dt>
                <dd>{stage.intent.entityHints.join(', ') || 'Not supplied'}</dd>
              </div>
              <div>
                <dt>Symptoms</dt>
                <dd>{stage.intent.symptoms.join(', ') || 'Not supplied'}</dd>
              </div>
              <div>
                <dt>Context window</dt>
                <dd>
                  {stage.intent.timeWindow.hours} hours ·{' '}
                  {stage.intent.timeWindow.endTime ?? 'metadata source default end'}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="candidate-entities-heading">
            <h4 id="candidate-entities-heading">Candidate entities</h4>
            {stage.facts.candidateEntities.length === 0 ? (
              <EmptyState message="No adapter-evidenced candidate entity was returned." />
            ) : (
              <ul className="incident-context-entity-list">
                {stage.facts.candidateEntities.map((candidate) => (
                  <li
                    key={candidate.urn}
                    data-selected={candidate.urn === stage.facts.selectedEntity?.urn}
                  >
                    <span>{candidate.kind}</span>
                    <strong>{candidate.name}</strong>
                    <code>{candidate.urn}</code>
                    {candidate.urn === stage.facts.selectedEntity?.urn && <em>Selected</em>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="gathered-facts-heading">
            <h4 id="gathered-facts-heading">Gathered metadata facts</h4>
            {!stage.facts.lineage ? (
              <EmptyState message="No lineage facts were requested without a selected entity." />
            ) : (
              <>
                <p>
                  Source: <strong>{stage.facts.sourceMode}</strong> · upstream lineage nodes:{' '}
                  {stage.facts.lineage.visitedNodeCount}
                  {stage.facts.lineage.truncated ? ' · truncated' : ''}
                </p>
                <ul className="incident-context-fact-list">
                  {stage.facts.lineage.nodes.map((node) => (
                    <li key={node.urn}>
                      <span>Lineage depth {node.depth}</span>
                      <strong>{node.name}</strong>
                      <code>{node.urn}</code>
                    </li>
                  ))}
                  {stage.facts.recentChanges.flatMap((recentChanges) =>
                    recentChanges.changes.map((change) => (
                      <li
                        key={`${recentChanges.entityUrn}:${change.id}`}
                        data-context-fact-id={change.id}
                      >
                        <span>
                          {change.category} · {change.operation}
                        </span>
                        <strong>{change.summary}</strong>
                        <code>{change.id}</code>
                        <time dateTime={change.timestamp}>
                          {formatObservedAt(change.timestamp)}
                        </time>
                      </li>
                    )),
                  )}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="context-missing-information-heading">
            <h4 id="context-missing-information-heading">Context missing information</h4>
            {stage.missingInformation.length === 0 ? (
              <EmptyState message="No bounded context gaps were recorded." />
            ) : (
              <ul className="incident-context-missing-list">
                {stage.missingInformation.map((item) => (
                  <li key={item.code}>
                    <code>{item.code}</code>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="incident-context-boundary">
            This stage contains retrieved facts and missing information only. It does not claim a
            root cause.
          </p>
        </div>
      )}
    </section>
  );
}

export function getSuspiciousChangePresentation(stage: SuspiciousChangeDetectionStage) {
  if (stage.status === 'detecting') {
    return {
      heading: 'Detecting potentially relevant changes',
      message: 'Applying bounded deterministic signals to the gathered change factsâ€¦',
      tone: 'loading' as const,
    };
  }

  if (stage.status === 'unavailable') {
    return {
      heading: 'Suspicious-change detection unavailable',
      message: stage.error.message,
      tone: 'error' as const,
    };
  }

  if (stage.status === 'insufficient') {
    return {
      heading: 'Insufficient suspicious-change signals',
      message: 'No recent change met the bounded incident-specific signal rules.',
      tone: 'missing' as const,
    };
  }

  return {
    heading: 'Potentially relevant metadata changes',
    message: `${stage.candidates.length} bounded change candidates have transparent suspicious signals.`,
    tone: 'success' as const,
  };
}

function SuspiciousChangeStage({ stage }: { stage: SuspiciousChangeDetectionStage }) {
  const presentation = getSuspiciousChangePresentation(stage);

  return (
    <section
      className={`suspicious-change-stage suspicious-${presentation.tone}`}
      aria-labelledby="suspicious-change-heading"
      data-suspicious-change-status={stage.status}
    >
      <p className="report-label">Suspicious-change signals Â· deterministic</p>
      <h3 id="suspicious-change-heading" tabIndex={-1}>
        {presentation.heading}
      </h3>
      <p>{presentation.message}</p>

      {stage.status === 'unavailable' && (
        <p className="suspicious-change-error" role="alert">
          <code>{stage.error.code}</code>
        </p>
      )}

      {(stage.status === 'completed' || stage.status === 'insufficient') && (
        <div className="suspicious-change-content">
          {stage.status === 'completed' ? (
            <ol className="suspicious-change-list">
              {stage.candidates.map((candidate) => (
                <li key={candidate.changeId} data-suspicious-change-id={candidate.changeId}>
                  <div className="suspicious-change-heading">
                    <div>
                      <span>
                        {candidate.category} Â· {candidate.operation}
                      </span>
                      <strong>{candidate.entityName}</strong>
                    </div>
                    <time dateTime={candidate.observedAt}>
                      {formatObservedAt(candidate.observedAt)}
                    </time>
                  </div>
                  <p>{candidate.summary}</p>
                  <code>{candidate.changeId}</code>
                  <code>{candidate.entityUrn}</code>
                  <p className="suspicious-change-signal-label">Transparent signals</p>
                  <ul className="suspicious-change-signal-list">
                    {candidate.signals.map((signal) => (
                      <li key={signal.code}>
                        <code>{signal.code}</code>
                        <span>{signal.label}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState message="No potentially relevant change candidate was produced." />
          )}

          {stage.missingInformation.length > 0 && (
            <section aria-labelledby="suspicious-change-missing-heading">
              <h4 id="suspicious-change-missing-heading">Detection missing information</h4>
              <ul className="suspicious-change-missing-list">
                {stage.missingInformation.map((item) => (
                  <li key={item.code}>
                    <code>{item.code}</code>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="suspicious-change-boundary">
            Potential relevance is a deterministic signal classification, not a cause, root-cause
            claim, hypothesis, confidence score, or recommendation.
          </p>
        </div>
      )}
    </section>
  );
}

export function getHypothesisScoringPresentation(stage: HypothesisScoringStage) {
  if (stage.status === 'scoring') {
    return {
      heading: 'Scoring evidence-linked hypotheses',
      message: 'Applying the deterministic basis-point formula to resolved factual evidence…',
      tone: 'loading' as const,
    };
  }

  if (stage.status === 'unavailable') {
    return {
      heading: 'Hypothesis scoring unavailable',
      message: stage.error.message,
      tone: 'error' as const,
    };
  }

  if (stage.status === 'insufficient') {
    return {
      heading: 'Insufficient evidence for hypothesis scoring',
      message: 'No ranked inference was produced from the bounded factual inputs.',
      tone: 'missing' as const,
    };
  }

  return {
    heading: 'Ranked evidence-linked hypotheses',
    message: `${stage.hypotheses.length} plausible-contributor inference${stage.hypotheses.length === 1 ? '' : 's'} scored by transparent factors.`,
    tone: 'success' as const,
  };
}

function evidenceDomId(evidenceId: string) {
  return `evidence-${evidenceId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function hypothesisDomId(hypothesisId: string) {
  return `scored-${hypothesisId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function HypothesisScoringStage({ stage }: { stage: HypothesisScoringStage }) {
  const presentation = getHypothesisScoringPresentation(stage);

  return (
    <section
      className={`hypothesis-scoring-stage scoring-${presentation.tone}`}
      aria-labelledby="hypothesis-scoring-heading"
      data-hypothesis-scoring-status={stage.status}
    >
      <p className="report-label">Candidate hypotheses · code-owned scoring</p>
      <h3 id="hypothesis-scoring-heading" tabIndex={-1}>
        {presentation.heading}
      </h3>
      <p>{presentation.message}</p>

      {stage.status === 'unavailable' && (
        <p className="hypothesis-scoring-error" role="alert">
          <code>{stage.error.code}</code>
        </p>
      )}

      {(stage.status === 'completed' || stage.status === 'insufficient') && (
        <div className="hypothesis-scoring-content">
          {stage.status === 'completed' ? (
            <ol className="scored-hypothesis-list">
              {stage.hypotheses.map((hypothesis) => (
                <li
                  key={hypothesis.id}
                  id={hypothesisDomId(hypothesis.id)}
                  data-hypothesis-id={hypothesis.id}
                  data-hypothesis-rank={hypothesis.rank}
                >
                  <div className="scored-hypothesis-heading">
                    <div>
                      <span>Inference #{hypothesis.rank}</span>
                      <strong>{hypothesis.summary}</strong>
                    </div>
                    <b>
                      {formatConfidence(hypothesis.confidence.scorePercent)} confidence ·{' '}
                      {hypothesis.confidence.level}
                    </b>
                  </div>
                  <p>
                    Source change <code>{hypothesis.sourceChangeId}</code> ·{' '}
                    <time dateTime={hypothesis.observedAt}>
                      {formatObservedAt(hypothesis.observedAt)}
                    </time>
                  </p>
                  <p className="confidence-why">
                    <strong>Why</strong>
                    <span>{hypothesis.confidence.explanation.replace(/^Why:\s*/, '')}</span>
                  </p>
                  <p className="score-factor-label">
                    Ordered score factors · {hypothesis.confidence.formulaVersion}
                  </p>
                  <ol className="score-factor-list">
                    {hypothesis.confidence.factors.map((factor) => (
                      <li key={factor.code}>
                        <div>
                          <code>{factor.code}</code>
                          <span>{factor.label}</span>
                          <small>
                            Reason: <code>{factor.reasonCode}</code>
                          </small>
                          {(factor.evidenceIds.length > 0 || factor.signalCodes.length > 0) && (
                            <small>
                              Provenance:{' '}
                              {[
                                ...factor.evidenceIds.map((id) => `evidence:${id}`),
                                ...factor.signalCodes.map((code) => `signal:${code}`),
                              ].join(' · ')}
                            </small>
                          )}
                        </div>
                        <strong>
                          {factor.contributionBasisPoints > 0 ? '+' : ''}
                          {factor.contributionBasisPoints} / {factor.weightBasisPoints} bp
                        </strong>
                      </li>
                    ))}
                  </ol>
                  <p className="scored-evidence-label">Resolved evidence</p>
                  <ul className="scored-evidence-list">
                    {hypothesis.evidenceIds.map((evidenceId) => (
                      <li key={evidenceId}>
                        <a href={`#${evidenceDomId(evidenceId)}`}>
                          <code>{evidenceId}</code>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState message="No evidence-linked hypothesis crossed the scoring boundary." />
          )}

          {stage.missingInformation.length > 0 && (
            <section aria-labelledby="hypothesis-scoring-missing-heading">
              <h4 id="hypothesis-scoring-missing-heading">Scoring missing information</h4>
              <ul className="hypothesis-scoring-missing-list">
                {stage.missingInformation.map((item) => (
                  <li key={item.code}>
                    <code>{item.code}</code>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="hypothesis-scoring-boundary">
            Confidence is the exact clamped sum of bounded code-owned evidence factors and
            penalties. Each item is an inference and plausible contributor, not a confirmed cause or
            recommendation.
          </p>
        </div>
      )}
    </section>
  );
}

export function getRemediationPresentation(stage: RemediationPlanningStage) {
  if (stage.status === 'planning') {
    return {
      heading: 'Planning safe verification and remediation',
      message: 'Deriving bounded human-review steps from scored factual references…',
      tone: 'loading' as const,
    };
  }
  if (stage.status === 'unavailable') {
    return {
      heading: 'Remediation planning unavailable',
      message: stage.error.message,
      tone: 'error' as const,
    };
  }
  if (stage.status === 'insufficient') {
    return {
      heading: 'Inconclusive remediation planning',
      message: 'No recommendation was created; safe diagnostic fallback steps remain available.',
      tone: 'missing' as const,
    };
  }
  return {
    heading: 'Safe recommendations for human review',
    message: `${stage.recommendations.length} evidence-linked recommendation${stage.recommendations.length === 1 ? '' : 's'}; none has been executed.`,
    tone: 'success' as const,
  };
}

export function RemediationStage({
  announce = true,
  stage,
}: {
  announce?: boolean;
  stage: RemediationPlanningStage;
}) {
  const presentation = getRemediationPresentation(stage);

  return (
    <section
      className={`remediation-stage remediation-${presentation.tone}`}
      aria-labelledby="remediation-heading"
      aria-live={announce ? 'polite' : undefined}
      data-remediation-status={stage.status}
    >
      <p className="report-label">Human review only · no automatic action</p>
      <h3 id="remediation-heading" tabIndex={-1}>
        {presentation.heading}
      </h3>
      <p>{presentation.message}</p>

      {stage.status === 'unavailable' && (
        <p className="remediation-error" role="alert">
          <code>{stage.error.code}</code>
        </p>
      )}

      {stage.status !== 'planning' && (
        <div className="remediation-content">
          {stage.status === 'completed' ? (
            <ol className="remediation-recommendation-list">
              {stage.recommendations.map((recommendation) => (
                <li key={recommendation.id} data-remediation-id={recommendation.id}>
                  <div className="remediation-recommendation-heading">
                    <div>
                      <code>{recommendation.id}</code>
                      <h4>{recommendation.title}</h4>
                    </div>
                    <ul aria-label="Recommendation classification">
                      <li>{recommendation.type.replaceAll('_', ' ')}</li>
                      <li>{recommendation.priority} priority</li>
                      <li>Not executed</li>
                    </ul>
                  </div>
                  <p>
                    <strong>Rationale:</strong> {recommendation.rationale}
                  </p>
                  <p>
                    <strong>Safe verification:</strong> {recommendation.verificationStep}
                  </p>
                  <p>
                    <strong>Reversibility:</strong> {recommendation.reversibilityNote}
                  </p>
                  <section aria-label={`Linked references for ${recommendation.id}`}>
                    <h5>Linked factual references</h5>
                    <div className="remediation-reference-groups">
                      <div>
                        <span>Hypotheses</span>
                        <ul>
                          {recommendation.references.hypothesisIds.map((hypothesisId) => (
                            <li key={hypothesisId}>
                              <a href={`#${hypothesisDomId(hypothesisId)}`}>
                                <code>{hypothesisId}</code>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span>Evidence</span>
                        <ul>
                          {recommendation.references.evidenceIds.map((evidenceId) => (
                            <li key={evidenceId}>
                              <a href={`#${evidenceDomId(evidenceId)}`}>
                                <code>{evidenceId}</code>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span>Entities</span>
                        <ul>
                          {recommendation.references.entityUrns.map((entityUrn) => (
                            <li key={entityUrn}>
                              <code>{entityUrn}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span>Changes</span>
                        <ul>
                          {recommendation.references.changeIds.map((changeId) => (
                            <li key={changeId}>
                              <a href={`#${evidenceDomId(changeId)}`}>
                                <code>{changeId}</code>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState message="No remediation recommendation was invented for incomplete evidence." />
          )}

          {stage.missingInformation.length > 0 && (
            <section aria-labelledby="remediation-missing-heading">
              <h4 id="remediation-missing-heading">Missing information</h4>
              <ul className="remediation-missing-list">
                {stage.missingInformation.map((item) => (
                  <li key={item.code}>
                    <code>{item.code}</code>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {stage.nextSteps.length > 0 && (
            <section aria-labelledby="fallback-next-steps-heading">
              <h4 id="fallback-next-steps-heading">Safe fallback next steps</h4>
              <ol className="remediation-next-step-list">
                {stage.nextSteps.map((step) => (
                  <li key={step.id}>
                    <div>
                      <code>{step.id}</code>
                      <span>{step.kind.replaceAll('_', ' ')}</span>
                      <strong>Not executed</strong>
                    </div>
                    <p>{step.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="remediation-boundary">
            Recommended verification and potential remediation are bounded proposals for manual
            human review. Nothing in this stage has been executed.
          </p>
        </div>
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="empty-state">{message}</p>;
}

function ReportSection({
  id,
  label,
  title,
  children,
}: {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="report-section" aria-labelledby={id} data-testid={id}>
      <p className="report-label">{label}</p>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

function EntityList({ entities }: { entities: EntityRef[] }) {
  if (entities.length === 0) {
    return <EmptyState message="No related entities were returned." />;
  }

  return (
    <ul className="entity-list">
      {entities.map((entity) => (
        <li key={entity.urn}>
          <span className="entity-kind">{entity.kind}</span>
          <div>
            <strong>{entity.name}</strong>
            <code>{entity.urn}</code>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BlastRadiusSection({
  analysis,
}: {
  analysis: CompletedIncident['report']['blastRadius'];
}) {
  return (
    <section className="report-section blast-radius" aria-labelledby="blast-radius-heading">
      <p className="report-label">Downstream impact analysis</p>
      <h3 id="blast-radius-heading">Blast radius</h3>
      <div className="blast-radius-status">
        <strong>{analysis.status}</strong>
        <code>{analysis.analysisVersion}</code>
      </div>
      <p>{analysis.explanation}</p>
      <dl className="blast-radius-summary">
        <div>
          <dt>Total</dt>
          <dd>{analysis.summary.total}</dd>
        </div>
        <div>
          <dt>Datasets</dt>
          <dd>{analysis.summary.datasets}</dd>
        </div>
        <div>
          <dt>Pipelines</dt>
          <dd>{analysis.summary.pipelines}</dd>
        </div>
        <div>
          <dt>Dashboards</dt>
          <dd>{analysis.summary.dashboards}</dd>
        </div>
      </dl>
      {analysis.coverage.reasonCodes.length > 0 && (
        <div>
          <h4>Coverage limitations</h4>
          <ul className="coverage-reason-list">
            {analysis.coverage.reasonCodes.map((reasonCode) => (
              <li key={reasonCode}>
                <code>{reasonCode}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="blast-radius-limits">
        Applied limits: depth {analysis.coverage.appliedLimits.maxDepth}, entities{' '}
        {analysis.coverage.appliedLimits.maxEntities}, roots{' '}
        {analysis.coverage.appliedLimits.maxRootEntities}. Analyzed{' '}
        {analysis.coverage.rootsAnalyzed}/{analysis.coverage.rootsConsidered} roots and{' '}
        {analysis.coverage.visitedEntities} entities.
      </p>
      {analysis.impacts.length === 0 ? (
        <EmptyState
          message={
            analysis.status === 'complete'
              ? 'No supported downstream dataset, pipeline, or dashboard was reachable within the applied bounds.'
              : 'No downstream impact was verified; this is not a zero-impact claim.'
          }
        />
      ) : (
        <ol className="blast-radius-impact-list">
          {analysis.impacts.map((impact) => (
            <li key={impact.entity.urn}>
              <div className="blast-radius-impact-heading">
                <span className="entity-kind">{impact.entity.kind}</span>
                <strong>{impact.entity.name}</strong>
                <span>distance {impact.distance}</span>
              </div>
              <code>{impact.entity.urn}</code>
              <p>
                Downstream path: <code>{impact.pathUrns.join(' → ')}</code>
              </p>
              <p className="evidence-reference-label">Evidence provenance</p>
              <ul className="evidence-reference-list">
                {impact.evidenceIds.map((evidenceId) => (
                  <li key={evidenceId}>
                    <a href={`#${evidenceDomId(evidenceId)}`}>
                      <code>{evidenceId}</code>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EvidenceList({
  evidence,
  emptyMessage,
  linkTargets = false,
}: {
  evidence: Evidence[];
  emptyMessage: string;
  linkTargets?: boolean;
}) {
  if (evidence.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ol className="evidence-list">
      {evidence.map((item) => (
        <li key={item.id} id={linkTargets ? evidenceDomId(item.id) : undefined}>
          <div className="evidence-meta">
            <code>{item.id}</code>
            <span>{item.category}</span>
            {item.observedAt && (
              <time dateTime={item.observedAt}>{formatObservedAt(item.observedAt)}</time>
            )}
          </div>
          <p>{item.statement}</p>
          {item.sourceEntity && (
            <span className="source-entity">
              Source: {item.sourceEntity.name} ({item.sourceEntity.kind})
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function InferenceList({ inferences }: { inferences: ReportInference[] }) {
  if (inferences.length === 0) {
    return <EmptyState message="No evidence-backed inferences were returned." />;
  }

  return (
    <ol className="inference-list">
      {inferences.map((hypothesis) => (
        <li key={hypothesis.id}>
          <div className="inference-heading">
            <div>
              <code>{hypothesis.id}</code>
              <h4>{hypothesis.summary}</h4>
            </div>
            <strong>{hypothesis.confidenceLabel}</strong>
          </div>
          <p className="confidence-why">
            <strong>Why</strong>
            <span>{hypothesis.confidence.explanation.replace(/^Why:\s*/, '')}</span>
          </p>
          <p className="evidence-reference-label">Evidence IDs</p>
          <ul className="evidence-reference-list">
            {hypothesis.evidenceIds.map((evidenceId) => (
              <li key={evidenceId}>
                <code>{evidenceId}</code>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function TextList({ items, emptyMessage }: { items: string[]; emptyMessage: string }) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ul className="text-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function InvestigationActivity({
  events,
  linkEvidence = false,
}: {
  events: InvestigationEventTrail;
  linkEvidence?: boolean;
}) {
  return (
    <section className="investigation-activity" aria-labelledby="investigation-activity-heading">
      <p className="report-label">Observable operations only</p>
      <h3 id="investigation-activity-heading">Investigation activity</h3>
      <ol className="investigation-event-list">
        {events.map((event) => (
          <li
            key={event.id}
            className={
              event.actionType === 'warning_raised'
                ? 'investigation-event-warning'
                : event.actionType === 'investigation_terminated'
                  ? 'investigation-event-terminal'
                  : undefined
            }
          >
            <div className="investigation-event-meta">
              <code>{event.actionType}</code>
              <time dateTime={event.timestamp}>{formatObservedAt(event.timestamp)}</time>
            </div>
            <p>{event.summary}</p>
            {event.evidenceIds && (
              <ul className="evidence-reference-list" aria-label="Related evidence IDs">
                {event.evidenceIds.map((evidenceId) => (
                  <li key={evidenceId}>
                    {linkEvidence ? (
                      <a href={`#${evidenceDomId(evidenceId)}`}>
                        <code>{evidenceId}</code>
                      </a>
                    ) : (
                      <code>{evidenceId}</code>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {event.actionType === 'investigation_terminated' && (
              <p className="investigation-event-duration">Duration: {event.durationMs} ms</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MarkdownReportDownload({ incidentId }: { incidentId: string }) {
  return (
    <div className="report-export-action">
      <a href={`${apiBaseUrl}/incidents/${encodeURIComponent(incidentId)}/report.md`} download>
        Download Markdown report
      </a>
      <p>UTF-8 · deterministic · no server-side report file is stored</p>
    </div>
  );
}

function ProcessingStatus({ incident }: { incident: ProcessingIncident }) {
  return (
    <div className="status-progress processing-status">
      <p>Investigation processing</p>
      <span>{incident.incidentId}</span>
      <InvestigationActivity events={incident.eventTrail} />
      <IncidentContextStage stage={incident.contextStage} />
      <SuspiciousChangeStage stage={incident.suspiciousChangeStage} />
      <HypothesisScoringStage stage={incident.hypothesisScoringStage} />
      <RemediationStage stage={incident.remediationStage} />
      <EmptyState message="Report details will appear after fixture evidence is gathered." />
    </div>
  );
}

export function getDegradedInvestigationPresentation(incident: DegradedIncident) {
  return {
    heading: 'Investigation degraded safely',
    message: incident.error.message,
    failedOperation: incident.failedOperation,
    warningMessages: incident.warnings.map((warning) => warning.message),
    nextStepDescriptions: incident.nextSteps.map((step) => step.description),
    hasPartialReport: Boolean(incident.report),
  };
}

export function DegradedInvestigation({
  headingRef,
  incident,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  incident: DegradedIncident;
}) {
  const presentation = getDegradedInvestigationPresentation(incident);

  return (
    <div className="status-progress degraded-investigation">
      <p>Investigation degraded</p>
      <h3 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
        {presentation.heading}
      </h3>
      <p>{presentation.message}</p>
      <dl>
        <div>
          <dt>Incident ID</dt>
          <dd>{incident.incidentId}</dd>
        </div>
        <div>
          <dt>Termination</dt>
          <dd>
            <code>{incident.execution.terminationReason}</code>
          </dd>
        </div>
        {presentation.failedOperation && (
          <div>
            <dt>Failed operation</dt>
            <dd>
              <code>{presentation.failedOperation}</code>
            </dd>
          </div>
        )}
      </dl>
      <MarkdownReportDownload incidentId={incident.incidentId} />
      <InvestigationActivity events={incident.eventTrail} linkEvidence={Boolean(incident.report)} />
      <IncidentContextStage stage={incident.contextStage} />
      <SuspiciousChangeStage stage={incident.suspiciousChangeStage} />
      <HypothesisScoringStage stage={incident.hypothesisScoringStage} />
      <RemediationStage stage={incident.remediationStage} announce={false} />
      <section aria-labelledby="degradation-warnings-heading">
        <h4 id="degradation-warnings-heading">Why this is incomplete</h4>
        <TextList
          items={presentation.warningMessages}
          emptyMessage="No degradation warning was returned."
        />
      </section>
      <section aria-labelledby="degradation-next-steps-heading">
        <h4 id="degradation-next-steps-heading">Safe next steps</h4>
        <ul className="text-list">
          {incident.nextSteps.map((step) => (
            <li key={step.id}>
              <code>{step.id}</code> — {step.description}
            </li>
          ))}
        </ul>
      </section>
      {incident.report && (
        <>
          <section aria-labelledby="partial-report-heading">
            <p className="report-label">Validated partial report · not a complete traversal</p>
            <h4 id="partial-report-heading">Preserved report evidence</h4>
            <p>{incident.report.summary}</p>
            <EntityList entities={incident.report.entities} />
            <EvidenceList
              evidence={incident.report.evidence}
              emptyMessage="No factual report evidence was preserved."
              linkTargets
            />
          </section>
          <BlastRadiusSection analysis={incident.report.blastRadius} />
        </>
      )}
    </div>
  );
}

export function FailedInvestigation({
  headingRef,
  incident,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  incident: FailedIncident;
}) {
  return (
    <div className="status-error failed-investigation">
      <p>Investigation stopped</p>
      <h3 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
        The investigation did not complete
      </h3>
      <p>{incident.error.message}</p>
      <dl>
        <div>
          <dt>Incident ID</dt>
          <dd>{incident.incidentId}</dd>
        </div>
        <div>
          <dt>Termination</dt>
          <dd>
            <code>{incident.execution.terminationReason}</code>
          </dd>
        </div>
      </dl>
      <MarkdownReportDownload incidentId={incident.incidentId} />
      <InvestigationActivity events={incident.eventTrail} />
    </div>
  );
}

export function CompletedReport({
  headingRef,
  incident,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  incident: CompletedIncident;
}) {
  const content = getCompletedReportContent(incident);

  return (
    <div className="status-success completed-report">
      <p>Investigation completed</p>
      <CompletedVerdictDashboard headingRef={headingRef} incident={incident} />
      <EvidencePathMap incident={incident} />
      <BlastRadiusSection analysis={content.blastRadius} />
      <dl>
        <div>
          <dt>Incident ID</dt>
          <dd>{incident.incidentId}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{content.status}</dd>
        </div>
      </dl>
      <MarkdownReportDownload incidentId={incident.incidentId} />
      <InvestigationActivity events={incident.eventTrail} linkEvidence />
      <IncidentContextStage stage={incident.contextStage} />
      <SuspiciousChangeStage stage={incident.suspiciousChangeStage} />
      <HypothesisScoringStage stage={incident.hypothesisScoringStage} />
      <RemediationStage stage={incident.remediationStage} announce={false} />
      <div className="report-detail-grid">
        <ReportSection id="related-entities-heading" label="Entity impact" title="Related entities">
          <EntityList entities={content.relatedEntities} />
        </ReportSection>

        <ReportSection id="facts-heading" label="Facts" title="Evidence">
          <EvidenceList
            evidence={content.facts}
            emptyMessage="No factual evidence was returned."
            linkTargets
          />
        </ReportSection>

        <ReportSection id="lineage-heading" label="Lineage" title="Relevant lineage">
          <EvidenceList
            evidence={content.lineageEvidence}
            emptyMessage="No lineage evidence was returned."
          />
        </ReportSection>

        <ReportSection id="inferences-heading" label="Inferences" title="Hypotheses">
          <InferenceList inferences={content.inferences} />
        </ReportSection>

        <ReportSection id="assumptions-heading" label="Assumptions" title="Assumptions">
          <TextList
            items={content.assumptions}
            emptyMessage="No assumptions were returned with this report."
          />
        </ReportSection>

        <ReportSection
          id="missing-information-heading"
          label="Missing information"
          title="Missing information"
        >
          <TextList
            items={content.missingInformation}
            emptyMessage="No missing information was returned with this report."
          />
        </ReportSection>

        <ReportSection
          id="recommendations-heading"
          label="Recommended actions"
          title="Recommended actions"
        >
          <TextList
            items={content.recommendations}
            emptyMessage="No recommended actions were returned with this report."
          />
        </ReportSection>
      </div>
    </div>
  );
}

function getSubmissionAnnouncement(state: SubmissionState) {
  switch (state.kind) {
    case 'idle':
      return 'Ready for an incident question.';
    case 'submitting':
      return 'Creating the incident.';
    case 'processing':
      return 'Investigation processing.';
    case 'completed':
      return 'Investigation completed. The report summary is ready.';
    case 'degraded':
      return 'Investigation degraded safely. Partial results and next steps are ready.';
    case 'failed':
      return 'Investigation stopped. Failure details are ready.';
    case 'validation-error':
      return `Check your incident details. ${state.message}`;
    case 'api-error':
      return `Request failed. ${state.message}`;
  }
}

export function App() {
  const [question, setQuestion] = useState('');
  const [entityHint, setEntityHint] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [symptom, setSymptom] = useState('');
  const [scenarioSelection, setScenarioSelection] = useState<CanonicalScenarioSelection>({
    kind: 'manual',
  });
  const [state, setState] = useState<SubmissionState>({ kind: 'idle' });
  const [metadataHealth, setMetadataHealth] = useState<MetadataHealthState>(undefined);
  const [metadataQuery, setMetadataQuery] = useState('');
  const [metadataEntityType, setMetadataEntityType] = useState<EntityKind | ''>('');
  const [metadataResultLimit, setMetadataResultLimit] = useState(10);
  const [metadataLineageDepth, setMetadataLineageDepth] = useState(METADATA_LINEAGE_DEFAULT_DEPTH);
  const [metadataLineageMaxNodes, setMetadataLineageMaxNodes] = useState(
    METADATA_LINEAGE_DEFAULT_MAX_NODES,
  );
  const [metadataRecentChangesWindow, setMetadataRecentChangesWindow] = useState(
    METADATA_RECENT_CHANGES_DEFAULT_WINDOW_HOURS,
  );
  const [metadataRecentChangesLimit, setMetadataRecentChangesLimit] = useState(
    METADATA_RECENT_CHANGES_DEFAULT_LIMIT,
  );
  const [metadataSearchState, setMetadataSearchState] = useState<MetadataSearchState>({
    kind: 'idle',
  });
  const [metadataLineageState, setMetadataLineageState] = useState<MetadataLineageState>({
    kind: 'idle',
  });
  const [metadataRecentChangesState, setMetadataRecentChangesState] =
    useState<MetadataRecentChangesState>({ kind: 'idle' });
  const metadataSearchAbort = useRef<AbortController | null>(null);
  const metadataLineageAbort = useRef<AbortController | null>(null);
  const metadataRecentChangesAbort = useRef<AbortController | null>(null);
  const incidentAbort = useRef<AbortController | null>(null);
  const metadataSearchHeading = useRef<HTMLHeadingElement>(null);
  const metadataLineageHeading = useRef<HTMLHeadingElement>(null);
  const metadataRecentChangesHeading = useRef<HTMLHeadingElement>(null);
  const terminalResultHeading = useRef<HTMLHeadingElement>(null);
  const metadataSearchGuard = useRef(createLatestRequestGuard());
  const metadataLineageGuard = useRef(createLatestRequestGuard());
  const metadataRecentChangesGuard = useRef(createLatestRequestGuard());
  const incidentRequestGuard = useRef(createLatestRequestGuard());

  function selectCanonicalScenario(scenarioId: CanonicalIncidentScenarioId | 'manual') {
    const next = createCanonicalScenarioFormState(scenarioId);
    setScenarioSelection(next.selection);
    setQuestion(next.values.question);
    setEntityHint(next.values.entityHint);
    setOccurredAt(next.values.occurredAt);
    setSymptom(next.values.symptom);
  }

  function markIncidentFormCustom() {
    setScenarioSelection((current) => markCanonicalScenarioCustom(current));
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetadataHealth() {
      try {
        const response = await fetch(`${apiBaseUrl}/metadata/health`, {
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        const parsedHealth = MetadataHealthResponseSchema.safeParse(body);

        if (!response.ok || !parsedHealth.success) {
          setMetadataHealth(null);
          return;
        }

        setMetadataHealth(parsedHealth.data);
      } catch {
        if (!controller.signal.aborted) {
          setMetadataHealth(null);
        }
      }
    }

    void loadMetadataHealth();
    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      metadataSearchAbort.current?.abort();
      metadataLineageAbort.current?.abort();
      metadataRecentChangesAbort.current?.abort();
      incidentAbort.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!['idle', 'loading'].includes(metadataSearchState.kind)) {
      metadataSearchHeading.current?.focus();
    }
  }, [metadataSearchState]);

  useEffect(() => {
    if (metadataLineageState.kind === 'success' || metadataLineageState.kind === 'api-error') {
      metadataLineageHeading.current?.focus();
    }
  }, [metadataLineageState]);

  useEffect(() => {
    if (
      metadataRecentChangesState.kind === 'success' ||
      metadataRecentChangesState.kind === 'api-error'
    ) {
      metadataRecentChangesHeading.current?.focus();
    }
  }, [metadataRecentChangesState]);

  useEffect(() => {
    if (['completed', 'degraded', 'failed'].includes(state.kind)) {
      terminalResultHeading.current?.focus();
    }
  }, [state.kind]);

  async function submitMetadataSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    metadataSearchAbort.current?.abort();
    metadataLineageAbort.current?.abort();
    metadataRecentChangesAbort.current?.abort();
    metadataLineageGuard.current.begin();
    metadataRecentChangesGuard.current.begin();
    setMetadataLineageState({ kind: 'idle' });
    setMetadataRecentChangesState({ kind: 'idle' });
    const requestId = metadataSearchGuard.current.begin();
    const parsedRequest = MetadataEntitySearchRequestSchema.safeParse({
      query: metadataQuery,
      entityType: metadataEntityType || undefined,
      limit: metadataResultLimit,
    });
    if (!parsedRequest.success) {
      setMetadataSearchState({
        kind: 'validation-error',
        message: parsedRequest.error.issues[0]?.message ?? 'Check the metadata search query.',
      });
      return;
    }

    const controller = new AbortController();
    metadataSearchAbort.current = controller;
    setMetadataSearchState({ kind: 'loading' });

    try {
      const response = await fetch(`${apiBaseUrl}/metadata/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsedRequest.data),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!metadataSearchGuard.current.isCurrent(requestId)) {
        return;
      }
      if (!response.ok) {
        const parsedError = ApiErrorSchema.safeParse(body);
        setMetadataSearchState({
          kind: 'api-error',
          message: parsedError.success
            ? parsedError.data.error.message
            : 'Metadata search could not be completed.',
        });
        return;
      }

      const parsedResponse = MetadataEntitySearchResponseSchema.safeParse(body);
      if (!parsedResponse.success) {
        setMetadataSearchState({
          kind: 'api-error',
          message: 'Metadata search returned an unexpected response.',
        });
        return;
      }
      setMetadataSearchState({ kind: 'success', response: parsedResponse.data });
    } catch {
      if (!controller.signal.aborted && metadataSearchGuard.current.isCurrent(requestId)) {
        setMetadataSearchState({
          kind: 'api-error',
          message: 'Metadata search is unavailable. Try again shortly.',
        });
      }
    }
  }

  async function requestMetadataLineage(
    result: MetadataEntitySearchResponse['results'][number],
    direction: MetadataLineageDirection,
  ) {
    metadataLineageAbort.current?.abort();
    const requestId = metadataLineageGuard.current.begin();
    const parsedRequest = MetadataLineageRequestSchema.safeParse({
      rootUrn: result.urn,
      direction,
      depth: metadataLineageDepth,
      maxNodes: metadataLineageMaxNodes,
    });
    if (!parsedRequest.success) {
      setMetadataLineageState({
        kind: 'api-error',
        message: 'The bounded lineage controls are invalid.',
      });
      return;
    }

    const controller = new AbortController();
    metadataLineageAbort.current = controller;
    setMetadataLineageState({ kind: 'loading', direction, rootName: result.name });

    try {
      const response = await fetch(`${apiBaseUrl}/metadata/lineage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsedRequest.data),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!metadataLineageGuard.current.isCurrent(requestId)) {
        return;
      }
      if (!response.ok) {
        const parsedError = ApiErrorSchema.safeParse(body);
        setMetadataLineageState({
          kind: 'api-error',
          message: parsedError.success
            ? parsedError.data.error.message
            : 'Metadata lineage could not be completed.',
        });
        return;
      }

      const parsedResponse = MetadataLineageResponseSchema.safeParse(body);
      if (!parsedResponse.success) {
        setMetadataLineageState({
          kind: 'api-error',
          message: 'Metadata lineage returned an unexpected response.',
        });
        return;
      }
      setMetadataLineageState({ kind: 'success', response: parsedResponse.data });
    } catch {
      if (!controller.signal.aborted && metadataLineageGuard.current.isCurrent(requestId)) {
        setMetadataLineageState({
          kind: 'api-error',
          message: 'Metadata lineage is unavailable. Try again shortly.',
        });
      }
    }
  }

  async function requestMetadataRecentChanges(entity: EntityRef) {
    metadataRecentChangesAbort.current?.abort();
    const requestId = metadataRecentChangesGuard.current.begin();
    const parsedRequest = MetadataRecentChangesRequestSchema.safeParse({
      entityUrn: entity.urn,
      windowHours: metadataRecentChangesWindow,
      limit: metadataRecentChangesLimit,
    });
    if (!parsedRequest.success) {
      setMetadataRecentChangesState({
        kind: 'api-error',
        message: 'The recent-change bounds are invalid.',
      });
      return;
    }

    const controller = new AbortController();
    metadataRecentChangesAbort.current = controller;
    setMetadataRecentChangesState({ kind: 'loading', entityName: entity.name });

    try {
      const response = await fetch(`${apiBaseUrl}/metadata/recent-changes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsedRequest.data),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!metadataRecentChangesGuard.current.isCurrent(requestId)) {
        return;
      }
      if (!response.ok) {
        const parsedError = ApiErrorSchema.safeParse(body);
        setMetadataRecentChangesState({
          kind: 'api-error',
          message: parsedError.success
            ? parsedError.data.error.message
            : 'Metadata recent changes could not be completed.',
        });
        return;
      }

      const parsedResponse = MetadataRecentChangesResponseSchema.safeParse(body);
      if (!parsedResponse.success) {
        setMetadataRecentChangesState({
          kind: 'api-error',
          message: 'Metadata recent changes returned an unexpected response.',
        });
        return;
      }
      setMetadataRecentChangesState({ kind: 'success', response: parsedResponse.data });
    } catch {
      if (!controller.signal.aborted && metadataRecentChangesGuard.current.isCurrent(requestId)) {
        setMetadataRecentChangesState({
          kind: 'api-error',
          message: 'Metadata recent changes are unavailable. Try again shortly.',
        });
      }
    }
  }

  async function retrieveIncident(
    acceptedIncident: IncidentAcceptedResponse,
    requestId: number,
    controller: AbortController,
  ) {
    for (let attempt = 0; attempt < retrievalAttempts; attempt += 1) {
      if (controller.signal.aborted || !incidentRequestGuard.current.isCurrent(requestId)) {
        return;
      }
      const response = await fetch(`${apiBaseUrl}/incidents/${acceptedIncident.incidentId}`, {
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!incidentRequestGuard.current.isCurrent(requestId)) {
        return;
      }

      if (!response.ok) {
        const parsedError = ApiErrorSchema.safeParse(body);
        setState({
          kind: 'api-error',
          message: parsedError.success
            ? parsedError.data.error.message
            : 'The investigation report could not be retrieved.',
        });
        return;
      }

      const parsedIncident = IncidentRetrievalResponseSchema.safeParse(body);
      if (!parsedIncident.success) {
        setState({
          kind: 'api-error',
          message: 'The investigation service returned an unexpected report.',
        });
        return;
      }

      if (parsedIncident.data.status === 'completed') {
        setState({ kind: 'completed', incident: parsedIncident.data });
        return;
      }

      if (parsedIncident.data.status === 'degraded') {
        setState({ kind: 'degraded', incident: parsedIncident.data });
        return;
      }

      if (parsedIncident.data.status === 'failed') {
        setState({ kind: 'failed', incident: parsedIncident.data });
        return;
      }

      setState({ kind: 'processing', incident: parsedIncident.data });
      await delay(retrievalDelayMs);
    }

    if (incidentRequestGuard.current.isCurrent(requestId)) {
      setState({
        kind: 'api-error',
        message: 'The investigation is still processing. Try again shortly.',
      });
    }
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    incidentAbort.current?.abort();
    const requestId = incidentRequestGuard.current.begin();
    const controller = new AbortController();
    incidentAbort.current = controller;

    let occurredAtIso: string | undefined;
    if (occurredAt) {
      const occurrenceDate = new Date(occurredAt);
      if (Number.isNaN(occurrenceDate.getTime())) {
        setState({
          kind: 'validation-error',
          message: 'Enter a valid occurrence date and time.',
        });
        return;
      }
      occurredAtIso = occurrenceDate.toISOString();
    }

    const parsedRequest = IncidentRequestSchema.safeParse({
      question,
      entityHint: optionalText(entityHint),
      occurredAt: occurredAtIso,
      symptom: optionalText(symptom),
    });

    if (!parsedRequest.success) {
      setState({
        kind: 'validation-error',
        message: parsedRequest.error.issues[0]?.message ?? 'Check the incident details.',
      });
      return;
    }

    setState({ kind: 'submitting' });

    try {
      const response = await fetch(`${apiBaseUrl}/incidents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsedRequest.data),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!incidentRequestGuard.current.isCurrent(requestId)) {
        return;
      }

      if (!response.ok) {
        const parsedError = ApiErrorSchema.safeParse(body);
        setState({
          kind: 'api-error',
          message: parsedError.success
            ? parsedError.data.error.message
            : 'The investigation service rejected the request.',
        });
        return;
      }

      const parsedResponse = IncidentAcceptedResponseSchema.safeParse(body);
      if (!parsedResponse.success) {
        setState({
          kind: 'api-error',
          message: 'The investigation service returned an unexpected response.',
        });
        return;
      }

      await retrieveIncident(parsedResponse.data, requestId, controller);
    } catch {
      if (!controller.signal.aborted && incidentRequestGuard.current.isCurrent(requestId)) {
        setState({
          kind: 'api-error',
          message: 'The investigation service is unavailable. Try again shortly.',
        });
      }
    }
  }

  const isBusy = state.kind === 'submitting' || state.kind === 'processing';
  const selectedScenario = getScenarioSelectionSource(scenarioSelection);

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Data Incident Investigator</p>
        <h1>
          Trace the change. <span>Prove the impact.</span>
        </h1>
        <p className="lede">
          Turn a broken metric or dashboard into an auditable incident report: factual metadata,
          bounded lineage, transparent confidence, supported blast radius, and safe human next
          steps.
        </p>
        <ul className="hero-proof-list" aria-label="Product boundaries">
          <li>DataHub OSS + MCP</li>
          <li>7 incident playbooks</li>
          <li>Read-only by design</li>
          <li>Zero hidden model calls</li>
        </ul>
      </header>

      <MetadataSourceStatus health={metadataHealth} />
      <InvestigationFlow />

      {(() => {
        const metadataExplorer = (
          <section className="metadata-search-panel" aria-labelledby="metadata-search-heading">
            <div className="metadata-search-copy">
              <p className="step-label">Optional metadata explorer</p>
              <h2 id="metadata-search-heading">Find an entity</h2>
              <p>
                Search the active source without opening entity details or changing production data.
              </p>
            </div>
            <form className="metadata-search-form" onSubmit={submitMetadataSearch} noValidate>
              <div className="field metadata-query-field">
                <label htmlFor="metadata-query">Metadata query</label>
                <input
                  id="metadata-query"
                  name="metadataQuery"
                  type="search"
                  minLength={2}
                  maxLength={200}
                  required
                  value={metadataQuery}
                  onChange={(event) => setMetadataQuery(event.target.value)}
                  placeholder="revenue"
                />
              </div>
              <div className="field">
                <label htmlFor="metadata-entity-type">Entity type</label>
                <select
                  id="metadata-entity-type"
                  name="metadataEntityType"
                  value={metadataEntityType}
                  onChange={(event) => setMetadataEntityType(event.target.value as EntityKind | '')}
                >
                  <option value="">All supported types</option>
                  <option value="dataset">Dataset</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="chart">Chart</option>
                  <option value="pipeline">Pipeline</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="metadata-result-limit">Result limit</label>
                <select
                  id="metadata-result-limit"
                  name="metadataResultLimit"
                  value={metadataResultLimit}
                  onChange={(event) => setMetadataResultLimit(Number(event.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
              <button type="submit" disabled={metadataSearchState.kind === 'loading'}>
                {metadataSearchState.kind === 'loading' ? 'Searching…' : 'Search metadata'}
              </button>
            </form>
            <fieldset
              className="metadata-lineage-controls"
              disabled={metadataLineageState.kind === 'loading'}
            >
              <legend>Lineage bounds</legend>
              <div className="field">
                <label htmlFor="metadata-lineage-depth">Depth</label>
                <select
                  id="metadata-lineage-depth"
                  value={metadataLineageDepth}
                  onChange={(event) => setMetadataLineageDepth(Number(event.target.value))}
                >
                  <option value={1}>1 hop</option>
                  <option value={2}>2 hops</option>
                  <option value={3}>3 hops</option>
                  <option value={5}>5 hops</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="metadata-lineage-max-nodes">Node limit</label>
                <select
                  id="metadata-lineage-max-nodes"
                  value={metadataLineageMaxNodes}
                  onChange={(event) => setMetadataLineageMaxNodes(Number(event.target.value))}
                >
                  <option value={3}>3 nodes</option>
                  <option value={8}>8 nodes</option>
                  <option value={12}>12 nodes</option>
                  <option value={25}>25 nodes</option>
                </select>
              </div>
            </fieldset>
            <fieldset
              className="metadata-recent-changes-controls"
              disabled={metadataRecentChangesState.kind === 'loading'}
            >
              <legend>Recent-change bounds</legend>
              <div className="field">
                <label htmlFor="metadata-recent-changes-window">Time window</label>
                <select
                  id="metadata-recent-changes-window"
                  value={metadataRecentChangesWindow}
                  onChange={(event) => setMetadataRecentChangesWindow(Number(event.target.value))}
                >
                  <option value={24}>24 hours</option>
                  <option value={168}>7 days</option>
                  <option value={720}>30 days</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="metadata-recent-changes-limit">Change limit</label>
                <select
                  id="metadata-recent-changes-limit"
                  value={metadataRecentChangesLimit}
                  onChange={(event) => setMetadataRecentChangesLimit(Number(event.target.value))}
                >
                  <option value={3}>3 changes</option>
                  <option value={10}>10 changes</option>
                  <option value={20}>20 changes</option>
                </select>
              </div>
            </fieldset>
            <MetadataSearchResults
              headingRef={metadataSearchHeading}
              lineageLoading={metadataLineageState.kind === 'loading'}
              onRequestLineage={(result, direction) => {
                void requestMetadataLineage(result, direction);
              }}
              onRequestRecentChanges={(result) => {
                void requestMetadataRecentChanges(result);
              }}
              recentChangesLoading={metadataRecentChangesState.kind === 'loading'}
              state={metadataSearchState}
            />
            <MetadataLineageResults
              headingRef={metadataLineageHeading}
              onRequestRecentChanges={(node) => {
                void requestMetadataRecentChanges(node);
              }}
              recentChangesLoading={metadataRecentChangesState.kind === 'loading'}
              state={metadataLineageState}
            />
            <MetadataRecentChangesResults
              headingRef={metadataRecentChangesHeading}
              state={metadataRecentChangesState}
            />
          </section>
        );

        const incidentPanel = (
          <section className="incident-panel" aria-labelledby="incident-heading">
            <div className="panel-heading">
              <div>
                <p className="step-label">New investigation</p>
                <h2 id="incident-heading">What changed?</h2>
              </div>
            </div>

            <form onSubmit={submitIncident} noValidate>
              <CanonicalScenarioSelector
                selection={scenarioSelection}
                onSelect={selectCanonicalScenario}
                onReset={() => selectCanonicalScenario('manual')}
              />

              <details
                className="incident-details"
                open={scenarioSelection.kind === 'manual' || scenarioSelection.kind === 'custom'}
              >
                <summary>
                  <span>Review or customize incident details</span>
                  <small>
                    {selectedScenario
                      ? `${selectedScenario.title} · every field remains editable`
                      : 'Manual question, entity, time, and symptom'}
                  </small>
                </summary>
                <div className="incident-details-content">
                  <div className="field field-wide">
                    <label htmlFor="question">
                      Incident question <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="question"
                      name="question"
                      rows={4}
                      required
                      minLength={3}
                      maxLength={2000}
                      value={question}
                      onChange={(event) => {
                        setQuestion(event.target.value);
                        markIncidentFormCustom();
                      }}
                      aria-describedby="question-help"
                      placeholder="Why did revenue drop unexpectedly today?"
                    />
                    <span className="field-help" id="question-help">
                      Ask one focused question about the incident.
                    </span>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="entity-hint">Dataset or dashboard</label>
                      <input
                        id="entity-hint"
                        name="entityHint"
                        type="text"
                        maxLength={500}
                        value={entityHint}
                        onChange={(event) => {
                          setEntityHint(event.target.value);
                          markIncidentFormCustom();
                        }}
                        placeholder="analytics.daily_revenue"
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="occurred-at">Occurrence time</label>
                      <input
                        id="occurred-at"
                        name="occurredAt"
                        type="datetime-local"
                        value={occurredAt}
                        onChange={(event) => {
                          setOccurredAt(event.target.value);
                          markIncidentFormCustom();
                        }}
                      />
                    </div>
                  </div>

                  <div className="field field-wide">
                    <label htmlFor="symptom">Observed symptom</label>
                    <textarea
                      id="symptom"
                      name="symptom"
                      rows={3}
                      maxLength={2000}
                      value={symptom}
                      onChange={(event) => {
                        setSymptom(event.target.value);
                        markIncidentFormCustom();
                      }}
                      placeholder="Revenue is 42% below the seven-day baseline."
                    />
                  </div>
                </div>
              </details>

              <div className="submission-row">
                <button className="primary-investigation-action" type="submit" disabled={isBusy}>
                  {isBusy ? 'Investigation in progress…' : 'Start investigation'}
                </button>
                <p className="privacy-note">
                  Read-only investigation · recommendations remain unexecuted.
                </p>
              </div>
            </form>

            <p
              className="submission-announcement"
              role={
                state.kind === 'failed' ||
                state.kind === 'validation-error' ||
                state.kind === 'api-error'
                  ? 'alert'
                  : 'status'
              }
              aria-live={
                state.kind === 'failed' ||
                state.kind === 'validation-error' ||
                state.kind === 'api-error'
                  ? 'assertive'
                  : 'polite'
              }
              aria-atomic="true"
            >
              {getSubmissionAnnouncement(state)}
            </p>
            <div className="submission-status">
              {state.kind === 'idle' && (
                <p className="status-neutral">Ready for an incident question.</p>
              )}
              {state.kind === 'submitting' && (
                <p className="status-progress">Creating the incident…</p>
              )}
              {state.kind === 'processing' && <ProcessingStatus incident={state.incident} />}
              {state.kind === 'completed' && (
                <CompletedReport headingRef={terminalResultHeading} incident={state.incident} />
              )}
              {state.kind === 'degraded' && (
                <DegradedInvestigation
                  headingRef={terminalResultHeading}
                  incident={state.incident}
                />
              )}
              {state.kind === 'failed' && (
                <FailedInvestigation headingRef={terminalResultHeading} incident={state.incident} />
              )}
              {(state.kind === 'validation-error' || state.kind === 'api-error') && (
                <p className="status-error">
                  <strong>
                    {state.kind === 'validation-error'
                      ? 'Check your incident details.'
                      : 'Request failed.'}
                  </strong>{' '}
                  {state.message}
                </p>
              )}
            </div>
          </section>
        );

        return (
          <>
            {incidentPanel}
            {metadataExplorer}
          </>
        );
      })()}
    </main>
  );
}
