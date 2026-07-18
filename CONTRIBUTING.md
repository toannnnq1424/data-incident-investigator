# Contributing

## Development workflow

1. Read `CODEX.md` and the current state documents.
2. Pick one incomplete vertical slice with explicit acceptance criteria.
3. Branch from current `main`, for example `slice/submit-incident`.
4. Change only the minimum files and direct tests required by the slice.
5. Run slice-level validation, update docs, and create one conventional commit.
6. Push and open a pull request using `.github/pull_request_template.md`.

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

## Two-machine coordination

- One machine is the integration owner for root configuration, shared contracts, lockfiles,
  `docs/IMPLEMENTATION_PLAN.md`, and `docs/SESSION_LOG.md`.
- The second machine works on an assigned branch and avoids changing integration-owned files unless
  the pull request explicitly coordinates the change.
- Use one GitHub issue per slice and one pull request per coherent outcome.
- Rebase on current `main` before starting and immediately before final validation.
- Do not edit the same vertical slice concurrently on both machines.

Recommended lanes after the Phase 1 contracts are stable:

- Integration/Windows: API, agent core, metadata adapters, shared contracts, CI.
- Mac: web experience, fixture scenarios, evaluation cases, and visual QA.
