# Build from the repository root:
# docker build -f apps/api-gateway/Dockerfile -t jagoan-pos/api-gateway:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Manifests only, so the install layer is reused until a dependency actually changes.
# npm ci validates the lockfile against every workspace, so all of them must be present.
COPY package.json package-lock.json ./
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/core/package.json apps/core/
COPY apps/products/package.json apps/products/
COPY apps/transactions/package.json apps/transactions/
COPY packages/contracts/package.json packages/contracts/
COPY packages/redis/package.json packages/redis/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api-gateway ./apps/api-gateway

RUN npm run build:packages \
  && npm run build --workspace=@jagoan-pos/api-gateway \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway ./apps/api-gateway
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json

USER node
EXPOSE 3000
CMD ["node", "apps/api-gateway/dist/main.js"]
