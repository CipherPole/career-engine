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

## Known issues & diagnostics (learned 2026-10-21)
Read the real error first: `vercel --scope rapid-monkeys inspect <deployment> --logs`, or the API fields
`vercel api "/v13/deployments/<id>?teamId=team_WlkHv2nkHG5AG4tqDqoTwp7G"` → `errorCode`, `errorMessage`.
In Git Bash set `MSYS_NO_PATHCONV=1` before `vercel api /...` or the path gets rewritten to a Windows path.

| Symptom | Cause | Fix |
|---|---|---|
| Preview fails "Resource provisioning failed", zero build logs | **Neon free-plan branch limit (10)** — the Vercel↔Neon integration creates a `preview/<branch>` DB branch per preview and never deletes it | `neon branches list --project-id super-cake-65094275` (career_engine_dev); delete only `preview/*` branches whose PRs are merged (never `main`, never the prd project `morning-shadow-20529459`). Long-term: disable per-preview branching in Vercel → Integrations → Neon |
| No preview/production build after a push or merge; no Vercel status on the commit | GitHub → Vercel webhook delayed/missed (resolved itself after ~20–40 min) | Create a git-sourced deployment: `vercel api "/v13/deployments?teamId=…" --method POST --input dep.json` with `{"name":"career-engine","project":"career-engine","gitSource":{"type":"github","repoId":1376624931,"ref":"<branch>","sha":"<sha>"}}` (omit `target` for preview). Production redeploys need explicit user approval |
| `release:prod` "Timed out waiting for Vercel" | Same webhook delay; the merge already happened | Check `vercel api "/v6/deployments?…&target=production"`; do not merge again |
| `release:prod` "uncommitted changes" | Untracked local files | `git stash push -u -m <name> -- <paths>`, release, then restore |
| `npm test` EPERM on `.claude`, or `cannot stat '.claude'` on checkout | Claude Code holds `.claude/` open; a branch switch deleted tracked files under it, leaving a locked folder | Ask the user to fully quit and reopen VS Code (Reload Window is not enough). Avoid switching to branches that lack `.claude/` files; use a separate `git worktree` (with `-c safe.directory=<path>`) when the main folder is locked |
| `git pull` refuses with unstaged changes | User has `pull.rebase=true` | Script uses `git fetch` + `git merge --ff-only origin/main` |
| Preview URL returns 302 / "Protected by Vercel Authentication" | Previews require Vercel login | User opens it in a browser signed in to Vercel; verify code by commit SHA instead |

## Housekeeping after merges
- Delete merged `preview/*` Neon branches (with user approval) so the dev project stays under the limit.
- Record each release (PR, merge SHA, deploy result, smoke test) in `docs/SESSION_CHANGELOG.md`.