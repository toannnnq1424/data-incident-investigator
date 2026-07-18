import { useState, type FormEvent } from 'react';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  type IncidentAcceptedResponse,
  type IncidentRetrievalResponse,
} from '@dii/shared-types';

type CompletedIncident = Extract<IncidentRetrievalResponse, { status: 'completed' }>;

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

export function getCompletedReportContent(incident: CompletedIncident) {
  const topHypothesis = incident.report.hypotheses[0];
  if (!topHypothesis) {
    throw new Error('A completed investigation report must include a ranked hypothesis.');
  }

  return {
    status: incident.status,
    summary: incident.report.summary,
    topHypothesis: topHypothesis.summary,
  };
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
          {state.kind === 'processing' && (
            <div className="status-progress processing-status" role="status">
              <p>Investigation processing</p>
              <span>{state.incident.incidentId}</span>
            </div>
          )}
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
