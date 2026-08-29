#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CLUSTER_NAME="flash-sale"
INGRESS_NGINX_VERSION="controller-v1.11.3"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    echo "  $2" >&2
    exit 1
  fi
}

require kind "Install: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
require kubectl "Install: https://kubernetes.io/docs/tasks/tools/#kubectl"

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "kind cluster '$CLUSTER_NAME' already exists — reusing it."
else
  echo "Creating kind cluster '$CLUSTER_NAME'..."
  kind create cluster --config kind-cluster.yaml
fi

kubectl config use-context "kind-$CLUSTER_NAME" >/dev/null

if kubectl get ns ingress-nginx >/dev/null 2>&1; then
  echo "ingress-nginx already installed — skipping."
else
  echo "Installing ingress-nginx ($INGRESS_NGINX_VERSION, kind provider manifest)..."
  kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/${INGRESS_NGINX_VERSION}/deploy/static/provider/kind/deploy.yaml"
fi

echo "Waiting for the ingress-nginx controller to become ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s

echo "Cluster ready. Next: k8s/scripts/build-images.sh"
