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
