# Known issues

Last updated: 2026-07-18.

- The GitHub repository is private during development and must become public before submission.
- Slice 1.1 generates an incident UUID but does not persist incident state; report retrieval and the
  deterministic investigation are deferred to Slice 1.2.
- Fixture directories are defined but not populated until Slice 1.2.
- DataHub integration, model reasoning, evaluation CLI, e2e browser tests, and public deployment are
  intentionally deferred to their phases.
- Stitch MCP configuration is tracked without a key. A rotated `STITCH_API_KEY` must be set in the Codex
  process environment on each machine, then Codex must reload the trusted project.
- Stitch tools are not expected in the current task because project-scoped MCP configuration loads when
  Codex opens or reloads the trusted repository.
- The Slice 1.1 browser flow was exercised against local Vite/Fastify servers, but a repeatable checked-in
  browser automation suite remains deferred until the UI flow needs cross-session regression coverage.
