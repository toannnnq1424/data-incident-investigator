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
presentation to Slice 1.3.

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

## 2026-07-18 — Phase 1 Slice 1.3 evidence display trên macOS

### Objective

Triển khai màn hình hiển thị evidence chi tiết từ báo cáo fixture đã có ở Slice 1.2, bắt đầu từ exact
commit `8bfab62a2ab3e80f8b57f90c8a464a1c151130bd`, không sửa backend, `agent-core`, hoặc shared
contract.

### Completed

Xác nhận Slice 1.2 đạt targeted validation trên macOS, rồi tạo branch
`codex-mac/slice-1-3-evidence-display`. Mở rộng completed report trong web UI để hiển thị related
entities, facts/evidence kèm evidence IDs, lineage evidence, hypotheses/inferences kèm confidence và
referenced evidence IDs, assumptions, missing information, và recommended actions. Giữ loading,
empty-state và error-state dễ hiểu. Thêm Playwright browser test cho canonical fixture report và thêm
script `pnpm test:e2e:report`.

### Files changed

`apps/web/src/App.tsx`; `apps/web/src/styles.css`; `tests/integration/web-report.test.ts`;
`tests/e2e/report-display.spec.mjs`; `package.json`; `pnpm-lock.yaml`; `docs/IMPLEMENTATION_PLAN.md`;
`docs/KNOWN_ISSUES.md`; `docs/REPOSITORY_MAP.md`; `docs/TEST_STRATEGY.md`; `docs/SESSION_LOG.md`.

### Decisions

Không thay đổi API, runner, adapter hoặc shared schemas vì `IncidentRetrievalResponseSchema` từ Slice
1.2 đã có đủ dữ liệu. Dùng evidence như facts, hypotheses như inferences, và lọc evidence category
`lineage` để tạo section lineage riêng. Thêm `playwright` làm dev dependency tối thiểu để browser-level
test có thể chạy lặp lại trong repo.

### Validation performed

Slice 1.2 targeted validation trên macOS passed: `pnpm install --frozen-lockfile`, changed-file
Prettier check, affected lint, five affected type-checks, five targeted Vitest files với 13 tests,
five affected builds, và real browser canonical flow qua Vite/Fastify. Chuẩn bị browser runtime bằng
`pnpm exec playwright install chromium`. Slice 1.3 Level C passed: `pnpm install --frozen-lockfile`;
`pnpm exec prettier --check package.json pnpm-lock.yaml
apps/web/src/App.tsx apps/web/src/styles.css tests/integration/web-report.test.ts
tests/e2e/report-display.spec.mjs docs/IMPLEMENTATION_PLAN.md docs/KNOWN_ISSUES.md
docs/REPOSITORY_MAP.md`; `pnpm exec eslint apps/web/src tests/integration/web-report.test.ts
tests/e2e/report-display.spec.mjs`; `pnpm --filter @dii/web typecheck`; `pnpm exec vitest run
tests/integration/web-report.test.ts`; `pnpm test:e2e:report`; `pnpm --filter @dii/web build`.

### Validation intentionally deferred

Full Level D validation, cross-browser matrix, real DataHub smoke, model reasoning, durable
persistence, and Phase 2 work remain deferred.

### Known issues

Incident state remains process-local, and the fixture set still contains only the canonical
removed-schema-column scenario. See `docs/KNOWN_ISSUES.md`.

### Exact next step

Review the stacked draft PR for `codex-mac/slice-1-3-evidence-display` against
`codex/slice-1-2-mock-investigation`; after acceptance, run the Phase 1 integration checkpoint before
starting Phase 2.
