# Build from the repository root:
# docker build -f apps/products-service/Dockerfile -t app-k/products-service:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci \
  && npm run build --workspace=@jagoan-pos/shared \
  && cd apps/products-service && npx prisma generate \
  && cd /app && npm run build --workspace=products-service \
  && npm prune --omit=dev
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/products-service ./apps/products-service
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/package.json ./package.json
EXPOSE 4002
CMD ["node", "apps/products-service/dist/main.js"]
