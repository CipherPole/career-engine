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

### 1.2 Accessing the Administrator Console
1. Ensure you are signed in with your admin Google account.
2. In the sidebar under **System**, click **⚙️ Settings & Google Auth** (or navigate to `#settings`).
3. Alternatively, click your user profile pill in the top right corner and click **⚙️ Open Administrator Console & Action Logs**.

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

## 3. Using the Action Logs & Trace Route Console

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

---

## 4. User Profile & Sign-Out Navigation

### 4.1 On Desktop:
- In the top right header, click your profile card to open the **User Profile Modal**, which contains full account details, session fingerprint, and a prominent **`🚪 Sign Out of Workspace`** button.
- A quick **`🚪 Sign Out`** button is also directly visible next to your avatar in the header for 1-click logout.

### 4.2 On Mobile:
- Tap **`☰ Menu`** in the top bar to toggle the navigation sidebar.
- Tap your profile avatar to open the **User Profile Modal** and select **`🚪 Sign Out of Workspace`**.
