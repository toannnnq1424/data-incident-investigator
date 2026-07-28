# Repository map

Last verified: 2026-07-29 for exact `origin/main`
`0ac3b8180cebdccd8c4b914443ebafa6831a112d` (tree
`d4c621e981bf11e97513bbc49de3eb589eca33b3`; ordered parents
`813621802628b94580c7fb69043e2369760cea3d` then
`bf0922e952e3d83a71034c96c46d77aefd6ecdea`). PR #62 normal-merged and exact-main CI run
`30390755820`, job `90381434069`, is successful. Annotated tag object
`eb26bc54fccd4cc0ebeacfb14539008a03da687a` (`v1.0.0`) remains on the earlier exact merge
`a28e21c06ad623f1547c02a6d65fd900fa8472a4`; its matching GitHub Release remains
Published/Latest. Phase 8.9A retains the authentic
silent WebM/caption/transcript packet plus a separate exact-video-stream synthetic male-voice
derivative with matching captions/transcript. These are Public GitHub repository assets on merged
`main`; the male-voice derivative is also Public at <https://youtu.be/D5mvMqrhyDc> with its authored
English captions. Devpost registration, individual Join, and the entrant-operated final action are
complete for project `1117401`; the signed-in finalization screen reports **Project submitted!**,
**Submitted**, and **5/5**. The submitted entry contains the verified Public
video/app/repository links, English copy, five captioned fixture screenshots, a thumbnail,
**Open / Wildcard**, and judge information. This is submission evidence, not organizer acceptance,
eligibility approval, prize status, or an independent ownership/rights attestation; exact gate state
is tracked in the submission documents.
Phase 8.10 aligned the root and six private Apache-2.0 manifests to `1.0.0`, updated the MCP client
protocol identity to the same version, and applied only the two transitive denial-of-service patches
required by the final production audit. It changed no investigation behavior, workflow, fixture,
media, deployment, or submission state.
Merged Phase 8.11 keeps the same API/contracts and makes the existing seven
canonical scenarios visible as incident playbooks. `apps/web/src/App.tsx` also renders a
validated-response-only verdict dashboard and evidence path (incident → selected entity → factual
evidence → top hypothesis → supported/explicitly unverified impact). These are presentation
components, not a workflow builder, write-back system, or new provider claim. The targeted
runtime-attribution convergence correction merged through PR #62. Cloud Build
`554516c8-da9d-4cc2-b55b-4d1bbf38b84e` deployed exact current source as revision
`data-incident-investigator-src-0ac3b8180ceb`, immutable image digest
`sha256:0ea3381f635a97812181f14448df9c7939f7c02d2a824724403e3b8a0d087286`, with 100% traffic and
`APP_MODE=fixture`.

Phase 8.12 prepares a separate 2:48.91 deployed-UI WebM with offline Microsoft David narration,
matching English WebVTT/transcript, and five app-only 1440 × 900 replacement screenshots. These are
repository QA assets only until later authorization: the existing YouTube video and submitted
Devpost media remain authoritative. Root plus six private manifests are prepared at `1.0.1`; no
`v1.0.1` tag or GitHub Release exists in this slice.

## Directories

| Path                      | Responsibility                                                              | Important entrypoints                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                | React/Vite intake, visible playbooks, evidence-first report UI              | `src/App.tsx`, `src/styles.css`, `src/main.tsx`, `vite.config.ts`                                                                                                                 |
| `apps/api`                | Fastify HTTP API                                                            | `src/index.ts`                                                                                                                                                                    |
| `packages/shared-types`   | Zod schemas and shared types                                                | `src/index.ts`                                                                                                                                                                    |
| `packages/datahub-client` | Provider-neutral contract plus fixture, GraphQL, and MCP adapters           | `src/index.ts`, `src/datahub-mcp.ts`                                                                                                                                              |
| `packages/agent-core`     | Bounded deterministic investigation orchestration                           | `src/index.ts`                                                                                                                                                                    |
| `packages/evaluation`     | Canonical evaluation cases, runner, metrics, and reporters                  | `src/index.ts`, `src/cli.ts`                                                                                                                                                      |
| `fixtures`                | Deterministic metadata, incidents, and demo data                            | `metadata/removed-schema-column.json`, `incidents/removed-schema-column.json`                                                                                                     |
| `tests/integration`       | Cross-package contract, safety, provider, report, and production-host tests | `contracts.test.ts`, `incidents-api.test.ts`, `markdown-export.test.ts`, `production-host.test.ts`                                                                                |
| `tests/smoke`             | Primary health and build smoke tests                                        | `health.test.ts`                                                                                                                                                                  |
| `tests/e2e`               | Browser flows                                                               | `report-display.spec.mjs`                                                                                                                                                         |
| `scripts`                 | Bootstrap, smoke, and deterministic release-artifact operations             | `bootstrap-worktree.ps1`, `smoke.mjs`, `release-path-safety.mjs`, `pnpm-lock-identity.mjs`, `bundle-attribution.mjs`, `build-release-artifact.mjs`, `verify-release-artifact.mjs` |
| `docs`                    | Product, architecture, plan, memory, release, and judge-package docs        | `JUDGE_QUICKSTART.md`, `CLAIM_TO_DEMO_MATRIX.md`, `DEMO_SCRIPT.md`, `demo-assets/`, `demo-video/`, plus the index below                                                           |
| `.github`                 | Collaboration intake plus scoped repository validation                      | `ISSUE_TEMPLATE/`, `pull_request_template.md`, `workflows/`                                                                                                                       |
| `.codex`                  | Trusted project-scoped Codex settings without secrets                       | `config.toml`                                                                                                                                                                     |

Phase 8.7 added `scripts/runtime-attribution.mjs` and `scripts/prepare-runtime-manifests.mjs` for the
container-only production/legal boundary. The current Cloud Run image is independently bound to
exact source `0ac3b8180cebdccd8c4b914443ebafa6831a112d` after the Phase 8.11 convergence correction.

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
- `Dockerfile`, `.dockerignore`: immutable-base, production-only source-build container contract and
  upload exclusions for the fixture-only same-origin Cloud Run service.
- `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.txt`, `RUNTIME-ATTRIBUTION.json`, and
  `third_party_licenses/`: canonical Apache terms plus exact deterministic runtime legal/provenance
  evidence.
- `CONTRIBUTING.md`: contributor workflow.
- `CHANGELOG.md`: curated unreleased and released product changes under the coordinated SemVer policy.
- `CODEX.md` and `AGENTS.md`: durable agent workflow.

## GitHub collaboration and validation

- `.github/pull_request_template.md`: scoped change summary, security/redaction review, exact
  validation evidence, deferred work, and exact-head `PR CI` handoff.
- `.github/ISSUE_TEMPLATE/`: actionable bug, feature, and documentation/support forms. Blank issues
  are disabled; GitHub's detected repository security-policy route remains available for private
  vulnerability-reporting instructions.

- `.github/workflows/pr-ci.yml`: read-only validation of the exact pull-request head; owned by Slice
  7.2 and unchanged by Slice 7.3.
- `.github/workflows/ci.yml`: push-to-`main` validation of the exact event SHA with a frozen install,
  root-lockfile pnpm cache, fixed toolchain/runner, and no persisted checkout credential.
- `.github/workflows/release.yml`: read-only `workflow_dispatch` validation from the current `main`
  workflow. A blank input selects that main SHA; otherwise the operator must provide an exact
  40-character commit SHA. It reports and verifies the resolved commit and has no upload, publish,
  release, tag, deploy, or repository-mutation step.

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
| `pnpm test:release-artifact`                                    | Focused Node contracts for release cleanup, attribution, and verification.  |
| `pnpm test:runtime-attribution`                                 | Focused runtime closure, notices, and production-manifest contracts.        |
| `pnpm --filter @dii/evaluation evaluate -- --output-dir <path>` | Write validated canonical JSON and Markdown evaluation reports after build. |
| `pnpm build`                                                    | Build packages and apps.                                                    |
| `pnpm release:artifact`                                         | Build once and create the deterministic clean-commit host artifact.         |
| `pnpm release:verify -- --artifact <path>`                      | Verify artifact sidecar, provenance, archive safety, and exact contents.    |
| `pnpm smoke`                                                    | Verify API and web build artifacts.                                         |
| `pnpm validate`                                                 | Full validation, including both direct Node artifact contracts.             |

## Shared contracts

`packages/shared-types/src/index.ts` defines incident input, accepted processing and retrieval
responses, stable API error, entity, evidence, hypothesis, and report schemas.
`packages/datahub-client/src/index.ts` defines the provider-neutral `MetadataAdapter`, its bounded
fixture implementation, and the DataHub GraphQL implementation for health, search, lineage, and recent
changes. `packages/datahub-client/src/datahub-mcp.ts` adds the explicit Streamable HTTP DataHub MCP
Server provider: fixed read-only `search`/`get_lineage`, strict protocol/metadata contracts, bounded
timeouts/bytes/entities/lineage, the official bounded string-or-descriptor lineage platform shape,
and an explicit unsupported recent-changes capability.
`packages/agent-core/src/index.ts` runs deterministic evidence-linked investigations through the
selected adapter without a model call.

Development and tests intentionally resolve those workspace exports to source. Before building, the
release builder preflights and removes only the five exact artifact-consumed output roots, rejecting
links/reparse targets and noncanonical or out-of-repository resolution before any deletion. It keeps
the repository manifests unchanged but packages each runtime workspace's compiled `dist` modules and
declarations, with `dist/index.js`/`dist/index.d.ts` as its archived export, and deterministically
rewrites only its archived manifest copy to those export targets. The standalone verifier requires
that artifact-only boundary.

The web uses the same shared incident schemas as the API. In development, Vite proxies browser calls
from `/api/*` to the Fastify service and removes the `/api` prefix. In production, Fastify serves the
built Vite assets, rewrites same-origin `/api/*` to the existing API routes, and listens on Cloud
Run's `PORT`/`0.0.0.0` contract while preserving the previous local default when `PORT` is absent.

For release builds only, `apps/web/vite.config.ts` enables `scripts/bundle-attribution.mjs` when the
builder supplies its private output path. The plugin records exact Rollup rendered-module lengths;
the builder maps positive third-party contributions to exact pnpm lock snapshots and canonical
virtual-store roots plus upstream legal files, emits deterministic `THIRD_PARTY_NOTICES.txt`, and
binds the evidence into release-manifest schema v3. Builder and verifier share one Windows-safe path
validator, while the verifier independently reconstructs every attributed identity from the archived
lockfile. Ordinary development and non-release Vite builds emit no provenance file.

The Cloud Run Docker build uses the same rendered-module evidence and frozen-lock identity helpers,
then records the exact full-production and deployed external runtime closures in
`RUNTIME-ATTRIBUTION.json`. `runtime-attribution.mjs` generates/enforces the paired
`THIRD_PARTY_NOTICES.txt`, the complete compiled-output file set, required legal-file content, and
rewritten runtime workspace manifests. Its shared containment routine rejects links/reparse targets,
noncanonical or cross-root reads, unexpected files, missing files, and content tamper. The
targeted generator correction writes the derived notice first, rebuilds and verifies the
notice-bound manifest, asserts convergence, and restores the prior notice on failure; it does not
relax source or runtime verification. The
production-dependency stage verifies that installed runtime/legal closure before the final image
removes audit scripts and starts compiled Node output as the unprivileged `node` user.

## Documentation index

Product and design: `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `API_CONTRACTS.md`,
`AGENT_DESIGN.md`, `FRONTEND_WORKFLOW.md`.

Execution and quality: `IMPLEMENTATION_PLAN.md`, `TEST_STRATEGY.md`, `SECURITY.md`, `DEPLOYMENT.md`,
`ROLLBACK.md`, `DECISIONS.md`, `LOCAL_ENVIRONMENT.md`, `KNOWN_ISSUES.md`, `SESSION_LOG.md`,
`VERSIONING.md`.

Submission: `DEVPOST_REQUIREMENTS.md`, `DEVPOST_SUBMISSION.md`, `JUDGE_QUICKSTART.md`,
`CLAIM_TO_DEMO_MATRIX.md`, `DEMO_SCRIPT.md`, `PHASE_8_12_SUBMISSION_SYNC.md`,
`demo-assets/README.md`,
`demo-video/README.md`, `demo-video/review.html`, `demo-video/TRANSCRIPT.md`,
`demo-video/phase-8-9-demo-captions.vtt`, `demo-video/phase-8-9-demo-candidate.webm`,
`demo-video/VOICEOVER_TRANSCRIPT.md`, `demo-video/phase-8-9a-voiceover-captions.vtt`,
`demo-video/phase-8-9a-demo-voiceover.webm`, `demo-video/PHASE_8_12_TRANSCRIPT.md`,
`demo-video/phase-8-12-voiceover-captions.vtt`,
`demo-video/phase-8-12-demo-voiceover.webm`,
`PUBLIC_SOURCE_APACHE_READINESS.md`, `RELEASE_CHECKLIST.md`.

## Rescan triggers

Rescan only after a major directory move, a new architectural boundary, or evidence that this map is
incorrect. Ordinary feature work should inspect only the mapped entrypoint, its direct dependencies,
and relevant tests.
