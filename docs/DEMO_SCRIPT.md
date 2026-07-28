# Under-three-minute Phase 8.12 demo script

Status: **repository QA candidate; not yet uploaded to YouTube/Vimeo/Youku or linked in Devpost**.
The candidate is publicly accessible as a repository asset on its feature branch/PR after push; that
does not satisfy Rules-listed video hosting. The candidate is
[`phase-8-12-demo-voiceover.webm`](demo-video/phase-8-12-demo-voiceover.webm), recorded from exact
deployed source `0ac3b8180cebdccd8c4b914443ebafa6831a112d`. It is 2:48.91, 1440 × 900, VP8 plus
Opus, and uses offline Microsoft David male narration. The existing Public
[2:50 demo](https://youtu.be/D5mvMqrhyDc) and submitted Devpost project remain unchanged until a
separate post-QA synchronization gate.

Exact spoken text and timing:
[`PHASE_8_12_TRANSCRIPT.md`](demo-video/PHASE_8_12_TRANSCRIPT.md) and
[`phase-8-12-voiceover-captions.vtt`](demo-video/phase-8-12-voiceover-captions.vtt).

## Recording contract

- Public source:
  <https://data-incident-investigator-1071683558688.asia-southeast1.run.app>.
- App-only 1440 × 900 viewport; no browser/Windows/account chrome, credentials, private endpoints,
  notifications, external media, or generated UI frames.
- Exactly one synthetic **Removed schema column** incident. No second capture or incident is allowed
  for this candidate.
- The Public app is credential-free fixture mode, makes zero model calls, writes to no DataHub or
  production system, and executes no recommendation.
- The real DataHub integration claim is the separately validated repository-local DataHub Core
  `1.6.0` plus official MCP Server `0.6.0` path. User-reported organizer guidance says this local OSS
  path plus Public fixture/repository access is acceptable; this is not organizer acceptance or a
  Public live-MCP claim.

## Timed storyboard

| Scene       | Visible interaction                                                   | Exact narration topic                                                  |
| ----------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `0:03–0:10` | Product promise, fixture readiness, four-step read-only contract      | Auditable report with bounded evidence and impact                      |
| `0:14–0:23` | All seven visible incident playbooks                                  | Editable scenarios; Removed schema column is the judge path            |
| `0:28–0:36` | Select **Removed schema column** and show reviewable intake           | Canonical fixture prefills a focused question                          |
| `0:41–0:51` | Choose **Start investigation** once; reach completion                 | One bounded synthetic case; no model call or production write          |
| `0:52–1:05` | Verdict, `81% · high`, four facts, two impacts, nine calls, six steps | Plausible contributor, not proven cause                                |
| `1:10–1:24` | Schema-validated evidence path                                        | Top hypothesis's own fact and impact; provenance, not causality        |
| `1:30–1:39` | Blast radius and explicit bounds                                      | One dataset plus one dashboard within the displayed limits             |
| `1:48–1:59` | Investigation activity                                                | Observable operations only, never hidden reasoning                     |
| `2:04–2:13` | Ranked hypotheses, code-owned factors, resolved evidence              | Transparent deterministic scoring                                      |
| `2:21–2:32` | Human-review recommendations                                          | `not_executed`; no automatic remediation                               |
| `2:36–2:48` | Deterministic Markdown export context                                 | Local DataHub OSS/MCP proof; Public judge service remains fixture-only |

## Cold-start and repository fallback

1. Allow the Public page up to 30 seconds to show **Fixture metadata · Ready**.
2. If unavailable, stop the take. Use the Node 24 / pnpm `11.9.0` repository-local fixture commands
   in [`JUDGE_QUICKSTART.md`](JUDGE_QUICKSTART.md) and label it **repository-local fixture fallback**.
3. Never splice a fallback result into the Public take or simulate a completed incident.
4. If both paths fail, use the five verified screenshots only as a labeled storyboard; record a new
   functioning take only in a separately authorized future gate.

## Rehearsal and QA checklist

### Truth and interaction

- [x] 2:48.91 and one continuous authentic functioning-project flow.
- [x] Seven playbooks, selected intake, completion, verdict, confidence, linked evidence path,
      blast radius, activity, hypotheses, safe recommendations, and export context are visible.
- [x] “Plausible contributor” is never upgraded to confirmed cause.
- [x] Evidence-path nodes follow the top hypothesis's `evidenceIds` and linked impact
      `hypothesisIds`.
- [x] `81% · high` is code-owned evidence scoring, not an LLM probability.
- [x] Blast radius is complete only within explicit fixture bounds.
- [x] Recommendations remain **Not Executed**.
- [x] Public fixture and local real DataHub OSS/MCP proof are clearly separated.

### Voice, captions, accessibility

- [x] Offline Microsoft David Desktop Adult/Male narration; no account, credential, network call,
      subscription, fee, or imitation of the entrant/named person.
- [x] Eleven authored English caption cues match the exact spoken text and visible scene.
- [x] Decoded speech begins inside every cue and ends before the next scene; final margin is
      `0.90 s`.
- [x] Stable high-resolution framing, readable text, intentional silence, no rapid flashes, and no
      reliance on color or sound alone.

### Media and rights

- [x] Final WebM: 168.91 s, 1440 × 900, VP8, Opus 48 kHz stereo.
- [x] Decoded peak `-1.83 dBFS`, integrated RMS `-24.06 dBFS`, active-speech RMS `-21.27 dBFS`,
      zero clipped samples, and digital silence before the first cue.
- [x] Nine source/final frame pairs at representative actions measure PSNR `44.68–52.92 dB`;
      re-encoding adds no inserted, deleted, or synthetic UI scene.
- [x] Five app-only PNGs were visually inspected; no chrome, account/session surface, credential,
      personal data, private endpoint, external clip, logo treatment, stock media, or music appears.
- [x] Captions/transcript, local voice provenance, media hashes/probes, and synthetic-fixture
      boundaries are available for independent QA.
- [ ] Entrant eligibility, ownership/IP/media-rights facts, organizer acceptance, and any prize
      result remain entrant/organizer facts not independently established by repository evidence.

## Post-QA synchronization gate

Only after canonical QA PASS may a separately authorized controller:

1. upload the exact reviewed WebM and VTT to a Rules-listed host without deleting/unlisting the old
   video;
2. capture the final Public URL and platform checks;
3. replace the Devpost video URL/copy/gallery according to
   [`PHASE_8_12_SUBMISSION_SYNC.md`](PHASE_8_12_SUBMISSION_SYNC.md);
4. save/preview/resubmit project `1117401` and preserve the new receipt.

This preparation PR performs none of those external mutations.
