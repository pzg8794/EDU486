#!/usr/bin/env bash
set -eu

root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  printf '%s\n' "ERROR: This directory is not inside a Git repository." >&2
  exit 1
}

git_dir="$(git rev-parse --git-dir 2>/dev/null)" || {
  printf '%s\n' "ERROR: Git metadata is unavailable." >&2
  exit 1
}

origin="$(git remote get-url origin 2>/dev/null)" || {
  printf '%s\n' "ERROR: The repository has no readable origin remote." >&2
  exit 1
}

if [ ! -e "$root/.git" ]; then
  printf '%s\n' "ERROR: The repository root does not contain Git metadata." >&2
  exit 1
fi

printf 'Repository safety check passed.\n'
printf 'Root: %s\n' "$root"
printf 'Git metadata: %s\n' "$git_dir"
printf 'Origin: %s\n' "$origin"
