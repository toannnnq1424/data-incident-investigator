# Known issues

Last updated: 2026-07-19.

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
