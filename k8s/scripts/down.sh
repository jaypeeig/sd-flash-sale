#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CLUSTER_NAME="flash-sale"

if kubectl get ns flash-sale >/dev/null 2>&1; then
  echo "Deleting namespace 'flash-sale' (app, data, PVCs)..."
  kubectl delete namespace flash-sale --ignore-not-found
else
  echo "Namespace 'flash-sale' not found — nothing to delete."
fi

if [[ "${1:-}" == "--cluster" ]]; then
  echo "Deleting kind cluster '${CLUSTER_NAME}'..."
  kind delete cluster --name "$CLUSTER_NAME"
fi
