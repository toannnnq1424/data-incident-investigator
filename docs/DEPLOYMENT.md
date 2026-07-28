# Deployment

## Supported target and current boundary

The supported release target is a generic Node.js host with Node `24` or newer and pnpm `11.9.0`.
The release artifact itself is built with Node `24.14.0` and pnpm `11.9.0`. Fixture mode is the
credential-free deployment and demo path. Direct GraphQL and DataHub MCP Server modes use the same
host layout but are ready only when their selected authorized, read-only external dependency passes
the bounded readiness check.

Exact current main `b4f9e360e22baba3cab60710a65ea5c0e0555369` contains the supported source-build
`Dockerfile` and Phase 8.7 evidence. The exact clean source commit identified below is deployed as a
credential-free fixture service at
<https://data-incident-investigator-1071683558688.asia-southeast1.run.app>. Google terminates TLS;
there is still no Compose/Kubernetes manifest, managed persistent store, live DataHub credential, or
durable incident storage. The running image remains bound to immutable source commit
`3653cf6b591eed76ad6276d07b1ea08e88d7fa4f`; the later verifier/docs changes and main merge were not
rebuilt or redeployed. The earlier Phase 7.6 no-Docker/no-public-URL statement is historical; do not
infer any broader provider, credential, persistence, or production-support promise from the bounded
fixture deployment.

Phase 8.10 release preparation updates only the repository/future-artifact dependency graph after a
final production audit found two denial-of-service advisories. Its lock SHA-256 is
`6194526652ac34a3f3b06e16fd8a055ff88cdbd77c51c8e6e3695b4b5611bf1d`, with
`find-my-way@9.7.0` and `brace-expansion@5.0.8`, and its regenerated source attribution verifies
locally. This graph is **not** deployed. The public service and its C11 qualified evidence remain
bound to source `3653cf6b…7fa4f`, the earlier `eeec795d…84b2` lock, and live digest
`fe56a3dc…36afd`; no deployment or GCP mutation occurs in Phase 8.10.

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

## Phase 8.6 zero-cost deployment preflight (historical)

This section records the policy before the owner's later Phase 8.7 risk acceptance. The controlling
current state is the deployed Google Cloud execution record below.

### Non-billable policy

The owner authorizes only a path that incurs no fee. Paid quota, metered overage, larger runners,
paid storage/package/domain/hosting, paid DataHub Cloud/API, Codespaces, and model/API fees remain
prohibited. A provider that requires a payment card may now be _considered_ only for a genuinely free
trial/free tier; that is not authorization to create an account, accept billing terms, enter or store
a card, start a trial, incur a verification charge/hold, or permit auto-conversion. Before any such
action, prepare the control packet below and obtain fresh explicit owner approval. The owner alone
controls any sensitive card entry; agents must never request, read, type, copy, log, screenshot, or
store a card number, CVV, or billing credential. No service is selected or enabled and no deployment
is performed in this correction.

Public demo data is limited to checked-in synthetic fixtures and project-owned/generated assets.
Live DataHub may use only an operator-owned/authorized OSS/self-controlled instance or a
challenge-provided endpoint whose permitted use covers the demo. Never deploy with production,
customer, confidential, PII, proprietary metadata, third-party credentials, or a logged/committed
`DATAHUB_TOKEN`. The product remains model-free and does not use `OPENAI_API_KEY`.

### Decision matrix for the current architecture

| Path                                | Static web / Node API / secrets                                                                                 | Persistence and access                                                                                 | Cost/card/expiry evidence                                                                                                                | HTTPS, probes, rollback, and judge result                                                                                                                                    | Disposition                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Public repository clean setup       | Judge runs Vite + Fastify locally in fixture mode; no runtime secret                                            | In-memory incidents reset on restart; repository is already Public and fixture mode is credential-free | Uses the existing Public repo and standard public-repo CI only; no host, card, trial, or paid service                                    | Loopback only, so no public HTTPS app URL; `/health`, `/ready`, fixture smoke, and clean restart are supported; Devpost permits a repository with clear setup as Project URL | **Recommended zero-cost judge path.** Phase 8.8 adds the timed clean quickstart; this is still not a deployment.             |
| GitHub Pages only                   | Can serve `apps/web/dist` HTML/CSS/JS, but cannot run Fastify, proxy same-origin `/api`, or keep server secrets | Static files only; no incident API or server memory                                                    | Official docs say Pages is available for Public repositories on GitHub Free; default `github.io` needs no paid domain                    | `github.io` receives automatic HTTPS, but API health/readiness and end-to-end incident flow are absent; static rollback can select a prior source artifact                   | **Not a functioning deployment of the current product.** Do not enable Pages                                                 |
| Pages web + separate API host       | Static web could be public; Node API and any DataHub secret require another host                                | Split origins; current API has no CORS and the release build expects same-origin `/api`                | A second provider/account is still required; card-free and controlled card-required candidates are evaluated separately below            | Would require HTTPS API, CORS or a same-origin edge proxy, probes, uptime, and two-part rollback; judges could otherwise see a broken UI                                     | **Blocked** by unselected host and out-of-scope runtime/topology change                                                      |
| One full-stack Node host            | Matches the documented static host + same-origin `/api` proxy and can run fixture or authorized live mode       | In-memory only; restart loses incident IDs; live token must be injected server-side                    | Render has an evidenced card-free failure-closed shape; Koyeb and Google controls are evaluated below, but no account/action is approved | Must supply public HTTPS, proxy timeout, `/health`, `/ready`, fixture smoke, bounded logs, immutable prior artifact, and access through judging                              | **Preferred future deployment shape, not selected.** Provider/account/configuration still require a new owner-approved slice |
| Operator-owned/self-controlled host | Can match the full generic Node 24 topology; live mode may reach an authorized DataHub OSS instance             | Operator owns uptime, TLS, network boundary, token storage, and rollback; still no app persistence     | Potentially zero incremental fee only if existing authorized hardware/network/TLS incur no new charge; that fact is not established here | Requires a stable public HTTPS URL, same-origin proxy, probes, fixture smoke, judge availability through 2026-08-31, and retained prior artifact                             | **Conditional alternative**, not selected until the operator proves zero incremental cost and durable judge access           |

The truthful recommendation is therefore the already-Public repository plus a timed, credential-free
fixture quickstart as the immediate zero-cost judge path. It is permitted by the recorded Devpost
Project URL rule and exercises the full React/Vite + Fastify product without a paid service. A
publicly hosted application remains desirable. The provider review below identifies one card-free
candidate whose documented no-payment-method behavior fails closed by suspension, but selecting an
account identity and validating repository-specific build/runtime compatibility remain separate
owner-approved work. GitHub Pages is not selected because official GitHub documentation defines it
as static hosting, while this product requires a Node API and same-origin `/api` proxy.

### Provider disposition: card-free versus card-required

No signup was attempted. “Card-free” below means the documented zero-spend path intentionally has no
payment method on file; it does not mean the provider can never offer paid controls.

| Class         | Provider/service                | Current official evidence for this architecture                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Cost, lifecycle, and judge risk                                                                                                                                                                                                                                                                                                                                                          | Disposition                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card-free     | Render Hobby / Free web service | Node web services support build/start commands, environment secrets, health-check paths, one public `onrender.com` HTTPS endpoint, and two prior rollbacks. Free service: 750 workspace hours/month, 500 Hobby build minutes/month, 5 GB outbound bandwidth/month, idle after 15 minutes with about one-minute wake, ephemeral filesystem, no persistent disk. Without a payment method, excess bandwidth suspends free services and exhausted builds stop rather than bill.                                                                                                                                           | Compatible with a single Fastify process serving web plus same-origin `/api` in fixture mode. Cold start and monthly suspension can interrupt judges; free Postgres expires after 30 days and is unnecessary because this app is intentionally in-memory. Account identity, exact build/start commands, Node 24 support, and availability through the judging window remain unvalidated. | **Card-free candidate; not selected.** A later packet/approval must name the owner-visible Render identity and prove repository-specific runtime before signup/deploy.                                                                                          |
| Card-required | Koyeb Starter / Free Instance   | Starter requires a valid payment method. Koyeb places a USD 29 pre-authorization hold, cancels it immediately, and says an issuer may leave it visible for 7–21 days; the FAQ also says signup charges the prorated selected plan (its example defaults to Pro) before a later Starter downgrade. One Free Instance is 0.1 vCPU, 512 MB RAM, 2 GB SSD, one region, no Volume, and scales to zero after one idle hour; the free web Service itself is not charged. Paid usage starts when a paid Instance reaches `Starting`; billing is USD plus tax. Alerts have a USD 5 minimum and spending limits are unavailable. | Node/full-stack shape is plausible, but signup can cause a plan charge plus a material temporary hold, a payment method unlocks usage-based paid instances, and there is no hard zero-dollar cap. Included outbound/build quota, deletion retention, and a zero-spend cancellation safeguard are not established.                                                                        | **REJECT.** The possible signup charge/hold, missing hard zero-dollar control, and unresolved quota/retention facts fail the owner policy.                                                                                                                      |
| Paid account  | Google Cloud credit + Cloud Run | Read-only Phase 8.7 inspection confirmed the candidate account is already Paid and retains time-limited eligible credit. Cloud Run, Cloud Build, Artifact Registry, network, and logging remain metered; credit/free-tier coverage and tax can vary by SKU, region, and account.                                                                                                                                                                                                                                                                                                                                       | Provides the required HTTPS container shape and risk-reducing scale controls, but budgets do not cap spend, maximum instances can briefly overshoot, and the Paid account can charge for uncovered/over-credit usage without another upgrade gate.                                                                                                                                       | **OWNER-APPROVED WITH RESIDUAL PAID-ACCOUNT RISK — DEPLOYED.** The owner explicitly superseded the earlier zero-fee/no-overage rejection, accepted this residual risk, authorized the exact mutations, and later chose to retain the working Singapore service. |

Render remains the only card-free candidate in the historical bounded review; it was not selected
and signup was not attempted. Koyeb remains rejected. The Google Cloud rejection was superseded when
the owner explicitly accepted real-money overage risk and authorized the Phase 8.7 deployment; that
approval does not create a hard spending cap.

### Required provider-specific control packet

Before any signup, card, or trial action, record:

1. provider/service and exact official signup and billing URLs;
2. exact owner-visible account identity (named GitHub account or email category/name), never guessed
   or silently created;
3. trial/free-tier length, start trigger, included compute/bandwidth/storage/build quota, and expiry;
4. card requirement, officially documented verification hold/temporary authorization, taxes, region,
   and currency;
5. auto-conversion, overage, idle, suspension, deletion, and first possible billable event;
6. cancellation/downgrade/delete steps and an exact safe deadline with a documented buffer;
7. budget, spend-cap, and usage-alert controls, including whether a hard USD 0 cap exists;
8. data retention, public URL/HTTPS, secret handling, build/runtime, sleep/cold-start, and Devpost
   judge-access constraints;
9. current official pricing/terms citations with access date; and
10. `ACCEPTABLE ONLY AFTER OWNER APPROVAL` or `REJECT`, with reason.

Prefer card-free, non-expiring tiers. A card-required trial is eligible only when official evidence
shows no unavoidable fee and a reliable pre-charge cancellation path. Any unavoidable or
non-refundable charge, mandatory paid plan, unclear price, uncontrollable conversion, or inability
to enforce zero spend is `REJECT`. If a provider is later approved, create a reminder/automation
before its buffered cancellation deadline; no reminder exists now because no provider is selected.

Current packet identifiers (not authorization to visit or submit them):

- Render Free web service: signup `https://dashboard.render.com/register`; billing/usage
  `https://dashboard.render.com/billing`. Identity: **owner must name it**. No trial expiry; monthly
  quotas reset. Card/hold/tax/currency: none applicable only while no payment method is added. First
  billable event requires adding a payment method and consuming paid/overage service. Safe
  cancellation deadline: not applicable; keep no payment method and delete/suspend before any tier
  change. Hard USD 0 control: effectively fail-closed only through absence of a payment method.
- Koyeb Starter/Free Instance: signup `https://app.koyeb.com/auth/signup`; usage/billing is the
  authenticated organization Usage and billing page. Identity: **owner must name it**. No free
  instance expiry is stated, but Starter requires a valid payment method; USD billing and regional
  taxes apply. Koyeb's official FAQ says it places a USD 29 pre-authorization hold, immediately
  cancels it, and the issuer may leave it visible for 7–21 days. The same FAQ says signup also charges
  the prorated selected plan (its example defaults to Pro) before downgrade to Starter. Paid usage
  starts when a paid Instance reaches `Starting`; the minimum billing alert is USD 5 and no spending
  limit/hard USD 0 cap exists. Deactivation is required to remove all payment methods. **REJECT**; no
  signup, hold, plan charge, downgrade, deadline, or card action is authorized.
- Google Cloud / Cloud Run: billing management
  `https://console.cloud.google.com/billing`. The safely redacted signed-in identity and candidate
  account are recorded in the Phase 8.7 packet below. That account is already Paid; remaining credit
  does not prevent real-money charges for uncovered or over-credit usage. Budgets alert but do not
  hard-cap and maximum instances is not an absolute cap. The owner later explicitly accepted that
  residual risk and authorized the exact deployment recorded below.

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
- [Render free services](https://render.com/docs/free),
  [web services](https://render.com/docs/web-services),
  [build pipeline](https://render.com/docs/build-pipeline), and
  [workspace-plan limits](https://render.com/docs/new-workspace-plans), together with the
  [Render terms](https://render.com/terms): source for the card-free
  candidate's Node/HTTPS/secrets/probe/rollback capabilities, idle/ephemeral behavior, 750 hours,
  500 build minutes, 5 GB bandwidth, and fail-closed no-payment-method behavior.
- [Koyeb Instances](https://www.koyeb.com/docs/reference/instances),
  [organization plans](https://www.koyeb.com/docs/reference/organizations), and
  [pricing FAQ](https://www.koyeb.com/docs/faqs/pricing), with the
  [Koyeb service terms](https://www.koyeb.com/docs/legal/terms): source for the one Free Instance,
  valid-payment-method requirement, USD 29 immediately canceled pre-authorization hold and 7–21-day
  issuer visibility, possible prorated signup-plan charge, lifecycle/billing facts, USD/tax handling,
  USD 5 minimum alert, and absence of a spending-limit feature.
- [Google Cloud Free Program](https://docs.cloud.google.com/free/docs/free-cloud-features),
  [Cloud Run pricing](https://cloud.google.com/run/pricing),
  [Cloud Run overview](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run),
  [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets),
  [billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets), and
  [closing billing](https://docs.cloud.google.com/billing/docs/how-to/close-or-reopen-billing-account),
  together with the [Google Cloud terms](https://cloud.google.com/terms):
  source for the payment-method/temporary-authorization requirement, USD 300/90-day no-charge trial,
  non-conversion/stop/deletion behavior, regional usage pricing, non-capping budgets, and account
  closure/retention limits.

### Owner-authorized Google Cloud direction for the next slice (historical)

The direction below was the pre-execution gate. It was later satisfied and superseded by the
Phase 8.7 execution record.

The owner reports that existing project `onlinelearning-484610` and gifted USD 300 free cloud/API
credit are available as references. This has not been verified in signed-in Console and the existing
project is **not mandatory or selected**. The owner permits a later deployment slice to propose a
dedicated Data Incident Investigator project if it is cheaper, safer, more isolated, and easier to
clean up. The owner has not approved a concrete display name, globally unique project ID, Google
account, organization, billing account, or `Create Project` action.

The next slice should validate the cheapest viable shape: one minimal Cloud Run service hosting
Fastify plus the built Vite static assets and same-origin API; request-based billing; minimum
instances `0`; maximum instances `1` initially; and the smallest supported memory/CPU that passes
health and fixture smoke. Use Artifact Registry and Cloud Build only if unavoidable and
aggressively remove surplus images/build artifacts. Do not use Agent Platform, Vertex AI, or any
model service: the product is deterministic and needs no LLM.

Before any GCP mutation, signed-in in-app Browser read-only evidence must complete the control packet:

1. visible Google account identity, organization, billing account, Free Trial versus Paid status,
   exact remaining credit, expiry, and whether the credit applies to a new project;
2. a proposed non-PII/non-credential project display name and globally unique project ID, with the
   exact owning account/organization/billing account for owner confirmation;
3. exact official Cloud Run/Build/Artifact Registry/Secret Manager pricing, free-tier and region
   eligibility, minimum APIs/services to enable, quota/service caps, and budget alerts;
4. the first possible billable event, whether use can exceed credit, and the fact that budget alerts
   are not a hard cap;
5. a comparison of reusing `onlinelearning-484610` versus a dedicated project for isolation,
   cleanup, shared quota, credit applicability, and fee risk; and
6. resource/project deletion, rollback, billing detachment, artifact cleanup, retention effects,
   cancellation steps, exact Console pages/URLs, and the safe stop/suspension deadline.

Prefer a dedicated project only if official evidence proves the gifted credit applies without
increasing real-money risk; otherwise stop. Obtain fresh explicit owner approval immediately before
`Create Project` and again before any configuration that could charge real money. If the account is
an un-upgraded Free Trial and official UI confirms no automatic post-credit charge, design shutdown
before expiry; if it is upgraded or overage can reach real money without a hard cap, stop for a
zero-risk configuration packet and fresh approval. This correction performs no Console access or
mutation, project/API/resource creation, billing/trial change, card action, deployment, or reminder.

## Phase 8.7 Google Cloud deployment control packet and execution record

Access date: **2026-07-26**. This packet began as read-only signed-in Console inspection plus current
official Google Cloud documentation. The owner then explicitly accepted the residual Paid-account
overage risk and authorized project creation, billing association, minimum API enablement, build,
and deployment. No card or payment-method page was opened.

### Provider, account, billing, and credit facts

- Provider/runtime: Google Cloud, one Cloud Run service. Official entry points:
  [Cloud Console](https://console.cloud.google.com/),
  [Cloud Billing](https://console.cloud.google.com/billing),
  [Cloud Run](https://console.cloud.google.com/run),
  [API Library](https://console.cloud.google.com/apis/library), and
  [Manage resources](https://console.cloud.google.com/cloud-resource-manager).
- Signed-in identity: a personal Google account, recorded only as `t***@gmail.com`. No Google Cloud
  organization is selected; Console reports **No organization**.
- Candidate billing account: active Direct account `M***`, identifier recorded only as `…D627`.
  Console labels it **Paid account**. No payment method, card, payment profile, invoice, or tax
  identity was opened or recorded.
- The candidate account has an **Available** one-time Free Trial credit scoped to eligible usage,
  with approximately **VND 7.886 million** of approximately **VND 7.890 million** remaining, ending
  **2026-10-07**. Console showed VND 3,606 used when inspected. Reporting can lag, so this is not a
  real-time hard balance.
- The official Free Program documentation says an upgraded Paid account keeps unused Welcome credit
  until the original 90-day expiry, and bills usage not covered by credit or Free Tier. Cloud Run
  Free Tier and Artifact Registry limits are aggregated across projects by billing account. The
  Console credit row is billing-account scoped and does not show a project restriction. Therefore,
  a newly created project linked to `M*** …D627` is expected to consume eligible remaining credit.
  This remains a documented inference, not a guarantee that every SKU is credit-eligible. The exact
  billing association was then verified: the new project was the candidate account's only linked
  project at the post-deploy checkpoint.
- Billing was disabled on `onlinelearning-484610` and the other prior test/reference project under
  the owner's explicit instruction. The new dedicated project is the only project linked to the
  candidate billing account at the post-deploy checkpoint. Dedicated isolation keeps IAM, quotas,
  APIs, logs, artifacts, cleanup, and cost attribution separate. The total-cost difference from
  reuse remains **unknown and not proven**.

Created display name: **Data Incident Investigator**. The original proposed name exceeded the
provider's 30-character display-name limit.

Project-ID candidates proposed before mutation:

1. `data-incident-investigator-26`
2. `dii-judge-demo-20260726`
3. `dii-cloudrun-demo-26-a7c9` — selected and created

### Cheapest truthful deployment shape

The deployed service is one public, request-based Cloud Run service in `asia-southeast1`
(Singapore), serving the built Vite assets from Fastify with same-origin `/api`. Bangkok
(`asia-southeast3`) has lower Tier 1 compute rates and Cloud Build support, but after verifying that
fact the owner explicitly chose to retain the already healthy Singapore deployment rather than
migrate it. Singapore is therefore the accepted stable deployment, not the lowest published
regional unit price. No load balancer, custom domain, database, VPC connector, scheduler, Agent
Platform, Vertex AI, Gemini, or model API exists.

Approved runtime controls:

- request-based billing, first-generation execution environment;
- `0.08` vCPU, `256 MiB`, concurrency `1`, minimum instances `0`, and both service-level and
  revision-level maximum instances `1`;
- Cloud Run request timeout `100s`, strictly greater than the bounded `90s` application deadline by
  a finite `10s` response margin;
- CPU throttling enabled and startup CPU boost disabled;
- unauthenticated public invocation only for the fixture demo; keep the existing application rate
  limit conservative and expose only synthetic fixture data;
- public static-root, readiness, and canonical fixture investigation smoke passed at `256 MiB`.
  Increase CPU or memory only if later measured health/smoke evidence shows the current size is
  inadequate; the owner permits a proportionate upgrade for demo smoothness, not broad scaling.

The implemented path is `gcloud run deploy --source` with the repository's explicit, locally
validated Dockerfile. Source deploy used Cloud Build and automatically created the co-located
Artifact Registry repository `cloud-run-source-deploy`. Direct image deploy would still require a
registry and a build. The Preview no-build source path was not selected.

APIs explicitly enabled for the source-build path:

1. Cloud Run Admin API: `run.googleapis.com`;
2. Cloud Build API: `cloudbuild.googleapis.com`;
3. Artifact Registry API: `artifactregistry.googleapis.com`.

A read-only post-deploy inventory found 29 enabled Google services/APIs in total. In addition to the
three explicitly enabled deployment APIs above, 26 Google/default/transitive services are present:
`analyticshub`, `bigqueryconnection`, `bigquerydatapolicy`, `bigquerydatatransfer`, `bigquery`,
`bigquerymigration`, `bigqueryreservation`, `bigquerystorage`, `cloudapis`, `cloudtrace`,
`containerregistry`, `dataform`, `dataplex`, `datastore`, `iamcredentials`, `iam`, `logging`,
`monitoring`, `pubsub`, `servicemanagement`, `serviceusage`, `sql-component`, `storage-api`,
`storage-component`, `storage`, and `telemetry`. This packet does not prove which were project
defaults versus source-deploy transitive enablement. Do not blindly disable them; first prove that a
service is not Google-managed, default, or required by the live service/build/registry path.

Secret Manager was not enabled for fixture mode. A later authorized live-DataHub deployment would add
`secretmanager.googleapis.com`, create a least-privilege secret reference for `DATAHUB_TOKEN`, and
never put the token in source, image, CLI history, logs, or a client bundle. That is a separate
credential and mutation approval.

### Price, quota, and charge boundary

- Cloud Run charges request-based CPU/RAM during startup, shutdown, and request handling, rounded to
  100 ms. Free Tier is account-aggregated and price-based using `us-central1` Tier 1 rates. Consult
  the live pricing/SKU page immediately before deployment because regional/currency conversion and
  allowances can change.
- Cloud Build currently includes 2,500 free `e2-standard-2` default-pool build-minutes per billing
  account per month; partial minutes are billed by seconds and network/log/storage charges can be
  separate.
- Artifact Registry currently includes 0.5 GiB-month storage per billing account. Excess storage,
  cross-region transfer, optional vulnerability scanning, or retained old images can charge. Keep
  registry and Cloud Run co-located, disable paid scanning, retain only the deployed image plus one
  rollback image, then delete surplus tags/digests.
- Cloud Run resource quotas vary by region. The service maximum of `1`, not the much larger regional
  quota, is the intended operational limit. Admin API quotas are unrelated to public request volume.
  Do not request quota increases.
- Billing currency shown by Console is VND. USD reference prices convert through Google Cloud SKUs;
  taxes and the payments-profile tax treatment were not safely inspectable and remain **unknown**.
  This is a mandatory pre-deploy reconfirmation item.
- First real-money event: any eligible usage after the credit expires or is exhausted, any usage not
  covered by the credit, or any Free Tier/build/storage/network/logging usage above its allowance.
  The account is already Paid, so there is no protective trial auto-close and no additional upgrade
  gate.

### Hard controls, alerts, and residual risk

Hard or enforceable controls are limited to minimum instances `0`, service-level maximum instances
`1`, fractional CPU/memory, concurrency `1`, short application/request timeouts, no quota increase,
application rate limiting, deletion of the public service, deletion of surplus images, billing
detachment, and project shutdown. Maximum instances can be exceeded briefly during spikes or
revision transitions, so even `1` is not an absolute monetary cap.

Budgets and alerts **do not cap usage or spending**. Product quotas constrain individual resources,
not total currency spend. Automated budget shutdown needs additional Pub/Sub/automation resources,
has reporting delay, and can itself fail or cost money; it is not selected in this minimal packet.
There is no credible provider-native hard VND/USD 0 spending cap on this Paid account. Public traffic,
cold starts, logs, builds, registry retention, egress, delayed usage reporting, regional conversion,
tax, brief max-instance overshoot, and credit-ineligible SKUs remain residual charge risks.

Safe stop boundary: remove public traffic, delete the service and surplus images, detach billing,
and request project shutdown by **2026-08-10** or immediately when reported credit remaining reaches
20%, whichever occurs first. The deadline intentionally precedes the 2026-10-07 credit expiry but
does not guarantee judge access through 2026-08-31. No reminder or scheduler was created.

### Data, judging, secrets, rollback, and deletion

The public Google-managed HTTPS endpoint is
<https://data-incident-investigator-1071683558688.asia-southeast1.run.app>. Fixture mode is
credential-free, process-local, and synthetic; incidents disappear on restart/scale-to-zero. Judges
must tolerate a cold start and must not expect durable incident URLs. Live DataHub is excluded until
an authorized endpoint and server-side secret are separately approved. Do not expose
production/customer data, PII, private metadata, tokens, raw provider payloads, or billing identity.

Historical revision `data-incident-investigator-00002-pdq` previously received 100% of traffic, but
independent QA disproved its documented service-level maximum: the service annotation is
`maxScale=100` while the revision template is `maxScale=1`; the template timeout read back as `100s`.
It is therefore not the corrected known-good target. The previous immutable revision
`data-incident-investigator-00001-jst` is retained only as a historical rollback candidate.
Rollback means route 100% traffic to an explicitly verified immutable revision, then repeat public
smoke.
Deletion means first remove public access/traffic, delete the Cloud Run service, delete unused
Artifact Registry images/repository, verify no builds/resources remain, detach billing, and finally
request project shutdown. Deleting a revision does not delete its image. Project shutdown disconnects
billing and enters a 30-day recovery period; some resources can disappear sooner, restoration can
take up to 36 hours, billing is not automatically reattached, and a project ID is never reusable.
Google warns that charges can continue through the current billing cycle, so billing detachment and
resource deletion must precede project shutdown.

### Decision and consumed approval gates

**OWNER-APPROVED WITH RESIDUAL PAID-ACCOUNT RISK — DEPLOYED.** The owner explicitly superseded the
earlier zero-fee/no-overage rejection, accepted that the Paid account has no credible hard USD/VND
`0` cap, and authorized the project, billing, API, build, and deploy mutations. The following gates
were consumed:

1. created project `dii-cloudrun-demo-26-a7c9`, display name `Data Incident Investigator`, with no
   organization;
2. linked only that project to candidate billing account `M*** …D627`;
3. enabled only `run.googleapis.com`, `cloudbuild.googleapis.com`, and
   `artifactregistry.googleapis.com`;
4. built from the repository Dockerfile and deployed public service
   `data-incident-investigator` with the exact controls above.

Historical public smoke passed after revision `data-incident-investigator-00002-pdq`: static UI loaded,
fixture metadata became ready, the canonical Removed schema column investigation completed, the
report showed `81% · high`, and the browser console had zero warnings/errors. Billing alerts were
not treated as a cap. No secret, credential, card/payment data, model API, reminder, custom domain,
database, or unrelated paid feature was created or entered.

Any different account, billing account, project, region, API, architecture, paid feature, secret, or
material capacity increase requires a refreshed cost/risk check and explicit owner direction.

### Deployed-state QA correction: verified redeploy evidence

Independent QA returned `FAIL / DO NOT MERGE` on deployed repository head
`d1d67b13642b40edf570e79106493309b7df05c0`. The existing public URL and Docker deployment are real;
all earlier Phase 8.7 no-mutation/preflight wording is historical. At that checkpoint, current
`main` was `c7abc652c23b532e90091b377490b27eadd7e084` and Draft PR #56 remained unmerged. Phase 8.7 later
integrated through exact main `b5b394b31ec626bb4ecc175975ca9869e475054e`; the running image still
maps to its earlier immutable source commit rather than the merge commit.
QA reported a `240s` timeout at its checkpoint; the correction's later read-only reinspection found
the historical revision template at `100s`. The corrected redeploy sets and verifies the request
timeout at `100s` explicitly; the platform-created startup probe separately reports `240s` and is
not the request timeout.

The corrected clean source pins every Docker stage to
`node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d`,
builds API/workspace/Vite output, installs only the API production closure, rewrites only runtime
workspace exports to `dist`, starts `node apps/api/dist/index.js` as the unprivileged `node` user,
and keeps only the required compiled output, one fixture metadata file, production dependencies, and
legal/provenance evidence. Local final-image audit found no API source, `tsx`, tests, docs, audit
scripts, or extra fixture scenarios; Node 24 production root, `/health`, and `/ready` all passed.
The final local image is 86,183,068 bytes and, under `0.08` CPU / `256 MiB`, also passed same-origin
canonical incident completion plus a 9,221-byte Markdown report with renderer version and `81%`
high-confidence evidence.

Exact source-side attribution evidence for deployed source commit `3653cf6b…7fa4f`:

- `pnpm-lock.yaml` SHA-256
  `eeec795d5a09d5e8865b54bfbd95fb3557cce421c5369d99b6e2f89a472484b2`;
- 397 lock package entries, 397 snapshots, and 377 distinct lock package names;
- 152 full-production package identities / 145 names;
- 149 deployed external runtime identities / 142 names / 149 canonical package roots;
- five exact Vite bundled identities: `react@19.2.7`, `react-dom@19.2.7`,
  `scheduler@0.27.0`, `vite@7.3.6`, and `zod@4.4.3`;
- deterministic `RUNTIME-ATTRIBUTION.json` and `THIRD_PARTY_NOTICES.txt`, plus Apache `LICENSE`,
  project `NOTICE`, and the required reproduced third-party legal evidence;
- `abstract-logging@2.0.1` truthfully records that neither the npm package nor exact upstream tag
  contains a legal file. Its declared-MIT README links the author-controlled legal page; the tracked
  fallback records the exact upstream tag commit
  `80dfaef91ee87008f4ed2b6e78921d383bccd406`, URL, capture date, text, and SHA-256 without claiming
  it came from the package.

Final-image SHA-256 values are
`d343d34681cf92e1d7c9a3bf834251c2a2db98a3b1b6614a365c382da769c6b1` for
`RUNTIME-ATTRIBUTION.json`,
`9cc0b8b55f4a78435cf4d25b7f7f5aa05a981ee041963d38ab82e2afdcebccab` for
`THIRD_PARTY_NOTICES.txt`,
`cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` for `LICENSE`, and
`4c3019e13c96e2906eddd3e8fa35d4ef0d4e13826d2398551d8a9796fac82d1f` for `NOTICE`.

Source verification and production-only image verification both pass under the immutable Node 24
base. Exact source commit `3653cf6b591eed76ad6276d07b1ea08e88d7fa4f` passed PR CI run
`30208678827`, job `89811104840`. A deterministic `git archive` from that commit had SHA-256
`7b8636db0dba88973bd82f4079a81fbdd71ca2975d56cc2fd90b21da17dc4cea`; Cloud Shell reproduced both
the hash and embedded commit identity before extraction. Regional Cloud Build
`7ad5ea5d-c7f2-4999-ada4-175b94d56fd9` completed `SUCCESS` and produced immutable image digest
`sha256:fe56a3dc7c8c4fb6e11b329adb107fb7efd8e4de0bece8820027f324d4f36afd`.

Revision `data-incident-investigator-src-3653cf6b591e` is labeled
`source-commit=3653cf6b591eed76ad6276d07b1ea08e88d7fa4f` and receives 100% traffic. Read-back service and
revision evidence verifies service maximum `1`, revision maximum `1`, minimum `0` by absent/default
min-scale annotations, concurrency `1`, request timeout `100s`, `0.08` vCPU, `256 MiB`, CPU
throttling on, startup CPU boost off, first-generation execution, `APP_MODE=fixture`, and Singapore.
The service-level `run.googleapis.com/maxScale` annotation is now exactly `1`.

The exact running digest was pulled read-only and executed under `0.08` CPU / `256 MiB` for a second
content-addressed audit. All 8 compiled runtime files, 149 package manifests/roots, and 149 package
legal files matched the hashes tracked at that immutable deployed source commit; the base-image
digest, lock SHA, five rendered Vite
identities, `RUNTIME-ATTRIBUTION.json`, `THIRD_PARTY_NOTICES.txt`, Apache `LICENSE`, and project
`NOTICE` also matched. C11 is therefore restored to
**QUALIFIED PASS — OWNER-AUTHORIZED SCOPE** for this exact live digest and the already documented
synthetic/authorized-data boundary. This is not blanket legal clearance.

Post-redeploy resource inventory:

- 29 enabled services remain: only `run.googleapis.com`, `cloudbuild.googleapis.com`, and
  `artifactregistry.googleapis.com` were explicitly enabled for deployment; the other 26 are
  Google/default/transitive services with unproven causal origin and were not blindly disabled;
- source bucket `run-sources-dii-cloudrun-demo-26-a7c9-asia-southeast1` now has two source ZIPs
  totaling 1,596,294 bytes; the new build-source object is 850,872 bytes and the historical object is
  745,422 bytes;
- standard Docker repository `cloud-run-source-deploy`, Singapore, Google-managed encryption and
  scanning disabled, reports 119.176 MB;
- the live image is the `fe56a3dc…36afd` digest above, tagged `latest`, with Artifact Registry size
  87,097,921 bytes; historical rollback digest `410fdef2…5b707` remains untagged at 113,273,631
  bytes. Shared layers explain why repository size is not the sum of displayed image sizes.

Exactly one post-redeploy public smoke verified HTTP 200 `{"status":"ok"}` at `/health`, HTTP 200
fixture readiness at `/ready`, the static UI, one canonical Removed schema column incident,
completed report `81% · high`, a 9,221-byte Markdown download, zero browser console warnings/errors,
zero unnamed interactive controls, and no horizontal overflow at desktop or narrowed viewport.
Direct browser navigation to response-only `/ready` and `.md` resources was blocked by the browser
client, so readiness was checked once with public `curl` and Markdown through the visible UI download;
the incident was not rerun.

The bucket archives, repository, both images, and build history are real storage/resource inventory
and remain in cost, rollback, and cleanup gates. Nothing was deleted in this correction. Keep only
the live image and one proven rollback image if needed; remove surplus source archives/images only
under a separate exact cleanup check, then preserve the 2026-08-10 or 20%-remaining-credit
stop/delete/detach boundary. Any later documentation-only commit records evidence only: the running
revision remains bound to source commit `3653cf6b…7fa4f`, not that later repository HEAD.

Official sources accessed 2026-07-26:

- [Google Cloud Free Program](https://docs.cloud.google.com/free/docs/free-cloud-features)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations)
- [Cloud Run source deployment](https://docs.cloud.google.com/run/docs/deploying-source-code)
- [Cloud Run CPU](https://docs.cloud.google.com/run/docs/configuring/services/cpu) and
  [memory](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits)
- [Cloud Run maximum instances](https://docs.cloud.google.com/run/docs/configuring/max-instances)
  and [quotas](https://docs.cloud.google.com/run/quotas)
- [Cloud Build pricing](https://cloud.google.com/build/pricing)
- [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing)
- [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Project deletion and restoration](https://docs.cloud.google.com/resource-manager/docs/delete-restore-projects)
- [Cloud Run revision management](https://docs.cloud.google.com/run/docs/managing/revisions)
