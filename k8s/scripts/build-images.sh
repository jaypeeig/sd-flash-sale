#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

CLUSTER_NAME="flash-sale"
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
