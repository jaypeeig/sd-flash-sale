#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/.."

ASSUME_YES=false
for arg in "$@"; do
  [[ "$arg" == "--yes" || "$arg" == "-y" ]] && ASSUME_YES=true
done

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "This truncates purchases/sales/products in the cluster's Postgres. Continue? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

echo "Running seed job (db:seed → redis:warm)..."
run_job_to_completion flash-sale-seed jobs/seed-job.yaml 180s

kubectl logs job/flash-sale-seed -n "$NAMESPACE" --all-containers
echo
echo "Seeded. http://localhost:8080/"
