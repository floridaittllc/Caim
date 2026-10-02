#!/bin/sh
# Xcode Cloud runs this after cloning, before resolving packages and building.
# Source of truth: xcode-cloud/ci_post_clone.sh (copied into ios/ci_scripts by
# plugins/withXcodeCloud.js on every `expo prebuild`).
set -e

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

if ! command -v node >/dev/null 2>&1; then
  brew install node
fi
if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

cd ios
# Xcode script phases run with a minimal PATH, so pin the Homebrew node binary.
echo "export NODE_BINARY=$(command -v node)" > .xcode.env.local
pod install
