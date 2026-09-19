# Career Engine Agent Operating Guide

## Purpose
This guide defines the standard operating workflow for all contributors and AI agents working in this repository.

Goals:
- Keep production stable
- Enforce security and code review discipline
- Preserve a repeatable release process
- Make each session easy to resume by another agent

Essential Reference Documentation:
- Architecture & Lifecycles: [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)
- Complete Module & Function Guide: [docs/MODULE_GUIDE.md](docs/MODULE_GUIDE.md)
- Technical Specifications & ERD: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Session History & Changelog: [docs/SESSION_CHANGELOG.md](docs/SESSION_CHANGELOG.md)
- Strategic Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

UI requirement:
- Before making UI changes, read docs/UI_PROGRAMMING_STANDARDS.md.

## Project Facts
- Runtime: Static SPA plus Vercel Serverless API routes
- Hosting: Vercel
- Database: Neon Postgres
- Production DB: career_engine_prd
- Preview and Development DB: career_engine_dev

## Branch Strategy
- main is production-ready only
- feature branches for active work
- hotfix branches for urgent production fixes

Recommended naming:
- feature/auth-session
- feature/user-state-api
- hotfix/signin-regression

## Required Local Checks Before Commit
Run these from repository root:

1) Security and policy scan
npm test

2) Dependency vulnerability audit
npm audit

3) Review changes
git status
git diff --staged

If any check fails, do not commit.

## Commit Standard
- Keep commits focused and small
- Use clear messages
- Never commit secrets or connection strings

Commit message examples:
- feat: add server auth session endpoint
- feat: migrate training state to server api
- fix: handle profile fallback on auth failure
- docs: add workflow runbook and release checklist

## Push And CI Workflow
1) Push feature branch
2) Open pull request into main
3) Wait for GitHub Actions to pass
4) Validate Vercel Preview deployment
5) Merge to main only after checks and manual validation

## GitHub Actions In This Repo
- CI Pipeline: .github/workflows/ci.yml
- Security Audit: .github/workflows/security-audit.yml

Both must pass before merge.

## Vercel Deployment Model
- Production deploys from main
- Preview deploys from non-main branches

Environment split:
- Production uses career_engine_prd credentials
- Preview and Development use career_engine_dev credentials

Required env vars in all scopes:
- GOOGLE_CLIENT_ID
- SESSION_SECRET

## Release Verification Checklist
After merge to main and production deploy completes:

1) Sign in with non-admin Google account
2) Create or update profile
3) Refresh and verify persistence
4) Sign out and sign back in
5) Verify jobs, training, and cert progress persist
6) Verify admin account still resolves to admin role

## Database Verification Queries
Run in Neon SQL editor against production database:

select id, email, role, created_at
from users
order by created_at desc
limit 20;

select user_id, updated_at
from user_profiles
order by updated_at desc
limit 20;

select user_id, state_key, updated_at
from user_states
order by updated_at desc
limit 50;

## Security Guardrails
- Never add secrets to source files
- Never commit env files with real values
- Never bypass security scan failures
- Never force push to main

## Session Handoff Rules For Agents
At end of each working session:
1) Update docs and commit notes clearly
2) List changed files and purpose
3) Record validation commands used
4) Record any known follow-up tasks

This ensures the next agent can continue safely without guesswork.
