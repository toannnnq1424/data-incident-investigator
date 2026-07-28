# Devpost submission record

> Devpost project `1117401` was submitted by the entrant after registration and individual
> **Join Hackathon**. The signed-in finalization screen reports **Project submitted!**,
> **Submitted**, and **5/5**. Verified English copy, links, media, and judge fields from this packet
> are in the submitted entry. This is submission evidence, not organizer acceptance, eligibility
> approval, or a prize result.

> **Phase 8.12 preparation:** a new 2:48.91 deployed-UI candidate, captions/transcript, and five
> replacement PNGs are locally ready for QA, but the current YouTube URL and submitted Devpost entry
> remain unchanged. Apply only the exact post-QA field diff in
> [`PHASE_8_12_SUBMISSION_SYNC.md`](PHASE_8_12_SUBMISSION_SYNC.md).

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
- Published `v1.0.0` release:
  <https://github.com/toannnnq1424/data-incident-investigator/releases/tag/v1.0.0>
- Proposed `v1.0.1`: preparation candidate only; tag/Release target is the future approved normal
  merge, not the feature head.
- Judge instructions: [`JUDGE_QUICKSTART.md`](JUDGE_QUICKSTART.md)
- Screenshot gallery: [`demo-assets/README.md`](demo-assets/README.md)
- Public 2:50 functioning demo: <https://youtu.be/D5mvMqrhyDc>
- Public submitted Devpost project:
  <https://devpost.com/software/data-incident-investigator>
- Repository silent/voiced video candidates and review packet:
  [`demo-video/README.md`](demo-video/README.md)

The Public repository quickstart is the fallback if the Cloud Run fixture service is cold or
unavailable. The exact authentic 2:50.20 silent source is public on merged `main`; a separate Phase
8.9A derivative stream-copies the same real video and adds synchronized Microsoft Mark synthetic
male English narration plus matching captions/transcript. The voiced derivative is now Public on
YouTube under **Data Incident Investigator — 2:50 Functioning Demo (Synthetic Fixture)** with the
authored English WebVTT published. The exact YouTube URL is included in submitted project `1117401`.
The signed-in UI reports submission; no organizer acceptance or prize result is claimed.

## Submitted Devpost state

The field-level draft evidence below was observed and saved through the signed-in Devpost account at
**2026-07-28 17:18 ICT (UTC+07:00) / 2026-07-28 10:18 UTC**. Later on 2026-07-28, the entrant
personally completed the final agreement/submission action; the post-action signed-in state showed:

- Exactly one project exists: numeric ID `1117401`, slug
  `1117401-data-incident-investigator`, title **Data Incident Investigator**, status
  **Submitted**, and progress **5/5**.
- The finalization banner says **Project submitted!** and the project remains editable until
  **2026-08-10 17:00 EDT**. This edit window is not organizer acceptance and does not authorize
  post-deadline material changes.
- **Project overview:** the title and one-line description above are saved. The completed
  report/export PNG is uploaded as the project thumbnail.
- **Project details:** the 4,898-character English story below is saved without the Devpost template
  prefix. Built With records TypeScript, React, Vitest, DataHub, and Node.js. The Public app and
  repository URLs plus the exact Public YouTube URL are saved. Five authentic 1440 × 900 fixture PNGs
  are uploaded with English captions aligned to intake, completion/export, confidence, blast radius,
  and evidence/lineage.
- **Additional info:** **Open / Wildcard** is selected; DataHub OSS / Core Platform and DataHub MCP
  Server are selected; the Public repository, app, and repository demo-assets folder are linked;
  residence is `Vietnam` as supplied by the entrant; and the saved new-project selection says
  **Yes, newly created during the Submission Period**. The optional Feedback Prize selection is
  `Yes`, with four complete English answers about the useful MCP surface, the absent recent-changes
  tool, a proposed typed bounded recent-changes capability, and the absence of a confirmed
  reproducible DataHub bug.
- **Solo contribution:** the preview records that the solo entrant directed the project and used
  Codex as an AI coding assistant across design, implementation, validation, documentation,
  deployment, and rehearsal.
- **Submitted project:** the project page renders the Public YouTube embed, all five captioned PNGs,
  the clean English story, Built With tags, and both Try it out links.
- **Final gate:** the entrant personally operated the Rules/Terms agreement and **Submit project**
  controls. Repository evidence records the resulting submitted UI state but does not self-certify
  the underlying eligibility, ownership, or media-rights facts.

Phase 8.12 later created exactly one additional synthetic Public fixture incident for the new
deployed-UI recording. It created no credential, account token, private endpoint, customer data,
organizer acceptance, or prize result; the resulting candidate has not been uploaded or entered in
Devpost.

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
- The repository review derivative uses the installed Microsoft Mark English synthetic male voice
  offline; it requires no speech account, API key, network call, or paid service and does not change
  the authentic video frames.
- The Phase 8.12 replacement candidate uses installed Microsoft David Desktop offline and shows the
  deployed seven-playbook/evidence-path UI. Its authentic frames were re-encoded with Opus; nine
  source/final comparisons measure PSNR `44.68–52.92 dB` with no inserted/generated scene.
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
Protocol and product vertical-slice tests prove that the application uses the MCP protocol and calls
only read-only `search` and `get_lineage`. On 2026-07-28, a localhost-only real integration also
passed against DataHub Core `1.6.0`, the official synthetic ecommerce data pack, and official
`mcp-server-datahub` `0.6.0`, with mutation, user, and data-quality tools disabled. Application
readiness, metadata search, bounded lineage, explicit unsupported recent-change behavior, and one
bounded degraded incident all behaved as designed. The incident stopped at incomplete evidence
rather than inventing a root cause. The official server currently exposes no recent-changes/timeline
tool, so that capability remains unsupported rather than emulated.

This technical proof is **PASS — LOCAL OSS**. The entrant reports that a DataHub hackathon
representative clarified that entrants are meant to use DataHub OSS locally and answered **yes** when
asked whether the Public credential-free fixture plus reproducible local OSS/MCP path satisfies the
access and integration expectation without remote DataHub/MCP hosting. No remote service is therefore
presented as required. The deployed public service remains credential-free fixture mode, and the local
OSS proof is not presented as public live DataHub evidence. This is general organizer guidance, not
acceptance of this submission or a judging result.

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

The entrant's Join registration and the saved project-form category both record
**Open / Wildcard**. No form selection was made for **Agents That Do Real Work**.

## Current limitations and what is next

- Only **Removed schema column** has the rich checked-in fixture and canonical browser path; six other
  presets are guided inputs/evaluation cases.
- Incident state is process-local and not durable across restart or scale-to-zero.
- The public demo is fixture-only. Real localhost DataHub OSS/MCP validation is complete; remote
  DataHub/MCP hosting is not part of the organizer-confirmed local OSS access path.
- MCP recent-change evidence is unsupported by the current official tool surface.
- The agent makes zero model calls and performs no automatic production change or DataHub write-back.
- The owner-authorized Cloud Run operating window runs through 2026-09-17 23:59 ICT, beyond the
  judging end. The Public repository fallback remains essential for provider outages, cold starts,
  or emergency containment.
- One authentic 2:50.20 app-only video source now exists in both silent and synchronized English
  male-voice repository variants. The voiced derivative changes no video packet/frame, uses only an
  offline installed Windows AI voice, and is Public on YouTube with authored English captions. Its
  exact URL is saved and embedded in the signed-in Devpost draft preview.
- Devpost registration, individual Join, and the entrant-operated final submission are complete for
  project `1117401`; the signed-in finalization screen reports **Project submitted!**,
  **Submitted**, and **5/5**. Repository evidence does not independently establish the entrant's
  eligibility, ownership, contributor, or media-rights facts, and submission does not imply organizer
  acceptance or a prize result.

Next work is operational rather than a new product claim: keep the Public app/video/repository
available, monitor the registered contact through judging, preserve the submitted content, and
respond to any organizer reproduction or verification request with the fixture quickstart and local
OSS/MCP evidence. Do not infer organizer acceptance or a prize.

## Codex usage

Codex supported repository-bounded planning, implementation, focused tests, documentation memory,
Git/CI workflow, deployment evidence, and demo preparation under the tracked operating contract.
The entrant remains responsible for eligibility and rights attestations, account actions, submitted
form content, organizer correspondence, and any permitted pre-deadline correction.
