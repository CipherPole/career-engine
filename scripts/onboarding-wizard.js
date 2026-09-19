/* ============================================================
   ONBOARDING-WIZARD.JS — Resume Review & Account Creation Engine
   Review parsed resume data, resolve missing fields, and create
   an isolated user account & personal dashboard.
   ============================================================ */

'use strict';

import { setCurrentUser, getActiveSession } from './auth-engine.js?v=8';

/**
 * Opens the interactive Review & Account Creation modal after resume import.
 * @param {Object} parsedData Result from analyzeResumeText
 */
export function openResumeReviewModal(parsedData = {}) {
  const profile = parsedData.profile || {};
  const missing = parsedData.missingFields || [];
  const recommended = parsedData.recommendedItems || [];
  const diagnostics = parsedData.diagnostics || {};

  let modal = document.getElementById('onboarding-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'onboarding-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  // Current state of skills for editing
  let currentSkills = Array.isArray(profile.skills) ? [...profile.skills] : [];

  const nameVal = profile.contact?.name || '';
  const emailVal = profile.contact?.email || '';
  const phoneVal = profile.contact?.phone || '';
  const titleVal = profile.meta?.targetTitle || 'Software & DevOps Engineer';
  const currCompVal = profile.meta?.currentComp || 120000;
  const targetCompVal = profile.meta?.targetComp || 175000;
  const linkedinVal = profile.contact?.linkedin || '';
  const githubVal = profile.contact?.github || '';
  const summaryVal = profile.summary || '';
  const atsScore = diagnostics.initialAtsScore || profile.meta?.atsScore || 70;

  modal.innerHTML = `
    <div class="modal-box" style="max-width:720px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;padding:0;">
      
      <!-- Modal Header -->
      <div class="modal-header" style="padding:18px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(15,23,42,0.6);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.15);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:18px;">
            📄
          </div>
          <div>
            <div style="font-weight:800;font-size:16px;color:var(--text-primary);letter-spacing:-0.3px;">
              Review Your Imported Resume
            </div>
            <div style="font-size:11px;color:var(--text-secondary);">
              Verify extracted details below before creating your personal account and dashboard.
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="chip gold" style="font-size:11px;font-weight:700;">
            🎯 Initial ATS Score: ${atsScore}/100
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-close-review" style="padding:4px 10px;">✕</button>
        </div>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="modal-body" style="padding:22px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:18px;">
        
        <!-- Missing Fields Banner (if any) -->
        ${missing.length > 0 ? `
          <div style="background:rgba(239, 68, 68, 0.08);border:1px solid rgba(239, 68, 68, 0.25);border-radius:var(--radius-md);padding:12px 16px;">
            <div style="font-weight:700;font-size:12px;color:#fca5a5;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span>⚠️</span> <span>Action Required Before Account Creation</span>
            </div>
            <div style="font-size:11px;color:var(--text-secondary);line-height:1.5;">
              We couldn't detect your <strong>${missing.map(m => m.label).join(' and ')}</strong> from your file. Please fill them in below so we can create your account.
            </div>
          </div>
        ` : `
          <div style="background:rgba(34, 197, 94, 0.08);border:1px solid rgba(34, 197, 94, 0.25);border-radius:var(--radius-md);padding:10px 16px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;">✅</span>
            <div style="font-size:12px;color:#86efac;font-weight:600;">
              Resume successfully parsed! Review your details below to generate your private workspace.
            </div>
          </div>
        `}

        <!-- 1. Identity & Contact -->
        <div>
          <div style="font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
            1. Profile Identity & Contact
          </div>
          <div class="grid-2" style="gap:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;">
                Your Full Name *
                ${nameVal ? '<span class="field-detected-badge">✨ Auto-Detected</span>' : '<span class="field-missing-badge">⚠️ Required</span>'}
              </label>
              <input type="text" id="review-name" class="input" value="${escapeHtml(nameVal)}" placeholder="e.g. Alex Morgan" style="margin-top:4px;" required />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;">
                Email Address *
                ${emailVal ? '<span class="field-detected-badge">✨ Auto-Detected</span>' : '<span class="field-missing-badge">⚠️ Required</span>'}
              </label>
              <input type="email" id="review-email" class="input" value="${escapeHtml(emailVal)}" placeholder="e.g. alex@example.com" style="margin-top:4px;" required />
            </div>
          </div>

          <div class="grid-3" style="gap:12px;margin-top:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;">
                Phone Number
                ${phoneVal ? '<span class="field-detected-badge">✨</span>' : ''}
              </label>
              <input type="text" id="review-phone" class="input" value="${escapeHtml(phoneVal)}" placeholder="e.g. (555) 123-4567" style="margin-top:4px;" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;">
                LinkedIn Profile URL
                ${linkedinVal ? '<span class="field-detected-badge">✨</span>' : ''}
              </label>
              <input type="url" id="review-linkedin" class="input" value="${escapeHtml(linkedinVal)}" placeholder="linkedin.com/in/yourprofile" style="margin-top:4px;" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;">
                GitHub Profile URL
                ${githubVal ? '<span class="field-detected-badge">✨</span>' : ''}
              </label>
              <input type="url" id="review-github" class="input" value="${escapeHtml(githubVal)}" placeholder="github.com/yourhandle" style="margin-top:4px;" />
            </div>
          </div>
        </div>

        <!-- 2. Target Role & Compensation Goals -->
        <div>
          <div style="font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
            2. Career Target & Compensation Goals
          </div>
          <div class="grid-3" style="gap:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;">
                Target Job Title
                <span class="field-detected-badge">✨</span>
              </label>
              <input type="text" id="review-title" class="input" value="${escapeHtml(titleVal)}" placeholder="e.g. Senior DevOps Engineer" style="margin-top:4px;" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);">
                Current Comp ($)
              </label>
              <input type="number" id="review-curr-comp" class="input" value="${currCompVal}" placeholder="120000" style="margin-top:4px;" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);">
                Target Comp ($)
              </label>
              <input type="number" id="review-target-comp" class="input" value="${targetCompVal}" placeholder="175000" style="margin-top:4px;" />
            </div>
          </div>
        </div>

        <!-- 3. Extracted Skills -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;">
              3. Detected Technical Skills (${currentSkills.length})
            </div>
            <div style="font-size:11px;color:var(--text-dim);">Click ✕ to remove or type to add</div>
          </div>
          
          <div id="review-skills-box" style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;min-height:50px;display:flex;flex-wrap:wrap;align-items:center;gap:4px;">
            <!-- Skill pills rendered dynamically -->
          </div>

          <div style="display:flex;gap:8px;margin-top:8px;">
            <input type="text" id="input-add-skill" class="input" placeholder="Type a skill and press Enter or click Add (e.g. Kubernetes, Python, AWS)..." style="font-size:12px;padding:6px 12px;" />
            <button class="btn btn-secondary btn-sm" id="btn-add-skill" style="white-space:nowrap;">+ Add Skill</button>
          </div>
        </div>

        <!-- 4. Professional Summary -->
        <div>
          <div style="font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
            4. Professional Summary
          </div>
          <textarea id="review-summary" class="input" rows="3" style="font-size:12px;line-height:1.5;" placeholder="Summary of your technical expertise and career highlights...">${escapeHtml(summaryVal)}</textarea>
        </div>

        <!-- Experience Highlights Preview -->
        <div>
          <div style="font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
            5. Detected Work Experience (${profile.experience?.length || 0} roles)
          </div>
          <div style="background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;font-size:12px;color:var(--text-secondary);max-height:130px;overflow-y:auto;">
            ${(profile.experience || []).map(exp => `
              <div style="margin-bottom:8px;border-bottom:1px dashed rgba(255,255,255,0.06);padding-bottom:6px;">
                <strong style="color:var(--text-primary);">${escapeHtml(exp.title || 'Role')}</strong> &bull; 
                <span>${escapeHtml(exp.company || 'Company')}</span> 
                <span style="color:var(--text-dim);font-size:11px;">(${escapeHtml(exp.duration || '')})</span>
                ${exp.highlights?.length ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">• ${escapeHtml(exp.highlights[0])}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Showcase banner -->
        <div style="background:rgba(245, 158, 11, 0.05);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-md);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="font-size:11px;color:var(--text-secondary);">
            Just visiting? You can switch to explore Joseph's executive profile anytime.
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-review-to-showcase" style="font-size:10px;padding:3px 8px;white-space:nowrap;">
            Explore Joseph's Profile ↗
          </button>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="padding:16px 24px;border-top:1px solid var(--border);background:rgba(15,23,42,0.8);display:flex;justify-content:space-between;align-items:center;">
        <button class="btn btn-secondary btn-sm" id="btn-cancel-review">Cancel</button>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" id="btn-create-account-final" style="font-weight:700;padding:8px 20px;box-shadow:0 0 15px rgba(245,158,11,0.3);">
            🚀 Create My Account & Open Dashboard
          </button>
        </div>
      </div>
    </div>
  `;

  // Render skill pills
  function renderSkills() {
    const box = document.getElementById('review-skills-box');
    if (!box) return;
    if (currentSkills.length === 0) {
      box.innerHTML = `<span style="font-size:11px;color:var(--text-dim);">No skills added yet. Type below to add your primary skills.</span>`;
      return;
    }
    box.innerHTML = currentSkills.map((sk, idx) => `
      <span class="skill-tag-pill">
        ${escapeHtml(sk)}
        <span class="skill-tag-remove" data-idx="${idx}">✕</span>
      </span>
    `).join('');

    box.querySelectorAll('.skill-tag-remove').forEach(el => {
      el.onclick = (e) => {
        const idx = parseInt(e.target.dataset.idx);
        currentSkills.splice(idx, 1);
        renderSkills();
      };
    });
  }
  renderSkills();

  // Add skill handlers
  const addSkill = () => {
    const input = document.getElementById('input-add-skill');
    const val = input?.value?.trim();
    if (!val) return;
    if (!currentSkills.some(s => s.toLowerCase() === val.toLowerCase())) {
      currentSkills.push(val);
      renderSkills();
    }
    input.value = '';
  };
  document.getElementById('btn-add-skill')?.addEventListener('click', addSkill);
  document.getElementById('input-add-skill')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  });

  // Modal close handlers
  document.getElementById('btn-close-review')?.addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('btn-cancel-review')?.addEventListener('click', () => modal.classList.remove('open'));

  // Switch to Showcase mode
  document.getElementById('btn-review-to-showcase')?.addEventListener('click', () => {
    modal.classList.remove('open');
    sessionStorage.setItem('careerEngine_showcase_active', 'true');
    setCurrentUser({
      name: 'Joseph Erexson III',
      email: 'jerexson3@gmail.com',
      picture: '',
      role: 'owner',
      isLoggedIn: false,
    });
    window.location.reload();
  });

  // Create Account Action
  document.getElementById('btn-create-account-final')?.addEventListener('click', async () => {
    const name = document.getElementById('review-name')?.value?.trim();
    const email = document.getElementById('review-email')?.value?.trim();
    const title = document.getElementById('review-title')?.value?.trim() || 'Software & DevOps Engineer';
    const phone = document.getElementById('review-phone')?.value?.trim() || '';
    const linkedin = document.getElementById('review-linkedin')?.value?.trim() || '';
    const github = document.getElementById('review-github')?.value?.trim() || '';
    const currComp = parseInt(document.getElementById('review-curr-comp')?.value) || 120000;
    const targetComp = parseInt(document.getElementById('review-target-comp')?.value) || 175000;
    const summary = document.getElementById('review-summary')?.value?.trim() || '';

    // Require both Name and Email to establish a true user account
    if (!name) {
      window.toast?.('Please enter your full name.', 'red');
      document.getElementById('review-name')?.focus();
      return;
    }
    if (!email || !email.includes('@')) {
      window.toast?.('Please enter a valid email address to create your account.', 'red');
      document.getElementById('review-email')?.focus();
      return;
    }

    // Build the final isolated profile payload
    const finalProfile = {
      meta: {
        lastUpdated: new Date().toISOString().slice(0, 10),
        targetTitle: title,
        targetComp: targetComp,
        currentComp: currComp,
        atsScore: atsScore,
        parsedFileName: profile.meta?.parsedFileName || 'Imported Resume',
      },
      contact: {
        name: name,
        email: email,
        phone: phone || 'Available upon request',
        location: profile.contact?.location || 'Remote / United States',
        linkedin: linkedin,
        github: github,
      },
      summary: summary || `Targeting ${title} roles with high-impact engineering automation.`,
      leadership: profile.leadership || {
        teamSize: '1–5 Engineers',
        scale: 'Individual Contributor / Lead',
      },
      experience: profile.experience && profile.experience.length > 0 ? profile.experience : [
        {
          id: 'exp-1',
          title: title,
          company: 'Current Organization',
          duration: 'Present',
          teamSize: '1–5',
          highlights: currentSkills.length > 0
            ? [`Delivered engineering initiatives utilizing ${currentSkills.slice(0, 4).join(', ')}.`]
            : ['Delivered scalable software systems and automated workflows.'],
        }
      ],
      skills: currentSkills,
      certifications: profile.certifications || [],
      education: profile.education || [
        { degree: 'B.S. in Computer Science / Engineering', institution: 'Accredited University', year: 'Completed' }
      ],
      accomplishments: profile.accomplishments || [
        `Automated core delivery workflows utilizing ${currentSkills.slice(0, 3).join(', ') || 'modern engineering tooling'}.`,
        'Improved system stability and operational throughput across critical projects.'
      ]
    };

    // Save profile to user-scoped localStorage and mark active
    const emailKey = email.toLowerCase();
    localStorage.setItem(`careerEngine_profile_${emailKey}`, JSON.stringify(finalProfile));
    localStorage.setItem('careerEngine_active_profile', JSON.stringify(finalProfile));
    localStorage.setItem('careerEngine_has_visited', 'true');
    localStorage.setItem('careerEngine_last_user', name);

    // Save to server database if available
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile: finalProfile }),
      });
    } catch {}

    // Register active user session
    setCurrentUser({
      name: name,
      email: email,
      picture: '',
      role: 'user',
      isLoggedIn: true,
    });

    modal.classList.remove('open');
    window.toast?.(`🎉 Account created for ${name}! Loading your personal dashboard...`, 'green');
    
    // Smooth reload so router and data hydration initialize with new user's isolated profile
    setTimeout(() => {
      window.location.hash = '#dashboard';
      window.location.reload();
    }, 450);
  });

  modal.classList.add('open');
}

/**
 * Fallback backward compatibility for openOnboardingWizard()
 */
export function openOnboardingWizard() {
  openResumeReviewModal({
    profile: {
      meta: { targetTitle: 'Software & DevOps Engineer', targetComp: 175000, currentComp: 120000 },
      contact: { name: '', email: '', phone: '', linkedin: '', github: '' },
      summary: '',
      skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Python', 'Terraform'],
    },
    missingFields: [
      { field: 'name', label: 'Full Name' },
      { field: 'email', label: 'Email Address' }
    ]
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
