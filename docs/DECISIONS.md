# Architecture decision records

## ADR-001 — TypeScript pnpm monorepo

- Status: Accepted
- Context: The product needs a web app, API, reusable contracts, adapters, agent core, and evaluation
  without microservice overhead.
- Decision: Use pnpm workspaces, TypeScript, React/Vite, Fastify, Zod, and Vitest on Node.js 24.
- Alternatives considered: Separate repositories; Next.js full stack; Python API plus JavaScript UI.
- Consequences: One language and lockfile simplify a hackathon; workspace boundaries still require
  disciplined dependency direction.

## ADR-002 — Stable metadata adapter boundary

- Status: Accepted
- Context: The demo must work without DataHub while production evidence comes from DataHub.
- Decision: Agent logic depends on `MetadataAdapter`; fixture and DataHub implementations satisfy it.
- Alternatives considered: Direct DataHub calls inside agent steps; fixture-only mock routes.
- Consequences: Adapter contract tests become essential, but business logic remains provider-neutral.

## ADR-003 — Evidence-linked structured reports

- Status: Accepted
- Context: Plausible prose without support is not a useful incident investigation.
- Decision: Validate reports with Zod and require every hypothesis to cite evidence IDs.
- Alternatives considered: Unstructured model text; confidence chosen only by the model.
- Consequences: Rendering and evaluation are deterministic; reasoning must map all claims to evidence.

## ADR-004 — Optional Stitch design MCP with environment-sourced credential

- Status: Accepted
- Context: Stitch may accelerate composed frontend design, but credentials and external availability
  must not affect the deterministic demo.
- Decision: Track the MCP endpoint in `.codex/config.toml`, source `X-Goog-Api-Key` from
  `STITCH_API_KEY`, and keep Stitch outside runtime dependencies.
- Alternatives considered: Static key in project config; no design MCP; make Stitch mandatory.
- Consequences: Each developer configures one local environment variable and can continue when Stitch
  is unavailable.

## ADR-005 — Workspace sandbox with scoped automatic escalation

- Status: Accepted
- Context: Windows sandboxing blocked registry access, local dependency executables, and Git metadata
  writes even though the targets were in the project. Repeating the same restricted command wastes
  time without improving safety.
- Decision: Keep `workspace-write`, allow outbound network in that sandbox, use interactive
  `on-request` approvals with automatic review, and request scoped escalation immediately for known
  protected operations. Portable tools belong under ignored `work/tools/` and downloads are verified.
- Alternatives considered: `never` approvals, global tool installation, and `danger-full-access`.
- Consequences: Routine work remains contained; network-dependent and Git operations require fewer
  failed attempts; destructive or broad actions remain subject to their normal safeguards.
