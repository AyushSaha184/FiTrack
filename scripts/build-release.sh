#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  echo "[build-release] Sourcing $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "[build-release] WARNING: $ENV_FILE not found, using existing shell env"
fi

cd "$PROJECT_ROOT/android"
echo "[build-release] Running: ./gradlew assembleRelease"
./gradlew assembleRelease "$@"

APK="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  echo ""
  echo "[build-release] DONE: $APK"
  ls -lh "$APK"
else
  echo "[build-release] BUILD FAILED"
  exit 1
fi
