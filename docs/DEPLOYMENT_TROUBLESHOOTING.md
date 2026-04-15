# Deployment Troubleshooting

## Bug: Vercel Auto-Deploy Fails with ENOENT on client-only / 3-second Build

### Symptoms
- Vercel build fails in ~3 seconds with no real install or compile
- Log shows: `Using prebuilt build artifacts from .vercel/output`
- Error: `ENOENT: no such file or directory, lstat '/vercel/path0/node_modules/.pnpm/client-only@0.0.1/node_modules/client-only/index.js'`
- Build log has: `Warning: Failed to fetch one or more git submodules`
- Every git push to `main` triggers the failure

### Root Cause
`.vercel/output` was committed to git. Vercel detects the presence of this directory and treats it as prebuilt artifacts, skipping `pnpm install` and `next build` entirely. The stale prebuilt output referenced local paths (e.g. `.pnpm/client-only@0.0.1/...`) that don't exist in Vercel's fresh clone — causing the ENOENT.

The submodule warning is a harmless Vercel side-effect; it does not cause the build failure.

### Permanent Fix (already applied — commits 166260c and 7c4186e)

1. **Removed `.vercel/` from git tracking:**
   ```bash
   git rm -r --cached .vercel
   git add .gitignore
   git commit -m "fix: untrack .vercel output so Vercel runs real build"
   ```

2. **Added `.vercel` to `.gitignore`** (prevents re-occurrence):
   ```
   # Vercel
   .vercel
   ```

3. **Added `.vercelignore`** (prevents 100MB+ upload errors when deploying via CLI):
   ```
   node_modules
   .next
   .turbo
   .worktrees
   apps/*/node_modules
   apps/*/.next
   packages/*/node_modules
   ```

### How to Diagnose Next Time
If Vercel fails in under 10 seconds with no `pnpm install` in the logs, check:
```bash
git ls-files .vercel
```
If any files are listed, `.vercel` has been re-committed. Re-run the fix:
```bash
git rm -r --cached .vercel
git commit -m "fix: untrack .vercel from git"
git push origin main
```

### How `.vercel/output` Gets Re-Committed
Running `vercel build` locally generates `.vercel/output`. If you then run `git add .` or `git add -A`, it gets staged. The `.gitignore` entry prevents this, but be aware:
- Never run `git add .` without checking `git status` first
- `vercel build` is for local testing only; let Vercel's cloud build handle production

### Deploy via CLI (if git auto-deploy is broken)
```bash
npx vercel@latest --prod --yes
```
Run from the monorepo root (`/Users/anhnguyen/Obsidian/Business planning`). The `.vercel/project.json` stays local (gitignored) and keeps the project linked.
