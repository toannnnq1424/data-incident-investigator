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
current slice accepts an incident but does not persist it; retrieval is added with Slice 1.2.

## Planned report retrieval

`GET /api/incidents/:incidentId` returns lifecycle state and, when completed, a validated
`InvestigationReport`. Unknown IDs return `404`; provider failures use a sanitized stable error code.

## Compatibility

Add fields compatibly during the MVP. Any removal or semantic change requires an ADR and coordinated
web/API update in one slice.
