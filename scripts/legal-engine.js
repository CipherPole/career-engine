/* ============================================================
   LEGAL-ENGINE.JS — Terms of Service, User Agreement & IP Protection
   Enterprise compliance, copyright notice, fair use & privacy standards.
   ============================================================ */

'use strict';

import { getActiveSession } from './auth-engine.js?v=7';
import { logEvent, LOG_LEVELS, LOG_CATEGORIES } from './telemetry-engine.js?v=7';

export function renderLegalPage(activeTab = 'terms') {
  const content = document.getElementById('page-content');
  if (!content) return;

  logEvent(LOG_LEVELS.INFO, LOG_CATEGORIES.ROUTER, `VIEW_LEGAL_PAGE [tab=${activeTab}]`);

  const session = getActiveSession();
  const isLoggedIn = session && session.isLoggedIn;
  const backTarget = isLoggedIn ? 'dashboard' : 'signin';
  const backLabel = isLoggedIn ? '← Back to Dashboard' : '← Back to Sign In';

  content.innerHTML = `
    <div style="max-width:860px;margin:0 auto;padding:12px 16px 48px;">
      
      <!-- Top Navigation & Return Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <button class="btn btn-secondary btn-sm" id="btn-legal-back" style="font-size:12px;padding:7px 16px;border-radius:20px;font-weight:600;display:flex;align-items:center;gap:6px;">
          <span>${backLabel}</span>
        </button>

        <!-- Tab Switcher -->
        <div style="display:flex;background:var(--bg-card);border:1px solid var(--border);border-radius:24px;padding:3px;">
          <button class="btn btn-sm ${activeTab === 'terms' ? 'btn-gold' : 'btn-ghost'}" id="tab-btn-terms" style="border-radius:20px;font-size:11px;padding:5px 14px;font-weight:700;">
            📜 Terms of Service
          </button>
          <button class="btn btn-sm ${activeTab === 'agreement' ? 'btn-gold' : 'btn-ghost'}" id="tab-btn-agreement" style="border-radius:20px;font-size:11px;padding:5px 14px;font-weight:700;">
            🛡️ User Agreement & Privacy
          </button>
        </div>
      </div>

      <!-- Legal Document Container -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:36px 32px;box-shadow:0 20px 40px rgba(0,0,0,0.5);line-height:1.7;">
        
        <div id="legal-content-area">
          ${activeTab === 'terms' ? getTermsHtml() : getAgreementHtml()}
        </div>

        <!-- Bottom Return Action -->
        <div style="margin-top:36px;padding-top:20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div style="font-size:11px;color:var(--text-dim);">
            © ${new Date().getFullYear()} Career Engine. All Rights Reserved. Operator: Joseph Erexson III.
          </div>
          <button class="btn btn-gold btn-sm" id="btn-legal-bottom-back" style="font-size:12px;padding:8px 18px;border-radius:20px;font-weight:700;">
            ${backLabel}
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind return buttons
  const returnHandler = () => {
    window.navigate?.(backTarget);
  };
  document.getElementById('btn-legal-back')?.addEventListener('click', returnHandler);
  document.getElementById('btn-legal-bottom-back')?.addEventListener('click', returnHandler);

  // Bind tab switchers
  document.getElementById('tab-btn-terms')?.addEventListener('click', () => {
    renderLegalPage('terms');
  });
  document.getElementById('tab-btn-agreement')?.addEventListener('click', () => {
    renderLegalPage('agreement');
  });
}

function getTermsHtml() {
  return `
    <div style="margin-bottom:24px;">
      <span class="chip gold" style="font-size:11px;margin-bottom:10px;display:inline-block;">Official Legal Agreement</span>
      <h1 style="font-size:26px;font-weight:900;color:var(--text-primary);letter-spacing:-0.5px;margin-top:4px;margin-bottom:8px;">
        Terms of Service & Platform Usage Agreement
      </h1>
      <div style="font-size:12px;color:var(--text-dim);">Effective Date: September 19, 2026 • Version 2.4</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px;font-size:13px;color:var(--text-secondary);">
      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">1. Acceptance of Terms</h2>
        <p>
          By accessing, browsing, or signing into <strong>Career Engine</strong> (the "Platform" or "Service"), you agree to be legally bound by these Terms of Service ("Terms") and all applicable federal, state, and international laws. If you do not agree with any part of these Terms, you may not access or use the platform.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">2. Nature & Purpose of the Platform</h2>
        <p>
          Career Engine is an artificial intelligence-augmented career intelligence and technical skill benchmarking platform. The platform provides tools for ATS resume keyword gap analysis, interactive multi-dimensional skills radar mapping, training roadmaps, and career telemetry to empower individuals to master their technical capabilities and navigate engineering careers.
        </p>
      </section>

      <section style="background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.18);border-radius:var(--radius-md);padding:16px;">
        <h2 style="font-size:16px;font-weight:700;color:var(--gold-light);margin-bottom:6px;">
          3. Copyright, Intellectual Property & Proprietary Rights
        </h2>
        <p style="color:var(--text-primary);margin-bottom:10px;">
          <strong>Exclusive Ownership:</strong> All proprietary code, software architectures, algorithms, heuristics, user interface designs, radar visualization models, design tokens, visual motions, trademarks, and documentation embodied within Career Engine are the exclusive intellectual property of <strong>Career Engine and Joseph Erexson III</strong> ("Owner"). All rights reserved.
        </p>
        <p style="margin-bottom:8px;">
          <strong>Prohibition on Scraping & Reverse Engineering:</strong> You are strictly prohibited from copying, scraping, crawling, decompiling, disassembling, reverse-engineering, republishing, licensing, or creating derivative works based on the platform's proprietary codebase, algorithmic ranking formulas, or visual interfaces without prior express written consent.
        </p>
        <p>
          <strong>User Content Ownership:</strong> You retain 100% full copyright, title, and ownership in and to any personal resume text, employment records, or portfolio descriptions you upload or input into your isolated workspace. Career Engine claims zero ownership over your personal data.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">4. User Workspace & Fair Use License</h2>
        <p>
          Subject to compliance with these Terms, authenticated users are granted a limited, personal, revocable, non-exclusive, and non-transferable license to use Career Engine strictly for non-commercial career enhancement and skill self-evaluation. Automated bot access, commercial resale of generated career insights, or attempts to disrupt system infrastructure will result in immediate termination of access.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">5. Zero-Trust Access & Account Responsibility</h2>
        <p>
          Authentication is governed by Google OpenID Connect (OIDC) cryptographic JSON Web Tokens (JWT). You are solely responsible for maintaining the security of your Google account credentials. You agree to immediately notify the administrator of any unauthorized session usage or security compromise.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">6. Disclaimer of Warranties & Limitation of Liability</h2>
        <p>
          Career Engine and all analysis tools are provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, either express or implied. While the platform utilizes advanced industry heuristics for ATS gap calculation, Career Engine makes no representations or guarantees regarding job offers, compensation levels, or hiring outcomes. In no event shall Career Engine or its creators be liable for any indirect, consequential, or punitive damages arising from the use of this service.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">7. Contact & Notices</h2>
        <p>
          For legal inquiries, copyright notices (DMCA), or permission requests, please contact the Platform Operator directly at:
          <br /><strong style="color:var(--gold-light);">Joseph Erexson III</strong> — <code style="color:var(--text-primary);">jerexson3@gmail.com</code>
        </p>
      </section>
    </div>
  `;
}

function getAgreementHtml() {
  return `
    <div style="margin-bottom:24px;">
      <span class="chip green" style="font-size:11px;margin-bottom:10px;display:inline-block;">Privacy & User Agreement</span>
      <h1 style="font-size:26px;font-weight:900;color:var(--text-primary);letter-spacing:-0.5px;margin-top:4px;margin-bottom:8px;">
        User Agreement & Zero-Trust Privacy Policy
      </h1>
      <div style="font-size:12px;color:var(--text-dim);">Effective Date: September 19, 2026 • Strict Zero-Trust Standard</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px;font-size:13px;color:var(--text-secondary);">
      <section style="background:rgba(52,211,153,0.04);border:1px solid rgba(52,211,153,0.2);border-radius:var(--radius-md);padding:16px;">
        <h2 style="font-size:16px;font-weight:700;color:var(--green);margin-bottom:6px;">
          1. Our Ironclad Zero-Trust Privacy Pledge
        </h2>
        <p style="color:var(--text-primary);margin-bottom:8px;">
          <strong>We NEVER sell, monetize, rent, or trade your personal data:</strong> Career Engine operates with a strict zero-data-brokering policy. Your resumes, job application records, compensation targets, and skill scores will never be shared with advertisers, headhunters, data brokers, or external recruiters.
        </p>
        <p>
          <strong>No Third-Party Tracking Cookies:</strong> Career Engine uses zero third-party advertising cookies or cross-site tracking pixels. Authentication is powered directly by Google's native OIDC identity standard.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">2. What Information We Process</h2>
        <ul style="padding-left:20px;display:flex;flex-direction:column;gap:6px;">
          <li><strong>Identity Information:</strong> When signing in with Google, we receive cryptographic identity claims: your display name, email address, and avatar image.</li>
          <li><strong>Workspace Profile:</strong> Career history, skills, ATS match queries, and target compensation stored locally in your browser's private storage.</li>
          <li><strong>System Telemetry & Error Diagnostics:</strong> In-memory and local ring-buffer diagnostic logs (e.g. network latency, auth status, uncaught exceptions) used strictly for platform debugging and trace routing.</li>
        </ul>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">3. Client-Side Encryption & Storage Isolation</h2>
        <p>
          Your workspace data is client-isolated in your browser's encrypted storage keys. Every session is protected by cryptographic environment fingerprinting ($\text{sub} \mid \text{iat} \mid \text{device}$). An automated 30-minute idle lock prevents unauthorized local physical access.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">4. Acceptable Use Standards</h2>
        <p style="margin-bottom:8px;">As a condition of using the platform, you agree NOT to:</p>
        <ul style="padding-left:20px;display:flex;flex-direction:column;gap:6px;">
          <li>Attempt to exploit, probe, or breach the zero-trust Role-Based Access Control (RBAC) security boundaries.</li>
          <li>Inject malicious code, cross-site scripting (XSS), SQL injections, or automated exploit payloads into workspace fields.</li>
          <li>Impersonate another user, administrator, or organization.</li>
          <li>Scrape, duplicate, or mirror the Career Engine software or user interfaces.</li>
        </ul>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">5. User Data Deletion & Export</h2>
        <p>
          You have the absolute right to purge your workspace data at any time. Clicking "Sign Out" revokes your session token immediately. You can clear your localized workspace and telemetry buffer directly from the browser storage settings or Admin Console.
        </p>
      </section>

      <section>
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">6. Inquiries & Governance</h2>
        <p>
          Career Engine is maintained and operated by <strong>Joseph Erexson III</strong>. For privacy questions, access requests, or policy feedback, please contact:
          <br /><strong style="color:var(--gold-light);">Joseph Erexson III</strong> — <code style="color:var(--text-primary);">jerexson3@gmail.com</code>
        </p>
      </section>
    </div>
  `;
}
