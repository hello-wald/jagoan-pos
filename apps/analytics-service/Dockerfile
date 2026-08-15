# Build from the repository root:
# docker build -f apps/analytics-service/Dockerfile -t app-k/analytics-service:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci \
  && npm run build --workspace=@jagoan-pos/shared \
  && npm run build --workspace=analytics-service \
  && npm prune --omit=dev
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/analytics-service ./apps/analytics-service
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "apps/analytics-service/dist/main.js"]
