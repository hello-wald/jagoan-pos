# GCE deployment

This Compose stack deploys the API gateway, the core service, and Caddy as the
HTTPS reverse proxy. Supabase, Upstash Redis, and the Vercel frontend remain
external services.

## First deployment

1. Copy the environment template without committing secrets:

   ```bash
   cp deploy/gcp/.env.example deploy/gcp/.env
   chmod 600 deploy/gcp/.env
   ```

2. Replace every placeholder in `deploy/gcp/.env`. Use the Supabase pooled URL
   (port 6543) for `CORE_DATABASE_URL` and the direct URL (port 5432) for
   `CORE_DIRECT_URL`, which Prisma Migrate needs.

3. Point the `API_DOMAIN` DNS A record to the VM static IP, then start:

   ```bash
   docker compose --env-file deploy/gcp/.env up -d
   docker compose --env-file deploy/gcp/.env ps
   ```

4. Verify the gateway after TLS is issued:

   ```bash
   curl -fsS https://API_DOMAIN/api/health
   ```

Only ports 80 and 443 are public. Core TCP stays on the private Docker network.
