#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

NAMESPACE="flash-sale"

echo "Applying manifests..."
kubectl apply -k overlays/local

echo "Waiting for postgres and redis..."
kubectl rollout status statefulset/postgres -n "$NAMESPACE" --timeout=180s
kubectl rollout status statefulset/redis -n "$NAMESPACE" --timeout=180s

echo "Running database migrations..."
kubectl delete job/flash-sale-migrate -n "$NAMESPACE" --ignore-not-found
kubectl apply -f jobs/migrate-job.yaml
if ! kubectl wait --for=condition=complete job/flash-sale-migrate -n "$NAMESPACE" --timeout=120s; then
  echo "Migration failed — logs:" >&2
  kubectl logs job/flash-sale-migrate -n "$NAMESPACE" --all-containers >&2 || true
  exit 1
fi

echo "Rolling out api and web..."
kubectl rollout status deployment/api -n "$NAMESPACE" --timeout=180s
kubectl rollout status deployment/web -n "$NAMESPACE" --timeout=180s

echo
echo "Deployed. App: http://localhost:8080/   Docs: http://localhost:8080/docs"
echo "Database has no data yet — run k8s/scripts/seed.sh to seed it."
