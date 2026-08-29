#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

NAMESPACE="flash-sale"

kubectl delete job/flash-sale-warm -n "$NAMESPACE" --ignore-not-found
kubectl apply -f jobs/warm-job.yaml

if ! kubectl wait --for=condition=complete job/flash-sale-warm -n "$NAMESPACE" --timeout=120s; then
  echo "Warm failed — logs:" >&2
  kubectl logs job/flash-sale-warm -n "$NAMESPACE" >&2 || true
  exit 1
fi

kubectl logs job/flash-sale-warm -n "$NAMESPACE"
