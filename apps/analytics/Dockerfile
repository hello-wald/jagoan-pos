# Build from the repository root:
# docker build -f apps/analytics/Dockerfile -t jagoan-pos/analytics:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# npm ci validates every workspace manifest, so keep this list in sync with apps/*.
COPY package.json package-lock.json ./
COPY apps/analytics/package.json apps/analytics/
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/core/package.json apps/core/
COPY apps/outbox-relay/package.json apps/outbox-relay/
COPY apps/products/package.json apps/products/
COPY apps/reports/package.json apps/reports/
COPY apps/transactions/package.json apps/transactions/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/redis/package.json packages/redis/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/analytics ./apps/analytics

RUN npm run build:packages \
  && npm run build --workspace=@jagoan-pos/analytics \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/analytics ./apps/analytics
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json

USER node
EXPOSE 4005
CMD ["node", "apps/analytics/dist/main.js"]
