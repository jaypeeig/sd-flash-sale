#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/../.."

TAG="local"
IMAGES=("api" "web" "ops" "worker")

echo "Building images..."
for image in "${IMAGES[@]}"; do
  docker build -f "docker/${image}.Dockerfile" -t "flash-sale-${image}:${TAG}" .
done

echo "Loading images into kind cluster '${CLUSTER_NAME}'..."
for image in "${IMAGES[@]}"; do
  kind load docker-image "flash-sale-${image}:${TAG}" --name "$CLUSTER_NAME"
done

echo "Images built and loaded. Next: k8s/scripts/deploy.sh"
