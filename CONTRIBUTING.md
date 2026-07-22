# Contributing

## Development workflow

1. Read `CODEX.md` and the current state documents.
2. Pick one incomplete vertical slice with explicit acceptance criteria.
3. Fetch and verify current `main`, then create one scoped branch such as `codex/phase-7-1-repository-hygiene`.
4. Change only the minimum files and direct tests required by the slice.
5. Run slice-level validation, update docs, and create one conventional commit.
6. Push normally and open one Draft pull request using `.github/pull_request_template.md`; require the
   exact-head CI result before handing the slice to independent QA.

Start from the [README quick start](README.md#quick-start). The tracked platform bootstrap enforces the
repository's Node and pnpm contract and installs dependencies with the frozen lockfile.

## Issues and support

- Use the bug form for a reproducible defect, including a minimal sanitized reproduction, relevant
  environment, and validation evidence.
- Use the feature form for a bounded problem and outcome, explicit scope and non-goals, alternatives,
  and a validation proposal.
- Use the documentation/support form for an actionable setup, usage, documentation, validation, or
  contributor-workflow gap.
- Report suspected vulnerabilities privately by following [`docs/SECURITY.md`](docs/SECURITY.md).
  Never put vulnerability details in a public issue or pull request.

Search existing issues before filing. Never submit secrets, credentials, authorization headers,
private endpoints, raw provider payloads, `.env` files, or raw sensitive incident data. Prefer fixture
mode, minimal examples, and sanitized evidence.

## Commands

- `pnpm dev`: run web and API development servers.
- `pnpm format`: format the repository.
- `pnpm lint`: lint source and configuration.
- `pnpm typecheck`: type-check every workspace package.
- `pnpm test`: run tests once.
- `pnpm build`: build all buildable packages.
- `pnpm smoke`: verify required build artifacts.
- `pnpm validate`: phase/release checkpoint only.

## Commit conventions

Use `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, or `ci:`. Do not commit secrets,
generated build output, local `.env` files, or credentials copied from chats.

## Versioning and changelog

Follow [`docs/VERSIONING.md`](docs/VERSIONING.md). Record notable user, operator, security,
reliability, and documentation changes under `Unreleased` in [`CHANGELOG.md`](CHANGELOG.md). Call out
breaking changes explicitly even before `1.0.0`.

Do not change manifest versions during ordinary feature or documentation work. A scoped release task
updates the root and all six private workspace manifests together, performs the deterministic
lockfile check, finalizes the changelog with the actual cut date, and creates a tag or release only
after the required exact-commit validation succeeds.

## Pull requests

Open one Draft pull request per coherent outcome and complete `.github/pull_request_template.md` with
scope, security/redaction review, exact validation evidence, and deferred work. Keep the pull request
Draft until its exact head has a terminal-success `PR CI` / `validate` job; do not imply that deferred
or inapplicable checks passed.

## Two-machine coordination

- One machine is the integration owner for root configuration, shared contracts, lockfiles,
  `docs/IMPLEMENTATION_PLAN.md`, and `docs/SESSION_LOG.md`.
- The second machine works on an assigned branch and avoids changing integration-owned files unless
  the pull request explicitly coordinates the change.
- Use one GitHub issue per slice and one pull request per coherent outcome.
- Verify the exact base before starting. If `main` advances after publication, coordinate the additive
  integration strategy with the owner; do not rebase or force-push shared history without explicit
  authorization.
- Do not edit the same vertical slice concurrently on both machines.
- Use GitHub issues and pull requests as the coordination plane; task chat is not shared project state.
