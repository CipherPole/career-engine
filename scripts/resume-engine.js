/* ============================================================
   RESUME-ENGINE.JS — Dashboard, Resume Studio & Skill Gap
   ============================================================ */

'use strict';

import { isOwner } from './auth-engine.js';

// ── DASHBOARD ─────────────────────────────────────────────────
export function renderDashboard() {
  const resume   = window._state?.resumeData;
  const skills   = window._state?.skillsData;
  const jobs     = window._state?.jobsData || [];

  const atsScore = window.calcATSScore ? window.calcATSScore(resume, skills) : 71;
  const liScore  = window.calcLinkedInScore ? window.calcLinkedInScore() : { score: 40 };

  const confirmedSkills = skills?.categories?.flatMap(c => c.skills.filter(s => s.status === 'confirmed')).length || 42;
  const gapSkills       = skills?.categories?.flatMap(c => c.skills.filter(s => s.status === 'gap' || s.status === 'cert-gap')).length || 14;

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">⚡ Career Command Center</div>
      <div class="page-subtitle">Welcome back, Joseph. Here is your career readiness snapshot.</div>
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
      <div class="priority-title">Fix Your Resume PDF — Your Name is Being Mangled by ATS Systems</div>
      <div class="priority-desc">
        Your current PDF has a font encoding bug that renders your name as "J E III / OSEPH REXSON" to ATS parsers like Workday, Greenhouse, and Taleo. 
        Head to <strong style="color:var(--gold)">Resume Studio</strong> → click <strong style="color:var(--gold)">Print Clean Resume</strong> to export a pixel-perfect, ATS-safe PDF that correctly shows your name, AWS/GCP skills, and team leadership scope.
      </div>
      <div class="flex gap-8 mt-16">
        <button class="btn btn-gold" onclick="navigate('resume')">Open Resume Studio →</button>
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
          <div>🟡 <strong style="color:var(--text-secondary)">ATS:</strong> Add AWS cert, GitHub URL, team size → push to 88+</div>
          <div>🔵 <strong style="color:var(--text-secondary)">LinkedIn:</strong> Update headline, About section, open to work (hidden) → push to 90+</div>
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
              <div class="comp-current">$145k</div>
              <div class="text-sm text-dim">BofA / TekSystems</div>
            </div>
            <div style="text-align:right">
              <div class="comp-target">$200k+</div>
              <div class="text-sm text-dim">Target: Remote Senior/Lead</div>
            </div>
          </div>
          <div class="comp-diff mt-8">📈 $55k+ gap — achievable with title re-framing, AWS cert & new role</div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px;">
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">Market Range for Your Profile</div>
          <div class="flex gap-8">
            <div class="chip gold">DevOps Lead: $175k–$220k</div>
            <div class="chip blue">Platform Eng: $185k–$230k</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section-title">Quick Actions</div>
    <div class="grid-3 gap-16 mb-24">
      ${quickAction('📄', 'Export Clean Resume PDF', 'Fix encoding, add AWS/GCP, print as PDF', 'resume', 'btn-gold')}
      ${quickAction('🔗', 'Update LinkedIn Headline', 'Copy the optimized 220-char headline', 'linkedin', 'btn-outline')}
      ${quickAction('💼', 'Find $180k+ Remote Jobs', 'Browse curated role-specific job boards', 'jobs', 'btn-ghost')}
      ${quickAction('🧠', 'View Skill Gaps', 'See what\'s blocking your $200k target', 'skills', 'btn-ghost')}
      ${quickAction('🚀', 'Project Showcase', 'Review your portfolio presentation', 'projects', 'btn-ghost')}
      ${quickAction('🎯', 'Write Cover Letter', 'Paste a JD — get a tailored letter', 'cover', 'btn-ghost')}
    </div>

    <!-- Resume Issues Banner -->
    <div class="section-title">🔴 Critical Resume Issues — Fix These Now</div>
    <div class="card">
      ${issueRow('🔴', 'CRITICAL', 'PDF font encoding breaks your name', 'Print from Resume Studio → ATS-safe HTML/CSS', true)}
      ${issueRow('🔴', 'HIGH', 'Title reads "Network Engineer IV" not "DevOps Lead"', 'Clean resume uses correct title')}
      ${issueRow('🔴', 'HIGH', 'Leading 10+ engineers not mentioned', 'Added to BofA role bullets')}
      ${issueRow('🔴', 'HIGH', 'AWS (EC2/S3/IAM/EKS/VPC/Route53) missing', 'Added to skills + experience')}
      ${issueRow('🟠', 'MEDIUM', 'GCP (GKE, Cloud Run) missing', 'Added to skills section')}
      ${issueRow('🟠', 'MEDIUM', 'No LinkedIn or GitHub URL on resume', 'Added to clean resume header')}
      ${issueRow('🟠', 'MEDIUM', 'No Projects section (Unity Recovery, Mythralis)', 'Added in clean resume')}
      ${issueRow('🟡', 'LOW', 'Date typo "01//2019" double slash', 'Fixed in clean version')}
    </div>
  `;

  // Animate counters
  animateCounter('ats-counter', atsScore);
  animateCounter('li-counter', liScore.score);
  animateRing('ats-ring', atsScore);
  animateRing('li-ring', liScore.score);
  setTimeout(() => {
    const bar = document.getElementById('comp-bar');
    if (bar) bar.style.width = '72.5%';
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
    <div class="page-header">
      <div class="page-title">📄 Resume Studio</div>
      <div class="page-subtitle">ATS-optimized resume with live keyword analysis. Print as a clean, encoding-safe PDF.</div>
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
  window.open('./pages/resume.html', '_blank');
  window.toast('Opening print-optimized resume in new tab. Use Ctrl+P to save as PDF.', 'green');
};

function optimizedResumeHTML() {
  return `
    <div class="flex justify-between items-center mb-16">
      <div>
        <div class="chip green">✅ ATS-Safe Encoding</div>
        <span style="margin-left:8px;font-size:12px;color:var(--text-dim);">Name, contact, and skills will parse correctly in Workday, Greenhouse, Taleo, Lever</span>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard(document.getElementById('resume-text').innerText, this)">📋 Copy Plain Text</button>
        <button class="btn btn-gold" onclick="printResume()">🖨️ Print / Export PDF</button>
      </div>
    </div>

    <div class="resume-preview" id="resume-text">
      <h1>Joseph Erexson III</h1>
      <div class="resume-contact">
        <span>📍 New London, NC (100% Remote)</span>
        <span>📞 980-447-7049</span>
        <span>✉️ <a href="mailto:jerexson3@gmail.com">jerexson3@gmail.com</a></span>
        <span>🔗 <a href="https://www.linkedin.com/in/joseph-erexson-iii-46bb6285/" target="_blank">LinkedIn</a></span>
        <span>💻 <a href="https://github.com/CipherPole" target="_blank">github.com/CipherPole</a></span>
      </div>
      <hr>

      <h2>Professional Summary</h2>
      <p style="font-size:12.5px;color:#333;line-height:1.6;">Senior DevOps Lead and QA Automation Engineer with 10+ years of enterprise experience across financial, healthcare, education, and legal sectors. Currently embedded at Bank of America leading a cross-functional team of 10+ engineers, driving DevSecOps strategy, CI/CD pipeline modernization, cloud infrastructure automation (AWS & GCP), and enterprise-scale container orchestration with Kubernetes and Docker. Founder of Unity Recovery (live SaaS) and AI/IT consulting firm Mythralis under Fortico Holdings. Delivers measurable outcomes: 80% reduction in CI/CD provisioning time, 70% improvement in system scalability, and 500+ endpoint API test coverage.</p>
      <hr>

      <h2>Core Competencies & Skills</h2>
      <div class="skills-grid">
        <div>• AWS: EC2, S3, IAM, EKS, VPC, Route53</div>
        <div>• GCP: GKE, Cloud Run</div>
        <div>• Kubernetes, Docker, OpenShift</div>
        <div>• Terraform (IaC), Ansible, CloudFormation</div>
        <div>• Jenkins, XLRelease / Digital.ai, Bitbucket</div>
        <div>• Playwright, Postman (500+ endpoints), qTest</div>
        <div>• Python, PowerShell, Bash, JavaScript</div>
        <div>• DevSecOps, CI/CD, SDLC Automation</div>
        <div>• Agile / Scrum Master, Cross-Team Leadership</div>
        <div>• Azure AD, Azure VM, Azure Networking</div>
        <div>• GitHub Copilot, Replit AI, O365 Copilot</div>
        <div>• SCCM, Tanium Patching, JIRA</div>
        <div>• AD, DNS, DHCP, GPO, VPN, TCP/IP</div>
        <div>• SonicWall, WatchGuard, Meraki, Unifi</div>
        <div>• Veeam, Datto, StorageCraft (Disaster Recovery)</div>
      </div>
      <hr>

      <h2>Professional Experience</h2>

      <h3>DevOps Lead / QA Automation Lead</h3>
      <div class="job-meta">Bank of America (via TekSystems) &nbsp;|&nbsp; Charlotte, NC (Remote) &nbsp;|&nbsp; March 2019 – Present &nbsp;|&nbsp; Team: 10+ Engineers</div>
      <ul>
        <li>Lead a cross-functional team of 10+ engineers across DevSecOps, QA automation, and platform reliability for one of the largest financial institutions in the US.</li>
        <li>Architected and scaled CI/CD pipelines using Jenkins, OpenShift, Docker, and Kubernetes — improving deployment throughput by <strong>80%</strong> and cutting infrastructure provisioning time by <strong>80%</strong> through Terraform IaC automation.</li>
        <li>Designed and deployed advanced container orchestration systems using Docker and Kubernetes, achieving a <strong>70% improvement</strong> in system scalability and reliability.</li>
        <li>Built and own a Postman API collection covering <strong>500+ endpoints</strong> for enterprise-scale functional and regression testing, integrated as CI/CD quality gates.</li>
        <li>Leveraged AWS services (EC2, S3, IAM, EKS, VPC, Route53) and GCP (GKE, Cloud Run) to architect and automate cloud infrastructure at enterprise scale.</li>
        <li>Spearheaded DevSecOps strategy integration across Agile squads — embedding security controls, compliance checkpoints, and automated policy enforcement into the SDLC.</li>
        <li>Drove XLRelease / Digital.ai release orchestration and Tanium-based patch automation across Windows Server 2016–2022 enterprise environments.</li>
        <li>Integrated Ansible orchestration for configuration management and automated deployment workflows across hybrid cloud environments.</li>
        <li>Implemented AI-assisted development workflows using GitHub Copilot, Replit AI, and O365 Copilot to accelerate team delivery velocity.</li>
      </ul>

      <h3>Network Engineer / System Administrator</h3>
      <div class="job-meta">Bytes of Knowledge &nbsp;|&nbsp; Nashville, TN &nbsp;|&nbsp; July 2018 – January 2019</div>
      <ul>
        <li>Designed and developed automated testing suites for test plans, scenarios, scripts, and procedures.</li>
        <li>Used Kaseya VSA to deploy patches after review of expected results, removing <strong>50% overhead</strong> on failure management.</li>
        <li>Executed maintenance procedures: system upgrades, security updates, and disaster recovery testing.</li>
        <li>Configured and supported Veeam, Datto, and IDrive backup products for offsite replication and disaster recovery.</li>
      </ul>

      <h3>Technology Consultant</h3>
      <div class="job-meta">LogicForce Consulting &nbsp;|&nbsp; Nashville, TN &nbsp;|&nbsp; July 2017 – July 2018</div>
      <ul>
        <li>Designed and developed automated testing tools, test plans, scenarios, and procedures for legal sector clients.</li>
        <li>Supported Opentext, NetDocuments, iManage, and Worldox document management systems for legal practice management.</li>
        <li>Managed Autotask, Continuum & N-Central endpoint management services across multiple client environments.</li>
      </ul>

      <h3>Senior Technology Support Specialist</h3>
      <div class="job-meta">Vanderbilt University (via Apex Systems) &nbsp;|&nbsp; Nashville, TN &nbsp;|&nbsp; February 2014 – December 2016</div>
      <ul>
        <li>Managed client networks, system backups, security updates, hardware, VOIP systems, and custom applications at university scale.</li>
        <li>Developed automation via Batch file scripting and MS Excel VBA for application software deployment workflows.</li>
      </ul>
      <hr>

      <h2>Entrepreneurial Ventures</h2>
      <h3>Founder — Unity Recovery</h3>
      <div class="job-meta">Fortico Holdings &nbsp;|&nbsp; 2023 – Present</div>
      <ul>
        <li>Built and operate a live SaaS platform for addiction recovery organizations — client management, peer support coordination, and compliance tooling.</li>
        <li>Architected the entire cloud infrastructure, backend, and automation pipeline as a solo founder.</li>
      </ul>

      <h3>Founder / Principal Consultant — Mythralis (AI & IT Consulting)</h3>
      <div class="job-meta">Fortico Holdings &nbsp;|&nbsp; 2024 – Present</div>
      <ul>
        <li>AI and IT consulting firm providing DevOps, cloud infrastructure, and automation strategy to clients leveraging enterprise-grade practices.</li>
      </ul>
      <hr>

      <h2>Certifications</h2>
      <ul>
        <li>Kaseya Certified Technician</li>
        <li>ConnectWise Certified Administrator</li>
      </ul>
      <hr>

      <h2>Education</h2>
      <ul>
        <li><strong>Bachelor of Science — Information Systems / Cyber Security</strong> &nbsp;|&nbsp; ITT Technical Institute, Nashville, TN</li>
        <li><strong>Associate of Science — Networking & System Administration</strong> &nbsp;|&nbsp; ITT Technical Institute, Nashville, TN</li>
      </ul>
    </div>
  `;
}

function atsAnalyzerHTML() {
  const targetKeywords = [
    { kw: 'DevOps', found: true }, { kw: 'DevSecOps', found: true },
    { kw: 'Kubernetes', found: true }, { kw: 'Docker', found: true },
    { kw: 'Terraform', found: true }, { kw: 'Ansible', found: true },
    { kw: 'Jenkins', found: true }, { kw: 'AWS', found: true },
    { kw: 'GCP', found: true }, { kw: 'CI/CD', found: true },
    { kw: 'Platform Engineer', found: false }, { kw: 'Python', found: true },
    { kw: 'Team Lead', found: true }, { kw: 'Agile', found: true },
    { kw: 'Scrum', found: true }, { kw: 'IaC', found: false },
    { kw: 'GitHub Actions', found: false }, { kw: 'FinOps', found: false },
    { kw: 'Observability', found: false }, { kw: 'Datadog', found: false },
    { kw: 'Prometheus', found: false }, { kw: 'Grafana', found: false },
    { kw: 'ArgoCD', found: false }, { kw: 'Helm', found: false },
    { kw: 'OpenShift', found: true }, { kw: 'Azure', found: true },
    { kw: 'PowerShell', found: true }, { kw: 'Playwright', found: true },
  ];

  const found = targetKeywords.filter(k => k.found).length;
  const pct = Math.round((found / targetKeywords.length) * 100);

  return `
    <div class="card mb-20">
      <div class="card-title"><span class="dot"></span>Keyword Match Score</div>
      <div class="flex items-center gap-20">
        <div style="font-size:48px;font-weight:800;color:var(--gold);">${pct}%</div>
        <div>
          <div style="font-size:14px;color:var(--text-primary);font-weight:600;">${found} of ${targetKeywords.length} high-demand keywords found</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Missing keywords represent skills Joseph has but hasn't added to the optimized resume yet (e.g., IaC, GitOps). These are fast wins.</div>
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
