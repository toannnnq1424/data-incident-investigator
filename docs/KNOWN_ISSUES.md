# Known issues

Last updated: 2026-07-19.

- Phase 2 Level D passes on Windows from exact integrated main
  `fc08d5f32d8a77232ce6875b453884cbe68a4e6b`: repository format/lint, six workspace
  typechecks/builds, 20 test files/140 tests, primary artifact smoke, and the canonical fixture browser
  flow are green. The shared metadata-boundary test runs fixture and real DataHub clients against the
  same health/search/lineage/recent-change API contract; its DataHub side uses only a local fake HTTP
  provider. Closure-branch macOS exact-head QA remains a controller-owned pre-merge check.
- The Windows managed-worktree bootstrap installs the frozen 259-package dependency graph with the
  bundled Node `v24.14.0` and pnpm `11.9.0`, but `pnpm exec` does not resolve the installed root
  Prettier binary. Direct project-local `.cmd` tools pass. Sandboxed Vitest/Vite also cannot read the
  managed-worktree ancestor path required by esbuild; the scoped validation run passes. These are
  environment limitations, not product or CI blockers.
- No `DATAHUB_GMS_URL` or `DATAHUB_TOKEN` value was present for this checkpoint. Live DataHub smoke is
  credential-gated and was not run; fixture and fake-provider validation remain green. Credential
  values must never be requested, printed, logged, or committed.
- DataHub mode currently covers metadata health, entity search, bounded/cycle-safe lineage, and recent
  metadata facts. `POST /incidents` still uses the deterministic fixture investigation runner. Live
  DataHub-backed parse/gather orchestration is deferred to Phase 3 Slice 3.1; impact analysis,
  change-to-incident correlation, hypothesis scoring, and remediation have not started.
- The official DataHub timeline GraphQL input exposes no time-range, count, page-token, or cursor and
  the resolver caps results at 100 transactions. The adapter therefore makes one request, applies the
  shared time/count bounds locally, exposes no synthetic cursor, and marks provider-cap truncation.
  Deployments without retained timeline history may legitimately return an empty result.
- The GitHub repository is private during development and must become public before submission.
- Incident lifecycle and completed reports are held only in API process memory. Restarting the API
  removes existing incident IDs; durable persistence remains deferred.
- Fixture mode contains only the canonical removed-schema-column incident scenario. Additional
  canonical scenarios and generic scenario selection remain deferred.
- One checked-in Chromium browser flow covers the canonical fixture report. A broader cross-browser
  matrix remains deferred.
- Stitch MCP configuration is tracked without a key. A rotated `STITCH_API_KEY` must be set in the
  Codex process environment on each machine, then Codex must reload the trusted project.
- Codex desktop is the only documented writer for the shared Local Environment file, and the current
  callable app tools expose no create/update API. The repository provides verified Windows and
  macOS/POSIX bootstrap scripts but intentionally does not commit a guessed Local Environment schema.
- The Windows bootstrap is validated against the current Codex bundled runtime, and the macOS
  bootstrap is validated end to end with Homebrew Node/pnpm on `PATH`. The macOS Codex-bundled runtime
  location/fallback remains unexercised and must fail with an actionable prerequisite error when
  neither compatible host tools nor the verified relative cache layout is available.
