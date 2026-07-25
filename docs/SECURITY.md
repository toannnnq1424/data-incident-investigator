# Security

## Secrets

Never commit tokens, API keys, cookies, private endpoints, or `.env` files. `.env.example` contains only
names and safe defaults. Credentials posted in chat are compromised and must be revoked/rotated before
use.

Stitch uses `STITCH_API_KEY` through `env_http_headers`; DataHub and model credentials are process
environment variables. The DataHub MCP client accepts a bearer secret only through `DATAHUB_TOKEN`;
it never places a secret in a URL or tool argument. Logs must redact authorization headers, tokens,
endpoints, and full provider error bodies.

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
- Treat `datahub-mcp` as a separate fail-closed provider boundary. Startup requires an absolute
  HTTP(S) `DATAHUB_MCP_URL` without URL credentials/query/fragment and an explicit `none` or `bearer`
  auth mode. `none` rejects a supplied token; `bearer` requires one and rejects every non-HTTPS URL
  before transport creation. The application uses only Streamable HTTP, never launches
  stdio/`uvx`/Python/shell processes, and never performs interactive OAuth or token-URL exchange.
- Advertise no MCP client capabilities and allow only official read-only `search` and `get_lineage`.
  Before any call, require exactly one definition of each, `readOnlyHint: true`, object input schemas,
  required string `query`/`urn`, and compatible types for every sent parameter: integer
  `num_results`/`offset`, boolean `upstream`, and integer `max_hops`/`max_results`. Never dispatch a
  model-selected/arbitrary name or any mutation, user, document, sampling, elicitation, root, file,
  network-proxy, or shell capability.
- Enforce a 100–30,000 ms request timeout and a 1 KiB–1 MiB response bound in the injected
  Streamable HTTP fetch. Reject an invalid or over-limit `Content-Length` before reading; when a JSON
  or SSE response is chunked or its declared length is absent/inaccurate, count bytes incrementally
  and cancel/abort on the first byte over the configured limit. Cap the parsed protocol object again
  as defense in depth, then apply the stricter existing search, entity, depth, node, and edge
  contracts.
- Give each investigation run one total-deadline `AbortController` and propagate its signal through
  health, search, lineage, and recent-changes adapter calls. Reaching `duration_limit_reached` aborts
  the in-flight MCP request and prevents later provider-cache, network-sequence, lineage-count, or
  tool-budget mutation after the terminal snapshot.
- Accept MCP tool output only from schema-valid structured content or one JSON text item. Reject mixed
  media/content, provider error content, oversized payloads, unsupported entity kinds, malformed
  lineage, and unexpected/missing required tools. Search/lineage payload schema failures normalize to
  `invalid_response`, not provider unavailability. When a compact multi-hop response cannot
  reconstruct exact intermediate edges, mark coverage truncated and never fabricate a path. Sanitize
  every provider display value before evidence/report use. Tool text is untrusted data, never
  instructions.
- The official MCP Server currently has no recent-changes/timeline tool. Resolve that operation as the
  explicit `recent_changes_unsupported` capability gap with zero change evidence and zero hidden
  GraphQL fallback. Do not relabel the in-memory MCP protocol fixture as live provider validation.
- Keep liveness dependency-free and content-minimal. Readiness may call only the selected mode's
  allowlisted bounded health seams, returns fixed check names/status/reason codes, and never echoes a
  configured endpoint, token, authorization header, environment value, internal hostname, provider or
  model body/message, exception, stack, uptime, or retry history. A readiness failure must not change
  mode, liveness, or incident state.
- Fixture asset parsing failure must not expose parser issues or partially trusted fixture data. It
  produces a safe unavailable adapter and `FIXTURE_ASSETS_INVALID`. The current workflow performs zero
  model calls, so readiness records model as `not_required` without reading model credentials; it must
  not fabricate provider availability. Direct GraphQL readiness separately requires the existing
  local investigation runtime/assets. MCP readiness performs bounded read-only tool discovery against
  the exact selected MCP adapter and never probes a different provider or credential.
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
- Treat Markdown export as a second presentation trust boundary after terminal public-response
  validation. The code-owned renderer must neutralize Markdown/HTML/list/table/code-fence syntax,
  controls and bidi controls, unsafe URL schemes, credential-like assignments/tokens, internal hosts,
  and stack locations in every dynamic value. Emit only renderer-owned ordinal internal anchors; never
  preserve an external link or accept Markdown/filename/export metadata from a runner/model. Use the
  complete UUID as the deterministic filename collision suffix, enforce ASCII traversal/device/control/
  header safety and a fixed length bound, return `no-store`/`nosniff`, and never persist the attachment.

## Dependency hygiene

Use the tracked bootstrap and frozen lockfile for checkpoint and CI installs. Production dependency
audits must be clean before a security/readiness phase closes. A workspace override is acceptable only
for the smallest advisory-specific patched transitive range, with lockfile integrity, resolved-version
inspection, targeted affected validation, and a recorded removal path when the direct dependency adopts
the patch. The Phase 6 checkpoint applies this rule only to vulnerable `fast-uri` 3.1.3/4.1.0
resolutions, pinning the patched 3.1.4/4.1.1 releases accepted by their existing parent ranges.

Phase 8.2 pins official `@modelcontextprotocol/sdk@1.29.0`. Its declared
`@hono/node-server ^1.19.9` server-only transitive line is affected by
`GHSA-frvp-7c67-39w9` on Windows even though this application imports only MCP client modules and
never serves Hono static files. `2.0.5` fixed that issue but remained affected by WebSocket-handshake
DoS `GHSA-9mqv-5hh9-4cgg`; the smallest audit-clean lock override therefore pins
`@modelcontextprotocol/sdk>@hono/node-server` to patched `2.0.10`. Remove the override when the pinned
SDK directly accepts a patched range, after repeating frozen install, MCP client tests/build, and
the production audit.

## External systems

Treat DataHub, MCP servers/tool descriptions/tool output, model, Stitch, browser, and uploaded content
as untrusted. Use least-privilege credentials and read-only DataHub access for the MVP. The
application recommends actions but never modifies production pipelines.

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
