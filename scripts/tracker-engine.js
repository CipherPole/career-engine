/* ============================================================
   TRACKER-ENGINE.JS — Job Tracker, Company Research & Fit
   Pipeline, job description analysis, research log, scorecard
   ============================================================ */

'use strict';

import { getCurrentUser } from './auth-engine.js?v=8';
import {
  CRITERIA,
  collectUserSkills,
  analyzeJobDescription,
  skillsScoreToRating,
  computeFitScore,
  buildResearchLinks,
  buildResearchPrompt,
} from './job-research-engine.js?v=1';

const JOB_BOARDS = [
  {
    category: '🎯 Role-Specific Deep Links',
    boards: [
      {
        name: 'LinkedIn Jobs — DevOps Lead (Remote $150k+)',
        url: 'https://www.linkedin.com/jobs/search/?keywords=DevOps+Lead&location=United+States&f_WT=2&f_SB2=5&f_TPR=r2592000&sortBy=DD',
        tip: 'Best for $150k+ remote DevOps Lead roles. Set alert for daily updates.',
        badge: 'top'
      },
      {
        name: 'LinkedIn — Platform Engineering Lead (Remote)',
        url: 'https://www.linkedin.com/jobs/search/?keywords=Platform+Engineering+Lead&location=United+States&f_WT=2&f_SB2=5',
        tip: 'Platform Eng roles often pay $190k–$230k — aligns perfectly with your Kubernetes/Terraform profile.',
        badge: 'top'
      },
      {
        name: 'Levels.fyi Job Board — $200k+ Tech Roles',
        url: 'https://www.levels.fyi/jobs?jobId=&country=254&level=&company=&title=devops',
        tip: 'Shows verified total comp (base+bonus+equity) for top-paying tech companies.',
        badge: 'comp'
      },
      {
        name: 'Indeed — DevSecOps Lead Remote $150k+',
        url: 'https://www.indeed.com/jobs?q=DevSecOps+Lead&l=Remote&rbl=Remote&jlid=rbtc4f97f26db9d5a4&sc=0kf%3Aattr%28DSQF7%29%3B&fromage=14',
        tip: 'Filter by "Remote" and $150k+ — update weekly.',
        badge: null
      },
      {
        name: 'Glassdoor — Platform Engineer Remote',
        url: 'https://www.glassdoor.com/Job/remote-platform-engineer-jobs-SRCH_IL.0,6_IS11047_KO7,24.htm',
        tip: 'Glassdoor shows company reviews + salary data — verify comp transparency before applying.',
        badge: null
      },
      {
        name: 'Wellfound (AngelList) — DevOps at Startups (Equity)',
        url: 'https://wellfound.com/jobs?role=devops-engineer&remote=true',
        tip: 'Startups often offer $160k–$200k base + significant equity. Strong for your side-venture background.',
        badge: 'equity'
      },
      {
        name: 'Hired.com — DevOps/Platform Engineering',
        url: 'https://hired.com/talent/engineers',
        tip: 'Reverse hiring marketplace — companies apply to you. Great for $180k+ leads.',
        badge: null
      },
      {
        name: 'Dice — DevOps Lead / Cloud Architect',
        url: 'https://www.dice.com/jobs/q-devops+lead-l-remote-jobs',
        tip: 'Strong for financial services and enterprise DevOps roles — matches your BofA background.',
        badge: null
      },
      {
        name: 'Remote.co — Senior DevOps Remote',
        url: 'https://remote.co/remote-jobs/developer/?search=devops',
        tip: '100% remote-focused job board. Good for finding mission-driven companies.',
        badge: null
      },
      {
        name: 'We Work Remotely — DevOps/SysAdmin',
        url: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs',
        tip: 'High-quality remote roles — lower volume but higher signal-to-noise ratio.',
        badge: null
      }
    ]
  },
  {
    category: '🏦 Financial Services (BofA-Adjacent Roles)',
    boards: [
      {
        name: 'JPMorgan Chase Careers — DevOps/Cloud',
        url: 'https://careers.jpmorgan.com/us/en/jobs/infrastructure?search=devops',
        tip: 'Your BofA enterprise experience is a direct credential for JPM, Citi, Wells Fargo equivalents.',
        badge: null
      },
      {
        name: 'Capital One Tech Careers',
        url: 'https://www.capitalonecareers.com/tech',
        tip: 'Capital One is heavily AWS/cloud-native. Excellent comp for senior DevOps ($180k–$220k).',
        badge: 'top'
      },
      {
        name: 'Fidelity Investments — Technology Careers',
        url: 'https://jobs.fidelity.com/job-search-results/?keywords=devops',
        tip: 'Fidelity has major DevOps/SRE teams. Remote-friendly post-2020.',
        badge: null
      }
    ]
  },
  {
    category: '☁️ Cloud & Platform Companies',
    boards: [
      {
        name: 'AWS Jobs — DevOps Engineer / Solutions Architect',
        url: 'https://www.amazon.jobs/en/job_categories/cloud-infrastructure',
        tip: 'AWS roles pay $200k–$350k+ TC. Your EKS/EC2/S3 experience is directly applicable.',
        badge: 'top'
      },
      {
        name: 'HashiCorp Careers — Terraform/Vault Roles',
        url: 'https://www.hashicorp.com/jobs',
        tip: 'With your deep Terraform expertise, HashiCorp Solutions Engineering roles pay $180k–$220k+.',
        badge: null
      },
      {
        name: 'Datadog Careers — Customer Reliability Engineering',
        url: 'https://www.datadoghq.com/careers/',
        tip: 'Learning Datadog (a current skill gap) + applying here is a high-ROI dual move.',
        badge: null
      }
    ]
  }
];

const STAGES = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
const STAGE_COLORS = { Saved:'var(--text-dim)', Applied:'var(--blue)', Screening:'var(--gold)', Interview:'var(--purple)', Offer:'var(--green)', Rejected:'var(--red)', Withdrawn:'var(--text-dim)' };
const ACTIVE_STAGES = new Set(['Applied', 'Screening', 'Interview', 'Offer']);
const FOLLOW_UP_STAGES = new Set(['Applied', 'Screening', 'Interview']);
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const SOURCES = ['Indeed', 'LinkedIn', 'Glassdoor', 'Company website', 'Referral', 'Recruiter', 'Other'];
const MAX_DESCRIPTION = 20000;
const FOLLOW_UP_DAYS = 7;

let jobsData = [];
const view = { tab: 'pipeline', jobId: null, section: 'overview' };
let syncWarned = false;

// ── Helpers ───────────────────────────────────────────────────
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}

function toLocalISO(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function todayISO() {
  return toLocalISO(new Date());
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

function formatDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(`${value.slice(0, 10)}T00:00:00`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return String(value);
}

function stageLabel(stage) {
  return stage === 'Saved' ? 'Saved / Researching' : stage;
}

function isFollowUpDue(job) {
  return FOLLOW_UP_STAGES.has(job.stage) && job.followUpDate && job.followUpDate <= todayISO();
}

function normalizeJob(raw) {
  const job = { ...raw };
  job.id = String(job.id || Date.now());
  job.company = String(job.company || '');
  job.title = String(job.title || '');
  job.stage = STAGES.includes(job.stage) ? job.stage : 'Saved';
  ['location', 'workMode', 'salary', 'url', 'source', 'notes', 'contact', 'description', 'appliedDate', 'followUpDate', 'dateAdded']
    .forEach(k => { job[k] = String(job[k] || ''); });
  const r = job.research && typeof job.research === 'object' ? job.research : {};
  job.research = {
    ratings: r.ratings && typeof r.ratings === 'object' ? { ...r.ratings } : {},
    visited: r.visited && typeof r.visited === 'object' ? { ...r.visited } : {},
    glassdoor: String(r.glassdoor || ''),
    pros: String(r.pros || ''),
    cons: String(r.cons || ''),
    notes: String(r.notes || ''),
  };
  job.history = Array.isArray(job.history) ? job.history : [];
  return job;
}

function getJob(id) {
  return jobsData.find(j => j.id === id);
}

function getUserSkills() {
  return collectUserSkills(window._state?.resumeData, window._state?.skillsData);
}

function getJobFit(job) {
  const analysis = analyzeJobDescription(job.description, getUserSkills());
  const ratings = { ...job.research.ratings };
  const autoSkills = !(Number(ratings.skills) >= 1) && analysis.skillsScore !== null;
  if (autoSkills) ratings.skills = skillsScoreToRating(analysis.skillsScore);
  return { analysis, ratings, autoSkills, fit: computeFitScore(ratings) };
}

function fitChip(fit) {
  if (fit.score === null) return '';
  return `<span class="chip ${fit.verdict.tone || 'blue'}" title="${esc(fit.verdict.label)}">Fit ${fit.score}</span>`;
}

// ── Persistence ───────────────────────────────────────────────
function getJobStorageKey() {
  const user = getCurrentUser();
  const email = (user?.email || 'guest').toLowerCase();
  return `career_jobs_${email}`;
}

async function loadJobs() {
  const key = getJobStorageKey();
  try {
    const stored = localStorage.getItem(key);
    if (stored) jobsData = JSON.parse(stored);
  } catch { jobsData = []; }

  try {
    const res = await fetch('/api/state?key=jobs', { credentials: 'include' });
    if (res.ok) {
      const body = await res.json();
      if (Array.isArray(body?.state)) {
        jobsData = body.state;
        localStorage.setItem(key, JSON.stringify(jobsData));
      }
    }
  } catch {}

  jobsData = (Array.isArray(jobsData) ? jobsData : []).map(normalizeJob);
  if (window._state) window._state.jobsData = jobsData;
}

function saveJobs() {
  const key = getJobStorageKey();
  try { localStorage.setItem(key, JSON.stringify(jobsData)); } catch {}
  if (window._state) window._state.jobsData = jobsData;

  fetch('/api/state?key=jobs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ state: jobsData }),
  })
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); })
    .catch(() => {
      if (getCurrentUser()?.isLoggedIn && !syncWarned) {
        syncWarned = true;
        window.toast?.('Saved on this device — cloud sync is unavailable right now', 'gold');
      }
    });
}
// ── Page Shell ────────────────────────────────────────────────
export async function renderJobTracker() {
  await loadJobs();
  view.tab = jobsData.length ? 'pipeline' : 'add';
  view.jobId = null;

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">💼 Job Tracker & Research</div>
      <div class="page-subtitle">Track every application, research the company, and score the fit before you apply</div>
    </div>
    <div id="job-root"></div>
  `;

  const root = document.getElementById('job-root');
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  render();
}

function render() {
  const root = document.getElementById('job-root');
  if (!root) return;
  const job = view.tab === 'detail' ? getJob(view.jobId) : null;
  if (view.tab === 'detail' && !job) view.tab = 'pipeline';

  const tabs = [
    ['pipeline', `📋 My Pipeline (${jobsData.length})`],
    ['add', '➕ Add Job'],
    ['boards', '🔍 Job Boards'],
  ];
  const activeTab = view.tab === 'detail' ? 'pipeline' : view.tab;

  root.innerHTML = `
    <div class="tab-bar" role="tablist">
      ${tabs.map(([id, label]) => `
        <button class="tab-btn ${activeTab === id ? 'active' : ''}" role="tab" aria-selected="${activeTab === id}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}
    </div>
    <div id="job-tab-content">
      ${view.tab === 'pipeline' ? renderPipeline()
        : view.tab === 'add' ? renderAddForm()
        : view.tab === 'boards' ? renderBoards()
        : renderDetail(job)}
    </div>
  `;
}

// ── Pipeline ──────────────────────────────────────────────────
function renderPipeline() {
  if (jobsData.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">No jobs tracked yet</div>
      <div class="empty-desc">Found a posting on Indeed or LinkedIn? Add it here with the job description to get a skills match, company research links, and a fit score.</div>
      <button class="btn btn-gold mt-16" data-action="tab" data-tab="add">➕ Add Your First Job</button>
    </div>`;
  }

  const active = jobsData.filter(j => ACTIVE_STAGES.has(j.stage)).length;
  const researching = jobsData.filter(j => j.stage === 'Saved').length;
  const interviews = jobsData.filter(j => j.stage === 'Interview').length;
  const due = jobsData.filter(isFollowUpDue);

  return `
    <div class="grid-4 mb-24">
      ${statTile('Researching', researching, 'Saved, not applied yet')}
      ${statTile('Active Applications', active, 'Applied → Offer')}
      ${statTile('Interviews', interviews, 'In interview stage')}
      ${statTile('Follow-ups Due', due.length, due.length ? 'Reach out today' : 'All caught up')}
    </div>

    ${due.length ? `
      <div class="card mb-24">
        <div class="card-title"><span class="dot"></span>Follow-ups due</div>
        <div class="job-followups">
          ${due.map(j => `
            <button class="job-followup" data-action="open" data-id="${esc(j.id)}">
              <span><strong>${esc(j.company)}</strong> — ${esc(j.title)}</span>
              <span class="chip red">Due ${esc(formatDate(j.followUpDate))}</span>
            </button>`).join('')}
        </div>
      </div>` : ''}

    <div class="pipeline-board">
      ${STAGES.map(stage => {
        const stageJobs = jobsData.filter(j => j.stage === stage);
        return `
          <div class="pipeline-col">
            <div class="pipeline-col-header">
              <span>${stageLabel(stage)}</span>
              <span class="chip" style="color:${STAGE_COLORS[stage]}">${stageJobs.length}</span>
            </div>
            ${stageJobs.length === 0
              ? `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:20px 0;">Empty</div>`
              : stageJobs.map(renderPipelineCard).join('')}
          </div>`;
      }).join('')}
    </div>`;
}

function statTile(label, value, sub) {
  return `
    <div class="stat-tile">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-sub">${sub}</div>
    </div>`;
}

function renderPipelineCard(job) {
  const { fit } = getJobFit(job);
  return `
    <button class="pipeline-card" data-action="open" data-id="${esc(job.id)}" aria-label="Open ${esc(job.company)} — ${esc(job.title)}">
      <div class="company">${esc(job.company)}</div>
      <div class="role">${esc(job.title)}</div>
      ${job.salary ? `<div class="salary">${esc(job.salary)}</div>` : ''}
      <div class="pipeline-card-meta">
        ${fitChip(fit)}
        ${isFollowUpDue(job) ? '<span class="chip red">Follow up</span>' : ''}
        ${job.workMode ? `<span class="chip">${esc(job.workMode)}</span>` : ''}
      </div>
    </button>`;
}

// ── Add Job ───────────────────────────────────────────────────
function renderAddForm() {
  return `
    <div class="card" style="max-width:760px;">
      <div class="card-title"><span class="dot"></span>Add a Job</div>
      <div class="job-form">
        <div class="grid-2">
          <div>
            <label class="field-label" for="j-company">Company *</label>
            <input id="j-company" class="field" placeholder="e.g., Capital One" autocomplete="off">
          </div>
          <div>
            <label class="field-label" for="j-title">Job title *</label>
            <input id="j-title" class="field" placeholder="e.g., Senior DevOps Engineer" autocomplete="off">
          </div>
          <div>
            <label class="field-label" for="j-location">Location</label>
            <input id="j-location" class="field" placeholder="e.g., Remote (US) or Charlotte, NC">
          </div>
          <div>
            <label class="field-label" for="j-workmode">Work mode</label>
            <select id="j-workmode" class="select w-full">
              <option value="">Detect from description</option>
              ${WORK_MODES.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label" for="j-salary">Salary / comp</label>
            <input id="j-salary" class="field" placeholder="Leave blank to detect from description">
          </div>
          <div>
            <label class="field-label" for="j-source">Found on</label>
            <select id="j-source" class="select w-full">
              ${SOURCES.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label" for="j-url">Job posting URL</label>
            <input id="j-url" class="field" type="url" placeholder="https://www.indeed.com/viewjob?jk=...">
          </div>
          <div>
            <label class="field-label" for="j-stage">Stage</label>
            <select id="j-stage" class="select w-full">
              ${STAGES.map(s => `<option value="${s}">${stageLabel(s)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="field-label" for="j-description">Job description</label>
          <textarea id="j-description" class="field" rows="10" maxlength="${MAX_DESCRIPTION}" placeholder="Paste the full job description from Indeed here. It powers the skills match, red/green flag scan, and AI research prompt."></textarea>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-gold" data-action="save-new">💾 Save & Analyze</button>
          <button class="btn btn-ghost" data-action="tab" data-tab="pipeline">Cancel</button>
        </div>
      </div>
    </div>`;
}

function applyStageDefaults(job) {
  if (job.stage === 'Applied' && !job.appliedDate) job.appliedDate = todayISO();
  if (FOLLOW_UP_STAGES.has(job.stage) && !job.followUpDate) job.followUpDate = addDaysISO(todayISO(), FOLLOW_UP_DAYS);
}

function saveNewJob() {
  const val = id => document.getElementById(id)?.value?.trim() || '';
  const company = val('j-company');
  const title = val('j-title');
  if (!company || !title) { window.toast?.('Company and job title are required', 'red'); return; }

  const description = val('j-description').slice(0, MAX_DESCRIPTION);
  const detected = analyzeJobDescription(description, getUserSkills());
  const stage = val('j-stage') || 'Saved';
  const now = todayISO();

  const job = normalizeJob({
    id: `${Date.now()}`,
    company,
    title,
    location: val('j-location'),
    workMode: val('j-workmode') || detected.workMode,
    salary: val('j-salary') || detected.salary,
    url: val('j-url'),
    source: val('j-source'),
    stage,
    description,
    dateAdded: now,
    history: [{ stage, at: now }],
  });
  applyStageDefaults(job);

  jobsData.push(job);
  saveJobs();
  window.toast?.(`${esc(company)} added — review the fit analysis`, 'green');
  view.tab = 'detail';
  view.jobId = job.id;
  view.section = description ? 'fit' : 'research';
  render();
}

// ── Job Boards ────────────────────────────────────────────────
function renderBoards() {
  return JOB_BOARDS.map(cat => `
    <div class="section-title">${cat.category}</div>
    <div class="grid-2 gap-16 mb-24">
      ${cat.boards.map(b => `
        <div class="card" style="position:relative;">
          ${b.badge === 'top'   ? `<div style="position:absolute;top:12px;right:12px;"><span class="chip gold">⭐ Top Pick</span></div>` : ''}
          ${b.badge === 'comp'  ? `<div style="position:absolute;top:12px;right:12px;"><span class="chip green">💰 Verified Comp</span></div>` : ''}
          ${b.badge === 'equity'? `<div style="position:absolute;top:12px;right:12px;"><span class="chip purple">📈 Equity</span></div>` : ''}
          <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px;padding-right:80px;">${b.name}</div>
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px;line-height:1.6;">💡 ${b.tip}</div>
          <a href="${b.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Open Board →</a>
        </div>`).join('')}
    </div>
  `).join('');
}
// ── Job Detail ────────────────────────────────────────────────
const SECTIONS = [
  ['overview', '📝 Overview'],
  ['fit', '🧠 Fit Analysis'],
  ['research', '🔎 Company Research'],
  ['decision', '⚖️ Decision'],
];

function renderDetail(job) {
  const ctx = getJobFit(job);
  const postingUrl = safeUrl(job.url);
  const body = view.section === 'fit' ? renderFitSection(job, ctx)
    : view.section === 'research' ? renderResearchSection(job)
    : view.section === 'decision' ? renderDecisionSection(ctx)
    : renderOverviewSection(job);

  return `
    <button class="btn btn-ghost btn-sm mb-16" data-action="back">← Back to pipeline</button>
    <div class="card mb-16 job-detail-header">
      <div>
        <div class="job-detail-company">${esc(job.company)}</div>
        <div class="job-detail-title">${esc(job.title)}</div>
        <div class="pipeline-card-meta">
          ${fitChip(ctx.fit)}
          ${ctx.fit.score !== null ? `<span class="chip ${ctx.fit.verdict.tone}">${esc(ctx.fit.verdict.label)}</span>` : ''}
          ${job.workMode ? `<span class="chip">${esc(job.workMode)}</span>` : ''}
          ${job.salary ? `<span class="chip gold">${esc(job.salary)}</span>` : ''}
          ${isFollowUpDue(job) ? '<span class="chip red">Follow-up due</span>' : ''}
        </div>
      </div>
      <div class="job-detail-actions">
        <label class="field-label" for="d-stage">Stage</label>
        <select id="d-stage" class="select" data-field="stage">
          ${STAGES.map(s => `<option value="${s}" ${s === job.stage ? 'selected' : ''}>${stageLabel(s)}</option>`).join('')}
        </select>
        ${postingUrl ? `<a class="btn btn-outline btn-sm" href="${esc(postingUrl)}" target="_blank" rel="noopener noreferrer">Open posting →</a>` : ''}
      </div>
    </div>

    <div class="tab-bar" role="tablist">
      ${SECTIONS.map(([id, label]) => `
        <button class="tab-btn ${view.section === id ? 'active' : ''}" role="tab" aria-selected="${view.section === id}" data-action="section" data-section="${id}">${label}</button>`).join('')}
    </div>
    ${body}
  `;
}

function inputField(job, field, label, opts = {}) {
  const id = `d-${field}`;
  return `
    <div>
      <label class="field-label" for="${id}">${label}</label>
      <input id="${id}" class="field" type="${opts.type || 'text'}" data-field="${field}" value="${esc(job[field])}" ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}>
    </div>`;
}

function selectField(job, field, label, options, emptyLabel) {
  const id = `d-${field}`;
  return `
    <div>
      <label class="field-label" for="${id}">${label}</label>
      <select id="${id}" class="select w-full" data-field="${field}">
        <option value="">${emptyLabel}</option>
        ${options.map(o => `<option value="${o}" ${o === job[field] ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>`;
}

function renderOverviewSection(job) {
  return `
    <div class="card">
      <div class="card-title"><span class="dot"></span>Application details</div>
      <div class="grid-2 mb-16">
        ${inputField(job, 'company', 'Company *')}
        ${inputField(job, 'title', 'Job title *')}
        ${inputField(job, 'location', 'Location')}
        ${selectField(job, 'workMode', 'Work mode', WORK_MODES, 'Unknown')}
        ${inputField(job, 'salary', 'Salary / comp')}
        ${selectField(job, 'source', 'Found on', SOURCES, '—')}
        ${inputField(job, 'url', 'Job posting URL', { type: 'url', placeholder: 'https://...' })}
        ${inputField(job, 'contact', 'Recruiter / contact', { placeholder: 'Name, email, or LinkedIn' })}
        ${inputField(job, 'appliedDate', 'Date applied', { type: 'date' })}
        ${inputField(job, 'followUpDate', 'Follow up on', { type: 'date' })}
      </div>
      <div class="mb-16">
        <label class="field-label" for="d-notes">Notes</label>
        <textarea id="d-notes" class="field" rows="4" data-field="notes" placeholder="Interview notes, people you talked to, next steps...">${esc(job.notes)}</textarea>
      </div>
      <div class="job-detail-footer">
        <div class="job-muted">
          ${job.dateAdded ? `Added ${esc(formatDate(job.dateAdded))}` : ''}
          ${job.history.length > 1 ? ` · ${job.history.map(h => `${esc(h.stage)} (${esc(formatDate(h.at))})`).join(' → ')}` : ''}
        </div>
        <button class="btn btn-ghost btn-sm job-delete-btn" data-action="delete">🗑 Delete job</button>
      </div>
    </div>`;
}

function chipList(items, tone, empty) {
  if (!items.length) return `<div class="job-muted">${empty}</div>`;
  return `<div class="job-chip-list">${items.map(i => `<span class="chip ${tone}">${esc(i)}</span>`).join('')}</div>`;
}

function renderFitSection(job, { analysis }) {
  const descriptionEditor = `
    <div class="card mt-16">
      <div class="card-title"><span class="dot"></span>Job description</div>
      <textarea id="d-description" class="field" rows="10" maxlength="${MAX_DESCRIPTION}" data-field="description" placeholder="Paste the full job description from Indeed here.">${esc(job.description)}</textarea>
      <button class="btn btn-gold btn-sm mt-16" data-action="analyze">🔍 Analyze description</button>
    </div>`;

  if (!analysis.hasDescription) {
    return `
      <div class="empty-state">
        <div class="empty-icon">🧠</div>
        <div class="empty-title">Paste the job description to analyze fit</div>
        <div class="empty-desc">Copy the full description from the Indeed posting and paste it below. You'll get a skills match against your profile plus a scan for green and red flags.</div>
      </div>
      ${descriptionEditor}`;
  }

  const facts = [
    analysis.seniority && `Level: ${analysis.seniority}`,
    analysis.yearsRequired && `Experience: ${analysis.yearsRequired}`,
    analysis.workMode && `Work mode: ${analysis.workMode}`,
    analysis.salary && `Pay: ${analysis.salary}`,
  ].filter(Boolean);

  const score = analysis.skillsScore;
  const scoreTone = score === null ? 'var(--text-dim)' : score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : 'var(--red)';
  const termCount = analysis.matched.length + analysis.developing.length + analysis.missing.length;

  return `
    <div class="grid-2 mb-16">
      <div class="card">
        <div class="card-title"><span class="dot"></span>Skills match</div>
        <div class="job-score-big" style="color:${scoreTone}">${score === null ? '—' : `${score}%`}</div>
        <div class="job-muted mb-16">${score === null
          ? 'Not enough technical keywords found to score. Rate skills fit yourself on the Decision tab.'
          : `Based on ${termCount} skills mentioned in the posting.`}</div>
        ${facts.length ? `<div class="job-chip-list">${facts.map(f => `<span class="chip blue">${esc(f)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="card">
        <div class="card-title"><span class="dot"></span>Your skills vs. the posting</div>
        <div class="field-label">✅ You have these</div>
        ${chipList(analysis.matched, 'green', 'None of the listed skills matched your profile.')}
        <div class="field-label mt-16">📚 You're still learning these</div>
        ${chipList(analysis.developing, 'gold', 'None.')}
        <div class="field-label mt-16">⚠️ Not on your profile yet</div>
        ${chipList(analysis.missing, 'red', 'No gaps found.')}
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span class="dot" style="background:var(--green)"></span>Green flags in the posting</div>
        ${analysis.greenFlags.length
          ? `<ul class="job-flag-list">${analysis.greenFlags.map(f => `<li>👍 ${esc(f)}</li>`).join('')}</ul>`
          : '<div class="job-muted">No growth, benefit, or pay-transparency signals found. Check the company reviews to fill in the picture.</div>'}
      </div>
      <div class="card">
        <div class="card-title"><span class="dot" style="background:var(--red)"></span>Things to ask about</div>
        ${analysis.redFlags.length
          ? `<ul class="job-flag-list">${analysis.redFlags.map(f => `<li>🚩 ${esc(f)}</li>`).join('')}</ul>`
          : '<div class="job-muted">No common warning phrases found.</div>'}
      </div>
    </div>
    ${descriptionEditor}`;
}
function renderResearchSection(job) {
  const groups = buildResearchLinks(job.company, job.title);
  const total = groups.reduce((n, g) => n + g.links.length, 0);
  const visitedCount = groups.flatMap(g => g.links).filter(l => job.research.visited[l.id]).length;

  return `
    <div class="card mb-16">
      <div class="job-research-head">
        <div>
          <div class="card-title" style="margin-bottom:4px;"><span class="dot"></span>Research ${esc(job.company)}</div>
          <div class="job-muted">Open each source, record what you learn in the log below, then rate the company on the Decision tab.</div>
        </div>
        <div class="job-research-progress" id="job-research-progress">${visitedCount} / ${total} sources checked</div>
      </div>
      <div class="job-progress-track"><div class="job-progress-fill" id="job-research-bar" style="width:${Math.round((visitedCount / total) * 100)}%"></div></div>
    </div>

    <div class="grid-2 mb-16">
      ${groups.map(g => `
        <div class="card">
          <div class="card-title"><span class="dot"></span>${g.group}</div>
          <div class="job-research-links">
            ${g.links.map(l => `
              <a class="job-research-link ${job.research.visited[l.id] ? 'visited' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" data-action="visit" data-link="${esc(l.id)}">
                <span class="job-research-check" aria-hidden="true">${job.research.visited[l.id] ? '✓' : '↗'}</span>
                <span>
                  <span class="job-research-name">${esc(l.name)}</span>
                  <span class="job-research-tip">${esc(l.tip)}</span>
                </span>
              </a>`).join('')}
          </div>
        </div>`).join('')}
    </div>

    <div class="card mb-16">
      <div class="card-title"><span class="dot"></span>🤖 Deep research with AI</div>
      <div class="job-muted mb-16">Copies a research brief with this job description, your skills, and your priorities. Paste it into Claude with web search turned on for a sourced summary of reviews, layoffs, growth, and fit.</div>
      <button class="btn btn-outline btn-sm" data-action="copy-prompt">📋 Copy research prompt</button>
    </div>

    <div class="card">
      <div class="card-title"><span class="dot"></span>Research log</div>
      <div class="grid-2 mb-16">
        <div>
          <label class="field-label" for="d-glassdoor">Glassdoor / Indeed rating (out of 5)</label>
          <input id="d-glassdoor" class="field" type="number" min="0" max="5" step="0.1" data-research="glassdoor" value="${esc(job.research.glassdoor)}" placeholder="e.g., 3.9">
        </div>
      </div>
      <div class="grid-2 mb-16">
        <div>
          <label class="field-label" for="d-pros">What employees praise</label>
          <textarea id="d-pros" class="field" rows="4" data-research="pros" placeholder="e.g., Good managers, strong learning budget, real remote culture">${esc(job.research.pros)}</textarea>
        </div>
        <div>
          <label class="field-label" for="d-cons">What employees complain about</label>
          <textarea id="d-cons" class="field" rows="4" data-research="cons" placeholder="e.g., Heavy on-call, slow promotions, recent layoffs">${esc(job.research.cons)}</textarea>
        </div>
      </div>
      <div>
        <label class="field-label" for="d-rnotes">Other findings</label>
        <textarea id="d-rnotes" class="field" rows="3" data-research="notes" placeholder="News, funding, tech stack, people you know there...">${esc(job.research.notes)}</textarea>
      </div>
    </div>`;
}

function renderDecisionSection({ ratings, autoSkills, fit }) {
  const tone = fit.verdict.tone ? `var(--${fit.verdict.tone})` : 'var(--text-dim)';
  const grouped = fit.questions.reduce((acc, q) => {
    (acc[q.area] = acc[q.area] || []).push(q.question);
    return acc;
  }, {});

  return `
    <div class="grid-2 mb-16">
      <div class="card">
        <div class="card-title"><span class="dot"></span>Fit score</div>
        <div class="job-score-big" style="color:${tone}">${fit.score === null ? '—' : fit.score}</div>
        <div class="job-verdict" style="color:${tone}">${esc(fit.verdict.label)}</div>
        <div class="job-muted mb-16">${esc(fit.verdict.advice)}</div>
        <div class="field-label">Confidence — ${fit.confidence}% of criteria rated</div>
        <div class="job-progress-track"><div class="job-progress-fill" style="width:${fit.confidence}%"></div></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="dot"></span>How it's weighted</div>
        <div class="job-muted mb-16">Enjoying the work and room to grow count the most, because those decide whether you'll still be happy in this job a year from now.</div>
        <ul class="job-flag-list">
          ${CRITERIA.map(c => `<li class="job-weight-row"><span>${esc(c.label)}</span><span class="job-muted">${c.weight}%</span></li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-title"><span class="dot"></span>Rate this opportunity (1 = poor, 5 = excellent)</div>
      <div class="job-criteria">
        ${CRITERIA.map(c => {
          const current = Number(ratings[c.key]) || 0;
          const isAuto = c.key === 'skills' && autoSkills;
          return `
            <div class="job-criterion">
              <div>
                <div class="job-criterion-label">${esc(c.label)} ${isAuto ? '<span class="chip blue">auto from JD</span>' : ''}</div>
                <div class="job-muted">${esc(c.hint)}</div>
              </div>
              <div class="job-rating" role="group" aria-label="${esc(c.label)} rating">
                ${[1, 2, 3, 4, 5].map(n => `
                  <button class="rating-btn ${current === n ? 'active' : ''}" aria-pressed="${current === n}" data-action="rate" data-key="${c.key}" data-value="${n}" title="${n} of 5">${n}</button>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="job-research-head">
        <div class="card-title" style="margin-bottom:0;"><span class="dot"></span>Questions to ask the recruiter or interviewer</div>
        ${fit.questions.length ? '<button class="btn btn-outline btn-sm" data-action="copy-questions">📋 Copy questions</button>' : ''}
      </div>
      <div class="job-muted mb-16">Generated from the areas you haven't rated 4 or higher yet. Get these answered before you accept an offer.</div>
      ${fit.questions.length
        ? Object.entries(grouped).map(([area, qs]) => `
            <div class="field-label mt-16">${esc(area)}</div>
            <ul class="job-flag-list">${qs.map(q => `<li>❓ ${esc(q)}</li>`).join('')}</ul>`).join('')
        : '<div class="job-muted">Everything rates 4 or higher — you have what you need to decide.</div>'}
    </div>`;
}

// ── Events ────────────────────────────────────────────────────
async function copyText(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    window.toast?.(successMsg, 'green');
  } catch {
    window.toast?.('Could not access the clipboard', 'red');
  }
}

function markVisited(job, el) {
  // Update in place rather than re-rendering so the link isn't removed mid-click.
  if (job.research.visited[el.dataset.link]) return;
  job.research.visited[el.dataset.link] = todayISO();
  saveJobs();

  el.classList.add('visited');
  const check = el.querySelector('.job-research-check');
  if (check) check.textContent = '✓';
  const all = buildResearchLinks(job.company, job.title).flatMap(g => g.links);
  const count = all.filter(l => job.research.visited[l.id]).length;
  const progress = document.getElementById('job-research-progress');
  const bar = document.getElementById('job-research-bar');
  if (progress) progress.textContent = `${count} / ${all.length} sources checked`;
  if (bar) bar.style.width = `${Math.round((count / all.length) * 100)}%`;
}

function onClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const job = view.jobId ? getJob(view.jobId) : null;

  switch (el.dataset.action) {
    case 'tab':
      view.tab = el.dataset.tab;
      view.jobId = null;
      render();
      break;
    case 'open':
      view.tab = 'detail';
      view.jobId = el.dataset.id;
      view.section = 'overview';
      render();
      break;
    case 'back':
      view.tab = 'pipeline';
      view.jobId = null;
      render();
      break;
    case 'section':
      view.section = el.dataset.section;
      render();
      break;
    case 'save-new':
      saveNewJob();
      break;
    case 'analyze': {
      if (!job) return;
      job.description = (document.getElementById('d-description')?.value || '').trim().slice(0, MAX_DESCRIPTION);
      const detected = analyzeJobDescription(job.description, getUserSkills());
      if (!job.salary && detected.salary) job.salary = detected.salary;
      if (!job.workMode && detected.workMode) job.workMode = detected.workMode;
      saveJobs();
      render();
      break;
    }
    case 'delete':
      if (!job) return;
      if (!confirm(`Delete ${job.company} — ${job.title}? This cannot be undone.`)) return;
      jobsData = jobsData.filter(j => j.id !== job.id);
      saveJobs();
      window.toast?.('Job deleted', 'gold');
      view.tab = 'pipeline';
      view.jobId = null;
      render();
      break;
    case 'rate': {
      if (!job) return;
      const key = el.dataset.key;
      const value = Number(el.dataset.value);
      if (Number(job.research.ratings[key]) === value) delete job.research.ratings[key];
      else job.research.ratings[key] = value;
      saveJobs();
      render();
      break;
    }
    case 'visit':
      if (job) markVisited(job, el);
      break;
    case 'copy-prompt':
      if (!job) return;
      copyText(buildResearchPrompt(job, getUserSkills(), window._state?.resumeData?.meta || {}), 'Research prompt copied — paste it into Claude');
      break;
    case 'copy-questions': {
      if (!job) return;
      const { fit } = getJobFit(job);
      const text = `Questions for ${job.company} — ${job.title}\n\n${fit.questions.map(q => `• [${q.area}] ${q.question}`).join('\n')}`;
      copyText(text, 'Questions copied');
      break;
    }
  }
}

function onChange(event) {
  const el = event.target;
  const job = view.jobId ? getJob(view.jobId) : null;
  if (!job) return;

  if (el.dataset.research) {
    job.research[el.dataset.research] = el.value.trim();
    saveJobs();
    return;
  }

  const field = el.dataset.field;
  if (!field) return;
  const value = field === 'description' ? el.value.trim().slice(0, MAX_DESCRIPTION) : el.value.trim();

  if ((field === 'company' || field === 'title') && !value) {
    window.toast?.('Company and job title cannot be empty', 'red');
    el.value = job[field];
    return;
  }

  if (field === 'stage') {
    if (value === job.stage) return;
    job.stage = value;
    job.history.push({ stage: value, at: todayISO() });
    applyStageDefaults(job);
    saveJobs();
    window.toast?.(`Moved to ${esc(value)}`, 'green');
    render();
    return;
  }

  // Save without re-rendering so the next click (e.g. a rating button) isn't lost.
  job[field] = value;
  saveJobs();
}