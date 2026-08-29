#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/../.."

TAG="local"

echo "Building images..."
docker build -f docker/api.Dockerfile -t "flash-sale-api:${TAG}" .
docker build -f docker/web.Dockerfile -t "flash-sale-web:${TAG}" .
docker build -f docker/ops.Dockerfile -t "flash-sale-ops:${TAG}" .

echo "Loading images into kind cluster '${CLUSTER_NAME}'..."
kind load docker-image "flash-sale-api:${TAG}" --name "$CLUSTER_NAME"
kind load docker-image "flash-sale-web:${TAG}" --name "$CLUSTER_NAME"
kind load docker-image "flash-sale-ops:${TAG}" --name "$CLUSTER_NAME"

echo "Images built and loaded. Next: k8s/scripts/deploy.sh"
