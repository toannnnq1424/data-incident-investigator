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

### Slice 1.3 — Evidence display

Render evidence, entity impact, confidence, assumptions, missing information, and recommendations.

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
