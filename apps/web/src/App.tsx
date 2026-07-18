import { useState, type FormEvent, type ReactNode } from 'react';
import {
  ApiErrorSchema,
  type EntityRef,
  type Evidence,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  type IncidentAcceptedResponse,
  type IncidentRetrievalResponse,
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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const retrievalAttempts = 30;
const retrievalDelayMs = 100;

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

      <section className="incident-panel" aria-labelledby="incident-heading">
        <div className="panel-heading">
          <div>
            <p className="step-label">New investigation</p>
            <h2 id="incident-heading">What changed?</h2>
          </div>
          <span className="mode-pill">Fixture mode</span>
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
