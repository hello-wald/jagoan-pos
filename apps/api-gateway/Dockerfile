# Build from the repository root:
# docker build -f apps/api-gateway/Dockerfile -t app-k/api-gateway:local .
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci \
  && npm run build --workspace=@app-k/shared \
  && npm run build --workspace=api-gateway \
  && npm prune --omit=dev
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway ./apps/api-gateway
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "apps/api-gateway/dist/main.js"]
