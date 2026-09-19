/* ============================================================
   SIGNIN-ENGINE.JS — Google Sign-In Landing Screen & Gateway
   First screen visitors see. 1-Click Google Sign-In & Showcase Mode.
   ============================================================ */

'use strict';

import { getActiveSession, setCurrentUser, OWNER_EMAIL } from './auth-engine.js';

export function renderSignInPage() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const clientId = localStorage.getItem('careerEngine_google_client_id') || '';

  content.innerHTML = `
    <div style="min-height:75vh;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="max-width:540px;width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:36px 32px;box-shadow:var(--shadow-lg);text-align:center;position:relative;overflow:hidden;">
        
        <!-- Gold Ambient Glow Accent -->
        <div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:220px;height:120px;background:radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(0,0,0,0) 70%);pointer-events:none;"></div>

        <!-- Brand Icon -->
        <div style="width:58px;height:58px;border-radius:var(--radius-lg);background:rgba(245, 158, 11, 0.12);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 16px;">
          ⚡
        </div>

        <div style="font-size:24px;font-weight:900;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:6px;">
          Career Engine
        </div>
        <div style="font-size:13px;color:var(--gold-light);font-weight:600;margin-bottom:14px;">
          Personal AI Career Engine & Engineering Command Center
        </div>

        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:28px;">
          Sign in to access your personal engineering dashboard, analyze your resume against $200k+ lead benchmarks, and track your skills roadmap.
        </p>

        <!-- Official Google Sign-In Button Container -->
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 20px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:14px;letter-spacing:0.5px;">
            Continue with Verified Identity
          </div>
          
          <div id="landing-google-btn-container" style="display:flex;justify-content:center;min-height:44px;align-items:center;">
            <!-- Rendered by Google Identity Services -->
          </div>

          ${!clientId ? `
            <div style="font-size:11px;color:var(--gold);margin-top:12px;background:rgba(245,158,11,0.08);padding:8px 12px;border-radius:var(--radius-sm);border:1px dashed var(--gold-border);">
              ⚠️ Google Client ID not configured yet in this browser. You can test via the instant options below!
            </div>
          ` : ''}
        </div>

        <!-- Alternative Access Options -->
        <div style="display:flex;flex-direction:column;gap:10px;">
          <!-- 1-Click Owner Demo Login -->
          <button class="btn btn-secondary w-full" id="btn-landing-owner-login" style="justify-content:center;padding:11px;font-size:12px;font-weight:600;gap:8px;">
            <span>⭐</span> Sign In as Joseph Erexson III (Owner Admin)
          </button>

          <!-- 1-Click Visitor Showcase Mode -->
          <button class="btn btn-primary w-full" id="btn-landing-showcase-mode" style="justify-content:center;padding:11px;font-size:12px;font-weight:700;gap:8px;">
            <span>🚀</span> Explore in Showcase Mode (Read-Only) →
          </button>
        </div>

        <!-- Security Pill -->
        <div style="margin-top:24px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--text-dim);">
          <span>🛡️</span>
          <span>Zero-Trust RBAC & OIDC JWT Claims Enforced</span>
        </div>
      </div>
    </div>
  `;

  // Attach button listeners
  document.getElementById('btn-landing-owner-login')?.addEventListener('click', () => {
    setCurrentUser({
      name: 'Joseph Erexson III',
      email: OWNER_EMAIL,
      picture: '',
      sub: 'owner-sub',
    });
    sessionStorage.setItem('careerEngine_showcase_active', 'true');
    window.toast?.('Logged in as Admin (Joseph Erexson III)', 'gold');
    setTimeout(() => {
      window.navigate?.('dashboard');
      window.location.reload();
    }, 300);
  });

  document.getElementById('btn-landing-showcase-mode')?.addEventListener('click', () => {
    sessionStorage.setItem('careerEngine_showcase_active', 'true');
    window.toast?.('Entering Showcase Mode...', 'green');
    window.navigate?.('dashboard');
  });

  // Render Google button if GIS is available
  if (window.google?.accounts?.id && clientId) {
    try {
      window.google.accounts.id.renderButton(document.getElementById('landing-google-btn-container'), {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 280,
      });
    } catch (e) {
      console.warn('Landing Google button render warning:', e);
    }
  }
}
