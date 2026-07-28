# Data Incident Investigator

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**An evidence-first investigation agent for data incidents.**

When a metric changes unexpectedly, the clues are usually split across catalog metadata, lineage,
schema history, pipelines, and dashboards. Data Incident Investigator turns one incident question
into a structured report that keeps retrieved facts, evidence-linked inferences, assumptions,
missing information, blast radius, and recommended human checks separate.

[Try the public fixture demo](https://data-incident-investigator-1071683558688.asia-southeast1.run.app)
· [Judge quickstart](docs/JUDGE_QUICKSTART.md) ·
[2:50 functioning demo](https://youtu.be/D5mvMqrhyDc) ·
[Screenshot gallery](docs/demo-assets/README.md) ·
[Public repository](https://github.com/toannnnq1424/data-incident-investigator)

## See the canonical result

The public demo is credential-free and uses synthetic fixture data:

1. Wait for **Fixture metadata · Ready**.
2. Under **What changed?**, select **Removed schema column**.
3. Keep the populated synthetic fields and choose **Start investigation**.
4. After **Investigation completed**, inspect the ranked hypothesis, evidence, blast radius, and
   **Download Markdown report** link.

![Ranked evidence-linked hypothesis showing an 81% high-confidence plausible contributor and transparent score factors](docs/demo-assets/03-ranked-hypothesis-confidence.png)

The canonical result identifies the removed `gross_revenue` column on upstream `raw.orders` as a
**plausible contributor**, not a confirmed cause. Its `81% · high` confidence is the exact sum of
bounded, visible, code-owned evidence factors. The report traces two supported downstream impacts,
links every hypothesis and impact back to evidence IDs, and labels every recommendation
`not_executed`.

## How it works

1. Shared Zod contracts validate and normalize the incident intake.
2. A provider-neutral metadata adapter searches entities, expands bounded lineage, and requests
   recent metadata changes when the selected provider supports them.
3. Deterministic orchestration classifies suspicious changes and ranks evidence-linked hypotheses.
4. API-owned analysis calculates transparent confidence and a bounded downstream blast radius.
5. React renders the report, observable activity, limitations, and a sanitized deterministic Markdown
   export.

| Layer                  | Technology and responsibility                                                |
| ---------------------- | ---------------------------------------------------------------------------- |
| Judge interface        | React 19 and Vite 7                                                          |
| HTTP service           | Fastify 5 on Node.js 24                                                      |
| Contracts              | Zod 4 schemas shared by web, API, adapters, and reports                      |
| Metadata               | Fixture, direct DataHub GraphQL, or bounded DataHub MCP Server adapter       |
| Investigation          | Deterministic TypeScript orchestration; zero model calls                     |
| Quality                | Vitest, TypeScript, ESLint, Prettier, browser regression, and GitHub Actions |
| Public fixture hosting | One same-origin Google Cloud Run service with process-local synthetic data   |

Fixture mode is deterministic for fixed inputs. Live DataHub inputs and provider state can vary.

## DataHub integration: implemented, locally validated, not live in the public demo

The repository contains two DataHub-backed adapter paths:

- `APP_MODE=datahub` uses an authorized DataHub GraphQL endpoint.
- `APP_MODE=datahub-mcp` uses the official MCP TypeScript SDK over an operator-provided Streamable HTTP
  endpoint. It discovers and calls only read-only `search` and `get_lineage`, bounds time/bytes/entity
  counts, and never falls back silently to fixtures.

The bounded MCP protocol and product vertical slice pass locally. The current official MCP Server
does not expose a recent-changes tool, so that capability is reported as unsupported. No authorized
live/judge MCP endpoint has been validated, and the public Cloud Run service contains no DataHub or
model credential. Hackathon named-integration evidence therefore remains **PARTIAL**, not a live
DataHub claim.

## Local judge fallback

Requirements: Node.js 24 or newer and pnpm `11.9.0` exactly. Fixture mode requires no external
credential.

Windows PowerShell:

```powershell
git clone https://github.com/toannnnq1424/data-incident-investigator.git
Set-Location data-incident-investigator
& .\scripts\bootstrap-worktree.ps1
Copy-Item .env.example .env
pnpm dev
```

macOS/POSIX:

```bash
git clone https://github.com/toannnnq1424/data-incident-investigator.git
cd data-incident-investigator
. ./scripts/bootstrap-worktree.sh
cp .env.example .env
pnpm dev
```

Open `http://localhost:5173`, then follow the same **Removed schema column** flow. API liveness and
readiness are available at `http://localhost:3001/health` and `http://localhost:3001/ready`.

For the shortest verified path and expected labels, use the
[judge quickstart](docs/JUDGE_QUICKSTART.md).

## Truthful limitations

- The public service is credential-free **fixture mode**, not live DataHub evidence.
- Seven guided presets are visible, but only **Removed schema column** has the rich checked-in
  metadata/incident fixture and canonical browser flow.
- Incident state is process-local and disappears on restart or scale-to-zero; incident URLs are not
  durable.
- Confidence is deterministic evidence scoring, not a probability from an LLM. The current workflow
  makes zero model calls and does not read `OPENAI_API_KEY`.
- Recommendations are proposals for human review. The app does not modify DataHub, schemas,
  pipelines, dashboards, or production data.
- Blast-radius status is always bounded and explicit. `partial`, `unknown`, or `unavailable` must not
  be read as verified zero impact.
- The owner-authorized Cloud Run operating window now runs through **2026-09-17 23:59 ICT**,
  beyond the 2026-08-31 judging end. A 20%-remaining-credit signal triggers monitoring and owner
  escalation rather than an automatic pre-judging stop; emergency security or uncontrolled-billing
  response remains possible. The Public repository quickstart remains the durable fallback.
- Devpost registration and individual **Join Hackathon** are complete. Draft project `1117401` is
  saved at **4/5 steps** with **Open / Wildcard**, the Public app/repository/video links, five real
  fixture screenshots with English captions, a completed-report thumbnail, and truthful English
  project/judge copy. Its signed-in preview matches the repository evidence. The Rules/Terms
  checkbox remains unchecked and **Submit project** has not been clicked, so there is no submission,
  receipt, or organizer acceptance; repository evidence also does not independently prove the
  entrant's remaining eligibility, ownership, or rights facts.

## Validation and project documentation

Use targeted commands during a slice and `pnpm validate` only at a phase/release checkpoint:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

Architecture and contracts are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/AGENT_DESIGN.md](docs/AGENT_DESIGN.md), and
[docs/API_CONTRACTS.md](docs/API_CONTRACTS.md). Deployment/provenance and its cost boundary are in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Licensed under the [Apache License 2.0](LICENSE).
