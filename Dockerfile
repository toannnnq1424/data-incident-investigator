# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build

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

RUN pnpm --filter @dii/web build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV APP_MODE=fixture
ENV API_HOST=0.0.0.0
ENV WEB_DIST_DIR=/app/apps/web/dist

WORKDIR /app

COPY --from=build /app /app

EXPOSE 8080

CMD ["./apps/api/node_modules/.bin/tsx", "apps/api/src/index.ts"]
