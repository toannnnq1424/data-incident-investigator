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

## 2026-07-18 — Phase 1 Level D closure bị chặn trên managed Windows worktree

### Objective

Đóng checkpoint Phase 1 Level D trên branch handoff `codex/phase-1-level-d-closure`, bắt đầu từ exact
Slice 1.3 commit `c020a4c056527b0711cb07840be2446e23a00b43`, không tích hợp PR #4 và không bắt
đầu Phase 2.

### Completed

Xác minh worktree ban đầu sạch và đúng exact HEAD; merge-base với
`codex/slice-1-2-mock-investigation` là `b7a3e699198f7ebae187a5485d0a540a7127cb75`, với hai
commit Slice 1.3 phía trên. Ghi objective, acceptance, validation và deferred work trước gate. Core
Level D đã pass sau khi phân loại và cô lập các hạn chế managed runtime: format, lint, toàn bộ sáu
workspace type-check, 6 test files/14 tests, sáu production builds và primary artifact smoke. Sửa tối
thiểu e2e launcher để chẩn đoán pnpm spawn và Vite arguments trên Windows, sau đó hoàn tác toàn bộ
launcher diff vì controlled rerun vẫn không đạt. Không merge/cherry-pick bootstrap PR #4.

### Files changed

`docs/IMPLEMENTATION_PLAN.md`; `docs/KNOWN_ISSUES.md`; `docs/SESSION_LOG.md`.
`tests/e2e/report-display.spec.mjs` được sửa tạm để chẩn đoán rồi hoàn tác về exact baseline.
`docs/REPOSITORY_MAP.md` không đổi vì cấu trúc repository không đổi.

### Decisions

Phân loại lỗi `node`/`.pnpm-store`/sandboxed `esbuild` là environment/bootstrap, còn bare
`spawn('pnpm')` và Vite argument sentinel là test portability blockers thuộc Phase 1. Dùng bundled Node
chỉ qua process `PATH`, chuyển cache phát sinh sang
`C:\tmp\dii-phase1-level-d-pnpm-store-019f7547`, và giữ PR #4 là dependency xanh riêng. Sau hai vòng
targeted e2e fix vẫn gặp port/process-tree/readiness failures, hoàn tác test diff và dừng sửa/rerun theo
giới hạn thay vì thêm feature hoặc redesign.

Một đính chính scope cleanup đến sau lệnh dừng process: ngoài PID `21324`, `29640`, và watcher `27692`
đã xác minh là leak của worktree closure, lệnh đã dừng PID `20492` và `27968` của worktree `6219` cùng
repository. Hai PID `6219` này không nên bị xem là process ngoài dự án theo scope được làm rõ sau đó;
controller phải được báo chính xác. Controlled rerun sau đó chỉ cleanup leak mới của closure: PID
`15476`, `11728`, và watcher `23452`.

Supplied dependency evidence: PR #3 base `codex/slice-1-2-mock-investigation`, head
`codex-mac/slice-1-3-evidence-display`, CI run `29644831886`/job `88081227744` xanh; PR #4 head
`99dfc5f7a086808b25d8a57988524769bca0cf87`, CI run `29644965735`/job `88081574373` xanh.

### Validation performed

- Initial `pnpm validate`: failed before format after 29.8 seconds because managed dependency
  bootstrap could not resolve `node` for `esbuild` postinstall.
- Environment-only `pnpm install --frozen-lockfile` with bundled Node in `PATH`: passed in 10.7
  seconds. The next `pnpm validate` stopped at format after 53.1 seconds because bootstrap created an
  untracked `.pnpm-store`; the cache was moved outside the worktree. The continued `pnpm validate`
  passed format, lint, and six workspace type-checks, then failed at Vitest after 68.7 seconds because
  sandboxed Node could not read managed `esbuild`.
- Scoped `pnpm test`: passed in 18.1 seconds (Vitest 12.79 seconds), 6/6 files and 14/14 tests.
- Scoped `pnpm build`: passed in 19.5 seconds for all six buildable workspace projects; Vite
  transformed 109 modules and completed the web build in 2.89 seconds.
- Scoped `pnpm smoke`: passed in 1.6 seconds, verifying `apps/api/dist/index.js` and
  `apps/web/dist/index.html`.
- `pnpm test:e2e:report`: failed in 3.1 seconds and 2.7 seconds with `spawn pnpm ENOENT`; after the
  portable launcher fix it reached local server startup but failed in 29.6 seconds when Vite fell back
  from occupied port 5173, and after argument forwarding was fixed it failed in 24.5 seconds with
  transient `EADDRINUSE` on API port 3001. A controller-approved final controlled rerun was not started
  at its first preflight because listeners were present. After exact PID/CommandLine inspection and
  cleanup, ports were clean immediately before the one allowed run; it failed after 28.3 seconds
  because Vite reported `http://127.0.0.1:5173/` while the readiness regex required `localhost`. The
  flow never reached Chromium, so no console result or under-three-minute acceptance duration can be
  claimed. Temporary launcher changes were then reverted without another e2e run.
- Final changed-file Prettier check passed for the e2e script and three project-memory documents;
  affected ESLint passed for `tests/e2e/report-display.spec.mjs`. The first `pnpm exec prettier`
  launcher attempt did not start because the managed environment could not resolve the Windows shim;
  the equivalent project-local `.cmd` checks passed with scoped access.

### Validation intentionally deferred

No Phase 2, DataHub, Stitch, model reasoning, deployment, or broader cross-browser work was started.
The unresolved canonical browser gate is blocked, not intentionally waived.

### Known issues

Overall Phase 1 acceptance is failed until the canonical browser flow passes in a clean/bootstrap-ready
environment. Process-local incident persistence and the single canonical fixture remain as previously
documented. See `docs/KNOWN_ISSUES.md`.

### Exact next step

Keep Phase 2 blocked. The controller should choose whether to land the separately green managed-worktree
bootstrap dependency upstream or rerun this closure from a clean environment. Address cross-platform
pnpm launch, dedicated/dynamic ports with a matching URL/readiness contract, and process-tree cleanup as
one bounded browser-test fix; then rerun `pnpm test:e2e:report` once and proceed to merge-readiness only
after it proves the complete clean-console flow.

## 2026-07-18 — Phase 1 browser launcher stabilization follow-up

### Objective

Sửa duy nhất browser-launcher blocker trên branch/PR closure hiện tại, giữ nguyên Slice 1.3
product/UI/API, rồi dùng đúng một controlled e2e run để thử đóng Phase 1 gate.

### Completed

Tách launcher helper test-only để resolve pnpm qua current Node/`npm_execpath` với Windows fallback an
toàn; chọn hai port trống do OS cấp; đồng bộ API host/port, Vite proxy, readiness URL và browser URL;
bỏ sentinel `--` sai; và cleanup exact process tree do launcher tạo bằng Windows tree kill hoặc POSIX
process group. Thêm Vite config riêng trong `tests/e2e` nên không đổi app config. Mở rộng canonical flow
để kiểm tra mọi hypothesis evidence reference có evidence ID thật, giới hạn tổng thời lượng dưới ba
phút, và chỉ log pass sau browser close, process cleanup và port-release checks.

### Files changed

`tests/e2e/report-launcher.mjs`; `tests/e2e/vite.config.mjs`;
`tests/e2e/report-display.spec.mjs`; `tests/integration/report-launcher.test.ts`;
`docs/IMPLEMENTATION_PLAN.md`; `docs/KNOWN_ISSUES.md`; `docs/SESSION_LOG.md`.
Không đổi product/UI/API, package manifest, lockfile hoặc `docs/REPOSITORY_MAP.md`.

### Decisions

Không kill hoặc inspect ownership để chiếm fixed ports; launcher luôn dùng dynamic ports. Windows
cleanup dùng `taskkill /T /F` chỉ với root PID mà launcher vừa spawn; POSIX cleanup dùng process group
riêng. Targeted cleanup contract thực sự tạo parent/child listener thuộc test rồi chứng minh listener
được giải phóng. PR #4 vẫn là dependency riêng và không được merge/cherry-pick.

Incident scope-correction trước đó vẫn được giữ nguyên trong entry liền trước; follow-up này không chạm
worktree `6219` hoặc PID của task khác. Sau controlled run, PID `23972` được xác minh tạo lúc 20:08:46,
trước run hiện tại khoảng 34 phút, nên không phải descendant của launcher và không bị dừng.

### Validation performed

- Changed-file Prettier passed. Affected ESLint ban đầu fail với hai Node globals chưa qualified và một
  unused import; sau targeted fix, affected ESLint passed trong 1.3 giây.
- Targeted Vitest discovery đầu tiên không chạy test vì `.mjs` nằm ngoài include
  `tests/**/*.test.ts`; test được chuyển sang `.test.ts`. Launcher contracts sau đó passed 3/3 trong
  949 ms. Assertion Vite resolved config đầu tiên không collect vì root không sở hữu dependency
  `vite`; resolution được scope qua `apps/web/package.json` mà không thêm dependency. Final targeted
  command passed 3/3 trong 1.20 giây (409 ms test time).
- Đúng một controlled `pnpm test:e2e:report` được chạy sau targeted checks. Launcher chọn API
  `http://127.0.0.1:52289` và web `http://127.0.0.1:52290`; cả hai HTTP readiness checks pass. Command
  fail sau 3.9 giây trước browser creation vì thiếu
  `chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe`. Không rerun.
- Post-failure cleanup check xác nhận 0 listener trên `52289`/`52290` và 0 managed Node process mới
  trong năm phút gần nhất. Core Level D không được rerun vì input tương ứng không đổi.
- Sau lượt e2e đã khóa, `pnpm exec playwright install chromium` được chạy bằng bundled Node/pnpm và
  provision thành công executable revision `1228`; binary báo `Google Chrome for Testing
149.0.7827.55`.
- Sau khi controller cấp đúng một lượt mới cho external state đã thay đổi, `pnpm test:e2e:report`
  chọn API `http://127.0.0.1:51439` và web `http://127.0.0.1:51440`, rồi PASS canonical fixture flow
  trong `9361ms` (`15.219s` wall). Flow đi qua submit -> processing -> completed -> full evidence
  display, kiểm tra mọi hypothesis evidence reference phân giải tới displayed evidence ID, fail trên
  console warning/error, và enforce giới hạn ba phút.
- Post-run check có 0 listener trên `51439`/`51440` và 0 launcher-related process mới sau khi loại
  chính read-only probe. Core Level D không rerun vì input tương ứng không đổi. Phase 1 Level D PASS.

### Validation intentionally deferred

Không rerun core Level D vì input tương ứng không đổi. Không có Phase 2, DataHub, Stitch, deployment
hoặc cross-browser expansion.

### Known issues

Không còn blocker cho Phase 1 acceptance. Process-local incident persistence và single fixture vẫn như
trước và được defer ngoài checkpoint. Xem `docs/KNOWN_ISSUES.md`.

### Exact next step

Hoàn tất merge-readiness review cho stacked draft PR #5. Không bắt đầu Phase 2 trong task này, không
đổi product code và không tích hợp PR #4.

## 2026-07-18 — Phase 1 stacked-base merge readiness

### Objective

Merge-forward exact advanced Slice 1.3 base `edd0ed510d4cc4799d1c130415d8e79cb0ff78a5` vào closure
`c4f20c66d9c7351be8bbf0cdf4e23fe0355ef7f1` mà không rebase/rewrite, resolve conflict E2E duy nhất,
và chứng minh Phase 1 browser acceptance vẫn giữ nguyên trước khi push PR #5.

### Completed

Fetch xác minh advanced base, closure remote và merge-base
`c020a4c056527b0711cb07840be2446e23a00b43`. Merge `--no-ff --no-commit` chỉ conflict tại
`tests/e2e/report-display.spec.mjs`. Resolution giữ nguyên launcher dynamic ports, synchronized HTTP
readiness/browser URLs, current-Node pnpm invocation và descendant-only cleanup. Behavior của base
commit về styled Vite readiness được bảo toàn về mục tiêu vì launcher mới không parse log Vite; ANSI
styling không thể ảnh hưởng HTTP readiness.

### Files changed

`docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, `docs/SESSION_LOG.md`; merge history nhận exact
base `edd0ed510d4cc4799d1c130415d8e79cb0ff78a5`. Resolved
`tests/e2e/report-display.spec.mjs` trùng nội dung closure đã PASS. Không đổi product/UI/API, manifest,
lockfile, `docs/REPOSITORY_MAP.md` hoặc PR #4.

### Decisions

Không phục hồi bare pnpm spawn, fixed ports, log regex hoặc per-process cleanup cũ từ base commit.
HTTP readiness là superseding implementation cho cả plain và styled Vite output. Không dừng process
ngoài launcher. Duplicate sibling PR #6/commit `8d75932` không được merge, cherry-pick hoặc tích hợp.
Incident worktree `6219` và exact PID history vẫn được giữ nguyên trong entry trước.

### Validation performed

- Changed-file Prettier PASS trong 1.715 giây; affected ESLint PASS trong 3.690 giây.
- `pnpm exec vitest run tests/integration/report-launcher.test.ts` PASS 3/3; Vitest 1.94 giây, wall
  6.076 giây, gồm process-tree cleanup contract thật.
- Đúng một `pnpm test:e2e:report` chọn API `http://127.0.0.1:63576` và web
  `http://127.0.0.1:63577`, PASS canonical fixture flow trong `6890ms` (`13.097s` wall), dưới ba phút,
  evidence references thật và console sạch.
- Post-run check xác nhận 0 listener trên hai selected ports và 0 Node/cmd/Chromium runtime process của
  launcher. Một PowerShell từ tác vụ khác đang chạy `git show 8d75932…` được nhận diện là unrelated,
  không bị dừng và đã tự kết thúc trước probe tiếp theo.

### Validation intentionally deferred

Không rerun core Level D vì input product/core không đổi. Không có Phase 2, DataHub, Stitch,
deployment hoặc cross-browser expansion.

### Known issues

Không còn local acceptance blocker. Merge commit chưa push tại thời điểm ghi entry; PR conflict/CI sẽ
được xác minh sau push. Process-local persistence, single fixture và broader cross-browser coverage
vẫn deferred như trước.

### Exact next step

Tạo merge commit không rewrite, push cùng branch, xác minh draft PR #5 hết conflict và theo dõi đúng
một CI run mới. Dừng sau PR/CI evidence; không bắt đầu Phase 2 và không tích hợp PR #4.

## 2026-07-18 — Windows pnpm shim fallback hardening

### Objective

Ngăn browser launcher đưa Windows `.cmd`, `.bat` hoặc `.exe` pnpm shim vào Node như JavaScript, không
đổi runtime/browser behavior đã PASS và không tích hợp duplicate PR #6.

### Completed

`resolvePnpmInvocation` trim `npm_execpath`, chỉ dùng current Node cho non-native script path, và dùng
controlled `ComSpec /d /s /c pnpm.cmd` trên Windows khi path là native shim/binary hoặc bị thiếu.
Regression giữ `.mjs`/`.cjs` qua Node, kiểm tra `.CMD` case-insensitive, missing Windows path và POSIX
`pnpm` fallback.

### Files changed

`tests/e2e/report-launcher.mjs`, `tests/integration/report-launcher.test.ts`, và entry SESSION_LOG này.
Không đổi product, manifest/lockfile, PR #4 hoặc PR #6.

### Decisions

Không chạy browser E2E: actual validated launcher path là `.cjs`, nhánh Node hiện hữu không đổi, và
runtime URL/readiness/browser/cleanup contract không đổi. Focused pure invocation regression là test
reproducing trực tiếp.

### Validation performed

- Changed-file Prettier PASS sau một formatting-only rewrite; affected ESLint PASS trong 2.842 giây.
- `pnpm exec vitest run tests/integration/report-launcher.test.ts` PASS 3/3; Vitest 2.45 giây, test
  time 926ms, wall 6.945 giây.

### Validation intentionally deferred

Browser E2E, core Level D, build và smoke không rerun vì input/runtime contract tương ứng không đổi.
Không có Phase 2.

### Known issues

Không có blocker cục bộ mới; commit/push/CI còn pending tại thời điểm ghi entry.

### Exact next step

Review diff/secret, commit `test: harden Windows pnpm shim fallback`, push thường lên PR #5 và theo dõi
đúng một CI run mới. Không merge PR và không chạm PR #6.
