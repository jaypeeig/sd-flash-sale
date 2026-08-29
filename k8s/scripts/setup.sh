#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

NAMESPACE="flash-sale"
SEED_ARGS=()
for arg in "$@"; do
  [[ "$arg" == "--yes" || "$arg" == "-y" ]] && SEED_ARGS+=("--yes")
done

./cluster-up.sh
./build-images.sh
./deploy.sh
./seed.sh "${SEED_ARGS[@]}"

echo
echo "=================================================================="
echo "Endpoints"
echo "=================================================================="
kubectl get ingress -n "$NAMESPACE"
echo
kubectl get svc -n "$NAMESPACE"
echo
echo "api pod endpoints (what ingress-nginx load-balances /api across):"
kubectl get endpoints api -n "$NAMESPACE"
echo
echo "App:  http://localhost:8080/"
echo "Docs: http://localhost:8080/docs"
echo "API:  http://localhost:8080/api"
