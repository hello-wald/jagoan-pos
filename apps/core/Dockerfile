# Build from the repository root:
# docker build -f apps/core/Dockerfile -t jagoan-pos/core:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Manifests only, so the install layer is reused until a dependency actually changes.
# npm ci validates the lockfile against every workspace, so all of them must be present.
COPY package.json package-lock.json ./
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/core/package.json apps/core/
COPY apps/products/package.json apps/products/
COPY apps/transactions/package.json apps/transactions/
COPY apps/analytics-service/package.json apps/analytics-service/
COPY packages/contracts/package.json packages/contracts/
COPY packages/redis/package.json packages/redis/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/core ./apps/core

RUN npm run build:packages \
  && npm run prisma:generate --workspace=@jagoan-pos/core \
  && npm run build --workspace=@jagoan-pos/core \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/core ./apps/core
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json

USER node
EXPOSE 4001
CMD ["node", "apps/core/dist/main.js"]
