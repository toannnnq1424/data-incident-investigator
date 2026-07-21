# Product specification

## Problem

When a metric or dashboard changes unexpectedly, data teams lose time switching among catalog,
lineage, schema, orchestration, and ownership tools. Evidence exists, but the investigation path is
manual and conclusions are hard to audit.

## Product promise

Data Incident Investigator turns an incident question into a structured, evidence-backed report. It
finds candidate entities, expands lineage, gathers recent metadata changes, ranks possible root causes,
identifies evidence-supported downstream blast radius, and recommends the next checks or recovery
actions.

## Target users

- Analytics engineers investigating broken models or dashboards.
- Data engineers triaging pipeline, ingestion, and schema incidents.
- Data platform and governance teams identifying blast radius and ownership.

## MVP user flow

1. The user enters a question, optional entity hint, incident time, and symptom.
2. The API validates and records an incident.
3. The investigation runner searches entities through a metadata adapter.
4. It expands bounded upstream/downstream lineage and gathers recent changes.
5. It produces evidence, hypotheses with deterministic confidence signals, and a bounded downstream
   blast radius when validated lineage supports one.
6. The web UI renders the root cause, confidence, evidence timeline, blast radius, lineage,
   recommendations, and missing information as distinct sections.

## Functional requirements

- Fixture mode works without external credentials and is deterministic.
- DataHub mode uses the same internal `MetadataAdapter` contract.
- Reports distinguish fact, inference, assumption, missing information, and recommendation.
- Every hypothesis references one or more evidence IDs.
- Every blast-radius impact is a typed dataset, pipeline, or dashboard with a stable URN, downstream
  path, bounded distance, and resolved hypothesis/evidence provenance. Missing or truncated coverage is
  explicit and is never presented as verified zero impact.
- Limits bound lineage depth, entity count, tool calls, retries, duration, and output size.
- Errors explain whether the failure is validation, provider availability, timeout, or insufficient
  evidence.
- A terminal investigation can be downloaded as one deterministic, sanitized, self-contained Markdown
  report with resolved evidence, confidence, blast-radius, remediation, activity, and limitation
  references. The application code owns the format and filename; no model-authored Markdown, sharing,
  or server-side report storage is required.

## MVP scenarios

- Removed schema column.
- Stale or failed pipeline.
- Upstream type change.
- Dashboard linked to the wrong dataset.
- Delayed ingestion.
- Incorrect owner or domain.
- Insufficient evidence to conclude.

## Success measures

- A new contributor can run the fixture demo from a clean clone.
- A judge can complete the primary incident flow in under three minutes.
- Evaluation reports entity retrieval accuracy, root-cause top-1/top-3, evidence correctness,
  unsupported-claim rate, latency, tool calls, and token use.

## Non-goals

Enterprise authentication, billing, multi-tenancy, mobile apps, multi-provider model routing,
microservices, real-time collaboration, generic workflow builders, and automatic production pipeline
changes are outside the MVP.
