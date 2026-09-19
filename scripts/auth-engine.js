/* ============================================================
   AUTH-ENGINE.JS — Enterprise JWT, Session Security & RBAC
   OIDC claim verification, anti-tamper sessions & least privilege.
   ============================================================ */

'use strict';

import {
  logAuth,
  logSecurity,
  logNetwork,
  logError,
  logEvent,
  getLogs,
  clearLogs,
  generateDiagnosticsReport,
  downloadLogsJson,
  LOG_LEVELS,
  LOG_CATEGORIES,
} from './telemetry-engine.js?v=6';

export const OWNER_EMAIL = 'jerexson3@gmail.com';
const SESSION_STORAGE_KEY = 'careerEngine_session_v2';
const CONFIG_STORAGE_KEY = 'careerEngine_google_client_id';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes auto-lock

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
};

// Default / configured Client ID (hydrated dynamically from /api/auth-config or storage)
let GOOGLE_CLIENT_ID = sessionStorage.getItem('careerEngine_runtime_client_id') || localStorage.getItem(CONFIG_STORAGE_KEY) || '';

export function getGoogleClientId() {
  return GOOGLE_CLIENT_ID || sessionStorage.getItem('careerEngine_runtime_client_id') || localStorage.getItem(CONFIG_STORAGE_KEY) || '';
}

export async function fetchAuthConfig() {
  const start = performance.now();
  try {
    const res = await fetch('/api/auth-config');
    const latencyMs = Math.round(performance.now() - start);
    logNetwork('/api/auth-config', res.status, latencyMs);
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) {
        GOOGLE_CLIENT_ID = data.clientId;
        sessionStorage.setItem('careerEngine_runtime_client_id', data.clientId);
        logAuth('AUTH_CONFIG_RESOLVED', { source: 'vercel_serverless', clientId: data.clientId.substring(0, 15) + '...' });
        return data.clientId;
      }
    }
  } catch (e) {
    const latencyMs = Math.round(performance.now() - start);
    logNetwork('/api/auth-config', 0, latencyMs, { error: e.message });
    logError(e, 'fetchAuthConfig failed');
  }
  const fallback = getGoogleClientId();
  if (fallback) {
    logAuth('AUTH_CONFIG_RESOLVED', { source: 'local_storage', clientId: fallback.substring(0, 15) + '...' });
  } else {
    logAuth('AUTH_CONFIG_MISSING', { source: 'none' });
  }
  return fallback;
}

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
let isGsiInitialized = false;
let globalAuthCallback = null;

function initializeGsiOnce(clientId, onAuthSuccess) {
  if (isGsiInitialized) {
    if (onAuthSuccess) globalAuthCallback = onAuthSuccess;
    return true;
  }

  if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.id) {
    logAuth('GSI_LIB_NOT_READY', { reason: 'window.google.accounts.id not yet defined' });
    return false;
  }

  try {
    if (onAuthSuccess) globalAuthCallback = onAuthSuccess;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleGoogleCredentialResponse(response, globalAuthCallback),
      auto_select: false,
      itp_support: true,
      cancel_on_tap_outside: true,
      intermediate_iframe_close_callback: () => {
        logAuth('GSI_POPUP_OR_IFRAME_CLOSED');
        const notice = document.getElementById('landing-popup-notice');
        if (notice) {
          notice.innerHTML = '💡 Google window closed. Click the button above anytime to sign in.';
          notice.style.borderColor = 'rgba(255,255,255,0.08)';
          notice.style.color = 'var(--text-secondary)';
        }
      },
    });
    isGsiInitialized = true;
    logAuth('GSI_INITIALIZED_SUCCESS', { clientIdPrefix: clientId.substring(0, 15) + '...' });
    return true;
  } catch (e) {
    logError(e, 'initializeGsiOnce exception');
    return false;
  }
}

export function initGoogleAuth(onAuthSuccess) {
  if (typeof window.google === 'undefined' || !window.google.accounts) {
    setTimeout(() => initGoogleAuth(onAuthSuccess), 500);
    return;
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    renderAuthPill();
    return;
  }

  const ok = initializeGsiOnce(clientId, onAuthSuccess);
  if (ok) {
    const btnContainer = document.getElementById('google-btn-container');
    if (btnContainer) {
      window.google.accounts.id.renderButton(btnContainer, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      });
      logAuth('GSI_TOP_BUTTON_RENDERED');
    }
    renderAuthPill();
  }
}

export function renderGoogleSignInButton(containerId, onAuthSuccess, buttonText = 'continue_with') {
  const clientId = getGoogleClientId();
  if (!clientId) {
    logAuth('GSI_RENDER_SKIPPED', { reason: 'Client ID missing', containerId });
    return false;
  }

  if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.id) {
    setTimeout(() => renderGoogleSignInButton(containerId, onAuthSuccess, buttonText), 300);
    return false;
  }

  const ok = initializeGsiOnce(clientId, onAuthSuccess);
  if (!ok) {
    setTimeout(() => renderGoogleSignInButton(containerId, onAuthSuccess, buttonText), 300);
    return false;
  }

  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = '';
    window.google.accounts.id.renderButton(el, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: buttonText,
      logo_alignment: 'left',
      width: 320,
      click_listener: () => {
        logAuth('GSI_BUTTON_CLICKED', { containerId, buttonText });
        const notice = document.getElementById('landing-popup-notice');
        if (notice) {
          notice.innerHTML = '⏳ <strong>Google Sign-In Active:</strong> Please select your account in the open Google Accounts window (or press <code>Alt + Tab</code>).';
          notice.style.borderColor = 'var(--gold)';
          notice.style.color = 'var(--gold-light)';
        }
      },
    });
    logAuth('GSI_BUTTON_RENDERED', { containerId, buttonText });
    return true;
  }
  logAuth('GSI_BUTTON_CONTAINER_NOT_FOUND', { containerId });
  return false;
}

// ── Handle Google Credential Callback ─────────────────────────
export function handleGoogleCredentialResponse(response, onAuthSuccess) {
  const clientId = getGoogleClientId();
  logAuth('GSI_CREDENTIAL_RECEIVED', { hasCredential: !!response?.credential });
  const validation = validateGoogleJwt(response.credential, clientId);

  if (!validation.valid) {
    logSecurity('JWT_VALIDATION_FAILED', { reason: validation.reason });
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

  // Mark device as visited and save display name
  localStorage.setItem('careerEngine_has_visited', 'true');
  if (session.user.name) {
    localStorage.setItem('careerEngine_last_user', session.user.name);
  }

  // Auto-create isolated workspace profile for new visitors
  const profileKey = `careerEngine_profile_${payload.email.toLowerCase()}`;
  const existingProfile = localStorage.getItem(profileKey);
  const isNewUser = !isUserOwner && !existingProfile;

  if (isNewUser) {
    const newProfile = {
      name: payload.name || payload.given_name || 'Career Explorer',
      title: 'Software Engineer',
      contact: { email: payload.email, location: 'Remote, US' },
      targetComp: '$160,000 - $200,000+',
      experience: [],
      skills: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(profileKey, JSON.stringify(newProfile));
    window.toast?.(`Welcome to Career Engine, ${session.user.name}! Your personal workspace was created.`, 'green');
  } else {
    window.toast?.(`Welcome back, ${session.user.name}! ${isUserOwner ? 'Verified Admin Session.' : 'Personal workspace loaded.'}`, 'green');
  }

  logAuth('AUTH_LOGIN_SUCCESS', {
    email: payload.email,
    role: session.role,
    fingerprint: session.fingerprint,
    isNewUser,
  });

  if (onAuthSuccess) {
    onAuthSuccess(session, isNewUser);
  } else {
    window.location.reload();
  }
}

// ── Sign Out ──────────────────────────────────────────────────
export function signOut() {
  const session = getActiveSession();
  logAuth('AUTH_SIGNOUT', { email: session?.user?.email || 'guest' });
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
  const isLoggedIn = session.isLoggedIn;

  container.innerHTML = `
    <div class="user-pill-wrap" style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;">
      <!-- Mobile Hamburger Toggle (only displayed on screens <= 900px) -->
      <button class="mobile-menu-toggle" id="btn-mobile-sidebar-toggle" style="display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);padding:6px 12px;font-size:15px;cursor:pointer;align-items:center;gap:6px;" title="Toggle Menu">
        <span>☰</span> <span style="font-size:11px;font-weight:700;">Menu</span>
      </button>

      <div style="display:flex;align-items:center;gap:8px;margin-left:auto;">
        <!-- Clickable Profile Pill (Opens profile modal with Sign Out) -->
        <div id="btn-user-profile-trigger" style="display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid ${admin ? 'var(--gold-border)' : 'var(--border)'};border-radius:24px;padding:4px 14px 4px 6px;cursor:pointer;user-select:none;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,0,0,0.2);" title="Click to view Account, Policies & Sign Out">
          <div style="width:28px;height:28px;border-radius:50%;background:${admin ? 'var(--gold)' : '#3b82f6'};color:#000;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 10px ${admin ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'};">
            ${user.picture ? `<img src="${user.picture}" style="width:100%;height:100%;object-fit:cover;" />` : (user.name ? user.name[0].toUpperCase() : '👤')}
          </div>
          <div style="line-height:1.2;text-align:left;">
            <div style="font-size:12px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:4px;">
              ${user.name} <span style="font-size:9px;color:var(--text-dim);">▾</span>
            </div>
            <div style="font-size:10px;color:var(--text-dim);">${admin ? '⭐ Admin' : (isLoggedIn ? '👤 User' : 'Showcase')}</div>
          </div>
        </div>

        ${!isLoggedIn ? `
          <button class="btn btn-gold btn-sm" onclick="window.navigate?.('signin')" style="font-size:11px;padding:5px 12px;border-radius:20px;">
            ⚡ Sign In
          </button>
        ` : ''}
      </div>
    </div>
  `;

  document.getElementById('btn-user-profile-trigger')?.addEventListener('click', () => {
    openAuthModal();
  });

  document.getElementById('btn-mobile-sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  });
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
        <button class="btn btn-secondary" onclick="window.openAuthModal?.()">
          Verify Admin Identity
        </button>
      </div>
    </div>
  `;
}

// ── Authentication & Identity Modal ───────────────────────────
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
  const clientId = getGoogleClientId();
  const isLoggedIn = session.isLoggedIn;

  modal.innerHTML = `
    <div class="modal-box" style="max-width:460px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.8);">
      
      <!-- Modal Header -->
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);">
        <div style="font-weight:800;font-size:15px;display:flex;align-items:center;gap:8px;">
          <span>${admin ? '⚙️' : '👤'}</span> ${admin ? 'Administrator Profile & Identity' : 'Your Account & Workspace'}
        </div>
        <button id="btn-close-auth-modal" style="background:transparent;border:none;color:var(--text-dim);font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;">✕</button>
      </div>

      <div style="padding:22px;">
        ${isLoggedIn ? `
          <!-- User Profile Avatar Card -->
          <div style="text-align:center;margin-bottom:20px;">
            <div style="width:72px;height:72px;border-radius:50%;background:${admin ? 'var(--gold)' : '#3b82f6'};color:#000;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;overflow:hidden;border:2px solid var(--border);box-shadow:0 0 25px ${admin ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'};">
              ${user.picture ? `<img src="${user.picture}" style="width:100%;height:100%;object-fit:cover;" />` : (user.name ? user.name[0].toUpperCase() : '👤')}
            </div>
            <div style="font-size:19px;font-weight:800;color:var(--text-primary);">${user.name}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${user.email}</div>
            <div style="margin-top:8px;">
              <span class="chip ${admin ? 'gold' : 'blue'}" style="font-size:11px;padding:3px 10px;">
                ${admin ? '⭐ Verified Administrator (Owner)' : '👤 Isolated Personal Workspace'}
              </span>
            </div>
          </div>

          <!-- Session Diagnostics Details -->
          <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;margin-bottom:18px;font-size:12px;line-height:1.6;">
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:6px;">
              <span style="color:var(--text-dim);">Role Level:</span>
              <strong style="color:var(--text-primary);">${session.role.toUpperCase()}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:6px;">
              <span style="color:var(--text-dim);">Session Fingerprint:</span>
              <code style="color:var(--gold-light);font-size:11px;">${session.fingerprint || 'none'}</code>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-dim);">Google Auth Status:</span>
              <span style="color:${clientId ? 'var(--green)' : 'var(--gold)'};font-weight:600;">
                ${clientId ? '✓ OIDC Verified' : '⚠️ Offline/Mock'}
              </span>
            </div>
          </div>

          <!-- Action Links -->
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
            ${admin ? `
              <button class="btn btn-gold w-full" id="btn-modal-open-settings" style="justify-content:center;padding:10px;font-weight:700;">
                ⚙️ Open Administrator Console & Action Logs
              </button>
            ` : ''}
            <button class="btn btn-secondary w-full" id="btn-modal-open-dashboard" style="justify-content:center;padding:10px;">
              🏠 My Skills Dashboard & Radar
            </button>
          </div>

          <!-- Prominent Single Sign Out Button -->
          <div style="border-top:1px solid var(--border);padding-top:14px;">
            <button class="btn btn-secondary w-full" id="btn-modal-signout" style="justify-content:center;padding:12px;color:var(--red);border-color:rgba(239,68,68,0.35);font-weight:700;font-size:13px;">
              🚪 Sign Out of Workspace
            </button>
          </div>

          <!-- Legal & Compliance Links (Always Accessible to Users) -->
          <div style="margin-top:16px;padding-top:12px;border-top:1px dashed var(--border);display:flex;align-items:center;justify-content:center;gap:10px;font-size:11px;color:var(--text-dim);">
            <a href="#terms" id="btn-modal-to-terms" style="color:var(--text-secondary);text-decoration:underline;cursor:pointer;">Terms of Service</a>
            <span>•</span>
            <a href="#agreement" id="btn-modal-to-agreement" style="color:var(--text-secondary);text-decoration:underline;cursor:pointer;">User Agreement & IP Notice</a>
          </div>
        ` : `
          <div style="text-align:center;padding:16px 0;">
            <div style="font-size:36px;margin-bottom:12px;">🔒</div>
            <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Sign in to Career Engine</div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:18px;">
              Authenticate with your Google account to unlock your personalized skills dashboard.
            </p>
            <button class="btn btn-gold w-full" onclick="document.getElementById('auth-modal')?.classList.remove('open');window.navigate?.('signin')" style="justify-content:center;padding:12px;font-weight:700;">
              ⚡ Go to Sign-In Screen
            </button>
            <div style="margin-top:16px;padding-top:12px;border-top:1px dashed var(--border);display:flex;align-items:center;justify-content:center;gap:10px;font-size:11px;color:var(--text-dim);">
              <a href="#terms" id="btn-modal-guest-terms" style="color:var(--text-secondary);text-decoration:underline;cursor:pointer;">Terms of Service</a>
              <span>•</span>
              <a href="#agreement" id="btn-modal-guest-agreement" style="color:var(--text-secondary);text-decoration:underline;cursor:pointer;">User Agreement</a>
            </div>
          </div>
        `}
      </div>
    </div>
  `;

  modal.classList.add('open');

  document.getElementById('btn-close-auth-modal')?.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  });

  document.getElementById('btn-modal-open-settings')?.addEventListener('click', () => {
    modal.classList.remove('open');
    window.navigate?.('settings');
  });

  document.getElementById('btn-modal-open-dashboard')?.addEventListener('click', () => {
    modal.classList.remove('open');
    window.navigate?.('dashboard');
  });

  document.getElementById('btn-modal-signout')?.addEventListener('click', () => {
    modal.classList.remove('open');
    signOut();
  });

  document.getElementById('btn-modal-to-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('open');
    window.navigate?.('terms');
  });

  document.getElementById('btn-modal-to-agreement')?.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('open');
    window.navigate?.('agreement');
  });

  document.getElementById('btn-modal-guest-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('open');
    window.navigate?.('terms');
  });

  document.getElementById('btn-modal-guest-agreement')?.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('open');
    window.navigate?.('agreement');
  });
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
  const clientId = localStorage.getItem(CONFIG_STORAGE_KEY) || sessionStorage.getItem('careerEngine_runtime_client_id') || '';
  const currentOrigin = window.location.origin;

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title" style="display:flex;align-items:center;gap:10px;">
        <span>⚙️</span> Administrator Console & Action Logs
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
            Supplied dynamically via Vercel Environment Variables or local admin override. This enables official <strong>Sign in with Google</strong> at <code style="color:var(--gold-light);">${currentOrigin}</code>.
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
            <strong style="color:var(--text-primary);">Google Cloud Console Origin Checklist:</strong>
            <ul style="padding-left:18px;margin-top:4px;display:flex;flex-direction:column;gap:3px;">
              <li>Authorized JavaScript origin: <code style="color:var(--gold-light);">${currentOrigin}</code></li>
              <li>Authorized redirect URI: <code style="color:var(--gold-light);">${currentOrigin}</code></li>
              <li>Scopes: <code style="color:var(--green);">email, profile, openid</code></li>
            </ul>
          </div>
        </div>

        <div>
          <button class="btn btn-gold w-full" id="btn-save-page-client-id" style="justify-content:center;padding:12px;font-weight:700;">
            💾 Save Local Client ID Override
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

    <!-- Action Logs & Diagnostic Trace Route Console -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-bottom:32px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:20px;">
        <div>
          <div style="font-weight:700;font-size:18px;display:flex;align-items:center;gap:10px;color:var(--text-primary);">
            <span>🛰️</span> Action Logs & Diagnostic Trace Route
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
            Structured ring buffer telemetry (last 150 events). Real-time tracking of auth lifecycle, network latencies, RBAC assertions, and errors.
          </div>
        </div>

        <!-- Action Toolbar -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-gold btn-sm" id="btn-telemetry-copy" style="font-size:11px;padding:7px 14px;font-weight:700;display:flex;align-items:center;gap:6px;">
            <span>📋</span> Copy Diagnostics Report
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-telemetry-download" style="font-size:11px;padding:7px 12px;display:flex;align-items:center;gap:6px;">
            <span>⬇️</span> Export JSON
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-telemetry-test" style="font-size:11px;padding:7px 12px;display:flex;align-items:center;gap:6px;" title="Dispatches a test event to verify error capture">
            <span>🧪</span> Test Error Handler
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-telemetry-clear" style="font-size:11px;padding:7px 12px;display:flex;align-items:center;gap:6px;color:var(--red);">
            <span>🗑️</span> Clear Logs
          </button>
        </div>
      </div>

      <!-- Metric Badges -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;margin-bottom:18px;">
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;">
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Buffer Depth</div>
          <div id="stat-total-logs" style="font-size:20px;font-weight:900;color:var(--cyan);margin-top:4px;">0 Events</div>
        </div>
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;">
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Errors Logged</div>
          <div id="stat-total-errors" style="font-size:20px;font-weight:900;color:var(--green);margin-top:4px;">0 Errors</div>
        </div>
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;">
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Active Identity</div>
          <div style="font-size:12px;font-weight:700;color:var(--gold);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.email}</div>
        </div>
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;">
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">OAuth Status</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-top:6px;">${clientId ? '✓ Live Active' : 'Missing'}</div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size:11px;color:var(--text-dim);font-weight:700;text-transform:uppercase;margin-right:4px;">Category:</span>
          <button class="chip filter-cat active" data-cat="ALL" style="cursor:pointer;font-size:11px;">All</button>
          <button class="chip filter-cat" data-cat="AUTH" style="cursor:pointer;font-size:11px;">AUTH</button>
          <button class="chip filter-cat" data-cat="NETWORK" style="cursor:pointer;font-size:11px;">NETWORK</button>
          <button class="chip filter-cat" data-cat="ROUTER" style="cursor:pointer;font-size:11px;">ROUTER</button>
          <button class="chip filter-cat" data-cat="RBAC" style="cursor:pointer;font-size:11px;">RBAC</button>
          <button class="chip filter-cat" data-cat="SYSTEM" style="cursor:pointer;font-size:11px;">SYSTEM</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:var(--text-dim);font-weight:700;text-transform:uppercase;margin-right:4px;">Level:</span>
          <button class="chip filter-lvl active" data-lvl="ALL" style="cursor:pointer;font-size:11px;">All</button>
          <button class="chip filter-lvl" data-lvl="ERROR" style="cursor:pointer;font-size:11px;color:var(--red);">ERROR</button>
          <button class="chip filter-lvl" data-lvl="SECURITY" style="cursor:pointer;font-size:11px;color:#c084fc;">SECURITY</button>
          <button class="chip filter-lvl" data-lvl="WARN" style="cursor:pointer;font-size:11px;color:var(--gold);">WARN</button>
        </div>
      </div>

      <!-- Feed Container -->
      <div id="telemetry-logs-feed" style="max-height:480px;overflow-y:auto;background:#05070c;border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:14px;font-family:'JetBrains Mono',monospace;font-size:12px;display:flex;flex-direction:column;gap:8px;">
        <!-- Hydrated dynamically -->
      </div>
    </div>
  `;

  // ── Telemetry Feed Hydration & Controls ──────────────────────
  let currentCategory = 'ALL';
  let currentLevel = 'ALL';

  function updateTelemetryView() {
    const feed = document.getElementById('telemetry-logs-feed');
    if (!feed) return;

    const allLogs = getLogs();
    const errorCount = allLogs.filter(l => l.level === LOG_LEVELS.ERROR).length;

    const totalEl = document.getElementById('stat-total-logs');
    if (totalEl) totalEl.textContent = `${allLogs.length} Events`;

    const errEl = document.getElementById('stat-total-errors');
    if (errEl) {
      errEl.textContent = `${errorCount} Errors`;
      errEl.style.color = errorCount > 0 ? 'var(--red)' : 'var(--green)';
    }

    const filtered = allLogs.filter(l => {
      const matchCat = currentCategory === 'ALL' || l.category === currentCategory;
      const matchLvl = currentLevel === 'ALL' || l.level === currentLevel;
      return matchCat && matchLvl;
    });

    if (filtered.length === 0) {
      feed.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--text-dim);">
          <div style="font-size:24px;margin-bottom:8px;">🛰️</div>
          <div>No action logs matching selected filter.</div>
        </div>
      `;
      return;
    }

    feed.innerHTML = filtered.map(item => {
      const levelColors = {
        INFO:     '#38bdf8',
        WARN:     '#f59e0b',
        ERROR:    '#ef4444',
        SECURITY: '#c084fc',
      };
      const color = levelColors[item.level] || 'var(--text-primary)';
      const metaKeys = Object.keys(item.metadata || {});
      const hasMeta = metaKeys.length > 0;

      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-left:3px solid ${color};border-radius:4px;padding:8px 12px;line-height:1.4;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="color:${color};font-weight:700;font-size:11px;">[${item.level}]</span>
              <span style="color:var(--text-dim);font-size:10px;background:rgba(255,255,255,0.05);padding:1px 6px;border-radius:3px;">${item.category}</span>
              <span style="color:var(--text-primary);font-weight:600;">${item.message}</span>
            </div>
            <span style="color:var(--text-dim);font-size:10px;white-space:nowrap;">${item.localTime}</span>
          </div>
          ${hasMeta ? `
            <details style="margin-top:4px;">
              <summary style="cursor:pointer;color:var(--gold-light);font-size:10px;">View trace metadata (${metaKeys.length} fields)</summary>
              <pre style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px;margin-top:4px;color:var(--text-secondary);font-size:11px;overflow-x:auto;">${JSON.stringify(item.metadata, null, 2)}</pre>
            </details>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Bind category filters
  document.querySelectorAll('.filter-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.cat;
      updateTelemetryView();
    });
  });

  // Bind level filters
  document.querySelectorAll('.filter-lvl').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-lvl').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLevel = btn.dataset.lvl;
      updateTelemetryView();
    });
  });

  // Bind toolbar actions
  document.getElementById('btn-telemetry-copy')?.addEventListener('click', async () => {
    const report = generateDiagnosticsReport();
    try {
      await navigator.clipboard.writeText(report);
      window.toast?.('Diagnostics report copied to clipboard!', 'green');
    } catch {
      window.prompt('Copy diagnostics report:', report);
    }
  });

  document.getElementById('btn-telemetry-download')?.addEventListener('click', () => {
    downloadLogsJson();
    window.toast?.('Telemetry JSON exported.', 'green');
  });

  document.getElementById('btn-telemetry-test')?.addEventListener('click', () => {
    logError(new Error('Admin console simulated diagnostic probe'), 'DiagnosticSelfTest');
    window.toast?.('Simulated diagnostic error logged to ring buffer.', 'gold');
    updateTelemetryView();
  });

  document.getElementById('btn-telemetry-clear')?.addEventListener('click', () => {
    if (confirm('Clear all telemetry action logs?')) {
      clearLogs();
      window.toast?.('Action logs cleared.', 'gold');
      updateTelemetryView();
    }
  });

  // Initial render of logs feed
  updateTelemetryView();

  // Bind client ID & lockdown buttons
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
