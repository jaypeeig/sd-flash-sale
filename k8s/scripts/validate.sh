#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/.."

require kubectl "https://kubernetes.io/docs/tasks/tools/#kubectl"
require kubeconform "https://github.com/yannh/kubeconform#installation"

kubectl kustomize overlays/local | kubeconform -strict -summary -
