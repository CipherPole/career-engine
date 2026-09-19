/* ============================================================
   LINKEDIN-ENGINE.JS — LinkedIn Optimizer & Copy Blocks
   ============================================================ */

'use strict';

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

    <!-- Copy Blocks -->
    <div class="section-title">📋 Optimized Copy Blocks — Click to Copy Each Section</div>
    ${LINKEDIN_SECTIONS.map(sec => copyBlockHTML(sec)).join('')}
  `;
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
