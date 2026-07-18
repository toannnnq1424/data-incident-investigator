# Known issues

Last updated: 2026-07-18.

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
- Slice 2.2 adds bounded entity search through deterministic fixtures and DataHub GraphQL
  `searchAcrossEntities`. Entity selection/detail, live DataHub-backed incident orchestration, lineage,
  recent changes, model reasoning, evaluation CLI, cross-browser automation, and public deployment
  remain deferred to their planned slices. A live DataHub smoke is credential-gated and is not
  required for fixture and local fake-provider validation.
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
