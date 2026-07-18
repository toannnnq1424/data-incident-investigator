# Codex local environment

This repository keeps managed-worktree bootstrap logic in tracked, platform-specific scripts. It does
not commit a guessed Local Environment schema.

## Verified Codex behavior

The official Codex manual states that:

- Local Environment setup scripts run automatically when Codex creates a new worktree.
- Windows, macOS, and Linux may override the shared setup script with platform-specific scripts.
- A shared Local Environment file is generated through Codex desktop settings and belongs under the
  project-root `.codex/` directory.
- Managed worktrees start from tracked Git files. `.worktreeinclude` is only for explicitly selected
  ignored files that must be copied into a new managed worktree.

Sources: [Local environments](https://learn.chatgpt.com/docs/environments/local-environment) and
[Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees).

The currently callable Codex app tools do not expose Local Environment creation or update. The actual
project contains only `.codex/config.toml`; no app-generated Local Environment file exists to validate
or check in. Windows automation is also prohibited from controlling the ChatGPT/Codex desktop UI.
Therefore this task intentionally does not invent a filename or TOML schema.

## One-time desktop configuration

Open this repository root in Codex desktop settings, create a Local Environment, and set its
platform-specific setup commands to:

Windows PowerShell:

```powershell
& .\scripts\bootstrap-worktree.ps1
```

macOS/POSIX shell:

```bash
. ./scripts/bootstrap-worktree.sh
```

Save the environment through the desktop app. If the app offers to share the generated file, verify
that it is under this project's `.codex/` directory, contains no secret or absolute machine path, and
commit that app-generated file in a follow-up. Select this Local Environment when starting each new
managed-worktree task.

The dot-source form on macOS and normal PowerShell script invocation keep the selected runtime `PATH`
available to the setup shell while dependencies and static tools run.

## Runtime contract

- `package.json` requires Node `>=24` and exact pnpm `11.9.0`.
- Bootstrap checks `CODEX_NODE_PATH`, then `PATH`, then the observed Codex bundled-runtime root under
  the current user's `.cache/codex-runtimes` directory. No username or absolute machine path is stored.
- Bootstrap checks `CODEX_PNPM_PATH`, then `PATH`, then pnpm beside the selected Codex runtime.
- Bootstrap refuses mismatched versions instead of asking Corepack to fetch missing pnpm metadata.
- Bootstrap runs `pnpm install --frozen-lockfile` before `pnpm exec`, then checks the installed root
  Prettier binary and one static formatting command.

On macOS, Node `>=24` and pnpm `11.9.0` on `PATH` are the supported host prerequisites when Codex does
not expose a compatible bundled runtime at the verified relative cache layout. The macOS bundled
runtime location has not been validated on a macOS host.

GitHub CLI is also a host prerequisite for publishing, but it is not part of worktree bootstrap.
Install the correct `gh` build on each host and verify `gh auth status`. Never copy the ignored Windows
portable binary under `work/tools/` into a managed worktree or macOS environment.

## `.worktreeinclude` decision

No ignored setup file is required: both bootstrap scripts and `.env.example` are tracked. This task
therefore leaves `.worktreeinclude` absent. Do not add `.env`, credentials, tokens, private keys, auth
state, `work/tools/`, or platform binaries to it.

## Failure diagnosis

- `node` missing during dependency lifecycle scripts: ensure the platform setup command runs the
  bootstrap script before any pnpm command.
- pnpm version mismatch or offline metadata failure: install exact pnpm `11.9.0` on the host or use the
  compatible Codex runtime; do not activate an unpinned version.
- `pnpm exec` cannot find root binaries: the frozen install did not complete. Rerun bootstrap and fix
  its first install error before invoking repository tools.
- `gh` missing or unauthenticated: fix the host prerequisite separately; do not add it to repository
  dependencies or `.worktreeinclude`.
