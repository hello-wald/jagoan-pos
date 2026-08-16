# Build from the repository root:
# docker build -f apps/outbox-relay/Dockerfile -t jagoan-pos/outbox-relay:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/core/package.json apps/core/
COPY apps/outbox-relay/package.json apps/outbox-relay/
COPY apps/products/package.json apps/products/
COPY apps/transactions/package.json apps/transactions/
COPY packages/contracts/package.json packages/contracts/
COPY packages/redis/package.json packages/redis/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/outbox-relay ./apps/outbox-relay

# No prisma:generate — the relay reaches the outbox through pg, not Prisma.
RUN npm run build:packages \
  && npm run build --workspace=@jagoan-pos/outbox-relay \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/outbox-relay ./apps/outbox-relay
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json

USER node
# No EXPOSE: the relay serves nothing, it only polls and publishes.
CMD ["node", "apps/outbox-relay/dist/main.js"]
