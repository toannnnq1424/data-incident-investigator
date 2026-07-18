# Data model

## Incident request

`IncidentRequest` contains a required question plus optional entity hint, ISO incident timestamp, and
symptom. API validation trims text, enforces length limits, and rejects invalid timestamps.

## Entity reference

An entity has a stable URN, display name, and kind: dataset, dashboard, pipeline, or chart. DataHub
responses are normalized into this shape before leaving the adapter.

Entity search results extend that reference with optional bounded `description` and `qualifiedName`
fields when the provider supplies safe non-empty values. Search results have unique URNs, deterministic
name/kind/URN ordering, and a request-bounded count. A no-match search is an empty list; only the
fixture incident runner may explicitly request its declared default seed.

## Lineage graph

A public lineage request identifies one search-result URN, one traversal direction, a bounded depth,
and a bounded maximum node count. The shared response is provider-neutral and contains:

- the stable root URN, requested direction/depth, accepted node cap, visited-node count, and truncation
  state;
- unique nodes with stable URN, normalized kind, safe display name, traversal depth, and optional safe
  platform/description;
- unique directed edges whose source is physically upstream and target is physically downstream.

The root is always the first node, appears exactly once, and has depth zero. Every edge endpoint must
resolve to a returned node. Remaining nodes are ordered by depth/name/kind/URN and edges by source/
target URN so fixture and provider results render deterministically. Cycles and self-loops are retained
once as evidence but a visited set prevents repeated expansion. Depth, nodes, edges, provider page
size, total provider requests, timeout, and AbortSignal bound traversal; `truncated` records when a
reachable node or edge is omitted by one of those bounds. A no-lineage entity is a valid one-node,
zero-edge graph, while a missing root is a typed not-found error.

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
- Lineage roots/nodes and source-target edge pairs are unique, and lineage edges never dangle.
- `inconclusive` reports include missing information and avoid unsupported root-cause claims.
