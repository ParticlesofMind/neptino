#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

repo_status="$(git status --porcelain)"
tracked_artifacts="$(git ls-files | grep -E '(^|/)(node_modules|\.next|dist|coverage|playwright-report|test-results|\.turbo|\.cache|\.temp)(/|$)|(^|/)\.DS_Store$|\.tsbuildinfo$' || true)"

has_error=0

if [[ -n "$repo_status" ]]; then
  echo "Working tree is not clean:"
  echo "$repo_status"
  has_error=1
fi

if [[ -n "$tracked_artifacts" ]]; then
  echo "Tracked generated/cache artifacts found:"
  echo "$tracked_artifacts"
  has_error=1
fi

if [[ "$has_error" -eq 1 ]]; then
  exit 1
fi

echo "Repository hygiene check passed."
