# Career Engine — Security Audit & Supply Chain Hygiene Guide

**Standard:** Zero-Trust Client Architecture & Zero Runtime Dependencies  
**Version:** v2.4.0  
**Target Platform:** Pure Native ES Modules / Vercel Edge CDN  
**Last Verified:** September 19, 2026 (0 Vulnerabilities, 100% Clean)

---

## 1. Zero-Dependency Security Architecture

Career Engine implements a **Zero Runtime Dependency Policy**. Unlike standard web applications that pull in hundreds of nested node modules (averaging 1,500+ third-party packages), Career Engine runs exclusively on native web standards:
- **HTML5 Web Components & Semantic DOM**
- **Vanilla CSS3 Custom Properties**
- **Native ECMAScript Modules (`<script type="module">`)**
- **Browser-Native Cryptography (`window.crypto.subtle`)**
- **Google Identity Services (GIS) Official Secure Client**

### Why This Matters
- **0 Attack Vectors from npm Supply Chain:** Eliminates threats like event-stream hijacking, typosquatting packages, or compromised maintainer credentials.
- **Zero Build-Step Exploitation:** No bundler plugins (Webpack/Vite/Babel) executing arbitrary scripts during build.
- **Instant Page Performance:** Sub-100ms first contentful paint over Vercel CDN.

---

## 2. Security Commands Reference

### 2.1 Standard Dependency Audit (`npm audit`)
Verifies that any tooling or workspace packages have zero known Common Vulnerabilities and Exposures (CVEs).
```bash
npm audit
```
*Expected Output:*
```text
found 0 vulnerabilities
```

### 2.2 Pre-Flight Paranoid Security Scanner (`npm run audit`)
Runs our custom AST/regex zero-trust scanner (`scripts/security-audit.js`).
```bash
npm run audit
```
*What it scans across all project files:*
1. **File Name Blacklist:** Prevents accidental commits of `.env`, `.pem`, `.key`, `.p12`, `id_rsa`, `.sqlite`, `.db`.
2. **High-Profile Secrets & Token Signatures (40+ Patterns):**
   - AWS Access Key IDs (`AKIA...`)
   - GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`)
   - Slack Webhook URLs
   - Stripe Secret Keys (`sk_live_...`, `sk_test_...`)
   - OpenAI Secret Keys (`sk-...`)
   - Cryptographic Private Key header blocks (e.g. `BEGIN [ALGORITHM] PRIVATE KEY`)
   - Database Connection URIs with raw passwords (`postgres://...`, `mongodb://...`)
   - High-confidence PII patterns (SSNs, credit cards).
3. **JSON Syntax & Integrity:** Validates that all data files (`data/*.json`, `package.json`, `vercel.json`) are strictly well-formed.
4. **.gitignore Exclusions:** Verifies that private candidate notes, local job tracking records, and temporary files remain untracked.

### 2.3 One-Click Windows Audit Script (`audit.bat`)
For non-terminal execution, double-click `audit.bat` in the project root to run the full pre-flight audit with visual pass/fail output.

---

## 3. Git Pre-Commit Hook Integration

To ensure no code can ever be committed with vulnerabilities or secret leaks, set up a git pre-commit hook:

### `.git/hooks/pre-commit`
```bash
#!/bin/sh
echo "Running Career Engine Pre-Commit Security Audit..."
node scripts/security-audit.js
RESULT=$?
if [ $RESULT -ne 0 ]; then
    echo "❌ Commit aborted: Security audit detected policy violations."
    exit 1
fi
exit 0
```

---

## 4. Admin Settings Diagnostics & Live Audit
In the live application under `#settings` (available to Admin accounts):
- **Live Security Audit Button:** Tests active session state, client ID sanitization, ring buffer integrity, and displays a comprehensive rating card.
- **Diagnostics Report:** Instant copyable snapshot for incident troubleshooting.
- **Telemetry Filter:** Real-time stream of `SECURITY`, `ERROR`, `WARN`, and `INFO` events.

---

## 5. Security Incident Escalation Protocol
If an audit reports an anomaly or suspicious pattern:
1. **Do NOT push to remote.**
2. Inspect the file and line indicated by `scripts/security-audit.js`.
3. If an API key was accidentally placed, revoke the key immediately at the provider dashboard.
4. Replace the secret with local environment variables or client-side prompt input.
5. Re-run `npm run audit` until a clean `PASS` is reported.
