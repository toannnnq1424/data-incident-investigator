# Security

## Secrets

Never commit tokens, API keys, cookies, private endpoints, or `.env` files. `.env.example` contains only
names and safe defaults. Credentials posted in chat are compromised and must be revoked/rotated before
use.

Stitch uses `STITCH_API_KEY` through `env_http_headers`; DataHub and model credentials are process
environment variables. Logs must redact authorization headers, tokens, and full provider error bodies.

## Input and resource controls

- Validate all request and model output schemas.
- Limit raw JSON bodies to 65,536 bytes by default; validate `MAX_REQUEST_BODY_BYTES` at startup and
  return fixed `413 PAYLOAD_TOO_LARGE` without reflecting the body, headers, or configured value.
- Normalize public human text by replacing C0/C1 controls, collapsing whitespace, trimming, and then
  applying length bounds. Strict request objects reject unknown fields, and incident polling requires a
  schema-valid UUID path.
- Validate runtime limits before server startup. Defaults are eight agent steps, twelve tool calls,
  lineage depth three, thirty entities per query, two retries, a ninety-second agent/request deadline,
  and 65,536 serialized output bytes; operation-specific shared schemas may impose lower caps.
- Count only executed stages/provider calls and unique validated lineage URNs. A configured limit
  terminates with a stable safe reason and no completed report; current workflows perform zero retries
  and zero model calls.
- Keep provider-owned timeout distinct from total-deadline exhaustion. A bounded provider timeout uses
  `provider_timeout`/`METADATA_TIMEOUT`; `duration_limit_reached` is emitted only when the monotonic total
  budget snapshot proves the configured deadline was exceeded. Neither response includes raw provider
  errors or payloads.
- Apply the process-local fixed-window limiter to the four public POST routes. Defaults are 60 requests
  per 60 seconds; `429 RATE_LIMIT_EXCEEDED` includes only an integer `Retry-After`. Health and polling
  are exempt. The limiter does not claim client/IP, proxy, distributed, or durable enforcement.
- Convert external display metadata to bounded plain text before contract output. Strip controls, HTML
  tags/angle delimiters, Markdown link/image destinations, and Markdown control delimiters; render only
  React text nodes. Never use `dangerouslySetInnerHTML` or an implicit Markdown renderer.
- Label and JSON-quote external change summaries as evidence, never instructions. Prompt-like metadata
  cannot change system/tool policy, authorization, runtime settings, scoring, or credential access.
- Parse structured runner/model-boundary output with `InvestigationDraftReportSchema` before any
  downstream use. A draft may carry factual
  evidence references and only fixed pending `not_scored` confidence. Any numeric/model-authored score,
  band, factor, explanation, or unknown confidence field is malformed. The API alone creates the public
  `InvestigationReportSchema` after deterministic scoring or a fixed final not-scored reason. Malformed
  output gets at most `MAX_RETRIES` additional schema-checked attempts, then terminates degraded with
  factual retry metadata, no report, and no raw output.
- Treat confidence as a public deterministic evidence assessment, never model certainty or private
  reasoning. Formula version, weights, caps, thresholds, factor/reason allowlists, and explanation
  templates are code-owned. Every positive/contradictory factor reference resolves to response evidence
  or validated suspicious signals; unsupported references reject scoring. Missing/truncated evidence
  cannot increase a score, repeated evidence/category input cannot increase source diversity, and
  operator/environment values cannot tune the formula. An evidence ID may be provenance for distinct
  factual dimensions, but is counted once per component and never as multiple independent sources.
- Preserve only schema-validated context facts after a failure. Public operation identity is restricted
  to health, entity search, lineage, recent changes, model provider, or structured output. Degraded
  errors/warnings/next steps use fixed allowlists; they never include provider/model payloads, URLs,
  sensitive hostnames, configuration values, credentials, exceptions, stacks, or private reasoning.
- Never switch DataHub mode to fixture implicitly. DataHub failure may return an explicit
  `continue_fixture_mode` step with literal `not_executed`; the credential-free fixture runs only after
  an explicit fixture-mode request/environment choice.
- Keep liveness dependency-free and content-minimal. Readiness may call only the selected mode's
  allowlisted bounded health seams, returns fixed check names/status/reason codes, and never echoes a
  configured endpoint, token, authorization header, environment value, internal hostname, provider or
  model body/message, exception, stack, uptime, or retry history. A readiness failure must not change
  mode, liveness, or incident state.
- Fixture asset parsing failure must not expose parser issues or partially trusted fixture data. It
  produces a safe unavailable adapter and `FIXTURE_ASSETS_INVALID`. The current workflow performs zero
  model calls, so readiness records model as `not_required` without reading model credentials; it must
  not fabricate provider availability. DataHub readiness separately requires the existing local
  investigation runtime/assets so external provider availability alone cannot produce a false ready
  claim.
- Treat the investigation event trail as a public allowlisted product contract, not a debug trace or
  reasoning transcript. Record only sequence-derived IDs, public UTC timestamps, fixed observable
  action/warning/termination summaries, exact report evidence IDs, and terminal duration. Never record
  the raw question, prompt/system policy, hidden chain-of-thought/private reasoning, tool arguments,
  URNs, external descriptions/tags/comments, token counts, credentials, provider/model payloads,
  hostnames, exceptions, or stacks. Schema validation rejects arbitrary summaries, unresolved evidence
  references, duplicate/missing terminal events, and events after termination. The bounded process-local
  trail is returned to the user; it is not copied into a new log, telemetry, analytics, tracing, or
  persistence backend.
- Keep confidence breakdown out of the activity trail and operational logs. The web may render the
  public score, band, reason codes, template explanation, and resolved references from the report, but
  activity events retain only their existing observable action summary and evidence IDs. Neither path
  accepts raw question/metadata prose, model explanation, chain-of-thought, or private reasoning.
- Treat blast radius as validated lineage output, not generated prose or causal certainty. Derive roots
  only from resolved scored-hypothesis source evidence; traverse only schema-valid downstream edges;
  enforce existing depth/entity/tool/deadline bounds; and preserve explicit unknown, unavailable, or
  partial coverage. Every impact must retain a bounded path plus resolved report evidence provenance.
  Sanitize provider labels before API/UI output, emit only code-owned explanations/reason codes, never
  log raw graph metadata, and never silently replace a DataHub failure with fixture reach.

## External systems

Treat DataHub, model, Stitch, browser, and uploaded content as untrusted. Use least-privilege credentials
and read-only DataHub access for the MVP. The application recommends actions but never modifies
production pipelines.

## Logging

Use structured event names, route patterns, incident IDs, durations, counts, normalized termination
reasons, retry delay, and sanitized error classes. Never log a raw request body, incident question,
authorization or content-length header, token, provider/model payload, environment variable, credential,
exception message, or stack.

Readiness logs contain only the selected mode and allowlisted reason codes. Liveness logs no dependency
state. Provider-supplied readiness messages and rejected fixture/model values are never logged.

Investigation activity is not backend logging. Existing structured logs continue to contain only the
sanitized operational fields above and do not serialize `eventTrail` or its evidence references.

## Reporting

For a suspected vulnerability, avoid public issue details until impact is understood. Contact the
repository owner privately and include reproduction scope, affected revision, and suggested mitigation.
