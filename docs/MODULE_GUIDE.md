# Career Engine — Comprehensive Module & Codebase Guide

> **Target Audience:** AI Agents, Engineers, and Maintainers  
> **Purpose:** Detailed reference for every directory, source script, API micro-endpoint, and database helper in the Career Engine repository.

---

## 1. Directory Tree & Architecture Map

```
e:\resume/
├── index.html                  # Single-Page Application HTML shell & entry point
├── package.json                # Project manifest, npm test, and npm audit scripts
├── vercel.json                 # Serverless routing, headers, rewrites, and security config
├── launch.bat                  # Local quick-launch helper
├── audit.bat                   # Local security audit execution script
├── AGENTS.md                   # Strict Agent Operating Guide and CI/CD workflow rules
│
├── api/                        # Vercel Serverless Functions (Node.js runtime)
│   ├── auth-config.js          # Serves GOOGLE_CLIENT_ID from environment
│   ├── auth-session.js         # Session creation (POST) and termination (DELETE)
│   ├── me.js                   # Authenticated user identity endpoint (GET)
│   ├── profile.js              # User profile retrieval (GET), update (PUT), and deletion (DELETE)
│   ├── state.js                # Scoped user state persistence (jobs, training, certs) (GET/PUT)
│   ├── admin-auth-events.js    # Admin-only audit log reader (GET)
│   └── _lib/                   # Shared serverless utilities
│       ├── db.js               # Neon Postgres pool, schema migration, and data queries
│       ├── session.js          # Cryptographic session cookie sealing, parsing, and clearing
│       └── http.js             # Standardized HTTP JSON responses, errors, and body parsing
│
├── scripts/                    # Frontend ES Modules (Vanilla JS)
│   ├── app.js                  # Master application router, navigation, and page dispatcher
│   ├── auth-engine.js          # Identity state, Google OIDC token handler, profile modal, delete flow, admin settings
│   ├── signin-engine.js        # Two-phase sign-in gateway (Phase 1: Google button; Phase 2: Resume upload dropzone)
│   ├── onboarding-wizard.js    # 4-step resume review modal, safe profile synthesis, and account creation
│   ├── resume-parser.js        # Client-side multi-format resume text parser and keyword extractor
│   ├── resume-engine.js        # Resume Studio, ATS keyword match scoring, and skills radar
│   ├── tracker-engine.js       # Job application tracker, pipeline stages, and company notes
│   ├── training-engine.js      # Learning pathways, lab projects, and skill progress tracking
│   ├── cert-engine.js          # Certification registry, credential verification, and expiry tracking
│   ├── implementation-engine.js# Antigravity Implementation Lab (prompt evaluation & coaching)
│   ├── telemetry-engine.js     # Circular ring-buffer logger, error capture, and diagnostics export
│   ├── legal-engine.js         # Terms of Service and User Agreement renderer
│   ├── project-showcase.js     # Technical portfolio cards and GitHub repository showcases
│   ├── linkedin-engine.js      # Profile optimization copy blocks and headline generators
│   └── security-audit.js       # Pre-commit zero-secrets and dependency security scanner
│
├── styles/
│   ├── index.css               # Core CSS design tokens, typography, glassmorphism, responsive grid
│   └── main.css                # Legacy & component-specific style rules
│
├── data/
│   ├── resume.json             # Seed template for resume structure
│   ├── skills.json             # Skill catalog and market valuation benchmarks
│   ├── projects.json           # Engineering project showcase data
│   ├── jobs.json               # Seed application tracking data (gitignored private data)
│   └── training-projects.json  # Curated training lab exercises
│
├── pages/
│   ├── resume.html             # Clean, ATS-safe printable resume page
│   └── portfolio.html          # Public-facing portfolio showcase
│
└── docs/                       # Comprehensive Engineering & Architecture Documentation
    ├── PROJECT_OVERVIEW.md     # High-level architecture, user lifecycles, and isolation model
    ├── MODULE_GUIDE.md         # (This file) Deep-dive into every file and function
    ├── ARCHITECTURE.md         # Technical architecture and data flow diagrams
    ├── SESSION_CHANGELOG.md    # Chronological history of milestones, bugs, and fixes
    ├── ROADMAP.md              # RICE-scored strategic backlog and release history
    ├── UI_PROGRAMMING_STANDARDS.md # UI design tokens, aesthetics, and animation guidelines
    ├── CODE_REVIEW_SECURITY_POLICY.md # Security audit policies and zero-secret rules
    ├── ENGINEERING_WORKFLOW.md # Git, branch, and Vercel release runbook
    ├── ADMIN_GUIDE.md          # Guide for platform owner administration
    ├── IMPLEMENTATION_PLAYBOOK.md # Prompt coaching and implementation patterns
    ├── TERMS_OF_SERVICE.md     # Platform terms and intellectual property rights
    └── USER_AGREEMENT.md       # User privacy agreement and zero-data-brokering terms
```

---

## 2. Frontend Modules (`scripts/`)

All frontend code is written in pure Vanilla ES2022+ modules. When importing across files, note that cache-busting version query parameters (e.g. `?v=8`) are maintained to guarantee instant updates in client browsers.

### 2.1 `scripts/app.js` (Master Application Router)
- **Role:** Central entry point loaded by `index.html`. Controls hash-based routing (`#dashboard`, `#resume`, `#tracker`, `#training`, `#settings`, `#signin`, `#terms`, `#agreement`), top-level event delegation, and sidebar navigation.
- **Key Responsibilities:**
  - `initApp()`: Initializes authentication (`initAuth`), restores route from `window.location.hash`, and registers hashchange listeners.
  - `navigateTo(routeId)`: Validates route access against RBAC rules via `canAccessRoute()`. If unauthenticated, safely redirects to `#signin`.
  - Dispatches page rendering to dedicated engines:
    - `#dashboard`, `#resume` $\rightarrow$ `renderResumeEngine()`
    - `#tracker` $\rightarrow$ `renderTrackerEngine()`
    - `#training` $\rightarrow$ `renderTrainingEngine()`
    - `#settings` $\rightarrow$ `renderAdminSettings()`
    - `#signin` $\rightarrow$ `renderSignInGate()`
    - `#terms`, `#agreement` $\rightarrow$ `renderLegalPage()`
  - Manages mobile drawer toggle (`#mobile-nav-toggle`) and collapses sidebar on link clicks.

---

### 2.2 `scripts/auth-engine.js` (Identity & Session Engine)
- **Role:** Manages Google OIDC authentication, cryptographic JWT token decoding, server-side session sync, Role-Based Access Control, the User Profile Modal, account deletion with hover-to-confirm, and the Admin Settings Console.
- **Key Functions & Exports:**
  - `initAuth()`: Asynchronously resolves Google Client ID (from `/api/auth-config`), initializes Google Identity Services (GIS), verifies current session with `/api/me`, and binds global click handlers.
  - `handleGoogleCredential(response)`: Handles the GIS credential callback. Decodes JWT claims, logs in via `POST /api/auth-session`, creates/loads the user's isolated profile, and determines whether to route to Phase 2 Resume Upload (for new candidates) or directly to Dashboard (for returning users).
  - `openAuthModal()`: Dynamically builds and displays the glassmorphic User Profile Modal showing avatar, name, verified Google email, role badge, session status, and danger actions.
  - `openDeleteAccountModal()`: Renders the anti-accidental-deletion double-confirmation modal featuring the **3-Second Hover-to-Confirm Button**.
  - `executeAccountPurge()`: Triggers full account deletion:
    1. Calls `DELETE /api/profile` (which deletes the database user row and cascades to all child records).
    2. Calls `DELETE /api/auth-session` (which unseals and clears the HTTP-only cookie).
    3. Cleans up all client `localStorage` and `sessionStorage` keys associated with the user's email.
    4. Removes `careerEngine_has_visited` so the user can re-register cleanly if desired.
    5. Redirects to `#signin` with a clean slate.
  - `renderAdminSettings()`: Renders the Admin Console for `jerexson3@gmail.com`, including OAuth settings, live telemetry diagnostic table, and the auto-refreshing Server Auth Events Log.
  - `loadAdminAuthEvents(container)`: Fetches recent server events from `/api/admin-auth-events` and renders color-coded badges (`USER_DELETED` = Red, `USER_CREATED` = Purple, `USER_SIGNIN` = Blue).

---

### 2.3 `scripts/signin-engine.js` (Two-Phase Sign-In Gateway)
- **Role:** Powers the authentication landing page, separating the initial entry door from the resume onboarding flow.
- **Phases:**
  - **Phase 1: Clean Sign-In Gate (`renderSignInPage`):**
    - Renders an immersive visual environment with interactive Canvas constellation particles and CSS aurora motion background.
    - Features a single, clean glassmorphic card containing platform branding, key value bullets, and Google's official GIS button.
    - Deliberately omits drag-and-drop dropzones to prevent cognitive overload for returning users.
  - **Phase 2: Dedicated Resume Upload Screen (`renderResumeUploadPage`):**
    - Rendered automatically when a new candidate successfully authenticates with Google.
    - Displays a prominent 4-step progress bar:
      `[✓ Google Verified] ──▶ [📄 Upload Resume (Active)] ──▶ [👁️ Review & Tailor] ──▶ [🚀 Create Profile]`
    - Provides a full-screen interactive drag-and-drop dropzone supporting PDF, TXT, and DOCX files.
    - Includes a manual text paste fallback area and a "Skip for now" option for candidates who prefer to start with a blank profile.
    - Dispatches uploaded files to `scripts/resume-parser.js`.

---

### 2.4 `scripts/onboarding-wizard.js` (Resume Review & Profile Builder)
- **Role:** Handles Step 3 (Review & Tailor) and Step 4 (Create Profile) of new user onboarding.
- **Key Functions:**
  - `showResumeReviewModal(extractedData, onConfirm)`: Pops up a comprehensive review modal displaying all parsed resume fields for candidate verification.
  - **Zero Data Leakage Enforcement:**
    - Email is pre-filled from the verified Google session and made readonly with a `[✅ Google Verified]` badge.
    - Experience, education, certifications, and accomplishments default to empty arrays (`[]`) if not detected on the resume (never seeding with Joseph's personal history).
    - Compensation targets default to blank rather than pre-filling Joseph's $120k–$175k targets.
    - Displays a clear privacy assurance badge: *"🔒 Your profile is completely private and isolated to your account."*
  - `saveNewUserProfile(profileData)`: Persists the confirmed profile to Neon Postgres via `PUT /api/profile` and browser storage (`careerEngine_profile_<email>`), marks `careerEngine_has_visited = true`, and routes the candidate directly into their new `#dashboard`.

---

### 2.5 `scripts/resume-parser.js` (Client-Side Resume Extraction)
- **Role:** Fast, client-side resume parser that extracts structured career data directly in the browser with zero cloud file uploads.
- **Key Functions:**
  - `parseResumeFile(file)`: Inspects file MIME type and extension. Reads TXT files via `FileReader.readAsText()` and extracts PDF text via stream tokenization.
  - `parseResumeText(rawText)`:
    - **Contact Information:** Regex pattern matching for emails, phone numbers, LinkedIn URLs, and GitHub profiles.
    - **Name & Title Extraction:** Analyzes top lines to separate candidate name from target title.
    - **Skills Detection:** Matches against a comprehensive dictionary of 150+ modern technologies, languages, cloud platforms, and DevOps tools.
    - **Experience & Chronology:** Identifies company names, date ranges (e.g. `2021 - Present`, `Jan 2019 - Dec 2022`), and bullet points.
    - **Education & Certifications:** Extracts degrees, universities, and industry credentials (AWS, CKA, Terraform, CISSP, etc.).

---

### 2.6 `scripts/resume-engine.js` (Resume Studio & ATS Analysis)
- **Role:** Renders the Dashboard overview, interactive Resume Studio, real-time ATS keyword gap analyzer, and skill radar chart.
- **Key Features:**
  - Live ATS readiness score calculation (0–100) based on role target requirements.
  - Skill inventory categorizer (Core Platforms, Cloud & Infra, CI/CD, Observability).
  - Experience timeline renderer with expandable bullet points and achievement metrics.
  - One-click print/export to PDF via printable template (`pages/resume.html`).

---

### 2.7 `scripts/tracker-engine.js` (Job Search CRM)
- **Role:** Powers the application tracking pipeline across 5 stages: Wishlist, Applied, Interviewing, Offer, Rejected.
- **Key Features:**
  - Scoped persistence in `careerEngine_jobs_<email>` and cloud sync via `GET /api/state?key=jobs` and `PUT /api/state?key=jobs`.
  - Add / Edit / Move / Archive job cards with salary ranges, application links, interview notes, and contact recruiters.
  - Conversion metrics (Application $\rightarrow$ Interview rate, Interview $\rightarrow$ Offer rate).

---

### 2.8 `scripts/training-engine.js` & `scripts/cert-engine.js`
- **Role:** Interactive career growth, hands-on lab projects, and professional certification trackers.
- **Key Features:**
  - Structured curriculum pathways for DevOps, SRE, Platform Engineering, and Cloud Architecture.
  - Milestone completion toggles saved to cloud state (`key=training` and `key=certs`).
  - Interactive SVG radar chart mapping candidate competency vs. market target baselines.

---

### 2.9 `scripts/telemetry-engine.js` (Client-Side Observability)
- **Role:** 150-event persistent circular ring-buffer storing structured client logs in `localStorage`.
- **Key Functions:**
  - `log(level, category, message, metadata)`: Appends an event to the buffer with an auto-incrementing ID and ISO timestamp.
  - Intercepts `window.onerror` and `window.onunhandledrejection` to catch unexpected UI bugs.
  - `generateDiagnosticsReport()`: Formats an ASCII diagnostic report including browser viewport, user agent, active session state, and chronological traces for pair programming and issue triaging.

---

### 2.10 `scripts/legal-engine.js`
- **Role:** Renders the platform Terms of Service (`#terms`) and User Agreement (`#agreement`).
- **Key Features:**
  - Smart return buttons dynamically directing users back to `#dashboard` (if signed in) or `#signin` (if guest).
  - Tabbed interface allowing seamless switching between Terms of Service and User Privacy Agreement without page reloads.

---

## 3. Serverless API Endpoints (`api/`)

All backend functions run on the Vercel Serverless Node.js runtime and reside in the `/api` directory.

### 3.1 `api/auth-config.js`
- **Method:** `GET`
- **Purpose:** Securely delivers the Google Client ID to the frontend without committing credentials to Git.
- **Response:**
  ```json
  { "ok": true, "clientId": "233860084534-...apps.googleusercontent.com" }
  ```
- **Environment Variable:** `process.env.GOOGLE_CLIENT_ID`

---

### 3.2 `api/auth-session.js`
- **Methods:** `POST`, `DELETE`
- **Purpose:** Handles user sign-in and sign-out, issuing and revoking encrypted HTTP-only session cookies.
- **`POST` Flow:**
  1. Accepts `{ credential }` (Google OIDC ID Token).
  2. Decodes and verifies token claims (audience, issuer, expiration).
  3. Upserts user row into `users` table via `upsertUserFromGoogle()` in `_lib/db.js`.
  4. Automatically maps `jerexson3@gmail.com` to `role: 'admin'`, and all others to `role: 'user'`.
  5. Automatically provisions a default empty profile row in `user_profiles` if one does not exist.
  6. Logs `USER_CREATED` or `USER_SIGNIN` into `auth_events`.
  7. Issues a sealed session cookie (`career_engine_session`) with `HttpOnly; Secure; SameSite=Lax`.
- **`DELETE` Flow:**
  1. Logs `USER_SIGNOUT` in `auth_events`.
  2. Clears the session cookie via `Max-Age=0`.

---

### 3.3 `api/me.js`
- **Method:** `GET`
- **Purpose:** Returns the identity and role of the currently authenticated user based on their session cookie.
- **Response:**
  ```json
  {
    "ok": true,
    "user": {
      "id": 12,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "picture": "https://...",
      "role": "user"
    }
  }
  ```

---

### 3.4 `api/profile.js`
- **Methods:** `GET`, `PUT`, `DELETE`
- **Purpose:** Manages the candidate's structured resume profile and handles self-service account deletion.
- **`GET`:** Returns the `profile_json` stored in Neon Postgres for `user_id`.
- **`PUT`:** Accepts `{ profile }` object and upserts `user_profiles` for the authenticated user.
- **`DELETE`:**
  1. Logs `USER_DELETED` into `auth_events` with user metadata.
  2. Executes `deleteUserAccount(userId)` in `_lib/db.js`, which deletes the row from `users` (triggering automatic cascading deletion of `user_profiles` and `user_states`).
  3. Clears the session cookie.
  4. Returns `{ ok: true, deleted: true }`.

---

### 3.5 `api/state.js`
- **Methods:** `GET`, `PUT`
- **Query Parameter:** `?key=jobs`, `?key=training`, or `?key=certs`
- **Purpose:** Syncs arbitrary state payloads for the authenticated user between browser and PostgreSQL `user_states` table.

---

### 3.6 `api/admin-auth-events.js`
- **Method:** `GET`
- **Query Parameter:** `?limit=100`
- **Purpose:** Administrator-only endpoint allowing `jerexson3@gmail.com` to inspect real-time platform auth events (`USER_CREATED`, `USER_SIGNIN`, `USER_SIGNOUT`, `USER_DELETED`).
- **Security Guard:** Returns `403 Forbidden` if the caller's role is not `admin`.

---

## 4. Serverless Core Utilities (`api/_lib/`)

### 4.1 `api/_lib/db.js`
- **Role:** Neon Postgres serverless driver client and data access layer.
- **Connection:** Uses `@neondatabase/serverless` connected via `process.env.POSTGRES_URL` or `process.env.DATABASE_URL`.
- **Auto-Schema Migration (`ensureSchema()`):**
  - Runs once per serverless instance lifecycle.
  - Automatically creates tables with appropriate primary keys, foreign key constraints, and cascade delete rules:
    - `users` (id, google_sub, email, name, picture, role, created_at, updated_at)
    - `user_profiles` (user_id REFERENCES users(id) ON DELETE CASCADE, profile_json, created_at, updated_at)
    - `user_states` (user_id REFERENCES users(id) ON DELETE CASCADE, state_key, state_json, created_at, updated_at)
    - `auth_events` (id, user_id REFERENCES users(id) ON DELETE SET NULL, email, role, event_type, is_new_user, metadata, created_at)
- **Key Functions:**
  - `upsertUserFromGoogle(identity)`
  - `getUserById(id)`
  - `getProfileByUserId(userId)`
  - `upsertProfileByUserId(userId, profile)`
  - `getUserStateByKey(userId, stateKey)`
  - `upsertUserStateByKey(userId, stateKey, stateValue)`
  - `logAuthEvent({ userId, email, role, eventType, isNewUser, metadata })`
  - `getRecentAuthEvents(limit)`
  - `deleteUserAccount(userId)`: Verifies user is not the platform owner, then executes `DELETE FROM users WHERE id = ${userId}`.

---

### 4.2 `api/_lib/session.js`
- **Role:** Handles cookie serialization, parsing, and cryptographic HMAC-SHA256 signature verification.
- **Secret Key:** `process.env.SESSION_SECRET`.
- **Key Functions:**
  - `createSessionCookie(payload)`: Encodes `{ uid, email, role }` with timestamp and signature.
  - `getSessionFromRequest(req)`: Reads `career_engine_session` cookie, verifies HMAC signature, checks expiration, and returns session payload.
  - `clearCookieHeader()`: Produces `Max-Age=0` cookie clearing header.

---

### 4.3 `api/_lib/http.js`
- **Role:** Standardized response and request helpers.
- **Key Functions:**
  - `json(res, statusCode, data)`: Sets `Content-Type: application/json` and sends JSON payload.
  - `methodNotAllowed(res, allowedMethods)`: Sends standard HTTP 405 error with `Allow` header.
  - `readJsonBody(req)`: Buffers incoming request chunks and safely parses JSON.
