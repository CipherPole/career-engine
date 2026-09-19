# Career Engine — Development Session Changelog

> **Purpose:** Detailed chronological record of development iterations, architectural decisions, and bug resolutions. Maintained for future AI agents and engineering sessions to ensure continuous alignment and seamless context preservation.

---

## Session Log: September 19, 2026

### Milestone 9: Server Auth Audit, Idle Lock, And Admin Identity Repair
- **Context:** Production sign-in required stronger isolation guarantees, visibility into new user activity, and a reliable owner/admin experience for `jerexson3@gmail.com`.
- **Implementation:**
  - Added server-side auth event logging for `USER_CREATED`, `USER_SIGNIN`, and `USER_SIGNOUT`.
  - Added `api/admin-auth-events.js` so the admin console can read recent auth events.
  - Reduced idle session lock to 3 minutes and enforced sign-out on inactivity.
  - Ensured `user_profiles` rows are created during first successful Google sign-in.
  - Enforced owner-email-to-admin mapping on the server during Google upsert.
  - Hydrated browser auth state from `/api/me` and refreshed the auth pill/sidebar immediately after login so production no longer remains visually stuck in Guest mode.

### Milestone 10: Growth Upgrade With Antigravity Implementation Lab
- **Context:** The project now also serves as a learning system for implementation quality, not only as a career dashboard.
- **Implementation:**
  - Added a new Growth page, **Antigravity Implementation Lab**, for rating request quality and comparing original vs improved prompts.
  - Added local persistence for implementation rating snapshots and coaching notes.
  - Authored `docs/IMPLEMENTATION_PLAYBOOK.md` to preserve successful prompting patterns, stronger request structure, and project-specific lessons for future agents and sessions.

### Milestone 1: Zero-Credential Git Hygiene & Vercel Serverless Integration
- **Context:** The project was open-sourced to public GitHub (`CipherPole/career-engine`). Google OAuth credentials could not be stored in client-side code or Git repository files.
- **Implementation:**
  - Implemented **Option A Architecture**: Serverless credential resolution.
  - Built `api/auth-config.js` to serve `GOOGLE_CLIENT_ID` from Vercel Project Environment Variables (`process.env.GOOGLE_CLIENT_ID`).
  - Added dynamic fallback to `localStorage` for offline / development environments.
  - Implemented `scripts/security-audit.js` pre-commit hook enforcing zero secrets, API keys, or tokens in Git commits.
  - Verified live deployment at `https://career-engine-five.vercel.app/api/auth-config` returning HTTP 200.

### Milestone 2: Brand Identity Evolution
- **User Directive:** Transition the platform from a personal portfolio for Joseph Erexson III to a universal platform: *"Personal AI Career Engine to help others improve and understand their own skills better"*.
- **Implementation:**
  - Updated `index.html` title to: `Career Engine — Personal AI Career & Skill Intelligence Platform`.
  - Updated meta descriptions, badges, and landing page headlines to universal skill intelligence messaging.
  - Reserved administrative privileges exclusively for verified owner email `jerexson3@gmail.com`.
  - Implemented isolated, private workspace creation for new visitors (`careerEngine_profile_<email>`).

### Milestone 3: Motion Aurora & Interactive Constellation Gateway
- **Context:** Replaced the static sign-in screen with a high-conversion, dynamic landing experience.
- **Implementation:**
  - Built full-screen CSS aurora motion layers (`signin-motion-bg`) with multi-color radial gradient orbs.
  - Built interactive canvas constellation network (`signin-constellation-canvas`) connecting nodes and tracking mouse movement with elastic physics.
  - Enforced full-screen viewport coverage (`100dvw` / `100dvh`, `position: fixed`).
  - Applied `pointer-events: none !important; z-index: 0 !important;` to background canvas, and `pointer-events: auto !important; z-index: 100 !important;` to the glassmorphic card to prevent interaction blocking.

### Milestone 4: PC Chrome Google Sign-In & Popup Investigation
- **Problem Statement:** On PC desktop Chrome, clicking Google Sign-In was perceived as not working, while on mobile Android it worked without issue. Console showed:
  `POST https://accounts.google.com/gsi/log?...&event=button.popup.clicked.popupNotOpened net::ERR_BLOCKED_BY_CLIENT`
- **Root Cause Analysis:**
  1. `net::ERR_BLOCKED_BY_CLIENT`: Desktop Chrome had an ad blocker (e.g. uBlock Origin or AdBlock) active that blocked Google's analytics endpoint (`/gsi/log`). This is harmless for authentication itself.
  2. `button.popup.clicked.popupNotOpened`: The browser had already opened **3 background Google OAuth popup windows** (`https://accounts.google.com/v3/signin/...`, viewport 508x569). Because an OAuth window was already active, Google Identity Services refused to open a 4th popup.
  3. The button text `"Sign in as Joseph"` is Google's official personalized button rendered by Google Identity Services when Chrome has an active profile for that user.
- **Implementation:**
  - Added Google Identity Services `click_listener` for instantaneous UI feedback.
  - Added `intermediate_iframe_close_callback` to detect popup dismissal.
  - Added on-screen desktop notice and a collapsible **"🔧 Desktop Troubleshooter (Popups & Ad Blockers)"** guide on the `#signin` card.
  - Successfully verified Google OIDC sign-in completion on PC desktop!

### Milestone 5: Action Logs & Diagnostic Trace Route Subsystem
- **Context:** User requested error handling and trace routing in the admin console so that admin logs can be inspected and exported to diagnose issues during pair programming.
- **Implementation:**
  - Created `scripts/telemetry-engine.js`: 150-event persistent ring buffer (`localStorage`).
  - Implemented event levels (`INFO`, `WARN`, `ERROR`, `SECURITY`) and categories (`AUTH`, `NETWORK`, `ROUTER`, `RBAC`, `SYSTEM`).
  - Intercepted global `window.onerror` and `window.onunhandledrejection`.
  - Added **🛰️ Action Logs & Diagnostic Trace Route Console** to the Administrator Console (`#settings`):
    - Real-time log table with color badges and expandable JSON metadata.
    - Category and level filters.
    - **📋 "Copy Diagnostics Report"** button: 1-click clipboard export of full ASCII trace report for agent pair programming.
    - **⬇️ "Export JSON"** button: Instant telemetry file download.
    - **🧪 "Test Error Handler"** button: Real-time diagnostic self-test probe.
    - **🗑️ "Clear Logs"** button: Admin buffer purge.

### Milestone 6: User Profile Component & Sign-Out Navigation
- **Context:** Following successful sign-in on PC and mobile, the sign-out option was missing from view because the profile modal DOM element had not been initialized.
- **Implementation:**
  - Revamped `#user-auth-pill` to be a clickable interactive profile card displaying avatar, user name, and role badge.
  - Added a direct quick-action **`🚪 Sign Out`** button in the top bar for instant 1-click access on all screens.
  - Added dynamic creation for `#auth-modal` inside `openAuthModal()`.
  - Styled a glassmorphic **User Profile Modal** containing:
    - User avatar, name, verified Google email, and role badge.
    - Session fingerprint and OIDC verification status.
    - Navigation shortcuts to Settings / Admin Console and Skills Dashboard.
    - Prominent red **`🚪 Sign Out of Workspace`** button.
  - Added mobile navigation support:
    - **`☰ Menu`** hamburger toggle in the top bar on screens $\le 900\text{px}$ to slide open the navigation sidebar.
    - Auto-closes mobile sidebar upon page navigation.
    - Mobile-responsive styles in `styles/main.css`.

### Milestone 7: Terms of Service, User Agreement & Single Sign-Out Architecture
- **Context:** Added legal compliance, intellectual property protection, and copyright defense mechanisms, plus streamlined the sign-out UX so that only a single sign-out button exists inside the User Profile Modal.
- **Implementation:**
  - Created `scripts/legal-engine.js`:
    - Renders **Terms of Service & Platform Usage Agreement** with comprehensive IP clauses, anti-scraping provisions, and fair use licensing.
    - Renders **User Agreement & Zero-Trust Privacy Policy** with ironclad zero-data-brokering guarantees.
    - Features smart return buttons (`"← Back to Sign In"` for visitors vs `"← Back to Dashboard"` for authenticated users).
    - Integrated clean tab switcher to toggle between Terms of Service and User Agreement without reloads.
  - Linked from `#signin` screen beneath the authentication card.
  - Linked from the **User Profile Modal** so authenticated users can review policies at any time.
  - Streamlined the header auth pill by removing the duplicate sign-out button, consolidating the single official sign-out action exclusively within the User Profile Modal.
  - Authored official markdown policy documents: `docs/TERMS_OF_SERVICE.md` and `docs/USER_AGREEMENT.md`.

### Milestone 8: Code Review, Strategic Roadmap & Admin Security Health Console
- **Context:** Prior to concluding the working session, prepared a comprehensive code review, strategic development roadmap, and admin-facing release history and security rating console to ensure future agents and engineering sessions maintain uninterrupted momentum and zero-vulnerability guarantees.
- **Implementation:**
  - Authored `docs/CODE_REVIEW.md`: Detailed health assessment of security, performance, modularity, and error handling.
  - Authored `docs/ROADMAP.md`: Prioritized RICE-scored feature backlog (AI Bullet Tailoring, Compensation Scenario Modeling, PDF Export Engine, Cloud Sync) with effort/impact ratings.
  - Authored `docs/SECURITY_AUDIT_GUIDE.md`: Step-by-step instructions on `npm audit`, `npm run audit`, CommonJS vs ES Modules handling, pre-commit checks, and zero-dependency maintenance.
  - Engineered the **📜 Project Evolution, Strategic Roadmap & Security Health Console** directly inside the Admin System Settings page (`#settings`):
    - **Release History Matrix**: Interactive timeline of delivered milestones v1.0.0 through v2.4.0 with impact ratings.
    - **Live Security Audit Engine**: Interactive button (`#btn-run-admin-audit`) running live integrity checks and providing real-time feedback.
    - **Strategic Roadmap Console**: Prioritized backlog items with RICE scores and "Ready for Pickup" indicators.
    - **1-Click Session Handoff Summary**: Quick-copy button (`#btn-copy-roadmap`) to export current repository status to clipboard for incoming agents.
  - Established `package.json` zero-dependency manifest with `npm audit` and `npm run audit` verification. All 45+ source files verified with 0 vulnerabilities.

