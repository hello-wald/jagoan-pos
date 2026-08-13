# Build from the repository root:
# docker build -f apps/core/Dockerfile -t app-k/core-service:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci \
  && npm run build --workspace=@app-k/shared \
  && npm run build --workspace=@app-k/redis \
  && cd apps/core && npx prisma generate \
  && cd /app && npm run build --workspace=core-service \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/core ./apps/core
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/redis ./packages/redis
COPY --from=builder /app/package.json ./package.json

EXPOSE 4001
CMD ["node", "apps/core/dist/main.js"]
