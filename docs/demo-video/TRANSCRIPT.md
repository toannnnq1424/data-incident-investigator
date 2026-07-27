# Phase 8.9 demo candidate transcript

This is the human-reviewed English transcript for
[`phase-8-9-demo-captions.vtt`](phase-8-9-demo-captions.vtt). The local candidate has no audio
stream; the captions are its synchronized narrative rather than a transcription of spoken audio.

| Time            | English caption                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00:04–00:14`   | Data Incident Investigator assembles schema, lineage, and dashboard clues into one auditable report.                                                                 |
| `00:14–00:31`   | This public demo uses a synthetic, credential-free fixture. Removed schema column fills editable incident fields.                                                    |
| `00:31–00:43`   | We ask why revenue dropped and provide the affected dataset and symptom. No production data is modified.                                                             |
| `00:43–00:51`   | Start once: the agent performs bounded retrieval, deterministic scoring, and report composition.                                                                     |
| `00:51–01:05`   | The activity trail shows observable operations, not hidden reasoning. Fixture execution makes zero model calls.                                                      |
| `01:05–01:31`   | The strongest result is a plausible contributor, not a confirmed cause: `gross_revenue` was removed from upstream `raw.orders`. Visible factors total `81%`, high.   |
| `01:31–01:51`   | Every hypothesis resolves to report evidence. The schema-change fact and lineage evidence remain separate.                                                           |
| `01:51–02:11`   | Within the displayed fixture bounds, `analytics.daily_revenue` at distance 1 and **Revenue overview** at distance 2 are supported impacts with paths and provenance. |
| `02:11–02:31`   | These are human-review proposals. Every recommendation is **Not Executed**; the app never changes production or writes back.                                         |
| `02:31–02:42`   | The completed result downloads as deterministic, sanitized UTF-8 Markdown. No server-side report file is stored.                                                     |
| `02:42–02:50.1` | The public service is fixture-only. Local bounded DataHub MCP exists, while live judge validation and judging-window access remain open.                             |

The first four seconds intentionally contain no caption so a reviewer can establish the clean
app-only opening frame. Captions never claim narration identity, hidden reasoning, a model call,
confirmed causality, automatic remediation, a live DataHub connection, durable incident storage,
Devpost registration, public upload, or submission.
