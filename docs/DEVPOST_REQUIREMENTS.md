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

**Deadline risk:** submissions were open at access time, but the repository still had multiple
submission blockers: a qualifying named DataHub integration, Apache 2.0 licensing, public repository,
testable Project URL/access, video, form completion, entrant eligibility/registration attestations,
and submission-specific IP/data review. No post-deadline substantive edit is allowed, so these must
not be left for the final hours. [[R §§4–5](https://datahub.devpost.com/rules), accessed 2026-07-24]

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

The integrated Phase 8.3 `main` remains MIT-licensed. The user explicitly authorized the coordinated
Apache-2.0 relicense on 2026-07-25, and Phase 8.4A implements it on a Draft branch across `LICENSE`,
all seven private manifests, the README, contributor terms, and direct repository documentation.
The Apache condition remains **OPEN** until independent QA, normal merge, exact-main CI success, and
GitHub detected-license verification. Repository visibility remains Private.

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

Positioning recommendation: the current incident-investigation workflow most directly fits **Agents
That Do Real Work** and can also fit **Open / Wildcard**. This is a recommendation, not a rule or a
track selection already made.

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
vertical-slice success demonstrate genuine application use of the MCP protocol, but are not live
DataHub validation. Live/judge-access evidence remains credential/service-gated.

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

These are repository facts on the Phase 8.2 branch from exact starting `main`
`8144fb19a6daf2670c4143b005b5e1aea25c138a` (tree
`aaa53c1708020d85bee8dc4bfe09a437778ecbac`), not competition claims:

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
- The current RC performs zero model calls and does not read `OPENAI_API_KEY`. It therefore must not
  claim LLM/model integration. See [README](../README.md), [agent design](AGENT_DESIGN.md), and
  [deployment](DEPLOYMENT.md).
- The exact direct API Markdown endpoint is
  **`GET /incidents/:incidentId/report.md`**. Browser traffic uses the `/api` prefix through its web
  boundary. See [API contracts](API_CONTRACTS.md).
- The supported target is a generic Node 24 host serving static web output with a same-origin `/api`
  reverse proxy. The repository does not claim a Docker, cloud, or public deployment. See
  [deployment](DEPLOYMENT.md).
- The bounded direct GraphQL adapter remains backward compatible. Phase 8.2 adds a distinct
  `datahub-mcp` provider using the official MCP SDK and exact read-only `search`/`get_lineage`
  allowlist, with startup validation, bounded/sanitized failure behavior, explicit unsupported
  recent-changes semantics, and a protocol-level product vertical slice. No live authorized DataHub
  MCP service or judge-access path has been validated, so named-integration compliance is `PARTIAL`.
- [GitHub](https://github.com/toannnnq1424/data-incident-investigator) showed the repository as
  **Private** at the 2026-07-24 access checkpoint. Visibility must not change during Phase 8.1. The
  Rules prove that a public repository is required for submission, but any later visibility change
  needs separate authorization and a final secret/history/readiness review.

## Compliance matrix

Status meanings: **PASS** = current exact-main evidence satisfies the rule; **PARTIAL** = useful
evidence exists but the complete submission condition is not yet met; **OPEN** = required action or
entrant verification remains; **NOT REQUIRED** = the reviewed official sources do not mandate it.

Every source link in the matrix was accessed at the 2026-07-24 checkpoint in the source register.

| ID  | Source                                                                                                 | Explicit rule or decision                                                                                                                   | Current evidence/status                                                                                                                                                                                                           | Status       | Owner phase             | Exact next action                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C01 | [R §3](https://datahub.devpost.com/rules)                                                              | Entrant is age/residency/conflict eligible.                                                                                                 | Repository cannot prove personal eligibility.                                                                                                                                                                                     | OPEN         | Entrant / Phase 8 final | Entrant reviews Rules §3 and records an eligibility attestation before registration.                                                                         |
| C02 | [R §4](https://datahub.devpost.com/rules), [T §5](https://info.devpost.com/legal/terms-of-service)     | Create a Devpost account, join/register, and complete required fields by the deadline.                                                      | No registration, consent, or submission was performed.                                                                                                                                                                            | OPEN         | Entrant / Phase 8 final | Register only under separate authorization; capture the final form checklist without submitting early.                                                       |
| C03 | [R §§3–4](https://datahub.devpost.com/rules), [T §5](https://info.devpost.com/legal/terms-of-service)  | Team/organization appoints an eligible authorized representative.                                                                           | Entrant mode and team membership are not recorded.                                                                                                                                                                                | OPEN         | Entrant / Phase 8 final | Decide individual/team/organization entry and, if applicable, record representative/member approval.                                                         |
| C04 | [R §4](https://datahub.devpost.com/rules)                                                              | Project is newly created during the Submission Period.                                                                                      | First repository commit is 2026-07-18, inside the stated window, but Git timing covers only repository work; no explicit attestation covers all work, off-repository work, or contributor work.                                   | PARTIAL      | Entrant / Phase 8 final | Provide an explicit attestation covering all project work, including off-repository and contributor work, and disclose any allowed prior work under C05.     |
| C05 | [R §4](https://datahub.devpost.com/rules)                                                              | Disclose non-standard pre-existing work; standard tools/AI coding assistants are allowed.                                                   | Git history records development, but no entrant-level disclosure inventory exists.                                                                                                                                                | PARTIAL      | Phase 8.2 / entrant     | Audit off-repository assets/code and add only truthful disclosures to final copy.                                                                            |
| C06 | [R §4](https://datahub.devpost.com/rules)                                                              | Working application uses open-source DataHub plus at least one named integration.                                                           | Explicit `datahub-mcp` mode uses the official SDK and only read-only `search`/`get_lineage`; protocol fixture and product vertical slice pass, but live/judge-access MCP validation is absent.                                    | PARTIAL      | Phase 8.2–8.3           | Validate the exact path against an authorized DataHub Core/Cloud MCP endpoint, then show the same evidence in judge instructions, video, and copy.           |
| C07 | [R §4](https://datahub.devpost.com/rules)                                                              | App installs/runs consistently on its stated intended platform.                                                                             | Node 24 runbook, fixture smoke, frozen lock, and MCP protocol/product-slice evidence exist; a clean live MCP judge path does not.                                                                                                 | PARTIAL      | Phase 8.2–8.3           | Validate the final named-integration path from clean judge instructions on the declared platform.                                                            |
| C08 | [R §4](https://datahub.devpost.com/rules)                                                              | Submission functionality matches text and video.                                                                                            | Current docs describe RC behavior, but final submission/video do not exist.                                                                                                                                                       | PARTIAL      | Phase 8.3               | Freeze verified claims after integration; record a claim-to-demo checklist.                                                                                  |
| C09 | [R §4](https://datahub.devpost.com/rules)                                                              | Submitted repo uses Apache 2.0 visible at top/About.                                                                                        | The authorized Apache-2.0 migration is implemented only on the Phase 8.4A Draft branch. Integrated main and GitHub detection remain MIT until QA, normal merge, and exact-main CI succeed.                                        | OPEN         | Phase 8.4A              | Complete independent QA, normal merge, exact-main CI, and GitHub detected-license verification; only then may C09 change status.                             |
| C10 | [R §4](https://datahub.devpost.com/rules)                                                              | Public source repository with all necessary source/assets/instructions.                                                                     | GitHub remains Private. The separate Public authorization is reserved for Phase 8.4B and is not consumed by this branch or its merge.                                                                                             | OPEN         | Phase 8.4B              | After 8.4A integration evidence, perform the separately scoped visibility transition and verify public clone/setup/exposure surfaces.                        |
| C11 | [R §§4, 7](https://datahub.devpost.com/rules), [S](https://datahub.devpost.com/resources)              | All third-party SDK/API/data/content use is authorized and licence-compliant.                                                               | Offline frozen-graph evidence covers 138/138 declared licenses (122 MIT, 10 ISC, 5 BSD-3-Clause, 1 BSD-2-Clause), 137 legal files, 0 NOTICE files, and the MCP SDK MIT declaration/LICENSE; this is evidence, not legal approval. | PARTIAL      | Legal/owner + Phase 8.3 | Review every legal text/obligation and missing legal file, then audit remaining DataHub tool, dataset, and media rights.                                     |
| C12 | [R §§4, 7](https://datahub.devpost.com/rules), [T §7](https://info.devpost.com/legal/terms-of-service) | Submission is original/solely owned and does not violate third-party rights.                                                                | Git provenance exists; entrant/contributor ownership attestation is absent.                                                                                                                                                       | PARTIAL      | Entrant / Phase 8 final | Confirm contributor and asset rights, including any assistance or external work, before submission.                                                          |
| C13 | [R §4](https://datahub.devpost.com/rules), [O](https://datahub.devpost.com/)                           | Provide an easily testable Project URL.                                                                                                     | No public live URL or finalized judge-ready repository setup exists.                                                                                                                                                              | OPEN         | Phase 8.3               | Choose hosted demo or public-repo setup path and test it from a clean, unauthenticated judge context.                                                        |
| C14 | [R §4](https://datahub.devpost.com/rules)                                                              | Test access is free and unrestricted through 2026-08-31 17:00 EDT.                                                                          | No durable judge-access plan or access-period owner exists.                                                                                                                                                                       | OPEN         | Phase 8.3 / operator    | Record URL, uptime/access owner, expiry no earlier than judging end, and fallback setup instructions.                                                        |
| C15 | [R §4](https://datahub.devpost.com/rules)                                                              | Private test site credentials, if used, are in testing instructions.                                                                        | No private test site is selected; no credentials are stored.                                                                                                                                                                      | NOT REQUIRED | Phase 8.3               | If a private site is later chosen, provision judge-only access out of repo and place it only in the authorized form field.                                   |
| C16 | [R §4](https://datahub.devpost.com/rules), [O](https://datahub.devpost.com/)                           | Text describes summary, features/functionality, technologies, and data.                                                                     | `DEVPOST_SUBMISSION.md` is an outdated draft and calls DataHub “planned.”                                                                                                                                                         | PARTIAL      | Phase 8.3               | Rewrite from final verified behavior after Phase 8.2; retain limitations and exact integration evidence.                                                     |
| C17 | [R §4](https://datahub.devpost.com/rules)                                                              | State intended platform and complete setup/testing instructions.                                                                            | Node 24 host/runbook exists, including same-origin `/api`; no concise judge path exists.                                                                                                                                          | PARTIAL      | Phase 8.3               | Create a clean judge quickstart for the final repo/URL and time it end to end.                                                                               |
| C18 | [R §4](https://datahub.devpost.com/rules)                                                              | Public functioning-project video is required; the Rules say it should be under three minutes and judges need not watch beyond minute three. | Demo script exists; no final video.                                                                                                                                                                                               | OPEN         | Phase 8.3               | Record the final functioning named-integration flow and target below 3:00 as the official risk-reduction and judging-attention gate.                         |
| C19 | [R §4](https://datahub.devpost.com/rules)                                                              | Video publicly visible on YouTube, Vimeo, or Youku.                                                                                         | No video URL or hosting/visibility selection.                                                                                                                                                                                     | OPEN         | Phase 8.3               | Upload only under separate authorization; use Public visibility unless organizer confirms unlisted.                                                          |
| C20 | [R §4](https://datahub.devpost.com/rules)                                                              | Video avoids unauthorized trademarks/music/material and is English or translated.                                                           | No final media asset audit or translation exists.                                                                                                                                                                                 | OPEN         | Phase 8.3               | Use owned/licensed assets, audit the edit, and provide English narration/captions/transcript.                                                                |
| C21 | [R §4](https://datahub.devpost.com/rules)                                                              | All submitted materials are English or English-translated.                                                                                  | Repository and draft copy are English; final form/video/testing material is pending.                                                                                                                                              | PARTIAL      | Phase 8.3               | Run a final English/translation completeness review over every submitted field and asset.                                                                    |
| C22 | [R §4](https://datahub.devpost.com/rules)                                                              | Required form fields are complete during the Submission Period.                                                                             | Public pages do not expose the exact current form control list.                                                                                                                                                                   | OPEN         | Entrant / Phase 8 final | Inspect the joined form only when authorized; record required controls, save draft, and verify receipt before deadline.                                      |
| C23 | [O](https://datahub.devpost.com/)                                                                      | Choose/position the project against one or more published challenges.                                                                       | Product fits Agents That Do Real Work/Open, but no track selection is recorded.                                                                                                                                                   | OPEN         | Phase 8.3               | Select the final challenge(s) supported by the implemented integration and tailor evidence without overclaiming.                                             |
| C24 | [R §§3–4](https://datahub.devpost.com/rules)                                                           | Provide teammate/representative information required by the form.                                                                           | Exact form fields and entrant mode are unknown.                                                                                                                                                                                   | OPEN         | Entrant / Phase 8 final | Resolve membership first, then complete only the form's actual required teammate fields.                                                                     |
| C25 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | Screenshots/images required by the form.                                                                                                    | Overview only recommends sample outputs; exact image controls are unknown.                                                                                                                                                        | OPEN         | Phase 8.3               | Inspect authorized form; prepare truthful screenshots if required or useful, without assuming a count.                                                       |
| C26 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | Sample outputs.                                                                                                                             | Official sources recommend but do not require them; deterministic JSON/Markdown output exists, including `GET /incidents/:incidentId/report.md`.                                                                                  | NOT REQUIRED | Phase 8.3               | Optionally publish a sanitized fixture output if it improves judging and rights/security checks pass.                                                        |
| C27 | [R §5](https://datahub.devpost.com/rules)                                                              | No changes to the submitted entry after deadline except narrow organizer-approved corrections.                                              | Submission is not created.                                                                                                                                                                                                        | OPEN         | Phase 8 final           | Finish a pre-deadline content/access audit, save proof of receipt, and treat submitted content as frozen.                                                    |
| C28 | [R §6](https://datahub.devpost.com/rules)                                                              | Stage 1 theme and required API/SDK viability.                                                                                               | Named DataHub MCP protocol integration is implemented and product-tested; live service and final submission visibility remain unverified.                                                                                         | PARTIAL      | Phase 8.2–8.3           | Capture authorized live/judge evidence and make the bounded integration visible in final materials.                                                          |
| C29 | [R §6](https://datahub.devpost.com/rules)                                                              | Stage 2 equal criteria: DataHub, execution, originality, usefulness, submission quality.                                                    | Strong fixture/fixed-input evidence and an MCP product vertical slice exist; live DataHub inputs/provider state can vary and no final submission package exists.                                                                  | PARTIAL      | Phase 8.2–8.3           | Map final evidence to all five criteria without claiming live-mode determinism; do not convert equal weighting into an organizer-published percentage claim. |
| C30 | [R §4](https://datahub.devpost.com/rules), [T §5](https://info.devpost.com/legal/terms-of-service)     | Respond to organizer verification/access requests.                                                                                          | No operational owner or response plan exists.                                                                                                                                                                                     | OPEN         | Entrant / Phase 8 final | Name a monitored contact and retain runnable access/source evidence through judging.                                                                         |
| C31 | [R §8](https://datahub.devpost.com/rules)                                                              | Potential winner returns verification forms within ten business days.                                                                       | Conditional future obligation.                                                                                                                                                                                                    | OPEN         | Entrant / winner gate   | Monitor the registered email through winner verification and return legally reviewed forms on time.                                                          |
| C32 | [R §4](https://datahub.devpost.com/rules)                                                              | DataHub Cloud.                                                                                                                              | Official pages do not require it.                                                                                                                                                                                                 | NOT REQUIRED | —                       | Do not add or claim DataHub Cloud solely for compliance.                                                                                                     |
| C33 | [O](https://datahub.devpost.com/), [R §§4, 6](https://datahub.devpost.com/rules)                       | LLM/model call.                                                                                                                             | The current investigation path makes zero model calls; fixture mode and algorithms given fixed inputs are deterministic, while live DataHub inputs/provider state can vary; official pages do not mandate a model call.           | NOT REQUIRED | —                       | Preserve the truthful no-model statement unless a separately scoped implementation changes it.                                                               |
| C34 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | OpenAI key.                                                                                                                                 | Current RC does not read `OPENAI_API_KEY`; official pages do not require OpenAI.                                                                                                                                                  | NOT REQUIRED | —                       | Do not request, enter, or claim an OpenAI key for compliance.                                                                                                |
| C35 | [R §4](https://datahub.devpost.com/rules)                                                              | Particular cloud or public production deployment.                                                                                           | Generic Node 24 + same-origin `/api` is documented; no public deployment exists.                                                                                                                                                  | NOT REQUIRED | Phase 8.3               | Satisfy Project URL/test access by the chosen supported path; do not infer a required cloud provider.                                                        |
| C36 | [O](https://datahub.devpost.com/), [R §4](https://datahub.devpost.com/rules)                           | Separate binary/archive upload.                                                                                                             | Verified RC archive history exists, but no rule requires upload and the Draft RC Release has no user-uploaded assets.                                                                                                             | NOT REQUIRED | —                       | Do not upload an artifact merely for Devpost; keep RC Release and tag immutable.                                                                             |
| C37 | [O](https://datahub.devpost.com/), [R §§6, 8](https://datahub.devpost.com/rules)                       | Feedback survey for the $50 bonus.                                                                                                          | Optional and not entered.                                                                                                                                                                                                         | NOT REQUIRED | Entrant / optional      | Consider only with separate authorization; one complete actionable feedback submission per entrant.                                                          |

Current matrix totals after the Phase 8.3 preparation audit are
**0 PASS / 12 PARTIAL / 17 OPEN / 8 NOT REQUIRED** across 37 rows.

## Open blockers and verification questions

1. **Live/judge MCP evidence:** the local technical integration and protocol product slice exist, but
   no authorized live DataHub Core/Cloud MCP endpoint or durable judge-access configuration has been
   validated. Do not present protocol fixtures as live evidence.
2. **Licence:** Phase 8.4A consumes the explicit Apache-2.0 authorization and implements the
   coordinated project relicense on a Draft branch. The exact frozen graph remains 138 declared
   licenses, 137 legal files, and 0 package NOTICE files. The source/release artifact does not bundle
   dependencies, so no project NOTICE is added. The missing `abstract-logging@2.0.1` legal file and
   package-specific obligations remain a C11 `PARTIAL` caveat and a mandatory review before any
   future vendoring or bundled distribution.
3. **Public repository:** required for submission, but visibility remains Private until the residual
   metadata review in [`PUBLIC_SOURCE_APACHE_READINESS.md`](PUBLIC_SOURCE_APACHE_READINESS.md) is
   complete and a separate explicit visibility authorization is recorded.
4. **Judge access:** choose and verify a Project URL path, intended platform, clean setup, and free
   access through judging. A public live production deployment is one option, not the only option.
5. **Form schema:** exact screenshot/cover image, teammate, challenge selector, credentials, and other
   live Devpost controls are not enumerated publicly. Inspect only after authorized registration.
6. **Video visibility:** ask `support@devpost.com` whether unlisted hosting qualifies if Public is not
   feasible; current Rules only say publicly visible.
7. **New-work/IP disclosure:** confirm all off-repository work, contributors, assistance, media,
   datasets, dependencies, and licences. Git timestamps alone are insufficient.
8. **English/accessibility:** English or translation is mandatory. Captions are recommended for
   accessibility but not stated as mandatory.
9. **Rule drift:** re-read Overview, Dates, Rules, Resources, and incorporated Terms shortly before
   submission because the Rules reserve the right to change.

Phase 8.2 closes only the local named-integration technical seam and remains `PARTIAL` without
live/judge credentials. Phase 8.4A consumes only the independently approved Apache-2.0 decision and
keeps both C09 and C10 `OPEN` while the change is a Draft branch. It performs no registration,
submission, consent, upload, deployment, credential entry, live provisioning, visibility change, or
tag/Release mutation.
