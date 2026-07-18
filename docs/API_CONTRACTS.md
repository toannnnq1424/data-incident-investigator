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

## Planned for Slice 1.1

### `POST /api/incidents`

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
  "incidentId": "inc_...",
  "status": "queued"
}
```

Validation response `400`:

```json
{
  "error": {
    "code": "INVALID_INCIDENT_REQUEST",
    "message": "Incident request is invalid.",
    "fields": [{ "path": "question", "message": "Question is required." }]
  }
}
```

Exact response schemas will be added to `packages/shared-types` before the route is implemented.

## Planned report retrieval

`GET /api/incidents/:incidentId` returns lifecycle state and, when completed, a validated
`InvestigationReport`. Unknown IDs return `404`; provider failures use a sanitized stable error code.

## Compatibility

Add fields compatibly during the MVP. Any removal or semantic change requires an ADR and coordinated
web/API update in one slice.
