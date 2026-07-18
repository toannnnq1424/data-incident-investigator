# Known issues

Last updated: 2026-07-18.

- The GitHub repository is private during development and must become public before submission.
- Slice 1.2 stores incident lifecycle and completed reports only in API process memory. Restarting the
  API removes existing incident IDs; durable persistence remains deferred.
- Fixture mode currently contains only the canonical removed-schema-column scenario. Additional
  canonical scenarios and generic scenario selection remain deferred.
- DataHub integration, model reasoning, evaluation CLI, e2e browser tests, and public deployment are
  intentionally deferred to their phases.
- Stitch MCP configuration is tracked without a key. A rotated `STITCH_API_KEY` must be set in the Codex
  process environment on each machine, then Codex must reload the trusted project.
- Stitch tools are not expected in the current task because project-scoped MCP configuration loads when
  Codex opens or reloads the trusted repository.
- Slice browser flows are exercised against local Vite/Fastify servers, but a repeatable checked-in
  browser automation suite remains deferred until the UI flow needs cross-session regression coverage.
- Codex desktop is the only documented writer for the shared Local Environment file, and the current
  callable app tools expose no create/update API. This repository therefore provides verified Windows
  and macOS/POSIX bootstrap scripts plus UI wiring instructions, but intentionally does not commit a
  guessed Local Environment schema. An app-generated, secret-free file under `.codex/` remains a
  follow-up.
- The Windows bootstrap is validated against the current Codex bundled runtime. The macOS script is
  syntax-checked here, but the macOS bundled runtime location and end-to-end execution still require a
  macOS host.
