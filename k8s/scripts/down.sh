#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/.."

if kubectl get ns "$NAMESPACE" >/dev/null 2>&1; then
  echo "Deleting namespace '${NAMESPACE}' (app, data, PVCs)..."
  kubectl delete namespace "$NAMESPACE" --ignore-not-found
else
  echo "Namespace '${NAMESPACE}' not found — nothing to delete."
fi

if [[ "${1:-}" == "--cluster" ]]; then
  echo "Deleting kind cluster '${CLUSTER_NAME}'..."
  kind delete cluster --name "$CLUSTER_NAME"
fi
