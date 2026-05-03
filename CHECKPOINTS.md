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
# 1. Tag the current HEAD on main
git tag checkpoint/YYYY-MM-DD

# 2. Push the tag to GitHub
git push origin checkpoint/YYYY-MM-DD

# 3. Push a branch snapshot with the same name
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

---

## Important: GitHub Authentication in Replit

Replit has a **built-in `GITHUB_TOKEN`** secret that is always present in the environment.
It is a fine-grained token scoped to Replit's own GitHub integration — it **cannot push to your repo**.

### Never use `GITHUB_TOKEN` for repo pushes from Replit

When a GitHub token is needed to push to this repo:

1. Generate a **classic token** at https://github.com/settings/tokens/new
   - Check the **`repo`** checkbox
   - Token will start with `ghp_`

2. Store it as **`GH_PUSH_TOKEN`** (not `GITHUB_TOKEN`) in the Replit Secrets tab

3. Use it in scripts as:
   ```python
   token = os.environ.get('GH_PUSH_TOKEN', '').strip()
   auth_url = f'https://{token}@github.com/EndeavorEverlasting/Modulyn.git'
   subprocess.run(['git', 'remote', 'set-url', 'origin', auth_url])
   subprocess.run(['git', 'push', 'origin', 'main'])
   subprocess.run(['git', 'remote', 'set-url', 'origin', 'https://github.com/EndeavorEverlasting/Modulyn.git'])
   ```

4. Delete it from shared env vars after use to keep `.replit` clean:
   ```javascript
   await deleteEnvVars({ keys: ["GH_PUSH_TOKEN"], environment: "shared" });
   ```

See `.local/skills/github-token-auth/SKILL.md` for the full technical reference.
