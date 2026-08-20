# k3s deployment

These manifests deploy the backend to a **single-node k3s** cluster. They do
not replace `docker-compose.yml`; keep Compose as the recovery path until the
k3s smoke test succeeds.

## Before applying

1. Install k3s with its default Traefik and metrics-server components.
2. Install cert-manager, set the real contact address in
   `cluster/cluster-issuer.yaml`, then apply it with
   `kubectl apply -f k8s/cluster/cluster-issuer.yaml`.
3. Set the real API hostname in `base/ingress.yaml`.
4. Replace `PROJECT_ID` and `COMMIT_SHA` in
   `overlays/production/kustomization.yaml`, or have CI update only the tags.
5. Create service-specific runtime secrets on the VM. Never commit the source
   `.env` files or Secret manifests.

Required Secret names and minimum keys:

| Secret | Required keys |
| --- | --- |
| `gateway-env` | `JWT_SECRET` |
| `core-env` | `CORE_DATABASE_URL`, `CORE_DIRECT_URL`, `REDIS_URL`, `JWT_SECRET` |
| `products-env` | `PRODUCTS_DATABASE_URL`, `PRODUCTS_DIRECT_URL`, `REDIS_URL`, `SUPABASE_PRODUCTS_URL`, `SUPABASE_PRODUCTS_SERVICE_ROLE_KEY` |
| `transactions-env` | `TRANSACTIONS_DATABASE_URL`, `TRANSACTIONS_DIRECT_URL` |
| `outbox-env` | `TRANSACTIONS_DATABASE_URL`, `RABBITMQ_URL` |
| `reports-env` | `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_USERNAME`, `CLICKHOUSE_PASSWORD` |
| `analytics-env` | `GEMINI_API_KEY` |

Example, executed on the VM:

```sh
kubectl create namespace jagoan-pos
kubectl -n jagoan-pos create secret generic gateway-env \
  --from-env-file=/opt/jagoan-pos/secrets/gateway.env
```

Use `kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -`
when updating an existing secret. Restart the relevant Deployment afterwards.

## Apply and verify

```sh
kubectl apply -k k8s/overlays/production
kubectl -n jagoan-pos rollout status deployment/api-gateway --timeout=180s
kubectl -n jagoan-pos get pods,svc,ingress,hpa
kubectl -n jagoan-pos top pods
```

Only `api-gateway` is exposed through Traefik. Core, Products, Transactions,
Reports, and Analytics are TCP `ClusterIP` services resolved by their service
name inside the namespace. Outbox Relay is an internal worker and exposes no
port.

The HPA resources are intentionally capped for a single VM: gateway at three
replicas, products and transactions at two. Each target has a CPU request,
which is required for CPU-based HPA calculations.

## Private Artifact Registry

k3s uses containerd and does not automatically reuse Docker credential-helper
configuration. For this single-node demo, pull each immutable image with Docker
using the VM service account, then import it before applying the manifests:

```sh
for service in api-gateway core products transactions outbox-relay reports analytics; do
  sudo docker pull "${IMAGE_PREFIX}/${service}:${IMAGE_TAG}"
  sudo docker image save "${IMAGE_PREFIX}/${service}:${IMAGE_TAG}" | \
    sudo k3s ctr -n k8s.io images import -
done
```

The Deployments use `imagePullPolicy: IfNotPresent`, so the kubelet uses the
locally imported immutable image. CI should perform the same pull/import step
over IAP before `kubectl apply -k`. The repository workflow does this through
`deploy/gcp/rollout-k3s.sh`; it no longer uses Docker Compose for deployment.
