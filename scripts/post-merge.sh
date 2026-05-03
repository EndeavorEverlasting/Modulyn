#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter db push

# Push to GitHub after every task merge
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO" ]; then
  REPO_URL="$GITHUB_REPO"
  # Strip trailing .git if present, then strip https:// prefix
  REPO_URL="${REPO_URL%.git}"
  REPO_URL="${REPO_URL#https://}"
  REMOTE="https://${GITHUB_TOKEN}@${REPO_URL}.git"

  echo "Pushing to GitHub (${GITHUB_REPO})..."
  git remote set-url github "$REMOTE" 2>/dev/null || git remote add github "$REMOTE"
  git push github HEAD:main --force-with-lease 2>&1 | sed "s/${GITHUB_TOKEN}/***REDACTED***/g" || \
    git push github HEAD:main --force 2>&1 | sed "s/${GITHUB_TOKEN}/***REDACTED***/g"
  echo "GitHub push complete."
else
  echo "Skipping GitHub push: GITHUB_TOKEN or GITHUB_REPO not set."
fi
