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
- User flows: `tests/e2e`; Slice 1.3 starts this with `pnpm test:e2e:report` for the canonical
  fixture report display. On a new machine, run `pnpm exec playwright install chromium` once before the
  browser flow.
- Build/startup: `tests/smoke` plus `scripts/smoke.mjs`.

## Required incident evaluation cases

Removed column, stale pipeline, upstream type change, wrong dashboard dataset, delayed ingestion,
incorrect owner/domain, and insufficient evidence.

## Canonical evaluation metrics

Phase 4 Slice 4.1 owns exactly those seven cases in that order through strict schemas from
`@dii/shared-types`. Run `pnpm --filter @dii/evaluation build`, then
`pnpm --filter @dii/evaluation evaluate -- --output-dir <ignored-or-temporary-path>` to write
`canonical-evaluation.json` and `canonical-evaluation.md`. Both reporters consume the same validated
report; generated output is not committed.

- Retrieval precision is matched expected entity URNs divided by observed entity URNs. Retrieval
  recall uses the same matched count divided by expected entity URNs.
- Plausible-hypothesis top-1 accuracy is one match over one eligible case when an expected hypothesis
  exists. Top-3 recall is matched expected hypothesis IDs within the first three observed hypotheses
  divided by expected hypothesis IDs. These are plausible-contributor matches, not causal certainty.
- Evidence precision/recall compares stable evidence IDs. Reference support divides resolved supplied
  fact/entity/change/evidence/hypothesis/remediation references by all supplied references; schemas
  reject dangling references before scoring.
- An unsupported claim is an explicit observed claim with zero evidence references. Supplied dangling
  evidence references are invalid rather than counted as support. Unsupported-claim rate divides the
  count by observed claims.
- Every ratio is rounded to six decimal places and is `0` when its denominator is `0`. Aggregate rates
  sum case numerators and denominators before division; they never average rounded case rates.
- Latency is bounded fixture telemetry, not test wall-clock time. Tool calls are counted from ordered,
  validated telemetry entries. Prompt, completion, and total tokens are schema-enforced `0` because
  the deterministic suite has no model boundary.

## Release validation

Clean install, full static checks, all tests, production build, artifact smoke, evaluation, deployed health,
fixture-backed e2e, and one real DataHub smoke only when credentials are available.
