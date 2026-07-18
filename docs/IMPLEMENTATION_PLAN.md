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

### Infrastructure stabilization - Codex managed-worktree bootstrap

Status: complete on `codex/stabilize-managed-worktree-bootstrap` from exact Slice 1.2 commit
`b7a3e699198f7ebae187a5485d0a540a7127cb75`. This is an infrastructure-only objective and does not
start Slice 1.3 or Phase 2.

Objective: make a newly created Codex managed worktree install the locked workspace dependencies with
the required Node and pnpm versions on Windows and macOS, while documenting the verified Local
Environment UI wiring when the desktop app exposes no callable configuration API.

Root-cause classification:

- Codex's bundled `pnpm.cmd` is on the Windows agent `PATH`, but the sibling bundled `node.exe`
  directory is not. Dependency lifecycle scripts that invoke `node` therefore fail even though pnpm
  itself starts.
- A new managed worktree contains tracked files but no root `node_modules`, so `pnpm exec` cannot rely
  on root tool binaries until a frozen install completes.
- Invoking package-manager shims that need uncached Corepack/pnpm metadata can fail offline; bootstrap
  must use the exact `packageManager` version already exposed by the host and must not silently
  download or activate another pnpm version.
- The checksum-verified Windows portable `gh.exe` is intentionally ignored under `work/tools/` and is
  absent from managed worktrees. GitHub CLI remains a host prerequisite and must not be copied into
  worktrees or into macOS setup.

Minimum files:

- Platform-specific, tracked bootstrap scripts under `scripts/`.
- `docs/LOCAL_ENVIRONMENT.md` with verified desktop-app setup instructions, prerequisites, failure
  diagnostics, and the exact schema/API blocker.
- `CODEX.md`, repository map, known issues, and session log for durable handoff.
- `.worktreeinclude` only if validation identifies a safe ignored setup file that is genuinely
  required; otherwise leave it absent.

Acceptance criteria:

- Windows bootstrap discovers a compatible host or Codex-bundled Node without a username or absolute
  machine path, exposes it to dependency lifecycle scripts, verifies Node `>=24`, and invokes exact
  pnpm `11.9.0` without relying on missing online package-manager metadata.
- macOS bootstrap verifies Node `>=24` and exact pnpm `11.9.0` from the host environment before using
  them; it contains no Windows binary or path.
- Both platform scripts run `pnpm install --frozen-lockfile`, then prove `node`, `pnpm`,
  `pnpm exec`, and one static repository command work.
- Official Codex behavior and the current callable-tool boundary are documented. If the Local
  Environment file can only be generated through desktop UI, no unverified schema is committed; the
  documented UI setup points to the tracked platform scripts.
- Existing `.codex/config.toml` still parses and retains `workspace-write`, `on-request`,
  `auto_review`, approved network access, and the existing secret-safe optional MCP configuration.
- No product source, dependency version, lockfile, credential, auth state, portable `gh`, or secret is
  changed or copied.

Deferred: Slice 1.3, Phase 2, product tests, full Level D validation, global installation of Node/pnpm,
and installation or authentication of GitHub CLI on contributor hosts.

Validation commands:

- Parse `.codex/config.toml` and every new structured config with a standard parser.
- Run the Windows bootstrap from a clean dependency state or equivalent disposable copy and capture
  versions plus frozen-install evidence.
- Run `bash scripts/bootstrap-worktree.sh` from a clean macOS managed worktree and capture versions,
  frozen-install evidence, the static check, and final Git status.
- Run `pnpm exec prettier --check` on the changed documentation/scripts and one affected static command
  only; do not run the full product suite.
- Scan the diff for secrets, generated artifacts, absolute machine paths, dependency/lockfile changes,
  and unintended `.worktreeinclude` entries.

Validation result: passed on Windows and macOS 2026-07-18. From an empty Windows dependency state, the bootstrap found
Codex-bundled Node `v24.14.0` and pnpm `11.9.0`, completed the frozen install of 257 packages with the
lockfile resolution skipped, resolved root Prettier `3.9.5` through `pnpm exec`, and passed its static
format check. PowerShell parsing, POSIX `bash -n`, TOML parsing/policy assertions, changed-document
Prettier, `git diff --check`, secret/absolute-path scans, and the scoped diff review passed. The first
changed-document Prettier attempt was classified as a sandbox restriction because pnpm could not
access its host store; the identical targeted check passed once with scoped access.

From a clean detached macOS worktree at commit `5e75b72b21c01290afaa4f89dadf01c591ea803a`,
`bash scripts/bootstrap-worktree.sh` selected Homebrew Node `v26.3.0` and pnpm `11.9.0`, completed the
frozen install of 257 packages with lockfile resolution skipped, resolved Prettier `3.9.5` through
`pnpm exec`, passed the static Prettier check, printed `Managed-worktree bootstrap completed.`, and
left `git status` clean. No product source, dependency, lockfile, Local Environment schema,
`.worktreeinclude`, credential, or portable binary changed.

Merge-readiness update (2026-07-18): merge exact `origin/main`
`c3f1830c77f4eda4da7cf1ce729439aa1fd0fd12` into PR #4 without rebase or history rewrite, preserving
all Phase 1 product/launcher completion evidence and the bootstrap/local-environment contract.

Acceptance and validation:

- The merge commit is a descendant of both `origin/main` and PR #4 head
  `99dfc5f7a086808b25d8a57988524769bca0cf87`.
- Conflict resolution is limited to project memory and retains the Phase 1 E2E/Level D evidence plus
  the Windows/macOS bootstrap decisions and commands.
- The PR diff against `main` contains only bootstrap/local-environment changes and merge-resolution
  documentation; no Phase 1 product, launcher, manifest, lockfile, or test is reversed or deleted.
- Run changed-file formatting, `git diff --check`, a secret/absolute-path scan, PowerShell parsing, and
  the Windows bootstrap from a fresh temporary export with frozen-lockfile/root-tool evidence.
- Do not rerun browser E2E or the full product suite because their inputs come unchanged from green
  `main`; CI covers repository validation. Fresh macOS QA of the post-merge head remains pending.

Windows merge-readiness result: a fresh temporary export of the prospective merge index contained no
dependencies or local pnpm store and retained the Phase 1 launcher. PowerShell parsing passed, then
`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bootstrap-worktree.ps1` selected Node
`v24.14.0` and pnpm `11.9.0`, installed 259 packages with lockfile resolution skipped, resolved root
Prettier `3.9.5`, passed the static check, and completed in `6.893s`. Post-merge macOS QA remains the
only platform validation pending before PR #4 can leave draft.

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

### Phase 1 launcher port-race CI hotfix

Status: local validation passed from exact `origin/main`
`f86dc552c6cb5805eb1a6b032a1b90a683a9a84f` after main CI run `29649047565`, job `88092112833`,
failed with `EADDRINUSE` in `tests/integration/report-launcher.test.ts`. Draft-PR CI remains pending.

Objective: remove the integration-test TOCTOU window between finding, closing, and rebinding a free
port without changing product behavior, browser-launcher runtime behavior, or beginning Phase 2.

Minimum files:

- `tests/integration/report-launcher.test.ts` for atomic `port: 0` binding and the focused regression.
- `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for CI evidence and
  handoff.

Acceptance criteria:

- Test-owned HTTP listeners bind atomically to port `0` and use the actual bound port reported by the
  server; no close-then-rebind free-port probe remains in the failing cleanup contract.
- The managed descendant-tree cleanup contract still reaches HTTP readiness, terminates only its own
  process tree, and proves the selected listener is released.
- Changed-file Prettier, affected ESLint, and
  `pnpm exec vitest run tests/integration/report-launcher.test.ts` pass. After the first post-fix pass,
  run the focused file at most five additional consecutive times to assess flakiness.
- Diff, conflict-marker, secret, and worktree reviews pass; one conventional commit is pushed to a
  draft PR based on `main`, followed by exactly one new CI run without rerunning the failed main run.

Deferred: browser E2E, the full suite, builds, product/UI/API changes, PR #4 reversal, and all Phase 2
work. Browser E2E remains deferred because the launcher runtime contract is unchanged; this fix only
changes test-owned listener allocation.

Validation result on Windows, 2026-07-18:

- The focused pre-fix file passed locally once in `13.103s`, so the defect is classified as test
  flakiness from the exact CI `EADDRINUSE` evidence rather than a deterministic local failure.
- The readiness contract keeps its HTTP server bound to OS-assigned port `0` while the port is used.
  The cleanup descendant now binds its own port `0`, reports the actual bound port through stdout, and
  is probed only after that atomic bind succeeds; no retry, sleep, or random fixed range was added.
- Changed-file Prettier passed in `1.971s` and affected ESLint passed in `3.355s`.
- The first post-fix focused run passed 3/3 in `2.61s` (`5.079s` wall). Five additional consecutive
  focused runs also passed 3/3 each in `22.681s` total.

Exact next action: update project memory, review the scoped diff and secret/conflict markers, create one
conventional commit, push the fix branch, open a draft PR against `main`, and follow exactly one CI run.
Do not rerun the failed main run, merge the fix PR, or begin Phase 2.

### Phase 1 post-merge Level D closure

Status: passed on `phase/phase1-post-merge-closure` from exact integrated `origin/main`
`ab1559e3a8364e8c65aeed7407fd4ddfb2390cec`. Supplied main CI run `29649987430`, job
`88094568246`, is green; PR #4 bootstrap and PR #8 port-race fix are both merged and remain intact.

Objective: run the final Phase 1 Level D checkpoint on the fully integrated main tree, prove the
credential-free canonical fixture flow, and publish docs-only closure evidence without starting Phase 2.

Minimum files:

- `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the integrated
  validation record and handoff.
- No product, test, launcher, bootstrap, manifest, lockfile, or repository-map change unless a
  classified gate failure requires a targeted in-scope fix.

Acceptance criteria:

- The merged Windows bootstrap verifies Node/pnpm and frozen dependencies before repository commands.
- Repository format, lint, all workspace type-checks, the complete unit/integration/smoke test suite,
  all production builds, and the primary artifact smoke pass exactly once through `pnpm validate`.
- Exactly one `pnpm test:e2e:report` completes
  `submit -> processing -> completed -> full evidence display` in under three minutes, resolves every
  hypothesis evidence reference, reports no browser console warning/error, and leaves no selected
  listener or launcher descendant behind.
- Diff, secret, conflict-marker, generated-junk, ancestry, and clean-worktree reviews pass; a docs-only
  conventional commit is pushed to one draft PR based on `main`, followed by exactly one new CI run.

Validation commands:

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bootstrap-worktree.ps1`
- `pnpm validate`
- `pnpm test:e2e:report`
- Changed-doc Prettier plus read-only diff/secret/conflict/generated-junk/worktree review after the gate.

Validation result on Windows, 2026-07-18:

- Bootstrap selected Node `v24.14.0` and pnpm `11.9.0`, confirmed the frozen workspace was already up
  to date, resolved Prettier `3.9.5`, and passed its static check in `5.356s`.
- The single `pnpm validate` wrapper stopped at its first step after `8.734s` because this checkpoint's
  newly added plan section needed formatting; lint/typecheck/test/build/smoke had not run. After the
  targeted docs-only Prettier write, repository format passed in `2.798s`. The remaining unchanged
  wrapper components then ran once each: lint passed in `31.434s`; type-check passed for 6/7 workspace
  projects in `36.859s`; build passed for 6/7 projects in `15.967s` with 109 web modules; and smoke
  passed both API/web artifacts in `0.905s`.
- The first full test attempt reported 15/17 passing and two `5s` API timeouts despite the logged
  health response completing in `15.49ms`. The exact failing pair then passed 5/5 in `1.88s`
  (`3.731s` wall), classifying the failure as transient environment contention rather than an
  implementation defect. The one recovery run of the full suite passed 7 files/17 tests in `2.64s`
  (`4.568s` wall); no product or test fix was made.
- Exactly one `pnpm test:e2e:report` selected API `http://127.0.0.1:61369` and web
  `http://127.0.0.1:61370`, then passed the canonical fixture flow in `32.400s` (`43.082s` wall), under
  three minutes. Its assertions covered processing, completed/full evidence display, real hypothesis
  evidence references, and clean browser console output. Read-only post-run probes found zero
  listeners on both ports and zero launcher-related processes.
- Phase 1 is fully integrated and closed on the exact main tree above. No Phase 2 implementation was
  started.

Deferred: all DataHub implementation, additional fixture scenarios, durable persistence, broader
cross-browser coverage, deployment, and Phase 2. The exact next implementation step after this gate
passes is a separate Phase 2 Slice 2.1 DataHub client task.

Exact next step: after the docs-only closure PR is reviewed and merged, create a separate project task
for Phase 2 Slice 2.1 — DataHub client health/error normalization from the then-current exact `main`.
Do not begin that slice in this checkpoint.

Phase completion: a clean clone can select a demo incident and receive a complete report.

## Phase 2 — DataHub integration

### Slice 2.1 — DataHub health and provider error normalization

Status: Level C and draft-PR CI passed on `codex/phase-2-1-datahub-health`; affected validation also
passes for the prospective merge of integrated `main` into PR #7. Merge commit, push, PR retarget, and
final-head CI are pending.

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

Exact next action: finish the integrated-main sync review, create and push the non-rewriting merge
commit, retarget draft PR #7 to `main`, and follow exactly one final-head CI run. Slice 2.2 entity search
remains out of scope and PR #10 must not be modified.

Base-advance merge-readiness follow-up: after draft PR #7 was opened, the remote base was found at
direct child `c7e6fbe527a813879c06d5f79f26133affb8766c` (`test: harden Windows pnpm shim fallback`) rather
than the locked starting commit. It changes only the launcher shim resolver, its focused test, and the
session log; it does not contain PR #4/#6 or product work. A non-rewriting merge-forward had one
append-only `docs/SESSION_LOG.md` conflict. The resolution keeps both entries. Focused Prettier passed in
0.522 seconds, ESLint in 1.407 seconds, and the launcher regression passed 3/3 in 1.10 seconds (1.774
seconds wall). The browser flow was not repeated: the base commit preserves the validated `.cjs` path
used by the already-passing Slice 2.1 flow and changes only the unused native-shim fallback.

Integrated-main sync follow-up (2026-07-18): merge exact green `origin/main`
`54945b80a27685ce81e476173a3466e585f42112` into PR #7 head
`325b21c5d4ca106e3b01b3926d4eecd5378dedd7` without rebase or rewrite, then retarget the draft PR to
`main`. Preserve feature commit `95ad76d4b02ab4c5bd005b2389b17034af3fd957`, all Slice 2.1
contracts and tests, and all integrated Phase 1 bootstrap, port-race, and closure evidence. The only
merge conflict is append-only project memory in `docs/SESSION_LOG.md`; resolution must retain both
histories. The prospective PR diff against `main` must contain only Slice 2.1 behavior, tests, and
documentation, with no Slice 2.2 source or Phase 1 reversal.

Sync validation commands:

- Project-local Prettier on the Slice 2.1 PR diff plus the resolved implementation-plan, known-issues,
  and session-log files.
- Affected ESLint for shared-types, datahub-client, API, web, Slice 2.1 tests, and the merged launcher
  regression.
- Type-check `@dii/shared-types`, `@dii/datahub-client`, `@dii/api`, and `@dii/web`.
- Run the focused shared/DataHub health/API/web/compatibility Vitest files plus
  `tests/integration/report-launcher.test.ts`.
- Build the same four workspaces.
- Defer a second browser run only if the prospective merge tree is byte-identical to validated head
  `325b21c5d4ca106e3b01b3926d4eecd5378dedd7` for API source, web source, shared/DataHub source, and
  `tests/e2e`; otherwise run exactly one fixture browser flow.

Sync validation result on Windows:

- Changed-file Prettier write passed in `9.351s`; only the new session entry required wrapping.
  Affected ESLint passed in `101.748s`.
- Type-checks passed for shared-types in `15.356s`, datahub-client in `15.361s`, API in `17.677s`, and
  web in `18.680s`.
- The sandboxed focused Vitest command was classified as environment-only before tests because esbuild
  could not read managed-worktree ancestor metadata. Its single scoped retry ran 8 files/35 tests:
  33 passed, while the first request in each of two API files hit the known transient `5s` parallel-load
  timeout; all health normalization, fake-server, web, compatibility, and launcher cases otherwise
  passed. One exact two-file recovery passed 2/2 files and 7/7 tests in `1.88s` (`3.084s` wall) without
  a code or timeout change.
- All four affected builds passed in `15.251s`; web transformed 109 modules and built in `4.58s`.
- Browser E2E was not repeated because the API, web, shared/DataHub, and complete E2E input trees are
  byte-identical to validated `325b21c…`. The merged main change affects only the focused launcher
  integration test, which passed all 3 tests in the 8-file run.

Deferred: live DataHub smoke, full Level D/release validation, PR readiness/merge, PR #10 changes, and
all Slice 2.2/2.3 implementation.

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
