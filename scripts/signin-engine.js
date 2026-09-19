/* ============================================================
   SIGNIN-ENGINE.JS — Google Sign-In Gateway & Resume Onboarding
   Phase 1: Clean sign-in gate with Google button only.
   Phase 2: Resume upload & import screen for new users.
   ============================================================ */

'use strict';

import { 
  renderGoogleSignInButton, 
  getGoogleClientId,
  fetchAuthConfig,
  getActiveSession,
} from './auth-engine.js?v=8';

import {
  logAuth,
  logError,
  LOG_LEVELS,
  LOG_CATEGORIES,
} from './telemetry-engine.js?v=8';

import { extractTextFromFile, analyzeResumeText } from './resume-parser.js';
import { openResumeReviewModal } from './onboarding-wizard.js';

let animationFrameId = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────
// PHASE 1: Sign-In Gate — Google Button Only
// ─────────────────────────────────────────────────────────────
export async function renderSignInPage() {
  const content = document.getElementById('page-content');
  if (!content) return;

  cleanupMotionBackground();

  // Ensure runtime client ID is fetched
  let clientId = getGoogleClientId();
  if (!clientId) {
    clientId = await fetchAuthConfig();
  }

  // Check if user is already authenticated but has no profile yet
  // (e.g., they just deleted their account, or completed Google auth)
  const activeSession = getActiveSession();
  const isAuthenticated = activeSession?.isLoggedIn && activeSession?.user?.email;
  const authenticatedEmail = isAuthenticated ? activeSession.user.email.toLowerCase() : null;
  const hasExistingProfile = authenticatedEmail
    ? !!localStorage.getItem(`careerEngine_profile_${authenticatedEmail}`)
    : false;
  const isAuthenticatedNewUser = isAuthenticated && !hasExistingProfile;

  // If they're already authenticated and have no profile, go straight to Phase 2
  if (isAuthenticatedNewUser) {
    logAuth('SIGNIN_GATE_SKIP_TO_UPLOAD', { email: authenticatedEmail });
    renderResumeUploadPage(activeSession);
    return;
  }

  // Returning or new unauthenticated user — show sign-in gate
  const hasVisited = localStorage.getItem('careerEngine_has_visited') === 'true';
  const lastUserRaw = localStorage.getItem('careerEngine_last_user') || '';
  const lastUserFirstName = lastUserRaw ? lastUserRaw.split(' ')[0] : '';
  const isReturning = hasVisited;

  const buttonLabel = isReturning ? 'Continue with Google' : 'Sign In with Google';
  const buttonTextMode = isReturning ? 'continue_with' : 'signup_with';

  logAuth('SIGNIN_GATE_VIEWED', { isReturning, clientIdConfigured: !!clientId });

  // Build aurora motion background
  _attachMotionBackground();

  // Render the sign-in card
  content.innerHTML = `
    <div style="min-height:88vh;min-height:88dvh;display:flex;align-items:center;justify-content:center;padding:20px 16px;position:relative;z-index:10;">
      <div class="signin-glass-card" style="max-width:460px;width:100%;border-radius:var(--radius-xl);padding:40px 32px;text-align:center;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">

        <!-- Shimmer Badge -->
        <div style="display:flex;justify-content:center;margin-bottom:20px;">
          <div class="signin-shimmer-pill">
            <span>${isReturning ? '⚡' : '✨'}</span>
            ${isReturning ? 'Welcome Back' : 'AI Career & Skills Platform'}
          </div>
        </div>

        <!-- Brand Icon -->
        <div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,rgba(245,158,11,0.25),rgba(217,119,6,0.1));border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 20px;box-shadow:0 0 30px rgba(245,158,11,0.3);">
          ⚡
        </div>

        <!-- Heading -->
        <div style="font-size:26px;font-weight:900;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:6px;">
          ${isReturning && lastUserFirstName ? `Welcome Back, ${escapeHtml(lastUserFirstName)}` : 'Career Engine'}
        </div>
        <div style="font-size:12px;color:var(--gold-light);font-weight:600;margin-bottom:10px;">
          AI Career & Skill Intelligence Platform
        </div>

        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:28px;">
          ${isReturning
            ? 'Sign in to access your personal skills roadmap, resume benchmarks, and career telemetry.'
            : 'Sign in with Google to get started. We\'ll walk you through importing your resume to build your personalized workspace.'}
        </p>

        <!-- Google Sign-In Button Area -->
        <div style="background:rgba(6,8,13,0.7);border:1px solid rgba(255,255,255,0.09);border-radius:var(--radius-lg);padding:20px 18px;margin-bottom:16px;">

          <!-- GIS Host (hidden — used by Google SDK) -->
          <div id="landing-google-btn-container" style="display:none;"></div>

          <!-- Custom styled Google button -->
          <button class="btn w-full" id="btn-trigger-google-auth" style="background:#ffffff;color:#1f1f1f;font-weight:600;font-size:14px;border:1px solid #dadce0;border-radius:24px;padding:12px 18px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,0.15);cursor:pointer;transition:box-shadow 0.2s ease;">
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            <span style="color:#3c4043;font-weight:600;">${buttonLabel}</span>
          </button>

          <div id="landing-popup-notice" style="margin-top:10px;font-size:11px;color:var(--text-secondary);background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.07);border-radius:var(--radius-sm);padding:7px 12px;line-height:1.5;">
            ${isReturning
              ? '🔒 Your session and data are private and isolated to your account.'
              : '🔒 Your data is private. We don\'t share or sell your information.'}
          </div>
        </div>

        <!-- What happens next — only for new users -->
        ${!isReturning ? `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px;text-align:left;">
          <div style="font-size:11px;font-weight:700;color:var(--gold-light);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">What happens next</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--text-secondary);">
              <span style="color:var(--gold);font-weight:700;min-width:16px;">1</span>
              <span>Sign in with your Google account — takes 5 seconds</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--text-secondary);">
              <span style="color:var(--gold);font-weight:700;min-width:16px;">2</span>
              <span>Upload or paste your resume — we extract your skills, experience &amp; ATS score</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--text-secondary);">
              <span style="color:var(--gold);font-weight:700;min-width:16px;">3</span>
              <span>Review extracted data &amp; fill any missing fields</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--text-secondary);">
              <span style="color:var(--gold);font-weight:700;min-width:16px;">4</span>
              <span>Click <strong style="color:var(--gold-light);">Create My Profile</strong> — your personal dashboard is built from your resume</span>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Showcase / Demo banner -->
        <div style="background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius-md);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
          <span style="font-size:11px;color:var(--text-secondary);">Want to explore the demo first?</span>
          <button class="btn btn-ghost btn-sm" id="btn-landing-showcase" style="font-size:11px;color:var(--gold-light);padding:2px 10px;white-space:nowrap;">
            Explore Demo Profile ↗
          </button>
        </div>

        <!-- Legal -->
        <div style="padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:var(--text-dim);line-height:1.5;">
          By continuing, you agree to our
          <div style="margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;">
            <a href="#terms" id="link-signin-terms" style="color:var(--gold-light);text-decoration:underline;cursor:pointer;">Terms of Service</a>
            <span>•</span>
            <a href="#agreement" id="link-signin-agreement" style="color:var(--gold-light);text-decoration:underline;cursor:pointer;">User Agreement &amp; IP Notice</a>
          </div>
        </div>

      </div>
    </div>
  `;

  // ── Event Bindings ───────────────────────────────────────────

  // Showcase / demo mode
  document.getElementById('btn-landing-showcase')?.addEventListener('click', () => {
    sessionStorage.setItem('careerEngine_showcase_active', 'true');
    cleanupMotionBackground();
    window.location.hash = '#dashboard';
    window.location.reload();
  });

  // Legal links
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

  // Custom Google button click (triggers GSI prompt)
  document.getElementById('btn-trigger-google-auth')?.addEventListener('click', async () => {
    let activeClientId = getGoogleClientId();
    if (!activeClientId) activeClientId = await fetchAuthConfig();
    if (!activeClientId) {
      window.toast?.('Google OAuth is initializing, please wait a moment and try again.', 'gold');
      return;
    }
    if (typeof window.google === 'undefined' || !window.google?.accounts?.id) {
      window.toast?.('Google Identity Services is loading...', 'gold');
      return;
    }
    const notice = document.getElementById('landing-popup-notice');
    if (notice) {
      notice.innerHTML = '⏳ Opening Google account chooser... If nothing appears, allow popups for this site.';
      notice.style.borderColor = 'var(--gold)';
      notice.style.color = 'var(--gold-light)';
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        if (notice) {
          notice.innerHTML = '⚠️ Google chooser blocked. Allow popups for this site, then click again.';
          notice.style.borderColor = 'rgba(239,68,68,0.45)';
          notice.style.color = '#fca5a5';
        }
      }
    });
  });

  // Initialize GIS Google Sign-In button
  _initGoogleButton(buttonTextMode, isReturning);

  // Constellation animation
  initConstellationCanvas();
}

// ─────────────────────────────────────────────────────────────
// PHASE 2: Resume Upload Page (shown after new-user Google auth)
// ─────────────────────────────────────────────────────────────
export function renderResumeUploadPage(session) {
  const content = document.getElementById('page-content');
  if (!content) return;

  cleanupMotionBackground();
  _attachMotionBackground();

  const userName = session?.user?.name?.split(' ')[0] || 'there';
  const userEmail = session?.user?.email || '';

  content.innerHTML = `
    <div style="min-height:88vh;min-height:88dvh;display:flex;align-items:center;justify-content:center;padding:20px 16px;position:relative;z-index:10;">
      <div class="signin-glass-card" style="max-width:560px;width:100%;border-radius:var(--radius-xl);padding:36px 32px;text-align:center;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">

        <!-- Step indicator -->
        <div style="display:flex;justify-content:center;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#4ade80;">✓</div>
            <div style="width:40px;height:1px;background:rgba(255,255,255,0.15);"></div>
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(245,158,11,0.25);border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold);">2</div>
            <div style="width:40px;height:1px;background:rgba(255,255,255,0.08);"></div>
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-dim);">3</div>
            <div style="width:40px;height:1px;background:rgba(255,255,255,0.08);"></div>
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-dim);">4</div>
          </div>
        </div>
        <div style="display:flex;justify-content:center;gap:0;margin-bottom:22px;">
          <div style="font-size:10px;color:var(--text-dim);width:170px;text-align:center;">✓ Google Verified</div>
          <div style="font-size:10px;color:var(--gold);font-weight:700;width:120px;text-align:center;">Upload Resume</div>
          <div style="font-size:10px;color:var(--text-dim);width:80px;text-align:center;">Review</div>
          <div style="font-size:10px;color:var(--text-dim);width:80px;text-align:center;">Create Profile</div>
        </div>

        <!-- Brand icon + heading -->
        <div style="font-size:36px;margin-bottom:10px;">📄</div>
        <div style="font-size:22px;font-weight:900;color:var(--text-primary);letter-spacing:-0.4px;margin-bottom:6px;">
          Hey ${escapeHtml(userName)}, let's build your profile!
        </div>
        <div style="font-size:12px;color:var(--gold-light);font-weight:600;margin-bottom:10px;">
          ${escapeHtml(userEmail)}
        </div>
        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:22px;">
          Upload your resume and we'll automatically extract your skills, work history, ATS score, and career highlights to build your personal workspace — completely separate from any demo data.
        </p>

        <!-- Upload container -->
        <div id="resume-upload-container">

          <!-- Dropzone -->
          <div class="resume-dropzone" id="resume-dropzone" style="margin-bottom:0;">
            <input type="file" id="resume-file-input" accept=".pdf,.docx,.txt,.md" style="display:none;" />
            <div class="dropzone-icon-wrap" style="font-size:28px;">📎</div>
            <div class="dropzone-title">Drag &amp; Drop Your Resume Here</div>
            <div class="dropzone-sub">or click to browse from your device</div>
            <div class="dropzone-formats">
              <span class="dropzone-chip">PDF</span>
              <span class="dropzone-chip">DOCX</span>
              <span class="dropzone-chip">TXT</span>
              <span class="dropzone-chip">Markdown</span>
            </div>
          </div>

          <!-- Paste text toggle -->
          <div style="margin-top:14px;display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:1px;background:rgba(255,255,255,0.07);"></div>
            <button class="btn btn-ghost btn-sm" id="btn-toggle-paste" style="font-size:11px;color:var(--text-dim);padding:3px 10px;white-space:nowrap;">
              📋 Or paste resume text instead
            </button>
            <div style="flex:1;height:1px;background:rgba(255,255,255,0.07);"></div>
          </div>

          <div id="paste-text-wrapper" style="display:none;margin-top:12px;text-align:left;">
            <textarea id="direct-resume-text" class="input" rows="6"
              placeholder="Paste your resume, LinkedIn About section, or work history here...&#10;&#10;We'll extract your skills, experience, and contact details automatically."
              style="font-size:12px;line-height:1.6;resize:vertical;"></textarea>
            <button class="btn btn-gold btn-sm w-full" id="btn-parse-pasted-text" style="margin-top:10px;padding:10px;font-weight:700;justify-content:center;">
              ⚡ Analyze Pasted Resume
            </button>
          </div>

        </div>

        <!-- Missing fields note -->
        <div style="margin-top:16px;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.2);border-radius:var(--radius-md);padding:10px 14px;text-align:left;">
          <div style="font-size:11px;color:#7dd3fc;font-weight:600;margin-bottom:3px;">💡 Don't have your resume handy?</div>
          <div style="font-size:11px;color:var(--text-secondary);line-height:1.5;">
            You can paste your LinkedIn summary, type your work history, or fill in the fields manually. After we analyze it, we'll highlight anything that's missing and let you fill those in before creating your profile.
          </div>
        </div>

      </div>
    </div>
  `;

  // ── Dropzone event bindings ──────────────────────────────────
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
      const file = e.dataTransfer?.files?.[0];
      if (file) _processUploadedResume(file, session);
    });
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) _processUploadedResume(file, session);
    });
  }

  // Toggle paste area
  document.getElementById('btn-toggle-paste')?.addEventListener('click', () => {
    const wrapper = document.getElementById('paste-text-wrapper');
    if (!wrapper) return;
    const isHidden = wrapper.style.display === 'none';
    wrapper.style.display = isHidden ? 'block' : 'none';
    if (isHidden) document.getElementById('direct-resume-text')?.focus();
  });

  // Parse pasted text
  document.getElementById('btn-parse-pasted-text')?.addEventListener('click', () => {
    const text = document.getElementById('direct-resume-text')?.value?.trim();
    if (!text || text.length < 30) {
      window.toast?.('Please paste at least a few lines of your resume or work history.', 'gold');
      return;
    }
    _showAnalysisProgress('Analyzing pasted resume text...');
    setTimeout(() => {
      const parsedResult = analyzeResumeText(text, 'pasted-resume.txt');
      // Pre-fill email from their Google session
      if (parsedResult.profile?.contact) {
        parsedResult.profile.contact.email = parsedResult.profile.contact.email || session?.user?.email || '';
        parsedResult.profile.contact.name = parsedResult.profile.contact.name || session?.user?.name || '';
      }
      openResumeReviewModal(parsedResult);
    }, 500);
  });

  initConstellationCanvas();
}

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

async function _processUploadedResume(file, session) {
  _showAnalysisProgress(`Reading ${file.name}...`);
  try {
    const { text, fileName } = await extractTextFromFile(file);
    _updateAnalysisProgress('Detecting skills, roles, and ATS readiness...');
    await new Promise(r => setTimeout(r, 500));

    const parsedResult = analyzeResumeText(text, fileName);

    // Pre-populate from Google session if the parser didn't detect them
    if (parsedResult.profile?.contact) {
      parsedResult.profile.contact.email = parsedResult.profile.contact.email || session?.user?.email || '';
      parsedResult.profile.contact.name  = parsedResult.profile.contact.name  || session?.user?.name  || '';
    }

    // Open review modal — user verifies extracted data, then clicks "Create My Profile"
    openResumeReviewModal(parsedResult);
  } catch (err) {
    logError(err, 'Resume parse error');
    window.toast?.(err.message || 'Could not read the file. Try pasting your resume text instead.', 'red');
    // Reset — show upload page again
    renderResumeUploadPage(session);
    setTimeout(() => {
      const wrapper = document.getElementById('paste-text-wrapper');
      if (wrapper) wrapper.style.display = 'block';
    }, 100);
  }
}

function _showAnalysisProgress(msg) {
  const container = document.getElementById('resume-upload-container');
  if (!container) return;
  container.innerHTML = `
    <div class="analysis-progress-card" style="padding:28px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;">
      <div class="parsing-spinner"></div>
      <div>
        <div style="font-weight:700;font-size:15px;color:var(--gold-light);margin-bottom:6px;" id="analysis-status-text">
          ${msg}
        </div>
        <div style="font-size:12px;color:var(--text-secondary);">
          Extracting contact info, technical skills, work history, and ATS readiness score...
        </div>
      </div>
    </div>
  `;
}

function _updateAnalysisProgress(msg) {
  const el = document.getElementById('analysis-status-text');
  if (el) el.textContent = msg;
}

function _initGoogleButton(buttonTextMode, isReturning) {
  const activeClientId = getGoogleClientId();
  if (!activeClientId) return;

  renderGoogleSignInButton('landing-google-btn-container', (session, isNewUser) => {
    cleanupMotionBackground();

    if (isNewUser) {
      // New user (including deleted accounts re-registering) → go to resume upload
      logAuth('AUTH_NEW_USER_REDIRECT_TO_UPLOAD', { email: session?.user?.email });
      window.toast?.(`Welcome, ${session?.user?.name?.split(' ')[0] || 'there'}! Let's import your resume to build your profile.`, 'gold');
      renderResumeUploadPage(session);
    } else {
      // Returning user with an existing profile → dashboard
      window.navigate?.('dashboard');
    }
  }, buttonTextMode);
}

function _attachMotionBackground() {
  if (document.getElementById('signin-bg-root')) return;
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
}

export function cleanupMotionBackground() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  const bg = document.getElementById('signin-bg-root');
  if (bg) bg.remove();
}

// ─────────────────────────────────────────────────────────────
// Interactive Constellation Canvas Animation
// ─────────────────────────────────────────────────────────────
function initConstellationCanvas() {
  const canvas = document.getElementById('signin-constellation-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width  = (canvas.width  = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const onResize = () => {
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  const mouse = { x: -1000, y: -1000, radius: 140 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const count = Math.min(80, Math.floor((width * height) / 16000));
  const colors = [
    { r: 245, g: 158, b: 11  },
    { r: 56,  g: 189, b: 248 },
    { r: 168, g: 85,  b: 247 },
    { r: 52,  g: 211, b: 153 },
  ];
  const particles = Array.from({ length: count }, () => {
    const color = colors[Math.floor(Math.random() * colors.length)];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
      color,
      alpha: Math.random() * 0.5 + 0.3,
    };
  });

  function animate() {
    if (!document.getElementById('signin-constellation-canvas')) {
      window.removeEventListener('resize', onResize);
      return;
    }
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width)  p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      const dx   = mouse.x - p.x;
      const dy   = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouse.radius) {
        const angle = Math.atan2(dy, dx);
        const force = (mouse.radius - dist) / mouse.radius;
        p.x -= Math.cos(angle) * force * 1.2;
        p.y -= Math.sin(angle) * force * 1.2;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle    = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
      ctx.shadowBlur   = 8;
      ctx.shadowColor  = `rgba(${p.color.r},${p.color.g},${p.color.b},0.8)`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2  = particles[j];
        const dxx = p.x - p2.x;
        const dyy = p.y - p2.y;
        const d   = Math.sqrt(dxx * dxx + dyy * dyy);
        if (d < 125) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${(1 - d / 125) * 0.22})`;
          ctx.lineWidth   = 0.8;
          ctx.shadowBlur  = 0;
          ctx.stroke();
        }
      }

      if (dist < mouse.radius) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(245,158,11,${(1 - dist / mouse.radius) * 0.35})`;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  animate();
}
