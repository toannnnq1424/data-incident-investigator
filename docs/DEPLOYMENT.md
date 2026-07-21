# Deployment

## Current state

Phase 0 provides build and start commands but no public deployment. Fixture mode remains the required
default for a reproducible demo.

## Build artifacts

- Web: `apps/web/dist`
- API: `apps/api/dist`, started with `pnpm --filter @dii/api start`

## Environment

Required for fixture deployment: `APP_MODE=fixture`, API host/port, web origin, and web API base URL.
DataHub and model keys are optional until their phases. Stitch is a developer design tool and is never a
production runtime variable.

## Planned deployment procedure

1. Clean install with `pnpm install --frozen-lockfile`.
2. Run `pnpm validate`.
3. Build web and API.
4. Start API with the selected production environment, call `/health` for process liveness, and require
   `/ready` before routing traffic.
5. Serve the web artifact and complete one fixture-backed incident flow.
6. Add DataHub variables only for a separate credentialed smoke test.
7. Record public URLs and limitations here and in `README.md`.

## Health and rollback

`GET /health` is the process-only liveness signal and always returns the strict body `{ "status":
"ok" }` while the API can serve requests. It must be used for process restart decisions only: it does
not probe or report mode, fixture assets, DataHub, model state, configuration, hostname, or uptime.

`GET /ready` is the traffic-readiness signal. HTTP `200` means all dependencies required by the selected
mode are ready; HTTP `503` contains only stable sanitized check/reason codes. Fixture deployment requires
`fixture_assets` ready and no external credential. DataHub deployment requires the bounded `datahub`
check plus the local `investigation_runtime` check ready. The current deterministic flow makes zero model
calls, so model is explicitly `not_required`; do not interpret that as a model availability probe. A
future explicitly configured model-health dependency becomes readiness-authoritative.

Orchestrators should stop sending new traffic on `/ready` `503` but must not restart solely because a
transient external dependency is unavailable while `/health` remains `200`. Neither probe retries,
switches mode, starts an investigation, or includes secret/config/provider detail. A release must remain
replaceable by the last known-good image or artifact. Database migrations and persistent incident
storage are not part of the MVP foundation.
