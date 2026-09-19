/* ============================================================
   SIGNIN-ENGINE.JS — Google Sign-In Landing Screen & Gateway
   Full-screen executive gateway. Google Sign-In & Showcase Mode.
   ============================================================ */

'use strict';

import { 
  getActiveSession, 
  setCurrentUser, 
  OWNER_EMAIL, 
  renderGoogleSignInButton, 
  handleGoogleCredentialResponse,
  getGoogleClientId,
  fetchAuthConfig
} from './auth-engine.js';

const CONFIG_STORAGE_KEY = 'careerEngine_google_client_id';

export async function renderSignInPage() {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Ensure runtime client ID is fetched if available from /api/auth-config
  let clientId = getGoogleClientId();
  if (!clientId) {
    clientId = await fetchAuthConfig();
  }
  const currentOrigin = window.location.origin;

  content.innerHTML = `
    <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="max-width:520px;width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:36px 28px;box-shadow:var(--shadow-lg);text-align:center;position:relative;overflow:hidden;">
        
        <!-- Gold Ambient Glow Accent -->
        <div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:240px;height:120px;background:radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(0,0,0,0) 70%);pointer-events:none;"></div>

        <!-- Brand Icon -->
        <div style="width:58px;height:58px;border-radius:var(--radius-lg);background:rgba(245, 158, 11, 0.12);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 16px;">
          ⚡
        </div>

        <div style="font-size:24px;font-weight:900;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:6px;">
          Career Engine
        </div>
        <div style="font-size:13px;color:var(--gold-light);font-weight:600;margin-bottom:14px;">
          Personal AI Career Engine & Command Center
        </div>

        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:24px;">
          Sign in to access your personal engineering dashboard, analyze your resume against $200k+ lead benchmarks, and track your skills roadmap.
        </p>

        <!-- Primary Google Sign-In Card -->
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:20px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:14px;letter-spacing:0.5px;">
            Continue with Verified Identity
          </div>
          
          <!-- Native Google GIS Button Target -->
          <div id="landing-google-btn-container" style="display:flex;justify-content:center;min-height:44px;align-items:center;">
            <!-- If GIS renders button, it appears here -->
          </div>

          <!-- Direct Interactive Google Button Trigger -->
          <div id="landing-custom-google-wrapper" style="margin-top:4px;">
            <button class="btn w-full" id="btn-trigger-google-auth" style="background:#ffffff;color:#1f1f1f;font-weight:600;font-size:13px;border:1px solid #dadce0;border-radius:24px;padding:11px 16px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.12);cursor:pointer;transition:all 0.2s ease;">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span style="color:#3c4043;font-weight:600;">Sign in with Google</span>
            </button>
          </div>

          <div style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:12px;font-size:11px;">
            <button id="btn-open-quick-oauth-setup" style="background:none;border:none;color:var(--text-dim);cursor:pointer;text-decoration:underline;padding:2px;">
              ⚙️ ${clientId ? 'Change Google Client ID' : 'Connect Google Client ID'}
            </button>
          </div>
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
        <div style="margin-top:20px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--text-dim);">
          <span>🛡️</span>
          <span>Zero-Trust RBAC & OIDC JWT Claims Enforced</span>
        </div>
      </div>
    </div>

    <!-- Quick Google OAuth Setup Modal -->
    <div id="quick-oauth-modal" class="modal-overlay">
      <div class="modal-box" style="max-width:480px;">
        <div class="modal-header">
          <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;">
            <span>🔑</span> Google Cloud OAuth Setup
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-close-quick-oauth" style="padding:2px 8px;">✕</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">
          <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin:0;">
            To enable <strong>Sign in with Google</strong> on this origin, paste your OAuth 2.0 Web Client ID from Google Cloud Console.
          </p>

          <div style="background:rgba(255,255,255,0.03);border:1px dashed var(--border);border-radius:var(--radius-md);padding:10px 12px;font-size:11px;">
            <div style="color:var(--text-dim);margin-bottom:4px;">Google Cloud Console Authorized Origin:</div>
            <code style="color:var(--gold-light);font-size:12px;">${currentOrigin}</code>
          </div>

          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">
              Google Client ID:
            </label>
            <input type="text" id="input-quick-client-id" class="input" 
              placeholder="123456789-abcdef.apps.googleusercontent.com" 
              value="${clientId}" 
              style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:11px;width:100%;" />
          </div>

          <div style="display:flex;gap:10px;">
            <button class="btn btn-gold w-full" id="btn-save-quick-client-id" style="justify-content:center;font-weight:700;">
              💾 Save & Activate Google Sign-In
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Handle Google Sign-In Click
  const handleGoogleClick = async () => {
    let activeClientId = getGoogleClientId();
    if (!activeClientId) {
      activeClientId = await fetchAuthConfig();
    }
    if (!activeClientId) {
      // Open setup modal
      const modal = document.getElementById('quick-oauth-modal');
      modal?.classList.add('open');
      document.getElementById('input-quick-client-id')?.focus();
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts) {
      window.toast?.('Google Identity Services library is loading... please wait 2 seconds.', 'gold');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: activeClientId,
        callback: (response) => {
          handleGoogleCredentialResponse(response, () => {
            window.navigate?.('dashboard');
          });
        },
        auto_select: false,
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.warn('GIS One Tap prompt not displayed:', notification.getNotDisplayedReason());
          window.toast?.('Google Sign-In prompt initialized. Click the Google button directly.', 'gold');
        } else if (notification.isSkippedMoment()) {
          console.log('GIS prompt skipped:', notification.getSkippedReason());
        }
      });
    } catch (e) {
      console.error('GIS Error:', e);
      window.toast?.('Google Sign-In Error. Please verify your Client ID.', 'red');
    }
  };

  document.getElementById('btn-trigger-google-auth')?.addEventListener('click', handleGoogleClick);

  // Quick OAuth modal triggers
  const oauthModal = document.getElementById('quick-oauth-modal');
  document.getElementById('btn-open-quick-oauth-setup')?.addEventListener('click', () => {
    oauthModal?.classList.add('open');
  });

  document.getElementById('btn-close-quick-oauth')?.addEventListener('click', () => {
    oauthModal?.classList.remove('open');
  });

  document.getElementById('btn-save-quick-client-id')?.addEventListener('click', () => {
    const val = document.getElementById('input-quick-client-id')?.value.trim();
    if (val) {
      localStorage.setItem(CONFIG_STORAGE_KEY, val);
      oauthModal?.classList.remove('open');
      window.toast?.('Client ID saved! Initializing Google Sign-In...', 'green');
      initLandingGoogleButton();
    } else {
      window.toast?.('Please paste a valid Client ID.', 'red');
    }
  });

  // Owner demo login
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
    }, 250);
  });

  // Showcase mode
  document.getElementById('btn-landing-showcase-mode')?.addEventListener('click', () => {
    sessionStorage.setItem('careerEngine_showcase_active', 'true');
    window.toast?.('Entering Showcase Mode...', 'green');
    window.navigate?.('dashboard');
  });

  // Render official Google button if client ID is ready
  function initLandingGoogleButton() {
    const activeClientId = getGoogleClientId();
    if (activeClientId) {
      renderGoogleSignInButton('landing-google-btn-container', () => {
        window.navigate?.('dashboard');
      });
      const quickBtn = document.getElementById('btn-open-quick-oauth-setup');
      if (quickBtn) quickBtn.style.display = 'none';
    }
  }

  initLandingGoogleButton();
}
