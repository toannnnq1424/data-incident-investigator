# Data model

## Incident request

`IncidentRequest` contains a required question plus optional entity hint, ISO incident timestamp, and
symptom. API validation trims text, enforces length limits, and rejects invalid timestamps.

## Entity reference

An entity has a stable URN, display name, and kind: dataset, dashboard, pipeline, or chart. DataHub
responses are normalized into this shape before leaving the adapter.

## Evidence

Evidence is an observed fact with:

- stable ID;
- category (`metadata`, `lineage`, `schema-change`, `pipeline`, or `ownership`);
- factual statement;
- optional source entity and observation time.

Inference is not stored as evidence. An inference belongs in a hypothesis and cites evidence IDs.

## Hypothesis

A hypothesis has an ID, summary, confidence from 0 to 1, and at least one evidence ID. Confidence will
be derived from explicit signals such as change recency, lineage distance, symptom match, and provider
reliability rather than arbitrary model output.

## Investigation report

A report contains incident ID, summary, related entities, evidence, ranked hypotheses,
recommendations, assumptions, and missing information. Rendering must preserve these categories.

## Planned incident lifecycle

`queued -> investigating -> completed | failed | inconclusive`

The API will expose stable state values in Slice 1.1. Fixture mode may keep state in memory for the MVP;
persistent storage is deferred.

## Invariants

- Entity URNs and evidence IDs are unique within a report.
- Hypothesis evidence IDs resolve to report evidence.
- Provider-specific payloads never appear in API responses.
- `inconclusive` reports include missing information and avoid unsupported root-cause claims.
