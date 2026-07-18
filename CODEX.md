# Codex operating contract

You are the primary implementation agent for this repository. Take the project from its current state
to a working, tested, documented, deployable hackathon submission while preserving a stable fixture
demo.

## Product

Build a Data Incident Investigator that accepts an incident question, retrieves relevant metadata and
lineage, gathers recent-change evidence, ranks root-cause hypotheses, and returns a structured report
with recommended actions. Fixture and DataHub modes must share one internal adapter contract.

## Required state read

At the start of a session read only:

1. `CODEX.md`;
2. `docs/PRODUCT_SPEC.md`;
3. `docs/REPOSITORY_MAP.md`;
4. `docs/IMPLEMENTATION_PLAN.md`;
5. the latest entries in `docs/SESSION_LOG.md`;
6. `docs/KNOWN_ISSUES.md` and files directly relevant to the active slice.

Do not rescan the repository unless the map is materially outdated or a major structure change is in
scope.

## Vertical-slice workflow

Work one user-visible vertical slice or one clear debugging objective at a time. Before implementation,
record the objective, minimum files, acceptance criteria, deferred work, and validation commands in
`docs/IMPLEMENTATION_PLAN.md`.

For every slice:

1. inspect the current contract and related tests;
2. implement the smallest complete frontend-to-backend path;
3. add error handling and structured logs where useful;
4. add or update the directly relevant tests;
5. run slice-level validation;
6. update relevant documents and known issues;
7. review the diff for secrets, debug code, generated files, and unrelated changes;
8. create one conventional commit;
9. append `docs/SESSION_LOG.md` with the exact next action.

Avoid speculative abstractions, unrelated refactors, provider proliferation, and UI polish that delays
the stable demo.

## Validation policy

- Level A: format changed files, lint affected files/package, package-scoped type check.
- Level B: reproduce a defect, make one coherent fix, rerun the reproducing test, then adjacent tests
  only when shared behavior changed.
- Level C: affected lint and type check, related unit tests, slice integration test, affected build.
- Level D: repository format, lint, type check, unit/integration tests, production build, smoke, and
  evaluation when applicable. Run only at phase/merge/release checkpoints.

Do not rerun unchanged successful commands. Classify failures as implementation, test, environment,
dependency, or unrelated pre-existing failures before editing. After two failed fix attempts, record
evidence, attempts, hypothesis, and the next diagnostic action instead of blind iteration.

## Permission-efficient execution

Keep ordinary reads, repository edits, and validations inside the workspace sandbox. For operations
already known to require network or protected metadata access—dependency installation, verified tool
downloads, Git index/commit/push operations, and GUI/browser launches—request the narrowest appropriate
escalation on the first attempt. If an otherwise routine command fails with `EACCES`, `EPERM`, registry
access, or protected-path errors, classify it as an environment restriction and retry once with a
scoped escalation instead of repeating the same sandboxed command.

Never use `danger-full-access` as the project default. Prefer project-local portable tools, verify
download checksums when available, and keep them under ignored `work/tools/` rather than installing
globally.

For a new Codex managed worktree, run the tracked platform bootstrap before repository commands:
`& .\scripts\bootstrap-worktree.ps1` on Windows or `. ./scripts/bootstrap-worktree.sh` on macOS/POSIX.
The bootstrap verifies Node/pnpm versions, installs with `pnpm install --frozen-lockfile`, and checks a
root static tool. GitHub CLI remains a host prerequisite and must not be copied through
`.worktreeinclude`; see `docs/LOCAL_ENVIRONMENT.md`.

## User-facing language

Write user-facing commentary, progress and error reports, command/test summaries, and final reports in
Vietnamese. Keep commands, paths, identifiers, and necessary technical error excerpts in code formatting;
do not translate source code or API contracts, or lengthen logs only for translation.

## Architecture and contracts

- Keep DataHub-specific types inside `packages/datahub-client`.
- Validate API and model output using schemas from `packages/shared-types`.
- Every root-cause hypothesis cites evidence IDs.
- Distinguish facts, inferences, missing information, assumptions, and recommendations.
- Never invent DataHub entities.
- Enforce limits for lineage depth, entity count, tool calls, retries, duration, and output size.

## Documentation memory

Maintain all files listed in `docs/REPOSITORY_MAP.md`. Add an ADR only for material product or
architecture decisions. Session entries use:

```md
## YYYY-MM-DD — Session title

### Objective

### Completed

### Files changed

### Decisions

### Validation performed

### Validation intentionally deferred

### Known issues

### Exact next step
```

## Git and GitHub

Use phase or substantial-slice branches and conventional commits. Before committing: inspect status
and diff, verify no secrets or generated junk, confirm documentation, and run the required validation.
Never force-push or rewrite public history without explicit instruction. Merge only after acceptance
criteria and CI pass.

## Secrets and external tools

Never commit API keys, tokens, cookies, credentials, or `.env` files. A credential posted in chat is
compromised and must be rotated; do not copy it into commands, logs, or configuration. Track only
environment-variable references.

Stitch MCP is optional design support. Use it for composed frontend screens, layout exploration, and
design alternatives when available. Do not let it replace accessible, repo-native React/CSS output or
block a slice. See `docs/FRONTEND_WORKFLOW.md`.

## Two-machine coordination

The integration owner exclusively controls root tooling, lockfiles, shared contracts, canonical plans,
and the canonical session log unless a pull request explicitly transfers ownership. Parallel work must
use separate branches, separate slices, and non-overlapping file ownership. GitHub issues and pull
requests are the coordination plane; chat context is not shared state.

Preserve Codex Project history: never archive, delete, or hide an existing task/conversation unless the
user explicitly requests it. Do not pin a Project task when pinning would move it outside its Project
group. Create every new implementation task with `target.type=project`,
`projectId=a43a7aaa-fc63-48e9-867e-c9d9cae6784d`, and the appropriate `local` or `worktree`
environment; never create implementation work as a projectless task.

## Scope priority

1. working end-to-end demo;
2. evidence correctness;
3. deterministic fixture mode;
4. clear UX;
5. reliable setup and tests;
6. documentation and deployment;
7. optional polish.

MVP non-goals: enterprise authentication, billing, multi-tenancy, mobile apps, multiple LLM providers,
microservices, real-time collaboration, generic workflow builders, plugin marketplaces, and automatic
modification of production pipelines.

Stop for input only for unavailable credentials, irreversible destructive operations, external account
permissions, or product decisions with major scope consequences. Otherwise use reasonable defaults,
record the decision, and continue.
