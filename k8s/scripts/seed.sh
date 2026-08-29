#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

NAMESPACE="flash-sale"
ASSUME_YES=false
for arg in "$@"; do
  [[ "$arg" == "--yes" || "$arg" == "-y" ]] && ASSUME_YES=true
done

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "This truncates purchases/sales/products in the cluster's Postgres. Continue? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

echo "Running seed job (db:seed → redis:warm)..."
kubectl delete job/flash-sale-seed -n "$NAMESPACE" --ignore-not-found
kubectl apply -f jobs/seed-job.yaml

if ! kubectl wait --for=condition=complete job/flash-sale-seed -n "$NAMESPACE" --timeout=180s; then
  echo "Seed failed — logs:" >&2
  kubectl logs job/flash-sale-seed -n "$NAMESPACE" --all-containers >&2 || true
  exit 1
fi

kubectl logs job/flash-sale-seed -n "$NAMESPACE" --all-containers
echo
echo "Seeded. http://localhost:8080/"
