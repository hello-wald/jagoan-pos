#!/usr/bin/env sh
# Runs on the GCE VM. Secrets remain in deploy/gcp/.env on that VM; CI only
# supplies the immutable Artifact Registry image tag.
set -eu

registry="${1:?Artifact Registry image prefix is required}"
tag="${2:?Image tag is required}"
env_file="deploy/gcp/.env"

case "$tag" in
  *[!0-9a-f]*)
    echo "IMAGE_TAG must be a full lowercase Git commit SHA" >&2
    exit 1
    ;;
esac

test -f "$env_file"

for service in api-gateway analytics core products transactions outbox-relay reports; do
  variable="$(printf '%s' "$service" | tr '[:lower:]-' '[:upper:]_')_IMAGE"
  image="${registry}/${service}:${tag}"
  sed -i "s|^${variable}=.*|${variable}=${image}|" "$env_file"
done

docker compose --env-file "$env_file" pull
docker compose --env-file "$env_file" up -d --remove-orphans
docker compose --env-file "$env_file" ps
