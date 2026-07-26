# Devpost submission draft

> Draft copy only. Nothing in this file has been entered, saved, uploaded, or submitted on Devpost.

## Title

Data Incident Investigator

## One-line description

An evidence-first data incident agent that traces metadata changes through lineage and turns them into
an auditable report with transparent confidence, blast radius, and safe human next steps.

## Project links

- Public demo:
  <https://data-incident-investigator-1071683558688.asia-southeast1.run.app>
- Public Apache-2.0 repository:
  <https://github.com/toannnnq1424/data-incident-investigator>
- Judge instructions: [`JUDGE_QUICKSTART.md`](JUDGE_QUICKSTART.md)
- Screenshot gallery: [`demo-assets/README.md`](demo-assets/README.md)

The Public repository quickstart is the fallback if the Cloud Run fixture service is cold or
unavailable.

## Inspiration

Data teams rarely lack evidence during an incident. The problem is that schema changes, lineage,
catalog metadata, dashboard dependencies, and ownership are spread across tools. Investigators spend
critical time assembling those facts, and an explanation is hard to trust when its supporting
evidence is not visible.

## What it does

Data Incident Investigator accepts a focused incident question, retrieves bounded metadata and
lineage, gathers supported recent-change facts, and produces a structured report. The report:

- separates retrieved facts from plausible-contributor inferences;
- ranks hypotheses only when their evidence IDs resolve;
- shows the exact code-owned confidence factors and penalties;
- traces supported downstream datasets, pipelines, and dashboards within explicit bounds;
- proposes verification and reversible remediation steps for human review, all marked
  `not_executed`;
- exposes an observable activity trail without hidden chain-of-thought; and
- exports the terminal result as deterministic, sanitized Markdown.

In the canonical **Removed schema column** fixture, the strongest inference is that removal of
`gross_revenue` from upstream `raw.orders` may have contributed to a revenue incident. It scores
`81% · high` from visible deterministic factors and identifies `analytics.daily_revenue` plus the
**Revenue overview** dashboard as bounded downstream impacts. This is evidence-backed triage, not a
confirmed-cause or zero-risk claim.

## How we built it

The project is a TypeScript pnpm monorepo:

- React 19 and Vite 7 provide the judge-facing UI.
- Fastify 5 serves the API and the built web app from one same-origin Node.js 24 service.
- Zod 4 schemas validate incident, provider, execution, confidence, blast-radius, and export
  contracts.
- A provider-neutral `MetadataAdapter` supports deterministic fixtures, direct DataHub GraphQL, and
  a bounded DataHub MCP Server path.
- The MCP path uses the official MCP TypeScript SDK v1, accepts an operator-provided Streamable HTTP
  endpoint, discovers only read-only `search` and `get_lineage`, and enforces time, byte, entity, and
  lineage limits.
- Deterministic TypeScript orchestration owns ranking and report composition. The current
  investigation makes zero model calls.
- Vitest, browser regression, TypeScript, ESLint, Prettier, artifact/runtime attribution contracts,
  and GitHub Actions provide validation.
- The public credential-free fixture is deployed on Google Cloud Run with synthetic, process-local
  data.

## Data

The public demonstration uses only the checked-in synthetic **Removed schema column** fixture. It
contains fictional Snowflake-style dataset URNs, a Looker-style dashboard URN, lineage, and a planted
schema removal. It contains no customer data, private catalog, production logs, or credentials.

Live DataHub inputs and provider state can vary. The public service does not connect to DataHub.

## DataHub usage and exact integration boundary

The repository implements a bounded `APP_MODE=datahub-mcp` integration through the official MCP SDK.
Local protocol and product vertical-slice tests prove that the application uses the MCP protocol and
calls only read-only `search` and `get_lineage`. The official server currently exposes no
recent-changes/timeline tool, so that capability is reported as unsupported rather than emulated.

An authorized live DataHub Core/Cloud MCP endpoint has not been validated for judges. The deployed
public service is credential-free fixture mode. Named-integration compliance therefore remains
**PARTIAL**; protocol fixtures are not presented as live DataHub evidence.

## Challenges we ran into

- Preserving one report contract across deterministic fixtures, direct GraphQL, and an MCP provider
  whose supported tools differ.
- Preventing metadata text from becoming instructions while retaining it as quoted evidence.
- Making confidence inspectable without exposing or claiming hidden reasoning.
- Distinguishing a complete bounded blast radius from partial, unknown, or unavailable coverage.
- Packaging a public fixture demo with exact runtime/legal provenance while keeping credentials and
  customer data out.

## Accomplishments

- One credential-free incident flow reaches a schema-validated report in a few minutes.
- Every ranked hypothesis cites evidence present in the same report.
- Confidence uses visible basis-point factors with exact provenance.
- Blast-radius impacts carry stable URNs, downstream paths, distances, and hypothesis/evidence links.
- Safe recommendations are review-only and never auto-executed.
- The Markdown export is deterministic, sanitized, and does not create a server-side report file.
- The Public repository is Apache-2.0, and the exact deployed image has bounded
  owner-authorized runtime/legal evidence. This is not blanket legal clearance.

## What we learned

An investigation agent is more useful when uncertainty is a first-class output. “Unknown” lineage
coverage, missing runtime logs, and a plausible contributor are more honest than a confident story
without evidence. We also learned that deterministic orchestration can make an agent easier to
rehearse, test, and audit even when the underlying live metadata source is variable.

## Challenge positioning recommendation

**Primary: Open / Wildcard.** The implemented product is a DataHub-based incident investigation
workflow with a bounded MCP integration, which fits the open-source wildcard without implying a
write-back action.

**Secondary only if the organizer confirms fit: Agents That Do Real Work.** The agent does real
read-only investigation work and produces a report, but it does not write results back to DataHub or
execute remediation. Do not represent that challenge as selected unless an authorized entrant
actually selects it in the form.

No Devpost challenge control has been selected.

## Current limitations and what is next

- Only **Removed schema column** has the rich checked-in fixture and canonical browser path; six other
  presets are guided inputs/evaluation cases.
- Incident state is process-local and not durable across restart or scale-to-zero.
- The public demo is fixture-only. Authorized live/judge DataHub MCP validation remains open.
- MCP recent-change evidence is unsupported by the current official tool surface.
- The agent makes zero model calls and performs no automatic production change or DataHub write-back.
- Cloud Run availability through the judging end is unresolved because the cost-control stop boundary
  precedes it; the Public repository fallback remains essential.
- Registration, entrant eligibility, ownership/rights attestations, public video, final form review,
  and submission remain undone.

Next work is operational rather than a new product claim: obtain authorized live/judge MCP evidence,
resolve judging-period access, record and rights-audit the under-three-minute English demo, complete
entrant attestations, and verify the final form before the deadline.

## Codex usage

Codex supported repository-bounded planning, implementation, focused tests, documentation memory,
Git/CI workflow, deployment evidence, and demo preparation under the tracked operating contract.
Human review remains responsible for entrant attestations, third-party rights, account actions, form
content, and final submission.
