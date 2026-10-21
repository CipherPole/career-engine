# Local Startup And Release Workflow

## Purpose
This runbook defines the required day-to-day workflow for local startup, UI smoke validation, and release-to-production readiness. It is written for both human contributors and AI agents so sessions remain consistent.

## Stack Reference
Current production flow:
1. Edit locally in the repo.
2. Run `launch.bat` to gate startup behind `npm test` and `npm audit`.
3. Create a feature branch and push changes to GitHub.
4. Open a PR into `main`.
5. GitHub Actions run CI and security checks.
6. Merge to `main`.
7. Vercel builds from `main` and deploys production automatically.

Current persistence model:
- Browser-only state: `localStorage` and `sessionStorage`
- Server persistence: Neon Postgres via Vercel serverless API routes
- Vercel role: hosting, previews, build/deploy orchestration, environment variables

Important boundary:
- This repo does not currently rely on a separate Vercel data store (for example KV or Blob). If that becomes a requirement, it should be added as a separate tracked change.

## Standard Release (Scripted) — Use This For Every Update
`scripts/release.js` automates the whole branch → PR → preview → production path. Every step stops on failure, so nothing reaches production without passing checks.

| Step | Command | What it does |
|------|---------|--------------|
| 1. Start | `npm run release:start -- feature/short-name` | Pulls latest `main`, creates the branch (uncommitted edits made on `main` come along) |
| 2. Build | edit files, test with `launch.bat` | Local server at `http://localhost:8080` |
| 3. Ship to preview | `npm run release:ship -- "feat: what changed"` | Runs `npm test` + `npm audit`, shows files and asks before committing, pushes, opens or reuses the PR, waits for GitHub Actions + Vercel, prints the preview URL |
| 4. Test preview | open the preview URL | Uses `career_engine_dev`; production data is untouched |
| 5. Release | `npm run release:prod` | Confirms checks are green, asks before merging, merges to `main`, waits for the Vercel production deploy, smoke-tests production, prints the release checklist |
| Anytime | `npm run release:status` | Branch, uncommitted changes, PR, checks, and preview URL |

`release.bat start|ship|prod|status ...` does the same from a double-click or `cmd`. Add `--yes` to skip prompts (agents use this only after reviewing the file list).

Rules the script enforces:
- Branch names: `feature/`, `hotfix/`, `fix/`, `docs/`, `chore/` + lowercase name.
- Commit messages: conventional prefix (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, ...).
- Never ships from `main`, never merges with red checks or uncommitted changes.
- Requires `gh auth status` to be signed in.

Hotfix: same flow with `release:start -- hotfix/name`. Rollback: Vercel dashboard → Deployments → previous production deploy → **Instant Rollback**, then fix forward with a hotfix branch.

## Quick Path
1. Run validated startup script:

launch.bat

2. Confirm startup gates pass:
- `npm test`
- `npm audit`

3. Confirm app is live at:
- `http://localhost:8080`

4. Run mandatory UI smoke checks:
- Sign-in page loads
- Dashboard loads (demo or authenticated route)
- LinkedIn Optimizer page loads
- Any new UI panel added by your change is visible and interactive

5. Continue with normal git workflow:
- Create feature branch
- Commit focused changes
- Push branch
- Open PR
- Validate Vercel Preview
- Merge to main after checks pass

## Startup Gate Behavior
`launch.bat` is a validated launcher. It blocks startup if either required check fails.

Behavior:
1. Runs `npm test`
2. Runs `npm audit`
3. Starts local server only when both pass

If checks fail, fix issues first, then rerun `launch.bat`.

## Production Push Workflow
1. Confirm the working tree is clean with `git status -sb`.
2. If any files show `M`, `??`, or other local changes, they are not committed or pushed yet.
3. Confirm checks pass locally.
4. Push branch and open PR to main.
5. Wait for required GitHub checks:
- CI Pipeline
- Paranoid Security and Hygiene Audit
6. Validate Vercel Preview manually.
7. Merge PR to main.
8. Verify production deploy on Vercel.
9. Run production smoke tests.

## Local-to-Production Traceability
When a user asks for an update, follow this sequence and record it in the session changelog:
1. Make the change locally.
2. Validate with `launch.bat`, `npm test`, and `npm audit`.
3. Confirm the working tree status with `git status -sb` before saying the work is pushed.
4. Push a feature branch.
5. Open PR, wait for checks, and validate preview/prod.
6. Merge to `main` to trigger Vercel production deploy.
7. Document the exact commands and results in `docs/SESSION_CHANGELOG.md`.

## Proven Reference Execution (2026-09-28)
This section captures the exact working sequence used to ship the LinkedIn Export Diff Analyzer and workflow hardening updates to production.

### A. Branch + Validation + Push
Commands used:

git checkout -b feature/linkedin-export-diff
npm test
npm audit
git add scripts/linkedin-engine.js launch.bat docs/ENGINEERING_WORKFLOW.md AGENTS.md README.md docs/SESSION_CHANGELOG.md docs/LOCAL_STARTUP_AND_RELEASE_WORKFLOW.md
git commit -m "feat: add linkedin export diff analyzer and rewrite checklist"
git commit -m "chore: enforce validated local startup workflow"
git commit -m "docs: standardize startup and release runbook for future sessions"
git push -u origin feature/linkedin-export-diff

### B. PR + Checks + Merge (GitHub CLI Path)
Prerequisite: authenticated GitHub CLI session (`gh auth status` shows active account).

Commands used:

gh pr create --base main --head feature/linkedin-export-diff --title "feat: LinkedIn export diff analyzer + validated startup workflow" --body "..."
gh pr checks 1
gh pr merge 1 --merge --delete-branch

Expected gates before merge:
- CI Pipeline = success
- Paranoid Security and Hygiene Audit = success
- Vercel deployment checks = success

### C. Post-Deploy Smoke Checklist (Production)
URL: `https://career-engine-five.vercel.app`

Validated checks:
1. `#signin` route loads.
2. Demo/dashboard route loads (`#dashboard`).
3. LinkedIn Optimizer route loads.
4. New UI is present:
	- One-Time Full Rewrite Checklist
	- LinkedIn Export Diff Analyzer
5. Existing copy blocks continue to render.

### D. Notes For Future Sessions
- If Vercel preview app URL is SSO-gated, validate production route after merge.
- Use CLI merge path when browser GitHub auth is unavailable but `gh` is authenticated.
- Record any production smoke results in `docs/SESSION_CHANGELOG.md` for traceability.

## Required Environment Variables
Set for Production, Preview, and Development scopes in Vercel:
- `GOOGLE_CLIENT_ID`
- `SESSION_SECRET`

For server persistence features, ensure database variables are configured per deployment model.

## Agent Session Handoff Notes
At the end of each session, record:
- Scope completed
- Files changed and purpose
- Validation commands run and status
- Preview/production validation done
- Remaining follow-up tasks

This ensures future sessions can continue without context loss.

## Troubleshooting Releases (learned 2026-10-21)
The full table lives in `.agents/skills/release-workflow/SKILL.md` → "Known issues & diagnostics". The three that matter most:
1. **Preview fails with "Resource provisioning failed" and no build logs** → the Neon dev project hit its 10-branch limit (one `preview/<branch>` DB branch per preview). Delete merged `preview/*` branches: `neon branches list --project-id super-cake-65094275`. Turning off per-preview branching in Vercel → Integrations → Neon prevents it.
2. **No Vercel build after a push or merge** → GitHub→Vercel webhook delay. Check `vercel api "/v6/deployments?teamId=team_WlkHv2nkHG5AG4tqDqoTwp7G&limit=5"`; trigger a git-sourced deployment through the API if needed (production only with owner approval).
3. **`EPERM` on `.claude` during `npm test` or checkout** → Claude Code is holding the folder; fully quit and reopen VS Code.