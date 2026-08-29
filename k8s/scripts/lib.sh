#!/usr/bin/env bash

NAMESPACE="flash-sale"
CLUSTER_NAME="flash-sale"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    echo "  Run 'npm run setup:deps' from the repo root to install it, or see: $2" >&2
    exit 1
  fi
}

run_job_to_completion() {
  local job_name="$1"
  local manifest_path="$2"
  local timeout="${3:-120s}"

  kubectl delete "job/${job_name}" -n "$NAMESPACE" --ignore-not-found
  kubectl apply -f "$manifest_path"

  kubectl wait --for=condition=complete "job/${job_name}" -n "$NAMESPACE" --timeout="$timeout" \
    >/dev/null 2>&1 &
  local complete_pid=$!
  kubectl wait --for=condition=failed "job/${job_name}" -n "$NAMESPACE" --timeout="$timeout" \
    >/dev/null 2>&1 &
  local failed_pid=$!

  wait -n "$complete_pid" "$failed_pid" 2>/dev/null || true
  kill "$complete_pid" "$failed_pid" 2>/dev/null || true
  wait "$complete_pid" "$failed_pid" 2>/dev/null || true

  local complete_status
  complete_status=$(kubectl get "job/${job_name}" -n "$NAMESPACE" \
    -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || true)

  if [[ "$complete_status" == "True" ]]; then
    return 0
  fi

  echo "${job_name} failed — logs:" >&2
  kubectl logs "job/${job_name}" -n "$NAMESPACE" --all-containers >&2 || true
  return 1
}
