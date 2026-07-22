# Known issues

Last updated: 2026-07-22.

- Integrated Phase 6 main is exact merge `d18ecf2bbd1799de8374ee8390da40f170816741` with successful
  main CI run `29886862413`, job `88819080470`. The Windows Level D checkpoint is locally complete on
  `codex/phase-6-checkpoint`: both stable-input full matrices pass 37/37 files and 345/345 tests, six
  typechecks/builds, built health/readiness smoke, deterministic seven-case evaluation, fixture browser
  flow, blast-radius unknown/truncation coverage, and sanitized Markdown download/sample inspection.
  The first production dependency audit found GHSA-`v2hh-gcrm-f6hx` in transitive `fast-uri` 3.1.3 and
  4.1.0; narrow workspace overrides now resolve only patched 3.1.4/4.1.1, frozen install and affected
  API validation pass, and `pnpm audit --prod` reports zero known vulnerabilities. Exact-head Draft PR
  CI remains the publication condition before closing existing Issue #28 and its sole-issue Phase 6
  milestone. Live credentials/DataHub/model network, Mac, authentication, sharing/storage, deployment,
  merge, Phase 7, and further product extensions remain deferred.

- Phase 6 Slice 6.3 is merged through PR #35 at exact main merge
  `aa853d7b1dd2fdbeca45d08766643ba18ca2aa53` (tree
  `d61c3637d168cb33003b845b62a876e2d19363c3`); main CI run `29844355484`, job `88680987052`, passed.
  The late provider-timeout QA correction, Slice 6.1 factual timeout semantics, and Slice 6.2
  input/output safety remain intact.
- Phase 6 Slice 6.4 is merged through PR #36 at exact main merge
  `725f8966efba53e392240844df405bd3036cd60e` (tree
  `194532246703c28df80cca6f88da24c0d94ab912`; parents `aa853d7bâ€¦` and `f1e4a000â€¦`). Exact main CI
  run `29849465050`, job `88698347282`, passed. Strict `/health`, mode-aware `/ready`, safe invalid-
  fixture behavior, bounded DataHub readiness, local investigation-runtime validation, and accurate
  model `not_required` semantics remain intact.
- Phase 6 Slice 6.5 is merged through PR #37 at exact main merge
  `57dabac17d27d6cbc1764087bf1bec17820a55d0` (tree
  `ef53921bf013f4c4e69b1076c211dfb166edd0c3`; parents `725f8966efba53e392240844df405bd3036cd60e`
  and `bc30767b8c687b138f46001f937124b3104c4c84`). Exact main CI run `29853831610`, job
  `88713102696`, passed. The bounded observable-only activity trail, exact evidence links, safe
  warnings, one final event, and no hidden reasoning/raw provider/model content remain intact.
- Phase 6 Slice 6.6 is merged through PR #38 at exact normal merge
  `43e57aee320c86da0930deb4dd2fae38ca4b80e6` (tree
  `8592035e801a83c62796c6e527f3ac98e1203c36`; parents
  `57dabac17d27d6cbc1764087bf1bec17820a55d0` and
  `67755e31fbef163e4e9b442ddb4779897b7e95ae`). Exact main CI run `29859749024`, job
  `88733127030`, passed. Runner/model-authored confidence remains excluded; public
  `evidence-confidence-v1`, exact provenance, canonical `81% high`, and the resolved remediation
  references are authoritative on `main`.
- The approved optional blast-radius extension is limited to deterministic, evidence-linked downstream
  reach in the existing normalized lineage graph. It does not add a provider, connector, storage,
  retry, model prose, confidence factor, export, telemetry, or silent fixture fallback. DataHub/tool
  failure, missing lineage, and truncation can leave coverage `unknown`, `unavailable`, or `partial`;
  these states are deliberate and are not zero-impact claims. Focused Level C passes format/check,
  affected lint, 6/6 typechecks, 11/11 files and 99/99 tests, 6/6 builds, built smoke, automated Windows
  browser regression, read-only DOM spot-check, and listener/process cleanup. Phase 6 Level D/
  checkpoint, Markdown export, and Phases 7-8 remain deferred from this extension.
- Fixture continuation in a degraded DataHub response is deliberately advisory and `not_executed`;
  the operator must explicitly start the app in fixture mode. The current investigation makes zero model
  calls, so readiness accurately marks model `not_required`; it does not read `OPENAI_API_KEY` or claim
  model availability. There is no runtime mode switch, model provider implementation, durable incident
  storage, automatic retry for provider timeouts, or production remediation. Learning/feedback,
  operator-tunable scoring, authentication, deployment, distributed limiting, and Phase 6 Level D
  remain deferred.

- Phase 5 integration checkpoint local Level D evidence passes on exact Slice 5.1 final HEAD
  `883bf9bf` and unique branch `codex/phase-5-integration-checkpoint`. The single `pnpm validate`
  wrapper passed format/lint/six typechecks before the known sandbox-only esbuild resolution stopped
  test collection. Its exact scoped test recovery plus one six-file contention reproducer provide
  passing evidence for all 29 files/198 tests; all six builds and both smoke artifacts also pass. The
  first browser command exposed one stale E2E question expectation after scenario selection, so the
  checkpoint contains the minimum one-line test correction and no product change. The final-input
  recovery browser flow passed in `6429ms` on ports `54390`/`54391` with full selector-to-report,
  reference, accessibility, console, overflow, port, and owned-process assertions. Final formatting
  and pre-commit audit pass for exactly the three persistent docs plus the one-line E2E correction,
  with zero secret/conflict/debug/provider/model/generated/manifest/lock/dependency, listener, owned-
  process, ancestry, scope, or worktree finding. Conventional commit, normal push, a stacked Draft PR
  based on
  `codex/phase-5-1-scenario-demo`, exact final-head CI, and Draft/conflict-free/auto-mergeable review
  are pending. Live DataHub, credentials, providers/models/network, mutation, Slice 5.2, Phase 6, and
  subsequent tasks remain deferred.
- Mac QA at exact Slice 5.1 head `78a8fcde` passed bootstrap, 3 targeted files/28 tests, and the web
  build, then the one canonical browser gate failed before submit because one bare `ArrowDown` did not
  change a focused native scenario `<select>` in macOS Chromium. Exact comparison with checkpoint
  `160aa0da` proves its only E2E change fixes a later stale context-question assertion, not selection.
  The selector remains a labeled, focusable controlled native select with standard change semantics, so
  this is classified as a cross-platform test assumption. The focused E2E now asserts focus explicitly
  and uses `selectOption('removed-schema-column')`; product and previously green test/build inputs are
  unchanged. The first Windows reproducer crossed selection/submit and exposed only PR #32's known stale
  context-question assertion; its exact one-line correction was applied without cherry-picking the
  checkpoint. Final affected format/lint passed and the classified E2E retry passed in `6867ms`
  (`13.225s` wall) on ports `57888`/`57889`. Mac should rerun only that browser gate on the exact new head
  after CI.
- Phase 5 Slice 5.1 passes local Level C, the single combined browser gate, and the pre-commit final audit
  on exact Phase 4 checkpoint `19bb0d3` and branch `codex/phase-5-1-scenario-demo`; publication and CI
  evidence are pending. A strict browser-safe catalog in `@dii/shared-types` now owns the exact
  seven canonical IDs/order, labels/descriptions, and existing validated incident request prefills.
  Evaluation derives its case identity/intake from that catalog while retaining expected outcomes and
  fake telemetry internally. The web adds only a native single-select guided intake with explicit
  manual/scenario/custom state, editable fields, clear reset, and no hidden request payload. No API,
  provider, fixture, report, scoring formula, credential, model, network, mutation, dependency,
  manifest, or lockfile behavior is intentionally changed. Live DataHub remains credential-gated and
  is not a fixture/fake-provider gate for this slice. Final evidence is format/lint, six typechecks,
  5 files/40 tests, six builds, and one `119127ms` browser flow on ports `61984`/`61985` with 7/7
  scenario IDs/order, selected/editable custom intake, full context-to-report chain, clean console,
  desktop/mobile overflow protection, and zero port/process/temp-file leak. The sandboxed initial test
  command stopped before collection on the known esbuild ancestor-path denial; its exact scoped recovery
  passed without a code change or rerunning any green step. The audit covers exactly 10 tracked
  modifications plus one new test, with zero missing/unexpected path, whitespace, secret, conflict,
  debug/raw-provider/model, manifest/lockfile/dependency, out-of-scope runtime, ancestry, or temporary/
  generated-artifact finding.
- Phase 4 local integration closure passes on exact Slice 4.1 final HEAD `319a0755`, exact parent
  checkpoint `6499cb3`, and unique branch `codex/phase-4-integration-checkpoint`. The docs-only Level D
  gate covers repository format/lint, six typechecks, 28 files/193 tests, six builds, and two smoke
  artifacts. The one `pnpm validate` wrapper stopped before test collection only because sandboxed
  esbuild could not read managed-worktree ancestor metadata; exact component recovery passed without a
  code change, and no green command was rerun. One compiled evaluation invocation retained 7 completed/
  0 failed cases, exact aggregate metrics, stable Slice 4.1 JSON/Markdown hashes, zero tokens, and zero
  unsupported claims; its verified ignored output was removed completely. One browser flow passed in
  `13261ms` on ports `54796`/`54797` with the full context-to-report chain, clean console/accessibility/
  overflow, and clean port/process teardown. Live DataHub/provider/model evaluation, credential access,
  network calls, automatic mutation, new reliability behavior, Phase 5, publication, final-HEAD CI, and
  merge-readiness remain deferred or pending as applicable.
- Phase 4 Slice 4.1 canonical evaluation is implemented locally from exact Phase 3 checkpoint
  `6499cb3`. Strict shared schemas and `packages/evaluation` now own exactly seven stable ordered cases,
  a deterministic provider-neutral fake runner, JSON/Markdown reporters, safe per-case failure, and
  bounded audit telemetry. Level C passes changed-file format, affected lint, six typechecks, 5 files/
  36 tests, and six builds; the known sandbox esbuild ancestor denial required scoped test/web-build
  retries without a code workaround. The compiled runner produced 7 completed/0 failed cases with
  retrieval/top-1/top-3/evidence/reference-support all `1`, unsupported claims `0/18`, declared latency
  `168/24/29 ms`, tool calls `26/3.714286/4`, and tokens `0/0/0`; both temporary artifacts were removed.
  The initial source-CLI attempt exposed NodeNext `.js` remapping under raw TypeScript execution, so the
  package command now runs its already-built `dist/cli.js`; no dependency or lockfile changed. Browser
  E2E is intentionally not rerun because production browser inputs are unchanged. Level D, live/provider/
  model evaluation, reliability hardening, Phase 4 closure, and publication/CI remain deferred. Final
  pre-commit audit is clean for ten intended files: whitespace, full tracked/untracked scope, secret/
  conflict/debug/raw-provider/model sentinels, ignored/generated output, manifest/lockfile, out-of-scope
  product paths, exact base ancestry, and branch state all passed.
- Phase 3 local integration closure passes on exact Slice 3.4 final HEAD `c316f8f` on branch
  `codex/phase-3-integration-checkpoint`. Exactly one `pnpm validate` passed format/lint, six
  typechecks, 27 files/186 tests, six builds, and two smoke artifacts in about `30.0s`. Exactly one
  combined fixture browser flow passed in `4730ms` on dynamic API/web ports `60759`/`60760`, proving
  factual context -> exact suspicious change -> ranked `0.85` plausible contributor with transparent
  factors/resolved evidence -> two resolved `not_executed` recommendations with verification and
  reversibility -> full report, plus accessibility/keyboard links, clean console/overflow, and clean
  port/process teardown. The initial bootstrap process reproduced the existing fallback-pnpm
  root-Prettier resolution limitation after a successful frozen install/supply-chain check; the
  documented process-scoped bundled Node/pnpm/root-bin PATH completed bootstrap without a repository
  change. Live DataHub smoke remains credential-gated and deferred without inspecting or using a
  credential. The stacked base branch subsequently advanced to content-identical merge commit
  `2cd66fb`; no validated input changed and no merge/rebase/gate rerun is needed. Publication,
  final-HEAD CI, and Draft PR merge-readiness evidence remain pending.
- Slice 3.4 remediation/fallback is implemented locally from exact Slice 3.3 final commit `3a1c5c7`.
  The pure deterministic planner consumes only validated context, exact scored hypotheses, and factual
  report evidence; supports bounded schema/pipeline/ownership/domain/tag human-review guidance; emits
  at most five stable/deduplicated `not_executed` recommendations; and creates no new score, provider/
  model call, credential read, or mutation. Insufficient/unavailable input yields zero invented
  recommendation/reference plus bounded safe diagnostics and required credential-free fixture
  continuation. Final Level C passes format/lint, five typechecks, 13 files/72 tests, five builds, and
  exactly one browser flow in `7255ms` on ports `61164`/`61165` with canonical `0.85`, two resolved
  `not_executed` recommendations, clean console/accessibility/overflow, and clean teardown. The first
  test run transparently exposed a causal-filter false positive against the required explicit negation;
  the targeted contract fix passed the affected suite. Final audit also removed two credential-environment
  reads from the test itself; its targeted format/lint and 4/4 tests passed. Review is clean across 17
  intended files for diff whitespace/scope, secret/conflict/unsafe-output/generated artifacts,
  manifest/lock/bootstrap/fixture/provider/dependency changes, exact branch/base/ancestry, and owned
  processes. The first PR CI run `29667788737` failed because the root integration test imported React
  outside its owning web workspace under strict Linux pnpm resolution. The test now resolves the existing
  web-declared runtime without a dependency change; targeted format/lint and 4/4 tests pass. A new
  final-HEAD CI run remains pending. Level D, live DataHub smoke, generic controller/model integration,
  autonomous execution, and Phase 3 integration closure remain deferred.
- Slice 3.3 evidence-linked scoring is implemented locally on exact Slice 3.2 commit `96476f8`.
  The scorer is pure over validated context/suspicious/report-evidence inputs, emits at most three
  exact evidence-linked plausible-contributor inferences, and owns a four-factor 10,000-basis-point
  formula. The canonical removed-column score is `0.85`; arbitrary legacy `0.92` is removed from the
  runner/browser path. Recent-change truncation, candidate-cap incompleteness, insufficient suspicious
  input, and unresolved evidence yield zero scored hypotheses. Final Level C passes format/lint, five
  typechecks, 11 files/62 tests, five builds, and one final browser recovery flow in `16150ms` on ports
  `63866`/`63867` with ranked factors/evidence links plus clean console/overflow/teardown. The first
  browser attempt exposed and then narrowed only a false-positive assertion against the required
  `not a confirmed cause` disclaimer. Final tracked/untracked diff, secret, conflict, causal/debug/raw-
  provider/model, generated-artifact, manifest/lockfile, ancestry, and scoped patch review pass;
  publication and CI evidence are pending. Level D, live DataHub smoke, model/controller work, and
  evidence-chain prose remain deferred from that slice.
- Slice 3.2 suspicious-change detection Level C passes locally from exact Slice 3.1 final commit
  `c0d765ed57b00c17d957eb62e3e84984897af48f`. The detector is pure over validated completed context,
  uses five allowlisted deterministic signals, returns at most five exact change/entity candidates,
  and exposes no hypothesis, confidence, root-cause, recommendation, remediation, raw provider payload,
  or additional provider call. Missing incident comparison inputs and empty/no-match history produce
  explicit bounded gaps or `insufficient`; context failure remains safe `unavailable`. Targeted
  evidence is 9 files/51 tests plus five builds; exactly one browser flow passed in `19622ms` on dynamic
  ports `62812`/`62813` with the exact canonical upstream schema-change signals, unchanged full report,
  clean console/overflow, and clean teardown. Publication evidence remains pending. Slice 3.3, live
  DataHub smoke, model work, remediation, persistence, and Level D remain deferred.
- Slice 3.1 parse-and-gather Level C passes locally from exact Phase 2 closure merge `e7b053c`. The
  additive incident `contextStage` validates normalized intent, selects only adapter-returned URNs,
  gathers one bounded upstream graph and one recent-change window under four calls/one
  timeout, and separates provider facts from missing information without adding hypotheses. Targeted
  evidence covers 40 tests, five affected builds, and one combined browser flow in `6750ms` on dynamic
  ports `58373`/`58374`; the canonical report remains compatible. Suspicious-change detection,
  hypothesis/scoring/remediation work, live DataHub smoke, persistence, and Level D remain deferred.
- This slice reproduced two existing managed Windows environment limitations without a repository
  defect: fallback pnpm completed the frozen 259-package install but did not resolve root Prettier until
  the verified process-local Node/root-bin path was loaded, and sandboxed Vitest/Vite could not read
  esbuild ancestor metadata. Scoped retries passed targeted tests and remaining builds. No bootstrap,
  dependency, manifest, lockfile, generated store, or credential change is required.
- Phase 2 local integration closure passes on exact Slice 2.4 handoff
  `43e6d35c9e7881e668eb7cd4837542e8a7fab8dd`: one `pnpm validate` passed format, lint, six
  type-checks, 19 files/139 tests, six builds, and smoke in `29s`; one combined fixture browser flow
  passed in `5314ms` on dynamic ports `52655`/`52656` with search, truncated/cycle-safe lineage,
  deterministic truncated recent changes, incident processing/completed/full evidence, accessibility,
  resolved evidence references, clean console, no horizontal overflow, and clean launcher/port
  teardown. Live DataHub smoke remains credential-gated and is not a fixture-gate blocker.
- Slice 2.4 subsequently merged into exact `main`
  `fc08d5f32d8a77232ce6875b453884cbe68a4e6b`. The closure merge-forward completed without conflict,
  and every product/fixture/contract/test/launcher/manifest/lockfile/script gate input remains
  byte-identical, so the successful Level D/browser commands were not duplicated. The pre-existing
  `codex/phase-2-closure` branch is checked out in another worktree at that main commit and remains
  unmodified; the closure PR uses unique branch `codex/phase-2-integration-closure-20260718` with base
  `main`.
- This checkpoint reproduced the existing Windows managed fallback-pnpm workspace-binary issue after
  a successful frozen install and supply-chain check: `pnpm exec prettier` did not resolve the root
  shim until the verified root `.bin` directory was prepended to the current process `PATH`. The same
  process-local runtime then passed the full Level D and browser gates. No repository bootstrap,
  dependency, manifest, or lockfile change is required for Phase 2 closure.
- The Phase 1 Level D core gate passes on the Windows managed worktree, and the browser launcher now
  resolves pnpm cross-platform, uses synchronized dynamic ports/URLs, and cleans only its own process
  tree. Three targeted launcher contracts pass. After Windows Playwright Chromium headless shell
  revision `1228` was provisioned, the single newly authorized e2e run passed the canonical flow in
  `9361ms` on dynamic ports `51439`/`51440`, with evidence-reference resolution and clean-console
  assertions enabled. Both ports and the launcher process tree were clean afterward. The Phase 1
  browser gate is no longer a blocker.
- The advanced stacked base commit `edd0ed510d4cc4799d1c130415d8e79cb0ff78a5` changed the legacy E2E
  launcher to tolerate ANSI-styled Vite logs and initially conflicted with the closure launcher. The
  merge-forward resolution retains HTTP readiness at synchronized dynamic URLs, which is independent
  of styled logs. Targeted contracts passed 3/3 and the canonical browser flow passed again in
  `6890ms` on ports `63576`/`63577`, with no listener or launcher-runtime leak.
- Managed dependency bootstrap required the bundled Node directory in process `PATH`, created an
  untracked repository-local `.pnpm-store`, and needed scoped access for Vitest to read `esbuild`.
  PR #4 (`codex/stabilize-managed-worktree-bootstrap`, commit
  `99dfc5f7a086808b25d8a57988524769bca0cf87`) is separately green but was intentionally not integrated
  into the Phase 1 product-validation branch.
- Slice 2.4 reproduced the managed `pnpm exec` workspace-binary resolution issue after a successful
  frozen dependency bootstrap. The verified project-local `.cmd` binaries passed formatter, ESLint,
  and test execution. Sandboxed Vitest/Vite also reproduced the known esbuild path denial; scoped
  retries passed all targeted tests and remaining builds. This is an environment limitation, not a
  product or CI blocker.
- Slice 2.3 reproduced the managed `pnpm exec` workspace-binary resolution issue after a successful
  frozen dependency bootstrap. Read-only probes confirmed devDependencies were installed; direct
  project-local `.cmd` binaries passed formatter/lint/test execution. The generated `.pnpm-store` was
  removed after all worktree runtime processes ended. This is an environment limitation, not a product
  or CI blocker.
- Exact `main` `54945b80a27685ce81e476173a3466e585f42112` exposes a test-only cleanup ownership
  race in PR #7 CI run `29651498475`, job `88098488706`: 36/37 tests passed, while the launcher
  integration test's post-cleanup rebind of an old OS-assigned port lost to another process with
  `EADDRINUSE`. Branch `fix/phase1-launcher-cleanup-ownership` replaces that TOCTOU assertion with a
  bounded liveness check for the exact descendant PID while preserving pre-cleanup HTTP readiness;
  focused local validation passes and draft PR CI is pending. No product, DataHub, or launcher runtime
  blocker is indicated.
- Phase 1 is fully integrated and closed on exact `main`
  `54945b80a27685ce81e476173a3466e585f42112`; main CI run `29650788143`, job `88096660559`, is
  green. PR #4 managed-worktree bootstrap, PR #8 atomic port-race fix, and PR #9 post-merge closure are
  merged and preserved.
- The post-merge Level D gate passes: repository format, lint, six workspace type-checks, 7 test
  files/17 tests, six production builds, both artifact smoke targets, and the canonical browser flow
  completed on the integrated main tree. The first full-test attempt had two transient `5s` API
  timeouts under parallel load; the focused pair immediately passed 5/5 and the full-suite recovery
  passed 17/17 without a code change, so no implementation blocker remains.
- The single post-merge E2E selected dynamic ports `61369`/`61370` and passed
  `submit -> processing -> completed -> full evidence display` in `32.400s`, with real evidence
  references and clean-console assertions. Post-run probes found zero listeners and zero
  launcher-related process leaks.
- The GitHub repository is private during development and must become public before submission.
- Slice 1.2 stores incident lifecycle and completed reports only in API process memory. Restarting the
  API removes existing incident IDs; durable persistence remains deferred.
- Fixture mode currently contains only the canonical removed-schema-column scenario. Additional
  canonical scenarios and generic scenario selection remain deferred.
- Slice 2.4 adds bounded recent metadata facts from search results or lineage nodes through
  deterministic fixtures and DataHub GraphQL `getTimeline`. The official DataHub timeline input has no
  time-range, count, page-token, or cursor field and the resolver caps results at 100 transactions, so
  the adapter makes one request, applies time/count bounds locally, exposes no synthetic cursor, and
  marks provider-cap truncation. Deployments without retained timeline history may legitimately return
  an empty result. Live DataHub-backed incident orchestration, impact analysis, change-to-incident
  correlation, ownership enrichment, schema diff, model reasoning, evaluation CLI, broader
  cross-browser automation, and public deployment remain deferred. A live DataHub smoke is
  credential-gated and is not required for fixture and local fake-provider validation.
- Stitch MCP configuration is tracked without a key. A rotated `STITCH_API_KEY` must be set in the Codex
  process environment on each machine, then Codex must reload the trusted project.
- Stitch tools are not expected in the current task because project-scoped MCP configuration loads when
  Codex opens or reloads the trusted repository.
- Slice 1.3 adds one checked-in Playwright browser test for the canonical fixture report. A broader
  cross-browser matrix remains deferred until the Phase 1 integration or release checkpoint.
- Codex desktop is the only documented writer for the shared Local Environment file, and the current
  callable app tools expose no create/update API. This repository therefore provides verified Windows
  and macOS/POSIX bootstrap scripts plus UI wiring instructions, but intentionally does not commit a
  guessed Local Environment schema. An app-generated, secret-free file under `.codex/` remains a
  follow-up.
- The Windows bootstrap is validated against the current Codex bundled runtime, and the macOS
  bootstrap is validated end to end with Homebrew Node/pnpm on `PATH`. The macOS Codex-bundled runtime
  location/fallback remains unexercised and must fail with the script's actionable prerequisite error
  if neither compatible host tools nor the verified relative cache layout is available. The recorded
  macOS result predates the merge-forward from `main`; fresh QA of the post-merge PR head is pending.
