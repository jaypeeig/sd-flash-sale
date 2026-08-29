#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/../.."

PG_LOCAL_PORT="${PG_LOCAL_PORT:-15432}"
REDIS_LOCAL_PORT="${REDIS_LOCAL_PORT:-16379}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Missing required tool: kubectl" >&2
  echo "  Install: https://kubernetes.io/docs/tasks/tools/#kubectl" >&2
  exit 1
fi

if ! kubectl get deployment/api -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "api Deployment not found in namespace '$NAMESPACE' — deploy first: k8s/scripts/setup.sh" >&2
  exit 1
fi

echo "Building @workspace/database and @workspace/redis..."
npx turbo run build --filter=@workspace/database --filter=@workspace/redis

PIDS=()
cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

wait_for_port() {
  local port="$1"
  local pid="$2"
  local log_file="$3"
  local tries=30
  while true; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "kubectl port-forward for localhost:${port} exited before it became ready — is something else already using that port? Log:" >&2
      cat "$log_file" >&2 || true
      exit 1
    fi
    if (exec 3<>"/dev/tcp/localhost/${port}") 2>/dev/null; then
      exec 3>&- 2>/dev/null || true
      return 0
    fi
    tries=$((tries - 1))
    if [[ "$tries" -le 0 ]]; then
      echo "Timed out waiting for localhost:${port} to accept connections" >&2
      exit 1
    fi
    sleep 0.5
  done
}

PG_FORWARD_LOG="/tmp/flash-sale-loadtest-pg-forward.log"
REDIS_FORWARD_LOG="/tmp/flash-sale-loadtest-redis-forward.log"

echo "Port-forwarding postgres -> localhost:${PG_LOCAL_PORT}..."
kubectl port-forward -n "$NAMESPACE" svc/postgres "${PG_LOCAL_PORT}:5432" \
  >"$PG_FORWARD_LOG" 2>&1 &
PG_FWD_PID="$!"
PIDS+=("$PG_FWD_PID")
wait_for_port "$PG_LOCAL_PORT" "$PG_FWD_PID" "$PG_FORWARD_LOG"

echo "Port-forwarding redis -> localhost:${REDIS_LOCAL_PORT}..."
kubectl port-forward -n "$NAMESPACE" svc/redis "${REDIS_LOCAL_PORT}:6379" \
  >"$REDIS_FORWARD_LOG" 2>&1 &
REDIS_FWD_PID="$!"
PIDS+=("$REDIS_FWD_PID")
wait_for_port "$REDIS_LOCAL_PORT" "$REDIS_FWD_PID" "$REDIS_FORWARD_LOG"

export DATABASE_URL="postgresql://flashsale:flashsale@localhost:${PG_LOCAL_PORT}/flashsale"
export REDIS_URL="redis://localhost:${REDIS_LOCAL_PORT}"

export BASE_URL="${BASE_URL:-http://localhost:8080/api}"

export RESULTS_LABEL="${RESULTS_LABEL:-k8s-$(date +%Y-%m-%d)}"

echo "Target: ${BASE_URL}  (results -> packages/load-test/results/${RESULTS_LABEL}/)"
npm run -w @workspace/load-test load-test -- "$@"
