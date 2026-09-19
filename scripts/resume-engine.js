/* ============================================================
   RESUME-ENGINE.JS — Dashboard, Resume Studio & Skill Gap
   ============================================================ */

'use strict';

import { isOwner, getCurrentUser } from './auth-engine.js?v=7';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── DASHBOARD ─────────────────────────────────────────────────
export function renderDashboard() {
  const resume   = window._state?.resumeData;
  const skills   = window._state?.skillsData;
  const jobs     = window._state?.jobsData || [];
  const user     = getCurrentUser();

  const isOwnerUser = isOwner() || sessionStorage.getItem('careerEngine_showcase_active') === 'true';
  const displayName = resume?.contact?.name 
    ? resume.contact.name.split(' ')[0] 
    : (user?.name && user.name !== 'Guest' ? user.name.split(' ')[0] : 'Engineer');

  const currComp = resume?.meta?.currentComp || 120000;
  const targetComp = resume?.meta?.targetComp || 180000;
  const compDiff = Math.max(0, targetComp - currComp);
  const compPercent = Math.min(100, Math.max(10, Math.round((currComp / targetComp) * 100)));
  const compCurrentRole = resume?.experience?.[0]?.company ? resume.experience[0].company : 'Current Compensation';
  const compTargetRole = resume?.meta?.targetTitle ? `Target: ${resume.meta.targetTitle}` : 'Target: Senior/Lead';

  const formatK = val => `$${Math.round(val / 1000)}k`;

  // Priority Action Calculation
  let priorityTitle = '';
  let priorityDesc = '';
  let priorityActionText = 'Open Resume Studio →';
  let priorityActionPage = 'resume';

  const atsScore = window.calcATSScore ? window.calcATSScore(resume, skills) : (resume?.meta?.atsScore || 71);
  const liScore  = window.calcLinkedInScore ? window.calcLinkedInScore() : { score: 40 };

  if (isOwnerUser) {
    priorityTitle = 'Fix Your Resume PDF — Your Name is Being Mangled by ATS Systems';
    priorityDesc = 'Your current PDF has a font encoding bug that renders your name as "J E III / OSEPH REXSON" to ATS parsers like Workday, Greenhouse, and Taleo. Head to <strong style="color:var(--gold)">Resume Studio</strong> → click <strong style="color:var(--gold)">Print Clean Resume</strong> to export a pixel-perfect, ATS-safe PDF that correctly shows your name, AWS/GCP skills, and team leadership scope.';
  } else if (!resume?.contact?.linkedin || !resume?.contact?.github) {
    priorityTitle = 'Connect Your Public Profiles to Boost ATS Indexing';
    priorityDesc = 'ATS parsers and recruiters prioritize applicants with verified technical presence. Add your LinkedIn profile URL and GitHub link in Resume Studio to gain +15 points on your readiness benchmark.';
  } else if (atsScore < 80) {
    priorityTitle = `Align Key Technical Skills for ${resume?.meta?.targetTitle || 'Target Roles'}`;
    priorityDesc = `Your resume readiness score is currently at ${atsScore}%. Review your keyword density in <strong style="color:var(--gold)">Resume Studio</strong> to match high-demand enterprise benchmarks.`;
  } else {
    priorityTitle = `Accelerate Application Pipeline for ${formatK(targetComp)}+ Opportunities`;
    priorityDesc = 'Your resume profile is well-aligned with top compensation standards. Track active submissions in the Job Tracker and leverage customized cover letters to maximize conversion.';
    priorityActionText = 'Open Job Tracker →';
    priorityActionPage = 'jobs';
  }

  // Issue rows
  let issuesHtml = '';
  if (isOwnerUser) {
    issuesHtml = `
      ${issueRow('🔴', 'CRITICAL', 'PDF font encoding breaks your name', 'Print from Resume Studio → ATS-safe HTML/CSS', true)}
      ${issueRow('🔴', 'HIGH', 'Title reads "Network Engineer IV" not "DevOps Lead"', 'Clean resume uses correct title')}
      ${issueRow('🔴', 'HIGH', 'Leading 10+ engineers not mentioned', 'Added to BofA role bullets')}
      ${issueRow('🔴', 'HIGH', 'AWS (EC2/S3/IAM/EKS/VPC/Route53) missing', 'Added to skills + experience')}
      ${issueRow('🟠', 'MEDIUM', 'GCP (GKE, Cloud Run) missing', 'Added to skills section')}
      ${issueRow('🟠', 'MEDIUM', 'No LinkedIn or GitHub URL on resume', 'Added to clean resume header')}
      ${issueRow('🟠', 'MEDIUM', 'No Projects section (Unity Recovery, Mythralis)', 'Added in clean resume')}
      ${issueRow('🟡', 'LOW', 'Date typo "01//2019" double slash', 'Fixed in clean version')}
    `;
  } else {
    const issues = [];
    if (!resume?.contact?.linkedin) {
      issues.push(issueRow('🟠', 'MEDIUM', 'No LinkedIn profile URL listed', 'Add your LinkedIn to the contact header'));
    }
    if (!resume?.contact?.github) {
      issues.push(issueRow('🟠', 'MEDIUM', 'No GitHub profile URL listed', 'Add GitHub to showcase technical repositories'));
    }
    if ((resume?.skills?.length || 0) < 8) {
      issues.push(issueRow('🔴', 'HIGH', 'Skill density below top ATS benchmark', 'Add core technologies to your skills in Resume Studio'));
    }
    if (!resume?.certifications || resume.certifications.length === 0) {
      issues.push(issueRow('🟡', 'LOW', 'No industry certifications on file', 'Add relevant certifications to accelerate recruiter vetting'));
    }
    issues.push(issueRow('🟢', 'RESOLVED', 'ATS-safe semantic structure created', 'Print clean PDF directly from Resume Studio', true));
    issuesHtml = issues.join('');
  }

  const confirmedSkills = skills?.categories?.flatMap(c => c.skills.filter(s => s.status === 'confirmed')).length || (resume?.skills?.length || 18);
  const gapSkills       = skills?.categories?.flatMap(c => c.skills.filter(s => s.status === 'gap' || s.status === 'cert-gap')).length || 10;

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">⚡ Career Command Center</div>
      <div class="page-subtitle">Welcome back, ${displayName}. Here is your career readiness snapshot.</div>
    </div>

    ${(isOwner() && !localStorage.getItem('careerEngine_google_client_id')) ? `
      <div style="background:rgba(245, 158, 11, 0.08);border:1px solid var(--gold-border);border-radius:var(--radius-lg);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:24px;">🔑</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--gold-light);">Complete Google Sign-In Setup</div>
            <div style="font-size:12px;color:var(--text-secondary);">Click below to paste your Google OAuth Client ID and activate 1-click Google Sign-In.</div>
          </div>
        </div>
        <button class="btn btn-gold btn-sm" onclick="navigate('settings')">⚙️ Open Google Auth Settings →</button>
      </div>
    ` : ''}

    <!-- Action Priority -->
    <div class="action-card mb-24">
      <div class="priority-label">🎯 Today's Top Priority</div>
      <div class="priority-title">${priorityTitle}</div>
      <div class="priority-desc">
        ${priorityDesc}
      </div>
      <div class="flex gap-8 mt-16">
        <button class="btn btn-gold" onclick="navigate('${priorityActionPage}')">${priorityActionText}</button>
        <button class="btn btn-ghost" onclick="navigate('linkedin')">LinkedIn Optimizer →</button>
      </div>
    </div>

    <!-- Stat Row -->
    <div class="grid-4 mb-24">
      <div class="stat-tile">
        <div class="stat-label">ATS Readiness</div>
        <div class="stat-value gold" id="ats-counter">0</div>
        <div class="stat-sub">/ 100 — Target: 85+</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">LinkedIn Score</div>
        <div class="stat-value" id="li-counter">0</div>
        <div class="stat-sub">/ 100 — Target: 90+</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Confirmed Skills</div>
        <div class="stat-value green">${confirmedSkills}</div>
        <div class="stat-sub">${gapSkills} gaps identified</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Applications</div>
        <div class="stat-value">${jobs.length}</div>
        <div class="stat-sub">tracked in pipeline</div>
      </div>
    </div>

    <!-- Score Rings + Comp Gap -->
    <div class="grid-2 gap-20 mb-24">
      <div class="card">
        <div class="card-title"><span class="dot"></span>Score Breakdown</div>
        <div class="flex gap-20" style="justify-content:space-around;padding:12px 0;">
          <div class="ring-container">
            ${ringHTML('ats-ring', atsScore, 'ATS Score')}
          </div>
          <div class="ring-container">
            ${ringHTML('li-ring', liScore.score, 'LinkedIn', '#3b82f6')}
          </div>
        </div>
        <div class="mt-16" style="font-size:12px;color:var(--text-dim);line-height:1.8;border-top:1px solid var(--border);padding-top:12px;">
          <div>🟡 <strong style="color:var(--text-secondary)">ATS:</strong> Boost score with target role keywords and verified project URLs</div>
          <div>🔵 <strong style="color:var(--text-secondary)">LinkedIn:</strong> Optimize headline, summary, and recruiter visibility to reach 90+</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>Compensation Gap Tracker</div>
        <div class="comp-gap-wrap" style="border:none;padding:0;">
          <div class="comp-gap-labels">
            <span>Current Comp</span>
            <span>Target Comp</span>
          </div>
          <div class="comp-gap-bar-track">
            <div class="comp-gap-bar-fill" id="comp-bar" style="width:0%"></div>
          </div>
          <div class="comp-gap-values">
            <div>
              <div class="comp-current">${formatK(currComp)}</div>
              <div class="text-sm text-dim">${compCurrentRole}</div>
            </div>
            <div style="text-align:right">
              <div class="comp-target">${formatK(targetComp)}+</div>
              <div class="text-sm text-dim">${compTargetRole}</div>
            </div>
          </div>
          <div class="comp-diff mt-8">📈 ${formatK(compDiff)}+ gap — achievable with target role positioning & skill mastery</div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px;">
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">Market Range for Your Profile</div>
          <div class="flex gap-8">
            <div class="chip gold">${resume?.meta?.targetTitle || 'Engineer'}: ${formatK(currComp)}–${formatK(targetComp)}</div>
            <div class="chip blue">Lead / Architect: ${formatK(targetComp)}–${formatK(targetComp * 1.2)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section-title">Quick Actions</div>
    <div class="grid-3 gap-16 mb-24">
      ${quickAction('📄', 'Export Clean Resume PDF', 'ATS-safe layout, print as PDF', 'resume', 'btn-gold')}
      ${quickAction('🔗', 'Update LinkedIn Headline', 'Generate optimized professional headline', 'linkedin', 'btn-outline')}
      ${quickAction('💼', 'Find High-Impact Jobs', 'Browse curated role-specific job boards', 'jobs', 'btn-ghost')}
      ${quickAction('🧠', 'View Skill Gaps', 'Identify benchmark skills for target comp', 'skills', 'btn-ghost')}
      ${quickAction('🚀', 'Project Showcase', 'Review technical presentation', 'projects', 'btn-ghost')}
      ${quickAction('🎯', 'Write Cover Letter', 'Paste a JD — get a tailored letter', 'cover', 'btn-ghost')}
      ${!isOwner() ? `
        <div class="card" style="cursor:pointer;border:1px dashed rgba(239,68,68,0.35);background:rgba(239,68,68,0.04);" onclick="window.openDeleteAccountModal?.()">
          <div style="font-size:28px;margin-bottom:12px;">🗑️</div>
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;color:#fca5a5;">Delete Profile & Reset</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">Purge your imported data and start over with a fresh resume.</div>
          <button class="btn btn-secondary btn-sm" style="color:#ef4444;border-color:rgba(239,68,68,0.45);font-weight:700;" onclick="event.stopPropagation();window.openDeleteAccountModal?.()">Delete & Start Over →</button>
        </div>
      ` : ''}
    </div>

    <!-- Resume Issues Banner -->
    <div class="section-title">🔴 Resume Diagnostics & ATS Optimization</div>
    <div class="card">
      ${issuesHtml}
    </div>
  `;

  // Animate counters
  animateCounter('ats-counter', atsScore);
  animateCounter('li-counter', liScore.score);
  animateRing('ats-ring', atsScore);
  animateRing('li-ring', liScore.score);
  setTimeout(() => {
    const bar = document.getElementById('comp-bar');
    if (bar) bar.style.width = `${compPercent}%`;
  }, 300);
}

function quickAction(icon, title, desc, page, btnClass) {
  return `
    <div class="card" style="cursor:pointer;" onclick="navigate('${page}')">
      <div style="font-size:28px;margin-bottom:12px;">${icon}</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${title}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">${desc}</div>
      <button class="btn ${btnClass} btn-sm" onclick="event.stopPropagation();navigate('${page}')">Open →</button>
    </div>`;
}

function issueRow(emoji, severity, issue, fix, fixed = false) {
  return `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:14px;margin-top:1px;">${emoji}</span>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;color:${severity==='CRITICAL'?'var(--red)':severity==='HIGH'?'var(--orange)':'var(--gold)'};">${severity}</div>
        <div style="font-size:13px;color:var(--text-primary);margin-top:2px;">${issue}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Fix: ${fix}</div>
      </div>
      <span class="chip ${fixed ? 'green' : 'gold'}">${fixed ? '✅ Fixed' : '⚡ Auto-Fixed'}</span>
    </div>`;
}

// ── RESUME STUDIO ─────────────────────────────────────────────
export function renderResumeStudio() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <div class="page-title">📄 Resume Studio</div>
        <div class="page-subtitle">ATS-optimized resume with live keyword analysis. Print as a clean, encoding-safe PDF.</div>
      </div>
      ${!isOwner() ? `
        <button class="btn btn-secondary btn-sm" id="btn-studio-header-delete" onclick="window.openDeleteAccountModal?.()" style="color:#f87171;border-color:rgba(239,68,68,0.4);font-size:12px;font-weight:700;padding:8px 14px;display:flex;align-items:center;gap:6px;" title="Permanently delete profile and start over with a fresh resume">
          <span>🗑️</span> <span>Delete Profile & Start Over</span>
        </button>
      ` : ''}
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" id="tab-optimized" onclick="switchResumeTab('optimized')">✅ Optimized Resume</button>
      <button class="tab-btn" id="tab-ats" onclick="switchResumeTab('ats')">🔍 ATS Keyword Analyzer</button>
      <button class="tab-btn" id="tab-original" onclick="switchResumeTab('original')">📁 Original (For Reference)</button>
    </div>

    <div id="resume-tab-content"></div>
  `;
  switchResumeTab('optimized');
}

window.switchResumeTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  const tc = document.getElementById('resume-tab-content');
  if (tab === 'optimized') tc.innerHTML = optimizedResumeHTML();
  else if (tab === 'ats') tc.innerHTML = atsAnalyzerHTML();
  else if (tab === 'original') tc.innerHTML = originalResumeNote();
};

window.printResume = function() {
  const profile = window._state?.resumeData;
  if (profile) {
    localStorage.setItem('careerEngine_active_profile', JSON.stringify(profile));
  }
  window.open('./pages/resume.html', '_blank');
  window.toast('Opening print-optimized resume in new tab. Use Ctrl+P to save as PDF.', 'green');
};

function optimizedResumeHTML() {
  const resume = window._state?.resumeData || {};
  const contact = resume.contact || {};
  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  const education = Array.isArray(resume.education) ? resume.education : [];
  const certs = Array.isArray(resume.certifications) ? resume.certifications : [];

  return `
    <div class="flex justify-between items-center mb-16">
      <div>
        <div class="chip green">✅ ATS-Safe Encoding</div>
        <span style="margin-left:8px;font-size:12px;color:var(--text-dim);">Formatted for automated ingestion by Workday, Greenhouse, Taleo, and Lever</span>
      </div>
      <div class="flex gap-8" style="align-items:center;flex-wrap:wrap;">
        ${!isOwner() ? `
          <button class="btn btn-secondary btn-sm" id="btn-resume-delete-profile" onclick="window.openDeleteAccountModal?.()" style="color:#f87171;border-color:rgba(239,68,68,0.35);font-size:12px;font-weight:600;" title="Permanently delete profile and start over with a fresh resume">
            🗑️ Delete Profile / Start Over
          </button>
        ` : ''}
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard(document.getElementById('resume-text').innerText, this)">📋 Copy Plain Text</button>
        <button class="btn btn-gold" onclick="printResume()">🖨️ Print / Export PDF</button>
      </div>
    </div>

    <div class="resume-preview" id="resume-text">
      <h1>${escapeHtml(contact.name || 'Your Name')}</h1>
      <div class="resume-contact">
        ${contact.location ? `<span>📍 ${escapeHtml(contact.location)}</span>` : ''}
        ${contact.phone ? `<span>📞 ${escapeHtml(contact.phone)}</span>` : ''}
        ${contact.email ? `<span>✉️ <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></span>` : ''}
        ${contact.linkedin ? `<span>🔗 <a href="${escapeHtml(contact.linkedin)}" target="_blank">LinkedIn</a></span>` : ''}
        ${contact.github ? `<span>💻 <a href="${escapeHtml(contact.github)}" target="_blank">GitHub</a></span>` : ''}
      </div>
      <hr>

      <h2>Professional Summary</h2>
      <p style="font-size:12.5px;color:#333;line-height:1.6;">${escapeHtml(resume.summary || 'Experienced engineering professional with high-impact system automation and delivery background.')}</p>
      <hr>

      <h2>Core Competencies & Skills</h2>
      <div class="skills-grid">
        ${skills.map(sk => `<div>• ${escapeHtml(sk)}</div>`).join('')}
      </div>
      <hr>

      <h2>Professional Experience</h2>
      ${experience.map(exp => `
        <h3>${escapeHtml(exp.title || 'Role')}</h3>
        <div class="job-meta">${escapeHtml(exp.company || 'Company')} &nbsp;|&nbsp; ${escapeHtml(exp.duration || '')} ${exp.teamSize ? `&nbsp;|&nbsp; Team: ${escapeHtml(exp.teamSize)}` : ''}</div>
        <ul>
          ${(exp.highlights || []).map(h => `<li>${escapeHtml(h)}</li>`).join('')}
        </ul>
      `).join('')}
      <hr>

      ${certs.length > 0 ? `
        <h2>Certifications</h2>
        <ul>
          ${certs.map(c => `<li>${escapeHtml(typeof c === 'string' ? c : c.name)}</li>`).join('')}
        </ul>
        <hr>
      ` : ''}

      <h2>Education</h2>
      <ul>
        ${education.map(edu => `
          <li><strong>${escapeHtml(edu.degree || 'Degree')}</strong> &nbsp;|&nbsp; ${escapeHtml(edu.institution || 'University')}${edu.year ? ' (' + escapeHtml(edu.year) + ')' : ''}</li>
        `).join('')}
      </ul>
    </div>
  `;
}

function atsAnalyzerHTML() {
  const resumeText = JSON.stringify(window._state?.resumeData || {}).toLowerCase();
  const targetKeywords = [
    'DevOps', 'DevSecOps', 'Kubernetes', 'Docker', 'Terraform', 'Ansible',
    'Jenkins', 'AWS', 'GCP', 'CI/CD', 'Platform', 'Python', 'Team Lead',
    'Agile', 'Scrum', 'IaC', 'GitHub Actions', 'FinOps', 'Observability',
    'Datadog', 'Prometheus', 'Grafana', 'ArgoCD', 'Helm', 'OpenShift',
    'Azure', 'PowerShell', 'Playwright'
  ].map(kw => ({ kw, found: resumeText.includes(kw.toLowerCase()) }));

  const found = targetKeywords.filter(k => k.found).length;
  const pct = Math.round((found / targetKeywords.length) * 100);

  return `
    <div class="card mb-20">
      <div class="card-title"><span class="dot"></span>Keyword Match Score</div>
      <div class="flex items-center gap-20">
        <div style="font-size:48px;font-weight:800;color:var(--gold);">${pct}%</div>
        <div>
          <div style="font-size:14px;color:var(--text-primary);font-weight:600;">${found} of ${targetKeywords.length} high-demand keywords found</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Evaluates keyword presence against leading cloud and infrastructure benchmarks. Add missing skills to elevate your profile ATS readiness.</div>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:24px;">
      ${targetKeywords.map(k => `<span class="keyword-tag ${k.found ? 'found' : 'missing'}">${k.found ? '✓' : '✗'} ${k.kw}</span>`).join('')}
    </div>

    <div class="section-title">🚀 Paste a Job Description for Role-Specific Match</div>
    <div class="grid-2 gap-16">
      <div>
        <label class="field-label">Job Description</label>
        <textarea id="jd-ats-input" class="field" rows="10" placeholder="Paste job description here to see your specific keyword match..."></textarea>
        <button class="btn btn-gold btn-sm mt-8" onclick="analyzeJD()">⚡ Analyze Match</button>
      </div>
      <div id="jd-ats-result">
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Paste a JD to analyze</div>
          <div class="empty-desc">The analyzer will highlight which keywords from the job description your resume already contains and which are missing.</div>
        </div>
      </div>
    </div>
  `;
}

window.analyzeJD = function() {
  const jd = document.getElementById('jd-ats-input')?.value?.toLowerCase() || '';
  if (!jd.trim()) { window.toast('Paste a job description first', 'red'); return; }

  const keywords = jd.match(/\b([A-Za-z][A-Za-z0-9\+\#\/\-]{2,})\b/g) || [];
  const unique = [...new Set(keywords)].filter(k => k.length > 3);
  const resumeText = document.getElementById('resume-text')?.innerText?.toLowerCase() || '';
  const matched = unique.filter(k => resumeText.includes(k.toLowerCase()));
  const missed  = unique.filter(k => !resumeText.includes(k.toLowerCase())).slice(0, 20);

  const pct = Math.round((matched.length / unique.length) * 100);

  document.getElementById('jd-ats-result').innerHTML = `
    <div class="card gold-border">
      <div style="font-size:32px;font-weight:800;color:var(--gold);margin-bottom:4px;">${pct}%</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">${matched.length}/${unique.length} JD keywords matched</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">Missing Keywords (add to cover letter / resume variants):</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">
        ${missed.map(k => `<span class="keyword-tag missing">✗ ${k}</span>`).join('')}
      </div>
    </div>`;
};

function originalResumeNote() {
  return `
    <div class="card gold-border">
      <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
      <div style="font-size:18px;font-weight:700;color:var(--red);margin-bottom:8px;">Original PDF Has a Critical Encoding Bug</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">
        Your original <code style="color:var(--gold);font-family:monospace;">JosephErexsonResume2024.pdf</code> contains a font encoding issue that causes ATS systems to parse your name as <strong style="color:var(--red)">"J E III / OSEPH REXSON"</strong> and mangles bullet characters throughout the document.<br><br>
        <strong style="color:var(--text-primary)">This is the #1 reason you may not be getting callbacks.</strong><br><br>
        The original file is preserved at <code style="color:var(--gold);font-family:monospace;">assets/JosephErexsonResume2024.pdf</code> for reference only. Use the <strong style="color:var(--gold)">Optimized Resume</strong> tab and print it as PDF — it is encoding-safe, correctly structured, and ATS-compliant.
      </div>
      <div class="flex gap-8 mt-16">
        <button class="btn btn-gold" onclick="switchResumeTab('optimized')">View Optimized Resume →</button>
        <button class="btn btn-ghost" onclick="printResume()">🖨️ Print Clean PDF</button>
      </div>
    </div>`;
}

// ── SKILL GAP ENGINE ──────────────────────────────────────────
export function renderSkillGap() {
  const skills = window._state?.skillsData;
  const content = document.getElementById('page-content');

  const allSkills = skills?.categories?.flatMap(c =>
    c.skills.map(s => ({ ...s, category: c.label }))
  ) || [];

  const confirmed = allSkills.filter(s => s.status === 'confirmed');
  const gaps      = allSkills.filter(s => s.status === 'gap');
  const certGaps  = allSkills.filter(s => s.status === 'cert-gap');

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">🧠 Skill Gap Engine</div>
      <div class="page-subtitle">Your confirmed skills vs. what $200k+ DevOps Lead / Platform Engineering roles demand</div>
    </div>

    <div class="grid-4 mb-24">
      <div class="stat-tile"><div class="stat-label">Confirmed Skills</div><div class="stat-value green">${confirmed.length}</div><div class="stat-sub">on your resume/background</div></div>
      <div class="stat-tile"><div class="stat-label">Skill Gaps</div><div class="stat-value" style="color:var(--red)">${gaps.length}</div><div class="stat-sub">missing from $200k target</div></div>
      <div class="stat-tile"><div class="stat-label">Cert Gaps</div><div class="stat-value" style="color:var(--purple)">${certGaps.length}</div><div class="stat-sub">certifications to earn</div></div>
      <div class="stat-tile"><div class="stat-label">Priority #1</div><div class="stat-value gold" style="font-size:18px;">AWS SAA-C03</div><div class="stat-sub">highest ROI certification</div></div>
    </div>

    <div class="action-card mb-24">
      <div class="priority-label">💡 Highest ROI Path to $200k+</div>
      <div class="priority-title">AWS SAA-C03 Cert + Add Observability (Datadog/Grafana) + GitOps (ArgoCD)</div>
      <div class="priority-desc">These 3 areas appear in 80%+ of $200k+ DevOps Lead JDs. You already have the hands-on experience — you just need the formal credential and a line on the resume. AWS SAA-C03 typically takes 6–8 weeks of study and costs $300.</div>
      <div class="flex gap-8 mt-16">
        <a href="https://aws.amazon.com/certification/certified-solutions-architect-associate/" target="_blank" class="btn btn-gold btn-sm">Start AWS SAA-C03 →</a>
        <a href="https://grafana.com/tutorials/" target="_blank" class="btn btn-ghost btn-sm">Grafana Tutorials →</a>
        <a href="https://argo-cd.readthedocs.io/en/stable/" target="_blank" class="btn btn-ghost btn-sm">ArgoCD Docs →</a>
      </div>
    </div>

    ${(skills?.categories || []).map(cat => `
      <div class="section-title">${cat.label}</div>
      <div class="card mb-16">
        ${cat.skills.map(s => skillRowHTML(s)).join('')}
      </div>
    `).join('')}
  `;
}

function skillRowHTML(s) {
  const pct = (s.level / 5) * 100;
  const statusColor = s.status === 'confirmed' ? 'green' : s.status === 'cert-gap' ? 'purple' : 'red';
  const statusLabel = s.status === 'confirmed' ? '✓ Confirmed' : s.status === 'cert-gap' ? '📜 Cert Needed' : '⚠ Gap';
  return `
    <div class="skill-row">
      <div class="skill-name">${s.name}</div>
      <div class="skill-bar-wrap">
        <div class="skill-bar-fill ${s.status}" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;min-width:200px;justify-content:flex-end;">
        <div class="skill-demand">Demand: ${'★'.repeat(s.demand200k)}${'☆'.repeat(5-s.demand200k)}</div>
        <span class="chip ${statusColor} text-xs">${statusLabel}</span>
        ${s.resource ? `<a href="${s.resource}" target="_blank" class="btn btn-ghost btn-sm" style="padding:4px 8px;font-size:10px;">Learn →</a>` : ''}
      </div>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────
function ringHTML(id, score, label, color = 'var(--gold)') {
  const circ = 339.292;
  const offset = circ - (circ * score / 100);
  return `
    <div class="ring-wrap">
      <svg class="ring-svg" viewBox="0 0 120 120">
        <circle class="ring-track" cx="60" cy="60" r="54"/>
        <circle class="ring-fill" id="${id}" cx="60" cy="60" r="54" style="stroke:${color};stroke-dashoffset:${offset}"/>
      </svg>
      <div class="ring-label">
        <span class="ring-score" style="color:${color}" id="${id}-val">0</span>
        <span class="ring-unit">${label}</span>
      </div>
    </div>`;
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

function animateRing(id, score) {
  const circ = 339.292;
  setTimeout(() => {
    const ring = document.getElementById(id);
    if (ring) ring.style.strokeDashoffset = circ - (circ * score / 100);
    const val = document.getElementById(`${id}-val`);
    if (val) animateCounter(`${id}-val`, score);
  }, 200);
}
