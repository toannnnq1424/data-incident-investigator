import { useState, type FormEvent } from 'react';
import {
  ApiErrorSchema,
  IncidentAcceptedResponseSchema,
  IncidentRequestSchema,
  type IncidentAcceptedResponse,
} from '@dii/shared-types';

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; incident: IncidentAcceptedResponse }
  | { kind: 'validation-error'; message: string }
  | { kind: 'api-error'; message: string };

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function App() {
  const [question, setQuestion] = useState('');
  const [entityHint, setEntityHint] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [symptom, setSymptom] = useState('');
  const [state, setState] = useState<SubmissionState>({ kind: 'idle' });

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

      setState({ kind: 'success', incident: parsedResponse.data });
    } catch {
      setState({
        kind: 'api-error',
        message: 'The investigation service is unavailable. Try again shortly.',
      });
    }
  }

  const isSubmitting = state.kind === 'submitting';

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
          <span className="mode-pill">Fixture-ready</span>
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
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Starting investigation…' : 'Start investigation'}
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
              Creating the incident and preparing the investigation…
            </p>
          )}
          {state.kind === 'success' && (
            <div className="status-success" role="status">
              <p>Investigation accepted</p>
              <dl>
                <div>
                  <dt>Incident ID</dt>
                  <dd>{state.incident.incidentId}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{state.incident.status}</dd>
                </div>
              </dl>
            </div>
          )}
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
