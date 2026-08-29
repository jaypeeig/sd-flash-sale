#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Missing required tool: kubectl" >&2
  echo "  Install: https://kubernetes.io/docs/tasks/tools/#kubectl" >&2
  exit 1
fi

if ! command -v kubeconform >/dev/null 2>&1; then
  echo "Missing required tool: kubeconform" >&2
  echo "  Install: https://github.com/yannh/kubeconform#installation" >&2
  exit 1
fi

kubectl kustomize overlays/local | kubeconform -strict -summary -
