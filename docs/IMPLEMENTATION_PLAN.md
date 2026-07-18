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

Status: blocked on `codex/phase-1-level-d-closure`, starting from exact Slice 1.3 commit
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

Exact next action: keep Phase 2 blocked. The controller should decide whether to land the separately
green managed-worktree bootstrap dependency upstream or rerun this closure from a clean environment,
then address the browser launch contract as one bounded change covering cross-platform pnpm execution,
dedicated/dynamic ports and matching URL/readiness, and process-tree cleanup. Rerun the unresolved
canonical browser gate once after that coherent fix, and complete merge-readiness only after it passes.

Phase completion: a clean clone can select a demo incident and receive a complete report.

## Phase 2 — DataHub integration

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
