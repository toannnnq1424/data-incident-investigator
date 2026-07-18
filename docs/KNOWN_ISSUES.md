# Known issues

Last updated: 2026-07-18.

- The Phase 1 Level D core gate passes on the Windows managed worktree, but the canonical browser gate
  remains blocked. The Slice 1.3 e2e launcher uses bare `spawn('pnpm')`, fixed ports, and a readiness
  check tied to `localhost`; temporary diagnostic changes exposed Windows pnpm-shim portability,
  leaked dev-server process trees, and a mismatch when Vite correctly reported
  `http://127.0.0.1:5173/`. The diagnostic code was not retained. Phase 1 closure and Phase 2 must
  remain blocked until one bounded launcher fix uses isolated ports/URLs, cleans its process tree, and
  `pnpm test:e2e:report` proves the under-three-minute, no-console-warning/error flow.
- Managed dependency bootstrap required the bundled Node directory in process `PATH`, created an
  untracked repository-local `.pnpm-store`, and needed scoped access for Vitest to read `esbuild`.
  PR #4 (`codex/stabilize-managed-worktree-bootstrap`, commit
  `99dfc5f7a086808b25d8a57988524769bca0cf87`) is separately green but was intentionally not integrated
  into the Phase 1 product-validation branch.
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
