/* ============================================================
   LINKEDIN-ENGINE.JS — LinkedIn Optimizer & Copy Blocks
   ============================================================ */

'use strict';

import { analyzeResumeText, extractTextFromFile } from './resume-parser.js?v=8';

const CHECKLIST_STORAGE_KEY = 'careerEngine_linkedin_rewrite_checklist_v1';

let latestParsedExport = null;
let latestImportPayload = null;
let latestImportSource = '';

const LINKEDIN_SECTIONS = [
  {
    id: 'headline',
    title: '🏷️ Headline',
    maxChars: 220,
    priority: 'critical',
    tip: 'This is the #1 recruiter search field. Must contain your top 3–4 role keywords.',
    content: `DevOps Lead | QA Automation Lead | Platform Engineering | AWS • GCP • Kubernetes • Terraform | 10+ Years Enterprise CI/CD & DevSecOps | Bank of America | Remote`
  },
  {
    id: 'about',
    title: '📝 About / Summary',
    maxChars: 2600,
    priority: 'critical',
    tip: 'LinkedIn weights the About section heavily. Use 3–5 paragraphs with keyword-rich language. First 2 lines show before "see more" — make them count.',
    content: `Senior DevOps Lead and QA Automation Engineer with 10+ years of enterprise experience driving cloud infrastructure, DevSecOps strategy, and large-scale CI/CD automation across financial, healthcare, education, and legal sectors.

Currently embedded at Bank of America, leading a cross-functional team of 10+ engineers to architect and deliver enterprise-grade platform solutions. My work spans Kubernetes orchestration, Terraform IaC (80% reduction in manual provisioning time), Docker containerization, Jenkins pipelines, and AWS/GCP cloud infrastructure at scale.

Key achievements that define my impact:
• Designed CI/CD pipeline architecture cutting deployment provisioning time by 80%
• Built Postman API collection covering 500+ endpoints — integrated as CI/CD quality gates
• Deployed Docker/Kubernetes orchestration achieving 70% improvement in system scalability
• Led DevSecOps integration across Agile squads, embedding security controls into the SDLC
• Managed AWS (EC2, S3, IAM, EKS, VPC, Route53) and GCP (GKE, Cloud Run) at enterprise scale

Beyond Bank of America, I am the founder of Unity Recovery — a live SaaS platform for addiction recovery support — and principal consultant at Mythralis, an AI & IT consulting firm operating under Fortico Holdings. I build robotics and IoT systems using Raspberry Pi, Arduino, ROS, and computer vision in my engineering lab.

I am actively exploring senior remote opportunities (DevOps Lead, Platform Engineering Lead, DevSecOps Lead, Cloud Architect) in the $200k+ compensation range. Open to connecting with engineering leaders, hiring managers, and recruiters.

📍 New London, NC | 100% Remote | jerexson3@gmail.com`
  },
  {
    id: 'experience-bofa',
    title: '🏢 BofA Experience Section',
    maxChars: 2000,
    priority: 'high',
    tip: 'Use the exact title you want to be known by — not your contract title. LinkedIn\'s algorithm uses your title for recruiter searches.',
    content: `Title: DevOps Lead / QA Automation Lead
Company: Bank of America (via TekSystems)
Location: Charlotte, NC · Remote
Start Date: March 2019 | End Date: Present
Team Size: 10+ Engineers

Description:
Lead a cross-functional team of 10+ engineers across DevSecOps, QA automation, and platform reliability at one of the largest financial institutions in the United States.

• Architected and scaled CI/CD pipelines using Jenkins, OpenShift, Docker, and Kubernetes — improving deployment throughput and cutting infrastructure provisioning time by 80% via Terraform IaC.
• Designed and deployed container orchestration systems achieving 70% improvement in system scalability and reliability.
• Built and own a Postman API collection of 500+ endpoints for enterprise regression and functional testing integrated as CI/CD quality gates.
• Leveraged AWS (EC2, S3, IAM, EKS, VPC, Route53) and GCP (GKE, Cloud Run) to architect cloud infrastructure automation at scale.
• Spearheaded DevSecOps strategy across Agile squads, embedding security controls and automated compliance into the SDLC.
• Drove XLRelease / Digital.ai release orchestration and Tanium patch automation across Windows Server 2016–2022 environments.
• Implemented AI-assisted development workflows (GitHub Copilot, Replit AI, O365 Copilot) to accelerate team velocity.`
  },
  {
    id: 'skills',
    title: '🔧 Skills Section (Top 50)',
    maxChars: 999,
    priority: 'high',
    tip: 'LinkedIn lets you pin 3 skills to the top — pin your most searchable ones. Endorsements boost visibility; ask 3–5 colleagues to endorse your top skills.',
    content: `📌 PIN THESE 3 FIRST:
1. DevOps
2. Kubernetes
3. Terraform

THEN ADD ALL OF THESE:
DevSecOps, CI/CD, Docker, Jenkins, Ansible, OpenShift, Helm, GitHub Actions, XLRelease, Digital.ai, Bitbucket, Amazon Web Services (AWS), AWS EC2, AWS EKS, AWS S3, AWS IAM, AWS VPC, Amazon Route53, Google Cloud Platform (GCP), Google Kubernetes Engine (GKE), Microsoft Azure, Infrastructure as Code (IaC), Playwright, Postman API, QA Automation, Test Automation, Python, PowerShell, Bash, JavaScript, Agile Methodology, Scrum, DevOps Engineering, Platform Engineering, Cloud Architecture, Disaster Recovery, SCCM, Active Directory, Network Engineering, Systems Administration, Team Leadership, Technical Project Management, AI-Assisted Development, GitHub Copilot`
  },
  {
    id: 'featured',
    title: '⭐ Featured Section',
    maxChars: 999,
    priority: 'medium',
    tip: 'Add 2–3 featured items to increase profile engagement. LinkedIn shows the Featured section prominently to recruiters.',
    content: `ADD THESE FEATURED ITEMS:

1. 🏥 Unity Recovery (Link: your live app URL or LinkedIn post about it)
   Caption: "Founder of Unity Recovery — a live SaaS platform for addiction recovery support. Built on cloud infrastructure with client management, peer support, and compliance tooling."

2. 💼 Mythralis / Fortico Holdings (Link: website or LinkedIn company page)
   Caption: "Principal Consultant at Mythralis — AI & IT consulting firm helping businesses modernize their DevOps, cloud infrastructure, and automation pipelines."

3. 📄 Resume / Portfolio (Link: your Vercel portfolio URL once deployed)
   Caption: "10+ Years Enterprise DevOps | AWS | Kubernetes | Terraform | CI/CD | Team Lead"`
  },
  {
    id: 'open-to-work',
    title: '🔍 Open To Work (Recruiter-Only)',
    maxChars: 999,
    priority: 'high',
    tip: 'Setting "Open to Work" visible only to recruiters (not publicly) gives you a 2x boost in recruiter InMail messages without signaling to your current employer.',
    content: `SETTINGS TO CONFIGURE:
Go to: LinkedIn → "Open to" → "Finding a new job" → Share only with recruiters

Job Titles to List:
• DevOps Lead
• DevSecOps Lead  
• Platform Engineering Lead
• Staff DevOps Engineer
• Cloud Architect
• Engineering Manager (Infrastructure)
• Technical Program Manager (DevOps/Platform)

Location: Remote
Job Type: Full-Time
Start Date: Open
Industries: Technology, Financial Services, Healthcare Tech, Consulting`
  }
];

const REWRITE_CHECKLIST = [
  'Update headline',
  'Update About / Summary',
  'Update current role title and bullets',
  'Reorder and add top skills',
  'Enable Open to Work (recruiter-only)',
  'Add 2-3 Featured items',
  'Confirm certifications and education'
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getChecklistState() {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {}
  const defaults = {};
  REWRITE_CHECKLIST.forEach(item => {
    defaults[item] = false;
  });
  return defaults;
}

function saveChecklistState(state) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
}

function renderRewriteChecklist() {
  const state = getChecklistState();
  const doneCount = REWRITE_CHECKLIST.filter(item => state[item]).length;

  return `
    <div class="card mb-20">
      <div class="card-title"><span class="dot"></span>One-Time Full Rewrite Checklist</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">${doneCount}/${REWRITE_CHECKLIST.length} complete</div>
      <div style="display:grid;gap:8px;">
        ${REWRITE_CHECKLIST.map(item => `
          <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary);">
            <input type="checkbox" data-li-check="${escapeHtml(item)}" ${state[item] ? 'checked' : ''} />
            <span>${escapeHtml(item)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

function parseLines(raw) {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function extractBetween(text, startRegex, endRegex) {
  const start = text.search(startRegex);
  if (start < 0) return '';
  const tail = text.slice(start);
  const afterStart = tail.replace(startRegex, '');
  const endMatch = afterStart.match(endRegex);
  if (!endMatch) return afterStart.trim();
  const idx = endMatch.index || 0;
  return afterStart.slice(0, idx).trim();
}

function parseLinkedInExport(raw) {
  const lines = parseLines(raw);
  const nameIndex = lines.findIndex(line => /^[A-Z][a-z]+\s+[A-Z]/.test(line));
  let headline = '';

  if (nameIndex >= 0 && lines[nameIndex + 1]) {
    headline = lines[nameIndex + 1];
  }

  const summary = extractBetween(raw, /\bSummary\b\s*/i, /\bExperience\b\s*/i);
  const experience = extractBetween(raw, /\bExperience\b\s*/i, /\bEducation\b\s*/i);
  const topSkillsRaw = extractBetween(raw, /\bTop Skills\b\s*/i, /\bLanguages\b|\bCertifications\b|\bJoseph\b/i);
  const certsRaw = extractBetween(raw, /\bCertifications\b\s*/i, /\bJoseph\b|\bExperience\b/i);

  const topSkills = parseLines(topSkillsRaw).slice(0, 12);
  const certifications = parseLines(certsRaw).slice(0, 20);

  const bofaExperienceMatch = experience.match(/Bank of America[\s\S]*?(?=\n[A-Z][A-Za-z/&\-\s]+\n\d|\nEducation|\nPage\s+\d+|$)/i);
  const bofaExperience = bofaExperienceMatch ? bofaExperienceMatch[0].trim() : '';

  return {
    headline: headline.trim(),
    summary: summary.trim(),
    experience: experience.trim(),
    bofaExperience,
    topSkills,
    certifications,
  };
}

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function keywordOverlapRatio(current, recommended) {
  const currentTokens = new Set(tokenize(current));
  const recTokens = Array.from(new Set(tokenize(recommended)));
  if (!recTokens.length) return 0;
  const overlap = recTokens.filter(token => currentTokens.has(token)).length;
  return overlap / recTokens.length;
}

function statusFromTexts(current, recommended) {
  if (!current || !current.trim()) return 'missing';
  const ratio = keywordOverlapRatio(current, recommended);
  if (ratio >= 0.72) return 'match';
  if (ratio >= 0.35) return 'partial';
  return 'outdated';
}

function statusChip(status) {
  const map = {
    match: { label: 'MATCH', color: 'var(--green)' },
    partial: { label: 'PARTIAL', color: 'var(--blue)' },
    missing: { label: 'MISSING', color: 'var(--red)' },
    outdated: { label: 'OUTDATED', color: 'var(--gold)' },
  };
  const cfg = map[status] || map.outdated;
  return `<span style="font-size:10px;font-weight:700;color:${cfg.color};">${cfg.label}</span>`;
}

function getCurrentSectionText(sectionId, parsed) {
  if (!parsed) return '';
  if (sectionId === 'headline') return parsed.headline;
  if (sectionId === 'about') return parsed.summary;
  if (sectionId === 'experience-bofa') return parsed.bofaExperience || parsed.experience;
  if (sectionId === 'skills') return parsed.topSkills.join(', ');
  if (sectionId === 'featured') return '';
  if (sectionId === 'open-to-work') return '';
  return '';
}

function renderDiffResults(parsed) {
  const rows = LINKEDIN_SECTIONS.map(section => {
    const current = getCurrentSectionText(section.id, parsed);
    const status = statusFromTexts(current, section.content);
    const currentLen = current.length;
    const limitMeta = section.maxChars ? `${currentLen}/${section.maxChars}` : `${currentLen}`;

    return `
      <div class="copy-block mb-12">
        <div class="copy-block-header">
          <div>
            <div class="copy-block-title">${section.title}</div>
            <div style="font-size:10px;color:var(--text-dim);">Current size: ${limitMeta}</div>
          </div>
          <div>${statusChip(status)}</div>
        </div>
        <div class="grid-2 gap-12" style="padding:12px;">
          <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">
            <div style="padding:8px 10px;background:var(--bg-glass);font-size:11px;color:var(--text-dim);border-bottom:1px solid var(--border);">Current (from export)</div>
            <div style="padding:10px;font-size:12px;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;max-height:180px;overflow:auto;">${escapeHtml(current || 'No section found in export')}</div>
          </div>
          <div style="border:1px solid var(--gold-border);border-radius:10px;overflow:hidden;">
            <div style="padding:8px 10px;background:var(--gold-glow);font-size:11px;color:var(--text-dim);border-bottom:1px solid var(--border);">Recommended</div>
            <div style="padding:10px;font-size:12px;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;max-height:180px;overflow:auto;">${escapeHtml(section.content)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section-title">Diff Report — Current vs Recommended</div>
    ${rows}
  `;
}

function cleanLinkedInImportText(raw) {
  return String(raw || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeLinkedInImport(parsed, rawText = '', fileName = '') {
  if (!parsed?.profile) return null;

  const profile = structuredClone(parsed.profile);
  profile.meta = profile.meta || {};
  profile.meta.parsedFileName = fileName || profile.meta.parsedFileName || 'LinkedIn export';
  profile.meta.importSource = rawText ? 'text' : 'file';
  profile.meta.lastUpdated = new Date().toISOString().slice(0, 10);
  profile.meta.sourceOfTruth = 'linkedin-import';
  if (rawText) profile.meta.importPreview = rawText.slice(0, 240);

  return { ...parsed, profile };
}

function renderImportPreview(payload) {
  if (!payload?.profile) return '';
  const profile = payload.profile;
  const sections = [
    ['Name', profile.contact?.name || 'Not detected'],
    ['Headline', profile.meta?.targetTitle || 'Not detected'],
    ['Summary', profile.summary || 'Not detected'],
    ['Skills', Array.isArray(profile.skills) ? profile.skills.slice(0, 10).join(', ') : 'Not detected'],
    ['Experience entries', Array.isArray(profile.experience) ? String(profile.experience.length) : '0'],
    ['Certifications', Array.isArray(profile.certifications) ? profile.certifications.join(', ') : 'None'],
  ];

  return `
    <div class="copy-block mb-16">
      <div class="copy-block-header">
        <div>
          <div class="copy-block-title">Imported Profile Preview</div>
          <div style="font-size:10px;color:var(--text-dim);">Review before saving to the workspace profile source of truth.</div>
        </div>
      </div>
      <div style="padding:12px 16px;">
        ${sections.map(([label, value]) => `
          <div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;line-height:1.5;">
            <div style="min-width:150px;color:var(--text-dim);font-weight:600;">${label}</div>
            <div style="color:var(--text-secondary);white-space:pre-wrap;">${escapeHtml(value)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderImportDiff(payload, currentProfile) {
  if (!payload?.profile) return '';
  const imported = payload.profile;
  const rows = [
    ['Name', currentProfile?.contact?.name || '', imported.contact?.name || ''],
    ['Email', currentProfile?.contact?.email || '', imported.contact?.email || ''],
    ['LinkedIn', currentProfile?.contact?.linkedin || '', imported.contact?.linkedin || ''],
    ['Summary', currentProfile?.summary || '', imported.summary || ''],
    ['Skills', Array.isArray(currentProfile?.skills) ? currentProfile.skills.join(', ') : '', Array.isArray(imported.skills) ? imported.skills.join(', ') : ''],
  ];

  return `
    <div class="section-title">Import Review</div>
    ${rows.map(([label, current, next]) => `
      <div class="copy-block mb-12">
        <div class="copy-block-header">
          <div class="copy-block-title">${label}</div>
        </div>
        <div class="grid-2 gap-12" style="padding:12px;">
          <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">
            <div style="padding:8px 10px;background:var(--bg-glass);font-size:11px;color:var(--text-dim);border-bottom:1px solid var(--border);">Current profile</div>
            <div style="padding:10px;font-size:12px;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;max-height:180px;overflow:auto;">${escapeHtml(current || 'No value set')}</div>
          </div>
          <div style="border:1px solid var(--gold-border);border-radius:10px;overflow:hidden;">
            <div style="padding:8px 10px;background:var(--gold-glow);font-size:11px;color:var(--text-dim);border-bottom:1px solid var(--border);">Imported export</div>
            <div style="padding:10px;font-size:12px;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;max-height:180px;overflow:auto;">${escapeHtml(next || 'No value detected')}</div>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

async function processLinkedInImport(rawText, sourceLabel = 'LinkedIn export') {
  const normalized = cleanLinkedInImportText(rawText);
  if (!normalized) {
    window.toast?.('Import is empty. Add a LinkedIn PDF export or pasted export text.', 'red');
    return;
  }

  const parsed = analyzeResumeText(normalized, sourceLabel);
  latestImportPayload = normalizeLinkedInImport(parsed, normalized, sourceLabel);
  latestImportSource = sourceLabel;

  const reviewHolder = document.getElementById('li-import-review');
  const diffHolder = document.getElementById('li-import-diff');
  const currentProfile = window._state?.resumeData || {};

  if (reviewHolder) reviewHolder.innerHTML = renderImportPreview(latestImportPayload);
  if (diffHolder) diffHolder.innerHTML = renderImportDiff(latestImportPayload, currentProfile);

  window.toast?.(`Imported ${sourceLabel}. Review the changes before saving.`, 'green');
}

async function handleLinkedInImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await extractTextFromFile(file);
    await processLinkedInImport(text, file.name || 'LinkedIn export');
  } catch (error) {
    console.error(error);
    window.toast?.('Could not read that file. Try a PDF export or paste the export text.', 'red');
  }
}

async function handleLinkedInImportPaste() {
  const input = document.getElementById('li-import-textarea');
  if (!input) return;
  await processLinkedInImport(input.value, 'Pasted LinkedIn export text');
}

async function saveLinkedInImport() {
  if (!latestImportPayload?.profile) {
    window.toast?.('Import something first before saving.', 'red');
    return;
  }

  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(latestImportPayload.profile),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to save LinkedIn import');
  }

  const savedProfile = await response.json();
  window._state = window._state || {};
  window._state.resumeData = savedProfile;
  const userEmail = savedProfile?.contact?.email ? savedProfile.contact.email.toLowerCase() : '';
  if (userEmail) {
    localStorage.setItem(`careerEngine_profile_${userEmail}`, JSON.stringify(savedProfile));
  }
  localStorage.setItem('careerEngine_active_profile', JSON.stringify(savedProfile));
  window.updateSidebarMetrics?.();
  renderLinkedInOptimizer();
  window.toast?.('Imported LinkedIn export saved to your profile source of truth.', 'green');
}

function clearLinkedInImport() {
  latestImportPayload = null;
  latestImportSource = '';
  const fileInput = document.getElementById('li-import-file');
  const textInput = document.getElementById('li-import-textarea');
  const reviewHolder = document.getElementById('li-import-review');
  const diffHolder = document.getElementById('li-import-diff');
  if (fileInput) fileInput.value = '';
  if (textInput) textInput.value = '';
  if (reviewHolder) {
    reviewHolder.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        <div class="empty-title">No LinkedIn export imported yet</div>
        <div class="empty-desc">Upload a PDF export or paste raw export text to begin the review.</div>
      </div>
    `;
  }
  if (diffHolder) {
    diffHolder.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        <div class="empty-title">Nothing to compare yet</div>
        <div class="empty-desc">Import a LinkedIn export first to compare it against your current profile.</div>
      </div>
    `;
  }
}

window.linkedInImportTools = {
  importText: (text) => processLinkedInImport(text, 'Pasted LinkedIn export text'),
  importFile: async (file) => {
    const text = await extractTextFromFile(file);
    await processLinkedInImport(text, file?.name || 'LinkedIn export');
  },
  save: saveLinkedInImport,
  clear: clearLinkedInImport,
};

function bindChecklistEvents() {
  const checks = document.querySelectorAll('[data-li-check]');
  checks.forEach(box => {
    box.addEventListener('change', () => {
      const key = box.getAttribute('data-li-check');
      if (!key) return;
      const state = getChecklistState();
      state[key] = !!box.checked;
      saveChecklistState(state);
      const holder = document.getElementById('li-checklist-holder');
      if (holder) {
        holder.innerHTML = renderRewriteChecklist();
        bindChecklistEvents();
      }
    });
  });
}

function runLinkedInExportAnalysis() {
  const input = document.getElementById('li-export-input');
  const out = document.getElementById('li-diff-results');
  if (!input || !out) return;

  const raw = input.value.trim();
  if (!raw) {
    window.toast?.('Paste your LinkedIn export text first.', 'red');
    return;
  }

  latestParsedExport = parseLinkedInExport(raw);
  out.innerHTML = renderDiffResults(latestParsedExport);
  window.toast?.('LinkedIn export analyzed. Review section gaps below.', 'green');
}

function clearLinkedInExportAnalysis() {
  const input = document.getElementById('li-export-input');
  const out = document.getElementById('li-diff-results');
  if (input) input.value = '';
  if (out) {
    out.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        <div class="empty-title">No export analyzed yet</div>
        <div class="empty-desc">Paste your LinkedIn export text and click Analyze to generate section-by-section diffs.</div>
      </div>
    `;
  }
  latestParsedExport = null;
}

export function renderLinkedInOptimizer() {
  const content = document.getElementById('page-content');

  const { score, checks } = window.calcLinkedInScore();
  const pct = score;

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">🔗 LinkedIn Optimizer</div>
      <div class="page-subtitle">Section-by-section copy blocks. Click "Copy" then paste directly into LinkedIn.</div>
    </div>

    <!-- Score + Checklist -->
    <div class="grid-2 gap-20 mb-24">
      <div class="card gold-border">
        <div class="card-title"><span class="dot"></span>LinkedIn Profile Score</div>
        <div class="flex items-center gap-20">
          <div>
            <div style="font-size:52px;font-weight:800;color:var(--gold);">${pct}<span style="font-size:24px;">%</span></div>
            <div style="font-size:13px;color:var(--text-secondary);">Target: 90%+ for max recruiter visibility</div>
          </div>
          <div style="flex:1;">
            ${checks.map(c => `
              <div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">
                <span>${c.done ? '✅' : '⬜'}</span>
                <span style="color:${c.done ? 'var(--text-secondary)' : 'var(--text-primary)'};">${c.label}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>Why LinkedIn Optimization Matters</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">
          <div>📊 <strong style="color:var(--text-primary);">87% of recruiters</strong> use LinkedIn to source candidates</div>
          <div>🔍 <strong style="color:var(--text-primary);">Your headline</strong> is the #1 factor in Boolean search ranking</div>
          <div>💰 Optimized profiles receive <strong style="color:var(--gold);">5–10x more</strong> recruiter InMail messages</div>
          <div>⚡ Keyword density in your About section directly impacts <strong style="color:var(--text-primary);">LinkedIn's AI ranking</strong></div>
          <div class="mt-16">
            <a href="https://www.linkedin.com/in/joseph-erexson-iii-46bb6285/" target="_blank" class="btn btn-outline btn-sm">Open My LinkedIn Profile →</a>
          </div>
        </div>
      </div>
    </div>

    <div id="li-checklist-holder">${renderRewriteChecklist()}</div>

    <div class="card mb-24">
      <div class="card-title"><span class="dot"></span>LinkedIn Import to Profile Source of Truth</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.7;">
        Import a LinkedIn export PDF or paste the export text. Review the differences, then save the approved profile back into the workspace source of truth.
      </div>
      <div class="grid-2 gap-16">
        <div>
          <input id="li-import-file" class="field" type="file" accept=".pdf,.txt,.md,.docx,.rtf" />
          <div class="flex gap-8 mt-8">
            <button class="btn btn-gold btn-sm" id="btn-import-li-file">Import File</button>
            <button class="btn btn-ghost btn-sm" id="btn-clear-li-import">Reset Import</button>
          </div>
        </div>
        <div>
          <textarea id="li-import-textarea" class="field" rows="5" placeholder="Or paste your LinkedIn export text here..."></textarea>
          <div class="flex gap-8 mt-8">
            <button class="btn btn-outline btn-sm" id="btn-import-li-text">Analyze Pasted Text</button>
            <button class="btn btn-ghost btn-sm" id="btn-save-li-import">Save Approved Profile</button>
          </div>
        </div>
      </div>
      <div id="li-import-review" class="mt-16">
        <div class="empty-state" style="padding:20px;">
          <div class="empty-title">No LinkedIn export imported yet</div>
          <div class="empty-desc">Upload a PDF export or paste raw export text to begin the review.</div>
        </div>
      </div>
      <div id="li-import-diff" class="mt-16">
        <div class="empty-state" style="padding:20px;">
          <div class="empty-title">Nothing to compare yet</div>
          <div class="empty-desc">Import a LinkedIn export first to compare it against your current profile.</div>
        </div>
      </div>
    </div>

    <div class="card mb-24">
      <div class="card-title"><span class="dot"></span>LinkedIn Export Diff Analyzer</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.7;">
        Paste raw text from your LinkedIn export PDF, then generate current-vs-recommended diffs.
      </div>
      <textarea id="li-export-input" class="field" rows="10" placeholder="Paste exported LinkedIn text here..."></textarea>
      <div class="flex gap-8 mt-8">
        <button class="btn btn-gold btn-sm" id="btn-analyze-li-export">Analyze Export</button>
        <button class="btn btn-ghost btn-sm" id="btn-clear-li-export">Clear</button>
      </div>
      <div id="li-diff-results" class="mt-16">
        <div class="empty-state" style="padding:20px;">
          <div class="empty-title">No export analyzed yet</div>
          <div class="empty-desc">Paste your LinkedIn export text and click Analyze to generate section-by-section diffs.</div>
        </div>
      </div>
    </div>

    <!-- Copy Blocks -->
    <div class="section-title">📋 Optimized Copy Blocks — Click to Copy Each Section</div>
    ${LINKEDIN_SECTIONS.map(sec => copyBlockHTML(sec)).join('')}
  `;

  document.getElementById('btn-import-li-file')?.addEventListener('click', () => document.getElementById('li-import-file')?.click());
  document.getElementById('li-import-file')?.addEventListener('change', handleLinkedInImportFile);
  document.getElementById('btn-import-li-text')?.addEventListener('click', handleLinkedInImportPaste);
  document.getElementById('btn-save-li-import')?.addEventListener('click', () => {
    saveLinkedInImport().catch(error => {
      console.error(error);
      window.toast?.('Could not save the imported profile. Check auth and try again.', 'red');
    });
  });
  document.getElementById('btn-clear-li-import')?.addEventListener('click', clearLinkedInImport);
  document.getElementById('btn-analyze-li-export')?.addEventListener('click', runLinkedInExportAnalysis);
  document.getElementById('btn-clear-li-export')?.addEventListener('click', clearLinkedInExportAnalysis);
  bindChecklistEvents();
}

function copyBlockHTML(sec) {
  const priorityColor = sec.priority === 'critical' ? 'var(--red)' : sec.priority === 'high' ? 'var(--gold)' : 'var(--blue)';
  const priorityLabel = sec.priority === 'critical' ? '🔴 CRITICAL — Do This First' : sec.priority === 'high' ? '🟠 HIGH PRIORITY' : '🔵 MEDIUM';
  const charCount = sec.content.length;
  const charStatus = charCount > sec.maxChars ? `<span style="color:var(--red);">${charCount}/${sec.maxChars} — TRIM NEEDED</span>` : `<span style="color:var(--green);">${charCount}/${sec.maxChars} chars ✓</span>`;

  return `
    <div class="copy-block mb-16">
      <div class="copy-block-header">
        <div>
          <div class="copy-block-title">${sec.title}</div>
          <div style="font-size:10px;color:${priorityColor};font-weight:600;margin-top:2px;">${priorityLabel}</div>
        </div>
        <div style="text-align:right;">
          <div class="copy-block-meta">${charStatus}</div>
          <button class="btn btn-gold btn-sm btn-copy mt-8" onclick="copyToClipboard(document.getElementById('li-${sec.id}').textContent, this)">📋 Copy</button>
        </div>
      </div>
      <div style="padding:10px 16px;background:var(--gold-glow);border-bottom:1px solid var(--border);font-size:11px;color:var(--text-secondary);">
        💡 ${sec.tip}
      </div>
      <div class="copy-block-body" id="li-${sec.id}">${sec.content}</div>
    </div>`;
}
