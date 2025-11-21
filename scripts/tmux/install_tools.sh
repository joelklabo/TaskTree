#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS_DIR="$ROOT/.bin"
mkdir -p "$TOOLS_DIR"

shfmt_version="3.10.0"
shellcheck_version="0.10.0"
rg_version="14.1.0"

detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$arch" in
  x86_64 | amd64)
    arch="amd64"
    ;;
  arm64 | aarch64)
    arch="arm64"
    ;;
  *)
    echo "Unsupported architecture: $arch" >&2
    exit 1
    ;;
  esac
  echo "$os" "$arch"
}

install_shfmt() {
  local os arch
  read -r os arch <<<"$(detect_platform)"
  local dest="$TOOLS_DIR/shfmt"
  if [[ -x "$dest" ]]; then
    if "$dest" --version 2>/dev/null | grep -q "v${shfmt_version}"; then
      echo "shfmt v${shfmt_version} already installed at $dest"
      return
    fi
  fi
  local url="https://github.com/mvdan/sh/releases/download/v${shfmt_version}/shfmt_v${shfmt_version}_${os}_${arch}"
  echo "Installing shfmt v${shfmt_version} from ${url}"
  curl -fsSL "$url" -o "$dest"
  chmod +x "$dest"
}

install_shellcheck() {
  local os arch
  read -r os arch <<<"$(detect_platform)"
  if [[ "$os" != "darwin" && "$os" != "linux" ]]; then
    echo "Unsupported OS for shellcheck: $os" >&2
    exit 1
  fi
  case "$arch" in
  amd64)
    arch="x86_64"
    ;;
  arm64)
    arch="aarch64"
    ;;
  *)
    echo "Unsupported arch for shellcheck: $arch" >&2
    exit 1
    ;;
  esac

  local dest="$TOOLS_DIR/shellcheck"
  if [[ -x "$dest" ]]; then
    if "$dest" --version 2>/dev/null | grep -q "v${shellcheck_version}"; then
      echo "shellcheck v${shellcheck_version} already installed at $dest"
      return
    fi
  fi

  local archive="shellcheck-v${shellcheck_version}.${os}.${arch}.tar.xz"
  local url="https://github.com/koalaman/shellcheck/releases/download/v${shellcheck_version}/${archive}"
  local tmp
  tmp="$(mktemp -d)"
  echo "Installing shellcheck v${shellcheck_version} from ${url}"
  curl -fsSL "$url" -o "${tmp}/${archive}"
  tar -C "$tmp" -xf "${tmp}/${archive}"
  mv "${tmp}/shellcheck-v${shellcheck_version}/shellcheck" "$dest"
  chmod +x "$dest"
  rm -rf "$tmp"
}

install_rg() {
  local os arch target
  read -r os arch <<<"$(detect_platform)"
  case "$os" in
  darwin)
    case "$arch" in
    arm64) target="aarch64-apple-darwin" ;;
    amd64) target="x86_64-apple-darwin" ;;
    *)
      echo "Unsupported arch for rg on darwin: $arch" >&2
      exit 1
      ;;
    esac
    ;;
  linux)
    case "$arch" in
    arm64) target="aarch64-unknown-linux-musl" ;; # musl for static-ish binary
    amd64) target="x86_64-unknown-linux-musl" ;;
    *)
      echo "Unsupported arch for rg on linux: $arch" >&2
      exit 1
      ;;
    esac
    ;;
  *)
    echo "Unsupported OS for ripgrep: $os" >&2
    exit 1
    ;;
  esac

  local dest="$TOOLS_DIR/rg"
  if [[ -x "$dest" ]]; then
    if "$dest" --version 2>/dev/null | grep -q "ripgrep $rg_version"; then
      echo "rg $rg_version already installed at $dest"
      return
    fi
  fi

  local archive="ripgrep-${rg_version}-${target}.tar.gz"
  local url="https://github.com/BurntSushi/ripgrep/releases/download/${rg_version}/${archive}"
  local tmp
  tmp="$(mktemp -d)"
  echo "Installing ripgrep ${rg_version} from ${url}"
  curl -fsSL "$url" -o "${tmp}/${archive}"
  tar -C "$tmp" -xzf "${tmp}/${archive}"
  mv "${tmp}/ripgrep-${rg_version}-${target}/rg" "$dest"
  chmod +x "$dest"
  rm -rf "$tmp"
}

install_actionlint() {
  local version="1.7.8"
  local os arch asset url tmp
  read -r os arch <<<"$(detect_platform)"
  case "$os" in
  darwin) os="darwin" ;;
  linux) os="linux" ;;
  *)
    echo "Unsupported OS for actionlint: $os" >&2
    exit 1
    ;;
  esac
  case "$arch" in
  arm64) arch="arm64" ;;
  amd64) arch="amd64" ;;
  *)
    echo "Unsupported arch for actionlint: $arch" >&2
    exit 1
    ;;
  esac
  asset="actionlint_${version}_${os}_${arch}.tar.gz"
  url="https://github.com/rhysd/actionlint/releases/download/v${version}/${asset}"
  tmp="$(mktemp -d)"
  echo "Installing actionlint v${version} from ${url}"
  if ! curl -fsSL "$url" -o "${tmp}/${asset}"; then
    echo "Failed to download actionlint binary" >&2
    rm -rf "$tmp"
    exit 1
  fi
  tar -C "$tmp" -xzf "${tmp}/${asset}"
  mv "${tmp}/actionlint" "$TOOLS_DIR/actionlint"
  chmod +x "$TOOLS_DIR/actionlint"
  rm -rf "$tmp"
}

install_shfmt
install_shellcheck
install_rg
install_actionlint

echo "Tools installed to $TOOLS_DIR"
