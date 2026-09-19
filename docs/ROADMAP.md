# Career Engine — Strategic Development Roadmap & Backlog

**Project:** Career Engine (Personal AI Career & Skill Intelligence Platform)  
**Maintained by:** Joseph Erexson III (`jerexson3@gmail.com`)  
**Target Repository:** `CipherPole/career-engine`  
**Current Release:** v2.6.0 (Stable & Deployed)  
**Last Updated:** September 19, 2026

---

## 1. Evolution & Release History (Completed Milestones)

| Version | Release Date | Milestone Title | Key Features & Delivered Scope | Impact Rating |
| :--- | :--- | :--- | :--- | :---: |
| **v2.6.0** | Sep 2026 | **Zero Data Leakage & Hover-to-Confirm Account Purge** | • Strict multi-tenant data isolation preventing owner profile leakage into new accounts.<br>• Verified Google email binding with readonly `[✅ Google Verified]` badge.<br>• 3-Second Hover-to-Confirm Account Deletion with animated progress fill.<br>• Neon Postgres cascading user deletion (`users` $\rightarrow$ `user_profiles`, `user_states`).<br>• Complete client-side cache wipe (`careerEngine_has_visited` & email-scoped storage).<br>• Real-time Admin Action Logs with dynamic event levels (Red = Delete, Purple = Create, Blue = Signin). | **10.0 / 10** |
| **v2.5.0** | Sep 2026 | **Two-Phase Onboarding & Client Resume Parser** | • Decoupled clean Sign-In Gate (Phase 1) from Resume Upload Screen (Phase 2).<br>• Interactive 4-step progress tracker (`Google Verified` $\rightarrow$ `Upload` $\rightarrow$ `Review` $\rightarrow$ `Create`).<br>• Client-side PDF/TXT resume parser and keyword extraction (`scripts/resume-parser.js`).<br>• Review modal with real-time skill refinement and safe profile defaults. | **9.9 / 10** |
| **v2.4.0** | Sep 2026 | **Legal Compliance & Security Baseline** | • Integrated comprehensive Terms of Service (`#terms`) & User Agreement (`#agreement`).<br>• Explicit intellectual property protection and anti-scraping policy.<br>• Consolidated single Sign-Out UX inside User Profile Modal.<br>• Automated `npm run audit` zero-vulnerability CI scanner.<br>• Zero-dependency `package.json` manifest with pre-commit hygiene enforcement. | **9.9 / 10** |
| **v2.3.0** | Sep 2026 | **Telemetry & Diagnostic Traceroute** | • 150-event circular ring buffer logging system (`scripts/auth-engine.js`).<br>• Real-time error capture, network traceroute, and category filtering (AUTH, NETWORK, ROUTER, RBAC).<br>• Diagnostics export to clipboard and JSON download.<br>• Interactive self-test error injection tool in Admin Settings. | **9.5 / 10** |
| **v2.2.0** | Sep 2026 | **Google Identity Services (GIS) & Auth Modernization** | • Google One-Tap & GIS popup integration.<br>• Auto-provisioning user accounts on first sign-in.<br>• Dynamic "Continue with Google" vs "Create Account with Google" states.<br>• Cross-platform desktop & mobile Android compatibility.<br>• Strict Origin checks and fallback guest mode. | **9.7 / 10** |
| **v2.1.0** | Sep 2026 | **RBAC & Security Architecture** | • Multi-tier Role-Based Access Control (`ROLE_ADMIN` vs `ROLE_GUEST`).<br>• Route guard interceptors protecting sensitive views (`#settings`).<br>• 30-minute idle session auto-lockdown.<br>• LocalStorage Client ID override persistence for multi-environment deployments. | **9.6 / 10** |
| **v2.0.0** | Sep 2026 | **Motion Background & Glassmorphic UI** | • Canvas-free high-performance CSS radial animation background.<br>• Mobile-responsive sign-in card layout with full-viewport height fix.<br>• Neutralized platform positioning to serve all engineers and career builders.<br>• Curated dark-mode theme tokens and micro-interactions. | **9.4 / 10** |
| **v1.0.0** | Aug 2026 | **Core Career Intelligence Platform** | • ATS Keyword scanner and match scoring algorithm.<br>• Dynamic Resume Builder with live preview.<br>• Interactive Skill Graph visualization.<br>• DevOps & Platform Engineering Interview Playbook.<br>• Compensation Modeling and career trajectory planner. | **9.8 / 10** |

---

## 2. Priority Rating Matrix for Future Work

Each future backlog item is rated using the **RICE Scoring Model** (Reach, Impact, Confidence, Effort) to determine execution priority:

```
Score = (Reach × Impact × Confidence) / Effort
```

| Priority | Feature / Initiative | Impact | Effort | Confidence | RICE Score | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **P0** | **AI Bullet Point Tailoring & ATS Live Scorer** | High (5/5) | Med (2/5) | 90% | **9.8 / 10** | **Ready for Pickup** |
| **P1** | **Client-Side Native PDF & DOCX Export Engine** | High (4.5/5) | Med (2.5/5) | 95% | **9.2 / 10** | **Ready for Pickup** |
| **P1** | **Compensation & Offer Negotiation Simulator** | High (4/5) | Low (1.5/5) | 90% | **9.0 / 10** | **Ready for Pickup** |
| **P2** | **Encrypted Cloud Sync & Multi-Device Backup** | High (4.5/5) | High (4/5) | 80% | **8.4 / 10** | **Backlog** |
| **P2** | **Automated E2E Playwright Regression Suite** | Med (3.5/5) | Med (2/5) | 95% | **8.1 / 10** | **Backlog** |
| **P3** | **Offline PWA Service Worker & App Manifest** | Med (3/5) | Low (1/5) | 90% | **7.8 / 10** | **Backlog** |

---

## 3. Detailed Specifications for Next Tasks

### 3.1 [P0] AI Bullet Point Tailoring & ATS Live Scorer
- **User Story:** As a job seeker, I want to paste a target job description and have Career Engine analyze my existing resume bullets, highlight missing high-frequency keywords, and suggest tailored bullet points using strong action verbs and quantified metrics (STAR format).
- **Technical Approach:**
  - Leverage Web Workers to calculate TF-IDF and N-gram keyword density against the job description without UI freezing.
  - Provide an optional BYOK (Bring Your Own Key) for OpenAI / Gemini API, with 100% client-side key storage in `localStorage`.
  - Display a real-time match gauge (0–100%) and missing skill badges.
- **Estimated Effort:** 4–6 hours.

### 3.2 [P1] Client-Side Native PDF & DOCX Export Engine
- **User Story:** As a candidate, I want to export my formatted resume directly to a professional, ATS-friendly PDF with customizable margins and typography, without relying on browser print dialogs.
- **Technical Approach:**
  - Integrate a zero-dependency pure JavaScript PDF generator (or lightweight standalone micro-library).
  - Include presets for: Classic Executive, Modern Tech, and Compact ATS Standard.
  - Implement 1-click download with sanitized filenames: `[Name]_[Role]_Resume_[Year].pdf`.
- **Estimated Effort:** 3–4 hours.

### 3.3 [P1] Compensation & Offer Negotiation Simulator
- **User Story:** As an engineer evaluating offers, I want to model complex compensation packages (Base Salary, Signing Bonus, Performance Bonus, Equity/RSU vesting cliffs, 401(k) match, and State Tax adjustments).
- **Technical Approach:**
  - Build dynamic SVG/Canvas equity appreciation curves (Bear, Base, Bull scenarios).
  - Add annualized total cash vs total equity breakdown.
  - Save comparisons side-by-side in `scripts/store.js`.
- **Estimated Effort:** 2–3 hours.

---

## 4. Instructions for Resuming Agents & Pair Programmers

When starting a new session on this repository:
1. Review `docs/SESSION_CHANGELOG.md` and `docs/ROADMAP.md` to see the latest status.
2. Check the Admin System Settings (`#settings`) in your browser to inspect recent telemetry and verify that OAuth and RBAC are functioning properly.
3. Pick up the highest uncompleted item (**P0: AI Bullet Point Tailoring & ATS Live Scorer**).
4. Run `npm run audit` before committing any code to guarantee the zero-vulnerability standard is preserved.
