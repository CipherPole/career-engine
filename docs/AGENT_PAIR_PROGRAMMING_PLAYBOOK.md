# Career Engine — AI Agent Pair Programming & Handoff Playbook

> **Audience:** First-time AI Agents, Incoming Pair Programmers, and Platform Maintainers  
> **Repository:** `CipherPole/career-engine`  
> **Production Target:** `https://career-engine-five.vercel.app`

---

## 1. Operating Model & Philosophy

Career Engine is engineered using an **AI-first pair programming paradigm**:
- **Platform Owner (Human):** Operates the production site, tests features as an end-user and administrator (`jerexson3@gmail.com`), triages user feedback, and uses the built-in AI prompt launchers to delegate tasks.
- **AI Coding Agent (Antigravity):** Receives structured work order prompts, loads repository context efficiently, implements modular Vanilla JS code, validates security & hygiene, and merges releases via GitHub Pull Requests.

```
       ┌─────────────────────────────────────────────────────────┐
       │             Platform Owner (jerexson3@gmail.com)        │
       └──────────────┬───────────────────────────┬──────────────┘
                      │ (Triage / Dispatch)       │ (Report Issue)
                      ▼                           ▼
        ┌───────────────────────────┐   ┌───────────────────────────┐
        │  🎯 #backlog Work Orders  │   │   📬 #feedback Tickets    │
        └─────────────┬─────────────┘   └─────────────┬─────────────┘
                      │                               │
                      │ [📋 Copy Agent Work Prompt]    │ [📋 Copy Prompt]
                      ▼                               ▼
       ┌─────────────────────────────────────────────────────────┐
       │                AI Coding Agent Session                  │
       │  1. Ingest prompt with target files and acceptance spec │
       │  2. Consult docs/MODULE_GUIDE.md & SYSTEM_SECTION_MAP   │
       │  3. Implement code adhering to Zero-Dependency rules    │
       │  4. Run `npm test` & `npm audit` pre-flight checks      │
       │  5. Push feature branch, verify CI, and merge PR        │
       └─────────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │   Vercel Serverless Production Deploy + Neon DB Sync   │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Ingesting Work Orders & Issue Prompts

### 2.1 From `#backlog` (Engineering Backlog)
When the user copies a prompt from **🎯 Backlog & Prompts**, it will be formatted as:
```markdown
# 🤖 Career Engine — Engineering Work Order
**Task:** [Task Title]
**Priority:** P0 / P1 / P2
**Target Files:** `scripts/...`, `api/...`

### Context & Architectural Requirements
- Adhere to zero runtime dependencies (Vanilla JS ES2022+ modules).
- Cache-busting queries must be updated (e.g. `?v=11`).
- ...
```
**Agent Action:**
1. Do **not** spend excessive tokens scanning the whole workspace. Go directly to the specified **Target Files**.
2. Cross-reference [docs/MODULE_GUIDE.md](MODULE_GUIDE.md) and [docs/SYSTEM_SECTION_MAP.md](SYSTEM_SECTION_MAP.md).
3. Check if new state keys need to be whitelisted in `ALLOWED_STATE_KEYS` in `api/state.js`.

### 2.2 From `#feedback` (Candidate Feedback & Bug Reports)
When the user copies a prompt from **📬 Feedback & Issues**, it will contain:
- Ticket ID, reporter email, category (`Bug`, `Suggestion`, `Question`, `Feedback`), user description, and reproduction context.
**Agent Action:**
1. Formulate a targeted fix.
2. Verify if the database schema in `api/_lib/db.js` or client rendering in `scripts/feedback-engine.js` is involved.
3. Once the PR is merged, advise the user that the ticket status can now be set to `✅ Completed` in the dashboard.

---

## 3. Strict Engineering Guardrails (Zero-Tolerance Rules)

### Rule 1: Zero Runtime Dependencies
- `package.json` must **never** have runtime `dependencies`. Only `devDependencies` (`@eslint/js`, `eslint`) are permitted for tests.
- All frontend functionality must be pure **Vanilla HTML5, CSS3, and ES2022+ JavaScript modules**.
- Never install libraries like React, Vue, Lodash, Axios, or Tailwind.

### Rule 2: Multi-Tenant Data Isolation
- Career Engine is a multi-tenant platform.
- **Never hardcode personal user data** (experience, skills, email, compensation) as default fallbacks for new users.
- New users must receive clean, isolated profiles (`[]` arrays).
- Google email verified via OIDC JWT is the sole boundary for tenancy.

### Rule 3: Neon Postgres Schema Consistency
- Neon Postgres tables: `users`, `user_profiles`, `user_states`, `feedback`.
- Schema definitions and automatic migration queries live in `api/_lib/db.js`.
- If storing a new type of user state via `GET /api/state` or `PUT /api/state`, the `state_key` **must** be whitelisted in `ALLOWED_STATE_KEYS` in `api/state.js`.

### Rule 4: Module Cache-Busting
- Client scripts are imported dynamically in `scripts/app.js` using version query parameters (e.g., `?v=11`).
- When modifying imported modules, bump the version string across `scripts/app.js` and `index.html` to guarantee users receive the latest bundle immediately without stale browser cache issues.

### Rule 5: Release Verification Workflow
- Always develop on a feature branch (`feature/<name>`).
- Always run local checks before commit:
  ```powershell
  npm test
  npm audit
  ```
- Push feature branch and open a PR via GitHub CLI:
  ```powershell
  git push origin feature/<name>
  gh pr create --title "feat: ..." --body "..."
  ```
- Wait for GitHub Actions (`Zero-Trust Security & Secret Scan`, `Lint & Data Integrity Check`) and Vercel preview checks to pass:
  ```powershell
  gh pr checks <PR_NUMBER>
  ```
- Merge to `main`:
  ```powershell
  gh pr merge <PR_NUMBER> --merge --delete-branch
  git checkout main
  git pull origin main
  ```

---

## 4. Subsystem Quick Reference

| Subsystem | Route | Controller | Cloud Endpoint / Storage |
| :--- | :--- | :--- | :--- |
| **Settings & Security** | `#settings` | `renderSettingsPage()` | `GET /api/auth-config`, `GET /api/admin-auth-events` |
| **Backlog & AI Prompts** | `#backlog` | `renderBacklogPage()` | `GET /api/state?key=engineering_backlog`, `PUT /api/state` |
| **Feedback & Issues** | `#feedback` | `renderFeedbackPage()` | `GET /api/admin-feedback`, `PATCH /api/admin-feedback` |
| **SEO & Discoverability** | `#seo` | `renderSeoPage()` | `GET /api/state?key=seo_scan`, `PUT /api/state` |
| **Resume Studio & ATS** | `#resume`, `#dashboard` | `renderResumeEngine()` | `GET /api/profile`, `PUT /api/profile` |
| **Job Search CRM** | `#jobs` | `renderJobTracker()` | `GET /api/state?key=jobs`, `PUT /api/state` |
| **Training & Certs** | `#training`, `#certs` | `renderTrainingHub()` | `GET /api/state?key=training`, `GET /api/state?key=certs` |

---

## 5. Session Handoff Rules (Preserving Continuity)

At the conclusion of every development session:
1. **Document the Milestone:** Add an entry to [docs/SESSION_CHANGELOG.md](SESSION_CHANGELOG.md) specifying the problem, solution, modified files, and test validation.
2. **Update the Roadmap:** Check off completed items in [docs/ROADMAP.md](ROADMAP.md) and bump version if released.
3. **Verify Git Hygiene:** Ensure working directory is clean (`git status`) and no temporary or secret files remain.
4. **Summarize for Next Agent:** Explicitly state what was deployed, current production release tag, and the next recommended P0/P1 tasks from the backlog.
