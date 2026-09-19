/* ============================================================
   APP.JS — Core Router, State Manager & Navigation
   ============================================================ */

'use strict';

import { initGoogleAuth, renderAuthPill, getCurrentUser, isOwner, hasPermission, renderAccessDenied, getActiveSession, ROLES, fetchAuthConfig, IDLE_TIMEOUT_MS, signOut, hydrateSessionFromServer } from './auth-engine.js?v=7';
import { logEvent, LOG_LEVELS, LOG_CATEGORIES } from './telemetry-engine.js?v=7';

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
  signin:     () => import('./signin-engine.js?v=7').then(m => m.renderSignInPage()),
  terms:      () => import('./legal-engine.js?v=7').then(m => m.renderLegalPage('terms')),
  agreement:  () => import('./legal-engine.js?v=7').then(m => m.renderLegalPage('agreement')),
  dashboard:  () => import('./resume-engine.js?v=7').then(m => m.renderDashboard()),
  resume:     () => import('./resume-engine.js?v=7').then(m => m.renderResumeStudio()),
  linkedin:   () => import('./linkedin-engine.js?v=7').then(m => m.renderLinkedInOptimizer()),
  jobs:       () => import('./tracker-engine.js?v=7').then(m => m.renderJobTracker()),
  skills:     () => import('./resume-engine.js?v=7').then(m => m.renderSkillGap()),
  training:   () => import('./training-engine.js?v=7').then(m => m.renderTrainingHub()),
  certs:      () => import('./cert-engine.js?v=7').then(m => m.renderCertifications()),
  projects:   () => import('./project-showcase.js?v=7').then(m => m.renderProjects()),
  implementation: () => import('./implementation-engine.js?v=7').then(m => m.renderImplementationLab()),
  settings:   () => import('./auth-engine.js?v=7').then(m => m.renderSettingsPage()),
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
    const showcaseActive = sessionStorage.getItem('careerEngine_showcase_active') === 'true';

    if (isOwner() || showcaseActive) {
      State.resumeData = resume;
    } else {
      let serverProfile = null;
      try {
        const profileRes = await fetch('/api/profile', { credentials: 'include' });
        if (profileRes.ok) {
          const body = await profileRes.json();
          if (body?.profile && typeof body.profile === 'object' && body.profile.contact?.name) {
            serverProfile = body.profile;
          }
        }
      } catch {}

      const emailKey = (user.email || '').toLowerCase();
      const localProfileStr = localStorage.getItem(`careerEngine_profile_${emailKey}`) || localStorage.getItem('careerEngine_active_profile');
      
      let effectiveProfile = serverProfile;
      if (!effectiveProfile && localProfileStr) {
        try {
          effectiveProfile = JSON.parse(localProfileStr);
        } catch {}
      }

      if (effectiveProfile && effectiveProfile.contact?.name) {
        // Use user's own profile without contaminating with Joseph's history
        State.resumeData = effectiveProfile;
      } else {
        // Clean initial starter profile for new user
        State.resumeData = {
          meta: {
            lastUpdated: new Date().toISOString().slice(0, 10),
            targetTitle: 'Software & DevOps Engineer',
            targetComp: 175000,
            currentComp: 120000,
            atsScore: 65,
          },
          contact: {
            name: user.name || 'Candidate',
            email: user.email || '',
            phone: '',
            location: 'Remote / United States',
            linkedin: '',
            github: '',
          },
          summary: 'Driven engineering professional focused on high-reliability cloud systems and continuous automation.',
          leadership: { teamSize: '1–5 Engineers', scale: 'Individual Contributor / Lead' },
          experience: [
            {
              id: 'exp-1',
              title: 'Software & DevOps Engineer',
              company: 'Current Organization',
              duration: 'Present',
              teamSize: '1–5',
              highlights: ['Architected and delivered reliable software workflows and automated pipelines.']
            }
          ],
          skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Python', 'Linux'],
          certifications: [],
          education: [{ degree: 'B.S. in Computer Science / Engineering', institution: 'University', year: 'Completed' }],
          accomplishments: ['Streamlined delivery workflows and elevated deployment predictability.']
        };
      }
    }

    State.skillsData           = skills;
    State.projectsData         = projects;
    State.jobsData             = jobs;
    State.trainingProjectsData = trainingProjects;
    State.certsData            = certs;

    updateSidebarMetrics();
  } catch (e) {
    console.warn('Data load error:', e);
  }
}

function updateSidebarMetrics() {
  const profile = State.resumeData;
  if (!profile) return;
  const curr = profile.meta?.currentComp || 120000;
  const target = profile.meta?.targetComp || 180000;
  const gap = Math.max(0, target - curr);
  const percent = Math.min(100, Math.round((curr / target) * 100));

  const formatK = val => `$${Math.round(val / 1000)}k`;
  
  const compLabel = document.querySelector('.sidebar-footer div:nth-child(1)');
  const gapLabel = document.querySelector('.sidebar-footer div:nth-child(2)');
  const fill = document.getElementById('sidebar-comp-bar');

  if (compLabel) compLabel.textContent = `${formatK(curr)} → ${formatK(target)}`;
  if (gapLabel) gapLabel.textContent = `Compensation Gap: ${formatK(gap)}`;
  if (fill) fill.style.width = `${percent}%`;
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

  const profile = State.resumeData || {};
  const name = profile.contact?.name || 'Applicant';
  const email = profile.contact?.email || '';
  const phone = profile.contact?.phone || '';
  const linkedin = profile.contact?.linkedin || '';
  const github = profile.contact?.github || '';
  const targetTitle = profile.meta?.targetTitle || 'Software & DevOps Engineer';
  const targetComp = profile.meta?.targetComp ? `$${Math.round(profile.meta.targetComp / 1000)}k+` : '$175k+';
  const topCompany = profile.experience?.[0]?.company || 'Enterprise Teams';
  const highlights = profile.experience?.[0]?.highlights?.[0] || 'architecting and scaling robust cloud and automation infrastructure';
  const userSkills = profile.skills?.length ? profile.skills.slice(0, 5).join(', ') : 'Kubernetes, Terraform, AWS, Docker, and CI/CD';

  // Extract key terms from JD
  const jdLower = jd.toLowerCase();
  const roleMatch = jd.match(/(?:seeking|looking for|we need|role:|position:?)\s*(?:a|an)?\s*([^\n.]+)/i);
  const roleGuess = roleMatch ? roleMatch[1].trim() : targetTitle;

  const letter = `Dear Hiring Manager,

I am writing to express my strong interest in the ${roleGuess} position. With verified hands-on engineering experience — including driving technical delivery at ${topCompany} — I am confident I can make an immediate and measurable impact on your platform and delivery velocity.

Throughout my career, I have focused on ${highlights}. I specialize in building reliable, scalable systems utilizing ${userSkills}, directly aligning with the core requirements outlined in your job description.

Beyond hands-on implementation, I bring a structured approach to engineering excellence, operational stability, and accelerating release cycles. I am currently targeting opportunities in the ${targetComp} range and would welcome the opportunity to discuss how my skill set aligns with your team's objectives.

Thank you for your consideration.

${name}
${email ? email : ''}${phone ? ' | ' + phone : ''}
${linkedin ? linkedin : ''}${github ? ' | ' + github : ''}`.trim();

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
  const profile = State.resumeData || {};
  const name = profile.contact?.name || 'Engineer';
  const email = profile.contact?.email || '';
  const targetTitle = profile.meta?.targetTitle || 'Senior DevOps Engineer';
  const targetComp = profile.meta?.targetComp ? `$${Math.round(profile.meta.targetComp / 1000)}k+` : '$175k+';
  const userSkills = profile.skills?.length ? profile.skills.slice(0, 4).join(', ') : 'Kubernetes, Terraform, AWS, CI/CD';

  const dm = `Hi [Recruiter Name],

I noticed the ${jd ? 'open' : ''} ${targetTitle} opportunity at your organization and wanted to connect directly. I have extensive hands-on experience scaling platforms and automated delivery pipelines with ${userSkills}.

I'm actively exploring senior opportunities in the ${targetComp} range. Would love to connect and learn more about what your team is building.

— ${name}${email ? ' | ' + email : ''}`;

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
  await hydrateSessionFromServer();
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

  // Enforce inactivity lock in runtime so stale sessions are proactively revoked.
  setInterval(() => {
    try {
      const raw = sessionStorage.getItem('careerEngine_session_v2') || localStorage.getItem('careerEngine_session_v2');
      if (!raw) return;
      const sess = JSON.parse(raw);
      if (!sess?.isLoggedIn) return;
      if (sess.lastActive && (Date.now() - sess.lastActive) > IDLE_TIMEOUT_MS) {
        signOut();
        toast('Session locked due to inactivity. Please sign in again.', 'gold');
      }
    } catch {}
  }, 15000);

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

