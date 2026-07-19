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

### Phase 1 launcher cleanup-ownership CI hotfix

Status: local focused gate passed on `fix/phase1-launcher-cleanup-ownership` from exact `origin/main`
`54945b80a27685ce81e476173a3466e585f42112`. PR #7 CI run `29651498475`, job `88098488706`,
passed 36/37 tests and failed only when the launcher integration test tried to rebind a released
descendant port. Draft PR publication and its single CI run are pending.

Objective: remove the cleanup test's post-exit port-rebind ownership race while preserving the
pre-cleanup HTTP readiness proof and the launcher runtime behavior.

Minimum files:

- `tests/integration/report-launcher.test.ts` for the exact descendant-PID cleanup assertion.
- `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for CI evidence and
  handoff.

Acceptance criteria:

- The fixture reports its actual descendant PID together with its OS-assigned port, and the existing
  HTTP readiness probe succeeds before cleanup.
- After `stopManagedProcesses`, a bounded cross-platform PID-liveness check proves that exact
  descendant is gone; no post-cleanup port bind, retry, random range, timeout widening, or launcher
  runtime change is introduced.
- Changed-file Prettier, affected ESLint, and one focused Vitest run pass. After that first post-fix
  pass, the focused file may run at most five additional consecutive times for flake assessment.
- Diff, secret, conflict-marker, and worktree reviews pass; one conventional commit is pushed to a
  draft PR based on `main`, followed by exactly one new CI run without rerunning the failed PR #7 run.

Validation commands:

- `pnpm exec prettier --check tests/integration/report-launcher.test.ts docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint tests/integration/report-launcher.test.ts`
- `pnpm exec vitest run tests/integration/report-launcher.test.ts` once, then at most five consecutive
  repetitions after the first post-fix pass.

Validation result on Windows, 2026-07-18:

- Frozen dependencies required a local install-state repair before Vitest could resolve Vite/esbuild;
  no manifest or lockfile changed. The single real pre-fix baseline then passed 1 file/3 tests in
  `6.80s` (`17.546s` wall), so the defect remains classified as test flakiness from the exact CI
  `EADDRINUSE` evidence.
- The fixture now reports its exact descendant PID and OS-assigned port. HTTP readiness still passes
  before managed cleanup, which is followed by a bounded `process.kill(pid, 0)` liveness wait for that
  exact PID. The post-cleanup port rebind is gone; launcher runtime code is unchanged.
- Changed-file Prettier passed in `6.401s`. The first ESLint process was stopped by its `30s` command
  harness limit without a result; the identical command then passed in `7.568s` with a sufficient
  harness budget.
- The primary post-fix run passed 1 file/3 tests in `1.74s` (`4.739s` wall). Of the five permitted
  assessment runs, the first stopped at fixture startup when its parent exited code `1` before
  reporting PID/port; a read-only process/listener probe proved zero fixture leak. The remaining four
  runs passed 1 file/3 tests each in `12.549s` total. The exact CI ownership assertion did not recur.

Deferred: browser E2E, the full suite, build, smoke, product/API/DataHub changes, PR #7 branch changes,
and all Phase 2 implementation. They are deferred because this hotfix changes only an integration-test
ownership assertion, not the launcher runtime or product inputs.

Exact next action: format the final project-memory changes, review the scoped diff, commit and push the
fix, open one draft PR against `main`, and follow exactly one CI run. Do not rerun PR #7 CI, merge the
fix PR, change PR #7, or begin Phase 2.

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

### Slice 2.3 — Bounded, cycle-safe DataHub lineage

Status: Level C passed locally on `codex/phase-2-3-bounded-lineage` from exact Slice 2.2 handoff
commit `65657aa7d06ad0a3457b16289a6e5311bb056592`; commit, stacked draft PR, and one terminal CI
observation are pending.

Objective: from a stable URN returned by entity search, let a user request upstream or downstream
lineage through one strict shared graph contract, the fixture or DataHub client boundary, a thin API
route, and a compact accessible web display. Traversal must be deterministic, bounded by depth, node,
provider-result, request-step, timeout, and AbortSignal limits, and terminate safely through cycles.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for strict lineage
  request/response schemas, defaults, hard caps, unique root/nodes/edges, deterministic ordering, and
  no-dangling-edge invariants.
- `packages/datahub-client/src/index.ts`, `fixtures/metadata/removed-schema-column.json`,
  `tests/integration/fixture-adapter.test.ts`, and a focused DataHub lineage client test for bounded
  fixture graphs plus official GraphQL one-hop lineage mapping, cycle/dedup termination, truncation,
  request-step cap, Bearer auth, timeout, and safe provider-error normalization.
- `apps/api/src/index.ts` and a focused metadata-lineage API integration test for mode-specific
  composition, validation/defaults, schema-valid success, missing root, and safe typed errors.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and a focused web lineage behavior test for
  semantic upstream/downstream actions on search results, bounded controls, loading/success/empty/
  truncated/error states, focus management, and stale-response protection.
- `tests/e2e/report-display.spec.mjs` for exactly one combined fixture search -> bounded lineage ->
  canonical incident processing/completed regression with a truncation/cycle-safe assertion and clean
  console output.
- `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`, `docs/IMPLEMENTATION_PLAN.md`,
  `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the durable contract and handoff.

Acceptance criteria:

- `POST /metadata/lineage` rejects unknown keys and accepts only a trimmed bounded root URN,
  `upstream|downstream`, integer depth within the shared hard cap, and integer `maxNodes` within the
  shared hard cap; small defaults are applied and client-supplied GraphQL is impossible.
- Every success response includes the root exactly once, unique stable nodes with safe display fields,
  unique directed source/target edges with no dangling references, deterministic node/edge ordering,
  requested depth, visited-node count, and an accurate `truncated` flag when depth or node bounds omit
  reachable nodes.
- Fixture mode provides deterministic multi-level upstream, branching downstream, cycle/self-loop,
  empty/missing-root, and depth/node truncation cases without reading `DATAHUB_*`, Stitch, LLM, or any
  credential. Existing health/search and the canonical Phase 1 incident flow remain compatible.
- DataHub mode uses the official `searchAcrossLineage(input: SearchAcrossLineageInput!)` GraphQL
  semantics with `urn`, `direction`, `start`, bounded `count`, and direct-degree filtering. Sequential
  BFS requests are capped, use the existing Bearer/timeout/AbortSignal boundary, and never retry or
  fan out without bounds.
- Missing configuration/root, 401/403, refusal/non-success, timeout, invalid content/JSON/GraphQL
  shape, provider errors, and malformed entities normalize to existing safe typed metadata outcomes;
  URL, token, header, raw payload/error, and stack trace never cross the adapter/API boundary.
- The web preserves health/search/incident UI, adds compact semantic lineage controls/actions and a
  readable root/node/edge list, protects against stale responses, and exposes controlled live/focus
  behavior for loading, success, empty, truncated, and safe-error states without duplicate DOM rows.
- Targeted contract/client/API/web and adjacent changed-boundary regressions pass, all five affected
  production builds pass, and exactly one browser flow proves fixture search -> bounded lineage ->
  canonical incident processing -> completed/full evidence with no console warning/error.

Official DataHub sources verified before implementation:

- The official lineage tutorial documents `searchAcrossLineage`/`scrollAcrossLineage` inputs with
  `urn`, `direction`, `count`, and a direct `degree` filter:
  <https://github.com/datahub-project/datahub/blob/master/docs/api/tutorials/lineage.md>.
- The official DataHub web client defines `searchAcrossLineage(input: $input)` with
  `SearchAcrossLineageInput!` and uses degree-one counts for upstream/downstream:
  <https://github.com/datahub-project/datahub/blob/master/datahub-web-react/src/graphql/lineage.graphql>.

Deferred: recent changes/change events (Slice 2.4), owners, schema details, confidence or impact
scoring, investigation orchestration through live DataHub lineage, live credential smoke, additional
providers, controller changes, model reasoning, dependency/lockfile changes, and Level D validation.

Exact Level C commands (run as one coherent sequence after implementation):

- `pnpm exec prettier --write packages/shared-types/src/index.ts packages/datahub-client/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css fixtures/metadata/removed-schema-column.json tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-search.test.ts tests/integration/datahub-lineage.test.ts tests/integration/metadata-search-api.test.ts tests/integration/metadata-lineage-api.test.ts tests/integration/web-metadata-search.test.ts tests/integration/web-metadata-lineage.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/datahub-client/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css fixtures/metadata/removed-schema-column.json tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-search.test.ts tests/integration/datahub-lineage.test.ts tests/integration/metadata-search-api.test.ts tests/integration/metadata-lineage-api.test.ts tests/integration/web-metadata-search.test.ts tests/integration/web-metadata-lineage.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/datahub-client/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-search.test.ts tests/integration/datahub-lineage.test.ts tests/integration/metadata-search-api.test.ts tests/integration/metadata-lineage-api.test.ts tests/integration/web-metadata-search.test.ts tests/integration/web-metadata-lineage.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-search.test.ts tests/integration/datahub-lineage.test.ts tests/integration/metadata-search-api.test.ts tests/integration/metadata-lineage-api.test.ts tests/integration/web-metadata-search.test.ts tests/integration/web-metadata-lineage.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`
- Exactly one `pnpm test:e2e:report` run combining fixture entity search, selected bounded lineage with
  truncation/cycle-safe evidence, canonical incident processing/completed/full evidence, resolved
  evidence references, clean console output, and the existing three-minute bound.
- `git diff --check`, tracked-plus-untracked secret-pattern scan, `git diff --stat`,
  `git diff --name-status`, generated-artifact path scan, full scoped diff review, and
  `git status --short --branch` before the conventional commit; repeat only final status after
  commit/push to prove a clean worktree.

Validation result on the Windows managed worktree, 2026-07-18:

- The first formatter bootstrap verified the unchanged lockfile and supply-chain policy but failed
  because esbuild postinstall could not find Node. After loading the bundled runtime, the second
  bootstrap completed but `pnpm exec` did not resolve workspace binaries. Read-only probes confirmed
  `NODE_ENV`/npm/pnpm production flags were unset, `prettier@3.9.5` was present as a root
  devDependency, and `node_modules/.bin/prettier.cmd` existed. Direct changed-file formatter write
  passed in 2.5 seconds, format check passed in 2.2 seconds, and affected ESLint passed in 10.6
  seconds. The generated `.pnpm-store` was later path-verified, found to have zero worktree runtime
  process holders, and removed exactly.
- All five affected typechecks passed: shared-types 8.1 seconds, datahub-client 8.3 seconds,
  agent-core 8.2 seconds, API 9.1 seconds, and web 8.9 seconds.
- Direct sandboxed Vitest reached the known managed-worktree ancestor-metadata denial. The exact
  scoped retry passed 11/11 files and 81/81 tests in 9.03 seconds (10.2 seconds command wall),
  including 12 DataHub-lineage tests and 15 lineage-API tests for official one-hop variables, auth,
  timeout, safe errors, missing root, multi-depth/branching traversal, cycle/self-loop dedup, depth/
  node/request caps, fixture no-credential behavior, API schema validation, UI states, focus, and stale
  ownership.
- The first affected build command passed shared-types and datahub-client before Vite hit the same
  ancestor-metadata denial. A scoped retry passed agent-core, API, and web; all five affected builds
  therefore pass. Web transformed 109 modules and built in 1.64 seconds.
- Exactly one `pnpm test:e2e:report` selected API `http://127.0.0.1:56205` and web
  `http://127.0.0.1:56206`, then passed deterministic fixture search -> selected downstream lineage
  with a three-node cap -> visible truncation plus unique-root/cycle-safe self-loop evidence ->
  canonical incident processing -> completed/full evidence in 16.096 seconds (23.3 seconds command
  wall). Existing clean-console, resolved-evidence, responsive-overflow, three-minute, port, and
  launcher cleanup checks passed.
- `git diff --check`, tracked-plus-untracked secret scan, generated-artifact scan, scoped full diff,
  name/stat, and branch/worktree review passed; secret matches `0`, generated artifact matches `0`,
  with 13 tracked and 3 intended untracked files before documentation finalization. Live DataHub smoke
  remains credential-gated and Level D remains deferred because Slice 2.3 does not close Phase 2.

Exact next action: create conventional commit `feat: add bounded datahub lineage`, push fast-forward,
open a stacked draft PR against `codex/phase-2-2-entity-search`, and observe exactly one CI run to a
terminal state. After a green handoff, create a separate task for Phase 2 Slice 2.4 — metadata and
recent changes; do not begin it here.

### Slice 2.4 — Metadata and recent changes

Status: Level C passed locally on `codex/phase-2-4-recent-changes` from exact final Slice 2.3 HEAD
`a5339fbaca1c855720bb6df1377b233db30924ac`.

Objective: from a stable URN returned by entity search or bounded lineage, let a user request a
time-windowed, count-bounded list of recent metadata facts through one strict shared contract, the
fixture or DataHub client boundary, a thin API route, and a compact accessible web display. The slice
collects and displays facts only; it does not infer impact, correlation, cause, or investigation
hypotheses.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for strict recent-change
  request/response schemas, small defaults, hard window/count caps, UTC timestamps, allowlisted
  categories/operations, stable identity, deterministic ordering/dedup, and truncation invariants.
- `packages/datahub-client/src/index.ts`, `fixtures/metadata/removed-schema-column.json`,
  `tests/integration/fixture-adapter.test.ts`, and a focused DataHub recent-changes client test for
  deterministic fixture history plus official GraphQL `getTimeline` mapping, one-request cap, Bearer
  auth, timeout, missing entity, malformed response, safe normalization, and local window/count bounds.
- `apps/api/src/index.ts` and a focused recent-changes API integration test for mode-specific
  composition, validation/defaults, schema-valid success, missing entity, and safe typed errors.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and a focused web recent-changes behavior test for
  semantic actions on search results and lineage nodes, loading/success/empty/truncated/error states,
  focus management, accessible list/time markup, and stale-response protection.
- `tests/e2e/report-display.spec.mjs` for exactly one combined fixture search -> bounded lineage ->
  recent changes -> canonical incident processing/completed regression with facts/order/truncation and
  clean-console assertions.
- `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`, `docs/IMPLEMENTATION_PLAN.md`,
  `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the durable contract and handoff.

Acceptance criteria:

- `POST /metadata/recent-changes` rejects unknown keys and accepts only a trimmed bounded entity URN,
  an optional canonical UTC end time, an integer window with a small default and hard maximum, and a
  positive integer limit with a hard cap. Client-supplied GraphQL, raw provider queries, and synthetic
  cursors are impossible.
- Every success response echoes the entity and accepted bounds, records the exact requested UTC
  start/end window, contains unique stable IDs and only allowlisted categories/operations, and returns
  canonical UTC timestamps in deterministic newest-first then ID order. Every change matches the
  requested entity and window; returned count matches the list; `truncated` is true when the window,
  limit, or documented provider cap omits history.
- Fixture mode provides multiple categories, same-timestamp stable ordering/dedup, true empty history,
  missing entity, and window/limit truncation while preserving the canonical incident and never reading
  `DATAHUB_*`, Stitch, LLM, or another credential. Malformed records appear only in fake-provider tests.
- DataHub mode reuses `/api/graphql`, Bearer auth, one total timeout/AbortSignal, and safe provider
  errors. It issues one official `getTimeline(input: GetTimelineInput!)` query plus an entity existence
  check, performs no retry/fan-out, maps only official allowlisted categories/operations, derives short
  factual summaries without raw actor identifiers or provider payloads, and normalizes auth, timeout,
  unavailable, missing, GraphQL, timestamp, and shape failures.
- The web preserves health, search, lineage, and incident/report UI while adding compact recent-change
  controls/actions and semantic heading/list/time output. Loading, success, empty, truncated, and safe
  error states are distinct; terminal focus is controlled and an older request cannot overwrite newer
  state.
- Targeted contract/client/API/web tests and adjacent changed-boundary regressions pass, all five
  affected production builds pass, and exactly one browser flow proves fixture search -> bounded
  lineage -> recent changes with expected facts/order/truncation -> canonical incident processing ->
  completed/full evidence with no console warning/error.

Official DataHub sources verified before implementation:

- The official GraphQL schema defines `getTimeline(input: GetTimelineInput!)`; the input accepts only
  `urn` and optional `changeCategories`, and returns change transactions with timestamp, actor, official
  category/operation enums, modifier, parameters, audit stamp, and description:
  <https://github.com/datahub-project/datahub/blob/master/datahub-graphql-core/src/main/resources/timeline.graphql>.
- The official web client requests that same field and response shape:
  <https://github.com/datahub-project/datahub/blob/master/datahub-web-react/src/graphql/timeline.graphql>.
- The official resolver calls `TimelineService` once with `DEFAULT_MAX_CHANGE_TRANSACTIONS`; the service
  constant is `100`. Because the public GraphQL input exposes no time range, page size, or cursor, this
  slice performs one bounded fetch and deterministic local window/limit filtering, exposes no cursor,
  and records provider-cap truncation:
  <https://github.com/datahub-project/datahub/blob/master/datahub-graphql-core/src/main/java/com/linkedin/datahub/graphql/resolvers/timeline/GetTimelineResolver.java>
  and
  <https://github.com/datahub-project/datahub/blob/master/metadata-service/services/src/main/java/com/linkedin/metadata/timeline/TimelineService.java>.

Deferred: impact analysis, change-to-incident correlation, hypothesis ranking, ownership enrichment,
schema diff viewer, investigation evidence integration, live credential smoke, additional providers,
controller or agent orchestration changes, dependency/lockfile changes, and Level D validation. The
Phase 2 integration checkpoint remains a separate next task after this slice is green.

Exact Level C commands (run as one coherent sequence after implementation):

- `pnpm exec prettier --write packages/shared-types/src/index.ts packages/datahub-client/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css fixtures/metadata/removed-schema-column.json tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/datahub-recent-changes.test.ts tests/integration/metadata-recent-changes-api.test.ts tests/integration/web-metadata-recent-changes.test.ts tests/e2e/report-display.spec.mjs docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/datahub-client/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css fixtures/metadata/removed-schema-column.json tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/datahub-recent-changes.test.ts tests/integration/metadata-recent-changes-api.test.ts tests/integration/web-metadata-recent-changes.test.ts tests/e2e/report-display.spec.mjs docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/datahub-client/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-search.test.ts tests/integration/datahub-lineage.test.ts tests/integration/datahub-recent-changes.test.ts tests/integration/metadata-search-api.test.ts tests/integration/metadata-lineage-api.test.ts tests/integration/metadata-recent-changes-api.test.ts tests/integration/web-metadata-search.test.ts tests/integration/web-metadata-lineage.test.ts tests/integration/web-metadata-recent-changes.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/investigation-runner.test.ts tests/integration/datahub-search.test.ts tests/integration/datahub-lineage.test.ts tests/integration/datahub-recent-changes.test.ts tests/integration/metadata-search-api.test.ts tests/integration/metadata-lineage-api.test.ts tests/integration/metadata-recent-changes-api.test.ts tests/integration/web-metadata-search.test.ts tests/integration/web-metadata-lineage.test.ts tests/integration/web-metadata-recent-changes.test.ts tests/integration/incidents-api.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`
- Exactly one `pnpm test:e2e:report` run combining fixture entity search, selected bounded lineage,
  selected recent changes with facts/order/truncation, canonical incident processing/completed/full
  evidence, resolved evidence references, clean console output, responsive overflow, existing
  three-minute bound, selected-port cleanup, and launcher process cleanup.
- `git diff --check`, tracked-plus-untracked secret-pattern scan, `git diff --stat`,
  `git diff --name-status`, generated-artifact path scan, full scoped diff review, and
  `git status --short --branch` before the conventional commit; repeat only final status after
  commit/push to prove a clean worktree.

Validation result on the Windows managed worktree, 2026-07-19:

- Frozen dependency bootstrap reused all 259 lockfile entries and passed supply-chain verification in
  4.4 seconds without manifest/lockfile changes. The planned `pnpm exec prettier` call then reproduced
  the known managed-runtime workspace-binary resolution failure in 0.564 seconds before formatting any
  file. The verified project-local formatter wrote the scoped files in 1.707 seconds and changed-file
  format check passed in 1.291 seconds.
- Affected ESLint first found one `no-control-regex` implementation error in the new DataHub field
  sanitizer. Replacing that regex with equivalent character-code filtering and rerunning only the
  affected formatter/lint scope passed; targeted lint took 1.358 seconds. The first parallel typecheck
  report found one `exactOptionalPropertyTypes` mismatch in the new timeline parameter boundary; after
  the targeted type declaration fix, datahub-client format/lint/typecheck passed in 3.486 seconds.
  Final evidence for all five affected typechecks passed: shared-types 2.533 seconds, datahub-client in
  the targeted 3.486-second sequence, agent-core 2.788 seconds, API 3.462 seconds, and web 3.471 seconds.
- Sandboxed Vitest stopped before test execution because managed-worktree Vite could not resolve the
  esbuild package. The exact scoped retry passed 14/14 files and 116/116 tests in 8.73 seconds (11.131
  seconds command wall), including 12 DataHub recent-change client tests and 16 recent-change API tests
  for official request variables, one-request/provider cap, Bearer auth, UTC/category/field mapping,
  stable dedup/order, empty/missing/truncated behavior, timeout/unavailable/malformed sanitization,
  fixture no-credential behavior, UI states, and stale ownership.
- The first affected build sequence passed shared-types and datahub-client, then Vite met the same
  sandbox/esbuild restriction. The scoped retry passed agent-core, API, and web in 6.752 seconds, so all
  five affected production builds pass. Web transformed 109 modules and built in 1.33 seconds.
- Exactly one `pnpm test:e2e:report` selected API `http://127.0.0.1:62836` and web
  `http://127.0.0.1:62837`, then passed fixture search -> three-node bounded lineage -> recent changes
  with deterministic ownership/schema/tag facts, same-timestamp order, truncation and semantic time
  elements -> canonical incident processing -> completed/full evidence in 12.969 seconds (20.206
  seconds command wall). Clean console, terminal focus, resolved evidence references, responsive
  overflow, three-minute bound, selected-port cleanup, and launcher process cleanup all passed.
- Final boundary review hardened the DataHub stable ID with transaction/audit/modifier/parameter/
  description inputs that remain hash-only, preventing distinct same-time events from collapsing while
  exact duplicates still deduplicate. The DataHub-only affected rerun passed format/lint/typecheck in
  4.145 seconds, 12/12 client tests in 974ms (1.848 seconds command wall), and its build in 1.990
  seconds. Reusing the shared category schema directly in fixture validation then passed the affected
  format/lint/typecheck/build in 5.383 seconds and fixture plus DataHub adapter tests 19/19 in 961ms
  (1.667 seconds command wall). The browser path did not change, so the single browser run was not
  repeated. Full test review then found a January/July typo that made the same-timestamp assertion
  vacuous; the corrected assertion explicitly requires two rows and passed affected format/lint in
  1.536 seconds plus the 12/12 client tests in 913ms (1.651 seconds command wall).

Exact next action: complete the documented secret/diff/generated-artifact/worktree review, create the
single conventional commit `feat: add recent metadata changes`, push fast-forward, open a stacked draft
PR against `codex/phase-2-3-bounded-lineage`, and observe exactly one CI run to terminal. After a green
handoff, create a separate task for the Phase 2 integration checkpoint; do not begin impact analysis,
correlation, agent reasoning, or the checkpoint here.

### Phase 2 integration checkpoint — Level D closure

Status: local Level D passed and integrated-main merge-forward completed on
`codex/phase-2-integration-closure-20260718`. The checkpoint started from exact Slice 2.4 final HEAD
`43e6d35c9e7881e668eb7cd4837542e8a7fab8dd`, preserves feature commit
`9afc729bbe92625d8b92a3dfc943ad7134363666`, and now contains exact integrated `origin/main`
`fc08d5f32d8a77232ce6875b453884cbe68a4e6b`. PR #13 is merged; its supplied final feature CI run
`29654741893`, job `88106955273`, passed.

Objective: close Phase 2 with one repository-level integration checkpoint proving the complete Slice
2.1–2.4 capability chain and the canonical incident report on the exact green handoff, without adding a
feature, changing a provider contract, performing the PR #13 merge, or beginning Phase 3.

Minimum files:

- `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the planned gate,
  exact local/CI evidence, deferred credential boundary, and next implementation task.
- No product, fixture, contract, test, launcher, manifest, lockfile, or repository-map change unless a
  classified checkpoint failure proves a genuine in-scope blocker.

Acceptance criteria:

- One fixture browser flow proves metadata health -> entity search -> selected bounded/cycle-safe
  lineage -> selected recent changes -> canonical incident submit -> processing -> completed -> full
  evidence display in under three minutes, with resolved evidence references, retained accessibility
  states, no horizontal overflow, clean console output, and clean selected ports/process descendants.
- Fixture mode remains deterministic and credential-free. DataHub boundary contract/fake-server tests
  prove safe Bearer/env handling, total timeouts and normalized typed errors, bounded inputs, stable
  order/dedup, cycle/depth/node/request/window/limit/provider caps, evidenced truncation, and no raw
  provider payload, invented entity, or synthetic cursor leakage.
- Health, search, lineage, recent changes, and the incident runner continue through the shared
  provider-neutral contracts without a business-logic fork outside the established adapter boundary.
- Exactly one Level D `pnpm validate` passes, followed by exactly one
  `pnpm test:e2e:report`; successful unchanged inputs are not rerun.
- Secret, conflict-marker, diff-scope, generated-artifact, ancestry, and worktree reviews pass. The
  docs-only closure history is pushed to a draft PR based on `main`, and exactly one CI run for final
  HEAD reaches a passing terminal state with the PR conflict-free and merge-ready.

Deferred: live DataHub smoke when no newly supplied authorization is available, Stitch, additional
providers, impact analysis, change correlation, investigation reasoning, Phase 3 behavior, dependency
changes, and all UI redesign. Previously exposed chat credentials must not be read, requested, copied,
stored, or used.

Exact checkpoint commands, with the verified bundled Node/pnpm/root-bin paths prepended only to the
current Windows process because the managed fallback shim otherwise cannot resolve workspace binaries:

- `pnpm validate`
- `pnpm test:e2e:report`
- `& .\node_modules\.bin\prettier.CMD --write docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `& .\node_modules\.bin\prettier.CMD --check docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `git diff --check`, tracked-plus-untracked secret/conflict/generated-artifact scans, scoped full diff,
  name/stat/ancestry review, and `git status --short --branch` before commit; only the final status is
  repeated after commit/push.

Validation result on the Windows managed worktree, 2026-07-19:

- The tracked bootstrap was invoked before repository commands. The host first blocked `.ps1`
  execution; the process-scoped execution-policy bypass then installed the frozen 259-package
  workspace and passed supply-chain verification, but reproduced the known fallback-pnpm workspace
  binary resolution issue at `pnpm exec prettier`. A second bootstrap invocation reproduced the same
  environment-only result. Adding the already-verified bundled Node, exact pnpm fallback, and root
  `.bin` paths to this process resolved Prettier `3.9.5`; no script, dependency, manifest, or lockfile
  changed.
- Exactly one `pnpm validate` passed in `29s`: repository format and lint, all six buildable workspace
  type-checks, 19/19 test files with 139/139 tests, all six production builds, and both API/web artifact
  smoke targets. The suite includes fixture credential-read guards plus DataHub fake-server contract
  coverage for Bearer auth, safe error normalization, total timeouts, official bounded queries,
  deterministic order/dedup, lineage cycle/depth/node/request caps, timeline window/limit/provider
  caps, and truncation evidence.
- Exactly one `pnpm test:e2e:report` selected API `http://127.0.0.1:52655` and web
  `http://127.0.0.1:52656`, then passed the combined fixture health -> six-result search -> selected
  three-node truncated/cycle-safe lineage -> selected deterministic truncated recent changes ->
  canonical incident processing -> completed/full evidence flow in `5314ms` (`11.4s` command wall).
  Terminal focus/accessibility, resolved evidence references, desktop/mobile overflow, clean console,
  three-minute bound, selected-port release, and launcher descendant cleanup assertions all passed.
- Live DataHub smoke is intentionally deferred because no new authorization was supplied. No
  credential from chat or local environment was read, requested, copied, stored, logged, or used;
  fixture and fake-provider gates are sufficient for this checkpoint.
- Pre-commit review passed with exactly three intended documentation files; `git diff --check`, full
  scoped diff, handoff/feature ancestry, conflict-marker, high-risk secret, generated-status-path,
  name/stat, branch, and worktree reviews found zero unintended matches or files. Repository structure
  is unchanged, so `docs/REPOSITORY_MAP.md` remains untouched.
- Before PR creation, the controller reported that Slice 2.4 had merged into exact `origin/main`
  `fc08d5f32d8a77232ce6875b453884cbe68a4e6b`. Fetch confirmed that commit and the normal two-parent
  merge-forward created checkpoint merge commit `354086305c85feb4742e5308f241bfdd9a8885fd`
  without conflict. Product, fixture, contract, test, launcher, manifest, lockfile, and script trees are
  byte-identical between the locally validated checkpoint inputs and final integrated main, so the
  successful Level D/browser commands were not rerun. The pre-existing
  `codex/phase-2-closure` branch remains untouched at `fc08d5f…` in its separate worktree; the unique
  final branch is `codex/phase-2-integration-closure-20260718`, with PR base `main`.

Exact next implementation task after the docs-only checkpoint history, draft PR based on `main`, green
final-HEAD CI, and conflict-free/merge-ready review: Phase 3 Slice 3.1 — parse and gather in a separate
Project/worktree task. Do not begin Phase 3 in this checkpoint.

Slices: client health/error normalization; entity search; bounded/cycle-safe lineage; metadata and recent
changes. Completion requires fixture and DataHub adapters to run through unchanged business logic.

## Phase 3 — Agent reasoning

### Slice 3.1 — Parse incident and gather context

Status: Level C passed locally on `codex/phase-3-1-parse-gather-20260719-e7b053c` from exact Phase 2
closure merge commit `e7b053c83a5792ed75afa8731bd4f751b4ee7a1a`.

Objective: after an incident is submitted, expose a deterministic, schema-validated investigation
context stage that normalizes the incident question plus optional entity/time/symptom, selects only
adapter-evidenced candidate entities, and gathers bounded lineage and recent metadata facts. Preserve
the canonical processing/completed report flow without adding or changing hypothesis generation,
scoring, evidence-chain synthesis, remediation, or a generic controller.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for strict normalized
  intent, context-stage, retrieved-fact, missing-information, safe-failure, and retrieval schemas with
  small defaults and hard bounds.
- `packages/agent-core/src/index.ts` and a focused context-gatherer test for deterministic parsing,
  entity-hint/question search, adapter-evidenced selection, bounded health/search/lineage/recent-change
  calls, one total timeout/AbortSignal, partial factual context, and no hypotheses.
- `apps/api/src/index.ts` and `tests/integration/incidents-api.test.ts` for fixture/DataHub provider
  composition through the existing internal health/search/lineage/recent-change contracts, additive
  `contextStage` lifecycle responses, safe provider errors, and sanitized structured logs.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and a focused context-presentation test for compact
  semantic loading/success/missing/error output, stable request ownership, and accessible headings,
  lists, status, and fact references.
- `tests/e2e/report-display.spec.mjs` for exactly one combined fixture flow that proves parse/gather
  context before the unchanged completed report assertions.
- `docs/AGENT_DESIGN.md`, `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`,
  `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the durable
  contract, validation evidence, deferred work, and exact next slice. `docs/REPOSITORY_MAP.md` remains
  unchanged unless implementation adds or moves a structural entrypoint.

Acceptance criteria:

- Incident input remains strict and bounded. The normalized intent trims/collapses user text,
  canonicalizes a supplied incident time to UTC, applies the shared seven-day context-window default,
  and preserves optional entity hints and symptoms only within explicit array/text caps.
- The gatherer performs at most one health check, one bounded entity search, one bounded lineage
  request, and one bounded recent-change request under one total timeout and AbortSignal. It has no
  retry, recursive fan-out, client-supplied provider query, model, Stitch, or credential dependency.
- Entity-hint input is the primary search term; a no-hint request uses the normalized question. A
  fallback entity is never invented: every candidate and selected entity contains the exact adapter
  URN, the selected entity is one returned candidate, and lineage/change facts validate against that
  selected URN and the shared provider-neutral contracts.
- A no-match search returns completed factual context with no selected entity and explicit missing
  information, without lineage or recent-change calls. Empty/truncated lineage or recent changes are
  represented as retrieved facts plus explicit missing information, not inference or root cause.
- Fixture behavior is deterministic and does not read DataHub, Stitch, LLM, or another credential.
  DataHub mode composes the existing health/search/lineage/recent-change provider contracts and leaks
  no DataHub type, payload, URL, token, Authorization header, raw error, question, or symptom into
  public errors or structured logs.
- `POST /incidents` remains HTTP `202` with the canonical UUID/`processing` body. Retrieval exposes
  additive `contextStage: gathering | completed | failed`; a normalized safe context failure can
  coexist with the preserved legacy completed report, and unknown incidents keep the stable 404.
- The web displays parsed intent, candidate and selected entity references, gathered lineage/recent-
  change facts, truncation, and missing information in a semantic context stage. Loading, completed,
  missing, safe-error, and stale-response behavior are covered without presenting any new hypothesis,
  confidence, causal claim, or remediation in this stage.
- Changed-file formatting, affected lint/typechecks, targeted unit/integration tests, all five affected
  builds, and exactly one combined browser flow pass. Secret/generated/diff/worktree review is clean.

Validation result on the Windows managed worktree, 2026-07-19:

- The tracked bootstrap ran first. Windows execution policy blocked the direct `.ps1` invocation; a
  process-scoped `-ExecutionPolicy Bypass` retry installed all 259 frozen packages and passed the
  supply-chain check in `23.9s`, then reproduced the known fallback-pnpm failure to resolve root
  Prettier. Loading the verified bundled Node, exact pnpm fallback, and root `.bin` paths for the
  current process resolved repository tools without a script, manifest, or lockfile change.
- The scoped formatter write completed in about `2s`; affected ESLint passed in about `2s`. All five
  affected typechecks passed in one parallel sequence of about `2s` wall: shared-types,
  datahub-client, agent-core, API, and web.
- Sandboxed targeted Vitest stopped before test execution because esbuild could not read managed-worktree
  ancestor metadata. The exact scoped retry after the final bounded-call correction ran seven files and
  all `40/40` tests passed in about `3.50s` Vitest time. Coverage includes schema defaults/hard bounds,
  deterministic parse, hint/no-hint/no-match selection, no invented entity, six-step call bounds,
  one total timeout, fixture credential independence, DataHub provider composition, safe context
  errors, API lifecycle/schema, UI loading/success/missing/error/stale ownership, and report
  compatibility.
- The affected build command passed all five production builds on the scoped retry; web transformed 109
  modules and built in about `5.41s`.
- Exactly one final `pnpm test:e2e:report` selected API `http://127.0.0.1:58373` and web
  `http://127.0.0.1:58374`, then passed the combined fixture metadata search -> bounded lineage ->
  recent changes -> incident submit -> context gathering -> parsed intent/candidate/selected URN ->
  upstream and recent-change facts -> explicit missing-information section -> processing -> completed
  canonical report in `6750ms`. It retained resolved evidence references, semantic headings/time,
  stale-safe ownership coverage in the focused test, clean console, responsive overflow,
  under-three-minute duration, selected-port release, and launcher cleanup.
- Level D and live DataHub smoke were intentionally not run. Final changed-file formatting and the
  secret/conflict/generated/diff/worktree review follow documentation finalization before the single
  conventional commit.

Deferred: suspicious-change detection is the exact next Phase 3 slice. Impact analysis, correlation,
hypothesis generation/scoring, evidence-chain synthesis, remediation, fallback reasoning, additional
providers, live credential smoke, authentication, persistence, model integration, dependency changes,
and Level D validation remain out of scope.

Exact Level C commands (run as one coherent sequence after implementation; rerun only classified
affected failures):

- `pnpm exec prettier --write packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/agent-core/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`
- Exactly one `pnpm test:e2e:report` run proving fixture metadata readiness -> search -> bounded lineage
  -> recent changes -> incident submit -> context gathering -> parsed intent/candidates/selected entity/
  gathered facts/missing information -> processing -> completed/full canonical report, with clean
  console, accessibility/focus, responsive overflow, three-minute bound, selected-port release, and
  launcher cleanup.
- `git diff --check`, tracked-plus-untracked secret/conflict/generated-artifact scans, changed-file and
  full scoped diff review, `git diff --stat`, `git diff --name-status`, ancestry review, and
  `git status --short --branch` before the single conventional commit; only final status is repeated
  after commit/push.

### Slice 3.2 — Suspicious-change detection

Status: Level C passed locally on `codex/phase-3-2-suspicious-changes` from exact Slice 3.1 final commit
`c0d765ed57b00c17d957eb62e3e84984897af48f`.

Objective: after a factual `IncidentContextStage` completes, classify and display a bounded,
deterministically ordered list of recent metadata changes that have transparent signals of potential
relevance to the incident intent. Preserve the existing context and completed-report lifecycle without
declaring a cause, generating or scoring hypotheses, synthesizing an evidence chain, or recommending
remediation.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for strict
  suspicious-change candidate/result/lifecycle schemas, allowlisted signal codes and labels, hard
  bounds, deterministic ordering, forbidden-field rejection, and context cross-reference invariants.
- `packages/agent-core/src/index.ts` and
  `tests/integration/suspicious-change-detector.test.ts` for a pure detector over a validated completed
  context, bounded token/category rules, incident-window and known-lineage signals, stable rank/dedup,
  hard-cap behavior, insufficient outcomes, and explicit zero-provider-call proof.
- `apps/api/src/index.ts` and `tests/integration/incidents-api.test.ts` for additive
  `suspiciousChangeStage` lifecycle composition after context gathering, safe unavailable behavior,
  no extra provider calls, and preserved processing/completed report compatibility.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and
  `tests/integration/web-suspicious-changes.test.ts` for a compact accessible loading/completed/
  insufficient/unavailable presentation, factual signal reasons, non-causal copy, and existing
  stale-request ownership.
- `tests/integration/incident-context-gatherer.test.ts`,
  `tests/integration/investigation-runner.test.ts`, `tests/integration/web-incident-context.test.ts`,
  `tests/integration/web-report.test.ts`, and `tests/e2e/report-display.spec.mjs` for direct regression
  coverage and exactly one combined fixture browser flow.
- `docs/AGENT_DESIGN.md`, `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`,
  `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the durable
  contract, validation evidence, deferred scope, and next-slice handoff. The repository map remains
  unchanged because no entrypoint or directory moves.

Acceptance criteria:

- The pure detector accepts only a validated completed context and performs no adapter, DataHub,
  fixture, network, model, Stitch, or retry call. Gathering, failed, malformed, or empty factual input
  cannot become a fabricated suspicious-change candidate.
- Every candidate references an exact recent-change ID and entity URN already present in the completed
  context, copies only normalized factual labels, and includes only ordered allowlisted signals. Entity
  references resolve to the selected candidate or returned lineage graph; duplicate change IDs are
  rejected or deduplicated before output.
- Candidate eligibility uses only bounded deterministic category-term, supplied incident-window,
  selected/upstream entity, and removed/modified operation rules. Internal rank weights and stable
  timestamp/change-ID tie-breaks are documented, hard bounded, and never exposed as hypothesis
  confidence or made model-overridable.
- At most five candidates cross the boundary. Missing incident time or symptom reduces available
  signals and is explicit; empty recent history or no qualifying incident-specific signal yields
  `insufficient` with no candidate instead of an invented match. Context truncation and candidate-cap
  omissions remain explicit.
- The canonical fixture marks exact change `change-removed-gross-revenue` on adapter-evidenced upstream
  `raw.orders` as potentially relevant with transparent incident-window, upstream-lineage, and
  disruptive-operation signals. API/UI copy says potentially relevant or suspicious signal and never
  says the change caused the incident or is the root cause.
- Incident retrieval adds a schema-valid suspicious-change lifecycle after context gathering. A
  gathering context remains `detecting`; a safe failed context becomes `unavailable` without invoking
  the detector or leaking provider details; a completed context yields `completed` or `insufficient`.
  The accepted `202` body and legacy processing/completed report remain compatible.
- Focused contract/detector/API/web/regression tests, five affected typechecks and builds, and exactly
  one combined browser flow pass with accessible headings/list/status, clean console, no horizontal
  overflow, the three-minute bound, and clean selected-port/process teardown.

Deferred: hypothesis generation or scoring, numeric root-cause confidence, evidence-chain synthesis,
impact analysis, remediation/fallback reasoning, controller work, Slice 3.3, live DataHub smoke,
additional providers, authentication, persistence, model integration, dependency changes, UI redesign,
and Level D validation.

Exact Level C commands (run as one coherent sequence after implementation; rerun only a classified
affected failure):

- `pnpm exec prettier --write packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/agent-core/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`
- Exactly one `pnpm test:e2e:report` run proving fixture metadata tools -> incident context gathering/
  completed facts -> exact suspicious-change candidate and signal reasons -> unchanged processing/
  completed full report, plus focus/accessibility, clean console, responsive overflow, three-minute
  duration, selected-port release, and launcher cleanup.
- `git diff --check`, tracked-plus-untracked secret/conflict/generated-artifact scans, changed-file and
  full scoped diff review, `git diff --stat`, `git diff --name-status`, ancestry review, and
  `git status --short --branch` before the single conventional commit; only final status is repeated
  after commit/push.

Validation result on the Windows managed worktree, 2026-07-19:

- The tracked bootstrap ran before repository work. The initial guessed legacy path was absent; the
  tracked `scripts/bootstrap-worktree.ps1` then completed the frozen 259-package install and
  supply-chain verification but reproduced the known fallback-pnpm failure to resolve root Prettier.
  Prepending the verified bundled Node and root `.bin` paths only to the retry process completed the
  bootstrap and static check without changing the bootstrap, manifest, or lockfile.
- Changed-file Prettier write and check passed. Affected ESLint passed with no findings. All five
  affected typechecks passed in one parallel sequence: shared-types, datahub-client, agent-core, API,
  and web.
- The first sandboxed targeted Vitest command stopped before test execution at the known managed-
  worktree esbuild ancestor-directory denial. The exact scoped retry passed 9/9 files and 51/51 tests
  in `7.29s`, covering strict bounds/references/forbidden fields, deterministic detection/rank/dedup/
  cap, the exact canonical change, missing inputs/history, gathering/failed contexts, zero adapter
  calls, API lifecycle/safe failures, web terminal/stale copy, context/report compatibility, and
  resolved report evidence references.
- All five affected production builds passed. The web build transformed 109 modules and completed in
  `5.12s`; shared-types, datahub-client, agent-core, and API builds also completed successfully.
- Exactly one `pnpm test:e2e:report` selected API `http://127.0.0.1:62812` and web
  `http://127.0.0.1:62813`, then passed the combined metadata tools -> incident context gathering ->
  completed factual context -> exact `change-removed-gross-revenue` candidate on upstream
  `raw.orders` with `incident_window`, `upstream_lineage`, and `disruptive_operation` signals ->
  unchanged completed/full report in `19622ms`. Accessible headings/list/time, resolved report
  evidence references, clean console, desktop/mobile overflow, three-minute duration, selected-port
  release, and launcher process cleanup assertions all passed.
- Final review passed with exactly 17 intended files (15 tracked modifications and two focused new
  tests). `git diff --check`, full scoped source/test/docs diff, name/stat, both required ancestry
  checks, and conflict-marker, high-risk secret, debug/raw-provider, generated-path, manifest/lockfile,
  untracked-file, branch, and worktree reviews found no unintended match or file. Repository structure
  is unchanged, so `docs/REPOSITORY_MAP.md` remains untouched. Level D and live DataHub smoke were
  intentionally not run.

### Slice 3.3 — Evidence-linked hypothesis scoring

Status: Level C passed locally on `codex/phase-3-3-evidence-linked-scoring` from exact Slice 3.2 final
commit `96476f8834fbd6af8e0fdef9ceeae6b2c8c40a33`.

Objective: after factual context and suspicious-change detection complete, generate at most three
provider-neutral candidate hypotheses, link each inference to exact existing factual evidence, and
rank them with a deterministic code-owned confidence formula whose ordered factor contributions are
auditable. Preserve the legacy report contract while removing arbitrary fixture confidence; do not
build an evidence-chain narrative, recommendation/remediation, fallback reasoning, controller, or
model integration.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for strict scored-
  hypothesis, score-factor, terminal-result, and lifecycle schemas with bounds, canonical precision,
  ordering, score-sum, uniqueness, forbidden-field, and evidence cross-reference invariants.
- `packages/agent-core/src/index.ts` and `tests/integration/hypothesis-scorer.test.ts` for a pure
  deterministic generator/scorer over completed context plus completed suspicious changes, exact
  basis-point arithmetic, stable tie-breaks, deduplication, cap-three behavior, insufficient outcomes,
  canonical evidence mapping, and zero provider/model/network-call proof.
- `apps/api/src/index.ts` and `tests/integration/incidents-api.test.ts` for additive
  `hypothesisScoringStage: scoring | completed | insufficient | unavailable`, no additional adapter
  calls, safe upstream/validation failure, and schema-valid completed reports using scored hypotheses.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and
  `tests/integration/web-hypothesis-scoring.test.ts` for compact accessible ranked inference,
  confidence, factor, evidence-link, loading/insufficient/unavailable, and stale-request presentation.
- Existing context, suspicious-change, runner, report, and combined E2E tests for direct regression,
  resolved report evidence references, and exactly one metadata-to-scored-report browser flow.
- `docs/AGENT_DESIGN.md`, `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`, this plan,
  `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for the formula, lifecycle, validation evidence,
  deferred scope, and handoff. `docs/REPOSITORY_MAP.md` remains unchanged unless structure moves.

Acceptance criteria:

- The pure scorer accepts only validated completed factual context and completed suspicious results;
  it has no adapter/provider/network/model/Stitch/credential/environment input, retry, fallback seed,
  or iteration-order dependency. Invalid/gathering/failed upstream states never produce a hypothesis.
- Every hypothesis has a stable unique ID, explicit plausible-contributor/inference wording, a
  canonical confidence in `[0,1]`, one or more unique exact evidence IDs, and the same four ordered
  allowlisted factors: incident-window recency, lineage position/distance, symptom/category fit, and
  evidence quality/completeness. Integer basis-point contributions sum exactly to confidence after an
  explicit `0..10000` clamp; no legacy `0.92` or model-authored confidence survives.
- Evidence IDs resolve first to exact context change facts and then to evidence present in the final
  `InvestigationReportSchema`. Dangling or duplicate references, duplicate hypotheses, causal or
  unsupported input, factor/order/rank mismatch, score mismatch, unknown fields, and more than three
  hypotheses are rejected or produce a safe insufficient result at the composition boundary.
- Ranking is deterministic by confidence descending, factual observation timestamp descending,
  change ID ascending, then hypothesis ID ascending; ranks are contiguous from one. Canonical JSON
  serialization uses bounded two-decimal confidence precision.
- Empty/insufficient suspicious results, materially truncated or incomplete context, and unresolved
  report-evidence mapping yield `insufficient` with zero hypotheses plus explicit missing information,
  not a fabricated low-confidence root cause. Failed or invalid upstream input yields only a safe
  normalized `unavailable` error.
- The removed-column fixture produces a stable top inference identifying the removed schema change on
  exact upstream `raw.orders` as a plausible contributor, cites the exact factual change/evidence ID,
  and exposes reproducible factor contributions without saying confirmed cause.
- Incident retrieval adds the scoring lifecycle without extra adapter calls. The web keeps the compact
  top hypothesis/full report and adds semantic ranked scoring details with accessible factors and
  evidence links; stale responses cannot overwrite a newer request.
- Focused contract/scorer/API/web/regression tests, five affected typechecks and builds, and exactly
  one combined browser flow pass with clean console, responsive overflow, under-three-minute duration,
  selected-port release, and launcher cleanup.

Deferred: evidence-chain prose, recommendations, remediation, fallback reasoning, Slice 3.4, impact
analysis, generic controller/model integration, provider expansion, authentication, persistence, live
DataHub smoke, dependency changes, UI redesign, Phase 3 closure, and Level D validation.

Exact Level C commands (run once as one coherent sequence after implementation; rerun only a
classified affected failure):

- `pnpm exec prettier --write packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/agent-core/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`
- Exactly one `pnpm test:e2e:report` run proving metadata tools -> completed context facts -> suspicious
  candidate/signals -> ranked scored inference/factors/resolved evidence links -> processing ->
  completed/full report, plus accessibility/focus, clean console, responsive overflow, three-minute
  duration, selected-port release, and launcher cleanup.
- `git diff --check`, tracked-plus-untracked secret/conflict/causal/debug/raw-provider/model/generated-
  artifact scans, changed-file and full scoped diff review, `git diff --stat`,
  `git diff --name-status`, manifest/lockfile and ancestry review, and
  `git status --short --branch` before the single conventional commit; only final status is repeated
  after commit/push.

Validation result on the Windows managed worktree, 2026-07-19:

- The tracked bootstrap ran before repository work. Direct PowerShell execution reproduced the known
  execution-policy block; process-scoped bypass completed the frozen 259-package install and
  supply-chain check, then reproduced the known fallback-pnpm root-Prettier resolution failure.
  Prepending the verified bundled Node, exact pnpm fallback, and root `.bin` paths only to the process
  completed bootstrap/static formatting without a script, manifest, or lockfile change.
- Final-input Prettier write/check and affected ESLint passed. All five affected typechecks passed:
  shared-types, datahub-client, agent-core, API, and web. The first focused Vitest reproducer stopped
  before tests at the known managed-worktree esbuild ancestor-directory denial; its exact scoped retry
  passed 6 files/35 tests. After the final rank/order, duplicate-evidence, low-quality, and unresolved-
  evidence assertions, the combined scoped Level C suite passed 11/11 files and 62/62 tests in `6.62s`
  Vitest time.
- Coverage proves strict unknown-field/bounds/score-sum/rank/order/reference contracts, exact 8,500-bp
  canonical formula, multiple-candidate confidence/timestamp/ID ranking, cap/dedup, missing time and
  symptom, lineage quality reduction, material recent-change truncation, insufficient suspicious
  input, gathering/failed upstream rejection, unresolved evidence, zero provider/environment work,
  API lifecycle/safe failures, web loading/completed/insufficient/unavailable/stale copy, and preserved
  context/suspicious/report compatibility.
- All five affected production builds passed. Web transformed 109 modules and built in `5.04s`;
  shared-types, datahub-client, agent-core, and API builds also completed successfully.
- The first browser attempt reached completed scoring but its new assertion rejected the required safe
  disclaimer because it searched the whole stage for `confirmed cause`, including the phrase
  `not a confirmed cause`. This was classified as a test false positive; product output, API score,
  evidence mapping, console, and cleanup were not changed. Focused E2E Prettier/check/lint passed after
  narrowing the assertion to the hypothesis row and requiring the disclaimer. The one final recovery
  flow selected API `http://127.0.0.1:63866` and web `http://127.0.0.1:63867`, then passed the combined
  metadata tools -> context -> suspicious candidate/signals -> ranked `0.85` inference with all four
  factor contributions and exact evidence link -> completed/full report in `16150ms`. Accessibility,
  clean console, desktop/mobile overflow, three-minute duration, selected-port release, and launcher
  cleanup assertions all passed.
- Level D and live DataHub smoke were intentionally not run. Final tracked/untracked diff, secret,
  conflict, causal/debug/raw-provider/model, generated-artifact, manifest/lockfile, ancestry, and full
  scoped patch review passed before the single conventional commit. The 18 intended files comprise 16
  modified tracked files plus two new focused integration tests; no unrelated or generated file is
  present. The worktree is intentionally dirty only with that reviewed commit payload.

### Slice 3.4 — Remediation and safe fallback

Status: Level C passed locally on `codex/phase-3-4-remediation-fallback` from exact Slice 3.3 final
commit `3a1c5c763c2e4fcbee8796120ba4ca2096a75c25`.

Objective: after factual context, suspicious-change detection, and evidence-linked hypothesis scoring,
produce a pure, deterministic, bounded remediation/fallback stage for human review. Completed scoring
may yield safe verification and potential-remediation recommendations linked only to existing
hypothesis/evidence/entity/change facts. Insufficient or unavailable inputs yield explicit missing
information and safe diagnostic next steps without inventing a cause, evidence, reference, or action.

Minimum files:

- `packages/shared-types/src/index.ts` and `tests/integration/contracts.test.ts` for a strict
  `planning | completed | insufficient | unavailable` lifecycle, allowlisted recommendation type and
  priority, stable IDs, hard caps of five recommendations/fallback steps, ordering/deduplication,
  lifecycle combination, forbidden-field, and hypothesis/evidence/entity/change cross-reference
  invariants.
- `packages/agent-core/src/index.ts` and `tests/integration/remediation-planner.test.ts` for a pure
  deterministic planner over validated completed context/scoring/report evidence, allowlisted factual
  derivation rules, exact output, completed/insufficient/unavailable behavior, zero provider/model/
  network/credential calls, and no mutation or automatic execution path.
- `apps/api/src/index.ts` and `tests/integration/incidents-api.test.ts` for additive
  `remediationStage` composition after scoring, safe typed errors, preserved stale ownership, no extra
  adapter calls, and unchanged context/suspicious/scoring/report compatibility.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`, and
  `tests/integration/web-remediation-fallback.test.ts` for compact accessible planning/completed/
  insufficient/unavailable rendering, exact links, verification/reversibility text, explicit
  `not executed` semantics, keyboard navigation, and stale-response protection.
- Existing scorer, runner, context, suspicious, report, and combined E2E tests for direct regressions,
  canonical `0.85` inference, resolved references, one safe insufficient fixture, and exactly one final
  metadata-to-remediation browser flow.
- `docs/AGENT_DESIGN.md`, `docs/API_CONTRACTS.md`, `docs/DATA_MODEL.md`, this plan,
  `docs/KNOWN_ISSUES.md`, and `docs/SESSION_LOG.md` for exact derivation rules, bounds, lifecycle,
  validation evidence, deferred work, and the Phase 3 checkpoint handoff. `docs/REPOSITORY_MAP.md`
  remains unchanged unless an entrypoint or directory moves.

Acceptance criteria:

- The planner accepts only validated terminal factual/scoring/report inputs and has no adapter,
  provider, network, retry, model/LLM, Stitch, credential, environment, clock, mutation, deployment,
  rollback, ticket, message, or job-execution dependency. Gathering/scoring, malformed, dangling, or
  incomplete input never produces a recommendation.
- Every completed recommendation has a stable unique ID, allowlisted type and priority, concise
  human-review wording, rationale, one safe verification step, one rollback/reversibility note, an
  explicit `not_executed` status, and unique exact references only to existing hypothesis, evidence,
  entity, and change IDs. Unknown fields, duplicate IDs/references, invalid status combinations,
  dangling references, causal overclaim, and more than five recommendations are rejected.
- Recommendation derivation uses only allowlisted factual change categories/operations and the Slice
  3.3 rank/score order. It does not create a second confidence, re-rank hypotheses, or claim a
  confirmed root cause. Output order is deterministic by scored hypothesis rank, recommendation type
  order, priority order, source ID, then recommendation ID; exact duplicates are removed before the
  cap.
- `insufficient` and `unavailable` contain zero recommendations and references. They expose unique
  bounded missing information, at most five safe diagnostic/fallback next steps, a provider-neutral
  safe message where applicable, and an explicit fixture-mode continuation step. No fallback step
  mutates data, schema, deployment, pipeline, ticketing, or external systems.
- The removed-column fixture preserves the exact ranked `0.85` inference and emits resolved manual
  recommendations for schema verification and a reversible potential remediation. Every potentially
  dangerous operation remains a review-only proposal with guardrail/reversibility text and is visibly
  marked not executed.
- Incident retrieval adds the remediation lifecycle after scoring without extra adapter calls or
  changes to the accepted `202`, context, suspicious, scoring, or completed report shapes. Safe upstream
  failure/insufficiency is normalized; stale responses cannot overwrite a newer request.
- The web preserves the compact summary, ranked factors, evidence links, and full report while adding
  semantic headings/lists for recommendation type/priority/status, rationale, linked facts,
  verification, reversibility, and fallback. Loading, completed, insufficient, unavailable/error,
  focus/accessibility, keyboard links, and responsive overflow are covered.
- Targeted contracts/planner/API/web/regression tests, five affected typechecks and builds, and exactly
  one final combined browser flow pass with fixture-only inputs, canonical `0.85`, resolved references,
  safe fallback coverage, clean console/accessibility/overflow, under-three-minute duration, and clean
  dynamic-port/process teardown.

Deferred: evidence-chain narrative beyond bounded recommendation rationale, impact analysis, generic
controller/model integration, autonomous execution, provider expansion, authentication, persistence,
dependency changes, UI redesign, live DataHub smoke, Phase 3 integration closure, and Level D
validation. The exact next task after a green Slice 3.4 PR/CI is a separate Phase 3 integration
checkpoint/Level D worktree; it is not started here.

Exact Level C commands (run once as one coherent sequence on final product/test inputs; rerun only a
classified affected failure):

- `pnpm exec prettier --write packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/remediation-planner.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-remediation-fallback.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec prettier --check packages/shared-types/src/index.ts packages/agent-core/src/index.ts apps/api/src/index.ts apps/web/src/App.tsx apps/web/src/styles.css tests/integration/contracts.test.ts tests/integration/remediation-planner.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-remediation-fallback.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs docs/AGENT_DESIGN.md docs/API_CONTRACTS.md docs/DATA_MODEL.md docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md docs/SESSION_LOG.md`
- `pnpm exec eslint packages/shared-types/src packages/agent-core/src apps/api/src apps/web/src tests/integration/contracts.test.ts tests/integration/remediation-planner.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-remediation-fallback.test.ts tests/integration/web-report.test.ts tests/e2e/report-display.spec.mjs`
- `pnpm --filter @dii/shared-types typecheck`
- `pnpm --filter @dii/datahub-client typecheck`
- `pnpm --filter @dii/agent-core typecheck`
- `pnpm --filter @dii/api typecheck`
- `pnpm --filter @dii/web typecheck`
- `pnpm exec vitest run tests/integration/contracts.test.ts tests/integration/fixture-adapter.test.ts tests/integration/incident-context-gatherer.test.ts tests/integration/suspicious-change-detector.test.ts tests/integration/hypothesis-scorer.test.ts tests/integration/remediation-planner.test.ts tests/integration/investigation-runner.test.ts tests/integration/incidents-api.test.ts tests/integration/web-incident-context.test.ts tests/integration/web-suspicious-changes.test.ts tests/integration/web-hypothesis-scoring.test.ts tests/integration/web-remediation-fallback.test.ts tests/integration/web-report.test.ts`
- `pnpm --filter @dii/shared-types --filter @dii/datahub-client --filter @dii/agent-core --filter @dii/api --filter @dii/web build`
- Exactly one final `pnpm test:e2e:report` run proving fixture metadata tools -> completed context facts
  -> suspicious candidates -> exact `0.85` scored inference -> remediation/fallback lifecycle with
  resolved references and `not executed` semantics -> completed full report, plus focus/accessibility,
  clean console, desktop/mobile overflow, three-minute duration, selected-port release, and launcher
  cleanup.
- `git diff --check`, tracked-plus-untracked secret/conflict/causal/debug/raw-provider/model/generated-
  artifact scans, changed-file and full scoped diff review, `git diff --stat`,
  `git diff --name-status`, manifest/lockfile and exact ancestry/base review, and
  `git status --short --branch` before the single conventional commit; only final status is repeated
  after commit/push.

Level C result:

- Tracked bootstrap PASS with the existing process-scoped execution-policy/root-bin workaround and no
  bootstrap, manifest, lockfile, dependency, or generated-store change. The first formatting launcher
  stopped before Prettier because `node` was absent from the inherited PATH; loading the verified
  Codex-bundled Node/pnpm runtime resolved this environment-only blocker.
- Final-input Prettier write/check PASS. Affected ESLint first found one unused type-only import in the
  new planner test; that test-only issue was removed and its targeted format/check/lint retry passed.
  Five affected typechecks passed; after the shared causal matcher changed, all five dependent
  typechecks passed again.
- The first 13-file Vitest run executed 72 tests and exposed one product-contract false positive: the
  causal filter rejected the required explicit negation `not a confirmed cause`, producing 6 failures
  while 66 tests passed. The matcher now strips only that safe negation before checking asserted causal
  phrases. The affected combined suite then passed 13/13 files and 72/72 tests in `3.90s`, covering
  lifecycle strictness, caps/order/dedup, allowlisted categories, exact references, deterministic pure
  output, fallbacks, safe errors, stale ownership, zero provider/model/credential work, and report/
  context/suspicious/scoring regressions.
- All five production builds passed; web transformed 109 modules and Vite built in `1.19s`.
- Exactly one final browser flow passed in `7255ms` on dynamic API/web ports `61164`/`61165`: submit ->
  completed context -> suspicious change -> exact `0.85` ranked hypothesis -> two resolved
  `not_executed` schema recommendations -> full report. The test verified linked references,
  verification/reversibility text, no causal overclaim, semantic accessibility, clean console,
  desktop/mobile overflow, under-three-minute duration, selected-port release, and launcher cleanup.
- Final security review found that the planner test itself read `process.env.DATAHUB_TOKEN` only to
  compare before/after state. Both reads were removed to honor the no-credential-read boundary; the
  test now checks the planner has no environment state, and its affected format/check/lint plus 4/4
  tests passed. No product input changed, so green builds/browser gates were not rerun.
- Final review passed for 17 intended files (15 modified and two new focused tests): full scoped patch,
  `git diff --check`, secret/conflict/unsafe-output/generated-artifact scans, no manifest/lock/bootstrap/
  fixture/provider/dependency change, exact branch/base/ancestry, and no command/listener owned by this
  worktree. The worktree contains only the reviewed commit payload before publication.
- Level D and live DataHub smoke were not run. The next task remains the separate Phase 3 integration
  checkpoint/Level D worktree after this stacked Draft PR and final-HEAD CI are green.

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
