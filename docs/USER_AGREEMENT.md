# Career Engine — User Agreement & Zero-Trust Privacy Policy

> **Effective Date:** September 19, 2026  
> **Platform Version:** 2.4  
> **Platform Operator:** Joseph Erexson III (`jerexson3@gmail.com`)  
> **Hosted Domain:** `https://career-engine-five.vercel.app`

---

## 1. Introduction & Ethical Standard

This User Agreement and Zero-Trust Privacy Policy ("Agreement") establishes the standards of privacy, security, and acceptable behavior for all users of **Career Engine**. We believe in radical transparency, zero data monetization, and the absolute sovereignty of your personal career data.

---

## 2. Our Zero-Trust Privacy Commitments

### 2.1 We Never Sell Your Data
- **No Data Brokering:** We do **not** sell, rent, monetize, distribute, or license your personal resume data, employment history, target compensation, or contact details to recruiters, third-party brokers, advertisers, or data aggregators.
- **No Advertising Trackers:** Career Engine employs zero third-party advertising cookies, marketing pixels, or invasive surveillance analytics.

### 2.2 What Information We Process
1. **Cryptographic Identity Claims:** When authenticating via Google Identity Services, we receive verified OIDC identity claims (`name`, `email`, `picture`, `sub`).
2. **Workspace Profile Data:** Skills data, career roadmaps, and target compensation stored locally in your browser's private storage (`localStorage`).
3. **Internal Diagnostic Telemetry:** Ephemeral in-memory ring-buffer event logs (HTTP response times, RBAC route assertions, unhandled exceptions) stored locally in your browser for troubleshooting and audit purposes.

---

## 3. Client-Side Encryption & Storage Isolation

1. **Workspace Isolation:** Every visitor's workspace data is logically partitioned and isolated using local encryption storage keys (`careerEngine_profile_<email>`).
2. **Session Fingerprinting:** Sessions are tied to a cryptographic environment hash combining your user token, timestamp, and device environment. If session tokens are copied across browsers or machines, the session is instantly revoked.
3. **Inactivity Auto-Lock:** Administrative privileges auto-lock after 30 minutes of idle time to prevent physical session hijacking.

---

## 4. Acceptable Use Standards

As a condition of accessing Career Engine, you agree NOT to:
1. **Breach Security Controls:** Probe, scan, or test the vulnerability of the zero-trust Role-Based Access Control (RBAC) boundaries or bypass authentication mechanisms.
2. **Inject Harmful Payloads:** Transmit any viruses, Trojan horses, worms, malicious scripts, or SQL injection/XSS payloads through workspace input fields.
3. **Infringe Intellectual Property:** Decompile, reverse-engineer, copy, scrape, or create derivative products from Career Engine's proprietary algorithms or visual interfaces.
4. **Harass or Defame:** Misuse the platform to create misleading or deceptive career documentation intended to defraud third parties.

---

## 5. User Data Deletion & Workspace Rights

- **Immediate Revocation:** Clicking **"Sign Out of Workspace"** immediately purges active tokens from your current session.
- **Right to Purge:** You have the right to wipe all localized profile data and telemetry logs directly from your browser at any time.

---

## 6. Contact & Operator Identity

Career Engine is developed and maintained by **Joseph Erexson III**. For privacy concerns, access inquiries, or feedback, contact:
- **Operator:** Joseph Erexson III
- **Direct Email:** `jerexson3@gmail.com`
