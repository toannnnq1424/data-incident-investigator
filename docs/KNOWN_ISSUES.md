# Known issues

Last updated: 2026-07-19.

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
