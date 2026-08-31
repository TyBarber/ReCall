#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/build/lambda"
DIST_DIR="${PROJECT_ROOT}/dist"

rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}" "${DIST_DIR}"
python3.12 -m pip install \
  --quiet \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  --target "${BUILD_DIR}" \
  --requirement "${PROJECT_ROOT}/requirements-lambda.txt"
cp -R "${PROJECT_ROOT}/app" "${BUILD_DIR}/app"
(
  cd "${BUILD_DIR}"
  zip -qr "${DIST_DIR}/recall_lambda.zip" .
)
echo "Built ${DIST_DIR}/recall_lambda.zip"
