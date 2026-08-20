# GCE deployment

`docker-compose.yml` remains a local and recovery fallback. Production CI/CD
deploys the API gateway, Core, Products, Transactions, Outbox Relay, Reports,
and Analytics to a single-node k3s VM. Traefik is the Kubernetes HTTPS ingress.
Supabase, Upstash Redis, RabbitMQ, ClickHouse, Gemini, and the Vercel frontend
remain external services.

## First k3s deployment

1. Follow [the k3s deployment guide](../../k8s/README.md) to install k3s,
   Traefik, metrics-server, and cert-manager on the VM. Point the API DNS A
   record to its static external IP. Only ports 80 and 443 are public.

2. Create the service-specific Kubernetes Secrets described in that guide.
   Use pooled Supabase URLs (port 6543) for runtime `*_DATABASE_URL` values and
   direct URLs (port 5432) for `*_DIRECT_URL` values. Products must use its own
   Supabase project/database rather than the Core connection URL.

3. Create `GCE_DEPLOY_PATH` on the VM (for example `/opt/jagoan-pos`) and make
   it writable by the OS Login account used by the GitHub deploy service
   account. It must contain at least the checked-out `deploy/gcp/` directory;
   CI copies `k8s/` and `rollout-k3s.sh` there on each rollout.

4. Configure Docker on the VM to use its attached Artifact Registry Reader
   service account, then verify it can pull one image:

   ```bash
   gcloud auth configure-docker REGION-docker.pkg.dev --quiet
   sudo docker pull REGION-docker.pkg.dev/PROJECT_ID/jagoan-pos/api-gateway:COMMIT_SHA
   ```

5. Merge to `main` and approve the protected `production` environment. CI
   builds images, applies migrations, then imports images and applies the k3s
   overlay. Verify after the rollout:

   ```bash
   sudo k3s kubectl -n jagoan-pos get pods,svc,ingress,hpa
   curl -fsS https://API_DOMAIN/api/health
   ```

## Compose recovery fallback

The Compose template is retained only as an emergency recovery path. If it is
needed, copy `deploy/gcp/.env.example` to the uncommitted
`deploy/gcp/.env`, fill the runtime variables, and explicitly run Compose.
The GitHub Actions workflow does not do this automatically.

## GitHub Actions deployment

The repository workflow at `.github/workflows/ci-cd.yml` runs quality checks on
every pull request to `main`. A push to `main` builds the seven backend images,
applies migrations, then imports the immutable images into k3s containerd and
applies the production Kustomize overlay over IAP. The Next.js web app is not
part of this stack: it remains deployed to Vercel.

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
**Admin** Login, and IAP-secured Tunnel User. Admin Login is required because
the remote rollout uses passwordless `sudo` for Docker and k3s containerd. It
also needs access to the chosen VM. On the VM, grant its attached service
account Artifact Registry Reader and run
`gcloud auth configure-docker REGION-docker.pkg.dev` once, so Docker can pull
private images for import into k3s. Ensure the VM has the configured deploy
path and k3s installed before the first workflow run.

`rollout-k3s.sh` pulls each full commit-SHA tag through the VM service account,
imports it into k3s containerd, renders a disposable Kustomize overlay, and
waits for each Deployment rollout. It never receives or writes runtime secrets.
`rollout.sh` is retained only for Compose recovery.
