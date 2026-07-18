# Agent design

## Investigation stages

1. Parse and validate the incident.
2. Identify candidate entities through the metadata adapter.
3. Gather metadata and bounded lineage context.
4. Collect recent schema, pipeline, ownership, tag, and domain changes.
5. Detect suspicious changes using deterministic signals.
6. Generate candidate root causes from retrieved entities only.
7. Score candidates by recency, lineage distance, symptom fit, and evidence quality.
8. Build an evidence chain and remediation steps.
9. Validate the structured report before returning it.

## Slice 3.1 parse-and-gather boundary

Slice 3.1 implements stages 1-4 as one bounded, deterministic facts-only boundary. It does not run
stages 5-8. The boundary:

1. validates the strict incident request and normalizes whitespace, optional entity hints, optional
   symptoms, and a seven-day time-window intent;
2. checks provider health once and searches once, using the supplied entity hint when present or the
   normalized question otherwise;
3. selects only the first deterministically ordered adapter result, preserving its exact URN and safe
   display fields;
4. retrieves one upstream lineage graph and one recent-change window for the first returned upstream
   entity (or the selected root when no upstream entity exists); and
5. returns parsed intent, provider-normalized facts, and explicit missing information through the
   shared `IncidentContextStageSchema`.

The default execution permits at most five candidates, five lineage nodes at depth two, three
recent-change entity with ten changes, four total provider calls, and one two-second
timeout/AbortSignal. The hard shared provider caps remain authoritative. There is no retry, recursive
fan-out, LLM, Stitch call, fallback seed, causal statement, hypothesis, score, evidence-chain synthesis,
or remediation in this stage.

The API composes fixture or DataHub health/search/lineage/recent-change providers behind the same
agent-core interface. A provider failure becomes a safe failed context stage while the canonical
legacy fixture report can still complete for compatibility. Logs contain incident ID, mode, bounded
counts, and normalized error code only; incident question and symptom text are not logged.

## Slice 3.2 suspicious-change boundary

Slice 3.2 implements stage 5 only. `DeterministicSuspiciousChangeDetector` accepts one already
validated completed context and has no metadata adapter, provider, network, retry, model, Stitch, or
credential input. Gathering, failed, and malformed context stages are rejected or represented by the
API lifecycle without running the detector.

The detector evaluates only normalized recent-change facts already in the context. Each qualifying
candidate copies the exact change ID, entity URN/name, category, operation, timestamp, summary, and
optional field, then records a deterministic ordered subset of these shared signals:

- `category_intent_match`: a bounded ASCII token from the incident question or supplied symptoms
  matches the small allowlist for the factual change category;
- `incident_window`: the factual timestamp falls inside a supplied incident-time window;
- `selected_entity`: the factual entity is the adapter-selected entity;
- `upstream_lineage`: the factual entity is a returned lineage node with depth greater than zero; and
- `disruptive_operation`: the normalized operation is `removed` or `modified`.

A candidate needs at least two signals and at least one incident-specific signal
(`category_intent_match` or `incident_window`). Internal deterministic rank weights are 4, 3, 2, 2,
and 2 in the signal order above, followed by newest timestamp and lexical change ID tie-breaks. The
weights are hard-coded and bounded; they are not returned as confidence and cannot be overridden by a
model. Duplicate change IDs do not cross the completed-context contract, results are capped at five,
and cap/history/context omissions remain explicit missing information.

The pure result is `completed` with one or more candidates or `insufficient` with zero candidates and
explicit missing information. Incident retrieval wraps it in an additive lifecycle:
`detecting` while context gathers, the pure terminal result after a completed context, or safe
`unavailable` when context failed or detection validation failed. The canonical removed-column fixture
therefore marks `change-removed-gross-revenue` on upstream `raw.orders` as potentially relevant via
incident-window, upstream-lineage, and disruptive-operation signals. This classification is not a
root-cause claim, hypothesis, evidence chain, confidence score, or recommendation.

## Tool and provider rules

- No invented URNs, owners, schemas, or pipelines.
- Every hypothesis cites evidence IDs.
- Tool responses become facts only after normalization and validation.
- Model text cannot create confidence independently; scoring code owns the final numeric value.
- Stop when tool-call, lineage, entity, retry, timeout, or output limits are reached.
- Provider failure produces a bounded fallback or inconclusive report, not fabricated evidence.

## Evidence classification

- Fact: directly observed metadata, lineage, change, or pipeline signal.
- Inference: explanation derived from one or more facts.
- Assumption: necessary but unverified context supplied or inferred.
- Missing information: evidence needed to confirm or reject a hypothesis.
- Recommendation: reversible next action tied to the evidence chain.

## Fixture determinism

Fixture incidents pin timestamps, entity graph, changes, and expected evidence IDs. Any model-backed
summarization must not change entity selection or evidence identity in deterministic evaluation mode.

## Failure behavior

Validation failures stop before tool calls. Adapter timeouts are not retried indefinitely. Cyclic lineage
uses a visited set. Truncation is reported. Insufficient evidence produces `inconclusive` reasoning with
explicit missing information.
