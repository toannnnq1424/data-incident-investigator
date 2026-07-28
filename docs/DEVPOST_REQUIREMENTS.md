# Devpost requirements baseline

## Baseline and authority

This is the dated Phase 8.1 requirements baseline for **Build with DataHub: The Agent Hackathon**,
sponsored by DataHub and administered through Devpost. Research coverage completed at
**2026-07-24 00:50:45 ICT (Asia/Bangkok, UTC+07:00)** /
**2026-07-23 17:50:45 UTC**. At that checkpoint the competition was open for submissions and the
deadline was 18 days, 3 hours, 9 minutes, and 15 seconds away.

Source register:

- **O — Overview:** [official event page](https://datahub.devpost.com/), accessed
  2026-07-24 00:50 ICT / 2026-07-23 17:50 UTC.
- **D — Dates:** [official schedule](https://datahub.devpost.com/details/dates), accessed
  2026-07-24 00:50 ICT / 2026-07-23 17:50 UTC.
- **R — Rules:** [official rules](https://datahub.devpost.com/rules), accessed
  2026-07-24 00:50 ICT / 2026-07-23 17:50 UTC.
- **S — Resources:** [official resources](https://datahub.devpost.com/resources), accessed
  2026-07-24 00:50 ICT / 2026-07-23 17:50 UTC.
- **T — Terms:** [Devpost terms of service](https://info.devpost.com/legal/terms-of-service), the
  canonical target of the Terms link incorporated by Rules section 14, accessed
  2026-07-24 00:50 ICT / 2026-07-23 17:50 UTC.

Phase 8.9 re-read all five official sources read-only at **2026-07-27 03:12:26 ICT
(Asia/Bangkok, UTC+07:00)** / **2026-07-26 20:12:26 UTC**. The published deadline, judging window,
project/video/English/access/rights requirements, challenge descriptions, resource links, and
incorporated Terms boundaries had no material drift from this baseline. A changing participant count
was not persisted as a requirement. No joined form or hidden form control was inspected or inferred.

Phase 8.11 re-read the current official DataHub MCP guide, official server repository, and published
package metadata read-only at **2026-07-28 19:20 ICT / 2026-07-28 12:20 UTC**. DataHub Docs still
identify Core `1.6.0`, describe self-hosted MCP for DataHub Core, distinguish read-only and
mutation tools, and require operator-managed authentication for remotely hosted access. No
recent-change/timeline tool is listed. This technical re-read did not inspect or alter the submitted
Devpost form.

At **2026-07-28 23:15 ICT / 2026-07-28 16:15 UTC**, the current official Quickstart, Metadata Service
Authentication, Personal Access Token, and MCP pages were re-read. They confirm that Quickstart is the
local development path, self-hosted MCP supports DataHub Core, `METADATA_SERVICE_AUTH_ENABLED=true`
must be set for both GMS and the frontend before PAT use, and the self-hosted MCP process receives the
GMS URL/token through `DATAHUB_GMS_URL`/`DATAHUB_GMS_TOKEN`. Current Quickstart documents
`--quickstart-compose-file` for an operator-owned Compose file. No token was generated or read.

The entrant also reports a direct DataHub hackathon representative response: entrants are meant to
use DataHub OSS locally rather than DataHub Cloud, and the representative answered **yes** when asked
whether the Public credential-free fixture demo plus reproducible repository-local DataHub OSS/MCP
path satisfies project access and integration expectations without remote DataHub/MCP hosting. This
is treated as user-supplied general organizer guidance, not acceptance of project `1117401`, a judging
result, or an eligibility/IP determination.

The Rules control if the overview, submission form, advertising, or Terms conflict. This document uses
these labels:

- **Explicit:** the official source states the condition.
- **Inference:** a conclusion from official language or current repository evidence, not a quoted
  rule.
- **Recommendation:** a risk-reduction action, not a condition stated by the organizer.
- **Unknown:** the reviewed official pages do not resolve the point; do not guess.

## Coverage checklist

- [x] Read the complete overview: identity/status, What to Build, all four challenges, submission
      requirements, prizes, judging criteria, and organizer contact.
- [x] Read the complete schedule page and reconcile its GMT+7 display with the Rules' ET schedule.
- [x] Read Rules sections 1–15, including eligibility, entry, project/submission/testing, judging,
      intellectual property, prizes, verification, publicity, conduct, disputes, Terms, and privacy.
- [x] Read the complete Resources page: documentation, repositories, sample data, community, office
      hours, and support.
- [x] Follow the Rules' Terms link only as needed and read Terms sections 4, 5, and 7 governing
      content, hackathon participation, access/verification, and submission ownership/licences.
- [x] Record contradictions and missing form-level details as open verification questions.

## Identity, status, and exact dates

The overview identifies the online, public event as **Build with DataHub: The Agent Hackathon**,
sponsored by **DataHub**, with **$20,500 in cash prizes**. Its stated theme is building AI agents with
DataHub's open-source context platform. [[O](https://datahub.devpost.com/), accessed 2026-07-24]

| Milestone                         | Official Eastern Time                             | UTC                                           | Asia/Bangkok                                  |
| --------------------------------- | ------------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| Registration and submissions open | 2026-07-06 09:00 EDT (UTC−04:00)                  | 2026-07-06 13:00 UTC                          | 2026-07-06 20:00 ICT                          |
| Submission deadline               | **2026-08-10 17:00 EDT (UTC−04:00)**              | **2026-08-10 21:00 UTC**                      | **2026-08-11 04:00 ICT**                      |
| Feedback period                   | 2026-07-06 09:00 EDT through 2026-08-10 17:00 EDT | 2026-07-06 13:00 through 2026-08-10 21:00 UTC | 2026-07-06 20:00 through 2026-08-11 04:00 ICT |
| Judging                           | 2026-08-17 10:00 EDT through 2026-08-31 17:00 EDT | 2026-08-17 14:00 through 2026-08-31 21:00 UTC | 2026-08-17 21:00 through 2026-09-01 04:00 ICT |
| Winners announced                 | On or about 2026-09-08 14:00 EDT                  | On or about 2026-09-08 18:00 UTC              | On or about 2026-09-09 01:00 ICT              |

The Rules provide the authoritative ET values; the Dates page displayed the equivalent GMT+7 values.
The overview's “Aug 10, 2026 @ 5:00pm EDT” deadline is consistent. “On or about” means the winner time
is not guaranteed. [[R §1](https://datahub.devpost.com/rules)]
[[D](https://datahub.devpost.com/details/dates), both accessed 2026-07-24]

**Current deadline state:** Apache-2.0, Public repository access, a testable public fixture Project
URL, an owner-authorized operating window beyond judging, a Public YouTube functioning-project video,
and the entrant-operated Devpost submission are evidenced. Project `1117401` reports
**Project submitted!**, **Submitted**, and **5/5**. The organizer clarification removes remote
DataHub/MCP hosting as a project-access requirement; local OSS/MCP plus the Public fixture/repository
path is the evidenced intended route. Remaining boundaries are independent repository proof of entrant
eligibility/IP/media-rights facts, organizer acceptance, and future winner verification if
applicable. No post-deadline substantive edit is allowed, so preserve the submitted content and limit
any correction to the Rules' permitted scope.
[[R §§4–5](https://datahub.devpost.com/rules), accessed 2026-07-24]

## Eligibility, participation, and work window

The following are explicit Rules requirements. [[R §§3–4](https://datahub.devpost.com/rules), accessed
2026-07-24]

- An individual must be at least 18 or the age of majority where they reside. Eligible individuals may
  enter alone or on teams. Eligible legal organizations may enter if organized or incorporated when
  they enter.
- A person may enter individually and on multiple teams or organizations. No maximum team size is
  stated on the reviewed pages.
- A team or organization must appoint an eligible authorized representative. The representative
  warrants that authority when submitting.
- Residents or organizations domiciled where entry or prizes are prohibited are excluded. The Rules
  specifically include Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, and countries subject
  to applicable OFAC sanctions. Promotion entities, involved personnel/judges and relevant employers,
  immediate family/household members, affiliates, and conflicts determined by Sponsor/Administrator
  are also excluded.
- The entrant must create a Devpost account, register through **Join Hackathon**, obtain the required
  tools under their licences, and complete all required submission fields during the Submission
  Period. Entering also accepts the stated data collection/use for administration and publicity.
- The project must be newly created during the Submission Period. Frameworks, libraries, starter
  templates, standard tools, and AI coding assistants are allowed. Any other pre-existing code or work
  incorporated into the project must be disclosed, and submitted project work must have been built
  during the period.

The repository's first commit is `847a744c7123944e62b1de6d9399f9ebce900b13` at
2026-07-18 17:39:25 ICT, inside the work window. That is evidence for repository timing, not proof
that every idea, asset, dependency use, or off-repository contribution satisfies the rule. Entrant and
contributor attestations remain necessary.

## Required project and DataHub integration

The Rules require a working software application that uses DataHub. More specifically, it must use
the **open-source DataHub platform together with at least one** of **MCP Server, Agent Context Kit,
DataHub Skills, or Analytics Agent**. It must install and run consistently on its intended platform,
match the video/text description, and identify that platform in the submission. This named integration
condition is explicit, not optional. [[R §4](https://datahub.devpost.com/rules), accessed 2026-07-24]

The overview asks the project to choose or combine these positions:

1. **Agents That Do Real Work:** read through MCP Server or Agent Context Kit, take action, and write
   results back.
2. **Metadata-Aware Code Generation:** use DataHub Skills or MCP and produce a Git repository or pull
   request artifact.
3. **Production ML Agents:** use DataHub ML lineage through Agent Context Kit or MCP.
4. **Open / Wildcard:** build any DataHub-based idea with the open-source stack, including MCP, Agent
   Context Kit, Skills, Analytics Agent, or another DataHub product.

[[O](https://datahub.devpost.com/), accessed 2026-07-24]

### Mandate answers

| Question                                                                               | Answer                                | Classification and basis                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is DataHub mandatory?                                                                  | **Yes.**                              | **Explicit:** working application using the open-source DataHub platform plus at least one named integration. [[R §4](https://datahub.devpost.com/rules)]                                                                                                                               |
| Is one of MCP Server / Agent Context Kit / DataHub Skills / Analytics Agent mandatory? | **Yes, at least one.**                | **Explicit.** Current direct GraphQL access alone does not match the literal list. [[R §4](https://datahub.devpost.com/rules)]                                                                                                                                                          |
| Is DataHub Cloud mandatory?                                                            | **No.**                               | **Not required:** the Rules specify the open-source platform and do not require DataHub Cloud. [[R §4](https://datahub.devpost.com/rules)]                                                                                                                                              |
| Is an AI/LLM or model call mandatory?                                                  | **Not stated.**                       | **Explicit/unknown boundary:** the event and criteria use “AI agents,” but no reviewed rule requires an LLM provider or model call. A credible agent fit still affects theme/viability and judging. [[O](https://datahub.devpost.com/)] [[R §§4, 6](https://datahub.devpost.com/rules)] |
| Is an OpenAI key mandatory?                                                            | **No.**                               | **Not required:** no official page requires OpenAI or an OpenAI key. [[O](https://datahub.devpost.com/)] [[R §4](https://datahub.devpost.com/rules)]                                                                                                                                    |
| Is a public repository/public source mandatory?                                        | **Yes.**                              | **Explicit:** all necessary source/assets/instructions must be in a public open-source repository. [[R §4](https://datahub.devpost.com/rules)]                                                                                                                                          |
| Is Apache 2.0 mandatory?                                                               | **Yes for the submitted repository.** | **Explicit:** the repo must carry an Apache 2.0 licence detectable at the top/About. [[R §4](https://datahub.devpost.com/rules)]                                                                                                                                                        |
| Is a public live demo URL mandatory?                                                   | **No, not by itself.**                | **Explicit:** a live demo, hosted app, or repository with clear setup can be the Project URL. Test access is mandatory even though a public production deployment is not. [[O](https://datahub.devpost.com/)] [[R §4](https://datahub.devpost.com/rules)]                               |
| Is a particular cloud/deployment target mandatory?                                     | **No.**                               | **Explicit:** the entrant identifies the intended platform; no provider or cloud target is prescribed. [[R §4](https://datahub.devpost.com/rules)]                                                                                                                                      |
| Is a video mandatory?                                                                  | **Yes.**                              | **Explicit:** a publicly visible functioning-project demo video is a required submission component. [[R §4](https://datahub.devpost.com/rules)]                                                                                                                                         |
| Is a separate downloadable artifact mandatory?                                         | **No.**                               | **Unknown/not required:** no separate binary/archive upload is stated. Source, assets, instructions, Project URL/test access, description, and video are required. [[O](https://datahub.devpost.com/)] [[R §4](https://datahub.devpost.com/rules)]                                      |

## Open source, intellectual property, and data

Explicit conditions:

- The submitted repository must be public, open source, contain all necessary source and assets plus
  complete setup/testing instructions, and show an Apache 2.0 licence at the top or in the About
  section. [[R §4](https://datahub.devpost.com/rules), accessed 2026-07-24]
- The submission must be original, solely owned by the entrant/team/organization, and not violate
  third-party copyright, trademark, patent, contract, privacy, or other rights. Open-source components
  are allowed when their licences are followed and the submission adds to the underlying work.
  Third-party SDKs, APIs, content, and data require authorization under their terms and licences.
  [[R §§4, 7](https://datahub.devpost.com/rules), accessed 2026-07-24]
- Projects already funded, contracted, or commercially licensed for development may be disqualified if
  that support creates an unfair advantage. Sponsor/Administrator financial or preferential support
  is prohibited. [[R §4](https://datahub.devpost.com/rules), accessed 2026-07-24]
- Entrants retain ownership. They grant the Sponsor/Administrator the stated non-exclusive licences to
  evaluate and promote the submission; Devpost Terms also provide a perpetual promotional display/use
  licence for submitted software while preserving maker ownership. User content is not confidential
  and should be assumed public unless the site offers and the entrant selects a restriction.
  [[R §7](https://datahub.devpost.com/rules)]
  [[T §§4, 7](https://info.devpost.com/legal/terms-of-service), both accessed 2026-07-24]
- Content must not expose confidential or unauthorized personal information; misrepresent work or
  identity; infringe third-party rights; contain malicious code; or include abusive, illegal,
  deceptive, obscene, or otherwise inappropriate material. Violations can cause removal,
  disqualification, or account termination. [[T §4](https://info.devpost.com/legal/terms-of-service),
  accessed 2026-07-24]
- Resources says the supplied sample datasets are safe for Apache 2.0 submissions. Entrants bringing
  their own data must have permission to publish it in the open-source repository.
  [[S](https://datahub.devpost.com/resources), accessed 2026-07-24]

Phase 8.4A is integrated through exact normal merge
`36d4205806597ae14b7306c74e1527c284202023`, tree
`876899895449981f3c4dd3981ef76ba64597d1bd`, with ordered parents
`a13448fb3e25885410a10f3c8e5efdea6b6b5429` then
`7154b8ce036ec97adb87ed76d8483727746e4501`. Exact main CI run `30172556907`,
job `89715980644`, is `SUCCESS`, and GitHub detects Apache-2.0 on main. C09 is therefore `PASS`.
The repository owner completed the independently approved visibility change outside this agent.
Authenticated GitHub plus unsigned HTTP and credential-helper-disabled Git read evidence verified the
repository as Public at 2026-07-26 04:48 ICT, with default `main` still exact
`36d4205806597ae14b7306c74e1527c284202023`. C10 is therefore `PASS`.
Phase 8.4B subsequently completed through normal merge
`1c32f6c913b196fc4a23055fb7da3b1482b94e5e`, tree
`5c83d034f30c6d31268109277aaa455a05ff9656`, with ordered parents
`36d4205806597ae14b7306c74e1527c284202023` then
`e4ddbb8277f430ed1da4593c9f19ca89f1aa39fb`. Exact-main CI run `30178465331`, job
`89731006555`, is `SUCCESS`; Public visibility, enabled private vulnerability reporting, and the
Phase 8.4B branch/conversation remain preserved. C10 remains `PASS`.

The source relicense is independent from release-artifact attribution. Phase 8.5 now maps the exact
positive rendered third-party contributions in `apps/web/dist` to five package/version identities and
their verified legal files, generates deterministic `THIRD_PARTY_NOTICES.txt`, and makes manifest
schema v3 plus the standalone verifier enforce exact pnpm lock snapshot/canonical virtual-store
identity, legal/source evidence, and Windows-safe paths. This closes the technical bundle inventory
gap without providing legal advice. Phase 8.6 records the owner disposition: C11 is now
`QUALIFIED PASS — OWNER-AUTHORIZED SCOPE` for the exact verified Phase 8.5 artifact, synthetic/
authorized data, and authorized zero-cost API access only. This slice performs no artifact
publication/distribution or submission.

## Submission fields and access

Required components stated by the overview and Rules:

- a **Project URL** that judges can use easily: a live demo, hosted application, or repository with
  clear setup instructions;
- the public Apache-2.0 open-source repository described above;
- an English text description covering summary, features/functionality, technologies, and data;
- the required video described below;
- the intended platform and enough testing instructions/access for the project to work as described;
- any required Devpost registration/submission fields before the deadline; and
- disclosure of non-standard pre-existing work and compliance with all third-party licences/rights.

The project/test build must be available **free and without restriction** to Sponsor, Administrator,
and judges through the end of judging, 2026-08-31 17:00 EDT / 2026-09-01 04:00 ICT. If the test site is
private, credentials must be included in testing instructions. Judges are not required to run it and
may evaluate only the description, images, and video. Sponsor/Devpost may request reasonable access or
additional information to verify functionality or authorship; failure to respond can disqualify the
entry. [[R §4](https://datahub.devpost.com/rules)]
[[T §5](https://info.devpost.com/legal/terms-of-service), both accessed 2026-07-24]

Sample outputs, including files or a link to a public repository with outputs, are recommended but
optional. [[O](https://datahub.devpost.com/)] [[R §4](https://datahub.devpost.com/rules), accessed
2026-07-24]

The reviewed public pages do **not** enumerate exact UI fields for screenshots/cover images,
teammate-profile details, credentials field placement, or a required challenge-selector control.
They describe challenges and required content, but form-specific controls are **Unknown** until an
authorized entrant inspects the submission form. Do not register, consent, or submit merely to resolve
those fields.

All submission materials must be in English, or include an English translation, including the video,
description, testing instructions, and other submitted material.
[[R §4](https://datahub.devpost.com/rules), accessed 2026-07-24]

## Video

- **Required.**
- It “should be less than three (3) minutes”; judges are not required to watch beyond three minutes.
- It must show the project functioning on its intended device/platform.
- It must be publicly visible on **YouTube, Vimeo, or Youku**, with its link on the submission form.
- It must not use third-party trademarks, copyrighted music, or other material without permission.
- It must be in English or have an English translation.

[[R §4](https://datahub.devpost.com/rules), accessed 2026-07-24]

The public functioning-project video is mandatory, while the sub-three-minute wording is an official
recommendation and risk-reduction target. Minute three is the stated judging-attention boundary, not a
separately worded hard eligibility maximum.

**Unknown:** the Rules say “publicly visible,” but do not explicitly say whether an unlisted video
qualifies. Do not assume it does. **Recommendation:** use Public visibility, provide accurate captions
or an English transcript, and keep the judged content comfortably below three minutes. Captions are a
recommendation; the reviewed pages do not expressly require them.

Phase 8.9 produced one authentic 2:50.20 app-only VP8/WebM source at 1440 × 900 with no audio stream,
plus synchronized human-reviewed English WebVTT captions and transcript. Phase 8.9A adds a separate
VP8-stream-copy derivative with synchronized Microsoft Mark synthetic male English narration, exact
captions/transcript, Opus audio, and no new incident or UI frame. Both remain Public GitHub repository
assets. Phase 8.11 selected the male-voice derivative and published it with Public visibility at
<https://youtu.be/D5mvMqrhyDc>; authored English captions are published and the completed YouTube
copyright check reported no issue. The exact URL is now saved in Devpost draft `1117401` and embedded
in its submitted project. C18 and C19 are `PASS`. The signed-in finalization screen reports
**Project submitted!**, **Submitted**, and **5/5**; no organizer acceptance or prize result is
claimed.

## Judging

The Sponsor/Administrator determine eligibility and methodology. Judging can involve expert panels,
peer review, automated analysis, or multiple rounds; judges may change. [[R §6](https://datahub.devpost.com/rules),
accessed 2026-07-24]

1. **Stage 1 — pass/fail baseline viability:** alignment with the hackathon theme and use of the
   required APIs/SDKs.
2. **Stage 2 — equally weighted criteria:**
   - Use of DataHub;
   - Technical Execution;
   - Originality;
   - Real-World Usefulness;
   - Submission Quality.

The Rules state “equally weighted.” Treating that as 20% each is a mathematical inference, not a
separately printed percentage. Open-source contributions to DataHub can be considered favorably as an
optional bonus; they are not a sixth equally weighted criterion.
[[R §6](https://datahub.devpost.com/rules)] [[O](https://datahub.devpost.com/), accessed 2026-07-24]

Ties are broken by the higher score on the first criterion, then each next criterion in order; a panel
vote resolves a tie that remains across all criteria. Feedback-prize submissions are judged on
completeness, viability, and potential impact. [[R §6](https://datahub.devpost.com/rules), accessed
2026-07-24]

## Prizes, tracks, and resources

The $20,500 pool is: one $6,000 Grand Prize; one $3,000 prize for each of the four challenges; two
$1,000 Honourable Mentions; and ten $50 feedback prizes. A submission can receive at most one main
prize, and an individual can receive at most one feedback prize. The Grand Prize also includes a
DataHub Town Hall presentation and promotion; challenge winners receive promotion.
[[O](https://datahub.devpost.com/)] [[R §8](https://datahub.devpost.com/rules), accessed 2026-07-24]

Positioning recommendation: **Open / Wildcard** is the primary and strongest current fit.
**Agents That Do Real Work** is conditional and secondary only if organizers accept a bounded
read-only investigative workflow. Phase 8.11 Devpost registration records **Working solo**, and
submitted project `1117401` selects **Open / Wildcard**. **Agents That Do Real Work** remains
conditional, secondary, and unselected.

Official Resources lists:

- DataHub Docs and Quickstart;
- DataHub Skills and Agent Context Kit documentation;
- the DataHub MCP Server repository and Analytics Agent documentation;
- DataHub Core and DataHub Skills repositories, with open-source contribution welcomed;
- `showcase-ecommerce` (1,049 cross-platform entities; documented command
  `datahub datapack load showcase-ecommerce`), `bootstrap` (documented command
  `datahub datapack load bootstrap`), `nyc-taxi` (about 500,000 trips and planted freshness issues),
  `healthcare` (about 55,000 synthetic records and planted quality issues), and `fiction-retail`
  (synthetic customers/orders) sample datasets;
- the DataHub Slack `#agent-hackathon` channel, mid-hackathon office hours, and DataHub Town Halls;
- `#agent-hackathon` for DataHub questions and `support@devpost.com` for Devpost/submission issues.

[[S](https://datahub.devpost.com/resources), accessed 2026-07-24]

Resources does not state a separate required DataHub API endpoint or require any one sample dataset.
The documented products/tooling are the relevant integration surfaces.

### Phase 8.2 DataHub MCP official-source gate

Re-verified with the official in-app Browser at **2026-07-24 02:27:32 ICT /
2026-07-23 19:27:32 UTC**:

- [Devpost Rules §4](https://datahub.devpost.com/rules) still requires open-source DataHub plus at
  least one named integration, and [Resources](https://datahub.devpost.com/resources) links the
  official [DataHub MCP Server repository](https://github.com/acryldata/mcp-server-datahub).
- The official [DataHub MCP guide](https://docs.datahub.com/docs/features/feature-guides/mcp)
  documents managed DataHub Cloud Streamable HTTP at
  `https://<tenant>.acryl.io/integrations/ai/mcp/` with OAuth or Bearer PAT, and the separately run
  open-source server for DataHub Core or Cloud. Current official
  [`__main__.py`](https://github.com/acryldata/mcp-server-datahub/blob/main/src/mcp_server_datahub/__main__.py)
  supports `stdio`, `sse`, and `http`; Phase 8.2 explicitly selects operator-provided Streamable HTTP
  and never starts a subprocess.
- Current official tool source confirms bounded
  [`search`](https://github.com/acryldata/mcp-server-datahub/blob/main/src/mcp_server_datahub/tools/search.py)
  and
  [`get_lineage`](https://github.com/acryldata/mcp-server-datahub/blob/main/src/mcp_server_datahub/tools/lineage.py).
  The repository's current read-only tool list contains no recent-changes/timeline operation.
- The official [MCP SDK catalog](https://modelcontextprotocol.io/docs/sdk) lists the TypeScript SDK as
  Tier 1. Its
  [production v1 client guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/client.md)
  recommends `StreamableHTTPClientTransport` for remote servers; the official
  [npm package page](https://www.npmjs.com/package/@modelcontextprotocol/sdk) showed `1.29.0`, which
  Phase 8.2 pins exactly.

The selected integration therefore calls only `search` and `get_lineage`, validates tool discovery
and every response, and reports recent changes as unsupported. Protocol-fixture and product
vertical-slice success demonstrate genuine application use of the MCP protocol.

### Phase 8.11 real local OSS MCP gate

At the 2026-07-28 follow-up, a localhost-only official stack added a real provider proof without a
credential, public tunnel, paid account, or deployment:

- DataHub Core `1.6.0` ran from official quickstart images with the official synthetic
  `showcase-ecommerce` data pack.
- Official `mcp-server-datahub` `0.6.0` ran over loopback Streamable HTTP with mutation, user, and
  data-quality tools disabled and telemetry disabled.
- Discovery returned eight tools:
  `search`, `get_entities`, `list_schema_fields`, `get_lineage`,
  `get_lineage_paths_between`, `get_dataset_queries`, `search_documents`, and `grep_documents`.
  No mutation or recent-change tool was exposed.
- Direct read-only calls returned search results, entity/schema metadata, and bounded upstream and
  downstream lineage from the synthetic catalog. Application `/ready`, `/metadata/health`,
  `/metadata/search`, `/metadata/lineage`, and `/metadata/recent-changes` all returned their
  schema-valid designed state.
- The official lineage response represented `entity.platform` as a bounded descriptor object. The
  prior adapter rejected it as `METADATA_INVALID_RESPONSE`; the smallest compatibility correction
  accepts either the prior string or official `{ urn, name? }` shape without widening tool, kind,
  byte, entity, lineage, timeout, or failure boundaries.
- Exactly one local synthetic incident reached the designed `degraded` terminal state with four
  candidates/four lineage nodes, `lineage_truncated`, unsupported recent changes, eight tool calls,
  six agent steps, zero retries, and no ranked hypothesis. This is safe incomplete-evidence behavior,
  not a completed live root-cause result.

The technical gate is therefore **PASS — LOCAL OSS**. It does not create a durable remotely reachable
endpoint, but the entrant-reported organizer response confirms that remote hosting is not required
when the Public fixture and reproducible local OSS/MCP path are available. The Public app remains
fixture-only and must not be described as live DataHub evidence.

## Disqualification, changes, and winner obligations

- Before the deadline a draft can be changed. After the Submission Period, the submission cannot be
  changed, although its portfolio copy may continue to change. A narrow organizer-approved correction
  may remove infringement, personal information, or inappropriate content without substantively
  changing the entry. [[R §5](https://datahub.devpost.com/rules), accessed 2026-07-24]
- Tampering, rule/Terms violations, unlawful behavior, inappropriate or unsportsmanlike conduct,
  misrepresentation, inaccessible verification, prohibited content, or an ineligible/non-functioning
  submission can lead to removal or disqualification. Rules can change, so any ambiguity should be
  submitted to the Sponsor in writing before the deadline.
  [[R §§4, 11](https://datahub.devpost.com/rules)]
  [[T §§4–5](https://info.devpost.com/legal/terms-of-service), accessed 2026-07-24]
- Potential winners must pass identity, eligibility, and role verification and return required
  declarations/forms within ten business days. Failure can delay, disqualify, or forfeit the prize.
  Prizes are expected within 60 days after required forms are received; taxes and other costs remain
  the winner's responsibility. [[R §8](https://datahub.devpost.com/rules), accessed 2026-07-24]

## Corrected current product facts

Repository facts in this section are bounded to exact current `main`
`0ac3b8180cebdccd8c4b914443ebafa6831a112d` (tree
`d4c621e981bf11e97513bbc49de3eb589eca33b3`). Phase 8.11 is integrated through that normal merge. The
running revision is independently bound to the same immutable image-source commit and exact current
tree:

- Fixture-mode selection, investigation, scoring, report composition, and Markdown rendering are
  deterministic. Live DataHub mode depends on external metadata and timeline state, so its returned
  inputs can vary. See [README](../README.md), [agent design](AGENT_DESIGN.md), and
  [API contracts](API_CONTRACTS.md).
- The UI exposes seven guided incident presets from the shared catalog. Only
  `removed-schema-column` has the rich checked-in incident/metadata pair and canonical browser E2E.
  The other six are guided inputs and deterministic evaluation cases, not six additional rich
  checked-in E2E metadata fixtures. See
  [`packages/shared-types/src/index.ts`](../packages/shared-types/src/index.ts),
  [`fixtures`](../fixtures), and
  [`tests/e2e/report-display.spec.mjs`](../tests/e2e/report-display.spec.mjs).
- The current product performs zero model calls and does not read `OPENAI_API_KEY`. It therefore must not
  claim LLM/model integration. See [README](../README.md), [agent design](AGENT_DESIGN.md), and
  [deployment](DEPLOYMENT.md).
- The exact direct API Markdown endpoint is
  **`GET /incidents/:incidentId/report.md`**. Browser traffic uses the `/api` prefix through its web
  boundary. See [API contracts](API_CONTRACTS.md).
- Exact current `main` contains the Phase 8.7 Docker/Cloud Run production-host seam plus the Phase
  8.11 UI and attribution convergence corrections. The external live fixture deployment was built
  from immutable source `0ac3b8180cebdccd8c4b914443ebafa6831a112d`; it provides the same-origin
  `/api` boundary and public smoke recorded in [deployment](DEPLOYMENT.md). Neither the integrated
  source nor the running service adds live DataHub credentials or a model API.
- The bounded direct GraphQL adapter remains backward compatible. Phase 8.2 adds a distinct
  `datahub-mcp` provider using the official MCP SDK and exact read-only `search`/`get_lineage`
  allowlist, with startup validation, bounded/sanitized failure behavior, explicit unsupported
  recent-changes semantics, and a protocol-level product vertical slice. Real local DataHub OSS/MCP
  validation is complete, and user-reported organizer guidance confirms that remote hosting is not
  required for the submitted fixture/repository access model.
- [GitHub](https://github.com/toannnnq1424/data-incident-investigator) displayed **Public** at the
  2026-07-26 04:48 ICT post-mutation checkpoint. Unsigned GETs to the repository, exact main commit,
  README, LICENSE, issues, PRs, tags, Releases, and Actions returned `200`; a credential-helper-disabled
  HTTPS `ls-remote` resolved the then-current default `main` to exact
  `36d4205806597ae14b7306c74e1527c284202023`. Historical Phase 8.4B evidence records its later normal
  merge as `1c32f6c913b196fc4a23055fb7da3b1482b94e5e` with tree
  `5c83d034f30c6d31268109277aaa455a05ff9656`; its exact-main CI run `30178465331`, job
  `89731006555`, is `SUCCESS`. This pair is not current main. C10 remains `PASS`. The authorized QA2 correction enabled
  GitHub private vulnerability reporting at 2026-07-26 05:22 ICT; GitHub authentication is required
  to submit through the private report route, and public issue disclosure is prohibited. This
  security-control correction does not change the 37-row compliance statuses or totals.

## Compliance matrix

Status meanings: **PASS** = current exact-main evidence satisfies the rule; **QUALIFIED PASS —
OWNER-AUTHORIZED SCOPE** = the technical evidence and owner operational authorization satisfy only
the explicitly bounded artifact/data/API scope and are not blanket legal clearance; **BLOCKED** =
the current distributed/deployed artifact has not yet passed a required gate; **PARTIAL** = useful
evidence exists but the complete submission condition is not yet met; **OPEN** = required action or
entrant verification remains; **NOT REQUIRED** = the reviewed official sources do not mandate it.

Every source link in the matrix was accessed at the 2026-07-24 checkpoint in the source register.

| ID  | Source                                                                                                 | Explicit rule or decision                                                                                                                   | Current evidence/status                                                                                                                                                                                                                                                                                                                                                                            | Status                                   | Owner phase               | Exact next action                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C01 | [R §3](https://datahub.devpost.com/rules)                                                              | Entrant is age/residency/conflict eligible.                                                                                                 | The entrant supplied `Vietnam` and personally operated the final submission gate, but repository evidence still cannot independently prove age, sanctions, conflict, or the complete eligibility facts.                                                                                                                                                                                            | OPEN                                     | Entrant / organizer gate  | Retain truthful entrant evidence and respond to any organizer verification request; do not treat submission as eligibility approval.                                     |
| C02 | [R §4](https://datahub.devpost.com/rules), [T §5](https://info.devpost.com/legal/terms-of-service)     | Create a Devpost account, join/register, and complete required fields by the deadline.                                                      | Registration and individual Join are complete. Exactly one project, `1117401`, reports **Project submitted!**, **Submitted**, and **5/5** with the verified English copy, URLs, media, and judge fields.                                                                                                                                                                                           | PASS                                     | Phase 8.11 / entrant      | Preserve the submitted project and registered contact through judging; do not infer organizer acceptance.                                                                |
| C03 | [R §§3–4](https://datahub.devpost.com/rules), [T §5](https://info.devpost.com/legal/terms-of-service)  | Team/organization appoints an eligible authorized representative.                                                                           | Devpost registration and the submitted entry record `Working solo`; no team or organization is entered.                                                                                                                                                                                                                                                                                            | NOT REQUIRED                             | Phase 8.11 / entrant      | Reopen only if a Rules-permitted team or organization change is made.                                                                                                    |
| C04 | [R §4](https://datahub.devpost.com/rules)                                                              | Project is newly created during the Submission Period.                                                                                      | First repository commit is 2026-07-18, inside the stated window, and the submitted form selects **Yes, newly created during the Submission Period**. Git timing and that selection still do not independently cover every possible off-repository contribution.                                                                                                                                    | PARTIAL                                  | Entrant / organizer gate  | Preserve truthful supporting evidence and correct only through an allowed pre-deadline or organizer-approved route if the entrant discovers contrary facts.              |
| C05 | [R §4](https://datahub.devpost.com/rules)                                                              | Disclose non-standard pre-existing work; standard tools/AI coding assistants are allowed.                                                   | The submitted form uses the newly-created selection and leaves the conditional pre-existing-work description blank. Git history starts during the period, but no independent entrant-level inventory covers every off-repository asset or contribution.                                                                                                                                            | PARTIAL                                  | Entrant / organizer gate  | Preserve truthful supporting evidence and use only a permitted correction route if the entrant discovers an omitted disclosure.                                          |
| C06 | [R §4](https://datahub.devpost.com/rules)                                                              | Working application uses open-source DataHub plus at least one named integration.                                                           | Explicit `datahub-mcp` mode uses the official SDK and only read-only `search`/`get_lineage`. Protocol/product tests and a localhost-only official DataHub Core `1.6.0` + MCP `0.6.0` proof pass, including safe degraded incident handling. The entrant reports organizer confirmation that local OSS plus the Public fixture/repository path satisfies access/integration without remote hosting. | PASS                                     | Phase 8.2–8.11 complete   | Preserve **PASS — LOCAL OSS**, the reproducible judge path, and the explicit fixture-only Public boundary.                                                               |
| C07 | [R §4](https://datahub.devpost.com/rules)                                                              | App installs/runs consistently on its stated intended platform.                                                                             | Node 24 runbook, fixture smoke, frozen lock, MCP protocol/product tests, and the localhost-only official DataHub OSS/MCP path pass. User-reported organizer guidance identifies local DataHub OSS as the intended platform; remote hosting is not required.                                                                                                                                        | PASS                                     | Phase 8.2–8.11 complete   | Preserve the credential-free fixture/repository judge path and optional local PAT hardening recipe; never expose a token.                                                |
| C08 | [R §4](https://datahub.devpost.com/rules)                                                              | Submission functionality matches text and video.                                                                                            | The submitted English story, links, five captioned real fixture screenshots, and embedded Public male-voice video match the real fixture UI and disclose fixture-only, no-model, no-write-back, and remote-MCP limits.                                                                                                                                                                             | PASS                                     | Phase 8.8–8.11 complete   | Preserve the exact submitted claim boundaries through judging.                                                                                                           |
| C09 | [R §4](https://datahub.devpost.com/rules)                                                              | Submitted repo uses Apache 2.0 visible at top/About.                                                                                        | Exact current main `0ac3b8180cebdccd8c4b914443ebafa6831a112d` preserves canonical Apache-2.0 licensing; exact-main CI run `30390755820` / job `90381434069` is successful and GitHub detects `Apache-2.0`.                                                                                                                                                                                         | PASS                                     | Phase 8.4A–8.11 complete  | Preserve exact license/main evidence through judging.                                                                                                                    |
| C10 | [R §4](https://datahub.devpost.com/rules)                                                              | Public source repository with all necessary source/assets/instructions.                                                                     | GitHub is Public at exact current main `0ac3b8180cebdccd8c4b914443ebafa6831a112d`, tree `d4c621e981bf11e97513bbc49de3eb589eca33b3`. Annotated tag `v1.0.0` and its Published/Latest Release remain on the earlier immutable release merge; the running Cloud Run revision is now independently bound to this exact current source.                                                                 | PASS                                     | Phase 8.4B–8.11 complete  | Preserve and reverify Public access, reporting, exact-main evidence, and the separately governed external service through later work.                                    |
| C11 | [R §§4, 7](https://datahub.devpost.com/rules), [S](https://datahub.devpost.com/resources)              | All third-party SDK/API/data/content use is authorized and licence-compliant.                                                               | Exact live digest `sha256:0ea3381f635a97812181f14448df9c7939f7c02d2a824724403e3b8a0d087286`, built from source `0ac3b818…a112d`, passes the preserved lock/base/compiled-output/runtime-closure contract after deterministic attribution/notices convergence: 152 production identities, 149 runtime identities/roots and legal files, five Vite identities, and canonical Apache legal evidence.  | QUALIFIED PASS — OWNER-AUTHORIZED SCOPE  | Phase 8.7–8.11 correction | Preserve the exact digest/source/legal evidence and synthetic/authorized-data boundary. No blanket legal clearance is claimed; C12 remains separate.                     |
| C12 | [R §§4, 7](https://datahub.devpost.com/rules), [T §7](https://info.devpost.com/legal/terms-of-service) | Submission is original/solely owned and does not violate third-party rights.                                                                | Git provenance and the entrant-operated submission exist; an independent repository-level entrant/contributor ownership attestation is absent.                                                                                                                                                                                                                                                     | PARTIAL                                  | Entrant / organizer gate  | Retain truthful contributor and asset-rights evidence and respond to any organizer verification request.                                                                 |
| C13 | [R §4](https://datahub.devpost.com/rules), [O](https://datahub.devpost.com/)                           | Provide an easily testable Project URL.                                                                                                     | Public credential-free Cloud Run fixture URL exists and passed unauthenticated canonical-flow smoke: `https://data-incident-investigator-1071683558688.asia-southeast1.run.app`. Phase 8.8 adds an exact judge flow and Public-repository fallback.                                                                                                                                                | PASS                                     | Phase 8.7–8.8             | Monitor both paths through judging and retain the exact testing instructions.                                                                                            |
| C14 | [R §4](https://datahub.devpost.com/rules)                                                              | Test access is free and unrestricted through 2026-08-31 17:00 EDT.                                                                          | The public credential-free Cloud Run fixture is owner-authorized to remain available through 2026-09-17 23:59 ICT / 16:59 UTC / 12:59 EDT, beyond judging. The historical 20%-credit condition is now a monitor-and-escalate trigger rather than an automatic pre-judging stop; emergency containment and provider failure remain possible.                                                        | PASS — OWNER-AUTHORIZED OPERATING WINDOW | Phase 8.11 / operator     | Monitor service/billing, retain the Public-repository fallback, and reverify both paths during judging.                                                                  |
| C15 | [R §4](https://datahub.devpost.com/rules)                                                              | Private test site credentials, if used, are in testing instructions.                                                                        | No private test site is selected; no credentials are stored.                                                                                                                                                                                                                                                                                                                                       | NOT REQUIRED                             | Phase 8.3                 | If a private site is later chosen, provision judge-only access out of repo and place it only in the authorized form field.                                               |
| C16 | [R §4](https://datahub.devpost.com/rules), [O](https://datahub.devpost.com/)                           | Text describes summary, features/functionality, technologies, and data.                                                                     | The submitted 4,898-character English story covers inspiration, verified functionality, TypeScript/React/Fastify/DataHub architecture, synthetic fixture data, bounded MCP usage, challenges, accomplishments, learning, and explicit limitations.                                                                                                                                                 | PASS                                     | Phase 8.8–8.11 complete   | Preserve the submitted text and change it only through a Rules-permitted route.                                                                                          |
| C17 | [R §4](https://datahub.devpost.com/rules)                                                              | State intended platform and complete setup/testing instructions.                                                                            | The concise public fixture path plus Node 24 / pnpm `11.9.0` repository-local fallback are rehearsed, and the owner-authorized public operating window now extends beyond judging.                                                                                                                                                                                                                 | PASS                                     | Phase 8.8–8.11 / operator | Preserve and monitor the public path plus repository fallback through judging.                                                                                           |
| C18 | [R §4](https://datahub.devpost.com/rules)                                                              | Public functioning-project video is required; the Rules say it should be under three minutes and judges need not watch beyond minute three. | The selected authentic continuous 2:50.20, 1440 × 900 male-voice fixture flow remains Public at <https://youtu.be/D5mvMqrhyDc>, has published authored English captions, and is embedded in the submitted project. A separate 2:48.91 Phase 8.12 deployed-UI candidate is a Public GitHub feature-branch/PR asset after push, but is not Rules-listed hosted or submitted.                         | PASS                                     | Phase 8.9A–8.12 complete  | Preserve the current Public playback through judging; replace it only after canonical QA and separately authorized synchronization.                                      |
| C19 | [R §4](https://datahub.devpost.com/rules)                                                              | Video publicly visible on YouTube, Vimeo, or Youku.                                                                                         | The selected male-voice video remains Public on YouTube at <https://youtu.be/D5mvMqrhyDc>, with authored English captions and no reported copyright-check issue. The exact URL is included in submitted Devpost project `1117401`; the Phase 8.12 repository candidate does not itself satisfy Rules-listed hosting.                                                                               | PASS                                     | Phase 8.11–8.12 complete  | Preserve the exact current URL and Public playback; do not confuse a repository asset or prepared replacement with Rules-listed hosting or organizer acceptance.         |
| C20 | [R §4](https://datahub.devpost.com/rules)                                                              | Video avoids unauthorized trademarks/music/material and is English or translated.                                                           | The Public video and proposed Phase 8.12 replacement use only authentic project UI, synthetic fixture data, offline Microsoft voices, and authored English captions. Neither adds music or third-party visual media; the new candidate uses Microsoft David Desktop. Repository evidence still does not provide a durable entrant rights/IP attestation.                                           | PARTIAL                                  | Phase 8.9A–8.12 / entrant | Retain truthful rights/privacy/accessibility evidence and respond to any organizer verification request.                                                                 |
| C21 | [R §4](https://datahub.devpost.com/rules)                                                              | All submitted materials are English or English-translated.                                                                                  | The submitted project uses English title/pitch/story, gallery captions, Built With tags, links, Additional info, feedback answers, male narration, and authored captions.                                                                                                                                                                                                                          | PASS                                     | Phase 8.8–8.11 complete   | Preserve English completeness through judging.                                                                                                                           |
| C22 | [R §4](https://datahub.devpost.com/rules)                                                              | Required form fields are complete during the Submission Period.                                                                             | Exactly one project, `1117401`, reports **Project submitted!**, **Submitted**, and **5/5**. Overview, details/media, Additional info, and the entrant-operated final gate are complete.                                                                                                                                                                                                            | PASS                                     | Phase 8.11 / entrant      | Preserve the submitted content and resulting finalization evidence.                                                                                                      |
| C23 | [O](https://datahub.devpost.com/)                                                                      | Choose/position the project against one or more published challenges.                                                                       | Devpost registration and submitted Additional info both record **Open / Wildcard**, the strongest truthful fit. **Agents That Do Real Work** remains conditional and unselected because the app performs bounded read-only investigation and no write-back.                                                                                                                                        | PASS                                     | Phase 8.11 complete       | Preserve Open / Wildcard and do not imply write-back or organizer acceptance.                                                                                            |
| C24 | [R §§3–4](https://datahub.devpost.com/rules)                                                           | Provide teammate/representative information required by the form.                                                                           | Devpost registration and the submitted entry record `Working solo`; no teammate or organization representative applies.                                                                                                                                                                                                                                                                            | NOT REQUIRED                             | Phase 8.11 / entrant      | Reopen only if the entrant makes a Rules-permitted change to team status.                                                                                                |
| C25 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | Screenshots/images required by the form.                                                                                                    | Five clean 1440 × 900 PNGs from the Phase 8.8 canonical synthetic fixture incident remain submitted with aligned English captions. Five separate app-only 1440 × 900 Phase 8.12 replacement candidates from exactly one new synthetic fixture incident are repository QA assets and are not yet submitted.                                                                                         | PASS                                     | Phase 8.8–8.12 complete   | Preserve the authentic image/caption mapping; replace the submitted set only after canonical QA and separately authorized synchronization.                               |
| C26 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | Sample outputs.                                                                                                                             | Official sources recommend but do not require them; deterministic JSON/Markdown output exists, including `GET /incidents/:incidentId/report.md`.                                                                                                                                                                                                                                                   | NOT REQUIRED                             | Phase 8.3                 | Optionally publish a sanitized fixture output if it improves judging and rights/security checks pass.                                                                    |
| C27 | [R §5](https://datahub.devpost.com/rules)                                                              | No changes to the submitted entry after deadline except narrow organizer-approved corrections.                                              | Project `1117401` is submitted before the deadline. No prohibited post-deadline change has occurred; the current pre-deadline edit window does not supersede the Rules' later freeze.                                                                                                                                                                                                              | PASS                                     | Phase 8.11 / entrant      | Treat the entry as frozen after the deadline and use only the Rules' narrow organizer-approved correction path.                                                          |
| C28 | [R §6](https://datahub.devpost.com/rules)                                                              | Stage 1 theme and required API/SDK viability.                                                                                               | Named DataHub MCP integration is implemented, product-tested, and validated against localhost DataHub Core `1.6.0` plus official MCP `0.6.0`. User-reported organizer guidance confirms local OSS and the Public fixture/repository access model; remote hosting is not required.                                                                                                                  | PASS                                     | Phase 8.2–8.11 complete   | Preserve the local OSS proof and explicit fixture-only Public boundary; do not imply organizer acceptance or a Stage 1 result.                                           |
| C29 | [R §6](https://datahub.devpost.com/rules)                                                              | Stage 2 equal criteria: DataHub, execution, originality, usefulness, submission quality.                                                    | The deployed Public fixture now includes seven visible playbooks, the answer-first verdict, and the top-hypothesis-linked evidence/impact path. Real local DataHub OSS/MCP evidence exists. A synchronized video/screenshot/submission replacement packet is prepared but not yet hosted or submitted, and the project has not been judged.                                                        | PARTIAL                                  | Phase 8.2–8.12            | Preserve the truthful matrix mapping and do not claim live-mode determinism, organizer acceptance, scoring, or that the prepared submission replacement is already live. |
| C30 | [R §4](https://datahub.devpost.com/rules), [T §5](https://info.devpost.com/legal/terms-of-service)     | Respond to organizer verification/access requests.                                                                                          | No operational owner or response plan exists.                                                                                                                                                                                                                                                                                                                                                      | OPEN                                     | Entrant / Phase 8 final   | Name a monitored contact and retain runnable access/source evidence through judging.                                                                                     |
| C31 | [R §8](https://datahub.devpost.com/rules)                                                              | Potential winner returns verification forms within ten business days.                                                                       | Conditional future obligation.                                                                                                                                                                                                                                                                                                                                                                     | OPEN                                     | Entrant / winner gate     | Monitor the registered email through winner verification and return legally reviewed forms on time.                                                                      |
| C32 | [R §4](https://datahub.devpost.com/rules)                                                              | DataHub Cloud.                                                                                                                              | Official pages do not require it.                                                                                                                                                                                                                                                                                                                                                                  | NOT REQUIRED                             | —                         | Do not add or claim DataHub Cloud solely for compliance.                                                                                                                 |
| C33 | [O](https://datahub.devpost.com/), [R §§4, 6](https://datahub.devpost.com/rules)                       | LLM/model call.                                                                                                                             | The current investigation path makes zero model calls; fixture mode and algorithms given fixed inputs are deterministic, while live DataHub inputs/provider state can vary; official pages do not mandate a model call.                                                                                                                                                                            | NOT REQUIRED                             | —                         | Preserve the truthful no-model statement unless a separately scoped implementation changes it.                                                                           |
| C34 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | OpenAI key.                                                                                                                                 | Current product does not read `OPENAI_API_KEY`; official pages do not require OpenAI.                                                                                                                                                                                                                                                                                                              | NOT REQUIRED                             | —                         | Do not request, enter, or claim an OpenAI key for compliance.                                                                                                            |
| C35 | [R §4](https://datahub.devpost.com/rules)                                                              | Particular cloud or public production deployment.                                                                                           | A Google Cloud Run fixture deployment now exists, but the rule still does not require a particular provider or production cloud.                                                                                                                                                                                                                                                                   | NOT REQUIRED                             | Phase 8.7                 | Preserve the working URL without claiming Google Cloud is organizer-mandated.                                                                                            |
| C36 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | Separate binary/archive upload.                                                                                                             | Verified RC archive history exists, but no rule requires upload and the Draft RC Release has no user-uploaded assets.                                                                                                                                                                                                                                                                              | NOT REQUIRED                             | —                         | Do not upload an artifact merely for Devpost; keep RC Release and tag immutable.                                                                                         |
| C37 | [O](https://datahub.devpost.com/), [R §§6, 8](https://datahub.devpost.com/rules)                       | Feedback survey for the $50 bonus.                                                                                                          | Optional. The submitted project opts in and contains four complete actionable English answers covering the useful MCP surface, the absent recent-changes tool, a proposed typed bounded capability, and no confirmed reproducible DataHub bug. These answers are not a prize result or organizer acceptance.                                                                                       | NOT REQUIRED                             | Phase 8.11 / entrant      | Preserve the truthful answers; do not claim the optional prize unless awarded.                                                                                           |

Current matrix totals after the Phase 8.12 preparation, Phase 8.11 operating-window, registration,
hosted-video, real local OSS/MCP validation, and submitted 5/5 project evidence are
**18 PASS / 1 QUALIFIED PASS — OWNER-AUTHORIZED SCOPE / 5 PARTIAL / 3 OPEN / 10 NOT REQUIRED**
across 37 rows.

## Open blockers and verification questions

1. **Local OSS/MCP access (resolved; preserve boundary):** protocol/product tests and a real
   localhost-only DataHub Core `1.6.0` + official MCP `0.6.0` proof pass, including readiness,
   search, bounded lineage, explicit unsupported recent changes, and one safe degraded incident.
   User-reported organizer guidance confirms that the Public fixture plus reproducible local OSS/MCP
   path satisfies access/integration without remote hosting. Do not present this as Public live
   DataHub evidence or organizer acceptance.
2. **Licence:** integrated exact main satisfies C09. The historical Phase 8.5 release graph has 138
   declared identities, 137 packaged legal files, and 0 dependency NOTICE files. Phase 8.5 attributes
   the exact positive rendered web contributions to
   `react@19.2.7`/`react-dom@19.2.7`/`scheduler@0.27.0`/`vite@7.3.6`/`zod@4.4.3`, reproduces their
   verified upstream legal text in deterministic `THIRD_PARTY_NOTICES.txt`, and enforces the mapping,
   legal/source hashes, content, and bundle membership. The Cloud Run correction adds project
   `NOTICE`, exact installed-runtime evidence, and an explicit author-linked fallback for
   `abstract-logging@2.0.1`. Source, local production image, and exact live digest verification pass:
   all 8 runtime files, 149 package manifests/roots, and 149 package legal files match the hashes at
   immutable historical source `3653cf6b…7fa4f`. For the later Phase 8.10 security-patched graph, the
   production audit, source attribution, replacement exact clean-commit artifact, extracted runtime,
   frozen production install/health, and focused fresh-checkout gates passed before the exact
   `v1.0.0` release. Phase 8.11 then deployed exact current source `0ac3b818…a112d` at digest
   `sha256:0ea3381f…87286` after the deterministic attribution/notices convergence correction. C11 is
   `QUALIFIED PASS — OWNER-AUTHORIZED SCOPE` only for the exact
   current live digest and bounded synthetic/authorized-data use. No blanket legal clearance
   is claimed; C12 ownership/asset attestations and any organizer verification remain separate.
3. **Public repository:** C10 is `PASS`. The repository is Public at exact current main
   `0ac3b8180cebdccd8c4b914443ebafa6831a112d`, tree
   `d4c621e981bf11e97513bbc49de3eb589eca33b3`; annotated tag `v1.0.0` and the Published/Latest
   Release remain on the earlier immutable release merge. The running service is bound to this exact
   current source at revision `data-incident-investigator-src-0ac3b8180ceb`. Private vulnerability
   reporting is enabled; preserve both Public and reporting states through this task.
4. **Judge access:** C14 is `PASS — OWNER-AUTHORIZED OPERATING WINDOW`. Public credential-free
   fixture service
   <https://data-incident-investigator-1071683558688.asia-southeast1.run.app> passed static-root,
   readiness, and canonical Removed schema column investigation smoke. Signed-in 2026-07-28
   read-only Console evidence showed the service ready at minimum `0` / maximum `1`, July net cost
   `₫0`, and active credit `100%` / `₫7,886,121.22` remaining through 2026-10-07. The owner
   superseded the earlier stop policy and committed to keep access through 2026-09-17 23:59 ICT,
   beyond judging; 20% remaining credit now triggers monitoring/escalation rather than automatic
   pre-judging shutdown. This is an operating commitment, not an absolute uptime or zero-cost
   guarantee. The Public-repository quickstart remains the durable fallback.
5. **Form/submission state:** Devpost registration records `Working solo`. Project `1117401` contains
   **Open / Wildcard**, `Vietnam`, the new-project selection, the exact repository/app/video/evidence
   links, five captioned PNGs, a thumbnail, DataHub technologies, English story, and optional
   feedback. The entrant personally operated the final agreement/submission gate; the signed-in
   finalization screen reports **Project submitted!**, **Submitted**, and **5/5**. The user-supplied
   residence and submission state do not independently establish age, sanctions/conflicts,
   ownership, IP, organizer acceptance, or the other personal/legal facts.
6. **Video host/link:** the selected authentic 2:50.20 male-voice derivative remains Public at
   <https://youtu.be/D5mvMqrhyDc>, has published authored English captions, and reported no YouTube
   copyright-check issue. The exact URL is included in the submitted project, so C18 and C19 are
   `PASS`; no organizer acceptance or prize result is claimed. The authentic 2:48.91 Phase 8.12
   candidate is a repository review asset only until a later QA-approved, separately authorized
   upload and Devpost synchronization. Its repository location is not Rules-listed video hosting.
7. **New-work/IP disclosure:** confirm all off-repository work, contributors, assistance, media,
   datasets, dependencies, and licences. Git timestamps alone are insufficient.
8. **English/accessibility:** the saved project and judge fields, gallery captions, offline synthetic
   male narration, and matching captions/transcript are English. Bounded synchronization,
   accessibility, privacy, audio, and media-rights evidence exists. English or translation is
   mandatory; captions remain a recommendation rather than an express Rules requirement. Entrant
   rights review remains open.
9. **Rule drift:** monitor Overview, Dates, Rules, Resources, incorporated Terms, and organizer
   messages through judging because the Rules reserve the right to change.

Phase 8.11 advances the technical named-integration seam to **PASS — LOCAL OSS**; the later
entrant-reported organizer clarification makes remote hosting optional for this Public
fixture/repository access model and advances C06, C07, and C28 to `PASS`. Integrated Phase 8.4A makes
C09 `PASS`; verified Phase 8.4B
Public access makes C10 `PASS`; Phase 8.7 provides C13's public fixture Project URL. Phase 8.8 prepares copy,
claim-mapped screenshots, quickstart, and rehearsal material. Phase 8.9 adds one authentic
functioning-project source and synchronized English review packet. Phase 8.9A adds the exact-frame
male-voice derivative using an offline installed Windows voice. Phase 8.11 publishes that derivative
Public on YouTube with authored English captions, completes individual `Working solo` registration,
and submits project `1117401` at 5/5 with `Open / Wildcard`, the exact Public video and app/repo
links, truthful English content, and judge media/information. Phase 8.12 prepares, without
publication or submission mutation, a deployed-UI video/caption/transcript packet, five replacement
screenshots, and a `1.0.1` PATCH candidate. No organizer acceptance, prize result, durable entrant
eligibility/IP attestation, or a prize result is claimed.
