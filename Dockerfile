# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/agent-core/package.json packages/agent-core/package.json
COPY packages/datahub-client/package.json packages/datahub-client/package.json
COPY packages/evaluation/package.json packages/evaluation/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN mkdir -p /tmp/dii-attribution \
    && DII_RELEASE_ARTIFACT_BUILD=1 \
       DII_BUNDLE_ATTRIBUTION_OUTPUT=/tmp/dii-attribution/vite-provenance.json \
       pnpm --filter @dii/api... --filter @dii/web build \
    && node scripts/runtime-attribution.mjs verify-source \
       --bundle-provenance /tmp/dii-attribution/vite-provenance.json

FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS production-dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/agent-core/package.json packages/agent-core/package.json
COPY packages/datahub-client/package.json packages/datahub-client/package.json
COPY packages/evaluation/package.json packages/evaluation/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --prod --frozen-lockfile --filter @dii/api...

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/packages/agent-core/dist packages/agent-core/dist
COPY --from=build /app/packages/datahub-client/dist packages/datahub-client/dist
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/fixtures/metadata/removed-schema-column.json fixtures/metadata/removed-schema-column.json
COPY --from=build /app/LICENSE /app/NOTICE /app/THIRD_PARTY_NOTICES.txt /app/RUNTIME-ATTRIBUTION.json ./
COPY --from=build /app/third_party_licenses third_party_licenses
COPY --from=build /app/scripts/bundle-attribution.mjs /app/scripts/pnpm-lock-identity.mjs /app/scripts/prepare-runtime-manifests.mjs /app/scripts/release-path-safety.mjs /app/scripts/runtime-attribution.mjs scripts/

RUN node scripts/prepare-runtime-manifests.mjs \
    && node scripts/runtime-attribution.mjs verify-runtime

FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS runtime

ENV NODE_ENV=production
ENV APP_MODE=fixture
ENV API_HOST=0.0.0.0
ENV PORT=8080
ENV WEB_DIST_DIR=/app/apps/web/dist

WORKDIR /app

COPY --from=production-dependencies /app /app

RUN rm -rf /app/scripts /app/apps/web/package.json /app/packages/evaluation

EXPOSE 8080

USER node

CMD ["node", "apps/api/dist/index.js"]
