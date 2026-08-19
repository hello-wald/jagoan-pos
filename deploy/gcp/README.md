# GCE deployment

This Compose stack deploys the API gateway, Core, Products, Transactions,
Outbox Relay, Reports, Analytics, and Caddy as the HTTPS reverse proxy.
Supabase, Upstash Redis, RabbitMQ, ClickHouse, Gemini, and the Vercel frontend
remain external services.

## First deployment

1. Copy the environment template without committing secrets:

   ```bash
   cp deploy/gcp/.env.example deploy/gcp/.env
   chmod 600 deploy/gcp/.env
   ```

2. Replace every placeholder in `deploy/gcp/.env`. Use the Supabase pooled URL
   (port 6543) for each runtime `*_DATABASE_URL` and the direct URL (port 5432)
   for each `*_DIRECT_URL`, which Prisma Migrate needs. Products must use its
   own Supabase project/database rather than the Core connection URL.

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

## GitHub Actions deployment

The repository workflow at `.github/workflows/ci-cd.yml` runs quality checks on
every pull request to `main`. A push to `main` builds the seven backend images,
applies migrations, then rolls the Compose stack on GCE. The Next.js web app is
not part of this stack: it remains deployed to Vercel.

Create a protected GitHub Environment named `production`, then configure:

| GitHub configuration | Value |
| --- | --- |
| Variable `GCP_PROJECT_ID` | Google Cloud project ID |
| Variable `GCP_REGION` | Artifact Registry region, e.g. `asia-southeast2` |
| Variable `GCP_ARTIFACT_REPOSITORY` | Docker repository name, e.g. `jagoan-pos` |
| Variable `GCE_INSTANCE` / `GCE_ZONE` | Target VM name and zone |
| Variable `GCE_DEPLOY_PATH` | Absolute checkout path on the VM, e.g. `/opt/jagoan-pos` |
| Secret `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity Provider resource name |
| Secret `GCP_DEPLOY_SERVICE_ACCOUNT` | CI service-account email |
| Database and analytics secrets | `CORE_DIRECT_URL`, `PRODUCTS_DIRECT_URL`, `TRANSACTIONS_DIRECT_URL`, `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_USERNAME`, `CLICKHOUSE_PASSWORD`, and `RABBITMQ_URL` |

Use Workload Identity Federation rather than a downloaded service-account key.
Grant the GitHub deploy service account Artifact Registry Writer, Compute OS
Login, and IAP-secured Tunnel User. It also needs access to the chosen VM. On
the VM, grant its attached service account Artifact Registry Reader and run
`gcloud auth configure-docker REGION-docker.pkg.dev` once, so Docker Compose
can pull private images. Ensure the VM checkout contains this `rollout.sh`, the
latest `docker-compose.yml`, and its uncommitted `deploy/gcp/.env`.

`rollout.sh` replaces only `*_IMAGE` entries with full commit-SHA tags, pulls
them, and restarts Compose. It never receives or writes runtime secrets.
