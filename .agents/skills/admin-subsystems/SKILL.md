---
name: admin-subsystems
description: >-
  Runbook and operations guide for the 4 Career Engine System subsystems: Settings & Security (#settings), Engineering Backlog (#backlog), Feedback & Issues (#feedback), and SEO Intelligence (#seo).
  Use when maintaining or modifying administrative consoles, telemetry ring buffers, crawler checks, or adding new administrative tools.
---

# Career Engine Admin Subsystems Operations Guide

Use this skill when modifying, maintaining, or adding administrative views and tools under the **System** menu.

## 1. The 4 Subsystems Overview

```
                      ┌──────────────────────────────────────────────┐
                      │            System Domain (Admin)             │
                      └──────────────────────┬───────────────────────┘
                                             │
             ┌───────────────────┬───────────┴───────────┬───────────────────┐
             ▼                   ▼                       ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐     ┌─────────────────┐ ┌─────────────────┐
    │   #settings     │ │    #backlog     │     │    #feedback    │ │      #seo       │
    │ Settings &      │ │ Backlog &       │     │ Feedback &      │ │ SEO &           │
    │ Security        │ │ AI Prompts      │     │ Issue Center    │ │ Discoverability │
    └─────────────────┘ └─────────────────┘     └─────────────────┘ └─────────────────┘
```

All 4 controllers reside in `scripts/auth-engine.js` and are protected by `ROLES.ADMIN` / `isOwner()`.

---

## 2. Subsystem Details & Key Functions

### 2.1 Settings & Security Console (`#settings`)
- **Controller:** `renderSettingsPage()`
- **Responsibilities:**
  - Dynamic Google Client ID display and override.
  - Session diagnostics (OIDC token claims, user email, idle timeout).
  - 150-event telemetry ring buffer (`log()`, `logSecurity()`, `logError()`).
  - Server auth audit logs (`/api/admin-auth-events`), polling every 10 seconds.
  - Interactive live security audit CLI (`Zero Runtime Dependencies`, `Zero Secret Leaks`, etc.).

### 2.2 Engineering Backlog & Prompt Launcher (`#backlog`)
- **Controller:** `renderBacklogPage()`
- **Responsibilities:**
  - Displays Part 2 engineering tasks and user-added custom tasks.
  - Priority filter chips (`All`, `P0 Critical`, `P1 High`, `P2 Moderate`).
  - "📋 Copy Agent Work Prompt" button formatting rich Markdown prompts for AI pair programming.
  - "🚀 Dispatch to Issue Tracker" automatically generating tickets in `#feedback`.
  - Neon Postgres state sync via `GET /api/state?key=engineering_backlog` and `PUT /api/state?key=engineering_backlog`.

### 2.3 Feedback & Issue Intelligence Center (`#feedback`)
- **Controller:** `renderFeedbackPage()`
- **Responsibilities:**
  - Live KPI metric counters: Total, Open, In Progress, Reported, Completed.
  - Real-time candidate bug reports from `feedback` table via `GET /api/admin-feedback`.
  - "⚡ Analyse with AI" button: transitions ticket to `in_progress`.
  - "📋 Copy Prompt (Mark Reported)" button: copies prompt and transitions ticket to `reported`.
  - "✅ Mark as Completed" button: archives ticket.

### 2.4 SEO Intelligence & AI Discoverability (`#seo`)
- **Controller:** `renderSeoPage()`
- **Responsibilities:**
  - 6-pillar score calculation (Meta, AI Discoverability, Performance, Content Quality, Structured Data, Overall).
  - On-demand DOM probes and HEAD probes to `/robots.txt`, `/sitemap.xml`, `/llms.txt`.
  - SERP Google simulator (desktop & mobile).
  - Cloud state persistence in Neon DB via `PUT /api/state?key=seo_scan`.

---

## 3. Subsystem Navigation Toolbar (`renderSystemNavToolbar`)

Every administrative page must render the top pill toolbar:
```javascript
${renderSystemNavToolbar('active_tab_id')}
```
Tabs: `'settings'`, `'backlog'`, `'feedback'`, `'seo'`.

---

## 4. How to Add a New 5th Subsystem

If platform growth requires adding a new administrative tool (e.g. `#analytics`):
1. **Router:** Add `'analytics': ROLES.ADMIN` to `ROUTE_PERMISSIONS` and `'analytics': () => import('./auth-engine.js?v=X').then(m => m.renderAnalyticsPage())` to `PAGES` in `scripts/app.js`.
2. **Sidebar:** Add `<div class="nav-item" data-page="analytics">` under `#sidebar-system-section` in `index.html`.
3. **Controller:** Export `renderAnalyticsPage()` in `scripts/auth-engine.js` with `renderSystemNavToolbar('analytics')` and attach to `window`.
4. **Toolbar:** Add `<button class="chip ${activeTab === 'analytics' ? 'active' : ''}" onclick="window.navigate?.('analytics')">` inside `renderSystemNavToolbar`.
5. **Documentation:** Document the new subsystem in `docs/SYSTEM_SECTION_MAP.md`.
