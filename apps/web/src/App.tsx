import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import {
  ApiErrorSchema,
  METADATA_LINEAGE_DEFAULT_DEPTH,
  METADATA_LINEAGE_DEFAULT_MAX_NODES,
  type EntityKind,
  type EntityRef,
  type Evidence,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  type IncidentAcceptedResponse,
  type IncidentRetrievalResponse,
  MetadataEntitySearchRequestSchema,
  MetadataEntitySearchResponseSchema,
  type MetadataEntitySearchResponse,
  MetadataHealthResponseSchema,
  type MetadataHealthResponse,
  type MetadataLineageDirection,
  MetadataLineageRequestSchema,
  MetadataLineageResponseSchema,
  type MetadataLineageResponse,
} from '@dii/shared-types';

type CompletedIncident = Extract<IncidentRetrievalResponse, { status: 'completed' }>;
type ReportInference = CompletedIncident['report']['hypotheses'][number] & {
  confidenceLabel: string;
};

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'processing'; incident: IncidentAcceptedResponse }
  | { kind: 'completed'; incident: CompletedIncident }
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

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
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

  const sourceLabel = health.mode === 'fixture' ? 'Fixture metadata' : 'DataHub metadata';
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
  state,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  lineageLoading: boolean;
  onRequestLineage: (
    result: MetadataEntitySearchResponse['results'][number],
    direction: MetadataLineageDirection,
  ) => void;
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
                aria-label={`Lineage actions for ${result.name}`}
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
  state,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
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
    facts: incident.report.evidence,
    lineageEvidence: incident.report.evidence.filter((evidence) => evidence.category === 'lineage'),
    inferences: incident.report.hypotheses.map((hypothesis) => ({
      ...hypothesis,
      confidenceLabel: formatConfidence(hypothesis.confidence),
    })),
    recommendations: incident.report.recommendations,
    assumptions: incident.report.assumptions,
    missingInformation: incident.report.missingInformation,
  };
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

function EvidenceList({ evidence, emptyMessage }: { evidence: Evidence[]; emptyMessage: string }) {
  if (evidence.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ol className="evidence-list">
      {evidence.map((item) => (
        <li key={item.id}>
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
            <strong>{hypothesis.confidenceLabel} confidence</strong>
          </div>
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

function ProcessingStatus({ incident }: { incident: IncidentAcceptedResponse }) {
  return (
    <div className="status-progress processing-status" role="status">
      <p>Investigation processing</p>
      <span>{incident.incidentId}</span>
      <EmptyState message="Report details will appear after fixture evidence is gathered." />
    </div>
  );
}

export function CompletedReport({ incident }: { incident: CompletedIncident }) {
  const content = getCompletedReportContent(incident);

  return (
    <div className="status-success completed-report" role="status">
      <p>Investigation completed</p>
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
      <section className="report-summary" aria-labelledby="report-summary-heading">
        <p className="report-label">Incident report</p>
        <h3 id="report-summary-heading">Summary</h3>
        <p>{content.summary}</p>
        <h4>Top ranked hypothesis</h4>
        <p>{content.topHypothesis}</p>
      </section>
      <div className="report-detail-grid">
        <ReportSection id="related-entities-heading" label="Entity impact" title="Related entities">
          <EntityList entities={content.relatedEntities} />
        </ReportSection>

        <ReportSection id="facts-heading" label="Facts" title="Evidence">
          <EvidenceList evidence={content.facts} emptyMessage="No factual evidence was returned." />
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

export function App() {
  const [question, setQuestion] = useState('');
  const [entityHint, setEntityHint] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [symptom, setSymptom] = useState('');
  const [state, setState] = useState<SubmissionState>({ kind: 'idle' });
  const [metadataHealth, setMetadataHealth] = useState<MetadataHealthState>(undefined);
  const [metadataQuery, setMetadataQuery] = useState('');
  const [metadataEntityType, setMetadataEntityType] = useState<EntityKind | ''>('');
  const [metadataResultLimit, setMetadataResultLimit] = useState(10);
  const [metadataLineageDepth, setMetadataLineageDepth] = useState(METADATA_LINEAGE_DEFAULT_DEPTH);
  const [metadataLineageMaxNodes, setMetadataLineageMaxNodes] = useState(
    METADATA_LINEAGE_DEFAULT_MAX_NODES,
  );
  const [metadataSearchState, setMetadataSearchState] = useState<MetadataSearchState>({
    kind: 'idle',
  });
  const [metadataLineageState, setMetadataLineageState] = useState<MetadataLineageState>({
    kind: 'idle',
  });
  const metadataSearchAbort = useRef<AbortController | null>(null);
  const metadataLineageAbort = useRef<AbortController | null>(null);
  const metadataSearchHeading = useRef<HTMLHeadingElement>(null);
  const metadataLineageHeading = useRef<HTMLHeadingElement>(null);
  const metadataSearchGuard = useRef(createLatestRequestGuard());
  const metadataLineageGuard = useRef(createLatestRequestGuard());

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

  async function submitMetadataSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    metadataSearchAbort.current?.abort();
    metadataLineageAbort.current?.abort();
    metadataLineageGuard.current.begin();
    setMetadataLineageState({ kind: 'idle' });
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

  async function retrieveIncident(acceptedIncident: IncidentAcceptedResponse) {
    for (let attempt = 0; attempt < retrievalAttempts; attempt += 1) {
      const response = await fetch(`${apiBaseUrl}/incidents/${acceptedIncident.incidentId}`);
      const body: unknown = await response.json();

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

      setState({ kind: 'processing', incident: acceptedIncident });
      await delay(retrievalDelayMs);
    }

    setState({
      kind: 'api-error',
      message: 'The investigation is still processing. Try again shortly.',
    });
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      });
      const body: unknown = await response.json();

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

      setState({ kind: 'processing', incident: parsedResponse.data });
      await retrieveIncident(parsedResponse.data);
    } catch {
      setState({
        kind: 'api-error',
        message: 'The investigation service is unavailable. Try again shortly.',
      });
    }
  }

  const isBusy = state.kind === 'submitting' || state.kind === 'processing';

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Metadata · Lineage · Evidence</p>
        <h1>Data Incident Investigator</h1>
        <p className="lede">
          Describe a suspicious data change. The investigator will trace the relevant entities and
          build an evidence-backed report.
        </p>
      </header>

      <MetadataSourceStatus health={metadataHealth} />

      <section className="metadata-search-panel" aria-labelledby="metadata-search-heading">
        <div className="metadata-search-copy">
          <p className="step-label">Metadata lookup</p>
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
        <MetadataSearchResults
          headingRef={metadataSearchHeading}
          lineageLoading={metadataLineageState.kind === 'loading'}
          onRequestLineage={(result, direction) => {
            void requestMetadataLineage(result, direction);
          }}
          state={metadataSearchState}
        />
        <MetadataLineageResults headingRef={metadataLineageHeading} state={metadataLineageState} />
      </section>

      <section className="incident-panel" aria-labelledby="incident-heading">
        <div className="panel-heading">
          <div>
            <p className="step-label">New investigation</p>
            <h2 id="incident-heading">What changed?</h2>
          </div>
        </div>

        <form onSubmit={submitIncident} noValidate>
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
              onChange={(event) => setQuestion(event.target.value)}
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
                onChange={(event) => setEntityHint(event.target.value)}
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
                onChange={(event) => setOccurredAt(event.target.value)}
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
              onChange={(event) => setSymptom(event.target.value)}
              placeholder="Revenue is 42% below the seven-day baseline."
            />
          </div>

          <div className="submission-row">
            <button type="submit" disabled={isBusy}>
              {isBusy ? 'Investigation in progress…' : 'Start investigation'}
            </button>
            <p className="privacy-note">No production data is modified.</p>
          </div>
        </form>

        <div className="submission-status" aria-live="polite" aria-atomic="true">
          {state.kind === 'idle' && (
            <p className="status-neutral">Ready for an incident question.</p>
          )}
          {state.kind === 'submitting' && (
            <p className="status-progress" role="status">
              Creating the incident…
            </p>
          )}
          {state.kind === 'processing' && <ProcessingStatus incident={state.incident} />}
          {state.kind === 'completed' && <CompletedReport incident={state.incident} />}
          {(state.kind === 'validation-error' || state.kind === 'api-error') && (
            <p className="status-error" role="alert">
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
    </main>
  );
}
