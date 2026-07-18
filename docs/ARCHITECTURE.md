# Architecture

## System shape

The project is a TypeScript monorepo with a web app, HTTP API, investigation core, metadata adapters,
shared schemas, fixtures, and evaluation tooling.

```mermaid
flowchart LR
  U["User"] --> W["React web app"]
  W --> A["Fastify API"]
  A --> C["Agent core"]
  C --> M["MetadataAdapter"]
  M --> F["Fixture adapter"]
  M --> D["DataHub adapter"]
  C --> S["Shared Zod schemas"]
  E["Evaluation runner"] --> C
  E --> X["Incident fixtures"]
```

## Package responsibilities

- `apps/web`: incident input, progress, report, evidence, lineage, and actions.
- `apps/api`: validation, incident lifecycle, orchestration entrypoints, health, and error mapping.
- `packages/shared-types`: runtime schemas and public internal contracts.
- `packages/datahub-client`: DataHub transport and the provider-neutral metadata adapter contract.
- `packages/agent-core`: bounded investigation workflow and hypothesis/evidence assembly.
- `packages/evaluation`: deterministic cases, metrics, and report generation.

## Dependency direction

`shared-types` is dependency-free except for Zod. `datahub-client` depends on shared types. `agent-core`
depends on shared types and the metadata adapter. Apps depend inward on contracts/core; packages never
depend on apps. Evaluation depends on public internal contracts, not UI rendering.

## Runtime modes

- Fixture: seeded metadata, lineage, and changes; stable for tests and demos.
- DataHub: HTTP/GraphQL client translates DataHub responses into internal types.

Switching adapters must not change investigation business logic or API output.

At the Phase 2 checkpoint, provider switching covers metadata health, entity search, bounded lineage,
and recent-change exploration through shared API schemas. Incident submission and report generation
remain on the deterministic fixture runner; live DataHub-backed incident orchestration begins only in
Phase 3 Slice 3.1. Raw DataHub GraphQL types remain inside `packages/datahub-client` in both cases.

## Trust boundaries

User input, provider responses, and model output are untrusted. Validate at the API boundary and again
before rendering a final report. Credentials stay in process environment and provider-specific logs are
sanitized. External design tools such as Stitch assist design only and are not production dependencies.

## Deployment target

The initial deployment remains one web artifact and one stateless API process. Persistent incident
storage is deferred; MVP state may be in-memory or fixture-backed. This avoids premature service
decomposition while leaving adapter and storage seams explicit.
