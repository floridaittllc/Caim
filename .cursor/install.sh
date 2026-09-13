#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for the CAIm project.
#
# Responsibilities:
#   1. Install the Linux system libraries the Swift toolchain needs.
#   2. Install the open-source Swift toolchain for Linux via swiftly (skipped
#      when a working `swift` is already present).
#   3. Build the GrammarKit Swift package so `swift test` is ready to run.
#
# Safe to run multiple times: every step checks for existing state first.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SWIFTLY_ENV="$HOME/.local/share/swiftly/env.sh"

echo "==> CAIm install: starting (repo: $REPO_ROOT)"

# ---------------------------------------------------------------------------
# 1. System dependencies required by the Swift runtime/toolchain on Ubuntu.
# ---------------------------------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
  echo "==> Installing system dependencies (apt-get)"
  SUDO=""
  if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi
  $SUDO apt-get update -y
  $SUDO apt-get install -y --no-install-recommends \
    binutils gnupg2 libc6-dev libcurl4-openssl-dev libedit2 libgcc-12-dev \
    libpython3-dev libstdc++-12-dev libxml2-dev libncurses-dev libz3-dev \
    zlib1g-dev pkg-config tzdata curl ca-certificates || \
    echo "!! Some apt packages were unavailable; continuing (Swift may still work)."
fi

# ---------------------------------------------------------------------------
# 2. Swift toolchain (idempotent). If `swift` already resolves, do nothing.
# ---------------------------------------------------------------------------
# Make an already-installed swiftly visible to this shell.
if [ -f "$SWIFTLY_ENV" ]; then
  # shellcheck disable=SC1090
  . "$SWIFTLY_ENV"
fi

if command -v swift >/dev/null 2>&1; then
  echo "==> Swift already installed: $(swift --version 2>/dev/null | head -1)"
else
  echo "==> Installing Swift toolchain via swiftly"
  ARCH="$(uname -m)"
  TMP_TARBALL="$(mktemp -d)/swiftly.tar.gz"
  curl -fSL -o "$TMP_TARBALL" \
    "https://download.swift.org/swiftly/linux/swiftly-${ARCH}.tar.gz"
  tar -xzf "$TMP_TARBALL" -C "$(dirname "$TMP_TARBALL")"
  # `swiftly init` downloads and sets the default toolchain non-interactively.
  "$(dirname "$TMP_TARBALL")/swiftly" init -y --assume-yes
  # shellcheck disable=SC1090
  . "$SWIFTLY_ENV"
fi

# Ensure future interactive/agent shells can find swift.
if [ -f "$SWIFTLY_ENV" ] && ! grep -qs 'swiftly/env.sh' "$HOME/.bashrc" 2>/dev/null; then
  {
    echo ''
    echo '# Added by CAIm install: make Swift toolchain available'
    echo ". \"$SWIFTLY_ENV\""
  } >> "$HOME/.bashrc"
fi

echo "==> Using Swift: $(swift --version 2>/dev/null | head -1)"

# ---------------------------------------------------------------------------
# 3. Build the GrammarKit package so tests are ready to run.
# ---------------------------------------------------------------------------
cd "$REPO_ROOT"
echo "==> Building GrammarKit (swift build)"
swift build

echo "==> CAIm install: done. Run tests with:  swift test"
