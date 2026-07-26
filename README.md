# Data Incident Investigator

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Data Incident Investigator is an AI-assisted workflow for answering questions such as “Why did
revenue drop today?” with metadata, lineage, recent-change evidence, ranked root-cause hypotheses,
and recommended actions.

The project is built as vertical slices. A deterministic fixture mode supports credential-free local
use and repeatable demos. The same internal metadata adapter contract now has direct DataHub GraphQL
and bounded DataHub MCP Server provider modes.

## Current status

The fixture workflow runs end to end from guided incident intake to a
schema-validated report with evidence-linked hypotheses, confidence factors, remediation guidance,
bounded blast radius, an observable activity trail, and a sanitized Markdown download. DataHub-backed
metadata retrieval is available through the existing direct GraphQL path or an explicit DataHub MCP
Server path. The MCP protocol fixture and product vertical slice are validated locally; a live
credentialed DataHub MCP smoke remains blocked until an authorized service is available.

The source is licensed under Apache-2.0 on `main`, and the
[GitHub repository](https://github.com/toannnnq1424/data-incident-investigator) is Public and readable
without project credentials. Draft PR #53 contains the post-transition evidence packet and remains
unmerged pending independent QA2.

## Stack

- TypeScript monorepo managed with pnpm workspaces
- React and Vite for `apps/web`
- Fastify for `apps/api`
- Zod contracts in `packages/shared-types`
- Official MCP TypeScript SDK v1 for the bounded DataHub MCP Server client
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

## Release artifact and deployment

From a clean exact commit, `pnpm release:artifact` performs one pinned release build and creates a
version-and-commit-named deterministic archive plus SHA-256 sidecar under ignored
`outputs/release/`. Verify it with `pnpm release:verify -- --artifact <archive>` and the separately
approved full commit/version before extraction.

The release builder now derives the exact packages with positive rendered contributions to the Vite
JavaScript output, binds their package/module/legal-file provenance into `RELEASE-MANIFEST.json`, and
includes a deterministic `THIRD_PARTY_NOTICES.txt` that the standalone verifier enforces. This closes
the technical bundled-output inventory gap; it is evidence, not legal advice. Publication,
attachment, or distribution remains unauthorized pending independent QA and the recorded C11
legal-owner disposition.

The supported deployment boundary is a generic Node 24 host with a static web host and same-origin
`/api` reverse proxy. No Docker/cloud/public deployment is currently claimed. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the artifact contents and host procedure and
[`docs/ROLLBACK.md`](docs/ROLLBACK.md) for immutable prior-artifact selection, state caveats, and abort
conditions.

## Runtime modes

- `APP_MODE=fixture`: deterministic local/demo mode with no DataHub or model credentials.
- `APP_MODE=datahub`: real metadata mode using `DATAHUB_GMS_URL` and `DATAHUB_TOKEN`; live validation
  requires an authorized DataHub instance.
- `APP_MODE=datahub-mcp`: DataHub MCP Server over an operator-provided Streamable HTTP endpoint in
  `DATAHUB_MCP_URL`. Set `DATAHUB_MCP_AUTH_MODE=none` only for a trusted local server, or `bearer`
  with `DATAHUB_TOKEN` for an authorized HTTPS endpoint. Startup rejects bearer-over-HTTP and every
  other missing/invalid MCP setting, and never falls back to fixtures.

The fixture-mode investigation path and its algorithms given fixed inputs are deterministic. Live
DataHub inputs and provider state can vary. Given a fixed request and fixed provider responses, all
three modes use deterministic code-owned orchestration and ordering. They make zero model calls, so
`OPENAI_API_KEY` is not required.

The MCP provider discovers and calls only the official read-only `search` and `get_lineage` tools.
The current official server exposes no recent-changes/timeline tool, so reports identify that
capability as unsupported and do not infer change evidence. The application never starts the
open-source Python server itself: an operator may run it separately with `--transport http`, or use
the managed Cloud Streamable HTTP endpoint. The client bounds the actual JSON/SSE network body while
it is read and validates the parsed object again before adapter use. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for exact configuration, bounds,
supported/unsupported capabilities, and live-smoke prerequisites.

Run the credential-free MCP protocol/product slice and local Streamable HTTP
body-bound/cancellation regressions:

```bash
pnpm exec vitest run tests/integration/datahub-mcp.test.ts tests/integration/datahub-mcp-http.test.ts
```

The optional Stitch MCP configuration is stored without credentials in `.codex/config.toml`. Set
`STITCH_API_KEY` in the local Codex process environment when using Stitch during frontend design.

## Project memory

Before work, read `CODEX.md`, `docs/PRODUCT_SPEC.md`, `docs/REPOSITORY_MAP.md`,
`docs/IMPLEMENTATION_PLAN.md`, and the latest `docs/SESSION_LOG.md` entry. See
`docs/FRONTEND_WORKFLOW.md` for the Stitch-assisted design workflow.

## Repository

GitHub: https://github.com/toannnnq1424/data-incident-investigator

Licensed under the [Apache License 2.0](LICENSE).
