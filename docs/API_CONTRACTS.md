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
