# Implementation plan

## Phase 0 — Foundation

Status: complete. Foundation commit `847a744` is on `main`, and GitHub Actions CI passed on
2026-07-18.

Scope: pnpm TypeScript monorepo, web/API skeletons, shared contracts, quality tooling, CI, security-safe
environment contract, documentation, and GitHub repository.

Acceptance criteria:

- One-command dependency installation.
- `pnpm dev`, lint, type-check, test, build, and smoke commands exist and pass.
- CI mirrors Phase 0 validation.
- Required documentation contains repository-specific information.
- No credentials are tracked.
- A coherent foundation commit is pushed to GitHub.

Deferred: incident submission, fixture adapter implementation, optimized UI, authentication, real
DataHub calls, model reasoning, and deployment.

Validation checkpoint: passed on 2026-07-18 with format, lint, type-check, 3 tests, production builds,
and the artifact smoke check. Subsequent changes were limited to Codex permissions and project-memory
documentation and require targeted configuration/document formatting checks before the foundation
commit.

## Phase 1 — Mock incident end-to-end

### Slice 1.1 — Submit incident

Status: complete on `phase/mock-investigation`; validated 2026-07-18.

User outcome: enter an incident question and receive an incident ID with visible processing status.

Acceptance criteria:

- Web form captures question, entity hint, occurrence time, and symptom.
- API validates `IncidentRequestSchema` and rejects invalid requests with a stable error envelope.
- Valid requests return an incident ID and processing state.
- UI renders idle, submitting, success, API error, and validation error states accessibly.
- Contract tests, API integration test, and one browser-level flow pass.

Minimum expected files: web form/components, API incident route, shared API schemas, slice tests, API
contracts, session log.

Minimum files for this slice:

- `packages/shared-types/src/index.ts` for accepted-response and stable error-envelope schemas.
- `apps/api/src/index.ts` for `POST /incidents`.
- `apps/web/src/App.tsx`, `main.tsx`, `styles.css`, and `vite.config.ts` for the accessible form,
  status states, and local API proxy.
- Direct contract and API tests under `tests/integration`; browser-level UI-state validation against
  the running slice.
- `docs/API_CONTRACTS.md`, `KNOWN_ISSUES.md`, and `SESSION_LOG.md` for persistent state.

Deferred: incident persistence, fixture investigation, polling/report retrieval, DataHub calls, and
automated production remediation remain outside Slice 1.1.

Level C validation:

- Prettier check for changed files.
- Repository lint plus affected web/API/shared-types type checks.
- Targeted contract/API tests plus browser-level UI-state validation.
- One real browser submission flow against local Vite/Fastify servers.
- Affected web, API, and shared-types builds.

Validation result: passed. Prettier checks, repository lint, three affected package type checks, six
targeted contract/API tests, a real Vite-to-Fastify browser submission flow, and three affected builds
all completed successfully. The browser flow also confirmed client validation, a generated UUID,
`processing` status, and no browser console errors. Full phase/release validation remains deferred.

Exact next slice: create a new project-scoped task for Slice 1.2 — Mock investigation. Do not begin it
from the Slice 1.1 task.

### Slice 1.2 — Mock investigation

Status: complete on `codex/slice-1-2-mock-investigation` from exact base commit
`9aea4c5995f3e79c5729b7c9fc7e5fe78de54e0b`.

Objective: after a canonical removed-schema-column incident is submitted, preserve the Slice 1.1
`202`/UUID/`processing` response and transition through the provider-neutral `MetadataAdapter` to a
deterministic, schema-validated completed report that the web retrieves and renders without external
credentials.

Minimum files:

- `fixtures/metadata/removed-schema-column.json` and
  `fixtures/incidents/removed-schema-column.json` for the single canonical scenario.
- `packages/datahub-client/src/index.ts` and direct fixture-adapter tests for bounded fixture metadata,
  lineage, and recent-change access through `MetadataAdapter`.
- `packages/agent-core/src/index.ts` and direct runner tests for deterministic evidence-linked report
  orchestration.
- `packages/shared-types/src/index.ts` and contract tests for the completed retrieval state and stable
  not-found error.
- `apps/api/src/index.ts` and API integration tests for in-memory processing/completed state and
  `GET /incidents/:incidentId`.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and a focused web behavior test for retrieval and
  compact completed-report rendering.
- Affected package manifests/lockfile only where workspace dependency edges require them.
- `docs/API_CONTRACTS.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and
  `docs/SESSION_LOG.md` for the durable handoff.

Acceptance criteria:

- The canonical fixture travels web -> `POST /incidents` -> fixture `MetadataAdapter` -> agent-core
  runner -> `GET /incidents/:id` -> visible completed report.
- The completed response and nested report pass shared schemas; every hypothesis evidence reference
  resolves to evidence in that report.
- Repeating the same canonical request yields identical report content except for the generated
  incident identifier.
- Fixture entity search, lineage, and recent changes obey small explicit limits and never return
  entities outside the canonical fixture.
- Invalid submissions retain the Slice 1.1 typed validation error; unknown incident IDs return the
  stable typed not-found error.
- Targeted contracts, fixture adapter/runner, API integration, and web behavior tests pass, followed by
  one real browser submission-to-report flow with no console errors and affected builds.

Deferred: detailed evidence, entity, confidence, assumption, missing-information, and recommendation
presentation is Slice 1.3. Real DataHub calls, model reasoning, durable persistence, generic fixture
selection, checked-in cross-browser automation, and full phase/release Level D validation remain out of
scope.

Exact Level C commands (run once after the coherent slice, without rerunning unchanged successes):

- `pnpm exec prettier --check <changed files reported by git diff>`
- `pnpm exec eslint packages/shared-types/src packages/datahub-client/src packages/agent-core/src apps/api/src apps/web/src tests/integration`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts`
- `pnpm --parallel --filter @dii/api --filter @dii/web dev`, then one real browser canonical
  submission-to-completed-report flow and console inspection.
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`

Validation result: passed on 2026-07-18. Changed-file Prettier checks, affected lint, all five
affected type checks, five targeted test files with 13 passing tests, and all five affected builds
passed. After browser validation made the processing transition intentionally visible for 250 ms, the
affected API format/lint/type-check, four API integration tests, and API build passed again. A real
canonical fixture flow through Vite and Fastify showed `processing`, then `completed`, the report
summary, and the top ranked hypothesis with no browser console warnings or errors. The initial Vitest
attempt was classified as an environment restriction because esbuild could not read worktree ancestor
metadata; the same targeted command passed with scoped access. Full Level D validation remains
deferred.

Exact next slice: create a new project-scoped task for Phase 1 Slice 1.3 — Evidence display, starting
from this Slice 1.2 branch/commit; do not continue Slice 1.3 here.

### Slice 1.3 — Evidence display

Status: complete on `codex-mac/slice-1-3-evidence-display`, stacked on exact Slice 1.2 commit
`8bfab62a2ab3e80f8b57f90c8a464a1c151130bd`.

Objective: render the completed fixture report in enough detail for a judge to inspect related
entities, lineage evidence, evidence IDs, hypothesis confidence, facts, inferences, assumptions,
missing information, and recommended actions without changing the Slice 1.2 backend or shared
contracts.

Minimum files:

- `apps/web/src/App.tsx` for report-section helpers and accessible detailed completed-report UI.
- `apps/web/src/styles.css` for compact, scannable report layout and responsive states.
- `tests/integration/web-report.test.ts` for focused presentation behavior coverage.
- `tests/e2e/report-display.spec.mjs` for the browser-level canonical report check.
- `package.json` and `pnpm-lock.yaml` only to add the Playwright dev dependency and report e2e script.
- `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for durable handoff.

Acceptance criteria:

- Completed reports show related entities with kind and URN.
- Evidence rows show stable evidence IDs, categories, statements, source entities, and observed times
  when present.
- Hypotheses show confidence as a readable percentage and list referenced evidence IDs.
- Lineage-related evidence is visible in a distinct section.
- The UI labels facts, inferences, assumptions, missing information, and recommendations separately.
- Loading, empty, and error states remain understandable and accessible.
- One browser-level test submits the canonical fixture and verifies the detailed report sections.

Deferred: backend persistence, new fixture scenarios, real DataHub lineage, model reasoning,
cross-browser matrix automation, and Phase 2 work.

Level C validation:

- Prettier check for changed files.
- Affected web lint.
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/web-report.test.ts`
- `pnpm test:e2e:report`
- `pnpm --filter @dii/web build`

Validation result: passed on macOS on 2026-07-18. Frozen install, changed-file Prettier check,
affected frontend/e2e lint, web type-check, focused web presentation test, Playwright browser report
flow, and affected web build passed. The Playwright flow starts local Fastify/Vite servers, submits the
canonical fixture, verifies processing and completed states, checks detailed report sections, confirms
desktop/mobile horizontal overflow is absent, and fails on browser console warnings/errors.

Exact next slice: stop Phase 1 work here for review. After the stacked PR is accepted, run the Phase 1
integration checkpoint before starting Phase 2.

### Phase 1 Level D closure

Status: passed after browser-launcher remediation on `codex/phase-1-level-d-closure`, starting from exact Slice 1.3 commit
`c020a4c056527b0711cb07840be2446e23a00b43` and stacked on
`codex-mac/slice-1-3-evidence-display`.

Objective: close the Phase 1 integration checkpoint by validating the complete credential-free
fixture flow and all Slice 1.1-1.3 acceptance criteria without adding features or beginning Phase 2.

Acceptance criteria:

- Valid and invalid incident submissions expose accessible loading, success, validation-error, and
  API-error states; a valid request receives a UUID and visible `processing` status.
- The deterministic fixture adapter produces a schema-valid structured report while preserving the
  compact summary and top-ranked hypothesis.
- The completed report displays impacted entities, evidence IDs and timeline, ranked confidence,
  lineage, facts, inferences, assumptions, missing information, and recommended actions; every
  hypothesis evidence reference resolves to evidence in the report.
- Loading, error, empty, and insufficient-evidence states use clear semantic headings and appropriate
  ARIA/status behavior.
- The canonical `submit -> processing -> completed -> full evidence display` fixture flow completes
  in under three minutes without credentials and without browser console warnings or errors.
- Repository format, lint, type-check, all unit/integration/smoke tests, production build, primary
  artifact smoke, phase browser flow, diff/secret review, and clean-worktree review pass.

Exact Level D validation commands (run successful commands once while inputs remain unchanged):

- `pnpm validate`
- `pnpm test:e2e:report`

Validation result on Windows managed worktree, 2026-07-18:

- Repository format, lint, and all six workspace type-checks passed. The single `pnpm validate`
  sequence required environment recovery before reaching those checks: the initial managed bootstrap
  could not find `node`, then its repository-local `.pnpm-store` artifact was moved to
  `C:\tmp\dii-phase1-level-d-pnpm-store-019f7547`, and sandboxed Vitest could not read the managed
  `esbuild` package.
- The affected `pnpm test` continuation passed with scoped access: 6 test files and 14 tests, including
  contracts, deterministic adapter/runner, API integration, report presentation, and API health smoke.
- `pnpm build` passed for all six buildable workspace projects; the web build transformed 109 modules.
  `pnpm smoke` passed for `apps/api/dist/index.js` and `apps/web/dist/index.html`.
- `pnpm test:e2e:report` did not complete. The first launch attempts reproduced Windows
  `spawn pnpm ENOENT`. Temporary targeted launcher changes reached local server startup, but exposed
  port/process-tree leakage and then a readiness mismatch: Vite was ready at
  `http://127.0.0.1:5173/` while the test accepted only `http://localhost:5173/`. A controller-approved
  final rerun on ports verified clean immediately beforehand failed on that mismatch after 28.3
  seconds, before Chromium. The unproven launcher changes were not retained, so product and test source
  remain at the exact Slice 1.3 baseline.
- Slice 1.1 and Slice 1.2 acceptance are supported by the passing contracts/integration suite. Slice
  1.3 structure and evidence-reference acceptance are supported by passing schema and presentation
  tests, but overall Phase 1 acceptance remains failed because the local canonical browser flow never
  reached Chromium; duration-under-three-minutes and clean-console criteria were therefore not proven
  in this checkpoint.

Deferred: real DataHub access, additional fixture scenarios, durable persistence, model reasoning,
evaluation expansion, cross-browser matrix automation, deployment, and all Phase 2 implementation.
PR #4 (`codex/stabilize-managed-worktree-bootstrap`, commit
`99dfc5f7a086808b25d8a57988524769bca0cf87`) is a separately green environment dependency and is not
integrated into this product-validation branch. Supplied evidence records PR #4 CI run `29644965735`,
job `88081574373`, as green. PR #3 is the clean Slice 1.3 dependency at the exact base above; supplied
evidence records CI run `29644831886`, job `88081227744`, as green.

Recorded blocker at commit `31621056a9786fb5423773e0bec94704cdab6fa8`: keep Phase 2 blocked and
address cross-platform pnpm execution, dedicated/dynamic ports with matching URL/readiness, and
process-tree cleanup as one bounded browser-launcher change.

Follow-up remediation objective: stabilize only the checked-in Phase 1 browser launcher without
changing Slice 1.3 product/UI/API behavior. Resolve pnpm through the current Node runtime, select free
API/web ports, keep proxy/readiness/browser URLs synchronized, and clean only process descendants
created by the launcher on both success and failure.

Minimum files:

- `tests/e2e/report-display.spec.mjs` and a test-only Vite configuration for the canonical flow.
- One small launcher helper plus one browser-free contract test under `tests/e2e` and
  `tests/integration`.
- `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for final evidence.

Follow-up acceptance and validation:

- Targeted launcher contracts prove pnpm invocation, synchronized command/URL/readiness settings, and
  descendant process-tree cleanup without starting a browser.
- Changed-file Prettier and affected ESLint pass.
- A preflight-selected, conflict-free runtime executes exactly one `pnpm test:e2e:report`; it must
  complete `submit -> processing -> completed -> full evidence display` in under three minutes,
  resolve every hypothesis evidence reference, emit no browser warnings/errors, and leave neither
  selected listener nor launcher descendant behind.
- Do not rerun the already-green core Level D commands because their inputs remain unchanged.

Exact follow-up commands:

- changed-file project-local Prettier check
- affected project-local ESLint
- `pnpm exec vitest run tests/integration/report-launcher.test.ts`
- exactly one `pnpm test:e2e:report` after targeted checks pass

Follow-up validation result on Windows managed worktree, 2026-07-18:

- Changed-file Prettier passed. Affected ESLint initially found two unqualified Node globals and one
  unused import; after that targeted fix, affected ESLint passed in 1.3 seconds.
- Launcher contracts passed 3/3 in 1.20 seconds. They verify current-Node pnpm invocation with a safe
  Windows fallback, resolved Vite proxy/host/port configuration, HTTP readiness at the configured URL,
  and real descendant process-tree cleanup that releases its listener. Earlier discovery/config
  attempts were classified before browser execution: the `.mjs` test was outside the repository's
  `.test.ts` include, and root could not directly resolve web-owned Vite; both were corrected without
  adding dependencies or changing a lockfile.
- The one allowed `pnpm test:e2e:report` selected API `http://127.0.0.1:52289` and web
  `http://127.0.0.1:52290`; both reached HTTP readiness. It then failed after 3.9 seconds before browser
  creation because Playwright Chromium headless shell revision `1228` was not installed in the Windows
  runtime. The command was not rerun. Cleanup left zero listeners on both selected ports and zero new
  managed Node descendants. Pre-existing PID `23972`, created at 20:08:46, was not a descendant of this
  run and was not stopped.
- The launcher blocker is fixed and its cleanup contract is proven, but overall Phase 1 acceptance
  remains failed because the browser flow, evidence display, duration, and console criteria were not
  executed in the missing browser runtime.
- After that locked e2e attempt, `pnpm exec playwright install chromium` was run with the managed
  bundled Node/pnpm runtime. The expected revision `1228` executable is now present at the Playwright
  Windows user cache and reports `Google Chrome for Testing 149.0.7827.55`.
- After the controller explicitly authorized one new controlled run for that changed external state,
  `pnpm test:e2e:report` selected API `http://127.0.0.1:51439` and web
  `http://127.0.0.1:51440`, then passed the canonical fixture flow in `9361ms` (`15.219s` wall time).
  The browser contract covered submit -> processing -> completed -> full evidence display, required
  every hypothesis evidence reference to resolve to a displayed evidence ID, rejected browser console
  warnings/errors, and enforced the three-minute limit. Post-run checks found zero listeners on both
  selected ports and zero recent launcher-related processes after excluding the read-only probe.
- Phase 1 Level D therefore passes. The previously passing core gate was not rerun because its inputs
  did not change; only the controller-authorized browser gate was repeated after Chromium provisioning.

Merge-readiness follow-up status: passed locally against exact advanced stacked base
`edd0ed510d4cc4799d1c130415d8e79cb0ff78a5` (`test(e2e): tolerate styled vite readiness logs`), whose
parent is the original Slice 1.3 base `c020a4c056527b0711cb07840be2446e23a00b43`. Merge the advanced
base forward without rebase or history rewrite and resolve only the direct conflict in
`tests/e2e/report-display.spec.mjs`.

Merge-readiness acceptance and validation:

- Preserve the proven dynamic-port, synchronized-URL, descendant-only cleanup launcher while also
  preserving the advanced base's tolerance for ANSI-styled Vite readiness output where applicable.
- Run changed-file Prettier and affected ESLint, then
  `pnpm exec vitest run tests/integration/report-launcher.test.ts` and exactly one
  `pnpm test:e2e:report`; do not rerun unchanged core Level D commands.
- The browser flow must remain under three minutes with clean console output, resolved evidence
  references, and no selected-port or launcher-descendant leak.
- Update the three project-memory documents, create one merge commit, push without force, verify draft
  PR #5 no longer conflicts, and follow exactly one CI run created by that push.

Merge-readiness local validation result on Windows, 2026-07-18:

- Fetch verified closure HEAD `c4f20c66d9c7351be8bbf0cdf4e23fe0355ef7f1`, advanced base
  `edd0ed510d4cc4799d1c130415d8e79cb0ff78a5`, and merge-base
  `c020a4c056527b0711cb07840be2446e23a00b43`. The only conflict was
  `tests/e2e/report-display.spec.mjs`.
- The resolution keeps the proven dynamic-port launcher, HTTP URL readiness, current-Node pnpm
  invocation, and descendant-only cleanup. Because readiness no longer parses Vite logs, ANSI-styled
  output from the advanced base cannot prevent readiness; the obsolete regex/fixed-port launcher was
  not restored.
- Changed-file Prettier passed in 1.715 seconds and affected ESLint passed in 3.690 seconds. Launcher
  contracts passed 3/3 in 1.94 seconds (6.076 seconds wall), including real descendant-tree cleanup.
- The one authorized `pnpm test:e2e:report` selected API `http://127.0.0.1:63576` and web
  `http://127.0.0.1:63577`, then passed in `6890ms` (`13.097s` wall). It retained the under-three-minute,
  clean-console, resolved-evidence-reference, and full-report assertions. Post-run checks found zero
  listeners on both ports and zero Node/cmd/Chromium runtime processes belonging to this launcher.

Deferred: all product/UI/API work, manifest or lockfile changes, PR #4 integration, duplicate sibling
PR #6/commit `8d75932`, and Phase 2.

Exact next action: create and push the non-rewriting merge commit, verify draft PR #5 is conflict-free,
and follow exactly one CI run created by that push. Stop after PR/CI evidence; do not begin Phase 2,
change product code, or integrate PR #4.

Phase completion: a clean clone can select a demo incident and receive a complete report.

## Phase 2 — DataHub integration

### Slice 2.1 — DataHub health and provider error normalization

Status: Level C passed locally on `codex/phase-2-1-datahub-health` from exact Phase 1 closure commit
`db7dba58d7ecae0505b0596d0f735cbae96b2b4c`; stacked draft PR and CI are pending.

Objective: show the selected metadata source and its readiness from the existing web shell through a
shared `GET /metadata/health` contract. Fixture mode must remain deterministic and credential-free;
DataHub mode must probe the configured GMS through a bounded client boundary and expose only safe,
actionable normalized health states.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for the stable metadata
  mode, health-status, and response schemas.
- `packages/datahub-client/src/index.ts` and `tests/integration/datahub-health.test.ts` for the
  provider-neutral health boundary, deterministic fixture readiness, and a short DataHub `/config`
  probe tested with a local fake HTTP server.
- `apps/api/src/index.ts` and `tests/integration/metadata-health-api.test.ts` for API composition and
  `GET /metadata/health` behavior in fixture and DataHub modes.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and
  `tests/integration/web-metadata-health.test.ts` for compact accessible loading, ready, and normalized
  problem states without replacing the incident form or completed report.
- `tests/e2e/report-display.spec.mjs` for the single canonical browser flow assertion that fixture
  metadata is ready before incident completion and full evidence display.
- `docs/API_CONTRACTS.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and
  `docs/SESSION_LOG.md` for the durable contract and handoff. `.env.example` changes only if the
  existing `APP_MODE`, `DATAHUB_GMS_URL`, and `DATAHUB_TOKEN` contract proves incomplete.

Acceptance criteria:

- Fixture `GET /metadata/health` returns a deterministic, schema-valid `ready` result without reading
  or requiring DataHub credentials.
- DataHub mode calls the client health boundary with a bounded timeout and AbortSignal. Success,
  missing configuration, 401/403, connection/DNS failure, timeout, and invalid/non-JSON responses map
  to `ready`, `unconfigured`, `unauthorized`, `unavailable`, `timeout`, or `invalid_response`.
- Neither health responses nor logs include a configured URL, token, Authorization header, raw
  provider body, or provider-specific response type.
- The web shows a compact semantic metadata-source region with loading, ready, and actionable problem
  states while preserving the incident form, compact summary, top hypothesis, and detailed evidence.
- Shared hypothesis/evidence contracts and the provider-neutral investigation boundary remain
  unchanged; the canonical fixture flow still transitions through processing to a complete report.
- Targeted shared, DataHub client, API, and web tests and all four affected builds pass, followed by
  exactly one fixture browser flow under three minutes with clean console output and full evidence.

Deferred: entity search (Slice 2.2), DataHub lineage, recent changes, live-credential smoke, additional
providers, model reasoning, controller changes, durable persistence, and broader cross-browser work.

Exact Level C commands (run once after the coherent implementation):

- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/datahub-client/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/datahub-health.test.ts tests/integration/metadata-health-api.test.ts tests/integration/web-metadata-health.test.ts tests/e2e/report-display.spec.mjs docs/API_CONTRACTS.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/datahub-client/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/datahub-health.test.ts tests/integration/metadata-health-api.test.ts tests/integration/web-metadata-health.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/datahub-health.test.ts tests/integration/metadata-health-api.test.ts tests/integration/web-metadata-health.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/api --filter @dii/web build`
- Exactly one `pnpm test:e2e:report` run asserting fixture metadata ready, submit -> processing ->
  completed -> full evidence display, resolved evidence references, clean console output, and a total
  duration under three minutes.

Validation result on the Windows managed worktree, 2026-07-18:

- Project-local changed-file Prettier check passed in 0.901 seconds and affected ESLint passed in 2.862
  seconds. The initial formatter bootstrap could not resolve `node` for `esbuild`; a bundled-Node retry
  completed dependency installation but exposed the known managed-runtime `pnpm exec` shim issue. The
  verified project-local `.CMD` shim was used, and the generated repository-local `.pnpm-store` was
  removed after its resolved path was confirmed inside this worktree.
- All four affected type checks passed: shared-types 2.736 seconds, datahub-client 2.879 seconds, API
  3.452 seconds, and web 3.410 seconds.
- The initial sandboxed Vitest command was classified as environment-only because esbuild could not
  read managed-worktree ancestor metadata. One scoped retry passed 7/7 files and 32/32 tests in 1.46
  seconds (2.175 seconds wall), covering every health status, real local fake HTTP responses, fixture
  no-credential behavior, API normalization, web presentation, canonical incidents, and report
  compatibility.
- The first sandboxed build reached shared-types/datahub-client but hit the same ancestor-metadata
  denial in Vite. One scoped retry passed all four affected builds in 6.902 seconds; web transformed
  109 modules and built in 1.22 seconds.
- Exactly one `pnpm test:e2e:report` selected API `http://127.0.0.1:62669` and web
  `http://127.0.0.1:62670`, then passed in 5.422 seconds (11.281 seconds wall). It asserted fixture
  metadata ready before submit, processing, completed full evidence display, resolved evidence
  references, clean console output, the three-minute limit, and selected-port cleanup.

Exact next action: review secrets/diff/generated artifacts, create `feat: add datahub health status`,
push without rewrite, open the stacked draft PR against `codex/phase-1-level-d-closure`, and follow
exactly one CI run. Slice 2.2 entity search remains blocked until that CI and merge-readiness check pass.

Base-advance merge-readiness follow-up: after draft PR #7 was opened, the remote base was found at
direct child `c7e6fbe527a813879c06d5f79f26133affb8766c` (`test: harden Windows pnpm shim fallback`) rather
than the locked starting commit. It changes only the launcher shim resolver, its focused test, and the
session log; it does not contain PR #4/#6 or product work. A non-rewriting merge-forward had one
append-only `docs/SESSION_LOG.md` conflict. The resolution keeps both entries. Focused Prettier passed in
0.522 seconds, ESLint in 1.407 seconds, and the launcher regression passed 3/3 in 1.10 seconds (1.774
seconds wall). The browser flow was not repeated: the base commit preserves the validated `.cjs` path
used by the already-passing Slice 2.1 flow and changes only the unused native-shim fallback.

### Slice 2.2 — DataHub entity search

Status: Level C passed locally on `codex/phase-2-2-entity-search` from exact final Slice 2.1 HEAD
`325b21c5d4ca106e3b01b3926d4eecd5378dedd7`, which contains feature commit
`95ad76d4b02ab4c5bd005b2389b17034af3fd957` and the non-rewriting Phase 1 base advance. Commit,
stacked draft PR, and one terminal CI observation are pending.

Objective: let a user submit a bounded metadata query and receive compact, deterministic,
schema-validated entity results through one shared request/response contract, the fixture or DataHub
search boundary, a thin API route, and the existing web shell. Results expose only a stable URN,
normalized entity type, display name, and safe optional description or qualified name.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for trimmed, bounded
  search request/response schemas and stable metadata-search error codes.
- `packages/datahub-client/src/index.ts`, `fixtures/metadata/removed-schema-column.json`,
  `tests/integration/fixture-adapter.test.ts`, `tests/integration/datahub-health.test.ts`, and a focused
  DataHub search client test for deterministic fixture search plus official GraphQL
  `searchAcrossEntities` mapping and safe error normalization.
- `packages/agent-core/src/index.ts` and its focused runner test only where the adapter request shape
  must preserve the existing fixture seed fallback for canonical incidents.
- `apps/api/src/index.ts` and a focused metadata-search API integration test for mode-specific
  composition, validation, schema-valid success, and safe typed provider errors.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and a focused web search behavior test for compact
  accessible query/filter controls, loading/success/empty/error presentation, focus management, and
  stale-response protection without redesigning the shell.
- `tests/e2e/report-display.spec.mjs` for exactly one combined fixture entity-search flow followed by
  the canonical incident processing/completed regression with clean console output.
- `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`, `docs/IMPLEMENTATION_PLAN.md`,
  `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the durable contract and handoff.

Acceptance criteria:

- `POST /metadata/search` strictly validates and trims a query of 2-200 characters, an optional
  `dataset|dashboard|pipeline|chart` filter, and an integer limit from 1-20 with a bounded default.
- Every success response is schema-valid, contains no duplicate URNs or raw provider payload, contains
  no more than the accepted limit, and uses deterministic normalized ordering.
- Fixture mode returns at least a multiple-result query, a true empty result, and an entity-type
  filtered result without reading `DATAHUB_*`, Stitch, or any credential. The existing incident runner
  keeps its declared fixture-seed fallback and canonical Phase 1 behavior.
- DataHub mode posts Bearer-authenticated GraphQL to the official `/api/graphql`
  `searchAcrossEntities(input: SearchAcrossEntitiesInput!)` boundary with `query`, `types`, `start: 0`,
  and bounded `count`. Dataset, dashboard, chart, data-flow, and data-job results normalize to the
  shared entity shape; unsupported or malformed provider results never cross the boundary.
- Missing configuration, 401/403, refusal/non-success, timeout, invalid response, invalid JSON, and
  GraphQL/schema errors normalize to safe typed metadata errors without logging or returning URL,
  token, Authorization header, raw body, or provider exception text.
- The web preserves the Slice 2.1 health region and Phase 1 incident/report UI while adding semantic
  search controls and a compact result list. Keyboard submit works, terminal search status receives
  sensible focus, loading/error/empty/success are explicit, and an older request cannot overwrite a
  newer result.
- Targeted contract/client/API/web tests pass, all five affected production builds pass, and exactly
  one browser flow proves fixture search submit -> result list -> canonical incident submit ->
  processing -> completed/full evidence with no console warning/error.

Deferred: entity selection or detail, lineage traversal, owners or deep change history, incident
orchestration through live DataHub search, live credential smoke, Slice 2.3, controller changes,
additional providers, model reasoning, dependency/lockfile changes, and Level D validation.

Exact Level C commands (run as one coherent sequence after implementation):

- `pnpm exec prettier --write packages/shared-types/src/index.ts packages/datahub-client/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css fixtures/metadata/removed-schema-column.json tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-health.test.ts tests/integration/datahub-search.test.ts tests/integration/metadata-health-api.test.ts tests/integration/metadata-search-api.test.ts tests/integration/web-metadata-health.test.ts tests/integration/web-metadata-search.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/datahub-client/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css fixtures/metadata/removed-schema-column.json tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-health.test.ts tests/integration/datahub-search.test.ts tests/integration/metadata-health-api.test.ts tests/integration/metadata-search-api.test.ts tests/integration/web-metadata-health.test.ts tests/integration/web-metadata-search.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/datahub-client/src packages/agent-core/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-health.test.ts tests/integration/datahub-search.test.ts tests/integration/metadata-health-api.test.ts tests/integration/metadata-search-api.test.ts tests/integration/web-metadata-health.test.ts tests/integration/web-metadata-search.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-health.test.ts tests/integration/datahub-search.test.ts tests/integration/metadata-health-api.test.ts tests/integration/metadata-search-api.test.ts tests/integration/web-metadata-health.test.ts tests/integration/web-metadata-search.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`
- Exactly one `pnpm test:e2e:report` run combining fixture entity search with the canonical incident
  regression, resolved evidence references, clean console output, and the existing three-minute bound.
- `git diff --check`, changed-file secret-pattern scan, `git diff --stat`, `git diff --name-status`,
  generated-artifact path scan, full scoped diff review, and `git status --short --branch` before the
  conventional commit; repeat only final status after commit/push to prove a clean worktree.

Validation result on the Windows managed worktree, 2026-07-18:

- The first formatter command completed dependency bootstrap and supply-chain verification but then
  hit the known `pnpm exec` shim-resolution restriction. The verified project-local `.CMD` shim
  formatted the scoped files in 1.970 seconds; changed-file Prettier check passed in 2.089 seconds.
  The generated `.pnpm-store` was path-verified inside the worktree and moved intact to
  `C:\tmp\dii-slice-2-2-pnpm-store-019f75bc`.
- Affected ESLint initially found one empty-interface alias and one browser-global reference. After
  the targeted two-line fix, the full affected lint scope passed in 2.889 seconds. All five affected
  typechecks passed: shared-types 4.412 seconds, datahub-client 2.987 seconds, agent-core 3.595 seconds,
  API 4.553 seconds, and web 4.343 seconds.
- Sandboxed Vitest was blocked before tests by the known esbuild ancestor-metadata restriction. One
  scoped retry exposed three targeted test-data/assertion failures; after fixing the revenue-token
  fixture collision, the no-match query, and the safe-error assertion, final combined evidence is
  11/11 files and 66/66 tests passing. A final DataHub-only edge-case review added and passed a twelfth
  fake-provider search test, proving shared-normalization failures map to `invalid_response`.
- The first build command passed shared-types and datahub-client before Vite hit the same sandbox
  restriction. A scoped retry passed agent-core, API, and web; all five affected builds therefore pass.
  Web transformed 109 modules and built in 1.92 seconds. The DataHub-only normalization follow-up then
  passed its affected typecheck, 12/12 search-client tests, and datahub-client build.
- Exactly one `pnpm test:e2e:report` selected API `http://127.0.0.1:49680` and web
  `http://127.0.0.1:49681`, then passed fixture search -> deterministic focused result list -> incident
  processing -> completed/full evidence in 11.569 seconds (18.294 seconds wall). Console checks,
  evidence-reference resolution, three-minute bound, selected-port cleanup, and launcher cleanup all
  passed. It was not repeated after the DataHub-only normalization edge fix because the fixture/browser
  execution path did not change and the slice permits exactly one browser run.
- `git diff --check`, tracked-plus-untracked secret scan, generated-artifact scan, scoped diff review,
  name/stat review, and branch/worktree review passed; secret matches `0`, generated artifact matches
  `0`, with 15 tracked and 3 untracked intended files before commit. Live DataHub smoke remains
  credential-gated and Level D remains deferred.

Exact next action: create conventional commit `feat: add datahub entity search`, push without rewrite,
open a stacked draft PR against `codex/phase-2-1-datahub-health`, and observe exactly one CI run to a
terminal state. After a green handoff, create a separate task for Slice 2.3 — bounded, cycle-safe
DataHub lineage; do not begin it in Slice 2.2.

Slices: client health/error normalization; entity search; bounded/cycle-safe lineage; metadata and recent
changes. Completion requires fixture and DataHub adapters to run through unchanged business logic.

## Phase 3 — Agent reasoning

Slices: parse and gather; suspicious-change detection; evidence-linked hypothesis scoring; remediation
and fallback. Completion requires fact/inference/missing-information separation and deterministic limits.

## Phase 4 — Evaluation and reliability

Build the seven canonical incident cases and output Markdown/JSON metrics for retrieval, root cause,
evidence, unsupported claims, latency, tool calls, and token use.

## Phase 5 — UX and demo

Deliver the incident input, scenario selector, progress, root-cause summary, evidence timeline, lineage,
and recommended actions. Use Stitch only as optional design assistance under
`docs/FRONTEND_WORKFLOW.md`.

## Phase 6 — Minimum production readiness

Input/request limits, sanitized logs, timeouts, limited retries, secret checks, rate limiting, and public
deployment hardening.

## Phase 7 — GitHub, CI, and release

Finalize branch/PR workflow, full CI, release validation, smoke tests, and merge readiness.

## Phase 8 — Submission

Public repository, deployment URL, screenshots, video, Devpost copy, architecture explanation, known
limitations, rehearsal, release tag, and checklist completion.
