/* ============================================================
   ONBOARDING-WIZARD.JS — Fresh Profile Wizard for New Visitors
   Upload resume, set compensation targets, auto-extract skills.
   ============================================================ */

'use strict';

import { setCurrentUser } from './auth-engine.js';

// Standard skill keywords dictionary for fast client-side extraction
const SKILL_KEYWORDS = [
  'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform', 'Ansible', 'Jenkins',
  'GitHub Actions', 'GitLab CI', 'Linux', 'Python', 'Go', 'Golang', 'JavaScript',
  'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Prometheus', 'Grafana', 'Datadog', 'ArgoCD', 'Helm', 'Playwright', 'Postman',
  'OpenShift', 'DevSecOps', 'CI/CD', 'REST API', 'GraphQL', 'Microservices',
  'Java', 'C#', '.NET', 'C++', 'SQL', 'Bash', 'PowerShell', 'Trivy', 'Vault'
];

export function openOnboardingWizard() {
  let modal = document.getElementById('onboarding-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'onboarding-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box" style="max-width:680px;">
      <div class="modal-header">
        <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
          <span>🚀</span> Create Your Personal Career Engine
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-close-onboard" style="padding:4px 10px;">✕</button>
      </div>

      <div class="modal-body" style="display:flex;flex-direction:column;gap:18px;">
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">
          Welcome! The Career Engine is a personalized AI workspace designed to track and accelerate engineering compensation. Fill in your details below to generate your custom dashboard, skills radar, and job tracker.
        </div>

        <!-- Step 1: Basic Identity -->
        <div class="grid-2" style="gap:12px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">Your Full Name</label>
            <input type="text" id="onboard-name" class="input" placeholder="e.g. Alex Morgan" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">Your Email</label>
            <input type="email" id="onboard-email" class="input" placeholder="e.g. alex@example.com" style="margin-top:4px;" />
          </div>
        </div>

        <!-- Step 2: Target Role & Compensation -->
        <div class="grid-3" style="gap:12px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">Target Job Title</label>
            <input type="text" id="onboard-title" class="input" placeholder="e.g. Senior DevOps Engineer" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">Current Comp ($)</label>
            <input type="number" id="onboard-curr-comp" class="input" placeholder="120000" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">Target Comp ($)</label>
            <input type="number" id="onboard-target-comp" class="input" placeholder="175000" style="margin-top:4px;" />
          </div>
        </div>

        <!-- Step 3: Resume Input -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;">
              Paste Resume Text or Key Skills Summary
            </label>
            <label class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 8px;cursor:pointer;">
              📄 Upload .txt File
              <input type="file" id="onboard-file-input" accept=".txt,.md" style="display:none;" />
            </label>
          </div>
          <textarea id="onboard-resume-text" class="input" rows="6" placeholder="Paste your resume content, experience summary, or technical skills list here. Our engine will automatically extract your technical skills into your radar matrix..."></textarea>
        </div>

        <!-- Or Explore Showcase Banner -->
        <div style="background:rgba(245, 158, 11, 0.08);border:1px solid var(--gold-border);border-radius:var(--radius-md);padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="font-size:12px;color:var(--text-secondary);">
            Just looking around? You can explore Joseph's live executive profile anytime.
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-onboard-to-showcase" style="font-size:11px;white-space:nowrap;">
            Explore Joseph's Profile ↗
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" id="btn-cancel-onboard">Cancel</button>
        <button class="btn btn-primary btn-sm" id="btn-create-workspace">🚀 Build My Personal Dashboard</button>
      </div>
    </div>
  `;

  // Attach listeners
  document.getElementById('btn-close-onboard').onclick = () => modal.classList.remove('open');
  document.getElementById('btn-cancel-onboard').onclick = () => modal.classList.remove('open');

  // File upload reader
  document.getElementById('onboard-file-input').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('onboard-resume-text').value = event.target.result;
      window.toast?.(`Loaded ${file.name}!`, 'green');
    };
    reader.readAsText(file);
  });

  // Explore showcase
  document.getElementById('btn-onboard-to-showcase').onclick = () => {
    modal.classList.remove('open');
    setCurrentUser({
      name: 'Joseph Erexson III',
      email: 'jerexson3@gmail.com',
      picture: '',
      role: 'owner',
      isLoggedIn: false,
    });
    window.location.reload();
  };

  // Create workspace action
  document.getElementById('btn-create-workspace').onclick = () => {
    const name = document.getElementById('onboard-name').value.trim() || 'Guest Engineer';
    const email = document.getElementById('onboard-email').value.trim() || `guest_${Date.now()}@example.com`;
    const title = document.getElementById('onboard-title').value.trim() || 'Software & DevOps Engineer';
    const currComp = parseInt(document.getElementById('onboard-curr-comp').value) || 120000;
    const targetComp = parseInt(document.getElementById('onboard-target-comp').value) || 180000;
    const resumeText = document.getElementById('onboard-resume-text').value;

    // Extract skills
    const matchedSkills = [];
    const upperText = resumeText.toUpperCase();
    SKILL_KEYWORDS.forEach(sk => {
      if (upperText.includes(sk.toUpperCase())) {
        matchedSkills.push(sk);
      }
    });

    // Build custom user payload
    const userProfile = {
      meta: {
        lastUpdated: new Date().toISOString().slice(0, 10),
        targetTitle: title,
        targetComp: targetComp,
        currentComp: currComp,
      },
      contact: {
        name: name,
        email: email,
        phone: 'Available upon request',
        github: '',
        linkedin: '',
      },
      summary: resumeText.slice(0, 300) || `Targeting ${title} roles with high-impact engineering automation.`,
      leadership: {
        teamSize: 0,
        scale: 'Individual Contributor / Lead',
      },
      experience: [
        {
          id: 'exp-1',
          title: title,
          company: 'Current Organization',
          duration: 'Present',
          teamSize: '1–5',
          highlights: matchedSkills.length > 0
            ? [`Implemented engineering solutions utilizing ${matchedSkills.slice(0, 4).join(', ')}.`]
            : ['Delivered scalable software systems and automated workflows.'],
        }
      ],
      accomplishments: [
        'Streamlined technical operations and accelerated delivery throughput.'
      ],
      certifications: [],
      education: [
        { degree: 'B.S. in Computer Science / Engineering', institution: 'University', year: '2020' }
      ],
      skills: matchedSkills,
    };

    // Save user profile and activate
    localStorage.setItem(`careerEngine_profile_${email}`, JSON.stringify(userProfile));

    setCurrentUser({
      name: name,
      email: email,
      picture: '',
      role: 'visitor',
      isLoggedIn: true,
    });

    modal.classList.remove('open');
    window.toast?.(`🎉 Personal workspace created for ${name}!`, 'green');
    setTimeout(() => window.location.reload(), 400);
  };

  modal.classList.add('open');
}
