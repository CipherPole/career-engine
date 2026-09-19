/* ============================================================
   APP.JS — Core Router, State Manager & Navigation
   ============================================================ */

'use strict';

import { initGoogleAuth, renderAuthPill, getCurrentUser, isOwner, hasPermission, renderAccessDenied, getActiveSession, ROLES, fetchAuthConfig } from './auth-engine.js?v=6';
import { logEvent, LOG_LEVELS, LOG_CATEGORIES } from './telemetry-engine.js?v=6';

// ── Global State ─────────────────────────────────────────────
const State = {
  resumeData:           null,
  skillsData:           null,
  projectsData:         null,
  trainingProjectsData: [],
  certsData:            [],
  jobsData:             [],
  currentPage:          'dashboard',
};
// Expose on window so dynamically-imported engine modules can read it
window._state = State;

// ── RBAC Route Permissions ────────────────────────────────────
const ROUTE_PERMISSIONS = {
  signin:    ROLES.GUEST,
  terms:     ROLES.GUEST,
  agreement: ROLES.GUEST,
  dashboard: ROLES.GUEST,
  resume:    ROLES.GUEST,
  linkedin:  ROLES.GUEST,
  jobs:      ROLES.USER,
  cover:     ROLES.GUEST,
  training:  ROLES.GUEST,
  certs:     ROLES.GUEST,
  projects:  ROLES.GUEST,
  settings:  ROLES.ADMIN, // Restricted exclusively to Creator / Owner
};

// ── Router ────────────────────────────────────────────────────
const PAGES = {
  signin:     () => import('./signin-engine.js?v=6').then(m => m.renderSignInPage()),
  terms:      () => import('./legal-engine.js?v=6').then(m => m.renderLegalPage('terms')),
  agreement:  () => import('./legal-engine.js?v=6').then(m => m.renderLegalPage('agreement')),
  dashboard:  () => import('./resume-engine.js?v=6').then(m => m.renderDashboard()),
  resume:     () => import('./resume-engine.js?v=6').then(m => m.renderResumeStudio()),
  linkedin:   () => import('./linkedin-engine.js?v=6').then(m => m.renderLinkedInOptimizer()),
  jobs:       () => import('./tracker-engine.js?v=6').then(m => m.renderJobTracker()),
  skills:     () => import('./resume-engine.js?v=6').then(m => m.renderSkillGap()),
  training:   () => import('./training-engine.js?v=6').then(m => m.renderTrainingHub()),
  certs:      () => import('./cert-engine.js?v=6').then(m => m.renderCertifications()),
  projects:   () => import('./project-showcase.js?v=6').then(m => m.renderProjects()),
  settings:   () => import('./auth-engine.js?v=6').then(m => m.renderSettingsPage()),
  cover:      () => renderCoverLetterPage(),
};

async function navigate(pageId) {
  if (!PAGES[pageId]) return;

  // Manage Full-Screen Sign-In & Legal Gateway state
  const sidebar = document.getElementById('sidebar');
  const pill = document.getElementById('user-auth-pill');
  const isGate = (pageId === 'signin') || ((pageId === 'terms' || pageId === 'agreement') && !getActiveSession().isLoggedIn);
  if (isGate) {
    document.body.classList.add('is-signin-gate');
    if (sidebar) sidebar.style.display = 'none';
    if (pill) pill.style.display = 'none';
  } else {
    document.body.classList.remove('is-signin-gate');
    if (sidebar) sidebar.style.display = '';
    if (pill) pill.style.display = 'flex';
    import('./signin-engine.js').then(m => m.cleanupMotionBackground?.());
  }

  // Zero-Trust RBAC Route Guard
  const requiredRole = ROUTE_PERMISSIONS[pageId] || ROLES.GUEST;
  if (!hasPermission(requiredRole)) {
    logEvent(LOG_LEVELS.WARN, LOG_CATEGORIES.RBAC, `ACCESS_DENIED -> #${pageId}`, {
      pageId,
      requiredRole,
    });
    State.currentPage = pageId;
    renderAccessDenied(requiredRole);
    return;
  }

  logEvent(LOG_LEVELS.INFO, LOG_CATEGORIES.ROUTER, `NAVIGATE -> #${pageId}`, {
    pageId,
    previousPage: State.currentPage,
  });

  State.currentPage = pageId;

  // Auto-close mobile sidebar if open
  document.getElementById('sidebar')?.classList.remove('open');

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // Render page
  const content = document.getElementById('page-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(8px)';

  await PAGES[pageId]();

  requestAnimationFrame(() => {
    content.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  });
}

// ── Data Loaders ──────────────────────────────────────────────
async function loadData() {
  try {
    const [resume, skills, projects, jobs, trainingProjects, certs] = await Promise.all([
      fetch('./data/resume.json').then(r => r.json()),
      fetch('./data/skills.json').then(r => r.json()),
      fetch('./data/projects.json').then(r => r.json()),
      fetch('./data/jobs.json').then(r => r.json()).catch(() => []),
      fetch('./data/training-projects.json').then(r => r.json()).catch(() => []),
      fetch('./data/certifications.json').then(r => r.json()).catch(() => []),
    ]);

    const user = getCurrentUser();
    if (isOwner()) {
      State.resumeData = resume;
    } else {
      const customProfile = localStorage.getItem(`careerEngine_profile_${user.email}`);
      if (customProfile) {
        try {
          const parsed = JSON.parse(customProfile);
          State.resumeData = { ...resume, ...parsed };
        } catch {
          State.resumeData = resume;
        }
      } else {
        State.resumeData = resume;
      }
    }

    State.skillsData           = skills;
    State.projectsData         = projects;
    State.jobsData             = jobs;
    State.trainingProjectsData = trainingProjects;
    State.certsData            = certs;
  } catch (e) {
    console.warn('Data load error:', e);
  }
}

// ── Toast Notifications ───────────────────────────────────────
function toast(msg, type = 'gold') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const icons = { gold: '⚡', green: '✅', red: '❌' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || '⚡'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
window.toast = toast;

// ── Copy to Clipboard ─────────────────────────────────────────
async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    btn.classList.add('copy-success');
    toast('Copied to clipboard!', 'green');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copy-success'); }, 2000);
  } catch {
    toast('Copy failed — please select & copy manually.', 'red');
  }
}
window.copyToClipboard = copyToClipboard;

// ── Char Counter ──────────────────────────────────────────────
function addCharCounter(textarea, max, counterId) {
  const counter = document.getElementById(counterId);
  if (!counter || !textarea) return;
  const update = () => {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.style.color = len > max ? 'var(--red)' : len > max * 0.9 ? 'var(--gold)' : 'var(--text-dim)';
  };
  textarea.addEventListener('input', update);
  update();
}
window.addCharCounter = addCharCounter;

// ── ATS Score Calculator ──────────────────────────────────────
function calcATSScore(resumeData, skillsData) {
  if (!resumeData || !skillsData) return 42;
  const highDemandKeywords = [
    'devops', 'devsecops', 'kubernetes', 'terraform', 'docker', 'ansible',
    'jenkins', 'aws', 'gcp', 'ci/cd', 'platform', 'automation', 'cloud',
    'python', 'powershell', 'iac', 'agile', 'scrum', 'monitoring'
  ];
  const resumeText = JSON.stringify(resumeData).toLowerCase();
  const found = highDemandKeywords.filter(k => resumeText.includes(k)).length;
  const baseScore = Math.round((found / highDemandKeywords.length) * 65);
  // Penalties / bonuses
  const bonuses = [
    resumeData?.contact?.linkedin ? 5 : 0,
    resumeData?.contact?.github   ? 5 : 0,
    (Array.isArray(resumeData?.experience) && resumeData.experience[0]?.teamSize) ? 5 : 0,
    (resumeData?.accomplishments?.length || 0) > 5 ? 5 : 0,
    (resumeData?.certifications?.length || 0) > 0 ? 5 : 0,
  ];
  return Math.min(100, baseScore + bonuses.reduce((a, b) => a + b, 0));
}
window.calcATSScore = calcATSScore;

// ── LinkedIn Score ────────────────────────────────────────────
function calcLinkedInScore() {
  const checks = [
    { label: 'Professional headline optimized', done: false },
    { label: 'About/Summary 500+ characters', done: false },
    { label: 'Current role with quantified bullets', done: false },
    { label: 'All experience sections filled', done: true },
    { label: 'Skills section (50 skills listed)', done: false },
    { label: 'Profile photo added', done: true },
    { label: 'Custom LinkedIn URL set', done: true },
    { label: 'Open to work (hidden recruiters)', done: false },
    { label: 'Featured section with project links', done: false },
    { label: 'Certifications section populated', done: true },
  ];
  const done = checks.filter(c => c.done).length;
  return { score: Math.round((done / checks.length) * 100), checks };
}
window.calcLinkedInScore = calcLinkedInScore;

// ── Cover Letter Page ─────────────────────────────────────────
function renderCoverLetterPage() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">🎯 Cover Letter & Outreach Generator</div>
      <div class="page-subtitle">Paste a job description to generate a tailored cover letter based on your real experience</div>
    </div>

    <div class="grid-2 gap-20">
      <div>
        <label class="field-label">📋 Paste Job Description</label>
        <textarea id="jd-input" class="field" rows="16" placeholder="Paste the full job description here..."></textarea>
        <div class="flex gap-8 mt-8">
          <button class="btn btn-gold" onclick="generateCoverLetter()">⚡ Generate Cover Letter</button>
          <button class="btn btn-ghost" onclick="generateRecruiterDM()">💬 Recruiter DM</button>
        </div>
      </div>
      <div>
        <label class="field-label">✉️ Generated Output</label>
        <div id="cover-output" class="copy-block" style="min-height:300px;">
          <div class="empty-state">
            <div class="empty-icon">✉️</div>
            <div class="empty-title">Paste a job description to begin</div>
            <div class="empty-desc">The generator will tailor the cover letter to the specific role using your confirmed experience at Bank of America.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-24">
      <div class="section-title">📬 Recruiter Outreach Templates</div>
      <div class="grid-2 gap-16">
        ${renderOutreachTemplate('LinkedIn Connection Request', 220,
          `Hi [Name], I'm a DevOps Lead with 7+ years at Bank of America leading 10+ engineers on cloud infrastructure, Kubernetes, and CI/CD automation at enterprise scale. Your work at [Company] caught my attention — I'd love to connect.`
        )}
        ${renderOutreachTemplate('Follow-Up After Application', 300,
          `Hi [Hiring Manager], I applied for the [Role] position at [Company] on [Date]. With 7+ years leading DevOps/DevSecOps teams at Bank of America (AWS, Kubernetes, Terraform, 80% CI/CD improvement), I believe I'm a strong fit. Happy to connect for a quick call. — Joseph Erexson III`
        )}
      </div>
    </div>
  `;
}

function renderOutreachTemplate(title, maxChars, text) {
  const id = title.replace(/\s+/g, '-').toLowerCase();
  return `
    <div class="copy-block">
      <div class="copy-block-header">
        <span class="copy-block-title">${title}</span>
        <span class="copy-block-meta">${text.length} / ${maxChars} chars</span>
      </div>
      <div class="copy-block-body" id="text-${id}">${text}</div>
      <div style="padding:0 16px 12px;">
        <button class="btn btn-outline btn-sm btn-copy" onclick="copyToClipboard(document.getElementById('text-${id}').textContent, this)">📋 Copy</button>
      </div>
    </div>`;
}

function generateCoverLetter() {
  const jd = document.getElementById('jd-input')?.value?.trim();
  if (!jd) { toast('Please paste a job description first', 'red'); return; }

  // Extract key terms from JD (simple keyword scanning)
  const jdLower = jd.toLowerCase();
  const roleMatch = jd.match(/(?:seeking|looking for|we need|role:|position:?)\s*(?:a|an)?\s*([^\n.]+)/i);
  const roleGuess = roleMatch ? roleMatch[1].trim() : 'this role';

  const keywords = ['kubernetes','terraform','ansible','jenkins','aws','gcp','docker','devops','devsecops','platform','python','ci/cd','automation','cloud'];
  const found = keywords.filter(k => jdLower.includes(k));

  const letter = `Dear Hiring Manager,

I am writing to express my strong interest in ${roleGuess}. With over 10 years of enterprise DevOps and platform engineering experience — including 7+ years embedded at Bank of America leading a cross-functional team of 10+ engineers — I am confident I can deliver immediate and measurable impact in this role.

At Bank of America, I have spearheaded the design and execution of CI/CD pipelines using Jenkins, OpenShift, Docker, and Kubernetes, improving deployment throughput by 80% and reducing manual infrastructure provisioning by 80% through Terraform IaC automation. I designed and own a Postman API collection spanning 500+ endpoints and embedded DevSecOps practices across our entire SDLC.

My hands-on expertise spans ${found.length > 0 ? found.slice(0, 5).join(', ') : 'Kubernetes, Terraform, AWS, Docker, and CI/CD'} — directly matching the requirements outlined in your posting. Beyond my technical skills, I bring a proven track record of leading large engineering teams, aligning platform strategy with business continuity goals, and driving measurable ROI through automation.

I am currently targeting 100% remote senior leadership roles in the $200k+ compensation range. I would welcome the opportunity to discuss how my experience can benefit your team.

Thank you for your consideration.

Joseph Erexson III
jerexson3@gmail.com | 980-447-7049
linkedin.com/in/joseph-erexson-iii-46bb6285/
github.com/CipherPole`;

  const out = document.getElementById('cover-output');
  out.innerHTML = `
    <div class="copy-block-header">
      <span class="copy-block-title">Generated Cover Letter</span>
      <span class="copy-block-meta">${letter.length} chars</span>
    </div>
    <div class="copy-block-body" id="generated-letter">${letter}</div>
    <div style="padding:0 16px 12px;">
      <button class="btn btn-gold btn-sm" onclick="copyToClipboard(document.getElementById('generated-letter').textContent, this)">📋 Copy Full Letter</button>
    </div>`;
  toast('Cover letter generated!', 'green');
}

function generateRecruiterDM() {
  const jd = document.getElementById('jd-input')?.value?.trim();
  const dm = `Hi [Recruiter Name],

I came across the ${jd ? 'open' : ''} role at your company and wanted to reach out directly. I'm a DevOps Lead with 7+ years at Bank of America leading 10+ engineers on Kubernetes, Terraform, AWS/GCP, CI/CD automation, and DevSecOps at enterprise scale.

I'm actively exploring senior remote opportunities in the $200k+ range. Would love to connect and learn more about the role.

— Joseph Erexson III | jerexson3@gmail.com`;

  const out = document.getElementById('cover-output');
  out.innerHTML = `
    <div class="copy-block-header">
      <span class="copy-block-title">LinkedIn Recruiter DM</span>
      <span class="copy-block-meta">${dm.length} / 1900 chars</span>
    </div>
    <div class="copy-block-body" id="generated-dm">${dm}</div>
    <div style="padding:0 16px 12px;">
      <button class="btn btn-gold btn-sm" onclick="copyToClipboard(document.getElementById('generated-dm').textContent, this)">📋 Copy DM</button>
    </div>`;
  toast('Recruiter DM generated!', 'green');
}
window.generateCoverLetter = generateCoverLetter;
window.generateRecruiterDM = generateRecruiterDM;

// ── Sidebar Permissions ───────────────────────────────────────
function updateSidebarPermissions() {
  const systemSection = document.getElementById('sidebar-system-section');
  if (systemSection) {
    systemSection.style.display = isOwner() ? 'block' : 'none';
  }
}
window.updateSidebarPermissions = updateSidebarPermissions;

// ── Init ──────────────────────────────────────────────────────
async function init() {
  await fetchAuthConfig();
  await loadData();

  // Expose navigate globally so engine modules can call it
  window.navigate = navigate;

  // Render top bar auth pill and enforce sidebar RBAC
  renderAuthPill();
  updateSidebarPermissions();
  initGoogleAuth();

  // Activity listeners to update session heartbeat
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => {
    window.addEventListener(evt, () => {
      // Touch session on activity
      const raw = sessionStorage.getItem('careerEngine_session_v2');
      if (raw) {
        try {
          const sess = JSON.parse(raw);
          sess.lastActive = Date.now();
          sessionStorage.setItem('careerEngine_session_v2', JSON.stringify(sess));
        } catch {}
      }
    }, { passive: true });
  });

  // Nav click handlers
  document.querySelectorAll('.nav-item').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.page))
  );

  // Navigate to initial page based on session
  const session = getActiveSession();
  const showcaseActive = sessionStorage.getItem('careerEngine_showcase_active') === 'true';

  if (session.isLoggedIn || showcaseActive) {
    await navigate('dashboard');
  } else {
    await navigate('signin');
  }
}

document.addEventListener('DOMContentLoaded', init);

