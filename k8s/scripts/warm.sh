#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/.."

run_job_to_completion flash-sale-warm jobs/warm-job.yaml 120s

kubectl logs job/flash-sale-warm -n "$NAMESPACE"
