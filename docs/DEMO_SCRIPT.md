# Under-three-minute demo script

Status: English rehearsal package only. No video has been recorded, uploaded, or submitted.

Target running time: **2:50–2:58**. The Rules recommend less than three minutes, and judges are not
required to watch beyond minute three.

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

## Timed storyboard and narration

| Time      | Exact interaction                                                                   | Narration                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Show the title and **Fixture metadata · Ready**.                                    | “A revenue incident can leave clues across schemas, lineage, and dashboards. Data Incident Investigator assembles those clues into one auditable report.”                                     |
| 0:15–0:32 | Scroll to **What changed?** and select **Removed schema column**.                   | “For a repeatable judge path, this public demo uses a synthetic, credential-free fixture. The scenario fills editable incident fields.”                                                       |
| 0:32–0:45 | Point to the question, `analytics.daily_revenue`, occurrence time, and symptom.     | “We ask why revenue dropped after a warehouse refresh and give the affected dataset plus symptom. No production data is modified.”                                                            |
| 0:45–0:55 | Choose **Start investigation** once.                                                | “The agent now performs bounded entity search, lineage retrieval, change gathering, scoring, and report composition.”                                                                         |
| 0:55–1:13 | Briefly show **Investigation activity**, then wait for **Investigation completed**. | “This trail contains observable operations only—not hidden chain-of-thought. Fixture execution is deterministic and makes zero model calls.”                                                  |
| 1:13–1:38 | Scroll to **Ranked evidence-linked hypotheses**.                                    | “The strongest result is a plausible contributor, not a confirmed cause: `gross_revenue` was removed from upstream `raw.orders`. The visible factors sum to 81 percent, high confidence.”     |
| 1:38–1:58 | Show the resolved evidence IDs and the **Evidence** section.                        | “Every hypothesis resolves to report evidence. The schema-change fact is quoted as evidence, while lineage independently connects `raw.orders` to the affected dataset.”                      |
| 1:58–2:18 | Show **Blast radius** and its two impacts.                                          | “Within explicit depth and entity bounds, the report traces `analytics.daily_revenue` at distance one and the Revenue overview dashboard at distance two, with exact paths and provenance.”   |
| 2:18–2:34 | Show **Safe recommendations for human review**.                                     | “Verification and reversible remediation are proposals for a human. Every item is marked not executed; this agent never changes production or writes back.”                                   |
| 2:34–2:44 | Return to **Download Markdown report** and point to the note beside it.             | “The completed result can be downloaded as deterministic, sanitized Markdown. No server-side report file is stored.”                                                                          |
| 2:44–2:58 | Show the README architecture/limitations block or a static text overlay.            | “React and Fastify share Zod contracts with fixture, GraphQL, and bounded MCP adapters. The public service is fixture-only; live judge MCP validation and judging-period uptime remain open.” |

## Architecture frame

Keep this final frame textual and accurate:

```text
React/Vite intake and report
            |
      Fastify + Zod
            |
Deterministic investigation runner
            |
MetadataAdapter: fixture | DataHub GraphQL | bounded DataHub MCP
```

Do not animate or narrate a model, autonomous write-back, durable database, live DataHub connection,
or hidden reasoning path; none exists in the public fixture.

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

## Rehearsal checklist

### Truth and interaction

- [ ] The take is below 3:00 and shows one real functioning incident from selection through result.
- [ ] Narration says **plausible contributor**, never “confirmed root cause.”
- [ ] `81% · high` is described as deterministic code-owned evidence scoring, not model probability.
- [ ] Blast radius is described as complete only **within the applied fixture bounds**.
- [ ] Recommendations are visibly and verbally `not_executed`.
- [ ] The activity trail is described as observable operations, not hidden reasoning.
- [ ] Fixture mode, zero model calls, process-local incident state, and no production mutation are
      explicit.
- [ ] The public demo is not described as live DataHub. Local bounded MCP integration and live/judge
      validation `PARTIAL` are kept separate.
- [ ] No Devpost registration, selection, upload, or submission is implied.

### Accessibility and English

- [ ] English narration is clear at normal playback speed.
- [ ] Human-reviewed English captions match the final audio, identifiers, and numbers.
- [ ] Provide an English transcript; do not rely only on auto-captions.
- [ ] Keep captions out of controls, evidence IDs, confidence, and blast-radius paths.
- [ ] Use readable zoom, a steady pointer, high-resolution capture, and no rapid scrolling or flashing.
- [ ] Verbally identify the selected scenario, completion state, confidence, and two downstream
      impacts so the demo is understandable without color.

### Privacy and media rights

- [ ] Only synthetic fixture data and the app/repository UI appear.
- [ ] No browser chrome, account/session surface, credential, private endpoint, billing identity,
      terminal history, notification, or personal path is visible.
- [ ] Use only project-owned screenshots, narration, captions, and graphics.
- [ ] Use no music unless its licence and attribution are documented for this submission; silence is
      the safe default.
- [ ] Use third-party product names only as factual text necessary to explain the stack; do not add
      unlicensed logos, clips, stock images, or trademarks as decoration.
- [ ] Review the final exported video frame by frame for accidental identifiers and the correctness of
      all on-screen claims before any separately authorized upload.
