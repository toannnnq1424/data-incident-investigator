# Repository map

Last verified: 2026-07-22 against the integrated Phase 7.1 tree and the Phase 7.2 PR CI layout.

## Directories

| Path                      | Responsibility                                               | Important entrypoints                                                         |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `apps/web`                | React/Vite user interface                                    | `src/App.tsx`, `src/main.tsx`, `vite.config.ts`                               |
| `apps/api`                | Fastify HTTP API                                             | `src/index.ts`                                                                |
| `packages/shared-types`   | Zod schemas and shared types                                 | `src/index.ts`                                                                |
| `packages/datahub-client` | Provider-neutral contract plus fixture and DataHub adapters  | `src/index.ts`                                                                |
| `packages/agent-core`     | Bounded deterministic investigation orchestration            | `src/index.ts`                                                                |
| `packages/evaluation`     | Canonical evaluation cases, runner, metrics, and reporters   | `src/index.ts`, `src/cli.ts`                                                  |
| `fixtures`                | Deterministic metadata, incidents, and demo data             | `metadata/removed-schema-column.json`, `incidents/removed-schema-column.json` |
| `tests/integration`       | Cross-package contract, safety, provider, and report tests   | `contracts.test.ts`, `incidents-api.test.ts`, `markdown-export.test.ts`       |
| `tests/smoke`             | Primary health and build smoke tests                         | `health.test.ts`                                                              |
| `tests/e2e`               | Browser flows                                                | `report-display.spec.mjs`                                                     |
| `scripts`                 | Repository operations, worktree bootstrap, and smoke checks  | `bootstrap-worktree.ps1`, `bootstrap-worktree.sh`, `smoke.mjs`                |
| `docs`                    | Product, architecture, plan, memory, and release docs        | see list below                                                                |
| `.github`                 | Isolated PR CI, main CI, release validation, and PR template | `workflows/pr-ci.yml`, `workflows/ci.yml`, `workflows/release.yml`            |
| `.codex`                  | Trusted project-scoped Codex settings without secrets        | `config.toml`                                                                 |

## Root configuration

- `package.json`: canonical commands, tool versions, engine, package manager, and license metadata.
- `pnpm-workspace.yaml`: workspace membership and approved dependency build scripts.
- `pnpm-lock.yaml`: reproducible dependency graph and supply-chain verification state.
- `.editorconfig`: UTF-8, LF, final-newline, indentation, and whitespace defaults.
- `.gitignore`: generated, dependency, credential, local-tool, editor, and OS output exclusions.
- `.gitattributes`: LF-normalized text files for consistent Windows/macOS collaboration.
- `tsconfig.base.json`: strict shared compiler rules.
- `eslint.config.mjs`, `.prettierrc.json`: static quality rules.
- `.env.example`: environment contract with blank credentials.
- `LICENSE` and `CONTRIBUTING.md`: MIT terms and contributor workflow.
- `CODEX.md` and `AGENTS.md`: durable agent workflow.

## Commands

| Command                                                         | Purpose                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `& .\scripts\bootstrap-worktree.ps1`                            | Verify Windows tools and perform a frozen workspace install.                |
| `. ./scripts/bootstrap-worktree.sh`                             | Verify POSIX tools and perform a frozen workspace install.                  |
| `pnpm install --frozen-lockfile`                                | Install the exact locked workspace graph when tools are already configured. |
| `pnpm dev`                                                      | Run web and API development servers.                                        |
| `pnpm format:check`                                             | Repository format check.                                                    |
| `pnpm lint`                                                     | Repository lint.                                                            |
| `pnpm typecheck`                                                | Recursive workspace type check.                                             |
| `pnpm test`                                                     | Vitest unit/integration/smoke tests.                                        |
| `pnpm test:e2e:report`                                          | Canonical fixture report browser flow.                                      |
| `pnpm --filter @dii/evaluation evaluate -- --output-dir <path>` | Write validated canonical JSON and Markdown evaluation reports after build. |
| `pnpm build`                                                    | Build packages and apps.                                                    |
| `pnpm smoke`                                                    | Verify API and web build artifacts.                                         |
| `pnpm validate`                                                 | Full Phase 0/phase/release validation.                                      |

## Shared contracts

`packages/shared-types/src/index.ts` defines incident input, accepted processing and retrieval
responses, stable API error, entity, evidence, hypothesis, and report schemas.
`packages/datahub-client/src/index.ts` defines the provider-neutral `MetadataAdapter`, its bounded
fixture implementation, and the DataHub GraphQL implementation for health, search, lineage, and recent
changes. `packages/agent-core/src/index.ts` runs deterministic evidence-linked investigations through
that adapter.

The web uses the same shared incident schemas as the API. In development, Vite proxies browser calls
from `/api/*` to the Fastify service and removes the `/api` prefix.

## Documentation index

Product and design: `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `API_CONTRACTS.md`,
`AGENT_DESIGN.md`, `FRONTEND_WORKFLOW.md`.

Execution and quality: `IMPLEMENTATION_PLAN.md`, `TEST_STRATEGY.md`, `SECURITY.md`, `DEPLOYMENT.md`,
`DECISIONS.md`, `LOCAL_ENVIRONMENT.md`, `KNOWN_ISSUES.md`, `SESSION_LOG.md`.

Submission: `DEMO_SCRIPT.md`, `DEVPOST_SUBMISSION.md`, `RELEASE_CHECKLIST.md`.

## Rescan triggers

Rescan only after a major directory move, a new architectural boundary, or evidence that this map is
incorrect. Ordinary feature work should inspect only the mapped entrypoint, its direct dependencies,
and relevant tests.
