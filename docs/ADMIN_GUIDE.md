# Career Engine — Administrator & Operator Guide

> **Audience:** Platform Administrator (Joseph Erexson III) and AI Assistant Pair Programmers.  
> **Target System:** Career Engine (`https://career-engine-five.vercel.app`)

---

## 1. Accessing Administrator Privileges

### 1.1 Owner Verification
- **Admin Email:** `jerexson3@gmail.com`
- When you authenticate via official **Sign in with Google**, the platform decodes the cryptographic OIDC JWT token issued by Google Identity Services.
- If `payload.email.toLowerCase() === "jerexson3@gmail.com"` and `payload.email_verified === true`, the system elevates your session to **`ROLE_ADMIN`**.
- All other authenticated users receive **`ROLE_USER`** (an isolated workspace profile with no admin access).

### 1.2 Accessing the Administrator Console & Subsystems
1. Ensure you are signed in with your admin Google account (`jerexson3@gmail.com`).
2. In the sidebar under **System**, you have direct access to 4 dedicated pages:
   - **⚙️ Settings & Security** (`#settings`): OAuth 2.0 configuration, session diagnostics, and telemetry logs.
   - **🎯 Backlog & Prompts** (`#backlog`): Engineering work orders, prompt launcher for AI agents, and task creator.
   - **📬 Feedback & Issues** (`#feedback`): User bug reports, suggestion triage, and AI analysis prompts.
   - **🔍 SEO & Discoverability** (`#seo`): 6-pillar site health audit, crawler probes, and on-demand scanner.
3. **Subsystem Navigation Toolbar:** At the top of every System page, an interactive pill bar lets you jump directly between all 4 subsystems with a single click.
4. Alternatively, click your user profile pill in the top right corner to access 1-click launcher buttons for any of the 4 subsystems.

---

## 2. Managing Google OAuth 2.0 Client ID

### 2.1 Production Configuration (Vercel Serverless)
- **Vercel Project Settings:**
  - Navigate to your Vercel project dashboard $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**.
  - Key Name: `GOOGLE_CLIENT_ID`
  - Value: `102751181448-j7rgq22cvvnemsjlfmth6d54kaap3nn0.apps.googleusercontent.com`
  - Scope: Production, Preview, Development.
- **Serverless Endpoint:**
  - The client dynamically fetches this via `GET /api/auth-config`.
  - No secret keys are stored in client code or Git history.

### 2.2 Google Cloud Console Checklist
Ensure the following are configured in your Google Cloud Console under **APIs & Services** $\rightarrow$ **Credentials**:
- **Authorized JavaScript Origins:**
  - `https://career-engine-five.vercel.app`
  - `http://localhost:3000` (for local dev)
  - `http://127.0.0.1:5500` (for live server)
- **Authorized Redirect URIs:**
  - `https://career-engine-five.vercel.app`
- **Scopes:** `email`, `profile`, `openid`

---

## 3. Using the Action Logs & Trace Route Console (`#settings`)

The **Action Logs & Diagnostic Trace Route Console** is located inside `#settings`:

```
+-------------------------------------------------------------------------------+
|  🛰️ Action Logs & Diagnostic Trace Route                                     |
|  [📋 Copy Diagnostics Report]  [⬇️ Export JSON]  [🧪 Test Error]  [🗑️ Clear]    |
+-------------------------------------------------------------------------------+
|  Buffer Depth: 150 Events   |  Errors Logged: 0 Errors  |  Identity: Admin   |
+-------------------------------------------------------------------------------+
|  Category Filter: [All] [AUTH] [NETWORK] [ROUTER] [RBAC] [SYSTEM]             |
|  Level Filter:    [All] [ERROR] [SECURITY] [WARN]                             |
+-------------------------------------------------------------------------------+
|  [INFO] [AUTH]    GSI_INITIALIZED_SUCCESS                                     |
|  [INFO] [NETWORK] HTTP 200 /api/auth-config (42ms)                            |
|  [INFO] [ROUTER]  NAVIGATE -> #settings                                       |
+-------------------------------------------------------------------------------+
```

### 3.1 Key Toolbar Actions
- **📋 Copy Diagnostics Report:**
  - Compiles an executive trace report with system specs, user-agent, viewport, session fingerprint, and the last 40+ chronological event logs.
  - Copies directly to your clipboard.
  - **Best Practice:** When experiencing an issue or debugging in pair programming, simply click this button and paste the report directly into the AI chat!
- **⬇️ Export JSON:**
  - Downloads the complete ring-buffer log file (`career-engine-telemetry-<timestamp>.json`) for offline analysis.
- **🧪 Test Error Handler:**
  - Dispatches a safe diagnostic test error to verify error interception and live feed updating in real time.
- **🗑️ Clear Logs:**
  - Flushes the local telemetry buffer and resets the ring counter.
- **🔄 Refresh Server Logs:**
  - Re-hydrates server auth audit logs from `/api/admin-auth-events` (which automatically polls every 10 seconds).

---

## 4. Engineering Backlog & AI Prompt Launcher Workflow (`#backlog`)

The **Engineering Backlog** view allows the administrator to manage tasks and instantly hand off work to AI coding agents:

```
+-------------------------------------------------------------------------------+
|  🎯 Engineering Backlog & AI Prompt Launcher                                  |
|  [Filter: All (8)] [P0 Immediate (1)] [P1 Next Up (3)] [P2 Future (4)]        |
|  [➕ Add Backlog Item]  [🔄 Refresh Cloud Backlog]                             |
+-------------------------------------------------------------------------------+
```

### 4.1 How to Dispatch Work to an AI Coding Agent
1. Navigate to **🎯 Backlog & Prompts** (`#backlog`).
2. Find the pending work order (e.g., `[P0] Project Showcase Cloud Persistence Migration`).
3. Click **`📋 Copy Agent Work Prompt`**.
4. The button flashes green (`✓ Prompt Copied!`) and places a formatted Markdown work order on your clipboard.
5. Paste the prompt directly into your AI coding assistant (Antigravity). The agent receives all target file paths, acceptance criteria, and architecture constraints instantly.
6. Alternatively, click **`🚀 Dispatch to Issue Tracker`** to automatically create an active ticket in the Feedback & Issues dashboard.

### 4.2 Adding Custom Backlog Items
1. Click **`➕ Add Backlog Item`** at the top right of `#backlog`.
2. Fill in:
   - **Title:** Brief descriptive title.
   - **Priority:** `P0` (Critical), `P1` (High), or `P2` (Moderate).
   - **Target Files:** Relative file paths (e.g., `scripts/tracker-engine.js`).
   - **Description:** Clear acceptance criteria.
3. Click **`💾 Save Item to Cloud`**.
4. The item is saved to Neon Postgres (`user_states` table, key: `engineering_backlog`) and is immediately ready for prompt copy.

---

## 5. User Feedback & Issue Intelligence Center Workflow (`#feedback`)

Candidate bug reports and suggestions submitted via the floating chatbot widget appear in real time in `#feedback`:

```
+-------------------------------------------------------------------------------+
|  📬 Feedback & Issue Intelligence Center                                      |
|  Total: 4  |  Open: 1  |  In Progress: 1  |  Reported: 1  |  Completed: 1     |
+-------------------------------------------------------------------------------+
```

### 5.1 Issue Resolution Lifecycle
```
[Open] ──(Analyse with AI)──▶ [In Progress] ──(Copy Prompt)──▶ [Reported] ──(Fix Merged)──▶ [Completed]
```
1. **Open:** A candidate submits a report via the bottom-right AI Assistant widget.
2. **In Progress:** Administrator clicks **`⚡ Analyse with AI`**. The platform synthesizes an AI troubleshooting prompt and transitions the ticket status to `In Progress`.
3. **Reported:** Administrator clicks **`📋 Copy Prompt (Mark Reported)`**. The prompt is copied to clipboard for the AI pair programmer, and the status updates to `Reported` so operators know work has been dispatched.
4. **Completed:** Once the agent fixes the issue and merges to `main`, click **`✅ Mark as Completed`** to archive the ticket.

---

## 6. SEO Intelligence & AI Discoverability Workflow (`#seo`)

The **SEO Intelligence** view monitors search engine indexability and AI crawler visibility:

### 6.1 Running an Audit
1. Navigate to **🔍 SEO & Discoverability** (`#seo`).
2. Click **`⚡ Run Live SEO Scan`**.
3. The engine dynamically audits 5 pillars:
   - Meta & Tags
   - AI Discoverability (checks `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD)
   - Performance & Assets
   - Content Quality (headings, alt text, link structure)
   - Structured Data
4. The composite score and grade badge are automatically saved to Neon Postgres (`/api/state?key=seo_scan`) so they persist across browser sessions.
5. Click **`📋 Copy Full SEO Report`** to generate a Markdown report for documentation or sharing.

---

## 7. User Profile & Sign-Out Navigation

### 7.1 On Desktop:
- In the top right header, click your profile card to open the **User Profile Modal**, which contains full account details, session fingerprint, quick links to all 4 System pages, and a prominent **`🚪 Sign Out of Workspace`** button.
- A quick **`🚪 Sign Out`** button is also directly visible next to your avatar in the header for 1-click logout.

### 7.2 On Mobile:
- Tap **`☰ Menu`** in the top bar to toggle the navigation sidebar.
- Tap your profile avatar to open the **User Profile Modal** and select **`🚪 Sign Out of Workspace`**.

---

## 8. Reference Architecture Map
For a complete schema breakdown of all 4 System pages, API endpoints, and data stores, consult [docs/SYSTEM_SECTION_MAP.md](SYSTEM_SECTION_MAP.md).
