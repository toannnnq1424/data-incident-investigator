# Phase 8.9 / 8.9A demo-video packet

Status: **repository candidate / PARTIAL only**. The authentic silent source is publicly accessible
on the Public GitHub `main` branch after merged PR #58. This Phase 8.9A feature branch/Draft PR adds
a separate synchronized English male-voice derivative as another Public GitHub repository asset.
Neither file has been uploaded to or made publicly visible on YouTube, Vimeo, or Youku, linked or
entered in Devpost, accepted by an organizer, or submitted. GitHub repository access does not satisfy
the Rules' required video-host and form-link condition.

## Review

Open [`review.html`](review.html) in a browser. It presents the voiced derivative first with its
default external English captions, followed by the unchanged silent source for provenance.

Files:

- [`phase-8-9a-demo-voiceover.webm`](phase-8-9a-demo-voiceover.webm) — the real Phase 8.9 video
  frames with synchronized synthetic male English narration.
- [`phase-8-9a-voiceover-captions.vtt`](phase-8-9a-voiceover-captions.vtt) — exact voice-matched
  English captions.
- [`VOICEOVER_TRANSCRIPT.md`](VOICEOVER_TRANSCRIPT.md) — exact spoken script and readable
  transcript.
- [`phase-8-9-demo-candidate.webm`](phase-8-9-demo-candidate.webm) — unchanged authentic silent
  source: one continuous public credential-free fixture interaction.
- [`phase-8-9-demo-captions.vtt`](phase-8-9-demo-captions.vtt) and
  [`TRANSCRIPT.md`](TRANSCRIPT.md) — unchanged Phase 8.9 silent-source narrative.
- [`review.html`](review.html) — repository review surface using native video and caption controls.

## Media identity

| Property                | Silent source                                                                                         | Phase 8.9A voiced derivative                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Container               | Matroska / WebM                                                                                       | Matroska / WebM                                                            |
| Video                   | VP8, 1440 × 900, square pixels, 25 fps                                                                | Same VP8 packet stream, 1440 × 900, square pixels, 25 fps                  |
| Audio                   | None                                                                                                  | Opus, 48 kHz, mono, nominal 96 kb/s                                        |
| Captions                | External human-reviewed English WebVTT                                                                | External English WebVTT matching the synthetic speech                      |
| Container duration      | `170.20 s`                                                                                            | `170.20 s`; video `170.200 s`, audio `170.198 s`, decoded audio `170.18 s` |
| Size                    | 11,074,997 bytes                                                                                      | 13,185,933 bytes                                                           |
| SHA-256                 | `f7cef629fa03db6113949e1b347004230158b05f695258454278cc7473f14e18`                                    | `f52daa606f3cf9f627909e23422ca2d14fd92db1f5c4ed6ca304744c5608ab33`         |
| Git blob                | `743fd02d02ef9397d98b27825054d7253e039a69`                                                            | `30a1f2b768a85599d0dfd0bdb95c0170ed4b2e4f`                                 |
| Extracted VP8 packet ID | 11,043,338 bytes; SHA-256 `a1f8e79698cf8857fb48d25ce7370def3ad689569bac80b31be02db0dcb0dfea`          | Byte-identical size and SHA-256                                            |
| Copy-PTS framehash ID   | 4,255 rows; 476,776 bytes; SHA-256 `3bdd38f1026dca7dc670b967231418df2d168158d1093b57f1ee8d9467a0dd6e` | Byte-identical rows, size, and SHA-256                                     |

The matching extracted VP8 payload and copy-timestamp framehash identities prove that all 4,255
video packets retain the source PTS, DTS, duration, size, and content hash. No application frame was
generated, re-encoded, inserted, removed, or retimed for Phase 8.9A.

## Narrator, tooling, cost, and rights boundary

- No callable Codex/ChatGPT speech-export capability is available in this task. The selected voice is
  **Microsoft Mark — English (United States)**, identified locally as Microsoft, Adult, and Male.
- Mark is an installed Windows OneCore synthetic voice, invoked offline through Windows SAPI at its
  default rate (`0`) and volume (`100`). The narration is framed as an AI narrator; it is not the
  entrant, the user, or an imitation of a named real person.
- Synthesis used no network, API key, external account, credential, subscription, per-use fee, or
  paid credit. ElevenLabs was neither needed nor accessed.
- The installed Windows voice is governed by the host's existing Microsoft/Windows licence. No voice
  model or third-party binary is copied into the repository, and no separate broad redistribution or
  legal-clearance claim is made for the generated output. The entrant's final media-rights review
  remains open.
- Existing local FFmpeg `n4.4.4-6-gd5fa6e3a91` assembled and normalized PCM, stream-copied VP8, and
  encoded native Opus. VLC `3.0.16` independently decoded the final Opus track for verification. No
  tool, package, manifest, lockfile, application code, or runtime behavior was installed or changed.

## Final audio and A/V synchronization

Independent decoding of the final WebM produced 48 kHz, mono, signed 16-bit PCM with:

- integrated loudness `-18.0 LUFS`;
- loudness range `7.1 LU`;
- true peak `-1.0 dBTP` and sample peak `-1.046 dBFS`;
- zero clipped samples; and
- exact digital silence before the first cue at four seconds.

Activity was measured in decoded 20 ms blocks above `-45 dBFS`. Every utterance starts near its
matching visible-action boundary and finishes before the next boundary:

| Cue | Visible/caption window | Decoded spoken activity | Silent margin before next boundary |
| --- | ---------------------- | ----------------------- | ---------------------------------- |
| 1   | `04.00–14.00`          | `04.14–09.52`           | `4.48 s`                           |
| 2   | `14.00–31.00`          | `14.14–21.54`           | `9.46 s`                           |
| 3   | `31.00–43.00`          | `31.10–37.56`           | `5.44 s`                           |
| 4   | `43.00–51.00`          | `43.10–49.30`           | `1.70 s`                           |
| 5   | `51.00–65.00`          | `51.14–58.04`           | `6.96 s`                           |
| 6   | `65.00–91.00`          | `65.14–75.84`           | `15.16 s`                          |
| 7   | `91.00–111.00`         | `91.10–97.06`           | `13.94 s`                          |
| 8   | `111.00–131.00`        | `111.10–119.70`         | `11.30 s`                          |
| 9   | `131.00–151.00`        | `131.16–138.62`         | `12.38 s`                          |
| 10  | `151.00–162.00`        | `151.14–158.44`         | `3.56 s`                           |
| 11  | `162.00–170.10`        | `162.14–169.02`         | `1.08 s`                           |

Intentional gaps let each screen breathe; speech was not stretched, sped up, or filled with an
unrelated monologue. The new WebVTT and transcript use the exact words supplied to the voice. Spoken
expansions such as “raw dot orders,” “eighty-one percent,” “U T F eight,” and “M C P” preserve the
meaning of the identifiers visibly shown on screen.

## Authenticity and scope

- Both files show the same one continuous real interaction with the existing public Cloud Run
  credential-free fixture service. Phase 8.9A created no incident and did not contact the service.
- Frames contain only the application and checked-in synthetic fixture data. They exclude browser
  and Windows chrome, tabs, account/session surfaces, credentials, private endpoints, terminals,
  personal paths, notifications, and external media.
- The run visibly reaches **Investigation completed**, ranked evidence-linked hypotheses,
  deterministic `81% · high` confidence, evidence, bounded blast radius, **Not Executed**
  recommendations, and the Markdown download context.
- The incident UUID and activity timestamps visible in the application are run-specific,
  process-local output. They are not durable links or submission identifiers.
- The public service remains fixture-only, makes zero model calls, does not write to DataHub or
  production, and performs no automatic remediation. Local bounded DataHub MCP support and
  authorized live/judge validation remain separate; the latter is `PARTIAL`.

## Representative frame and playback review

The voiced derivative's packet identity allows the prior eleven-frame Phase 8.9 review to apply
without recapturing or fabricating frames. Phase 8.9A additionally extracted and inspected unchanged
original-resolution derivative frames at `00:05`, `01:10`, and `02:49`; they show the clean app title,
ranked `81% · high` evidence-linked result, and clean terminal app-only frame with no browser/Windows
chrome or private surface. Final Opus-decoded speech at cues 1, 6, and 11 was reviewed for clarity,
identifier pronunciation, scene relevance, and clean cue endings.

The Phase 8.9 capture script recorded one non-visual instrumentation page error when its capture-only
scrollbar style ran before the initial document element existed. The interaction and finalized source
continued normally; Phase 8.9A changes no frames and makes no application-console-clean claim.

## Accessibility, privacy, and media-rights review

- [x] English narration and WebVTT cues are ordered, non-overlapping, inside the media duration, and
      mirrored by a human-readable transcript.
- [x] Captions identify the scenario, completion boundary, confidence, evidence separation, two
      downstream impacts, and non-execution without relying on color or sound.
- [x] The synthetic male narrator matches all eleven visible action windows and makes no speaker-
      identity, hidden-reasoning, confirmed-cause, live-DataHub, or automatic-remediation claim.
- [x] The take uses steady scrolling, stable 1440 × 900 framing, readable application text, no rapid
      flashing, and no music.
- [x] Only project UI, synthetic fixture content, project-authored English text, and locally
      synthesized speech appear. No logo treatment, stock image, clip, or copyrighted music was
      added.
- [x] Video packet identity, audio codec/level/peak, cue alignment, representative frames/audio, and
      metadata/private-data boundaries were reviewed.
- [ ] A human entrant must perform the final rights/privacy/accessibility review on the exact export
      chosen for Rules-listed YouTube/Vimeo/Youku hosting.
- [ ] Rules-listed YouTube/Vimeo/Youku public-host visibility, entrant identity/rights attestations,
      and the final Devpost form remain separately authorized user actions.

The voiced derivative does not change the compliance gate: C18 remains
**PARTIAL — LOCAL CANDIDATE**, and C19 remains `OPEN`. Public GitHub blob/raw access is not a
Rules-listed hosted-and-linked Devpost video.
