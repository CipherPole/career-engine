/* ============================================================
   SIGNIN-ENGINE.JS — Google Sign-In Landing Screen & Gateway
   Clean, single-button Google Sign-In & Recruiter Showcase Mode.
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

  // Ensure runtime client ID is fetched from /api/auth-config
  let clientId = getGoogleClientId();
  if (!clientId) {
    clientId = await fetchAuthConfig();
  }
  const currentOrigin = window.location.origin;

  content.innerHTML = `
    <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="max-width:500px;width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:36px 28px;box-shadow:var(--shadow-lg);text-align:center;position:relative;overflow:hidden;">
        
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
          Sign in with your Google account to access your personal dashboard, track skills roadmaps, or explore as a guest recruiter.
        </p>

        <!-- Primary Google Sign-In Card -->
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 20px;margin-bottom:20px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:16px;letter-spacing:0.5px;">
            Continue with Verified Identity
          </div>
          
          <!-- Native Official Google GIS Button Target -->
          <div id="landing-google-btn-container" style="display:flex;justify-content:center;min-height:44px;align-items:center;">
            <!-- Rendered by Google Identity Services -->
          </div>

          <!-- Fallback Interactive Trigger (Only visible if GIS iframe is loading or offline) -->
          <div id="landing-custom-google-wrapper" style="display:none;margin-top:4px;">
            <button class="btn w-full" id="btn-trigger-google-auth" style="background:#ffffff;color:#1f1f1f;font-weight:600;font-size:13px;border:1px solid #dadce0;border-radius:24px;padding:11px 16px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.12);cursor:pointer;">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span style="color:#3c4043;font-weight:600;">Sign in with Google</span>
            </button>
          </div>
        </div>

        <!-- Single Guest / Recruiter Showcase Mode Action -->
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn btn-secondary w-full" id="btn-landing-showcase-mode" style="justify-content:center;padding:12px;font-size:13px;font-weight:700;gap:8px;">
            <span>🚀</span> Explore in Showcase Mode (Read-Only Demo) →
          </button>
        </div>

        <!-- Security Pill -->
        <div style="margin-top:24px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--text-dim);">
          <span>🛡️</span>
          <span>Zero-Trust RBAC & Google OIDC JWT Validated</span>
        </div>
      </div>
    </div>
  `;

  // Fallback Google button click handler (only invoked if custom button is active)
  document.getElementById('btn-trigger-google-auth')?.addEventListener('click', async () => {
    let activeClientId = getGoogleClientId();
    if (!activeClientId) {
      activeClientId = await fetchAuthConfig();
    }
    if (!activeClientId) {
      window.toast?.('Google OAuth Client ID is not configured on this host.', 'red');
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts) {
      window.toast?.('Google Identity Services is loading...', 'gold');
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
      window.google.accounts.id.prompt();
    } catch (e) {
      console.error('Google Sign-In Error:', e);
      window.toast?.('Google Sign-In Error.', 'red');
    }
  });

  // Showcase mode
  document.getElementById('btn-landing-showcase-mode')?.addEventListener('click', () => {
    sessionStorage.setItem('careerEngine_showcase_active', 'true');
    window.toast?.('Entering Showcase Mode...', 'green');
    window.navigate?.('dashboard');
  });

  // Render official Google button
  function initLandingGoogleButton() {
    const activeClientId = getGoogleClientId();
    const customWrapper = document.getElementById('landing-custom-google-wrapper');
    if (activeClientId) {
      if (customWrapper) customWrapper.style.display = 'none';
      renderGoogleSignInButton('landing-google-btn-container', () => {
        window.navigate?.('dashboard');
      });
    } else {
      if (customWrapper) customWrapper.style.display = 'block';
    }
  }

  initLandingGoogleButton();
}
