#!/usr/bin/env bash
# =====================================================================
# scripts/deploy.sh — build, push, deploy.
#
# Usage:
#   DO_REGISTRY=registry.digitalocean.com/your-registry \
#   DROPLET_HOST=1.2.3.4 \
#     ./scripts/deploy.sh
#
# Env vars:
#   DO_REGISTRY     required when pushing. e.g. registry.digitalocean.com/myreg
#   TAG             optional, defaults to short git sha.
#   DROPLET_HOST    optional. If set, ssh in and `compose pull && up -d`.
#   DROPLET_USER    optional, defaults to root.
#   DROPLET_PATH    optional, defaults to /srv/rest.
#   SKIP_BUILD      set to "true" to skip docker build.
#   SKIP_PUSH       set to "true" to skip docker push.
#   SKIP_REMOTE     set to "true" to skip the ssh deploy.
#   PLATFORM        defaults to linux/amd64 (DO droplets are x86).
# =====================================================================
set -euo pipefail

DO_REGISTRY="${DO_REGISTRY:-}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
DROPLET_USER="${DROPLET_USER:-root}"
DROPLET_PATH="${DROPLET_PATH:-/srv/rest}"
PLATFORM="${PLATFORM:-linux/amd64}"

if [[ -z "${DO_REGISTRY:-}" && "${SKIP_PUSH:-}" != "true" ]]; then
  echo "DO_REGISTRY not set — pass it or set SKIP_PUSH=true for local-only builds." >&2
  exit 1
fi

REG_PREFIX="${DO_REGISTRY:-local}"
API_IMAGE="${REG_PREFIX}/rest-api:${TAG}"
WEB_IMAGE="${REG_PREFIX}/rest-web:${TAG}"
API_LATEST="${REG_PREFIX}/rest-api:latest"
WEB_LATEST="${REG_PREFIX}/rest-web:latest"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ "${SKIP_BUILD:-}" != "true" ]]; then
  echo "==> Building API image: $API_IMAGE"
  docker buildx build \
    --platform "$PLATFORM" \
    --file apps/api/Dockerfile \
    --tag "$API_IMAGE" \
    --tag "$API_LATEST" \
    --load \
    .

  echo "==> Building Web image: $WEB_IMAGE"
  docker buildx build \
    --platform "$PLATFORM" \
    --file apps/web/Dockerfile \
    --tag "$WEB_IMAGE" \
    --tag "$WEB_LATEST" \
    --load \
    .
else
  echo "==> Skipping build (SKIP_BUILD=true)"
fi

if [[ "${SKIP_PUSH:-}" != "true" ]]; then
  echo "==> Logging in to DigitalOcean Container Registry"
  if command -v doctl >/dev/null 2>&1; then
    doctl registry login
  else
    echo "doctl not found. Run \`docker login registry.digitalocean.com\` manually first." >&2
  fi

  echo "==> Pushing images"
  docker push "$API_IMAGE"
  docker push "$API_LATEST"
  docker push "$WEB_IMAGE"
  docker push "$WEB_LATEST"
else
  echo "==> Skipping push (SKIP_PUSH=true)"
fi

if [[ -n "${DROPLET_HOST:-}" && "${SKIP_REMOTE:-}" != "true" ]]; then
  echo "==> Deploying to $DROPLET_USER@$DROPLET_HOST:$DROPLET_PATH"
  ssh -o StrictHostKeyChecking=accept-new "$DROPLET_USER@$DROPLET_HOST" \
    "cd $DROPLET_PATH \
       && export API_IMAGE='$API_IMAGE' WEB_IMAGE='$WEB_IMAGE' \
       && docker compose -f docker-compose.prod.yml pull \
       && docker compose -f docker-compose.prod.yml up -d \
       && docker image prune -f"
  echo "==> Deploy complete. Tail logs with:"
  echo "    ssh $DROPLET_USER@$DROPLET_HOST 'cd $DROPLET_PATH && docker compose -f docker-compose.prod.yml logs -f --tail=100'"
else
  echo "==> Skipping remote deploy (no DROPLET_HOST set)"
fi

echo "==> Done."
echo "    API_IMAGE = $API_IMAGE"
echo "    WEB_IMAGE = $WEB_IMAGE"
