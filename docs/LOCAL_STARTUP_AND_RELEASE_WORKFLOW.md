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
