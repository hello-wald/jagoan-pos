#!/usr/bin/env sh
# Runs on the single-node k3s VM. Runtime Secrets are already stored in the
# cluster; CI supplies only an immutable Artifact Registry image prefix and tag.
set -eu

registry="${1:?Artifact Registry image prefix is required}"
tag="${2:?Image tag is required}"

case "$tag" in
  *[!0-9a-f]*)
    echo "IMAGE_TAG must be a full lowercase Git commit SHA" >&2
    exit 1
    ;;
esac

command -v k3s >/dev/null
command -v docker >/dev/null
command -v sudo >/dev/null
test -d k8s/base
test -f k8s/overlays/production/kustomization.yaml

# k3s uses containerd, not Docker's image store. The VM service account is
# authorized to pull from Artifact Registry; importing keeps registry
# credentials out of Kubernetes Secrets for this single-node deployment.
for service in api-gateway core products transactions outbox-relay reports analytics; do
  image="${registry}/${service}:${tag}"
  sudo -n docker pull "$image"
  sudo -n docker image save "$image" | sudo -n k3s ctr -n k8s.io images import -
done

# Render a disposable overlay, so the committed production template keeps its
# PROJECT_ID and COMMIT_SHA placeholders. Keep base and overlay in one temporary
# root because Kustomize does not load resources outside its root by default.
render_root="$(mktemp -d)"
trap 'rm -rf "$render_root"' EXIT INT TERM
cp -R k8s/base "$render_root/base"
mkdir -p "$render_root/overlays/production"
sed \
  -e "s|asia-southeast2-docker.pkg.dev/PROJECT_ID/jagoan-pos|$registry|g" \
  -e "s|COMMIT_SHA|$tag|g" \
  k8s/overlays/production/kustomization.yaml \
  > "$render_root/overlays/production/kustomization.yaml"

sudo -n k3s kubectl apply -k "$render_root/overlays/production"

for deployment in api-gateway core products transactions outbox-relay reports analytics; do
  sudo -n k3s kubectl -n jagoan-pos rollout status "deployment/${deployment}" --timeout=180s
done

sudo -n k3s kubectl -n jagoan-pos get pods,svc,ingress,hpa
