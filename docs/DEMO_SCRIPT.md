# Demo script

Status: planned; executable after Phases 1–5.

## Three-minute sequence

1. Explain that data incident evidence is fragmented across metadata, lineage, changes, and ownership.
2. Select the deterministic “removed revenue column” scenario.
3. Submit “Why did revenue drop today?” with the affected dashboard or dataset hint.
4. Show investigation progress: entity search, lineage expansion, recent changes, hypothesis scoring.
5. Reveal the top root cause and confidence.
6. Open the evidence timeline and point to the schema change and affected lineage path.
7. Show downstream dashboards and owner.
8. Present recommended checks/rollback order and call out assumptions or missing evidence.
9. Show the architecture: shared pipeline, fixture adapter, DataHub adapter.

## Demo safety

- Use a seeded timestamp and fixed fixture IDs.
- Keep fixture mode available even when DataHub or the model provider is unavailable.
- Rehearse from a clean browser and show one friendly validation/provider error.
- Do not expose tokens, private endpoints, account pages, or raw logs.

## Recording assets

Capture incident input, progress, root-cause report, evidence timeline, lineage, and architecture. The
final video should mention what is implemented versus roadmap.
