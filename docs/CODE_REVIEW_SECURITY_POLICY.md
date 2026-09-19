# DevSecOps Code Review & Security Policy

## Overview
This repository enforces a strict, zero-trust pre-commit and pre-push code review process. The goal is to ensure that no credentials, tokens, customer data, proprietary corporate infrastructure names, or personal identifiable information (PII) are ever committed or pushed to Git.

---

## 1. Zero-Trust Secrets Policy

### Absolutely Forbidden in Git:
- **Cloud Provider Credentials**: AWS Access Key IDs (`AKIA...`), AWS Secret Keys, GCP Service Account JSON keys, Azure Client Secrets.
- **VCS & API Tokens**: GitHub Personal Access Tokens (`ghp_`, `github_pat_`), GitLab tokens, npm tokens.
- **Service API Keys**: OpenAI keys (`sk-...`), Stripe secret keys (`sk_live_`, `sk_test_`), Datadog API/App keys, Twilio credentials.
- **Communication Webhooks**: Live Slack incoming webhooks (`https://hooks.slack.com/...`), Discord webhooks.
- **Cryptographic Materials**: Private SSH keys (`id_rsa`, `id_ed25519`), SSL/TLS private keys (`.pem`, `.key`, `.p12`).
- **Database Connection Strings**: Connection URIs containing plaintext credentials (e.g. database URLs with embedded username and password).

### Safe Practice:
- Use environment variables (`process.env.VAR_NAME` or `$env:VAR_NAME`).
- Provide an `.env.example` file with dummy variable names and no real values.
- For local mock development, use explicit safe placeholder strings: `mock_secret`, `YOUR_KEY`, `myroot`.

---

## 2. Customer & Corporate Data Sanitization

### Bank of America & Enterprise Experience:
- Never disclose internal hostnames, internal DNS records, internal IP addresses (`10.x.x.x`, `172.16.x.x`, `192.168.x.x`), or private network diagrams.
- Never commit real client financial records, customer PII, account numbers, or internal proprietary tool source code.
- Frame all achievements around high-level architecture, business velocity, scalability metrics (e.g. "reduced deployment time by 80% with Terraform"), and public cloud technologies.

### Personal Privacy:
- Never commit private job application tracking (`data/jobs.json` is strictly ignored by `.gitignore`).
- Keep phone numbers private or masked to prevent telemarketing scraping.

---

## 3. Pre-Commit & Pre-Push Checklist

Before running `git commit` or `git push`, complete the following steps:

1. **Run the Paranoid Security Engine**:
   ```powershell
   node scripts/security-audit.js
   # Or double-click audit.bat
   ```
   Ensure the output reports:
   ```
   ✅ PASS: ZERO SECURITY VULNERABILITIES DETECTED.
   STATUS: SAFE TO PUSH TO GIT.
   ```
2. **Review Staged Git Diff**:
   ```powershell
   git status
   git diff --staged
   ```
   Inspect every line being committed to ensure no temporary debug lines, console dumps, or credentials are present.
3. **Verify JSON Syntax**:
   All JSON files must be valid, well-formed, and without trailing commas.

---

## 4. Automated CI Security Gate
Every push and pull request to GitHub triggers the automated GitHub Actions Security Workflow:
- Automated Gitleaks / Trivy secret detection.
- JSON schema and syntax linting.
- Branch protection prevents merging if any security scan fails.
