# Checkpoint Convention

This project uses date-based Git tags and branches to mark meaningful milestones on `main`. These checkpoints make it easy to review, compare, or restore the project to a known-good state.

## Naming Convention

```
checkpoint/YYYY-MM-DD
```

Both a **tag** and a **branch** are created with the same name.

## How to Create a Checkpoint

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

## Existing Checkpoints

| Date | Notes |
|---|---|
| `checkpoint/2026-05-03` | Initial GitHub checkpoint — full feature set including 3D export, design variants, mobile layout, STL export, and rename/update flows |
