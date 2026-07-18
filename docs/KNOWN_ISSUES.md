# Known issues

Last updated: 2026-07-18.

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
- PR #4 (`codex/stabilize-managed-worktree-bootstrap`) is merged into `main` at exact
  `f86dc552c6cb5805eb1a6b032a1b90a683a9a84f`; it is not being reverted. The resulting main CI run
  `29649047565`, job `88092112833`, exposed a test-only port-allocation race: the cleanup integration
  fixture closed a free-port probe before its descendant rebound the port and intermittently received
  `EADDRINUSE`. The focused hotfix uses atomic OS-assigned port `0` binding and the reported actual port;
  six consecutive post-fix focused runs passed locally. Draft-PR CI remains pending.
- The GitHub repository is private during development and must become public before submission.
- Slice 1.2 stores incident lifecycle and completed reports only in API process memory. Restarting the
  API removes existing incident IDs; durable persistence remains deferred.
- Fixture mode currently contains only the canonical removed-schema-column scenario. Additional
  canonical scenarios and generic scenario selection remain deferred.
- DataHub integration, model reasoning, evaluation CLI, cross-browser automation, and public deployment
  are intentionally deferred to their phases.
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
