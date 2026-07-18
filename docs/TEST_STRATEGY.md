# Test strategy

## Principles

Tests prove contracts and user-visible slices without repeatedly spending time on unrelated suites.
Fixture mode makes incident behavior deterministic; DataHub smoke tests are credential-gated.

## Validation levels

### Level A — Local static validation

After a coherent edit group, format changed files and run lint/type-check for affected workspaces.

### Level B — Targeted defect validation

Start with the failing test, implementation it exercises, direct dependency, and contract. Add or identify
one reproducer, make one fix, rerun that test, and expand only if shared behavior changed.

### Level C — Slice validation

Run affected lint/type-check, related unit tests, slice integration, and affected builds. A UI slice also
gets one primary browser flow.

### Level D — Phase/release validation

Run `pnpm validate`, then any phase-specific evaluation/e2e commands. Use only at phase completion,
before merge, release, or submission.

## Test placement

- Schema and pure logic: package-local or `tests/integration` where contracts cross packages.
- API routes: Fastify injection without binding a port.
- Adapter behavior: shared contract suite executed against fixture and DataHub adapters.
- User flows: `tests/e2e` after the relevant UI slice exists.
- Build/startup: `tests/smoke` plus `scripts/smoke.mjs`.

## Required incident evaluation cases

Removed column, stale pipeline, upstream type change, wrong dashboard dataset, delayed ingestion,
incorrect owner/domain, and insufficient evidence.

## Release validation

Clean install, full static checks, all tests, production build, artifact smoke, evaluation, deployed health,
fixture-backed e2e, and one real DataHub smoke only when credentials are available.
