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

### `GET /incidents/:incidentId`

The browser calls `/api/incidents/:incidentId`; direct API clients use
`/incidents/:incidentId`. Fixture incidents are held in process memory and transition from
`processing` to `completed`.

Processing response `200`:

```json
{
  "incidentId": "576982bc-da91-4d69-a5ad-52206b3e17e2",
  "status": "processing"
}
```

Completed response `200` (abridged values, complete shape shown):

```json
{
  "incidentId": "576982bc-da91-4d69-a5ad-52206b3e17e2",
  "status": "completed",
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
        "summary": "A recent schema change likely caused the reported incident.",
        "confidence": 0.92,
        "evidenceIds": ["change-removed-gross-revenue"]
      }
    ],
    "recommendations": ["Confirm the schema contract and restore or replace the field."],
    "assumptions": ["The fixture snapshot represents the incident window."],
    "missingInformation": ["Runtime query logs are not included in the fixture."]
  }
}
```

The actual fixture report contains at least one hypothesis and its cited evidence. Shared report
validation rejects any hypothesis evidence ID that is absent from `report.evidence`. Evidence
statements are fixture facts; hypotheses are ranked inferences; assumptions, missing information, and
recommendations remain separate report fields.

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
