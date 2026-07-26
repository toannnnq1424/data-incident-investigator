# Deployment

## Supported target and current boundary

The supported release target is a generic Node.js host with Node `24` or newer and pnpm `11.9.0`.
The release artifact itself is built with Node `24.14.0` and pnpm `11.9.0`. Fixture mode is the
credential-free deployment and demo path. Direct GraphQL and DataHub MCP Server modes use the same
host layout but are ready only when their selected authorized, read-only external dependency passes
the bounded readiness check.

The repository has no supported Docker image, Compose file, Kubernetes manifest, cloud-provider
configuration, public URL, TLS termination, or managed persistent store. Do not infer those targets
from this host runbook or add guessed credentials/endpoints. Phase 7.6 does not deploy externally.

## Release artifact contract

From a clean exact Git commit, run:

```powershell
pnpm release:artifact
```

The command checks the exact build toolchain and aligns all seven private manifest versions. Before
the build, it preflights and removes only the five artifact-consumed output roots:
`apps/api/dist`, `apps/web/dist`, `packages/agent-core/dist`, `packages/datahub-client/dist`, and
`packages/shared-types/dist`. All roots are validated before any removal; a link, reparse target,
noncanonical path, or out-of-repository resolution aborts without partial cleanup. It then runs the
repository build once with `VITE_API_BASE_URL=/api` and writes these ignored local outputs:

```text
outputs/release/data-incident-investigator-v<VERSION>-<COMMIT12>.tar.gz
outputs/release/data-incident-investigator-v<VERSION>-<COMMIT12>.tar.gz.sha256
```

The deterministic archive contains one equivalently named root directory. Its
`RELEASE-MANIFEST.json` records the full commit/tree, product version, toolchain, runtime contract,
frozen lockfile inventory, and the size and SHA-256 of every other file. The bundle contains:

- built `apps/api/dist/*.js` and the complete `apps/web/dist`;
- the API/web manifests and each runtime workspace's compiled `dist/index.js` plus declaration file;
  the archived copies of the three runtime workspace manifests point only to those compiled files;
- the canonical removed-schema-column metadata and incident fixtures;
- root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, blank `.env.example`, and `LICENSE`;
- deterministic `THIRD_PARTY_NOTICES.txt`, generated from exact positive rendered-module
  contributions in the Vite JavaScript output and their verified installed package legal files;
- this deployment runbook, the rollback/security/known-issue documents, `README.md`, the standalone
  artifact verifier, and its exact path-safety/pnpm-lock identity helpers.

It intentionally excludes `.env`, credentials, `node_modules`, pnpm stores, caches, tests, coverage,
logs, source maps, all runtime/evaluation/dev source, the prompt-injection test fixture, and unrelated
repo files. The builder does not change repository package exports: it deterministically rewrites only
the three archived runtime manifest copies from `src/index.ts` to `dist/index.js`/`dist/index.d.ts`.
`pnpm-lock.yaml` plus the included package manifests remains the dependency inventory; no separately
generated SBOM is claimed. Before the release build, the builder requires the installed pnpm lock to
byte-match the repository lock. Vite then records every output-chunk module and rendered length. The
builder excludes first-party and zero-rendered JavaScript modules, fails closed on unknown virtual or
potential non-JavaScript asset contributions, and maps every positive third-party contribution to an
exact pnpm lock package/snapshot, canonical virtual-store root, package/version, normalized module
and output path, rendered-byte count, source hash, package-manifest hash, declared licence metadata,
and top-level licence/NOTICE evidence. The current exact audit resolves five MIT-declared embedded
packages: `react@19.2.7`, `react-dom@19.2.7`,
`scheduler@0.27.0`, `vite@7.3.6`, and `zod@4.4.3`. Vite is included because its module-preload
polyfill contributes runtime bytes even though Vite itself is a build dependency.

That exact set does not include `abstract-logging@2.0.1`. Its missing package legal file therefore
does not enter the bundled notice: the server build preserves external package imports, and the
archive excludes `node_modules`. It remains a separate production-install/C11 legal-owner caveat.
This engineering inventory and reproduced upstream text are not a compatibility ruling or legal
approval. Phase 8.6 records a qualified owner authorization to distribute only the exact verified
artifact at zero cost and within the synthetic/authorized-data and authorized-API boundary. This
slice does not publish, attach, upload, distribute, or deploy it.

Verify the archive before extraction, supplying the approved full commit and version from release
coordination rather than trusting the filename:

```powershell
pnpm release:verify -- --artifact outputs/release/data-incident-investigator-v<VERSION>-<COMMIT12>.tar.gz `
  --expected-commit <40-CHARACTER-COMMIT> --expected-version <VERSION>
```

The verifier requires the adjacent sidecar, canonical gzip/ustar metadata, a single safe root, only
regular files, exact provenance/naming, and exact manifest membership, sizes, and hashes. Manifest
schema v3 additionally reconstructs every attributed identity from the archived pnpm lock, binds its
canonical virtual-store root, requires the exact third-party mapping/source/legal hashes and legal
text, reconstructs `THIRD_PARTY_NOTICES.txt` byte-for-byte, and requires every attributed bundle path
to be present and hashed. One shared Windows-safe validator rejects reserved devices, ADS, trailing
dots/spaces, control characters, noncanonical separators, case collisions, and absolute/traversal
paths. Canonical lstat/realpath checks reject links, junctions, reparse escapes, unsafe verification
roots, and unsafe archive inputs. The builder publishes archive and sidecar as one rollback-safe
transaction. The verifier also rejects forbidden cache/test paths, more than 500 files, an archive
over 25 MiB, an expanded tar over 50 MiB, and any mismatch. Record the actual byte size from the
exact build as release evidence; these caps are safety bounds, not expected release-size claims.

## Staging and install

Never extract over an active release. Use a new version-and-commit directory owned by the deployment
operator, then verify the extracted tree before installing anything:

```powershell
New-Item -ItemType Directory -Path C:\deploy\dii\staging -Force
tar -xzf <ARTIFACT>.tar.gz -C C:\deploy\dii\staging
Set-Location C:\deploy\dii\staging\data-incident-investigator-v<VERSION>-<COMMIT12>
node scripts\verify-release-artifact.mjs --directory . `
  --expected-commit <40-CHARACTER-COMMIT> --expected-version <VERSION>
pnpm install --prod --frozen-lockfile --ignore-scripts
```

The production install is deliberately outside the artifact and must resolve exactly the included
lockfile. `--ignore-scripts` is the supported least-privilege install for the current production graph.
Abort if pnpm wants to change the lockfile, a package requires an unreviewed install script, or the
host cannot use the pinned package manager.

## Configuration

Set runtime values in the service manager or process environment. A local operator may copy
`.env.example` to ignored `.env` and use Node's `--env-file=.env`; never edit the tracked example or
place a real secret in the artifact.

| Variable                                                                                          | Phase 7.6 behavior                                                                                                               |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `APP_MODE`                                                                                        | API runtime; `fixture` (default), direct GraphQL `datahub`, or `datahub-mcp`.                                                    |
| `API_HOST` / `API_PORT`                                                                           | API listen address/port; defaults `127.0.0.1:3001`. Keep loopback behind a same-host proxy.                                      |
| `DATAHUB_GMS_URL` / `DATAHUB_TOKEN`                                                               | API runtime; required only for `datahub`. Use an authorized read-only token.                                                     |
| `DATAHUB_MCP_URL` / `DATAHUB_MCP_AUTH_MODE`                                                       | Required for `datahub-mcp`; exact Streamable HTTP URL plus explicit `none` or `bearer`; bearer requires HTTPS.                   |
| `DATAHUB_TOKEN` in MCP mode                                                                       | Required only when MCP auth mode is `bearer`; keep it blank when auth mode is `none`.                                            |
| `DATAHUB_MCP_TIMEOUT_MS` / `DATAHUB_MCP_MAX_RESPONSE_BYTES`                                       | MCP request bound (100–30,000 ms), actual JSON/SSE body bound, and parsed-object defense-in-depth bound (1,024–1,048,576 bytes). |
| `MAX_AGENT_STEPS`, `MAX_TOOL_CALLS`, `MAX_LINEAGE_DEPTH`, `MAX_ENTITIES_PER_QUERY`, `MAX_RETRIES` | Validated API runtime bounds; safe defaults are in `.env.example`.                                                               |
| `AGENT_TIMEOUT_SECONDS`, `MAX_MODEL_OUTPUT_BYTES`                                                 | Validated total deadline and output bound.                                                                                       |
| `MAX_REQUEST_BODY_BYTES`, `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_MAX_REQUESTS`                  | Validated process-local ingress limits.                                                                                          |
| `MAX_LINEAGE_ENTITIES`, `INVESTIGATION_TIMEOUT_MS`                                                | Legacy fallbacks only; leave unset when canonical values are set.                                                                |
| `VITE_API_BASE_URL`                                                                               | Web build-time value, fixed to `/api` by `release:artifact`; it is not a runtime setting.                                        |
| `WEB_ORIGIN`                                                                                      | Reserved host/proxy documentation value; the current API does not read it or enable cross-origin access.                         |
| `OPENAI_API_KEY`                                                                                  | Not read by any current investigation mode; no model call is made.                                                               |
| `STITCH_API_KEY`                                                                                  | Developer-tool-only and never a release runtime variable.                                                                        |

Invalid modes, MCP URLs/auth combinations, and numeric limits fail API startup. An MCP URL must be
absolute HTTP(S) and contain no username, password, query, or fragment. Bearer mode additionally
requires `https:`; plaintext HTTP is accepted only with auth mode `none` and a blank token. Do not log
or print DataHub values while diagnosing startup.

## DataHub MCP Server setup

The selected production path is the official MCP SDK v1 `StreamableHTTPClientTransport`. Supply one
endpoint that already exists; the application does not execute `uvx`, Python, a shell, or another
server process.

- For the official open-source server with DataHub Core or Cloud, the operator separately configures
  its documented `DATAHUB_GMS_URL`/`DATAHUB_GMS_TOKEN`, starts
  `mcp-server-datahub --transport http`, and places that server's exact published Streamable HTTP URL
  in this application's `DATAHUB_MCP_URL`. Use `DATAHUB_MCP_AUTH_MODE=none` only across a trusted
  loopback or otherwise protected local boundary. The application enforces the absence of a client
  token in this mode but cannot determine whether a non-loopback network is trusted.
- For managed DataHub Cloud, use the documented
  `https://<tenant>.acryl.io/integrations/ai/mcp/` endpoint, set auth mode `bearer`, and inject an
  authorized PAT or service-account token only as `DATAHUB_TOKEN`.

Interactive OAuth/Dynamic Client Registration, the universal OAuth endpoint, token URLs, the legacy
standalone SSE transport, stdio, and server process management are deliberately outside this
unattended Node service. Streamable HTTP responses may themselves use JSON or SSE. The MCP client
advertises no server capabilities and calls only `search` and `get_lineage`. Readiness requires
exactly one read-only definition of each plus compatible schemas for string `query`/`urn`, integer
`num_results`/`offset`/`max_hops`/`max_results`, and boolean `upstream`. Those sent fields may be
optional, but any additional field the server marks required makes readiness fail because the client
cannot satisfy it. Validated `structuredContent` is used when present and auxiliary content is ignored
and not propagated; without structured content, only one JSON text item is accepted, so mixed/media
fallback content fails. Malformed payload schemas and missing/duplicate/incompatible required tools
fail, while unsupported entity kinds are excluded from normalized results. Existing
entity/lineage/deadline bounds remain authoritative.

The injected fetch rejects an invalid or over-limit `Content-Length` before reading and counts actual
JSON/SSE response bytes incrementally when length is missing or inaccurate. It cancels and aborts on
the first byte over `DATAHUB_MCP_MAX_RESPONSE_BYTES`, then applies the same cap to the parsed protocol
object. The investigation's total deadline propagates through every adapter operation; reaching it
aborts an in-flight MCP request, and terminal budget/cache state cannot be mutated by late completion.

The official MCP server currently exposes no recent-changes/timeline tool. MCP investigations return
an explicit `recent_changes_unsupported` gap and never route that operation through direct GraphQL or
claim MCP change evidence. Fixed requests and fixed provider responses have deterministic code-owned
orchestration/order, but live provider results may change with DataHub state. The in-memory protocol
fixture and local Streamable HTTP harness validate the integration without credentials:

```powershell
pnpm exec vitest run tests\integration\datahub-mcp.test.ts tests\integration\datahub-mcp-http.test.ts
```

A live smoke additionally requires an already-authorized Core/Cloud service and the matching endpoint
and auth environment. Confirm `GET /ready` reports `datahub_mcp: ready`, submit a sanitized test
incident, and verify its evidence before routing traffic. Do not call a protocol fixture a live smoke.

## Web and API topology

Start the API from the extracted release root:

```powershell
node --env-file=.env apps\api\dist\index.js
```

The web output is static. Serve `apps/web/dist` from the chosen host and configure the same origin to
proxy `/api/*` to `http://127.0.0.1:3001/*`, stripping the `/api` prefix. Preserve HTTP method, request
body, response status/content type, `Content-Disposition`, `Cache-Control`, and
`X-Content-Type-Options`. The proxy timeout must exceed the configured API deadline. Terminate TLS and
apply public network controls at that host boundary. Direct cross-origin API use is not supported:
the API has no CORS layer, and `WEB_ORIGIN` is not currently consumed.

Port `5173` is Vite's source-development default, not a production port contract. The production web
port/URL belongs to the operator's static host. The archive does not include or choose that host.

## Health, readiness, and bounded fixture smoke

Use these probes before routing traffic:

- `GET /health`: process liveness only; requires HTTP `200` and exact body `{"status":"ok"}`.
- `GET /ready`: traffic readiness. Fixture requires HTTP `200` with `fixture_assets: ready`. Direct
  GraphQL mode checks `datahub` plus the local investigation runtime. MCP mode checks `datahub_mcp`
  through read-only tool discovery. Either external mode may return sanitized HTTP `503` reason
  codes. The model remains `not_required` in every current flow.

For fixture mode, submit the `request` object from
`fixtures/incidents/removed-schema-column.json` to `POST /incidents`, retain the returned UUID, and
poll `GET /incidents/<UUID>` with a bounded deadline until `completed`. Require a schema-shaped report
with evidence-linked hypotheses. Do not use a production incident or provider payload as smoke data.

Do not restart solely for a transient `/ready` `503` while `/health` remains `200`. Stop routing new
traffic, keep bounded sanitized logs, and follow the rollback/abort conditions instead.

## Startup, shutdown, observability, and state

Start the API under one service manager with stdout/stderr captured under the repository's logging
rules, then start/enable the static host and proxy only after both probes and fixture smoke pass.
Structured API logs may include route patterns, incident IDs, durations, counts, modes, and allowlisted
reason/error codes; they must not include request bodies, questions, endpoints, credentials, provider
payloads, exception messages, or stacks.

For shutdown, remove the release from proxy traffic, allow a bounded drain, send the service manager's
normal termination signal, and require the owned API PID and listener to exit before changing files.
Do not kill by a broad process name or port.

Incident records and reports live only in API process memory. Restart, deploy, or rollback discards
all active/completed incident IDs. There is no database, migration, persistent upload, queue, or
server-side Markdown report store to back up or restore. DataHub access is read-only; the MCP
allowlist excludes every mutation, user, document, shell, and model operation, and the product never
mutates provider state. See [`ROLLBACK.md`](ROLLBACK.md) before replacing an active release.

## Phase 8.6 zero-cost deployment preflight

### Non-billable policy

The owner authorizes only a path that incurs no fee. Stop before any purchase, billing account,
payment method/card, paid quota, metered overage, larger runner, paid storage/package/domain/hosting,
paid DataHub Cloud/API, Codespaces, or trial that can auto-convert. A free tier with material expiry,
card requirement, or unresolved overage behavior is not approved. No service is enabled and no
deployment is performed in Phase 8.6.

Public demo data is limited to checked-in synthetic fixtures and project-owned/generated assets.
Live DataHub may use only an operator-owned/authorized OSS/self-controlled instance or a
challenge-provided endpoint whose permitted use covers the demo. Never deploy with production,
customer, confidential, PII, proprietary metadata, third-party credentials, or a logged/committed
`DATAHUB_TOKEN`. The product remains model-free and does not use `OPENAI_API_KEY`.

### Decision matrix for the current architecture

| Path                                | Static web / Node API / secrets                                                                                 | Persistence and access                                                                                 | Cost/card/expiry evidence                                                                                                                | HTTPS, probes, rollback, and judge result                                                                                                                                    | Disposition                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Public repository clean setup       | Judge runs Vite + Fastify locally in fixture mode; no runtime secret                                            | In-memory incidents reset on restart; repository is already Public and fixture mode is credential-free | Uses the existing Public repo and standard public-repo CI only; no host, card, trial, or paid service                                    | Loopback only, so no public HTTPS app URL; `/health`, `/ready`, fixture smoke, and clean restart are supported; Devpost permits a repository with clear setup as Project URL | **Recommended zero-cost judge path now.** Add a timed clean quickstart in a later authorized docs slice; this is not a deployment |
| GitHub Pages only                   | Can serve `apps/web/dist` HTML/CSS/JS, but cannot run Fastify, proxy same-origin `/api`, or keep server secrets | Static files only; no incident API or server memory                                                    | Official docs say Pages is available for Public repositories on GitHub Free; default `github.io` needs no paid domain                    | `github.io` receives automatic HTTPS, but API health/readiness and end-to-end incident flow are absent; static rollback can select a prior source artifact                   | **Not a functioning deployment of the current product.** Do not enable Pages                                                      |
| Pages web + separate API host       | Static web could be public; Node API and any DataHub secret require another host                                | Split origins; current API has no CORS and the release build expects same-origin `/api`                | No separate host has been proven card-free, non-expiring, and non-metered                                                                | Would require HTTPS API, CORS or a same-origin edge proxy, probes, uptime, and two-part rollback; judges could otherwise see a broken UI                                     | **Blocked** by unselected zero-cost host and out-of-scope runtime/topology change                                                 |
| One full-stack Node host            | Matches the documented static host + same-origin `/api` proxy and can run fixture or authorized live mode       | In-memory only; restart loses incident IDs; live token must be injected server-side                    | No current provider has been selected and proven to require no card, paid quota, auto-converting trial, or material expiry               | Must supply public HTTPS, proxy timeout, `/health`, `/ready`, fixture smoke, bounded logs, immutable prior artifact, and access through judging                              | **Preferred future deployment shape, but currently blocked** pending a separately authorized provider/account/cost verification   |
| Operator-owned/self-controlled host | Can match the full generic Node 24 topology; live mode may reach an authorized DataHub OSS instance             | Operator owns uptime, TLS, network boundary, token storage, and rollback; still no app persistence     | Potentially zero incremental fee only if existing authorized hardware/network/TLS incur no new charge; that fact is not established here | Requires a stable public HTTPS URL, same-origin proxy, probes, fixture smoke, judge availability through 2026-08-31, and retained prior artifact                             | **Conditional alternative**, not selected until the operator proves zero incremental cost and durable judge access                |

The truthful recommendation is therefore the already-Public repository plus a timed, credential-free
fixture quickstart as the immediate zero-cost judge path. It is permitted by the recorded Devpost
Project URL rule and exercises the full React/Vite + Fastify product without a paid service. A
publicly hosted application remains desirable but has no proven zero-cost full-stack provider in this
preflight. GitHub Pages is not selected because official GitHub documentation defines it as static
hosting, while this product requires a Node API and same-origin `/api` proxy.

### Current official-source register

Accessed 2026-07-26:

- [DataHub OSS repository](https://github.com/datahub-project/datahub): the source project identifies
  itself as Apache-2.0 and documents self-hosted installation. This is a source-licence fact, not
  permission to access an instance or its data.
- [Official DataHub MCP Server repository](https://github.com/acryldata/mcp-server-datahub) and
  [MCP documentation](https://docs.datahub.com/docs/features/feature-guides/mcp): the MCP server is
  Apache-2.0; the docs distinguish managed DataHub Cloud from a self-hosted server for DataHub Core
  and require an instance URL/token. They do not establish that Cloud service use is free.
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
  standard GitHub-hosted runners are free for Public repositories; larger runners are always
  charged, and storage/packages have separate allowance/billing boundaries.
- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages):
  Pages is available to Public repositories on GitHub Free and hosts static HTML/CSS/JavaScript.
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https):
  `github.io` sites are automatically served over HTTPS. This does not add a Node runtime.
