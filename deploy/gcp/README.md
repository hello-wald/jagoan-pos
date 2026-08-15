# GCE deployment

This Compose stack deploys the API Gateway, Core Service, private RabbitMQ, and
Caddy as the HTTPS reverse proxy. Supabase, Upstash Redis, ClickHouse Cloud,
and the Vercel frontend remain external services.

## First deployment

1. Copy the environment template without committing secrets:

   ```bash
   cp deploy/gcp/.env.example deploy/gcp/.env
   chmod 600 deploy/gcp/.env
   ```

2. Replace every placeholder in `deploy/gcp/.env`. Use the Supabase pooled URL
   for `CORE_DATABASE_URL`.

3. Point the `API_DOMAIN` DNS A record to the VM static IP, then start:

   ```bash
   docker compose --env-file deploy/gcp/.env up -d
   docker compose --env-file deploy/gcp/.env ps
   ```

4. Verify the gateway after TLS is issued:

   ```bash
   curl -fsS https://API_DOMAIN/api/health
   ```

Only ports 80 and 443 are public. Core TCP and RabbitMQ ports remain on the
private Docker network.
