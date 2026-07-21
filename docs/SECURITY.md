# Security

## Secrets

Never commit tokens, API keys, cookies, private endpoints, or `.env` files. `.env.example` contains only
names and safe defaults. Credentials posted in chat are compromised and must be revoked/rotated before
use.

Stitch uses `STITCH_API_KEY` through `env_http_headers`; DataHub and model credentials are process
environment variables. Logs must redact authorization headers, tokens, and full provider error bodies.

## Input and resource controls

- Validate all request and model output schemas.
- Limit request body and text lengths.
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
- Apply basic public rate limiting before deployment.
- Do not render provider HTML or model-generated HTML.

## External systems

Treat DataHub, model, Stitch, browser, and uploaded content as untrusted. Use least-privilege credentials
and read-only DataHub access for the MVP. The application recommends actions but never modifies
production pipelines.

## Logging

Use structured event names, incident IDs, durations, counts, and sanitized error classes. Avoid raw user
payloads where not needed. Never log environment variables or authorization material.

## Reporting

For a suspected vulnerability, avoid public issue details until impact is understood. Contact the
repository owner privately and include reproduction scope, affected revision, and suggested mitigation.
