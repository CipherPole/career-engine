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
} from './auth-engine.js?v=8';

import {
  logAuth,
  logError,
  logEvent,
  LOG_LEVELS,
  LOG_CATEGORIES,
} from './telemetry-engine.js?v=8';

import { extractTextFromFile, analyzeResumeText } from './resume-parser.js';
import { openResumeReviewModal } from './onboarding-wizard.js';

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
  const buttonLabel = isReturning ? 'Continue with Google' : 'Sign In with Google';

  logAuth('SIGNIN_GATE_VIEWED', { isReturning, buttonTextMode, clientIdConfigured: !!clientId });

  const pageHeading = isReturning 
    ? `Welcome Back${lastUserName ? ', ' + lastUserName : ''}` 
    : 'Import Your Resume to Start';
  const pageSubtitle = isReturning
    ? 'Continue to your personal skills roadmap, interactive radar benchmarks, and career telemetry.'
    : 'Drag and drop your resume to automatically extract your skills, analyze ATS readiness, and generate your dashboard.';
  const badgeLabel = isReturning ? '⚡ Welcome Back' : '✨ Instant Resume Import • Private Workspace';

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
    <div style="min-height:88vh;min-height:88dvh;display:flex;align-items:center;justify-content:center;padding:20px 16px;position:relative;z-index:10;">
      <div class="signin-glass-card" style="max-width:540px;width:100%;border-radius:var(--radius-xl);padding:36px 28px;text-align:center;position:relative;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        
        <!-- Context-Aware Shimmer Badge -->
        <div style="display:flex;justify-content:center;">
          <div class="signin-shimmer-pill">
            <span>⚡</span> ${badgeLabel}
          </div>
        </div>

        <!-- Brand Icon with Pulsing Gold Halo -->
        <div style="width:58px;height:58px;border-radius:var(--radius-lg);background:linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.1));border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 14px;box-shadow:0 0 25px rgba(245, 158, 11, 0.3);">
          ⚡
        </div>

        <div style="font-size:24px;font-weight:900;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:6px;">
          ${pageHeading}
        </div>
        <div style="font-size:12px;color:var(--gold-light);font-weight:600;margin-bottom:12px;">
          AI Career & Skill Intelligence Platform
        </div>

        <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:20px;">
          ${pageSubtitle}
        </p>

        <!-- Dynamic Container: Dropzone OR Analysis Progress -->
        <div id="landing-import-container" style="margin-bottom:20px;">
          
          <!-- Drag & Drop Zone -->
          <div class="resume-dropzone" id="resume-dropzone">
            <input type="file" id="resume-file-input" accept=".pdf,.docx,.txt,.md" style="display:none;" />
            <div class="dropzone-icon-wrap">📄</div>
            <div class="dropzone-title">Drag & Drop Your Resume Here</div>
            <div class="dropzone-sub">or click to browse from your computer</div>
            <div class="dropzone-formats">
              <span class="dropzone-chip">PDF</span>
              <span class="dropzone-chip">DOCX</span>
              <span class="dropzone-chip">TXT</span>
              <span class="dropzone-chip">Markdown</span>
            </div>
          </div>

          <!-- Paste Text Collapsible Option -->
          <div style="margin-top:12px;text-align:right;">
            <button class="btn btn-ghost btn-sm" id="btn-toggle-paste" style="font-size:11px;padding:3px 8px;color:var(--text-dim);">
              📋 Or paste resume text
            </button>
          </div>

          <div id="paste-text-wrapper" style="display:none;margin-top:10px;text-align:left;">
            <textarea id="direct-resume-text" class="input" rows="5" placeholder="Paste your resume content or LinkedIn summary here..." style="font-size:12px;"></textarea>
            <button class="btn btn-gold btn-sm w-full mt-8" id="btn-parse-pasted-text" style="padding:8px 12px;font-weight:700;">
              ⚡ Analyze Pasted Resume
            </button>
          </div>
        </div>

        <!-- Divider with label -->
        <div style="display:flex;align-items:center;gap:12px;margin:20px 0 16px;">
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></div>
          <span style="font-size:11px;color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
            ${isReturning ? 'Returning User Sign In' : 'Or Existing Google Account'}
          </span>
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></div>
        </div>

        <!-- Google Authentication Button -->
        <div style="background:rgba(6, 8, 13, 0.7);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius-lg);padding:16px 14px;margin-bottom:12px;">
          
          <!-- Hidden GIS host -->
          <div id="landing-google-btn-container" style="display:none;"></div>

          <!-- Explicit styled button -->
          <div id="landing-custom-google-wrapper" style="display:block;">
            <button class="btn w-full" id="btn-trigger-google-auth" style="background:#ffffff;color:#1f1f1f;font-weight:600;font-size:13px;border:1px solid #dadce0;border-radius:24px;padding:10px 16px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.12);cursor:pointer;">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span style="color:#3c4043;font-weight:600;">${buttonLabel}</span>
            </button>
          </div>

          <div id="landing-popup-notice" style="margin-top:10px;font-size:11px;color:var(--text-secondary);background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:6px 10px;line-height:1.4;">
            ${isReturning ? 'Sign in to access your saved resume, benchmarks & job tracker.' : 'Have an existing account? Click above to sign in.'}
          </div>
        </div>

        <!-- Showcase Banner Link -->
        <div style="background:rgba(245, 158, 11, 0.04);border:1px solid rgba(245, 158, 11, 0.15);border-radius:var(--radius-md);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
          <span style="font-size:11px;color:var(--text-secondary);">Looking to explore the demo first?</span>
          <button class="btn btn-ghost btn-sm" id="btn-landing-showcase" style="font-size:11px;color:var(--gold-light);padding:2px 8px;">
            Explore Joseph's Profile ↗
          </button>
        </div>

        <!-- Terms of Service Notice -->
        <div style="padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:var(--text-dim);line-height:1.5;">
          <span>By continuing, you agree to our</span>
          <div style="margin-top:2px;display:flex;align-items:center;justify-content:center;gap:8px;">
            <a href="#terms" id="link-signin-terms" style="color:var(--gold-light);text-decoration:underline;cursor:pointer;">Terms of Service</a>
            <span>•</span>
            <a href="#agreement" id="link-signin-agreement" style="color:var(--gold-light);text-decoration:underline;cursor:pointer;">User Agreement & IP Notice</a>
          </div>
        </div>

      </div>
    </div>
  `;

  // ── Attach Drag & Drop Listeners ───────────────────────────
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
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processUploadedResume(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        processUploadedResume(file);
      }
    });
  }

  // Toggle pasted text area
  document.getElementById('btn-toggle-paste')?.addEventListener('click', () => {
    const wrapper = document.getElementById('paste-text-wrapper');
    if (wrapper) {
      const isHidden = wrapper.style.display === 'none';
      wrapper.style.display = isHidden ? 'block' : 'none';
      if (isHidden) document.getElementById('direct-resume-text')?.focus();
    }
  });

  // Parse pasted text handler
  document.getElementById('btn-parse-pasted-text')?.addEventListener('click', () => {
    const text = document.getElementById('direct-resume-text')?.value?.trim();
    if (!text || text.length < 30) {
      window.toast?.('Please paste your resume text or experience summary (at least 30 characters).', 'gold');
      return;
    }
    showAnalysisProgress('Analyzing pasted resume text...');
    setTimeout(() => {
      const parsedResult = analyzeResumeText(text, 'pasted-resume.txt');
      openResumeReviewModal(parsedResult);
      renderSignInPage(); // Reset dropzone state
    }, 400);
  });

  // Function to process file through client-side parser
  async function processUploadedResume(file) {
    showAnalysisProgress(`Extracting content from ${file.name}...`);
    try {
      const { text, fileName } = await extractTextFromFile(file);
      updateAnalysisProgress('Analyzing skills, work history, and ATS readiness...');
      await new Promise(r => setTimeout(r, 450));
      
      const parsedResult = analyzeResumeText(text, fileName);
      openResumeReviewModal(parsedResult);
      renderSignInPage();
    } catch (err) {
      console.error('Resume parse error:', err);
      window.toast?.(err.message || 'Failed reading resume file. You can paste the text below.', 'red');
      renderSignInPage();
      const wrapper = document.getElementById('paste-text-wrapper');
      if (wrapper) wrapper.style.display = 'block';
    }
  }

  function showAnalysisProgress(msg) {
    const container = document.getElementById('landing-import-container');
    if (container) {
      container.innerHTML = `
        <div class="analysis-progress-card">
          <div class="parsing-spinner"></div>
          <div style="font-weight:700;font-size:14px;color:var(--gold-light);margin-bottom:6px;" id="analysis-status-text">
            ${msg}
          </div>
          <div style="font-size:11px;color:var(--text-secondary);">
            Extracting contact info, technical skills, and evaluating ATS readiness...
          </div>
        </div>
      `;
    }
  }

  function updateAnalysisProgress(msg) {
    const el = document.getElementById('analysis-status-text');
    if (el) el.textContent = msg;
  }

  // Showcase mode click
  document.getElementById('btn-landing-showcase')?.addEventListener('click', () => {
    sessionStorage.setItem('careerEngine_showcase_active', 'true');
    cleanupMotionBackground();
    window.location.hash = '#dashboard';
    window.location.reload();
  });

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
      const notice = document.getElementById('landing-popup-notice');
      if (notice) {
        notice.innerHTML = '⏳ Opening Google account chooser... if nothing appears, allow popups for this site and try again.';
        notice.style.borderColor = 'var(--gold)';
        notice.style.color = 'var(--gold-light)';
      }
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          const helper = document.getElementById('landing-popup-notice');
          if (helper) {
            helper.innerHTML = 'Google chooser did not open. Allow popups for this site and disable strict ad blockers, then click again.';
            helper.style.borderColor = 'rgba(239,68,68,0.45)';
            helper.style.color = '#fca5a5';
          }
        }
      });
    } catch (e) {
      console.error('Google Sign-In Error:', e);
    }
  });

  // Render official Google button
  function initLandingGoogleButton() {
    const activeClientId = getGoogleClientId();
    const customWrapper = document.getElementById('landing-custom-google-wrapper');
    if (activeClientId) {
      if (customWrapper) customWrapper.style.display = 'block';
      renderGoogleSignInButton('landing-google-btn-container', (session, isNewUser) => {
        cleanupMotionBackground();
        window.navigate?.('dashboard');
        if (isNewUser) {
          openOnboardingWizard();
        }
      }, buttonTextMode);
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
