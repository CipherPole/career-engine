/* ============================================================
   SIGNIN-ENGINE.JS — Google Sign-In Landing Screen & Gateway
   Context-aware: "Create Account with Google" (new) vs "Continue with Google" (returning).
   Full-screen motion aurora & interactive constellation background.
   ============================================================ */

'use strict';

import { 
  renderGoogleSignInButton, 
  handleGoogleCredentialResponse,
  getGoogleClientId,
  fetchAuthConfig
} from './auth-engine.js?v=6';

import {
  logAuth,
  logError,
  logEvent,
  LOG_LEVELS,
  LOG_CATEGORIES,
} from './telemetry-engine.js?v=6';

let animationFrameId = null;

export async function renderSignInPage() {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Clean up any previous canvas or background attached to body
  cleanupMotionBackground();

  // Ensure runtime client ID is fetched from /api/auth-config
  let clientId = getGoogleClientId();
  if (!clientId) {
    clientId = await fetchAuthConfig();
  }

  // Determine if returning or first-time user
  const hasVisited = localStorage.getItem('careerEngine_has_visited') === 'true';
  const lastUserRaw = localStorage.getItem('careerEngine_last_user') || '';
  const lastUserName = lastUserRaw ? lastUserRaw.split(' ')[0] : '';

  const isReturning = hasVisited;
  const buttonTextMode = isReturning ? 'continue_with' : 'signup_with';
  const buttonLabel = isReturning ? 'Continue with Google' : 'Create Account with Google';

  logAuth('SIGNIN_GATE_VIEWED', { isReturning, buttonTextMode, clientIdConfigured: !!clientId });

  const pageHeading = isReturning 
    ? `Welcome Back${lastUserName ? ', ' + lastUserName : ''}` 
    : 'Create Your Free Account';
  const pageSubtitle = isReturning
    ? 'Continue to your personal skills roadmap, interactive radar benchmarks, and career telemetry.'
    : 'Personal AI Career Engine to help you benchmark, understand, and improve your technical skills.';
  const badgeLabel = isReturning ? '⚡ Welcome Back' : '✨ Skill Intelligence Platform • Free';

  // Attach background layers before #app directly on body for true 100% full-screen coverage
  const bgContainer = document.createElement('div');
  bgContainer.id = 'signin-bg-root';
  bgContainer.style.pointerEvents = 'none';
  bgContainer.innerHTML = `
    <div class="signin-motion-bg">
      <div class="signin-aurora-orb signin-aurora-orb-1"></div>
      <div class="signin-aurora-orb signin-aurora-orb-2"></div>
      <div class="signin-aurora-orb signin-aurora-orb-3"></div>
    </div>
    <canvas id="signin-constellation-canvas"></canvas>
  `;
  const appEl = document.getElementById('app');
  if (appEl) {
    document.body.insertBefore(bgContainer, appEl);
  } else {
    document.body.insertBefore(bgContainer, document.body.firstChild);
  }

  // Render centered glass card inside page-content
  content.innerHTML = `
    <div style="min-height:85vh;min-height:85dvh;display:flex;align-items:center;justify-content:center;padding:16px;position:relative;z-index:10;">
      <div class="signin-glass-card" style="max-width:480px;width:100%;border-radius:var(--radius-xl);padding:38px 28px;text-align:center;position:relative;overflow:hidden;">
        
        <!-- Context-Aware Shimmer Badge -->
        <div style="display:flex;justify-content:center;">
          <div class="signin-shimmer-pill">
            <span>⚡</span> ${badgeLabel}
          </div>
        </div>

        <!-- Brand Icon with Pulsing Gold Halo -->
        <div style="width:62px;height:62px;border-radius:var(--radius-lg);background:linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.1));border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;box-shadow:0 0 25px rgba(245, 158, 11, 0.3);">
          ⚡
        </div>

        <div style="font-size:26px;font-weight:900;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:6px;">
          ${pageHeading}
        </div>
        <div style="font-size:13px;color:var(--gold-light);font-weight:600;margin-bottom:14px;">
          Personal AI Career Engine to help you improve and master your skills
        </div>

        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:22px;">
          ${pageSubtitle}
        </p>

        <!-- Feature Badges -->
        <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:24px;">
          <span style="font-size:11px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:3px 10px;border-radius:99px;color:var(--text-dim);">
            🎯 ATS Gap Engine
          </span>
          <span style="font-size:11px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);padding:3px 10px;border-radius:99px;color:var(--gold);">
            📈 Skills Radar
          </span>
          <span style="font-size:11px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);padding:3px 10px;border-radius:99px;color:#93c5fd;">
            🛡️ Zero-Trust RBAC
          </span>
        </div>

        <!-- Primary Google Sign-In Card -->
        <div style="background:rgba(6, 8, 13, 0.7);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius-lg);padding:22px 18px;margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:16px;letter-spacing:0.5px;">
            ${isReturning ? 'Verified Google Authentication' : 'Fast 1-Click Google Sign Up'}
          </div>
          
          <!-- Native Official Google GIS Button Target -->
          <div id="landing-google-btn-container" style="display:flex;justify-content:center;min-height:44px;align-items:center;">
            <!-- Rendered by Google Identity Services with dynamic text -->
          </div>

          <!-- Helpful Desktop Notice -->
          <div id="landing-popup-notice" style="margin-top:12px;font-size:11px;color:var(--text-secondary);background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:8px 12px;line-height:1.4;">
            💡 <strong>Desktop Notice:</strong> Google personalizes the button as <em>"Sign in as [Name]"</em> when Chrome is signed into your Google profile. Clicking opens a Google Accounts popup window to confirm sign-in.
          </div>

          <!-- Collapsible Desktop Troubleshooter -->
          <details style="margin-top:10px;text-align:left;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-sm);padding:8px 12px;font-size:11px;line-height:1.5;">
            <summary style="cursor:pointer;color:var(--gold-light);font-weight:600;">
              🔧 Desktop Troubleshooter (Popups & Ad Blockers)
            </summary>
            <div style="margin-top:8px;color:var(--text-secondary);display:flex;flex-direction:column;gap:6px;">
              <div>• <strong>Popup in Background:</strong> On PC, Chrome often opens the Google Sign-in window behind your main browser window. Press <code style="color:var(--gold);">Alt + Tab</code> or check your taskbar.</div>
              <div>• <strong>Ad Blockers (uBlock / AdBlock):</strong> If you see <code>ERR_BLOCKED_BY_CLIENT</code> in console, an ad blocker blocked Google telemetry. Pause it or whitelist this site.</div>
              <div>• <strong>Chrome Popup Blocker:</strong> If Chrome blocked the popup, look for the pop-up icon with a red ✕ in the right corner of your address bar and click <em>"Always allow"</em>.</div>
            </div>
          </details>

          <!-- Fallback Interactive Trigger (Only visible if GIS iframe is loading or offline) -->
          <div id="landing-custom-google-wrapper" style="display:none;margin-top:8px;">
            <button class="btn w-full" id="btn-trigger-google-auth" style="background:#ffffff;color:#1f1f1f;font-weight:600;font-size:13px;border:1px solid #dadce0;border-radius:24px;padding:11px 16px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.12);cursor:pointer;">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span style="color:#3c4043;font-weight:600;">${buttonLabel}</span>
            </button>
          </div>
        </div>

        <div style="font-size:11px;color:var(--text-dim);margin-bottom:16px;">
          ${isReturning ? 'Automatic workspace restoration & encryption.' : 'Creates an isolated, private workspace. No credit card required.'}
        </div>

        <!-- Terms of Service & User Agreement Notice -->
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:var(--text-dim);line-height:1.5;">
          <span>By continuing, you acknowledge and agree to our</span>
          <div style="margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;">
            <a href="#terms" id="link-signin-terms" style="color:var(--gold-light);text-decoration:underline;cursor:pointer;">Terms of Service</a>
            <span>•</span>
            <a href="#agreement" id="link-signin-agreement" style="color:var(--gold-light);text-decoration:underline;cursor:pointer;">User Agreement & IP Notice</a>
          </div>
        </div>

        <!-- Security Pill -->
        <div style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--text-dim);">
          <span>🛡️</span>
          <span>Zero-Trust RBAC & Google OIDC Cryptographic JWT</span>
        </div>
      </div>
    </div>
  `;

  // Legal policy click handlers
  document.getElementById('link-signin-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    cleanupMotionBackground();
    window.navigate?.('terms');
  });
  document.getElementById('link-signin-agreement')?.addEventListener('click', (e) => {
    e.preventDefault();
    cleanupMotionBackground();
    window.navigate?.('agreement');
  });

  // Fallback Google button click handler
  document.getElementById('btn-trigger-google-auth')?.addEventListener('click', async () => {
    let activeClientId = getGoogleClientId();
    if (!activeClientId) {
      activeClientId = await fetchAuthConfig();
    }
    if (!activeClientId) {
      window.toast?.('Google OAuth is initializing...', 'gold');
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.id) {
      window.toast?.('Google Identity Services is loading...', 'gold');
      return;
    }

    try {
      // Prefer the centered GIS button to avoid detached top-right One Tap prompts.
      const centerButtonHost = document.getElementById('landing-google-btn-container');
      const centerButton = centerButtonHost?.querySelector('div[role="button"], iframe');
      if (centerButton && typeof centerButton.click === 'function') {
        centerButton.click();
      } else {
        window.toast?.('Use the centered Google button to continue.', 'gold');
      }
    } catch (e) {
      console.error('Google Sign-In Error:', e);
    }
  });

  // Render official Google button with context-aware text ('continue_with' vs 'signup_with')
  function initLandingGoogleButton() {
    const activeClientId = getGoogleClientId();
    const customWrapper = document.getElementById('landing-custom-google-wrapper');
    if (activeClientId) {
      if (customWrapper) customWrapper.style.display = 'none';
      renderGoogleSignInButton('landing-google-btn-container', (session, isNewUser) => {
        cleanupMotionBackground();
        window.navigate?.('dashboard');
        if (isNewUser) {
          import('./onboarding-wizard.js').then(m => m.openOnboardingWizard());
        }
      }, buttonTextMode);

      // Window blur listener to detect when Google Accounts popup is opened/focused
      window.addEventListener('blur', () => {
        const notice = document.getElementById('landing-popup-notice');
        if (notice) {
          notice.innerHTML = '⏳ <strong>Google Sign-In Active:</strong> Please complete authentication in the open Google Accounts window.';
          notice.style.borderColor = 'var(--gold)';
          notice.style.color = 'var(--gold-light)';
        }
        logAuth('GOOGLE_POPUP_DETECTED', { detail: 'Window blur event - popup interaction detected' });
      }, { once: true });
    } else {
      if (customWrapper) customWrapper.style.display = 'block';
    }
  }

  initLandingGoogleButton();

  // ── Launch Full-Screen Interactive Constellation Animation ───
  initConstellationCanvas();
}

export function cleanupMotionBackground() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  const bg = document.getElementById('signin-bg-root');
  if (bg) {
    bg.remove();
  }
}

function initConstellationCanvas() {
  const canvas = document.getElementById('signin-constellation-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const onResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  // Mouse tracking
  const mouse = { x: -1000, y: -1000, radius: 150 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Generate particles
  const count = Math.min(80, Math.floor((width * height) / 16000));
  const particles = [];
  const colors = [
    { r: 245, g: 158, b: 11 },  // Gold
    { r: 56,  g: 189, b: 248 }, // Cyan
    { r: 168, g: 85,  b: 247 }, // Purple
    { r: 52,  g: 211, b: 153 }, // Emerald
  ];

  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
      color: color,
      alpha: Math.random() * 0.5 + 0.3,
    });
  }

  // Animation Loop
  function animate() {
    if (!document.getElementById('signin-constellation-canvas')) {
      window.removeEventListener('resize', onResize);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Bounce off screen edges
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      // Mouse interactive repel/attract
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouse.radius) {
        const angle = Math.atan2(dy, dx);
        const force = (mouse.radius - dist) / mouse.radius;
        p.x -= Math.cos(angle) * force * 1.2;
        p.y -= Math.sin(angle) * force * 1.2;
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.8)`;
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dxx = p.x - p2.x;
        const dyy = p.y - p2.y;
        const d = Math.sqrt(dxx * dxx + dyy * dyy);

        if (d < 125) {
          const lineAlpha = (1 - d / 125) * 0.22;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${lineAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }

      // Connect to mouse if close
      if (dist < mouse.radius) {
        const mouseAlpha = (1 - dist / mouse.radius) * 0.35;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(245, 158, 11, ${mouseAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  animate();
}
