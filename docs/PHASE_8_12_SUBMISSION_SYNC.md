# Phase 8.12 release and submission synchronization packet

Status: **REPOSITORY QA CANDIDATE — NO YOUTUBE/DEVPOST/RELEASE MUTATION YET**.

The current Public YouTube video remains <https://youtu.be/D5mvMqrhyDc>, and Devpost project
`1117401` remains submitted at <https://devpost.com/software/data-incident-investigator>. After
push, the candidate is publicly accessible as an asset on the Public GitHub feature branch/PR. That
repository visibility does not satisfy Rules-listed video hosting. This packet does not upload the
candidate to YouTube/Vimeo/Youku, edit/save/resubmit Devpost, create a tag/Release, deploy, or change
account/consent state.

## Exact local media candidate

| Property              | Evidence                                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository file       | [`demo-video/phase-8-12-demo-voiceover.webm`](demo-video/phase-8-12-demo-voiceover.webm)                                                                                                                                                            |
| Size / SHA-256        | `25,837,838` bytes / `fea72b6552be3483c7905cb282f79f89823427583101f9d4de5e31b910454fa2`                                                                                                                                                             |
| Container / streams   | WebM; VP8 video; Opus audio                                                                                                                                                                                                                         |
| Duration / picture    | `168.91 s`; 1440 × 900; square pixels                                                                                                                                                                                                               |
| Audio                 | 48 kHz stereo; decoded peak `-1.83 dBFS`; zero clipped samples                                                                                                                                                                                      |
| Narrator              | Microsoft David Desktop, Adult/Male, offline Windows SAPI, rate `0`, no account/network/fee                                                                                                                                                         |
| Captions / transcript | [`phase-8-12-voiceover-captions.vtt`](demo-video/phase-8-12-voiceover-captions.vtt) / [`PHASE_8_12_TRANSCRIPT.md`](demo-video/PHASE_8_12_TRANSCRIPT.md)                                                                                             |
| Source provenance     | Exact deployed source `0ac3b8180cebdccd8c4b914443ebafa6831a112d`; one synthetic fixture incident; local silent source `11,616,240` bytes at SHA-256 `283137442816c59ea606d682c39387b7cd56e1e134b1e37a93bea75169c76f9b` is QA-only and not committed |
| Visual identity       | Nine source/final representative pairs measure PSNR `44.68–52.92 dB`; no inserted/generated UI scene                                                                                                                                                |

## Proposed Rules-listed video update

Do not substitute the placeholder until the exact reviewed media and authored VTT are Public and
verified.

- **Placeholder:** `[PHASE_8_12_PUBLIC_VIDEO_URL_AFTER_QA]`
- **Proposed title:** `Data Incident Investigator — 2:49 Functioning Demo (Fixture + Local DataHub OSS/MCP)`
- **Visibility:** Public
- **Category/audience:** project demo; not made for children; synthetic AI narrator disclosure where
  the host requests it
- **Captions:** upload the exact repository VTT, select English, publish, then verify all 11 cues
- **Do not:** delete, unlist, or overwrite the historical video; add music; enable paid promotion;
  enter credentials/payment; claim Public live MCP, organizer acceptance, or prize result

Proposed description:

> Data Incident Investigator turns a broken metric into an auditable, read-only incident report.
> This 2:49 functioning demo uses the credential-free synthetic fixture deployment and shows seven
> incident playbooks, the canonical Removed schema column investigation, top-hypothesis-linked
> evidence provenance, transparent confidence, bounded blast radius, safe human next steps, and
> deterministic Markdown export.
>
> Public app:
> https://data-incident-investigator-1071683558688.asia-southeast1.run.app
>
> Public repository:
> https://github.com/toannnnq1424/data-incident-investigator
>
> Judge quickstart:
> https://github.com/toannnnq1424/data-incident-investigator/blob/main/docs/JUDGE_QUICKSTART.md
>
> Release:
> https://github.com/toannnnq1424/data-incident-investigator/releases
>
> Devpost:
> https://devpost.com/software/data-incident-investigator
>
> Boundary: the Public app is credential-free fixture mode, makes zero model calls, performs no
> automatic remediation, and does not connect to live DataHub. The repository's read-only adapter
> path is separately validated locally against DataHub Core 1.6.0 and official DataHub MCP Server
> 0.6.0; reproducible local OSS/MCP steps are in the repository.
>
> Narration is an offline Microsoft Windows synthetic male voice. No music or third-party clip is
> used.

## Exact Devpost edit set

Apply only after the final hosted URL exists and canonical QA authorizes synchronization.

| Devpost surface          | Current                                                                                        | Proposed                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Video URL                | `https://youtu.be/D5mvMqrhyDc`                                                                 | `[PHASE_8_12_PUBLIC_VIDEO_URL_AFTER_QA]`                                                        |
| Try it out / Project URL | Current Cloud Run URL                                                                          | No change                                                                                       |
| Source code              | Public GitHub repository                                                                       | No change                                                                                       |
| Challenge                | Open / Wildcard                                                                                | No change                                                                                       |
| Team                     | Working solo                                                                                   | No change                                                                                       |
| Technologies             | DataHub OSS, DataHub MCP Server, TypeScript, React, Fastify, Zod, Playwright, Google Cloud Run | Keep; do not add an unproven service                                                            |
| Submission state         | Submitted / 5 of 5                                                                             | Save, preview, then resubmit only after confirming all fields and entrant-owned agreement state |

Replace the five gallery images in this order:

1. [`phase-8-12-01-product-contract.png`](demo-assets/phase-8-12-01-product-contract.png)
   **Alt/caption:** “Data Incident Investigator product promise, fixture readiness, and four-step
   read-only investigation contract.”
2. [`phase-8-12-02-seven-playbooks.png`](demo-assets/phase-8-12-02-seven-playbooks.png)
   **Alt/caption:** “Seven editable data-incident playbooks with Removed schema column identified as
   the canonical judge path.”
3. [`phase-8-12-03-verdict-confidence.png`](demo-assets/phase-8-12-03-verdict-confidence.png)
   **Alt/caption:** “Completed evidence-backed verdict showing plausible-contributor wording,
   81-percent confidence, four facts, two supported impacts, and bounded execution.”
4. [`phase-8-12-04-evidence-path.png`](demo-assets/phase-8-12-04-evidence-path.png)
   **Alt/caption:** “Schema-validated evidence path from incident to selected dataset, removed-column
   fact, top hypothesis, and linked downstream impact; connectors show provenance, not causality.”
5. [`phase-8-12-05-export-context.png`](demo-assets/phase-8-12-05-export-context.png)
   **Alt/caption:** “Two bounded downstream impacts with evidence provenance, deterministic Markdown
   export, and the start of the observable investigation activity trail.”

Replace stale story statements with these exact boundaries:

- **How it works:** “The read-only workflow finds bounded context, traces lineage, tests factual
  evidence, ranks evidence-linked hypotheses with code-owned scoring, and explains only supported
  downstream impact.”
- **DataHub:** “The real integration path passed a localhost-only proof against DataHub Core 1.6.0
  and the official DataHub MCP Server 0.6.0. The Public judge deployment intentionally remains
  credential-free fixture mode; remote MCP hosting is not claimed.”
- **Judge result:** “For the canonical Removed schema column fixture, the report labels the leading
  result a plausible contributor, shows 81% high evidence confidence, links the displayed fact and
  impact to that top hypothesis, and keeps recommendations Not Executed.”
- **Limitations:** “Only Removed schema column has the rich checked-in browser fixture. MCP recent
  changes remain unsupported by the official tool surface. Incidents are process-local. Public
  availability is an owner commitment, not an uptime guarantee. No model call, DataHub write-back,
  automatic remediation, organizer acceptance, or prize result is claimed.”

Before resubmission, verify the Public page preview shows the new video, five new images, current app
URL, repository URL, truthful English copy, **Open / Wildcard**, and no truncated caption. The
entrant must personally review any renewed Rules/Terms, eligibility, IP/media-rights, or consent
control; this packet does not answer those facts.

## Proposed `v1.0.1` release

`1.0.1` is a SemVer PATCH: it contains backward-compatible judge-UX/provenance fixes, deterministic
runtime-attribution reliability, version metadata alignment, and submission media/docs. It adds no
breaking route/schema/command/environment change and no dependency upgrade.

- **Candidate base:** `0ac3b8180cebdccd8c4b914443ebafa6831a112d`
- **Tag:** annotated immutable `v1.0.1`
- **Required target:** the future normal merge commit whose ordered parents are the exact candidate
  base and the independently approved Phase 8.12 feature HEAD
- **Forbidden targets:** the feature HEAD, a squash/rebase commit, `v1.0.0`, `v1.0.0-rc.1`, or any
  later evolving main
- **Release state:** publish only after exact merged-main CI succeeds; no uploaded binary asset is
  required unless the release checklist separately authorizes and verifies one
- **Historical state:** preserve `v1.0.0`, its Published/Latest Release, and the
  `v1.0.0-rc.1` tag/Draft Release

Proposed release notes are exactly the `[1.0.1] - 2026-07-29` section of `CHANGELOG.md`. The exact
tag target SHA is intentionally unknown until normal merge; inventing it before merge would violate
the version policy.
