# Under-three-minute demo script

Status: one authentic English-captioned silent source has been recorded, reviewed, and merged. Phase
8.9A adds a separate derivative with synchronized synthetic male English narration while stream-
copying the exact video. Both are Public GitHub repository assets; neither has been uploaded to or
made publicly visible on YouTube, Vimeo, or Youku, linked or entered in Devpost, accepted by an
organizer, or submitted. GitHub access is not the Rules-required video-host/form-link gate.

Candidate running time: **2:50.20**. The Rules recommend less than three minutes, and judges are not
required to watch beyond minute three. Review the local packet at
[`demo-video/README.md`](demo-video/README.md).

The preferred review derivative uses **Microsoft Mark — English (United States)**, an installed
Microsoft Windows Adult/Male synthetic voice operating offline at its default rate. It is framed as
an AI narrator, not the entrant or a named real person. Its WebVTT and transcript contain the exact
spoken text. The unchanged silent source remains available with its original captions/transcript.

## Recording setup

- Use the public credential-free fixture URL:
  <https://data-incident-investigator-1071683558688.asia-southeast1.run.app>.
- Pre-open the page only to absorb a possible Cloud Run cold start. Begin the recorded interaction at
  the top of the app after **Fixture metadata · Ready** appears.
- Keep the Public repository local fallback running at `http://localhost:5173`; if used, say clearly
  that the recording switched to the repository-local fixture.
- Capture only the app. Hide bookmarks, account avatars, notifications, other tabs, terminals with
  private paths, and Cloud/GitHub account pages.
- Use synthetic fixture data exactly as populated by **Removed schema column**. Do not enter a token,
  endpoint, customer name, production incident, or personal identifier.
- Record one continuous canonical incident. Do not splice in a different incident ID or imply that a
  screenshot is a live result.
- For Phase 8.9A, do not record another incident or UI take. Reuse the exact Phase 8.9 frame stream
  and align each synthetic sentence to the existing action window.

## Timed candidate storyboard and voiced narrative

The exact spoken words are in
[`demo-video/VOICEOVER_TRANSCRIPT.md`](demo-video/VOICEOVER_TRANSCRIPT.md) and the matching WebVTT.
The table below is the concise scene-to-claim map.

| Time         | Visible interaction                                                         | Synchronized synthetic male narration boundary                                                                                   |
| ------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:14    | Show the title and **Fixture metadata · Ready**.                            | The product assembles schema, lineage, and dashboard clues into one auditable report.                                            |
| 0:14–0:31    | Scroll to **What changed?** and select **Removed schema column**.           | The public demo is a synthetic, credential-free fixture; the preset fills editable fields.                                       |
| 0:31–0:43    | Show the question, `analytics.daily_revenue`, occurrence time, and symptom. | The question, affected dataset, and symptom are inputs; no production data is modified.                                          |
| 0:43–0:51    | Choose **Start investigation** once.                                        | The agent performs bounded retrieval, deterministic scoring, and report composition.                                             |
| 0:51–1:05    | Show **Investigation completed**, download context, and activity.           | Observable operations are not hidden reasoning; fixture execution makes zero model calls.                                        |
| 1:05–1:31    | Show **Ranked evidence-linked hypotheses** and confidence factors.          | The result is a plausible contributor, not a confirmed cause; visible factors total `81% · high`.                                |
| 1:31–1:51    | Show the resolved evidence IDs and **Evidence**.                            | Every hypothesis resolves to report evidence; schema-change and lineage facts remain separate.                                   |
| 1:51–2:11    | Show **Blast radius** and both impacts.                                     | Within displayed bounds, the dataset is distance 1 and **Revenue overview** is distance 2, with paths and provenance.            |
| 2:11–2:31    | Show **Safe recommendations for human review**.                             | Every proposal is **Not Executed**; the app never changes production or writes back.                                             |
| 2:31–2:42    | Return to **Download Markdown report** and activity.                        | The deterministic sanitized UTF-8 report is downloadable; no server-side report file is stored.                                  |
| 2:42–2:50.10 | Return to the clean app title and fixture-ready boundary.                   | The public service is fixture-only; local bounded MCP exists, while live judge validation and judging-window access remain open. |

## Architecture frame

This remains a truthful rehearsal aid for a future entrant-edited take:

```text
React/Vite intake and report
            |
      Fastify + Zod
            |
Deterministic investigation runner
            |
MetadataAdapter: fixture | DataHub GraphQL | bounded DataHub MCP
```

The local candidate does not insert this as a synthetic frame; it closes on the real application
title while the caption states the fixture/live-validation boundary. Do not animate or narrate a
model, autonomous write-back, durable database, live DataHub connection, or hidden reasoning path;
none exists in the public fixture.

## Cold/unavailable fallback

1. If the first public load is cold, allow up to 30 seconds for the page and
   **Fixture metadata · Ready**. Narrate the cold start only if it remains in the final cut.
2. If the public URL is unavailable, stop that take. Start the Public repository fallback using the
   exact commands in [`JUDGE_QUICKSTART.md`](JUDGE_QUICKSTART.md), open
   `http://localhost:5173`, and record the same scenario once.
3. State “repository-local fixture fallback” on screen and in narration. Do not present local output
   as a successful public Cloud Run run.
4. If neither path works, do not simulate the UI. Use the verified screenshots only as a labeled
   storyboard and record a new functioning-project take after access is restored.

Phase 8.9 fallback rehearsal used an existing frozen Windows worktree with bundled Node `24.14.0`
and pnpm `11.9.0`: Vite reported ready in `549 ms`, while `/health`, fixture `/ready`, and the web
root passed by a bounded `10.1 s` probe. No local incident was started. Treat this as a
warm-worktree rehearsal, not a clean-clone installation benchmark.

## Rehearsal checklist

Phase 8.9A voiced-derivative result:

### Truth and interaction

- [x] The take is below 3:00 and shows one real functioning incident from selection through result.
- [x] Captions say **plausible contributor**, never “confirmed root cause.”
- [x] `81% · high` is described as deterministic code-owned evidence scoring, not model probability.
- [x] Blast radius is described as complete only **within the applied fixture bounds**.
- [x] Recommendations are visibly and textually `not_executed`.
- [x] The activity trail is described as observable operations, not hidden reasoning.
- [x] Fixture mode, zero model calls, process-local incident state, and no production mutation are
      explicit.
- [x] The public demo is not described as live DataHub. Local bounded MCP integration and live/judge
      validation `PARTIAL` are kept separate.
- [x] No Devpost registration, challenge selection, YouTube/Vimeo/Youku upload or form link, or
      submission is implied.

### Accessibility and English

- [x] The AI narrator is identified as Microsoft Mark, not the entrant or a named real person.
- [x] Exact English captions/transcript match the spoken words and their eleven action windows.
- [x] An English transcript mirrors the captions; no auto-caption dependency exists.
- [x] Captions preserve controls, evidence IDs, confidence, and blast-radius paths.
- [x] The take uses readable zoom, a steady view, high-resolution capture, and no rapid flashing.
- [x] Captions identify the selected scenario, completion state, confidence, and two downstream
      impacts so the demo is understandable without color.

### Privacy and media rights

- [x] Only synthetic fixture data and the app UI appear.
- [x] No browser chrome, account/session surface, credential, private endpoint, billing identity,
      terminal history, notification, or personal path is visible.
- [x] Only project UI and project-authored captions appear.
- [x] No music is present; the audio contains only the locally synthesized English narration and
      intentional silence.
- [x] Third-party product names are used only as factual text; no
      unlicensed logos, clips, stock images, or trademarks as decoration.
- [x] Key frames at eleven timestamps were reviewed for accidental identifiers and claim accuracy.
- [ ] The entrant must review the exact chosen export again before any separately authorized
      YouTube/Vimeo/Youku upload.

The recording script emitted one non-visual capture-instrumentation page error because its
scrollbar-hiding style ran before the first document element existed. The application interaction and
final video continued normally, no runtime failure is visible, and no app-console-clean claim is made
for this take. See [`demo-video/README.md`](demo-video/README.md).

Phase 8.9A independently measured the final Opus narration at `-18.0 LUFS`, `-1.0 dBTP`, zero
clipped samples, and exact cue completion before every next boundary. The extracted VP8 payload and
all 4,255 copy-timestamp framehash rows match the silent source, so the voice-over adds no synthetic
or retimed UI frame.
