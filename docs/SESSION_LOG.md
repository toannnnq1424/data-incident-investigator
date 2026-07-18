# Session log

## 2026-07-18 — Phase 0 foundation initialization

### Objective

Create the GitHub repository and implement the documented Phase 0 foundation.

### Completed

Created the private GitHub repository and added the monorepo, initial web/API entrypoints, shared
contracts, tooling, CI, docs, and secret-safe optional Stitch MCP configuration. Installed dependencies
inside the project, corrected root integration-test resolution, and completed Phase 0 validation.
Installed a checksum-verified portable GitHub CLI under ignored `work/tools/` and authenticated it with
GitHub's device flow. Committed and pushed the Phase 0 foundation to `main`; GitHub Actions CI passed.

### Files changed

Root tooling; `apps/`; `packages/`; `tests/`; `scripts/`; `docs/`; `.github/`; `.codex/`.

### Decisions

TypeScript/pnpm monorepo; React/Vite; Fastify; Zod contracts; stable metadata adapter; evidence-linked
reports; Stitch as optional design assistance using an environment-sourced header; workspace sandbox
with network access and scoped `on-request` automatic approval review.

### Validation performed

The final `pnpm validate` passed: format, lint, type-check, 2 test files/3 tests, all six workspace
projects built, and the artifact smoke check. The later permission-policy changes affected only Codex
configuration and documentation and received targeted static validation. GitHub Actions CI run
`29641302910` passed the clean-install and full-validation workflow.

### Validation intentionally deferred

Real DataHub and Stitch smoke tests are deferred until their phases and valid rotated credentials are
available. Release validation is deferred until a release checkpoint.

### Known issues

See `docs/KNOWN_ISSUES.md`.

### Exact next step

Start Slice 1.1 — Submit incident: branch from `main`, add the request/response contract and API route,
then build the form and processing-state UI against that stable contract.

## 2026-07-18 — Phase 1 Slice 1.1 incident submission

### Objective

Deliver the smallest complete incident-submission flow from the accessible web form through a validated
API request to a visible processing identifier.

### Completed

Added shared accepted-response and stable error schemas, implemented `POST /incidents`, connected the
web through the local `/api` proxy, and rendered idle, submitting, success, API-error, and
validation-error states. Added contract and API integration coverage and exercised the complete flow in
the in-app browser.

### Files changed

Shared contracts; API and web entrypoints; web styling/proxy configuration; contract/API integration
tests; environment example; lockfile; API contracts, implementation plan, repository map, known issues,
and this session log.

### Decisions

Reuse Zod contracts on both client and server; return HTTP `202` with a UUID and `processing`; keep the
Fastify route provider-neutral; use Vite's `/api` proxy instead of adding CORS behavior for this slice.

### Validation performed

Changed-file Prettier check, repository lint, affected shared-types/API/web type checks, 2 targeted test
files with 6 passing tests, a real browser validation-and-submit flow with no console errors, and all
three affected builds passed.

### Validation intentionally deferred

Full phase/release validation and a checked-in browser automation suite are deferred to their defined
checkpoints because no shared system-wide contract outside the slice changed.

### Known issues

Incident IDs are not persisted and no report is generated yet. See `docs/KNOWN_ISSUES.md`.

### Exact next step

Inside the Codex Project for this repository, create a new project-scoped task for Slice 1.2 — Mock
investigation. Read the persisted state, add a deterministic fixture-backed investigation through the
existing provider-neutral adapter, and do not reuse a projectless chat.

## 2026-07-18 — Phase 1 Slice 1.2 fixture-backed mock investigation

### Objective

Deliver a canonical removed-schema-column incident from web submission through the provider-neutral
fixture adapter and deterministic runner to a retrieved, compact completed report without credentials.

### Completed

Added the single canonical incident and metadata fixture, a bounded fixture `MetadataAdapter`, and a
deterministic evidence-linked runner whose output is validated by the shared report schema. Extended
the shared lifecycle contract with completed retrieval and typed not-found errors, while preserving
the Slice 1.1 HTTP `202`/UUID/`processing` response. Added in-memory API lifecycle storage and
`GET /incidents/:incidentId`, then updated the web to poll and render completed status, summary, and
the top ranked hypothesis. Kept processing visible for a short deterministic transition and added
focused contract, adapter, runner, API, and web behavior coverage.

### Files changed

Canonical fixture JSON; shared-types, datahub-client, agent-core, API, and web source; affected package
manifests and lockfile; targeted integration tests; API contracts, implementation plan, repository map,
known issues, and this session log.

### Decisions

Keep fixture mode as the credential-free default; load fixture JSON only inside the provider package;
bound one lineage hop, four entities, four recent changes, four adapter calls, and two seconds of runner
duration; use report evidence as facts and hypotheses as evidence-linked inferences; store lifecycle
state only in API memory; expose only the compact report subset in Slice 1.2 and defer detailed evidence
presentation to Slice 1.3. Maintained the repository rule that user-facing commentary, progress/error
classification, validation summaries, and final reporting use Vietnamese while technical source and API
contracts remain unchanged.

### Validation performed

Changed-file Prettier checks and affected lint passed. Type checks passed for shared-types,
datahub-client, agent-core, API, and web. Five targeted test files passed with 13 tests; after the
processing-transition adjustment, the four affected API integration tests passed again. Builds passed
for all five affected packages/apps, and the affected API build passed again after the adjustment. A
real Vite-to-Fastify browser flow showed a generated UUID in `processing`, transitioned to `completed`,
rendered the report summary and top ranked hypothesis, and produced no browser console warnings or
errors. The first Vitest attempt failed only because sandboxed esbuild could not read ancestor metadata;
the identical targeted suite passed with scoped access.

### Validation intentionally deferred

Full phase/release Level D validation is deferred to the Phase 1 integration checkpoint. Detailed
evidence/entity/confidence/assumption/recommendation UI, checked-in cross-browser automation, real
DataHub access, durable persistence, and additional fixture scenarios remain deferred to their defined
slices or phases.

### Known issues

Fixture incident state is process-local and only the removed-schema-column scenario exists. See
`docs/KNOWN_ISSUES.md`.

### Exact next step

create a new project-scoped task for Phase 1 Slice 1.3 — Evidence display, starting from this Slice 1.2 branch/commit; do not continue Slice 1.3 here.

## 2026-07-18 — Codex managed-worktree bootstrap stabilization

### Objective

Stabilize dependency bootstrap for future Codex managed worktrees without changing product code or
starting Slice 1.3/Phase 2.

### Completed

Reproduced the Windows runtime failure where bundled `pnpm.cmd` was available but bundled `node.exe`
was absent from `PATH`, causing the esbuild lifecycle script to fail. Confirmed that a new worktree had
no root dependencies and that the ignored Windows portable GitHub CLI was not inherited. Added tracked
Windows and macOS/POSIX bootstrap scripts that verify the manifest runtime contract, refuse unpinned
package-manager activation, install from the frozen lockfile, and validate a root static tool. Added
verified Local Environment UI wiring and documented why no unverified app-generated schema or
`.worktreeinclude` file was committed.

### Files changed

Managed-worktree bootstrap scripts; local-environment documentation; Codex operating guidance;
implementation plan, repository map, known issues, session log, and the pnpm-store ignore rule.

### Decisions

Use host or dynamically discovered Codex-bundled Node/pnpm without storing a username or absolute
machine path. Keep exact pnpm `11.9.0` as a prerequisite to avoid missing offline metadata. Keep GitHub
CLI as a per-host prerequisite; do not copy ignored `work/tools/` or Windows binaries into managed
worktrees/macOS. Leave `.worktreeinclude` absent because all required setup inputs are tracked. Do not
invent a Local Environment filename/schema when the desktop app exposes no callable writer API and UI
automation is prohibited.

Preserve all existing Codex Project task history unless the user explicitly requests archive, deletion,
or hiding. Do not pin a task if doing so removes it from the Project group. Every new implementation
task must use `target.type=project`, `projectId=a43a7aaa-fc63-48e9-867e-c9d9cae6784d`, and an
appropriate `local` or `worktree` environment; projectless implementation tasks are prohibited.

### Validation performed

From an empty dependency state, Windows bootstrap discovered Node `v24.14.0` and pnpm `11.9.0`, ran
`pnpm install --frozen-lockfile` for 257 packages with lockfile resolution skipped, resolved Prettier
`3.9.5` through `pnpm exec`, and passed the static package formatting check. The PowerShell parser,
`bash -n`, TOML parser plus required policy assertions, changed-document Prettier, `git diff --check`,
secret/absolute-path scan, and scoped diff review passed. The first changed-document Prettier attempt
hit sandboxed pnpm-store access and the identical scoped retry passed.

### Validation intentionally deferred

No full product suite was run. macOS script execution and the macOS bundled-runtime location require a
macOS host. Creating and checking in the shared Local Environment file requires a human to save the
verified setup commands through Codex desktop settings.

### Known issues

The current host's ignored portable `gh.exe` exists only in the local checkout and its `gh auth`
session is invalid. It remains a host prerequisite and is not copied or committed. See
`docs/KNOWN_ISSUES.md` for the persistent Local Environment/macOS follow-ups.

### Exact next step

In Codex desktop settings, create the repository Local Environment with the documented Windows and
macOS setup commands, share the app-generated secret-free file under `.codex/`, then validate one new
managed worktree on macOS. After this infrastructure PR is accepted, start Slice 1.3 from the updated
Slice 1.2 branch; do not implement it here.
