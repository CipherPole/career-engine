/* ============================================================
   AUTH-ENGINE.JS — Google Identity Services & Multi-User Manager
   Zero-backend Google OAuth, Owner Mode & Isolated Workspaces.
   ============================================================ */

'use strict';

const OWNER_EMAIL = 'jerexson3@gmail.com';
const AUTH_STORAGE_KEY = 'careerEngine_auth_user';
const CONFIG_STORAGE_KEY = 'careerEngine_google_client_id';

// Default / fallback Client ID (users can override via settings modal)
let GOOGLE_CLIENT_ID = localStorage.getItem(CONFIG_STORAGE_KEY) || '';

// ── Get Current Session ───────────────────────────────────────
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading auth user:', e);
  }
  // Default to Joseph's Owner profile for showcase
  return {
    name: 'Joseph Erexson III',
    email: OWNER_EMAIL,
    picture: '',
    role: 'owner', // 'owner' | 'visitor' | 'guest'
    isLoggedIn: false,
  };
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed saving auth user:', e);
  }
}

export function isOwner() {
  const user = getCurrentUser();
  return user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() || user.role === 'owner';
}

// ── Google JWT Decoder ────────────────────────────────────────
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed decoding JWT token:', e);
    return null;
  }
}

// ── Google Identity Services Initialization ───────────────────
export function initGoogleAuth(onAuthSuccess) {
  if (typeof window.google === 'undefined' || !window.google.accounts) {
    // Retry in 500ms if script is still loading
    setTimeout(() => initGoogleAuth(onAuthSuccess), 500);
    return;
  }

  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.info('Google Client ID not yet configured. Simulated & Guest login available.');
    renderAuthPill();
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleGoogleCredentialResponse(response, onAuthSuccess),
      auto_select: false,
    });

    // Render official Google button if target container exists
    const btnContainer = document.getElementById('google-btn-container');
    if (btnContainer) {
      window.google.accounts.id.renderButton(btnContainer, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
      });
    }

    renderAuthPill();
  } catch (e) {
    console.warn('Google Auth initialization warning:', e);
  }
}

// ── Handle Google Credential Callback ─────────────────────────
function handleGoogleCredentialResponse(response, onAuthSuccess) {
  const payload = decodeJwt(response.credential);
  if (!payload) return;

  const isUserOwner = payload.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  const user = {
    name: payload.name || payload.given_name || 'Career Explorer',
    email: payload.email,
    picture: payload.picture || '',
    role: isUserOwner ? 'owner' : 'visitor',
    isLoggedIn: true,
  };

  setCurrentUser(user);
  window.toast?.(`Welcome, ${user.name}! ${isUserOwner ? 'Loaded Owner Dashboard.' : 'Personal workspace ready.'}`, 'green');

  if (onAuthSuccess) {
    onAuthSuccess(user);
  } else {
    window.location.reload();
  }
}

// ── Render Top Bar Auth Pill ──────────────────────────────────
export function renderAuthPill() {
  const container = document.getElementById('user-auth-pill');
  if (!container) return;

  const user = getCurrentUser();
  const owner = isOwner();

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:24px;padding:4px 12px 4px 6px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${owner ? 'var(--gold)' : '#3b82f6'};color:#000;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${user.picture ? `<img src="${user.picture}" style="width:100%;height:100%;object-fit:cover;" />` : (user.name ? user.name[0].toUpperCase() : '👤')}
        </div>
        <div style="line-height:1.2;">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">${user.name}</div>
          <div style="font-size:10px;color:var(--text-dim);">${owner ? '⭐ Owner Mode' : '👤 Personal Workspace'}</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-open-auth-modal" style="font-size:10px;padding:3px 8px;margin-left:4px;">
          ${user.isLoggedIn ? 'Account' : 'Sign In'}
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-open-auth-modal')?.addEventListener('click', openAuthModal);
}

// ── Auth & Mode Switcher Modal ────────────────────────────────
export function openAuthModal() {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const user = getCurrentUser();
  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || '';

  modal.innerHTML = `
    <div class="modal-box" style="max-width:540px;">
      <div class="modal-header">
        <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
          <span>⚡</span> Account & Workspace Mode
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-close-auth-modal" style="padding:4px 10px;">✕</button>
      </div>

      <div class="modal-body" style="display:flex;flex-direction:column;gap:18px;">
        <!-- Current Active User -->
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--gold);color:#000;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;">
              ${user.picture ? `<img src="${user.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : (user.name ? user.name[0] : '👤')}
            </div>
            <div>
              <div style="font-weight:700;font-size:14px;">${user.name}</div>
              <div style="font-size:11px;color:var(--text-dim);">${user.email}</div>
              <div style="margin-top:4px;">
                <span class="chip ${isOwner() ? 'gold' : 'blue'}" style="font-size:10px;">
                  ${isOwner() ? '⭐ Joseph Erexson (Owner)' : '👤 Visitor Workspace'}
                </span>
              </div>
            </div>
          </div>
          ${user.isLoggedIn ? `
            <button class="btn btn-secondary btn-sm" id="btn-sign-out" style="font-size:11px;">
              Sign Out
            </button>
          ` : ''}
        </div>

        <!-- Google Sign-In Container -->
        <div style="border:1px dashed var(--border);border-radius:var(--radius-md);padding:16px;text-align:center;">
          <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Official Google Sign-In</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:12px;">
            Sign in with Google to isolate your personal resume, skills radar, and job tracking.
          </div>
          <div id="google-btn-container" style="display:flex;justify-content:center;"></div>
          ${!clientId ? `
            <div style="font-size:11px;color:var(--gold);margin-top:8px;">
              ⚠️ Google Client ID not set yet. You can set it below, or test via 1-click modes!
            </div>
          ` : ''}
        </div>

        <!-- 1-Click Fast Profile Switcher -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;">
            Switch Workspace Mode:
          </div>

          <button class="btn btn-secondary w-full" id="btn-switch-owner" style="justify-content:flex-start;padding:12px;gap:12px;">
            <span style="font-size:20px;">⭐</span>
            <div style="text-align:left;">
              <div style="font-weight:700;font-size:13px;color:var(--gold-light);">Joseph Erexson III (Owner Profile)</div>
              <div style="font-size:11px;color:var(--text-dim);">Load Joseph's pre-configured DevOps & Platform Lead data.</div>
            </div>
          </button>

          <button class="btn btn-primary w-full" id="btn-switch-visitor" style="justify-content:flex-start;padding:12px;gap:12px;">
            <span style="font-size:20px;">🚀</span>
            <div style="text-align:left;">
              <div style="font-weight:700;font-size:13px;">Create Fresh Workspace (Visitor Onboarding)</div>
              <div style="font-size:11px;color:#cbd5e1;">Upload your own resume, customize skills, and target your compensation.</div>
            </div>
          </button>
        </div>

        <!-- Google OAuth Client ID Configuration -->
        <div style="border-top:1px solid var(--border);padding-top:14px;">
          <details style="font-size:11px;color:var(--text-dim);cursor:pointer;">
            <summary style="font-weight:600;color:var(--text-secondary);">⚙️ Google OAuth Client ID Settings</summary>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
              <div style="font-size:11px;">Paste your Google Cloud OAuth 2.0 Web Client ID:</div>
              <div style="display:flex;gap:6px;">
                <input type="text" id="input-google-client-id" class="input" placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com" value="${clientId}" style="font-size:11px;flex:1;" />
                <button class="btn btn-secondary btn-sm" id="btn-save-client-id">Save</button>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" id="btn-close-auth-action">Close</button>
      </div>
    </div>
  `;

  // Attach modal listeners
  document.getElementById('btn-close-auth-modal').onclick = () => modal.classList.remove('open');
  document.getElementById('btn-close-auth-action').onclick = () => modal.classList.remove('open');

  // Switch to Owner
  document.getElementById('btn-switch-owner').onclick = () => {
    setCurrentUser({
      name: 'Joseph Erexson III',
      email: OWNER_EMAIL,
      picture: '',
      role: 'owner',
      isLoggedIn: true,
    });
    modal.classList.remove('open');
    window.toast?.('Loaded Joseph Erexson III Executive Profile!', 'gold');
    setTimeout(() => window.location.reload(), 400);
  };

  // Switch to Visitor
  document.getElementById('btn-switch-visitor').onclick = () => {
    modal.classList.remove('open');
    import('./onboarding-wizard.js').then(m => m.openOnboardingWizard());
  };

  // Sign out
  document.getElementById('btn-sign-out')?.addEventListener('click', () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.toast?.('Signed out. Switched to Showcase Mode.', 'gold');
    setTimeout(() => window.location.reload(), 400);
  });

  // Save Client ID
  document.getElementById('btn-save-client-id')?.addEventListener('click', () => {
    const val = document.getElementById('input-google-client-id')?.value.trim();
    if (val) {
      localStorage.setItem(CONFIG_STORAGE_KEY, val);
      GOOGLE_CLIENT_ID = val;
      window.toast?.('Google Client ID saved! Re-initializing auth...', 'green');
      setTimeout(() => window.location.reload(), 500);
    }
  });

  // Render Google button inside modal if GIS is ready
  if (window.google?.accounts?.id && clientId) {
    try {
      window.google.accounts.id.renderButton(document.getElementById('google-btn-container'), {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      });
    } catch (e) {
      console.warn('GIS render error:', e);
    }
  }

  modal.classList.add('open');
}

// ── Dedicated Settings & Google Auth Page ─────────────────────
export function renderSettingsPage() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const user = getCurrentUser();
  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || '';
  const currentOrigin = window.location.origin;

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title" style="display:flex;align-items:center;gap:10px;">
        <span>⚙️</span> System Settings & Google Authentication
      </div>
      <div class="page-subtitle">Configure Google OAuth, manage active user session, and switch workspace modes.</div>
    </div>

    <!-- Main Settings Grid -->
    <div class="grid-2" style="gap:24px;margin-bottom:32px;">
      <!-- Google OAuth Card -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
              <span>🔑</span> Google OAuth 2.0 Client ID
            </div>
            <span class="chip ${clientId ? 'green' : 'gold'}" style="font-size:11px;">
              ${clientId ? '✓ Configured & Active' : '⚠️ Not Configured'}
            </span>
          </div>

          <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px;">
            Paste your Google Cloud OAuth Client ID below. This enables official <strong>Sign in with Google</strong> for your site at <code style="color:var(--gold-light);">${currentOrigin}</code>.
          </p>

          <div style="margin-bottom:14px;">
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">
              Google Client ID:
            </label>
            <input type="text" id="page-google-client-id" class="input" 
              placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com" 
              value="${clientId}" 
              style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:12px;width:100%;" />
          </div>

          <div style="background:rgba(255,255,255,0.03);border:1px dashed var(--border);border-radius:var(--radius-md);padding:12px;font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px;">
            <strong style="color:var(--text-primary);">Google Cloud Console Checklist:</strong>
            <ul style="padding-left:18px;margin-top:4px;display:flex;flex-direction:column;gap:3px;">
              <li>Authorized JavaScript origin: <code style="color:var(--gold-light);">${currentOrigin}</code></li>
              <li>Authorized redirect URI: <code style="color:var(--gold-light);">${currentOrigin}</code></li>
            </ul>
          </div>
        </div>

        <div>
          <button class="btn btn-gold w-full" id="btn-save-page-client-id" style="justify-content:center;padding:12px;font-weight:700;">
            💾 Save Client ID & Activate Google Sign-In
          </button>
        </div>
      </div>

      <!-- User Account & Mode Switcher -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
              <span>👤</span> Active Workspace Session
            </div>
            <span class="chip ${isOwner() ? 'gold' : 'blue'}" style="font-size:11px;">
              ${isOwner() ? '⭐ Owner Mode' : '👤 Personal Workspace'}
            </span>
          </div>

          <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--gold);color:#000;font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center;">
              ${user.picture ? `<img src="${user.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : (user.name ? user.name[0] : '👤')}
            </div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:14px;color:var(--text-primary);">${user.name}</div>
              <div style="font-size:12px;color:var(--text-dim);">${user.email}</div>
            </div>
          </div>

          <div style="font-size:12px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">
            Switch Workspace Experience:
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            <button class="btn btn-secondary w-full" id="btn-page-switch-owner" style="justify-content:flex-start;padding:10px 14px;gap:10px;">
              <span>⭐</span>
              <div style="text-align:left;">
                <div style="font-weight:700;font-size:12px;color:var(--gold-light);">Joseph Erexson III (Owner Profile)</div>
                <div style="font-size:10px;color:var(--text-dim);">Load Joseph's pre-configured DevOps & Platform Lead data.</div>
              </div>
            </button>

            <button class="btn btn-secondary w-full" id="btn-page-switch-visitor" style="justify-content:flex-start;padding:10px 14px;gap:10px;">
              <span>🚀</span>
              <div style="text-align:left;">
                <div style="font-weight:700;font-size:12px;color:var(--text-primary);">Fresh Workspace (Visitor Onboarding)</div>
                <div style="font-size:10px;color:var(--text-dim);">Upload a different resume, set custom targets, and test as a visitor.</div>
              </div>
            </button>
          </div>
        </div>

        <div style="display:flex;gap:10px;">
          <div id="page-google-btn-container" style="flex:1;"></div>
          ${user.isLoggedIn ? `
            <button class="btn btn-secondary btn-sm" id="btn-page-sign-out" style="font-size:11px;">
              Sign Out
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Attach Save Client ID
  document.getElementById('btn-save-page-client-id')?.addEventListener('click', () => {
    const val = document.getElementById('page-google-client-id')?.value.trim();
    if (val) {
      localStorage.setItem(CONFIG_STORAGE_KEY, val);
      GOOGLE_CLIENT_ID = val;
      window.toast?.('Google Client ID saved! Re-initializing auth...', 'green');
      setTimeout(() => window.location.reload(), 500);
    } else {
      window.toast?.('Please paste a valid Google Client ID.', 'red');
    }
  });

  // Switch to Owner
  document.getElementById('btn-page-switch-owner')?.addEventListener('click', () => {
    setCurrentUser({
      name: 'Joseph Erexson III',
      email: OWNER_EMAIL,
      picture: '',
      role: 'owner',
      isLoggedIn: true,
    });
    window.toast?.('Loaded Joseph Erexson III Executive Profile!', 'gold');
    setTimeout(() => window.location.reload(), 400);
  });

  // Switch to Visitor Onboarding
  document.getElementById('btn-page-switch-visitor')?.addEventListener('click', () => {
    import('./onboarding-wizard.js').then(m => m.openOnboardingWizard());
  });

  // Sign out
  document.getElementById('btn-page-sign-out')?.addEventListener('click', () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.toast?.('Signed out. Switched to Showcase Mode.', 'gold');
    setTimeout(() => window.location.reload(), 400);
  });

  // Render Google button if GIS is available
  if (window.google?.accounts?.id && clientId) {
    try {
      window.google.accounts.id.renderButton(document.getElementById('page-google-btn-container'), {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      });
    } catch (e) {
      console.warn('GIS page button render warning:', e);
    }
  }
}

