---
name: career-engine-guide
description: >-
  Provides a complete architectural directory, module sitemap, and fast onboarding guide for the Career Engine repository.
  Use when an agent needs to locate specific components, understand the Vanilla JS architecture, map API endpoints, or navigate the codebase efficiently to cut down exploration tokens.
---

# Career Engine Fast Onboarding & Codebase Navigation Guide

Use this skill to navigate the Career Engine repository without burning tokens on broad grep/find searches.

## 1. Core Architecture Quick-Map

Career Engine is a high-performance, zero-runtime-dependency Single-Page Application (SPA) paired with Vercel Serverless Functions and Neon Postgres.

### File Locations by Domain

| Domain / Subsystem | Primary Script | API Route | Storage Key / DB Table |
| :--- | :--- | :--- | :--- |
| **Router & Shell** | `scripts/app.js` | N/A | Local hash routing |
| **Auth & Google OIDC** | `scripts/auth-engine.js` | `api/auth-config.js`, `api/auth-session.js` | `careerEngine_active_session` |
| **Resume & ATS Engine** | `scripts/resume-engine.js` | `api/profile.js` | `user_profiles` table |
| **Resume Parser** | `scripts/resume-parser.js` | N/A (Client-side) | Parses PDF/TXT in-browser |
| **Job Search CRM** | `scripts/tracker-engine.js` | `api/state.js` | `user_states` (key: `jobs`) |
| **Training & Radar** | `scripts/training-engine.js` | `api/state.js` | `user_states` (key: `training`) |
| **Certifications** | `scripts/cert-engine.js` | `api/state.js` | `user_states` (key: `certs`) |
| **Feedback Chatbot** | `scripts/feedback-engine.js`| `api/feedback.js` | `feedback` table |
| **Admin Console** | `scripts/auth-engine.js` | `api/admin-auth-events.js` | Telemetry ring buffer |
| **Admin Backlog** | `scripts/auth-engine.js` | `api/state.js` | `user_states` (key: `engineering_backlog`) |
| **Admin Feedback** | `scripts/auth-engine.js` | `api/admin-feedback.js` | `feedback` table |
| **Admin SEO Panel** | `scripts/auth-engine.js` | `api/state.js` | `user_states` (key: `seo_scan`) |
| **Database Pool** | `api/_lib/db.js` | All API routes | Neon Postgres Pool |

---

## 2. Inviolable Repository Constraints

1. **Zero Runtime npm Dependencies:**
   - NEVER add packages to `dependencies` in `package.json`.
   - The pre-commit scanner (`npm test`) immediately blocks commits containing unauthorized packages.
2. **Vanilla JavaScript Modules:**
   - All client scripts are ES2022+ modules.
   - Dynamic imports in `scripts/app.js` use cache busters: e.g. `import('./module.js?v=11')`.
   - When updating a module, bump `?v=X` across `scripts/app.js` and `index.html`.
3. **Multi-Tenant Profile Isolation:**
   - Never inject default user experience or skills from the platform owner into new user templates.
   - New accounts must default to empty arrays (`[]`).
4. **Allowed State Keys:**
   - Whitelisted keys in `api/state.js`: `'jobs'`, `'training'`, `'certs'`, `'projects'`, `'seo_scan'`, `'engineering_backlog'`.
   - If adding a new persisted user state, add it to `ALLOWED_STATE_KEYS`.

---

## 3. Pre-Commit & Verification Sequence

Before committing any change:
```powershell
npm test
npm audit
```

Both must report 0 vulnerabilities.

---

## 4. Documentation References
- Detailed component guide: `docs/MODULE_GUIDE.md`
- System Section map: `docs/SYSTEM_SECTION_MAP.md`
- Agent workflows: `docs/AGENT_PAIR_PROGRAMMING_PLAYBOOK.md`
- Release runbook: `docs/LOCAL_STARTUP_AND_RELEASE_WORKFLOW.md`
