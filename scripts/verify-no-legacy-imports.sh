#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

matches="$(grep -RInE "from ['\"][^'\"]*legacy/|require\(['\"][^'\"]*legacy/|import\(['\"][^'\"]*legacy/|from ['\"][^'\"]*\.\./legacy|from ['\"][^'\"]*/legacy" src --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mts' || true)"

if [[ -n "$matches" ]]; then
  echo "Found forbidden imports/references to legacy/ inside active src code:"
  echo "$matches"
  exit 1
fi

echo "No legacy/ imports found in active src code."
