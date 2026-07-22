# Data Incident Investigator

Data Incident Investigator is an AI-assisted workflow for answering questions such as “Why did
revenue drop today?” with metadata, lineage, recent-change evidence, ranked root-cause hypotheses,
and recommended actions.

The project is built as vertical slices. A deterministic fixture mode supports credential-free local
use and repeatable demos, while the DataHub mode implements the same internal metadata adapter contract
for health, search, lineage, and recent-change evidence.

## Current status

Phase 6 is integrated on `main`. The fixture workflow runs end to end from guided incident intake to a
schema-validated report with evidence-linked hypotheses, confidence factors, remediation guidance,
bounded blast radius, an observable activity trail, and a sanitized Markdown download. DataHub-backed
metadata retrieval is implemented; its live smoke remains credential-gated. Phase 7 repository and
release-readiness work is in progress without adding product behavior.

## Stack

- TypeScript monorepo managed with pnpm workspaces
- React and Vite for `apps/web`
- Fastify for `apps/api`
- Zod contracts in `packages/shared-types`
- Vitest, ESLint, Prettier, and TypeScript validation
- GitHub Actions on Node.js 24

## Quick start

Requirements: Node.js 24+ and pnpm 11.9.0 exactly. The tracked bootstrap verifies both versions and
performs a frozen-lockfile install.

Windows PowerShell:

```powershell
& .\scripts\bootstrap-worktree.ps1
Copy-Item .env.example .env
pnpm dev
```

macOS/POSIX shell:

```bash
. ./scripts/bootstrap-worktree.sh
cp .env.example .env
pnpm dev
```

The copied environment file selects safe fixture defaults and is ignored by Git. Fixture mode requires
no external credential. The web app uses `http://localhost:5173`; API health and readiness use
`http://localhost:3001/health` and `http://localhost:3001/ready`.

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

- `APP_MODE=fixture`: deterministic local/demo mode with no DataHub or model credentials.
- `APP_MODE=datahub`: real metadata mode using `DATAHUB_GMS_URL` and `DATAHUB_TOKEN`; live validation
  requires an authorized DataHub instance.

The current investigation path is deterministic and makes zero model calls, so `OPENAI_API_KEY` is not
required for either the fixture demo or the validated Phase 6 workflow.

The optional Stitch MCP configuration is stored without credentials in `.codex/config.toml`. Set
`STITCH_API_KEY` in the local Codex process environment when using Stitch during frontend design.

## Project memory

Before work, read `CODEX.md`, `docs/PRODUCT_SPEC.md`, `docs/REPOSITORY_MAP.md`,
`docs/IMPLEMENTATION_PLAN.md`, and the latest `docs/SESSION_LOG.md` entry. See
`docs/FRONTEND_WORKFLOW.md` for the Stitch-assisted design workflow.

## Repository

GitHub: https://github.com/toannnnq1424/data-incident-investigator

Licensed under the MIT License.
