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
- Parse structured runner/model-boundary output with `InvestigationReportSchema` before any downstream
  use. Malformed output fails closed with a sanitized internal error and no report; repair/degradation
  orchestration is deferred to Slice 6.3.

## External systems

Treat DataHub, model, Stitch, browser, and uploaded content as untrusted. Use least-privilege credentials
and read-only DataHub access for the MVP. The application recommends actions but never modifies
production pipelines.

## Logging

Use structured event names, route patterns, incident IDs, durations, counts, normalized termination
reasons, retry delay, and sanitized error classes. Never log a raw request body, incident question,
authorization or content-length header, token, provider/model payload, environment variable, credential,
exception message, or stack.

## Reporting

For a suspected vulnerability, avoid public issue details until impact is understood. Contact the
repository owner privately and include reproduction scope, affected revision, and suggested mitigation.
