# Career Engine — System Section Architectural Map

> **Version:** 2.9.0  
> **Status:** Active & Production Validated  
> **Audience:** Platform Administrator (Owner), System Operators, and AI Pair Programmers  
> **Primary Purpose:** Detailed directory of all administrative subsystems under the **System** menu, mapping their components, data sources, cloud endpoints, and extension paths.

---

## 1. Architectural Overview & Decoupling

Historically, administrative settings, telemetry logs, roadmap tracking, SEO scans, and feedback management were compressed into a single monolithic `#settings` view. In Milestone 23 (v2.9.0), this architecture was completely decoupled into **four dedicated first-class routes**, each featuring:
1. **Independent URL routing** (`#settings`, `#backlog`, `#feedback`, `#seo`).
2. **Dedicated sidebar navigation items** with active state highlighting and role badges.
3. **Subsystem Navigation Toolbar** (a persistent top pill-bar enabling instant cross-navigation without returning to the sidebar).
4. **Isolated scrolling contexts** eliminating deep, unwieldy page scrolls.
5. **Strict RBAC enforcement** (`ROLES.ADMIN` / `isOwner()`) using zero-trust client gates and server-side session authentication.

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

---

## 2. Comprehensive Subsystem Directory

### 2.1 Settings & Security Console (`#settings`)
- **Route / Anchor:** `#settings`
- **Controller Function:** `renderSettingsPage()` in `scripts/auth-engine.js`
- **RBAC Policy:** `ROLES.ADMIN` (`isOwner()` check verified via server-side session)
- **Primary Objective:** OAuth 2.0 configuration, cryptographic security diagnostics, audit ring buffers, and platform evolution CLI.

#### Components & Widgets
| Component | DOM Identifier / Selector | Description & Capabilities |
| :--- | :--- | :--- |
| **Google OAuth 2.0 Card** | `#input-google-client-id`, `#btn-save-page-client-id` | Displays active Google Client ID status (Vercel env or local override), active origin, and manual override input. |
| **Session Diagnostics Card** | Inline grid card | Displays Session Fingerprint, User Email, Verified Role (`ROLE_ADMIN`), and Idle Session Timeout duration (45 mins). |
| **Action Logs & Telemetry** | `#telemetry-logs-feed`, `#stat-total-logs`, `#stat-error-count` | Real-time 150-event ring buffer capturing `AUTH`, `NETWORK`, `ROUTER`, `RBAC`, and `SYSTEM` events with category/level filters. Auto-polls `/api/admin-auth-events` every 10 seconds. |
| **Telemetry Actions** | `#btn-telemetry-download`, `#btn-telemetry-test`, `#btn-telemetry-clear`, `#btn-telemetry-refresh` | Export logs as JSON (`career-engine-telemetry-*.json`), simulate error probe, flush local buffer, or re-hydrate server auth audit logs. |
| **Evolution Timeline** | `#tab-roadmap-history`, `.roadmap-tab-btn` | Interactive tabs displaying the complete 23-milestone engineering log, release timeline, and system evolution. |
| **Security Audit CLI & Sandbox** | `#btn-run-admin-audit`, `#stat-sec-rating` | One-click paranoid security scan verifying 5 platform integrity checks (Zero dependencies, Zero secret leaks, OIDC isolation, Ring buffer depth, Anti-scraping framework). |

#### Associated APIs & Storage Keys
- **API Endpoints:** `GET /api/auth-config`, `GET /api/admin-auth-events`
- **Storage Keys:** `careerEngine_config_google_client_id`, `careerEngine_runtime_client_id`, `careerEngine_telemetry_logs`

---

### 2.2 Engineering Backlog & AI Prompt Launcher (`#backlog`)
- **Route / Anchor:** `#backlog`
- **Controller Function:** `renderBacklogPage()` in `scripts/auth-engine.js`
- **RBAC Policy:** `ROLES.ADMIN`
- **Primary Objective:** Track prioritized engineering work orders, bridge mock data to Neon Postgres cloud backends, and generate 1-click structured prompts for AI pair programming sessions.

#### Components & Widgets
| Component | DOM Identifier / Selector | Description & Capabilities |
| :--- | :--- | :--- |
| **Backlog Header & Metrics** | `#tab-roadmap-backlog`, `.bl-filter-btn` | Summary badge showing total items, priority counts (P0, P1, P2), and filter chips (`All`, `P0 Critical`, `P1 High`, `P2 Moderate`). |
| **Backlog Work Order Cards** | `.bl-card`, `.btn-copy-bl-prompt`, `.btn-bl-status` | Card per work order displaying priority chip, affected target files, architectural impact, execution plan, and one-click prompt copy. |
| **AI Prompt Formatter** | Inline prompt generator | Formats task title, priority, target files, acceptance criteria, and zero-dependency guidelines into clean Markdown for AI agents. |
| **Add Custom Backlog Item** | `#btn-show-add-backlog`, `#form-add-backlog`, `#btn-save-new-backlog` | Expandable modal form allowing operators to add new engineering tasks with Title, Priority, Target Files, and Description. |
| **Cloud Synchronization** | `#btn-refresh-backlog`, `saveEngineeringBacklog()` | Automatically persists custom backlog tasks to Neon Postgres via `POST /api/state` (`state_key: "engineering_backlog"`). Fallbacks cleanly to local storage if offline. |

#### Pre-Configured Work Orders Available
1. **[P0] Project Showcase Cloud Persistence Migration** (`scripts/project-showcase.js`, `api/state.js`)
2. **[P1] Job Tracker Neon DB Sync & Offline Reconciliation** (`scripts/tracker-engine.js`, `api/state.js`)
3. **[P1] Resume Studio Full Cloud Snapshot & Version History** (`scripts/resume-engine.js`, `api/state.js`)
4. **[P2] Google Cloud OIDC Automated Health Probe** (`api/auth-config.js`, `scripts/auth-engine.js`)

---

### 2.3 User Feedback & Issue Intelligence Center (`#feedback`)
- **Route / Anchor:** `#feedback`
- **Controller Function:** `renderFeedbackPage()` in `scripts/auth-engine.js`
- **RBAC Policy:** `ROLES.ADMIN`
- **Primary Objective:** Live candidate report aggregation, automated AI triage prompt synthesis, and full-lifecycle issue resolution tracking (`Open` $\rightarrow$ `In Progress` $\rightarrow$ `Reported` $\rightarrow$ `Completed`).

#### Components & Widgets
| Component | DOM Identifier / Selector | Description & Capabilities |
| :--- | :--- | :--- |
| **Feedback KPI Dashboard** | `#stat-total-fb`, `#stat-open-fb`, `#stat-inprog-fb`, `#stat-reported-fb`, `#stat-resolved-fb` | Five live KPI metric cards summarizing current queue health across all lifecycle states. |
| **Filter & Action Controls** | `#feedback-filter`, `#btn-refresh-feedback` | Dropdown filtering by status (`all`, `open`, `in-progress`, `reported`, `resolved`), and manual cloud refresh button. |
| **Candidate Feedback Cards** | `#feedback-list-container`, `.btn-feedback-status` | Interactive cards rendering reporter identity, category badge (`Bug`, `Feature`, `Suggestion`), timestamp, and comments. |
| **Analyse with AI Prompt Engine** | `.btn-feedback-analyze` | Formats reported bugs into an AI troubleshooting prompt with reproduction steps, and automatically transitions status to `In Progress`. |
| **Report to Agent Engine** | `.btn-feedback-report` | Copies handoff prompt directly to clipboard and advances status to `Reported` so operators know an agent is actively engaged. |

#### Associated APIs & Data Stores
- **Public Candidate Submission:** `POST /api/feedback` (invoked via chatbot widget in bottom-right)
- **Admin Fetch & Status Management:** `GET /api/admin-feedback`, `PATCH /api/admin-feedback`
- **Database Tables:** `user_feedback` in Neon Postgres (`career_engine_prd` / `career_engine_dev`)

---

### 2.4 SEO Intelligence & AI Discoverability (`#seo`)
- **Route / Anchor:** `#seo`
- **Controller Function:** `renderSeoPage()` in `scripts/auth-engine.js`
- **RBAC Policy:** `ROLES.ADMIN`
- **Primary Objective:** Comprehensive site health telemetry, SERP snippet preview, crawler visibility verification, and on-demand SEO auditing against AI search engines (Perplexity, ChatGPT, Gemini, Google).

#### Components & Widgets
| Component | DOM Identifier / Selector | Description & Capabilities |
| :--- | :--- | :--- |
| **SEO Overview Card** | `#seo-overall-score`, `#seo-grade-badge`, `#seo-last-scan-time` | Composite site health score (A+ to F), color-coded letter badge, and last audit execution timestamp. |
| **Six-Pillar Analysis Grid** | `#seo-pillar-cards` | Visual scorecards for: Meta Tags, AI Discoverability, Performance & Assets, Content Structure, Schema Markup, and Security/OIDC. |
| **Real-Time SERP Simulator** | Google search card preview | Shows exact Google desktop & mobile snippet appearance (title truncation, breadcrumbs, meta description). |
| **Active Findings & Recommendations** | `#seo-findings-list` | Color-coded audit findings categorized by Severity (`CRITICAL`, `WARNING`, `INFO`) with exact remediation steps. |
| **AI Bot & Crawler Simulator** | `#seo-bot-simulator` | Simulates HTTP response and accessibility for Googlebot, GPTBot, ClaudeBot, and PerplexityBot. |
| **On-Demand Scanner & Exporter** | `#btn-run-seo-scan`, `#btn-copy-seo-report` | Executes dynamic on-page DOM audit, saves result to Neon DB (`state_key: "seo_scan_report"`), and copies report to clipboard. |

#### Associated APIs & Data Stores
- **State Storage:** `POST /api/state` (`state_key: "seo_scan_report"`)
- **Crawler Directives:** `robots.txt`, `sitemap.xml`, and inline `ld+json` Schema.org graphs

---

## 3. Subsystem Cross-Navigation: The Navigation Toolbar

At the top of all four System views, `renderSystemNavToolbar(activeTab)` renders a unified, accessible horizontal pill toolbar:

```html
<div class="system-nav-toolbar">
  <button class="chip active">⚙️ Settings & Security</button>
  <button class="chip">🎯 Backlog & Prompts</button>
  <button class="chip">📬 Feedback & Issues</button>
  <button class="chip">🔍 SEO & Discoverability</button>
</div>
```

- **Seamless Transitions:** Operators can switch between viewing telemetry in Settings, picking up an issue in Feedback, reviewing the work order in Backlog, or running an SEO audit without expanding sidebar folders.
- **Visual State:** The active page is highlighted in gold/active styling, while sibling tabs display distinct thematic accent colors (blue for Backlog, gold for Feedback, green for SEO).

---

## 4. Extension & Evolution Guidelines

When adding new capabilities to the System domain:
1. **Determine Subsystem Affinity:**
   - Security, Auth, Logging, or Core Infrastructure $\rightarrow$ Add to `#settings`.
   - Feature specs, AI pair-programming prompts, or DB migrations $\rightarrow$ Add to `#backlog`.
   - User bug reports, UX suggestions, or support queues $\rightarrow$ Add to `#feedback`.
   - Crawlers, performance metrics, JSON-LD, or analytics $\rightarrow$ Add to `#seo`.
2. **If creating a new 5th subsystem:**
   - Register route in `scripts/app.js` (`ROUTE_PERMISSIONS` and `PAGES`).
   - Add sidebar nav item in `index.html` under `#sidebar-system-section`.
   - Add nav pill in `renderSystemNavToolbar(activeTab)` in `scripts/auth-engine.js`.
   - Document new endpoints and schemas in this document (`docs/SYSTEM_SECTION_MAP.md`).
3. **Always Verify Pre-Commit Hygiene:**
   - Execute `npm test` (Paranoid Security & Hygiene Scanner).
   - Execute `npm audit`.
