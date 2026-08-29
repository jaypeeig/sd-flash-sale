#!/usr/bin/env bash
# Checks the external tools local dev relies on and installs whatever's
# missing - only via an official package manager (brew/apt) or a
# checksum-verified direct download, never a curl-pipe-to-shell installer,
# and never an interactive sudo prompt.
set -uo pipefail

USER_BIN="$HOME/.local/bin"
missing=()

TOOLS=(docker "docker compose" kind kubectl)
declare -A CHECK_CMD=(
  [docker]="command -v docker"
  ["docker compose"]="docker compose version"
  [kind]="command -v kind"
  [kubectl]="command -v kubectl"
)
declare -A INSTALL_URL=(
  [docker]="https://docs.docker.com/get-docker/"
  ["docker compose"]="https://docs.docker.com/compose/install/"
  [kind]="https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
  [kubectl]="https://kubernetes.io/docs/tasks/tools/#kubectl"
)
# brew formula to try first (cask ones are prefixed "cask:"), empty = skip.
declare -A BREW_PKG=(
  [docker]="cask:docker"
  ["docker compose"]="docker-compose"
  [kind]="kind"
  [kubectl]="kubectl"
)
# apt-get package to try if brew isn't available, empty = skip.
declare -A APT_PKG=(
  [docker]="docker.io docker-compose-plugin"
  ["docker compose"]="docker-compose-plugin"
)
# last-resort installer function for tools with no apt package, empty = skip.
declare -A CUSTOM_INSTALL=(
  [kubectl]="install_kubectl_from_upstream"
)
# suffix shown next to the name, purely cosmetic.
declare -A NOTE=(
  [kind]=" (k8s/ only)"
  [kubectl]=" (k8s/ only)"
)

have() { command -v "$1" >/dev/null 2>&1; }
sudo_noninteractive() { sudo -n true >/dev/null 2>&1; }

# apt-get install requires passwordless sudo (CI/root) - never prompts.
apt_install() {
  have apt-get && sudo_noninteractive || return 1
  # shellcheck disable=SC2086
  sudo -n apt-get update -y >/dev/null && sudo -n apt-get install -y $1 >/dev/null
}

brew_install() {
  local pkg="$1"
  if [[ "$pkg" == cask:* ]]; then
    brew install --cask "${pkg#cask:}"
  else
    brew install "$pkg"
  fi
}

install_kubectl_from_upstream() {
  local os arch version tmp
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  case "$(uname -m)" in
  x86_64) arch=amd64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) return 1 ;;
  esac
  version=$(curl -fsSL https://dl.k8s.io/release/stable.txt) || return 1
  tmp=$(mktemp -d)

  curl -fsSL -o "$tmp/kubectl" "https://dl.k8s.io/release/${version}/bin/${os}/${arch}/kubectl" || return 1
  curl -fsSL -o "$tmp/kubectl.sha256" "https://dl.k8s.io/release/${version}/bin/${os}/${arch}/kubectl.sha256" || return 1
  (cd "$tmp" && echo "$(cat kubectl.sha256)  kubectl" | sha256sum -c -) || return 1

  mkdir -p "$USER_BIN"
  install -m 0755 "$tmp/kubectl" "$USER_BIN/kubectl"
  rm -rf "$tmp"
}

attempt_install() {
  local name="$1"
  local brew_pkg="${BREW_PKG[$name]:-}"
  local apt_pkg="${APT_PKG[$name]:-}"
  local custom_fn="${CUSTOM_INSTALL[$name]:-}"

  [[ -n "$brew_pkg" ]] && have brew && brew_install "$brew_pkg" && return 0
  [[ -n "$apt_pkg" ]] && apt_install "$apt_pkg" && return 0
  [[ -n "$custom_fn" ]] && "$custom_fn" && return 0
  return 1
}

check() {
  local name="$1"
  local check_cmd="${CHECK_CMD[$name]}"
  local label="${name}${NOTE[$name]:-}"

  if eval "$check_cmd" >/dev/null 2>&1; then
    printf '  \xe2\x9c\x93 %s\n' "$label"
    return
  fi

  echo "  Attempting to install $name..."
  if attempt_install "$name" && eval "$check_cmd" >/dev/null 2>&1; then
    printf '  \xe2\x9c\x93 %s (installed)\n' "$label"
    return
  fi
  echo "  Could not install $name automatically."

  printf '  \xe2\x9c\x97 %s (missing)\n' "$label"
  missing+=("$label: ${INSTALL_URL[$name]}")
}

echo "Checking local dev prerequisites..."
for tool in "${TOOLS[@]}"; do
  check "$tool"
done

if ((${#missing[@]} > 0)); then
  echo
  echo "Some tools are still missing and couldn't be installed automatically -"
  echo "install these yourself:"
  for entry in "${missing[@]}"; do
    echo "  - $entry"
  done
fi

if [[ -d "$USER_BIN" ]] && [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
  echo
  echo "Note: $USER_BIN isn't on your PATH - add it to pick up tools installed there."
fi

exit 0
