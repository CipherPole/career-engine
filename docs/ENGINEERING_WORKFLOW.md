# Engineering Workflow Runbook

## Why This Exists
This runbook creates one consistent process for development, review, security checks, and deployment so any contributor or AI agent can operate reliably.

## One Cycle Overview
1. Create branch
2. Build and test locally
3. Run security and review checks
4. Push and open pull request
5. Validate preview deployment
6. Merge to main
7. Verify production

## Step 1: Create A Branch
From repository root:

git checkout main
git pull
git checkout -b feature/short-topic

Examples:
- feature/server-auth
- feature/jobs-state-sync
- feature/certs-api

## Step 2: Implement In Small Commits
Guidelines:
- One concern per commit
- Avoid unrelated refactors in same commit
- Keep docs updated with behavior changes

## Step 3: Required Local Validation
Run all checks before staging final commit:

1) Security policy scan
npm test

2) Dependency audit
npm audit

3) Final review of staged content
git add .
git diff --staged

If output includes secrets or unrelated files, unstage and fix before commit.

## Step 4: Commit And Push
Commit format:

git commit -m "feat: short description"
git push -u origin feature/short-topic

## Step 5: Pull Request Review Gate
Open PR from feature branch into main.

Required checks:
- CI Pipeline
- Paranoid Security and Hygiene Audit

No merge if checks fail.

## Step 6: Preview Validation Gate
Before merge, test preview URL end to end.

Minimum smoke tests:
1) Google sign-in works
2) Non-admin user profile persists after refresh
3) Sign out and sign in restores same user data
4) Jobs, training, and cert states persist for the same user
5) Admin user remains admin only

## Step 7: Merge To Main And Production Verify
After merge:
1) Wait for production deployment
2) Re-run smoke tests on production URL
3) Validate DB rows in career_engine_prd

Production DB quick checks:

select id, email, role, created_at from users order by created_at desc limit 20;

select user_id, updated_at from user_profiles order by updated_at desc limit 20;

select user_id, state_key, updated_at from user_states order by updated_at desc limit 50;

## Vercel Environment Model
- Production scope points to career_engine_prd
- Preview and Development scopes point to career_engine_dev

Required variables in all scopes:
- GOOGLE_CLIENT_ID
- SESSION_SECRET

## GitHub Repository Settings Recommended
1) Protect main
2) Require pull request before merge
3) Require status checks:
   - CI Pipeline
   - Paranoid Security and Hygiene Audit
4) Disable force push on main
5) Optional: require linear history

## Rollback Procedure
If production regression occurs:
1) Revert the merge commit
2) Push revert to main
3) Wait for production redeploy
4) Re-run smoke tests
5) Open follow-up fix branch

## Session Handoff Template
Use this in PR description or session note:

- Scope completed:
- Files changed:
- Checks run and status:
- Preview URL validated:
- Known risks:
- Next steps:
