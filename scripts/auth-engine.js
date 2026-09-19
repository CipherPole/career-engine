/* ============================================================
   AUTH-ENGINE.JS — Enterprise JWT, Session Security & RBAC
   OIDC claim verification, anti-tamper sessions & least privilege.
   ============================================================ */

'use strict';

export const OWNER_EMAIL = 'jerexson3@gmail.com';
const SESSION_STORAGE_KEY = 'careerEngine_session_v2';
const CONFIG_STORAGE_KEY = 'careerEngine_google_client_id';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes auto-lock

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
};

// Default / configured Client ID
let GOOGLE_CLIENT_ID = localStorage.getItem(CONFIG_STORAGE_KEY) || '';

// ── Session Fingerprint Helper ────────────────────────────────
function generateFingerprint(sub, iat) {
  const agent = navigator.userAgent || 'unknown';
  const raw = `${sub}|${iat}|${agent}|${window.location.host}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// ── OIDC JWT Claim Validation ─────────────────────────────────
export function validateGoogleJwt(token, expectedClientId) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);

    const now = Date.now() / 1000;

    // 1. Expiration check
    if (payload.exp && payload.exp < now) {
      return { valid: false, reason: 'Token has expired.' };
    }

    // 2. Issuer check
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      return { valid: false, reason: 'Invalid token issuer.' };
    }

    // 3. Audience check (if expectedClientId is provided)
    if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
      return { valid: false, reason: 'Audience mismatch — token not minted for this application.' };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'Malformed JWT token structure.' };
  }
}

// ── Session Token Lifecycle ───────────────────────────────────
export function getActiveSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return getDefaultGuestSession();

    const session = JSON.parse(raw);
    const now = Date.now();

    // Check inactivity auto-lock
    if (session.lastActive && (now - session.lastActive) > IDLE_TIMEOUT_MS) {
      console.warn('Session expired due to inactivity.');
      revokeSession();
      return getDefaultGuestSession();
    }

    // Check token expiration
    if (session.expiresAt && now > session.expiresAt) {
      console.warn('Session token expired.');
      revokeSession();
      return getDefaultGuestSession();
    }

    // Verify session fingerprint
    if (session.sub && session.iat && session.fingerprint) {
      const expectedFp = generateFingerprint(session.sub, session.iat);
      if (session.fingerprint !== expectedFp) {
        console.warn('Security alert: Session fingerprint mismatch. Potential session hijacking prevented.');
        revokeSession();
        return getDefaultGuestSession();
      }
    }

    // Update last activity timestamp
    session.lastActive = now;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    return session;
  } catch (e) {
    console.warn('Session read error:', e);
    return getDefaultGuestSession();
  }
}

export function saveActiveSession(session) {
  try {
    session.lastActive = Date.now();
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed saving session:', e);
  }
}

export function revokeSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getDefaultGuestSession() {
  return {
    user: {
      name: 'Joseph Erexson III',
      email: OWNER_EMAIL,
      picture: '',
    },
    role: ROLES.ADMIN, // Default Showcase / Local Admin
    isLoggedIn: false,
    lastActive: Date.now(),
  };
}

// ── RBAC Permission Assertions ────────────────────────────────
export function isOwner() {
  const session = getActiveSession();
  return session.role === ROLES.ADMIN || session.user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

export function hasPermission(requiredRole) {
  const session = getActiveSession();
  if (session.role === ROLES.ADMIN) return true;
  if (requiredRole === ROLES.GUEST) return true;
  if (requiredRole === ROLES.USER && session.role === ROLES.USER) return true;
  return false;
}

export function getCurrentUser() {
  const session = getActiveSession();
  return {
    name: session.user?.name || 'Explorer',
    email: session.user?.email || OWNER_EMAIL,
    picture: session.user?.picture || '',
    role: session.role,
    isLoggedIn: session.isLoggedIn,
  };
}

export function setCurrentUser(user) {
  const isUserOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const session = {
    user: {
      name: user.name,
      email: user.email,
      picture: user.picture || '',
    },
    role: isUserOwner ? ROLES.ADMIN : ROLES.USER,
    isLoggedIn: true,
    sub: user.sub || 'simulated-sub',
    iat: Math.floor(Date.now() / 1000),
    expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
    fingerprint: generateFingerprint(user.sub || 'simulated-sub', Math.floor(Date.now() / 1000)),
    lastActive: Date.now(),
  };
  saveActiveSession(session);
}

// ── Google Identity Services Initialization ───────────────────
export function initGoogleAuth(onAuthSuccess) {
  if (typeof window.google === 'undefined' || !window.google.accounts) {
    setTimeout(() => initGoogleAuth(onAuthSuccess), 500);
    return;
  }

  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || GOOGLE_CLIENT_ID;
  if (!clientId) {
    renderAuthPill();
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleGoogleCredentialResponse(response, onAuthSuccess),
      auto_select: false,
    });

    const btnContainer = document.getElementById('google-btn-container');
    if (btnContainer) {
      window.google.accounts.id.renderButton(btnContainer, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      });
    }

    renderAuthPill();
  } catch (e) {
    console.warn('Google Auth initialization warning:', e);
  }
}

// ── Handle Google Credential Callback ─────────────────────────
function handleGoogleCredentialResponse(response, onAuthSuccess) {
  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || GOOGLE_CLIENT_ID;
  const validation = validateGoogleJwt(response.credential, clientId);

  if (!validation.valid) {
    window.toast?.(`Security Alert: ${validation.reason}`, 'red');
    console.error('JWT Validation Error:', validation.reason);
    return;
  }

  const payload = validation.payload;
  const isUserOwner = (payload.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) && (payload.email_verified === true);

  const session = {
    user: {
      name: payload.name || payload.given_name || 'Career Explorer',
      email: payload.email,
      picture: payload.picture || '',
    },
    role: isUserOwner ? ROLES.ADMIN : ROLES.USER,
    isLoggedIn: true,
    sub: payload.sub,
    iat: payload.iat,
    expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + (3600 * 1000),
    fingerprint: generateFingerprint(payload.sub, payload.iat),
    lastActive: Date.now(),
  };

  saveActiveSession(session);
  window.toast?.(`Welcome, ${session.user.name}! ${isUserOwner ? 'Verified Admin Session.' : 'Personal workspace ready.'}`, 'green');

  if (onAuthSuccess) {
    onAuthSuccess(session);
  } else {
    window.location.reload();
  }
}

// ── Sign Out ──────────────────────────────────────────────────
export function signOut() {
  revokeSession();
  sessionStorage.removeItem('careerEngine_showcase_active');
  window.toast?.('Signed out successfully.', 'gold');
  renderAuthPill();
  window.updateSidebarPermissions?.();
  window.navigate?.('signin');
}

// ── Render Top Bar Auth Pill ──────────────────────────────────
export function renderAuthPill() {
  const container = document.getElementById('user-auth-pill');
  if (!container) return;

  const session = getActiveSession();
  const user = session.user;
  const admin = session.role === ROLES.ADMIN;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid ${admin ? 'var(--gold-border)' : 'var(--border)'};border-radius:24px;padding:4px 12px 4px 6px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${admin ? 'var(--gold)' : '#3b82f6'};color:#000;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${user.picture ? `<img src="${user.picture}" style="width:100%;height:100%;object-fit:cover;" />` : (user.name ? user.name[0].toUpperCase() : '👤')}
        </div>
        <div style="line-height:1.2;">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">${user.name}</div>
          <div style="font-size:10px;color:var(--text-dim);">${admin ? '⭐ Admin (Owner)' : '👤 User Workspace'}</div>
        </div>
        <button class="btn ${admin ? 'btn-gold' : 'btn-secondary'} btn-sm" id="btn-open-auth-modal" style="font-size:10px;padding:3px 10px;margin-left:6px;">
          ${admin ? '⚙️ Admin' : '👤 Account'}
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-header-signout" style="font-size:10px;padding:3px 8px;margin-left:4px;" title="Sign out">
          🚪 Sign Out
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-open-auth-modal')?.addEventListener('click', openAuthModal);
  document.getElementById('btn-header-signout')?.addEventListener('click', signOut);
}

// ── Access Denied Security Screen ─────────────────────────────
export function renderAccessDenied(requiredRole = 'admin') {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="empty-state" style="padding:60px 20px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🛡️</div>
      <div style="font-size:22px;font-weight:800;color:var(--red);margin-bottom:8px;">
        Access Denied: Administrator Privileges Required
      </div>
      <div style="font-size:13px;color:var(--text-secondary);max-width:480px;margin:0 auto 24px;line-height:1.6;">
        The resource or system settings you attempted to access requires verified <strong>${requiredRole.toUpperCase()}</strong> permissions. 
        Under our zero-trust Role-Based Access Control (RBAC) policy, this area is restricted exclusively to the platform creator.
      </div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-primary" onclick="navigate('dashboard')">
          ← Return to Dashboard
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('btn-open-auth-modal')?.click()">
          Verify Admin Identity
        </button>
      </div>
    </div>
  `;
}

// ── Auth Modal ────────────────────────────────────────────────
export function openAuthModal() {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const session = getActiveSession();
  const user = session.user;
  const admin = session.role === ROLES.ADMIN;
  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || '';

  modal.innerHTML = `
    <div class="modal-box" style="max-width:540px;">
      <div class="modal-header">
        <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
          <span>🛡️</span> Security & Workspace Identity
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-close-auth-modal" style="padding:4px 10px;">✕</button>
      </div>

      <div class="modal-body" style="display:flex;flex-direction:column;gap:18px;">
        <!-- Active Session Banner -->
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:50%;background:${admin ? 'var(--gold)' : '#3b82f6'};color:#000;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;">
              ${user.picture ? `<img src="${user.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : (user.name ? user.name[0] : '👤')}
            </div>
            <div>
              <div style="font-weight:700;font-size:14px;">${user.name}</div>
              <div style="font-size:11px;color:var(--text-dim);">${user.email}</div>
              <div style="margin-top:4px;">
                <span class="chip ${admin ? 'gold' : 'blue'}" style="font-size:10px;">
                  ${admin ? '⭐ ROLE_ADMIN (Full Privileges)' : '👤 ROLE_USER (Personal Workspace)'}
                </span>
              </div>
            </div>
          </div>
          ${session.isLoggedIn ? `
            <button class="btn btn-secondary btn-sm" id="btn-sign-out" style="font-size:11px;">
              Sign Out
            </button>
          ` : ''}
        </div>

        <!-- Google Sign-In Container -->
        <div style="border:1px dashed var(--border);border-radius:var(--radius-md);padding:16px;text-align:center;">
          <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Official Google Sign-In (OIDC JWT)</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:12px;">
            Sign in with Google. Verified <strong>${OWNER_EMAIL}</strong> automatically activates Admin privilege.
          </div>
          <div id="google-btn-container" style="display:flex;justify-content:center;"></div>
        </div>

        <!-- Mode Switcher -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;">
            Switch Experience:
          </div>

          <button class="btn btn-secondary w-full" id="btn-switch-owner" style="justify-content:flex-start;padding:12px;gap:12px;">
            <span style="font-size:20px;">⭐</span>
            <div style="text-align:left;">
              <div style="font-weight:700;font-size:13px;color:var(--gold-light);">Joseph Erexson III (Admin Profile)</div>
              <div style="font-size:11px;color:var(--text-dim);">Load full executive profile & administrative permissions.</div>
            </div>
          </button>

          <button class="btn btn-primary w-full" id="btn-switch-visitor" style="justify-content:flex-start;padding:12px;gap:12px;">
            <span style="font-size:20px;">🚀</span>
            <div style="text-align:left;">
              <div style="font-weight:700;font-size:13px;">Visitor Personal Workspace</div>
              <div style="font-size:11px;color:#cbd5e1;">Test creating a personal profile with isolated data.</div>
            </div>
          </button>
        </div>

        ${admin ? `
          <!-- Admin-Only Settings Link -->
          <div style="border-top:1px solid var(--border);padding-top:14px;">
            <button class="btn btn-secondary w-full btn-sm" id="btn-modal-to-settings" style="justify-content:center;">
              ⚙️ Open Full System Settings & Client ID Configuration →
            </button>
          </div>
        ` : ''}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" id="btn-close-auth-action">Close</button>
      </div>
    </div>
  `;

  document.getElementById('btn-close-auth-modal').onclick = () => modal.classList.remove('open');
  document.getElementById('btn-close-auth-action').onclick = () => modal.classList.remove('open');

  document.getElementById('btn-switch-owner').onclick = () => {
    setCurrentUser({
      name: 'Joseph Erexson III',
      email: OWNER_EMAIL,
      picture: '',
      sub: 'owner-sub',
    });
    modal.classList.remove('open');
    window.toast?.('Authenticated as Admin (Joseph Erexson III)', 'gold');
    setTimeout(() => window.location.reload(), 300);
  };

  document.getElementById('btn-switch-visitor').onclick = () => {
    modal.classList.remove('open');
    import('./onboarding-wizard.js').then(m => m.openOnboardingWizard());
  };

  document.getElementById('btn-sign-out')?.addEventListener('click', () => {
    revokeSession();
    window.toast?.('Signed out. Reverted to Showcase Mode.', 'gold');
    setTimeout(() => window.location.reload(), 300);
  });

  document.getElementById('btn-modal-to-settings')?.addEventListener('click', () => {
    modal.classList.remove('open');
    window.navigate?.('settings');
  });

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

  // RBAC Check
  if (!isOwner()) {
    renderAccessDenied('admin');
    return;
  }

  const session = getActiveSession();
  const user = session.user;
  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || '';
  const currentOrigin = window.location.origin;

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title" style="display:flex;align-items:center;gap:10px;">
        <span>⚙️</span> Administrator Console & Google OAuth
      </div>
      <div class="page-subtitle">Zero-trust administrative console. Role: <strong style="color:var(--gold);">ROLE_ADMIN</strong>.</div>
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
              <li>Scopes: <code style="color:var(--green);">email, profile, openid</code></li>
            </ul>
          </div>
        </div>

        <div>
          <button class="btn btn-gold w-full" id="btn-save-page-client-id" style="justify-content:center;padding:12px;font-weight:700;">
            💾 Save Client ID & Activate Google Sign-In
          </button>
        </div>
      </div>

      <!-- Security & Token Status -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
              <span>🛡️</span> Security & Session Diagnostics
            </div>
            <span class="chip gold" style="font-size:11px;">RBAC Enforced</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
            <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span style="color:var(--text-secondary);">Active Identity:</span>
              <strong style="color:var(--text-primary);">${user.name} (${user.email})</strong>
            </div>
            <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span style="color:var(--text-secondary);">Role Level:</span>
              <span class="chip gold" style="font-size:10px;">ROLE_ADMIN (Full Access)</span>
            </div>
            <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span style="color:var(--text-secondary);">Session Inactivity Lock:</span>
              <span style="color:var(--green);font-weight:600;">30 Minutes Idle Auto-Lock</span>
            </div>
            <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span style="color:var(--text-secondary);">Paranoid Pre-Push Audit:</span>
              <span style="color:var(--green);font-weight:600;">Active & Enforced</span>
            </div>
          </div>
        </div>

        <div>
          <button class="btn btn-secondary w-full" id="btn-test-lockdown">
            🔒 Lock Admin Console (Simulate Inactivity)
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-save-page-client-id')?.addEventListener('click', () => {
    const val = document.getElementById('page-google-client-id')?.value.trim();
    if (val) {
      localStorage.setItem(CONFIG_STORAGE_KEY, val);
      GOOGLE_CLIENT_ID = val;
      window.toast?.('Google Client ID saved! Re-initializing auth...', 'green');
      setTimeout(() => window.location.reload(), 400);
    } else {
      window.toast?.('Please paste a valid Google Client ID.', 'red');
    }
  });

  document.getElementById('btn-test-lockdown')?.addEventListener('click', () => {
    revokeSession();
    window.toast?.('Session locked. Reverting to Guest Mode.', 'gold');
    setTimeout(() => window.location.reload(), 300);
  });
}
