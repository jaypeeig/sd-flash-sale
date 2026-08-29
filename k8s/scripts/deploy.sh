#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/.."

echo "Applying manifests..."
kubectl apply -k overlays/local

echo "Waiting for postgres and redis..."
kubectl rollout status statefulset/postgres -n "$NAMESPACE" --timeout=180s
kubectl rollout status statefulset/redis -n "$NAMESPACE" --timeout=180s

echo "Running database migrations..."
run_job_to_completion flash-sale-migrate jobs/migrate-job.yaml 120s

echo "Rolling out api and web..."
kubectl rollout status deployment/api -n "$NAMESPACE" --timeout=180s
kubectl rollout status deployment/web -n "$NAMESPACE" --timeout=180s

echo
echo "Deployed. App: http://localhost:8080/   Docs: http://localhost:8080/docs"
echo "Database has no data yet — run k8s/scripts/seed.sh to seed it."
