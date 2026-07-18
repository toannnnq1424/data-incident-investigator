# Data Incident Investigator

Data Incident Investigator is an AI-assisted workflow for answering questions such as “Why did
revenue drop today?” with metadata, lineage, recent-change evidence, ranked root-cause hypotheses,
and recommended actions.

The project is intentionally built as vertical slices. It supports a deterministic fixture mode for
reliable demos and will add a DataHub adapter behind the same internal metadata interface.

## Current status

Phase 0 establishes the monorepo, contracts, quality gates, documentation, and CI. The next slice is
Phase 1.1: submit an incident from the web UI, validate it in the API, and return an incident ID.

## Stack

- TypeScript monorepo managed with pnpm workspaces
- React and Vite for `apps/web`
- Fastify for `apps/api`
- Zod contracts in `packages/shared-types`
- Vitest, ESLint, Prettier, and TypeScript validation
- GitHub Actions on Node.js 24

## Quick start

Requirements: Node.js 24+ and pnpm 11.9+.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

On Windows PowerShell, replace the copy command with:

```powershell
Copy-Item .env.example .env
```

The web app uses `http://localhost:5173`; the API health endpoint uses
`http://localhost:3001/health`.

## Validation

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

Run `pnpm validate` only at a phase or release checkpoint. During a slice, use package-scoped or
targeted commands described in `docs/TEST_STRATEGY.md`.

## Runtime modes

- `APP_MODE=fixture`: deterministic local/demo mode with no DataHub credentials.
- `APP_MODE=datahub`: planned real metadata mode using `DATAHUB_GMS_URL` and `DATAHUB_TOKEN`.

The optional Stitch MCP configuration is stored without credentials in `.codex/config.toml`. Set
`STITCH_API_KEY` in the local Codex process environment when using Stitch during frontend design.

## Project memory

Before work, read `CODEX.md`, `docs/PRODUCT_SPEC.md`, `docs/REPOSITORY_MAP.md`,
`docs/IMPLEMENTATION_PLAN.md`, and the latest `docs/SESSION_LOG.md` entry. See
`docs/FRONTEND_WORKFLOW.md` for the Stitch-assisted design workflow.

## Repository

GitHub: https://github.com/toannnnq1424/data-incident-investigator

Licensed under the MIT License.
