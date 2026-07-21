# Data model

## Incident request

`IncidentRequest` contains a required question plus optional entity hint, ISO incident timestamp, and
symptom. API validation trims text, enforces length limits, and rejects invalid timestamps.

## Normalized incident intent

`IncidentIntent` is the facts-only Slice 3.1 normalization of an accepted request. It contains:

- one whitespace-normalized question;
- zero to three bounded entity hints (the current request contributes at most one);
- zero to three bounded symptoms (the current request contributes at most one); and
- a time-window intent with a default of 168 hours, a maximum of 720 hours, and either a canonical UTC
  incident end time or an explicit `provider_default` basis.

The normalized intent preserves user-supplied meaning but does not infer entity identity, cause,
severity, or impact.

## Investigation context stage

Incident retrieval includes an additive `contextStage` with `gathering`, `completed`, or `failed`
status. A completed stage separates `facts` from `missingInformation` and contains no hypothesis,
confidence, inference, recommendation, or remediation.

Context facts contain the metadata source mode, up to five normalized candidate entities, an optional
selected entity, one bounded upstream lineage graph, and one existing recent-change response for the
first returned upstream node (or the selected root when no upstream node exists). The selected entity
must exactly equal one returned candidate. Its URN must be the lineage root, and the recent-change
entity must be a node in that returned graph. Thus every entity has an
adapter/provider URN and every change keeps its adapter evidence ID; there is no invented entity or
synthetic evidence reference.

A valid no-match context has an empty candidate list, no selection/lineage/change calls, and the
`entity_not_found` missing-information code. Other unique missing-information codes distinguish an
absent optional hint/time/symptom, empty lineage/history, and bounded lineage/history truncation. A
failed stage contains only a normalized safe application code and message; it never stores a raw
provider payload or error.

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

## Recent metadata changes

A public recent-change request identifies one stable entity URN plus a bounded time window and result
limit. Its optional end time must be canonical UTC; otherwise each provider chooses a deterministic
boundary appropriate to its mode (the fixed fixture snapshot or the current DataHub request time).
Window and result bounds have shared defaults and hard caps, and the request cannot contain provider
queries or synthetic paging fields.

The normalized response contains the exact accepted UTC start/end window, accepted limit, returned
count, truncation state, and a list of factual changes. Each change has a stable ID, the requested
entity URN, canonical UTC timestamp, allowlisted category and operation, safe source plus optional actor
label, a short factual summary, and an optional bounded field/aspect label. Rows are deduplicated by
stable ID and ordered newest-first with ID as the same-timestamp tie-break. Every returned timestamp is
inside the accepted window. `truncated` records when window filtering, the result limit, or the official
DataHub 100-transaction timeline cap omits history; DataHub exposes no timeline cursor, so the shared
model does not invent one.

Recent changes remain facts. They are not impact scores, correlations, hypotheses, root-cause claims,
or investigation evidence in Slice 2.4.

## Suspicious-change detection

Incident retrieval adds a `suspiciousChangeStage` owned by the same request as `contextStage`. Its
lifecycle is `detecting` while context gathers, `completed | insufficient` after a valid completed
context, or safe `unavailable` when context or detection validation cannot complete. A failed or
gathering context is never converted into a fabricated suspicious result.

The pure detector result contains at most five unique candidates plus unique explicit missing-
information items. Each candidate is a projection of one exact normalized recent-change fact:

- exact change ID and entity URN;
- entity name resolved from the returned candidate/lineage graph;
- factual category, operation, canonical observation time, summary, and optional field; and
- at least two unique ordered shared signal objects, including `category_intent_match` or
  `incident_window` as an incident-specific signal.

The remaining signals are factual entity position (`selected_entity` or `upstream_lineage`) and a
normalized removed/modified operation (`disruptive_operation`). Signal codes and labels are allowlisted.
Internal priority weights are fixed at category match 4, incident window 3, and 2 for each entity/
operation signal. Candidate ordering is descending internal priority, newest observation time, then
lexical change ID. The internal value is not returned, is not hypothesis confidence, and cannot be
model-overridden.

`completed` requires at least one candidate. `insufficient` requires no candidates and explicit missing
information. Missing incident time or symptom removes the associated comparison input; empty history,
no qualifying incident-specific signal, context truncation, and the five-candidate cap are explicit.
The model rejects unknown fields, duplicate IDs/signals, invalid ordering, invented change/entity
references, and any hypothesis, confidence, root-cause, recommendation, remediation, or raw provider
payload field.

## Evidence-linked hypothesis scoring

Incident retrieval includes additive `hypothesisScoringStage` owned by the same request and factual
report evidence. Its lifecycle is `scoring` while upstream facts or the legacy report evidence catalog
are still assembling, `completed | insufficient` after valid terminal inputs, or safe `unavailable`
when context, suspicious detection, or scoring validation cannot complete.

A completed result contains one to three strictly ordered scored hypotheses. Each hypothesis has:

- a stable unique hypothesis ID, contiguous rank, exact source change ID, and factual observation time;
- an inference statement beginning `Plausible contributor:` and containing no confirmed-cause,
  recommendation, remediation, action, or raw provider/model field;
- a confidence in `[0,1]` with at most two decimal places;
- one to six unique evidence IDs, including the source change ID, all resolving to report evidence; and
- exactly four ordered allowlisted factors with fixed label, integer basis-point contribution, and
  fixed maximum weight.

Factor order and weights are `change_recency` 3,000, `lineage_position` 2,000,
`symptom_category_fit` 3,000, and `evidence_quality` 2,000. Contributions use 100-basis-point
precision, never exceed their weight, and their clamped sum must equal `confidence * 10,000` exactly.
Ranking is confidence descending, observation time descending, source change ID ascending, then
hypothesis ID ascending. Duplicate IDs/source changes, score or rank mismatch, invalid factor order,
and more than three hypotheses are rejected.

The cross-reference contract verifies the suspicious candidate against completed context first, then
requires its change evidence to have the same ID, normalized category, statement, source entity, and
observation time. Unresolved evidence, incomplete recent-change rank inputs, or an insufficient
suspicious result yields zero hypotheses plus explicit missing information. It does not generate a
low-confidence fallback.

## Remediation planning and safe fallback

Incident retrieval includes additive `remediationStage` with lifecycle
`planning | completed | insufficient | unavailable`. `planning` has no terminal payload. A completed
result has one to five strictly ordered recommendations; terminal fallback results have zero
recommendations, one to five unique missing-information items, and one to five allowlisted next steps.
Every fallback includes `continue_fixture_mode` so fixture investigation remains available without a
credential.

Each recommendation contains:

- a stable unique ID derived exactly as `verify-{changeId}` or `remediate-{changeId}`;
- allowlisted type `recommended_verification | potential_remediation`, rank-derived priority
  `high | medium | low`, and literal status `not_executed`;
- a concise recommendation/potential title and rationale that cannot claim a confirmed cause;
- one safe verification step and one rollback/reversibility note; and
- unique non-empty hypothesis, evidence, entity, and change reference arrays.

Recommendations are derived only from exact completed scored hypotheses and factual changes in the
`schema`, `pipeline`, `ownership`, `domain`, or `tag` allowlist. Rank is the only priority source: rank
one is high, rank two is medium, and later rank is low. Generation preserves hypothesis rank, then
verification before potential remediation; semantic duplicates are removed before the five-item cap.
No confidence, score, provider/model output, executable command, mutation result, or automatic-action
state is accepted.

The cross-reference contract requires the report hypotheses to equal scoring output and resolves every
recommendation through the cited scored hypothesis to its report evidence, context entity, and source
change. Duplicate/unstable IDs, unknown fields, invalid lifecycle combinations, ordering drift,
dangling references, unsupported categories, oversize payloads, and causal overclaims are rejected or
become a zero-reference safe fallback. `unavailable` permits only normalized
`CONTEXT_UNAVAILABLE | SCORING_UNAVAILABLE | PLANNING_INVALID` messages; raw provider payloads,
credentials, exceptions, and stacks never enter the model.

## Evidence

Evidence is an observed fact with:

- stable ID;
- category (`metadata`, `lineage`, `schema-change`, `pipeline`, or `ownership`);
- factual statement;
- optional source entity and observation time.

Inference is not stored as evidence. An inference belongs in a hypothesis and cites evidence IDs.

## Hypothesis

A legacy hypothesis has an ID, summary, confidence from 0 to 1, and at least one evidence ID. A Slice
3.3 scored hypothesis adds rank, source change/time, and the four exact factor contributions described
above. The report accepts either the legacy shape or a uniformly scored list for compatibility, never a
mixture; completed scoring requires the report list to equal the lifecycle output exactly.

## Investigation report

A report contains incident ID, summary, related entities, evidence, ranked hypotheses,
recommendations, assumptions, and missing information. Rendering must preserve these categories.

## Investigation execution metadata

Every terminal public investigation has strict `execution` metadata. It contains non-negative integer
`toolCalls`, `agentSteps`, `durationMs`, and `lineageEntitiesVisited`, plus one allowlisted
`terminationReason`. Counts represent only work that ran: provider calls are recorded immediately
before invocation, agent steps at stage entry, lineage entities by unique schema-validated URN, and
duration from a monotonic clock. Retry and model-call counts are not invented; the current workflow
performs neither.

A completed incident requires `terminationReason: completed` and retains the existing report and stage
cross-reference invariants. A runtime budget block instead returns `status: failed`, the factual
execution metadata, and `INVESTIGATION_LIMIT_REACHED` with the exact safe message mapped to its limit
reason. It contains no report or stage payload and therefore cannot mislabel truncated execution as a
completed investigation. The stable non-completed reasons cover agent steps, tool calls, lineage depth,
entity count, retries, total duration, and serialized runner/model-output bytes.

## Planned incident lifecycle

`queued -> investigating -> completed | failed | inconclusive`

The API will expose stable state values in Slice 1.1. Fixture mode may keep state in memory for the MVP;
persistent storage is deferred.

## Invariants

- Entity URNs and evidence IDs are unique within a report.
- Hypothesis evidence IDs resolve to report evidence.
- Provider-specific payloads never appear in API responses.
- Lineage roots/nodes and source-target edge pairs are unique, and lineage edges never dangle.
- Recent-change IDs are unique; rows match the requested entity/window and use deterministic
  newest-first/ID ordering with an exact returned count.
- Suspicious-change candidates are capped at five, use unique exact recent-change/entity references,
  and contain only ordered allowlisted factual signals; insufficient output contains no candidate and
  explicit missing information.
- Scored hypotheses are capped at three, use unique exact source changes and resolved report evidence,
  expose four ordered factor contributions whose exact sum equals canonical confidence, and cannot mix
  with legacy hypotheses in one report.
- `inconclusive` reports include missing information and avoid unsupported root-cause claims.
