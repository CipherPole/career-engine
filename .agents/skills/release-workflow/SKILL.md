---
name: release-workflow
description: >-
  Ships Career Engine changes to GitHub and Vercel. Use whenever the user asks to commit, push, deploy,
  release, open a PR, merge, or "get the update live" — runs scripts/release.js (start, ship, prod, status).
---

# Career Engine Release Workflow

All updates ship through `scripts/release.js`. Do not hand-run the git/gh sequence unless the script is broken.

## Flow
1. **Start** (before editing, or right after if edits were made on `main`):
   `npm run release:start -- feature/short-name` (prefixes: feature, hotfix, fix, docs, chore)
2. **Implement + validate locally** — follow AGENTS.md; UI changes require docs/UI_PROGRAMMING_STANDARDS.md.
3. **Update docs** — `docs/SESSION_CHANGELOG.md` (and MODULE_GUIDE if modules changed) before shipping.
4. **Ship to preview:**
   - Review `git status` yourself first, then commit with the required attribution trailer, e.g.
     `git add <files> && git commit -m "feat: ..." -m "Co-Authored-By: ..."`
   - Run `npm run release:ship -- "feat: ..."` — with nothing left to commit it pushes, opens/reuses the PR, waits for checks, and prints the preview URL.
   - Give the user the PR and preview links. Preview uses the dev database.
5. **Release to production** — only after the user says the preview is good (or explicitly asks to merge):
   `npm run release:prod -- --yes`
   Report the deploy result, smoke test output, and the manual checklist it prints.

## Failure handling
- Check failures: read `gh pr checks <n>` / Actions logs, fix on the same branch, rerun `release:ship`.
- Vercel deploy failure or bad smoke test: tell the user; rollback is Vercel dashboard → previous deployment → Instant Rollback.
- `gh` not signed in: ask the user to run `gh auth login`.
