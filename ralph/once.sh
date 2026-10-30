#!/bin/bash
set -eo pipefail

issues=$(cat issues/*.md 2>/dev/null || echo "No issues found")
commits=$(git log -n 5 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No commits found")
prompt=$(cat ralph/prompt.md)

if command -v agy >/dev/null 2>&1; then
  agy "Previous commits: $commits Issues: $issues $prompt"
else
  claude --permission-mode acceptEdits \
    "Previous commits: $commits Issues: $issues $prompt"
fi
