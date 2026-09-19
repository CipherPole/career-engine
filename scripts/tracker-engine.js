/* ============================================================
   TRACKER-ENGINE.JS — Job Tracker, Pipeline & Board Links
   ============================================================ */

'use strict';

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

const STAGES = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];
const STAGE_COLORS = { Saved:'var(--text-dim)', Applied:'var(--blue)', Screening:'var(--gold)', Interview:'var(--purple)', Offer:'var(--green)', Rejected:'var(--red)' };

let jobsData = [];

function loadJobs() {
  try {
    const stored = localStorage.getItem('career_jobs_v1');
    if (stored) jobsData = JSON.parse(stored);
  } catch { jobsData = []; }
}

function saveJobs() {
  localStorage.setItem('career_jobs_v1', JSON.stringify(jobsData));
}

export function renderJobTracker() {
  loadJobs();
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">💼 Job Tracker & Board</div>
      <div class="page-subtitle">Curated job board links for $180k+ remote roles + your application pipeline</div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" id="tab-boards" onclick="switchJobTab('boards')">🔍 Job Boards</button>
      <button class="tab-btn" id="tab-pipeline" onclick="switchJobTab('pipeline')">📋 My Pipeline (${jobsData.length})</button>
      <button class="tab-btn" id="tab-add" onclick="switchJobTab('add')">➕ Add Application</button>
    </div>
    <div id="job-tab-content"></div>
  `;
  switchJobTab('boards');
}

window.switchJobTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  const tc = document.getElementById('job-tab-content');
  if (tab === 'boards')   tc.innerHTML = renderBoards();
  else if (tab === 'pipeline') tc.innerHTML = renderPipeline();
  else if (tab === 'add') tc.innerHTML = renderAddForm();
};

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
          <div class="flex gap-8">
            <a href="${b.url}" target="_blank" class="btn btn-outline btn-sm">Open Board →</a>
            <button class="btn btn-ghost btn-sm" onclick="quickAddJob('${b.name.replace(/'/g,"\\'")}', '${b.url}')">+ Track It</button>
          </div>
        </div>`).join('')}
    </div>
  `).join('');
}

function renderPipeline() {
  if (jobsData.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">No applications tracked yet</div>
      <div class="empty-desc">Start tracking your applications to monitor follow-ups and manage your pipeline. Click "Add Application" above.</div>
      <button class="btn btn-gold mt-16" onclick="switchJobTab('add')">➕ Add First Application</button>
    </div>`;
  }

  return `
    <div class="pipeline-board">
      ${STAGES.map(stage => {
        const stageJobs = jobsData.filter(j => j.stage === stage);
        return `
          <div class="pipeline-col">
            <div class="pipeline-col-header">
              <span>${stage}</span>
              <span class="chip" style="color:${STAGE_COLORS[stage]}">${stageJobs.length}</span>
            </div>
            ${stageJobs.length === 0
              ? `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:20px 0;">Empty</div>`
              : stageJobs.map(j => `
                <div class="pipeline-card" onclick="openJobDetail('${j.id}')">
                  <div class="company">${j.company}</div>
                  <div class="role">${j.title}</div>
                  ${j.salary ? `<div class="salary">${j.salary}</div>` : ''}
                  <div style="font-size:10px;color:var(--text-dim);margin-top:6px;">${j.dateAdded || ''}</div>
                </div>`).join('')}
          </div>`;
      }).join('')}
    </div>`;
}

function renderAddForm() {
  return `
    <div class="card" style="max-width:600px;">
      <div class="card-title"><span class="dot"></span>Track New Application</div>
      <div style="display:grid;gap:16px;">
        <div>
          <label class="field-label">Company Name *</label>
          <input id="j-company" class="field" placeholder="e.g., Capital One">
        </div>
        <div>
          <label class="field-label">Job Title *</label>
          <input id="j-title" class="field" placeholder="e.g., DevOps Lead">
        </div>
        <div>
          <label class="field-label">Salary / Comp</label>
          <input id="j-salary" class="field" placeholder="e.g., $180k–$210k + equity">
        </div>
        <div>
          <label class="field-label">Job URL</label>
          <input id="j-url" class="field" placeholder="https://...">
        </div>
        <div>
          <label class="field-label">Stage</label>
          <select id="j-stage" class="select w-full">
            ${STAGES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="field-label">Notes</label>
          <textarea id="j-notes" class="field" rows="3" placeholder="Key requirements, recruiter contact, follow-up date..."></textarea>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-gold" onclick="saveJob()">💾 Save Application</button>
          <button class="btn btn-ghost" onclick="switchJobTab('pipeline')">Cancel</button>
        </div>
      </div>
    </div>`;
}

window.saveJob = function() {
  const company = document.getElementById('j-company')?.value?.trim();
  const title   = document.getElementById('j-title')?.value?.trim();
  if (!company || !title) { window.toast('Company and title are required', 'red'); return; }

  const job = {
    id: Date.now().toString(),
    company,
    title,
    salary:    document.getElementById('j-salary')?.value?.trim() || '',
    url:       document.getElementById('j-url')?.value?.trim() || '',
    stage:     document.getElementById('j-stage')?.value || 'Saved',
    notes:     document.getElementById('j-notes')?.value?.trim() || '',
    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  jobsData.push(job);
  saveJobs();
  window.toast(`✅ ${company} added to pipeline!`, 'green');
  switchJobTab('pipeline');
};

window.quickAddJob = function(name, url) {
  const job = {
    id: Date.now().toString(),
    company: name.split('—')[0].trim(),
    title: 'DevOps Lead',
    salary: '',
    url,
    stage: 'Saved',
    notes: 'From curated job board',
    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  jobsData.push(job);
  saveJobs();
  window.toast('Added to pipeline!', 'green');
};

window.openJobDetail = function(id) {
  const job = jobsData.find(j => j.id === id);
  if (!job) return;
  const next = STAGES[(STAGES.indexOf(job.stage) + 1)];
  const msg = next ? `Move to "${next}"?` : 'This application is in a final stage.';
  if (next && confirm(msg)) {
    job.stage = next;
    saveJobs();
    switchJobTab('pipeline');
    window.toast(`Moved to ${next}`, 'green');
  }
};
