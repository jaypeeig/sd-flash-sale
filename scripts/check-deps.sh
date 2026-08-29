#!/usr/bin/env bash
# Checks for (and optionally installs) the Kubernetes toolchain used by
# k8s/scripts/*.sh: docker, kind, kubectl, kubeconform, and (optional) k6.
# Supports Linux (Ubuntu/Debian, apt-based) and macOS (Homebrew).
#
# Usage:
#   scripts/check-deps.sh              # check only — prints what's missing
#                                       # and tells you to run setup:deps
#   scripts/check-deps.sh --install    # actually install what's missing
#   scripts/check-deps.sh --install --yes  # ...without any y/N prompts
#
# Wired up as:
#   npm install         -> runs this with no flags (postinstall hook) —
#                          check only, never installs on its own
#   npm run setup:deps  -> runs this with --install
#
# SKIP_DEPS_CHECK=1 skips this entirely.
#
# macOS installs via Homebrew. Linux installs docker via the official apt
# repo (needs sudo, prompts first) and everything else via a
# checksum-verified direct download into ~/.local/bin.
#
# To add a tool: add its name to TOOLS below, then extend detect(),
# version_label(), and install_tool() with a case arm for it.
set -uo pipefail
# XXX: no `-e` — one failed install must not abort the rest, and this script
# always exits 0 so it can never break `npm install`.

# -----------------------------------------------------------------------------
# guards
# -----------------------------------------------------------------------------
[[ "${SKIP_DEPS_CHECK:-}" == "1" ]] && exit 0

FORCE_INSTALL=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
  --install) FORCE_INSTALL=1 ;;
  --yes) ASSUME_YES=1 ;;
  esac
done

is_tty() { [[ -t 0 && -t 1 ]]; }

# Installing is opt-in, never a side effect of `npm install`: the postinstall
# hook (no flags) only ever checks and, if something's missing, prints
# "run npm run setup:deps" — it never installs anything itself, so a plain
# `npm install` can't unexpectedly start downloading binaries or prompting
# for a sudo password. `--install` (what `npm run setup:deps` passes) is the
# one explicit way to actually install, and runs regardless of TTY/CI/Docker;
# `--check` is the same report-only default, spelled out for clarity.
if [[ "$FORCE_INSTALL" == "1" ]]; then
  INSTALL=1
else
  INSTALL=0
fi

# -----------------------------------------------------------------------------
# platform detection
# -----------------------------------------------------------------------------
case "$(uname -s)" in
Linux*) PLATFORM="linux" ;;
Darwin*) PLATFORM="darwin" ;;
*) PLATFORM="unknown" ;;
esac

case "$(uname -m)" in
x86_64 | amd64) ARCH="amd64" ;;
arm64 | aarch64) ARCH="arm64" ;;
*) ARCH="$(uname -m)" ;;
esac

BIN_DIR="$HOME/.local/bin"

# -----------------------------------------------------------------------------
# logging
# -----------------------------------------------------------------------------
if is_tty; then
  C_RED=$'\033[31m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m' C_DIM=$'\033[2m' C_RESET=$'\033[0m'
else
  C_RED="" C_GREEN="" C_YELLOW="" C_DIM="" C_RESET=""
fi
log() { echo "${C_DIM}[setup]${C_RESET} $*"; }
ok() { echo "${C_DIM}[setup]${C_RESET} ${C_GREEN}✔ $*${C_RESET}"; }
warn() { echo "${C_DIM}[setup]${C_RESET} ${C_YELLOW}✘ $*${C_RESET}"; }
err() { echo "${C_DIM}[setup]${C_RESET} ${C_RED}✘ $*${C_RESET}"; }

# -----------------------------------------------------------------------------
# the tool table — this + install_tool()/detect() below is the whole manifest
# -----------------------------------------------------------------------------
TOOLS=(docker kind kubectl kubeconform k6)
REQUIRED_docker=1
REQUIRED_kind=1
REQUIRED_kubectl=1
REQUIRED_kubeconform=1
REQUIRED_k6=0 # optional: packages/load-test falls back to `docker run grafana/k6`

DOCS_docker="https://docs.docker.com/get-docker/"
DOCS_kind="https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
DOCS_kubectl="https://kubernetes.io/docs/tasks/tools/#kubectl"
DOCS_kubeconform="https://github.com/yannh/kubeconform#installation"
DOCS_k6="https://grafana.com/docs/k6/latest/set-up/install-k6/"

BREW_kind="kind"
BREW_kubectl="kubernetes-cli"
BREW_kubeconform="kubeconform"
BREW_k6="k6"

# Pinned versions + checksums for Linux's direct-download fallback. Bump a
# version: grab the new sha256 from that release's checksums file and update
# both here.
KIND_VERSION="0.33.0"
KUBECTL_VERSION="1.37.0"
KUBECONFORM_VERSION="0.8.0"
K6_VERSION="2.2.0"

sha256_for() {
  case "$1:$2" in
  kind:amd64) echo "aee6151561422756b764a4ae28e7f44cda5af5a9eead3cc9985112b1de8d8e0d" ;;
  kind:arm64) echo "20022bee6cfcd5086cb7234d218e3454e6090022f2a8f55d1fa7fcf42c3867a2" ;;
  kubectl:amd64) echo "6129359f4e1f3848a5572ccb0b26cf28b8ca08cef38c95a765b2f64a2c961a2f" ;;
  kubectl:arm64) echo "922df28df248cc00a9e025f947704f1d1482de64ece54cfe57e61f19eaf1eef3" ;;
  kubeconform:amd64) echo "9bc2bffbf71f261128533edaf912153948b7ff238f9a531ae6d34466ec287883" ;;
  kubeconform:arm64) echo "1f53fc8e81258197a35e8603054162a5af1de8c5af13746c71ab680d9534ed87" ;;
  k6:amd64) echo "b5a8003c86f35f5cd5ceef1490312c48e587696c94d998cefc6d7b3b4cb1597d" ;;
  k6:arm64) echo "4ecd64cadcc792402d16293836115480419c4447c032858f564852d98f1bf54c" ;;
  *) echo "" ;;
  esac
}

# -----------------------------------------------------------------------------
# detection
# -----------------------------------------------------------------------------
have_cmd() { command -v "$1" >/dev/null 2>&1; }

detect_docker() {
  have_cmd docker || return 1
  docker compose version >/dev/null 2>&1 || return 1
  docker info >/dev/null 2>&1 || return 1
}

detect() {
  case "$1" in
  docker) detect_docker ;;
  *) have_cmd "$1" ;;
  esac
}

version_label() {
  case "$1" in
  docker) docker compose version 2>/dev/null | head -1 ;;
  kind) kind --version 2>/dev/null ;;
  kubectl) kubectl version --client 2>/dev/null | head -1 ;;
  kubeconform) kubeconform -v 2>/dev/null ;;
  k6) k6 version 2>/dev/null | head -1 ;;
  esac
}

reason_for() {
  case "$1" in
  docker)
    have_cmd docker || { echo "not found on PATH"; return; }
    docker compose version >/dev/null 2>&1 || { echo "found, but the \`docker compose\` v2 plugin is missing"; return; }
    echo "installed, but the daemon isn't running — start Docker Desktop / the docker service"
    ;;
  *) echo "not found on PATH" ;;
  esac
}

# -----------------------------------------------------------------------------
# install drivers
# -----------------------------------------------------------------------------
have_brew() { have_cmd brew; }

confirm() {
  [[ "$ASSUME_YES" == "1" ]] && return 0
  is_tty || return 1
  local reply
  read -r -p "$1 [y/N] " reply
  [[ "$reply" =~ ^[Yy] ]]
}

# Downloads $1, verifies its sha256 against $2, and installs it as
# $3/$4 — extracting $5 out of the archive first when given (a .tar.gz
# member path). Never installs anything that fails the checksum. This is the
# only download path in the script, so nothing here ever pipes curl into sh.
download_verified() {
  local url="$1" sha256="$2" dest_dir="$3" dest_name="$4" member="${5:-}"
  mkdir -p "$dest_dir"
  local tmp out
  tmp="$(mktemp -d)"
  out="$tmp/download"

  if ! curl -fsSL -o "$out" "$url"; then
    err "  download failed: $url"
    rm -rf "$tmp"
    return 1
  fi

  local actual
  if have_cmd sha256sum; then
    actual="$(sha256sum "$out" | awk '{print $1}')"
  else
    actual="$(shasum -a 256 "$out" | awk '{print $1}')" # macOS fallback
  fi
  if [[ "$actual" != "$sha256" ]]; then
    err "  checksum mismatch for $url"
    err "    expected $sha256"
    err "    got      $actual"
    rm -rf "$tmp"
    return 1
  fi

  if [[ -n "$member" ]]; then
    if ! tar -xf "$out" -C "$tmp"; then
      err "  failed to extract $url"
      rm -rf "$tmp"
      return 1
    fi
    cp "$tmp/$member" "$dest_dir/$dest_name"
  else
    cp "$out" "$dest_dir/$dest_name"
  fi
  chmod +x "$dest_dir/$dest_name"
  rm -rf "$tmp"
}

# Follows Docker's own documented apt-repo setup
# (docs.docker.com/engine/install/ubuntu) instead of piping their convenience
# script into a shell, so every step is one visible, auditable command.
install_docker_linux() {
  warn "  docker needs sudo: adds Docker's official apt repo and installs docker-ce, then adds you to the docker group (log out and back in for that to take effect)"
  confirm "  Install docker now?" || {
    log "  Skipped — install manually: $DOCS_docker"
    return 1
  }

  local codename arch keyring="/etc/apt/keyrings/docker.asc"
  codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  arch="$(dpkg --print-architecture)"

  sudo install -m 0755 -d /etc/apt/keyrings &&
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee "$keyring" >/dev/null &&
    sudo chmod a+r "$keyring" &&
    echo "deb [arch=$arch signed-by=$keyring] https://download.docker.com/linux/ubuntu $codename stable" |
      sudo tee /etc/apt/sources.list.d/docker.list >/dev/null &&
    sudo apt-get update &&
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin &&
    sudo usermod -aG docker "$USER"
}

install_download_linux() {
  local tool="$1" sha url member=""
  sha="$(sha256_for "$tool" "$ARCH")"
  case "$tool" in
  kind) url="https://github.com/kubernetes-sigs/kind/releases/download/v$KIND_VERSION/kind-linux-$ARCH" ;;
  kubectl) url="https://dl.k8s.io/v$KUBECTL_VERSION/bin/linux/$ARCH/kubectl" ;;
  kubeconform)
    url="https://github.com/yannh/kubeconform/releases/download/v$KUBECONFORM_VERSION/kubeconform-linux-$ARCH.tar.gz"
    member="kubeconform"
    ;;
  k6)
    url="https://github.com/grafana/k6/releases/download/v$K6_VERSION/k6-v$K6_VERSION-linux-$ARCH.tar.gz"
    member="k6-v$K6_VERSION-linux-$ARCH/k6"
    ;;
  *)
    err "  no download recipe for $tool on linux"
    return 1
    ;;
  esac
  log "  Downloading $tool into $BIN_DIR..."
  download_verified "$url" "$sha" "$BIN_DIR" "$tool" "$member"
}

install_tool() {
  local tool="$1"

  if [[ "$tool" == "docker" ]]; then
    case "$PLATFORM" in
    darwin)
      have_brew || { err "  Homebrew not found — install it from https://brew.sh"; return 1; }
      log "  Installing docker via Homebrew..."
      brew install --cask docker
      ;;
    linux) install_docker_linux ;;
    *) err "  no install recipe for docker on this platform" ;;
    esac
    return
  fi

  case "$PLATFORM" in
  darwin)
    have_brew || { err "  Homebrew not found — install it from https://brew.sh"; return 1; }
    local pkg_var="BREW_$tool"
    log "  Installing $tool via Homebrew..."
    brew install "${!pkg_var}"
    ;;
  linux) install_download_linux "$tool" ;;
  *) err "  no install recipe for $tool on this platform — install manually" ;;
  esac
}

# -----------------------------------------------------------------------------
# main
# -----------------------------------------------------------------------------
main() {
  # 1. OS/arch — already detected above (PLATFORM/ARCH), before anything else.
  if [[ "$PLATFORM" == "unknown" ]]; then
    warn "Unrecognized OS ($(uname -s)) — this script only supports Linux and macOS."
  else
    log "Detected platform: $PLATFORM/$ARCH"
  fi

  # 2. Walk the tool list once: check → skip if already installed →
  # auto-install if missing and we're allowed to.
  local still_missing=0
  local attempted_install=0
  for tool in "${TOOLS[@]}"; do
    local req_var="REQUIRED_$tool" docs_var="DOCS_$tool"

    if detect "$tool"; then
      ok "  $(printf '%-13s' "$tool") already installed — $(version_label "$tool")"
      continue
    fi

    if [[ "$INSTALL" != "1" ]]; then
      if [[ "${!req_var}" == "1" ]]; then
        err "  $(printf '%-13s' "$tool") $(reason_for "$tool") — ${!docs_var}"
        still_missing=1
      else
        warn "  $(printf '%-13s' "$tool") $(reason_for "$tool") (optional) — ${!docs_var}"
      fi
      continue
    fi

    attempted_install=1
    log "  $tool not found — installing..."
    if install_tool "$tool" && detect "$tool"; then
      ok "  $(printf '%-13s' "$tool") installed — $(version_label "$tool")"
    elif [[ "${!req_var}" == "1" ]]; then
      err "  $(printf '%-13s' "$tool") install failed — ${!docs_var}"
      still_missing=1
    else
      warn "  $(printf '%-13s' "$tool") install failed (optional) — ${!docs_var}"
    fi
  done

  if [[ "$attempted_install" == "1" ]]; then
    case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *) warn "  $BIN_DIR isn't on your PATH yet — add it to your shell profile, then open a new shell." ;;
    esac
  fi

  if [[ "$still_missing" != "1" ]]; then
    ok "All required Kubernetes toolchain dependencies are present."
  elif [[ "$INSTALL" != "1" ]]; then
    log "Run \"npm run setup:deps\" to install what's missing, or set SKIP_DEPS_CHECK=1 to silence this check."
  else
    warn "Some required tools still need manual installation — see above."
  fi
}

main "$@"
exit 0
