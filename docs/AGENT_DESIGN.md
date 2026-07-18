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
