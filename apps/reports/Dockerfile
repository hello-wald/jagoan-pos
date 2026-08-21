# Build from the repository root:
# docker build -f apps/reports/Dockerfile -t jagoan-pos/reports:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

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
COPY apps/reports ./apps/reports

# No prisma:generate — reports reads ClickHouse and owns no relational schema.
RUN npm run build:packages \
  && npm run build --workspace=@jagoan-pos/reports

# The migration image deliberately retains ts-node and the source scripts. It
# is only used by the in-cluster migration Job, never by the reports server.
FROM builder AS migration
CMD ["npm", "run", "clickhouse:migrate", "--workspace=@jagoan-pos/reports"]

FROM builder AS production-deps
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/apps/reports ./apps/reports
COPY --from=production-deps /app/packages ./packages
COPY --from=production-deps /app/package.json ./package.json

USER node
EXPOSE 4004
CMD ["node", "apps/reports/dist/main.js"]
