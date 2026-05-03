# Checkpoint Convention

This project uses date-based Git tags and branches to mark meaningful milestones on `main`. These checkpoints make it easy to review, compare, or restore the project to a known-good state.

## Naming Convention

```
checkpoint/YYYY-MM-DD
```

Both a **tag** and a **branch** are created with the same name.

## How to Create a Checkpoint

### Automated (recommended)

Trigger the **Create Checkpoint** GitHub Actions workflow from the Actions tab:

1. Go to **Actions → Create Checkpoint → Run workflow**.
2. Optionally enter a date (`YYYY-MM-DD`). Leave blank to use today's date.
3. Click **Run workflow**.

The workflow will create and push both the tag and the branch snapshot automatically.

### Manual

Run the following commands, replacing `YYYY-MM-DD` with today's date:

```bash
# 1. Ensure main is up to date
git checkout main && git pull origin main

# 2. Tag the current HEAD
git tag checkpoint/YYYY-MM-DD

# 3. Push the tag to GitHub
git push origin checkpoint/YYYY-MM-DD

# 4. Push a branch snapshot with the same name
git push origin HEAD:checkpoint/YYYY-MM-DD
```

## Why Both a Tag and a Branch?

| | Tag | Branch |
|---|---|---|
| **Purpose** | Immutable point-in-time marker | Browseable snapshot on GitHub |
| **Can diff against** | Yes (`git diff checkpoint/YYYY-MM-DD`) | Yes |
| **Visible in GitHub UI** | Under Releases/Tags | Under Branches |

## Automatic GitHub Sync

After every task merge, the post-merge script (`scripts/post-merge.sh`) automatically pushes the latest code to GitHub (`main` branch). No manual steps are needed to keep GitHub in sync.

**How it works:**
- The script runs automatically after each Replit task merge.
- It uses the `GITHUB_TOKEN` secret and `GITHUB_REPO` environment variable.
- The push uses `--force-with-lease` (safe force push) to ensure GitHub stays current.
- The token value is redacted from all log output.

**Requirements:**
- `GITHUB_TOKEN` — a GitHub personal access token (PAT) with `repo` scope, set as a Replit secret. Use a token with no expiry or a long-lived one for uninterrupted automation.
- `GITHUB_REPO` — the full GitHub repo URL (e.g. `https://github.com/owner/repo`), set as a Replit environment variable.

If either variable is missing, the push step is skipped gracefully and a warning is logged.

## Existing Checkpoints

| Date | Notes |
|---|---|
| `checkpoint/2026-05-03` | Initial GitHub checkpoint — full feature set including 3D export, design variants, mobile layout, STL export, and rename/update flows |
