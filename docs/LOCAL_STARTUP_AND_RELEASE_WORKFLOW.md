# Local Startup And Release Workflow

## Purpose
This runbook defines the required day-to-day workflow for local startup, UI smoke validation, and release-to-production readiness. It is written for both human contributors and AI agents so sessions remain consistent.

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
1. Confirm branch is clean and checks pass locally.
2. Push branch and open PR to main.
3. Wait for required GitHub checks:
- CI Pipeline
- Paranoid Security and Hygiene Audit
4. Validate Vercel Preview manually.
5. Merge PR to main.
6. Verify production deploy on Vercel.
7. Run production smoke tests.

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
