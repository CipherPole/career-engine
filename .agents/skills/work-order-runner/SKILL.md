---
name: work-order-runner
description: >-
  Executes engineering work orders, Part 2 mock-data migrations, or candidate issue triage prompts copied from the Career Engine Backlog (#backlog) or Feedback Center (#feedback).
  Use when implementing task prompts, updating database state keys, validating zero-dependency rules, and completing tickets.
---

# Career Engine Work Order & Task Execution Runbook

Use this skill when the user provides an engineering work order copied from `#backlog` or an issue triage prompt copied from `#feedback`.

## 1. Work Order Lifecycle

```
[Prompt Received] ──▶ [Target File Isolation] ──▶ [Implementation] ──▶ [Pre-Flight Checks] ──▶ [Git Branch & PR] ──▶ [Cloud Verification]
```

---

## 2. Execution Steps

### Step 1: Parse the Work Order
Extract the following from the prompt:
- **Title & Priority:** (e.g. `[P0] Project Showcase Cloud Persistence Migration`)
- **Target Files:** Note exact files listed (e.g. `scripts/project-showcase.js`, `api/state.js`).
- **Acceptance Criteria:** What constitutes completion.

### Step 2: Check State Key Whitelisting (if persisting data)
If the feature saves data to Neon Postgres via `api/state.js`:
1. Check `ALLOWED_STATE_KEYS` array in `api/state.js`.
2. Ensure the state key is included. If not, add it:
   ```javascript
   const ALLOWED_STATE_KEYS = [
     'jobs', 'training', 'certs', 'projects', 'seo_scan', 'engineering_backlog', '<new_key>'
   ];
   ```

### Step 3: Implement Frontend Logic
1. Adhere strictly to **Vanilla JS (ES2022+)** and CSS variables defined in `styles/index.css`.
2. Ensure fallback to `localStorage` or `sessionStorage` if the network request fails or if running offline.
3. Add subtle notifications via `window.toast?.('Message', 'green' | 'gold' | 'red')`.
4. Bump cache-busting version parameter in `scripts/app.js` and `index.html` (e.g. `?v=11` $\rightarrow$ `?v=12`).

### Step 4: Validate Pre-Flight Checks
Run from the repository root:
```powershell
npm test
npm audit
```
- `npm test` runs `node scripts/security-audit.js` which verifies zero runtime dependencies, checks for secret leaks, and validates JSON syntax.
- `npm audit` ensures 0 known dependency vulnerabilities.

### Step 5: Git Branch, Commit, and PR Workflow
Follow the strict repository release runbook:
1. Ensure you are on a feature branch:
   ```powershell
   git checkout -b feature/<task-name>
   ```
2. Commit with standard message:
   ```powershell
   git add .
   git commit -m "feat: <concise summary of work order>"
   ```
3. Push to remote and open a PR:
   ```powershell
   git push origin feature/<task-name>
   gh pr create --title "feat: <title>" --body "## Summary of Changes..."
   ```
4. Check GitHub Actions and Vercel preview:
   ```powershell
   gh pr checks <PR_NUMBER>
   ```
5. Merge once all checks pass:
   ```powershell
   gh pr merge <PR_NUMBER> --merge --delete-branch
   git checkout main
   git pull origin main
   ```

### Step 6: Mark Item Status
- Inform the user that the task is complete.
- In `#backlog`, the task status can now be archived or updated.
- In `#feedback`, the ticket can be marked as `✅ Completed`.
