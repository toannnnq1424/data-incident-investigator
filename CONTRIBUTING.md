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
- Verify the exact base before starting. If `main` advances after publication, coordinate the additive
  integration strategy with the owner; do not rebase or force-push shared history without explicit
  authorization.
- Do not edit the same vertical slice concurrently on both machines.
- Use GitHub issues and pull requests as the coordination plane; task chat is not shared project state.
