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
4. Start API with production environment and call `/health`.
5. Serve the web artifact and complete one fixture-backed incident flow.
6. Add DataHub variables only for a separate credentialed smoke test.
7. Record public URLs and limitations here and in `README.md`.

## Health and rollback

`GET /health` is the process health signal. A release must be replaceable by the last known-good image or
artifact. Database migrations and persistent incident storage are not part of the MVP foundation.
