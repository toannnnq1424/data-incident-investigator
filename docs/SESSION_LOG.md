# Session log

## 2026-07-18 — Phase 0 foundation initialization

### Objective

Create the GitHub repository and implement the documented Phase 0 foundation.

### Completed

Created the private GitHub repository and added the monorepo, initial web/API entrypoints, shared
contracts, tooling, CI, docs, and secret-safe optional Stitch MCP configuration. Installed dependencies
inside the project, corrected root integration-test resolution, and completed Phase 0 validation.
Installed a checksum-verified portable GitHub CLI under ignored `work/tools/` and authenticated it with
GitHub's device flow.

### Files changed

Root tooling; `apps/`; `packages/`; `tests/`; `scripts/`; `docs/`; `.github/`; `.codex/`.

### Decisions

TypeScript/pnpm monorepo; React/Vite; Fastify; Zod contracts; stable metadata adapter; evidence-linked
reports; Stitch as optional design assistance using an environment-sourced header; workspace sandbox
with network access and scoped `on-request` automatic approval review.

### Validation performed

The final `pnpm validate` passed: format, lint, type-check, 2 test files/3 tests, all six workspace
projects built, and the artifact smoke check. The later permission-policy changes affected only Codex
configuration and documentation and received targeted static validation.

### Validation intentionally deferred

Real DataHub and Stitch smoke tests are deferred until their phases and valid rotated credentials are
available. CI confirmation is deferred until the first push.

### Known issues

See `docs/KNOWN_ISSUES.md`.

### Exact next step

Review the final staged diff and secret scan, commit and push the Phase 0 foundation, confirm CI, then
start Slice 1.1 — Submit incident.
