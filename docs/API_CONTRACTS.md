# API contracts

All JSON endpoints return UTF-8 JSON. Request bodies are size-limited and validated. Provider-specific
errors are mapped to stable application errors before reaching clients.

## Implemented

### `GET /health`

Response `200`:

```json
{
  "status": "ok",
  "service": "data-incident-investigator-api",
  "mode": "fixture"
}
```

This endpoint does not reveal credentials or provider URLs.

### `GET /metadata/health`

The browser calls `/api/metadata/health`; direct API clients use `/metadata/health`. The response is
always validated by `MetadataHealthResponseSchema` and reports provider readiness without returning a
provider payload, URL, token, request header, or raw error.

Fixture response `200`:

```json
{
  "mode": "fixture",
  "status": "ready",
  "message": "Fixture metadata is ready."
}
```

DataHub responses also use HTTP `200` because the metadata health request itself succeeded and the
body reports provider state. `status` is one of:

- `ready`: the configured GMS returned a valid JSON configuration response;
- `unconfigured`: `DATAHUB_GMS_URL` or `DATAHUB_TOKEN` is blank or the URL is unsafe/invalid;
- `unauthorized`: GMS returned HTTP `401` or `403`;
- `unavailable`: connection/DNS failed or GMS returned another non-success status;
- `timeout`: the bounded probe was aborted at its short timeout or by the caller signal;
- `invalid_response`: GMS returned a non-JSON, malformed, non-object, or otherwise unexpected success
  response.

Example normalized DataHub problem response:

```json
{
  "mode": "datahub",
  "status": "unauthorized",
  "message": "DataHub rejected the configured credentials. Check the access token."
}
```

DataHub mode probes `GET /config` relative to `DATAHUB_GMS_URL` through the datahub-client boundary,
using `DATAHUB_TOKEN` as a Bearer token and a two-second default timeout. Fixture mode constructs no
DataHub client and does not read either DataHub environment variable. Provider failures are logged
only with normalized mode/status fields.

### `POST /metadata/search`

The browser calls `/api/metadata/search`; direct API clients use `/metadata/search`. The request is
strict: unknown keys are rejected, `query` is trimmed and must contain 2-200 characters,
`entityType` is optional and limited to `dataset`, `dashboard`, `chart`, or `pipeline`, and `limit` is
an integer from 1-20 with a default of 10.

Request:

```json
{
  "query": "revenue",
  "entityType": "dataset",
  "limit": 10
}
```

Response `200`:

```json
{
  "query": "revenue",
  "entityType": "dataset",
  "limit": 10,
  "results": [
    {
      "urn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)",
      "kind": "dataset",
      "name": "analytics.daily_revenue",
      "qualifiedName": "snowflake.analytics.daily_revenue",
      "description": "Daily revenue metrics derived from raw order records."
    }
  ]
}
```

Results contain unique stable URNs, are ordered deterministically by normalized name, kind, and URN,
and never exceed the accepted limit. `description` and `qualifiedName` are omitted when the provider
does not return a safe non-empty value. A valid query with no matches returns `results: []`; the API
does not invent or substitute an entity.

Invalid requests return HTTP `400` with the existing `VALIDATION_ERROR` envelope and message
`The metadata search request is invalid.` Provider failures use the same safe `ApiErrorSchema` with
these normalized outcomes:

| Provider status    | HTTP | Error code                  |
| ------------------ | ---- | --------------------------- |
| `unconfigured`     | 503  | `METADATA_UNCONFIGURED`     |
| `unauthorized`     | 502  | `METADATA_UNAUTHORIZED`     |
| `unavailable`      | 503  | `METADATA_UNAVAILABLE`      |
| `timeout`          | 504  | `METADATA_TIMEOUT`          |
| `invalid_response` | 502  | `METADATA_INVALID_RESPONSE` |

Fixture mode searches only the checked-in canonical metadata and does not read `DATAHUB_GMS_URL` or
`DATAHUB_TOKEN`. Public fixture search supports true empty results and an entity-type filter. The
Phase 1 incident runner separately opts into the declared fixture seed fallback so its canonical
behavior remains unchanged.

DataHub mode sends a bounded Bearer-authenticated GraphQL request to `/api/graphql` using
`searchAcrossEntities(input: SearchAcrossEntitiesInput!)` with supported `types`, trimmed `query`,
`start: 0`, and bounded `count`. `DATA_FLOW` and `DATA_JOB` normalize to `pipeline`; other supported
types normalize directly. The implementation follows DataHub's official
[`SearchAcrossEntitiesInput` schema](https://github.com/datahub-project/datahub/blob/master/datahub-graphql-core/src/main/resources/search.graphql)
and official web-client
[`searchAcrossEntities` query](https://github.com/datahub-project/datahub/blob/master/datahub-web-react/src/graphql/search.graphql).
HTTP authorization/non-success responses, refusal, timeout, non-JSON, invalid JSON, GraphQL errors,
and malformed entity results normalize before the API boundary. Responses and logs never contain the
provider URL, token, Authorization header, raw body, GraphQL error text, or raw exception.

### `POST /metadata/lineage`

The browser calls `/api/metadata/lineage`; direct API clients use `/metadata/lineage`. The strict
request accepts only a stable root URN, `upstream` or `downstream`, and bounded integer controls. Depth
defaults to `2` and is capped at `5`; `maxNodes` includes the root, defaults to `8`, and is capped at
`25`. Unknown fields are rejected, so a client cannot supply GraphQL or another provider query.

Request:

```json
{
  "rootUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)",
  "direction": "downstream",
  "depth": 2,
  "maxNodes": 8
}
```

Response `200` (abridged nodes, complete top-level shape):

```json
{
  "rootUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)",
  "direction": "downstream",
  "requestedDepth": 2,
  "maxNodes": 8,
  "visitedNodeCount": 3,
  "truncated": false,
  "nodes": [
    {
      "urn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)",
      "kind": "dataset",
      "name": "lineage.demo.root",
      "depth": 0,
      "platform": "snowflake",
      "description": "Deterministic lineage demo root with bounded branches and cycles."
    }
  ],
  "edges": [
    {
      "sourceUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)",
      "targetUrn": "urn:li:chart:(looker,lineage-demo-chart)"
    }
  ]
}
```

The root is the first node at depth zero and appears exactly once. All other nodes have a traversal
depth within `requestedDepth`. Node URNs and source/target edge pairs are unique; every edge endpoint
resolves to a returned node. Edges always use physical lineage orientation (`sourceUrn` is upstream,
`targetUrn` is downstream), including for an upstream traversal. Nodes are ordered by depth, normalized
display name, kind, and URN; edges are ordered by source then target URN. Self-loops and cycles may be
returned once but never duplicate nodes or cause further traversal. At most 100 edges can cross the
boundary.

An existing root with no lineage returns exactly the root, `edges: []`, `visitedNodeCount: 1`, and
`truncated: false`. `truncated` becomes true only when reachable lineage is omitted by the requested
depth, node/edge cap, provider page, or the hard provider-step cap. A missing root returns HTTP `404`
with the existing `NOT_FOUND` envelope. Invalid requests return HTTP `400` with `VALIDATION_ERROR` and
message `The metadata lineage request is invalid.` Other provider failures use the existing safe
metadata mapping:

| Provider status    | HTTP | Error code                  |
| ------------------ | ---- | --------------------------- |
| `unconfigured`     | 503  | `METADATA_UNCONFIGURED`     |
| `unauthorized`     | 502  | `METADATA_UNAUTHORIZED`     |
| `unavailable`      | 503  | `METADATA_UNAVAILABLE`      |
| `timeout`          | 504  | `METADATA_TIMEOUT`          |
| `invalid_response` | 502  | `METADATA_INVALID_RESPONSE` |

Fixture mode uses only the checked-in graph and does not read `DATAHUB_GMS_URL`, `DATAHUB_TOKEN`,
Stitch, an LLM, or another credential. It contains multi-level upstream, branching downstream,
cycle/self-loop, empty, missing-root, and depth/node truncation cases while retaining the canonical
incident graph.

DataHub mode sends sequential, Bearer-authenticated one-hop GraphQL requests to `/api/graphql` using
`searchAcrossLineage(input: SearchAcrossLineageInput!)` with `urn`, `query: "*"`, `start: 0`, bounded
`count`, `UPSTREAM|DOWNSTREAM`, and a direct `degree: ["1"]` filter. The adapter performs deterministic
BFS with a visited set, a maximum of 25 total provider requests, one total timeout/AbortSignal, and no
retry. This follows DataHub's official
[`lineage` API tutorial](https://github.com/datahub-project/datahub/blob/master/docs/api/tutorials/lineage.md)
and official web-client
[`lineage.graphql`](https://github.com/datahub-project/datahub/blob/master/datahub-web-react/src/graphql/lineage.graphql).
HTTP failures, refusal, timeout, invalid/non-JSON responses, GraphQL errors, missing follow-up entities,
and malformed results normalize before the API boundary. Raw provider payloads, URL, token,
Authorization header, GraphQL error text, exceptions, and stack traces are never returned or logged.

### `POST /metadata/recent-changes`

The browser calls `/api/metadata/recent-changes`; direct API clients use
`/metadata/recent-changes`. The strict request accepts one stable entity URN, an optional canonical UTC
end time, and bounded integer controls. `windowHours` defaults to `168` (seven days) and is capped at
`720` (30 days); `limit` defaults to `10` and is capped at `20`. Unknown fields are rejected, so a
client cannot supply GraphQL, raw provider filters, or a provider cursor.

Request:

```json
{
  "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)",
  "windowHours": 168,
  "limit": 3
}
```

Response `200`:

```json
{
  "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)",
  "window": {
    "startTime": "2026-07-12T08:30:00.000Z",
    "endTime": "2026-07-19T08:30:00.000Z",
    "hours": 168
  },
  "limit": 3,
  "returnedCount": 3,
  "truncated": true,
  "changes": [
    {
      "id": "change-root-owner",
      "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,lineage.demo.root,PROD)",
      "timestamp": "2026-07-19T07:45:00.000Z",
      "category": "ownership",
      "operation": "modified",
      "actor": "Fixture steward",
      "source": "fixture",
      "summary": "Ownership was updated for lineage.demo.root."
    }
  ]
}
```

Change IDs are stable and unique. Timestamps are canonical UTC, every row matches the requested entity
and accepted window, and rows are ordered newest-first with ID as the stable same-timestamp tie-break.
Categories and operations are allowlisted; the optional `field` contains a bounded field/aspect label.
`returnedCount` equals the list length. `truncated` is true when the selected window, accepted limit, or
the documented provider transaction cap omits history. No synthetic cursor is exposed because the
official DataHub timeline GraphQL input has no page/cursor semantics.

An entity with no recorded history in the selected window returns `changes: []`, `returnedCount: 0`,
and `truncated: false` when no older/provider-capped history was observed. A missing entity returns HTTP
`404` with the existing `NOT_FOUND` envelope. Invalid requests return HTTP `400` with
`VALIDATION_ERROR` and message `The metadata recent-changes request is invalid.` Other provider failures
use the existing safe metadata mapping:

| Provider status    | HTTP | Error code                  |
| ------------------ | ---- | --------------------------- |
| `unconfigured`     | 503  | `METADATA_UNCONFIGURED`     |
| `unauthorized`     | 502  | `METADATA_UNAUTHORIZED`     |
| `unavailable`      | 503  | `METADATA_UNAVAILABLE`      |
| `timeout`          | 504  | `METADATA_TIMEOUT`          |
| `invalid_response` | 502  | `METADATA_INVALID_RESPONSE` |

Fixture mode uses the fixed fixture snapshot time, returns multiple categories with deterministic
same-timestamp ordering/dedup, and never reads `DATAHUB_GMS_URL`, `DATAHUB_TOKEN`, Stitch, an LLM, or
another credential. The canonical incident change remains unchanged.

DataHub mode sends exactly one Bearer-authenticated GraphQL request to `/api/graphql` using official
`getTimeline(input: GetTimelineInput!)` semantics and checks `entity(urn:)` in the same request to
distinguish a missing entity. The official input accepts only `urn` and optional categories; it exposes
no time range, count, page token, or cursor. The resolver uses `DEFAULT_MAX_CHANGE_TRANSACTIONS = 100`,
so the client applies the accepted time/count bounds locally and marks a full 100-transaction response
as truncated. This follows the official
[`timeline.graphql` schema](https://github.com/datahub-project/datahub/blob/master/datahub-graphql-core/src/main/resources/timeline.graphql),
official web-client
[`timeline.graphql` query](https://github.com/datahub-project/datahub/blob/master/datahub-web-react/src/graphql/timeline.graphql),
official
[`GetTimelineResolver`](https://github.com/datahub-project/datahub/blob/master/datahub-graphql-core/src/main/java/com/linkedin/datahub/graphql/resolvers/timeline/GetTimelineResolver.java),
and official
[`TimelineService`](https://github.com/datahub-project/datahub/blob/master/metadata-service/services/src/main/java/com/linkedin/metadata/timeline/TimelineService.java).
There is one total timeout/AbortSignal, no retry or fan-out, and no raw actor URN, provider description,
payload, token, URL, header, GraphQL error, exception, or stack trace crosses the client boundary.

### `POST /incidents`

The browser calls `/api/incidents`; the Vite development proxy removes `/api` before forwarding to
the API. Direct API clients use `/incidents`.

Request:

```json
{
  "question": "Why did revenue drop today?",
  "entityHint": "analytics.revenue_daily",
  "occurredAt": "2026-07-18T03:00:00Z",
  "symptom": "Revenue is 35% below the trailing seven-day average."
}
```

Accepted response `202`:

```json
{
  "incidentId": "576982bc-da91-4d69-a5ad-52206b3e17e2",
  "status": "processing"
}
```

Validation response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The incident request is invalid.",
    "issues": [
      {
        "path": "question",
        "message": "Too small: expected string to have >=3 characters"
      }
    ]
  }
}
```

`IncidentRequestSchema`, `IncidentAcceptedResponseSchema`, and `ApiErrorSchema` in
`packages/shared-types` are the source of truth. Optional request fields are omitted when blank. The
accepted response remains compatible with Slice 1.1: it always uses HTTP `202` and `processing` even
though fixture investigation begins immediately in the background.

The accepted body intentionally remains unchanged through Slice 3.3. Clients retrieve the additive
parse-and-gather, suspicious-change, and evidence-linked scoring lifecycles through
`GET /incidents/:incidentId`.

### `GET /incidents/:incidentId`

The browser calls `/api/incidents/:incidentId`; direct API clients use
`/incidents/:incidentId`. Fixture incidents are held in process memory and transition from
`processing` to `completed`.

Processing response `200`:

```json
{
  "incidentId": "576982bc-da91-4d69-a5ad-52206b3e17e2",
  "status": "processing",
  "contextStage": {
    "status": "gathering"
  },
  "suspiciousChangeStage": {
    "status": "detecting"
  },
  "hypothesisScoringStage": {
    "status": "scoring"
  }
}
```

While the legacy report remains `processing`, `contextStage` may already be terminal. A successful
facts-only stage has this provider-neutral shape (values abridged):

```json
{
  "status": "completed",
  "intent": {
    "question": "Why did revenue drop today?",
    "entityHints": ["analytics.daily_revenue"],
    "symptoms": ["Revenue is below the seven-day baseline."],
    "timeWindow": {
      "endTime": "2026-07-18T08:30:00.000Z",
      "hours": 168,
      "basis": "incident_time"
    }
  },
  "facts": {
    "sourceMode": "fixture",
    "candidateEntities": [
      {
        "urn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)",
        "kind": "dataset",
        "name": "analytics.daily_revenue"
      }
    ],
    "selectedEntity": {
      "urn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)",
      "kind": "dataset",
      "name": "analytics.daily_revenue"
    },
    "lineage": {
      "rootUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)",
      "direction": "upstream",
      "requestedDepth": 2,
      "maxNodes": 5,
      "visitedNodeCount": 1,
      "truncated": false,
      "nodes": [
        {
          "urn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)",
          "kind": "dataset",
          "name": "analytics.daily_revenue",
          "depth": 0
        }
      ],
      "edges": []
    },
    "recentChanges": [
      {
        "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.daily_revenue,PROD)",
        "window": {
          "startTime": "2026-07-11T08:30:00.000Z",
          "endTime": "2026-07-18T08:30:00.000Z",
          "hours": 168
        },
        "limit": 10,
        "returnedCount": 0,
        "truncated": false,
        "changes": []
      }
    ]
  },
  "missingInformation": []
}
```

`lineage` and each `recentChanges` item use the existing shared metadata response schemas. Candidate
entities are capped at five; the selected entity must exactly match one candidate; lineage must use
that selected URN as its root; and the single recent-change window references only a returned lineage
node.
A no-match search has no selected entity, makes no lineage/recent-change call, and includes
`entity_not_found` in `missingInformation`. Other missing codes distinguish absent optional intake,
empty lineage/history, and bounded truncation. These are facts and missing information only; the stage
contains no hypothesis, confidence, causal inference, evidence chain, recommendation, or remediation.

A safe terminal failure is returned inside the incident response rather than as a raw provider error:

```json
{
  "status": "failed",
  "error": {
    "code": "METADATA_TIMEOUT",
    "message": "Incident context gathering timed out."
  }
}
```

Allowed context error codes are the existing normalized metadata codes plus `INTERNAL_ERROR`. Provider
URL, token, Authorization header, GraphQL/error body, exception, and stack are never returned. Fixture
and DataHub modes use the same health/search/lineage/recent-change interfaces; default execution makes
at most four calls under one two-second timeout/AbortSignal, with no retry or unbounded fan-out.

`suspiciousChangeStage` is additive and follows context ownership. While context is `gathering`, it is
`detecting`. A failed context produces a safe `unavailable` stage with code `CONTEXT_UNAVAILABLE`; the
detector is not invoked. A completed context synchronously produces a pure `completed` or
`insufficient` result. Unexpected detection validation becomes safe `DETECTION_INVALID`; it does not
expose a provider URL, token, payload, exception, or stack and does not prevent the legacy report from
completing.

A completed result has at most five unique candidates. Every candidate exactly resolves to a change
fact and entity URN/name in the completed context and copies only normalized factual fields:

```json
{
  "status": "completed",
  "candidates": [
    {
      "changeId": "change-removed-gross-revenue",
      "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.orders,PROD)",
      "entityName": "raw.orders",
      "category": "schema",
      "operation": "removed",
      "observedAt": "2026-07-18T07:45:00.000Z",
      "summary": "Column gross_revenue was removed from raw.orders.",
      "field": "gross_revenue",
      "signals": [
        {
          "code": "incident_window",
          "label": "Change was observed within the supplied incident window."
        },
        {
          "code": "upstream_lineage",
          "label": "Change belongs to an adapter-evidenced upstream entity."
        },
        {
          "code": "disruptive_operation",
          "label": "Change operation is removed or modified."
        }
      ]
    }
  ],
  "missingInformation": []
}
```

Allowed signal codes are `category_intent_match`, `incident_window`, `selected_entity`,
`upstream_lineage`, and `disruptive_operation`, with shared fixed factual labels and ordering. Results
are ranked by fixed bounded signal priority, then newest timestamp and change ID; no numeric score or
confidence crosses the boundary. An `insufficient` result contains `candidates: []` and at least one
missing-information item explaining absent incident time/symptom, empty/truncated history, no matching
incident-specific signal, or output-cap omission. Neither result permits hypothesis, confidence,
root-cause, recommendation, remediation, or raw-provider fields.

`hypothesisScoringStage` is additive and does not make an adapter, provider, network, model, or retry
call. It is `scoring` while context/detection or the report evidence catalog is assembling. Failed
context returns safe `CONTEXT_UNAVAILABLE`; unavailable detection returns safe
`SUSPICIOUS_CHANGES_UNAVAILABLE`; unexpected scoring validation returns safe `SCORING_INVALID`.
Provider URL, token, payload, raw exception, stack, model output, and credential data never enter the
stage.

A completed scoring result has at most three ranked inference objects. The canonical fixture returns:

```json
{
  "status": "completed",
  "hypotheses": [
    {
      "id": "hypothesis-change-removed-gross-revenue",
      "rank": 1,
      "sourceChangeId": "change-removed-gross-revenue",
      "observedAt": "2026-07-18T07:45:00.000Z",
      "summary": "Plausible contributor: the removed schema change on raw.orders may have contributed to the incident.",
      "confidence": 0.85,
      "evidenceIds": ["change-removed-gross-revenue"],
      "factors": [
        {
          "code": "change_recency",
          "label": "Change recency within the supplied incident window.",
          "contributionBasisPoints": 3000,
          "weightBasisPoints": 3000
        },
        {
          "code": "lineage_position",
          "label": "Adapter-evidenced selected or upstream lineage position.",
          "contributionBasisPoints": 2000,
          "weightBasisPoints": 2000
        },
        {
          "code": "symptom_category_fit",
          "label": "Bounded incident symptom or category fit.",
          "contributionBasisPoints": 1500,
          "weightBasisPoints": 3000
        },
        {
          "code": "evidence_quality",
          "label": "Resolved factual evidence quality and context completeness.",
          "contributionBasisPoints": 2000,
          "weightBasisPoints": 2000
        }
      ]
    }
  ],
  "missingInformation": []
}
```

The four factor weights total 10,000 basis points. Confidence is their exact clamped contribution sum
divided by 10,000, with at most two decimal places. Ordering is confidence descending, factual
observation time descending, change ID ascending, then hypothesis ID ascending; ranks are contiguous
from one. Every source change and evidence ID resolves to exact completed-context and report evidence.
Recent-change truncation, a detector candidate cap, missing evidence mapping, or an insufficient
suspicious result produces `insufficient`, `hypotheses: []`, and explicit unique missing information
instead of a low-confidence root cause. Unknown recommendation/remediation/action/raw-provider/model
fields, causal copy, duplicate IDs/references, factor/score/rank mismatch, and invalid ordering are
rejected.

Completed response `200` (legacy report fields remain compatible; scoring values abridged):

```json
{
  "incidentId": "576982bc-da91-4d69-a5ad-52206b3e17e2",
  "status": "completed",
  "contextStage": {
    "status": "completed",
    "intent": {
      "question": "Why did revenue drop today?",
      "entityHints": [],
      "symptoms": [],
      "timeWindow": { "hours": 168, "basis": "provider_default" }
    },
    "facts": {
      "sourceMode": "fixture",
      "candidateEntities": [],
      "recentChanges": []
    },
    "missingInformation": [
      {
        "code": "entity_not_found",
        "message": "The metadata source returned no candidate entity for the normalized intake."
      }
    ]
  },
  "suspiciousChangeStage": {
    "status": "insufficient",
    "candidates": [],
    "missingInformation": [
      {
        "code": "recent_changes_not_found",
        "message": "No recent metadata change facts were available for deterministic detection."
      }
    ]
  },
  "hypothesisScoringStage": {
    "status": "insufficient",
    "hypotheses": [],
    "missingInformation": [
      {
        "code": "suspicious_changes_insufficient",
        "message": "Suspicious-change detection returned no candidate to score."
      }
    ]
  },
  "report": {
    "incidentId": "576982bc-da91-4d69-a5ad-52206b3e17e2",
    "summary": "The strongest evidence-backed inference is: ...",
    "entities": [],
    "evidence": [
      {
        "id": "change-removed-gross-revenue",
        "category": "schema-change",
        "statement": "Column gross_revenue was removed from raw.orders."
      }
    ],
    "hypotheses": [
      {
        "id": "hypothesis-recent-change",
        "summary": "A recent schema change remains a legacy plausible contributor.",
        "confidence": 0.8,
        "evidenceIds": ["change-removed-gross-revenue"]
      }
    ],
    "recommendations": ["Confirm the schema contract and restore or replace the field."],
    "assumptions": ["The fixture snapshot represents the incident window."],
    "missingInformation": ["Runtime query logs are not included in the fixture."]
  }
}
```

When scoring completes, the actual fixture report uses the exact scored hypotheses and cited evidence
shown by `hypothesisScoringStage`; shared validation rejects any divergence or unresolved evidence ID.
When scoring is insufficient or unavailable, the compatible legacy report remains separately
schema-valid and the scoring stage contains no fabricated fallback. Evidence statements are fixture
facts; hypotheses are ranked inferences; assumptions, missing information, and recommendations remain
separate report fields.

Unknown incident response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested incident was not found."
  }
}
```

If background investigation fails, retrieval returns HTTP `500` with the sanitized
`INTERNAL_ERROR` envelope. Logs include only the generated incident ID, fixture mode, bounded result
counts, and an error class; incident text and credentials are not logged.

`IncidentRetrievalResponseSchema`, `InvestigationReportSchema`, and `ApiErrorSchema` in
`packages/shared-types` are the source of truth. In-memory fixture state is intentionally not durable
across API restarts.

## Compatibility

Add fields compatibly during the MVP. Any removal or semantic change requires an ADR and coordinated
web/API update in one slice.
