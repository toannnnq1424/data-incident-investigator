# Implementation plan

## Phase 0 — Foundation

Status: implementation and Phase 0 validation complete; first commit and push pending.

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

Status: next slice; not started.

User outcome: enter an incident question and receive an incident ID with visible processing status.

Acceptance criteria:

- Web form captures question and optional context.
- API validates `IncidentRequestSchema` and rejects invalid requests with a stable error envelope.
- Valid requests return an incident ID and processing state.
- UI renders loading, success, and validation error states.
- Contract tests, API integration test, and one browser-level flow pass.

Minimum expected files: web form/components, API incident route, shared API schemas, slice tests, API
contracts, session log.

Slice validation: format changed files; web/API lint and type check; targeted contract/integration tests;
web and API builds.

### Slice 1.2 — Mock investigation

Read deterministic fixtures through a fixture `MetadataAdapter`; produce and render a structured report.

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
