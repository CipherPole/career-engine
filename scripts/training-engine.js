/* ============================================================
   TRAINING-ENGINE.JS — Skills Radar, Project Mastery & GitHub Hub
   ============================================================ */

'use strict';

import { getCurrentUser } from './auth-engine.js?v=8';

let radarChartInstance = null;

const DEFAULT_TRAINING_STATE = {
  conqueredSkills: [],
  projectStates: {}, // [projectId]: { status: 'available'|'in-progress'|'conquered', repoUrl: '', completedAt: null }
};

function getTrainingStorageKey() {
  const user = getCurrentUser();
  const email = (user?.email || 'guest').toLowerCase();
  return `careerEngine_training_${email}`;
}

// Default storage state helper
function getTrainingStateFromLocal() {
  const key = getTrainingStorageKey();
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading training state:', e);
  }
  return { ...DEFAULT_TRAINING_STATE };
}

async function getTrainingState() {
  const key = getTrainingStorageKey();
  const localState = getTrainingStateFromLocal();
  try {
    const res = await fetch('/api/state?key=training', { credentials: 'include' });
    if (res.ok) {
      const body = await res.json();
      if (body?.state && typeof body.state === 'object' && !Array.isArray(body.state)) {
        localStorage.setItem(key, JSON.stringify(body.state));
        return body.state;
      }
    }
  } catch {}
  return localState;
}

function saveTrainingState(state) {
  const key = getTrainingStorageKey();
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed saving training state:', e);
  }

  fetch('/api/state?key=training', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ state }),
  }).catch(() => {});
}

// ── Radar Axes Definition ─────────────────────────────────────
const RADAR_AXES = [
  { id: 'cicd', label: 'CI/CD & GitOps', categories: ['cicd'], target: 95 },
  { id: 'cloud', label: 'Cloud (AWS & GCP)', categories: ['cloud_aws', 'cloud_gcp'], target: 90 },
  { id: 'containers', label: 'Containers & K8s', categories: ['containers'], target: 95 },
  { id: 'iac', label: 'IaC & Automation', categories: ['iac'], target: 92 },
  { id: 'observability', label: 'Observability & SRE', categories: ['observability'], target: 88 },
  { id: 'devsecops', label: 'DevSecOps & Security', categories: ['security'], target: 90 },
  { id: 'scripting', label: 'Scripting & Languages', categories: ['languages'], target: 88 },
  { id: 'leadership', label: 'Platform Leadership', categories: ['leadership'], target: 85 },
  { id: 'ai', label: 'AI Ops & Modern Tooling', categories: ['ai_tools'], target: 85 },
];

function calculateRadarData(skillsData, trainingState) {
  if (!skillsData || !skillsData.categories) {
    return { labels: RADAR_AXES.map(a => a.label), current: RADAR_AXES.map(() => 70), target: RADAR_AXES.map(a => a.target) };
  }

  const conqueredSet = new Set(trainingState.conqueredSkills || []);

  const currentScores = RADAR_AXES.map(axis => {
    const matchedCategories = skillsData.categories.filter(c => axis.categories.includes(c.id));
    let totalSkills = 0;
    let earnedPoints = 0;

    matchedCategories.forEach(cat => {
      (cat.skills || []).forEach(skill => {
        totalSkills++;
        const isOriginalConfirmed = skill.status === 'confirmed';
        const isManuallyConquered = conqueredSet.has(skill.name);

        if (isOriginalConfirmed || isManuallyConquered) {
          earnedPoints += Math.max(skill.level || 4, 3); // Full credit
        } else if (skill.status === 'gap') {
          earnedPoints += 1.2; // Baseline awareness
        } else if (skill.status === 'cert-gap') {
          earnedPoints += 0.8;
        }
      });
    });

    // Check conquered projects impacting this axis
    const completedProjects = Object.entries(trainingState.projectStates || {})
      .filter(([_, p]) => p.status === 'conquered')
      .map(([id]) => id);

    const bonus = Math.min(completedProjects.length * 3, 12);

    const maxPoints = Math.max(totalSkills * 5, 15);
    const rawPercent = Math.round((earnedPoints / maxPoints) * 100) + bonus;
    return Math.min(Math.max(rawPercent, 20), 100);
  });

  return {
    labels: RADAR_AXES.map(a => a.label),
    current: currentScores,
    target: RADAR_AXES.map(a => a.target),
  };
}

// ── Main Page Render ──────────────────────────────────────────
export async function renderTrainingHub() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const skillsData = window._state?.skillsData;
  const trainingProjects = window._state?.trainingProjectsData || [];
  const trainingState = await getTrainingState();

  // If user has no conquered skills yet, pre-populate with confirmed skills so they get credit for what they know
  if (!trainingState.conqueredSkills || trainingState.conqueredSkills.length === 0) {
    if (skillsData?.categories) {
      const confirmed = [];
      skillsData.categories.forEach(cat => {
        cat.skills?.forEach(s => {
          if (s.status === 'confirmed') confirmed.push(s.name);
        });
      });
      trainingState.conqueredSkills = confirmed;
      saveTrainingState(trainingState);
    }
  }

  // Calculate metrics
  const conqueredSkillsCount = trainingState.conqueredSkills.length;
  const projectStates = trainingState.projectStates || {};
  const activeProjectsCount = Object.values(projectStates).filter(p => p.status === 'in-progress').length;
  const conqueredProjectsCount = Object.values(projectStates).filter(p => p.status === 'conquered').length;

  const radarData = calculateRadarData(skillsData, trainingState);
  const avgReadiness = Math.round(radarData.current.reduce((a, b) => a + b, 0) / radarData.current.length);

  // Top focus gaps to recommend
  const unmasteredGaps = [];
  if (skillsData?.categories) {
    skillsData.categories.forEach(c => {
      c.skills?.forEach(s => {
        if ((s.status === 'gap' || s.status === 'cert-gap') && !trainingState.conqueredSkills.includes(s.name)) {
          unmasteredGaps.push({ ...s, category: c.label });
        }
      });
    });
  }
  unmasteredGaps.sort((a, b) => (b.demand200k || 0) - (a.demand200k || 0));

  content.innerHTML = `
    <!-- Header -->
    <div class="training-header">
      <div>
        <div class="page-title" style="display:flex;align-items:center;gap:10px;">
          <span>🎯</span> Skills Radar & Training Hub
        </div>
        <div class="page-subtitle">
          Interactive proficiency diagnostics, $200k gap-closing portfolio projects, and mastery tracking.
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button class="btn btn-secondary btn-sm" id="btn-export-training" title="Export progress JSON">
          💾 Export Data
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-import-training" title="Import progress JSON">
          📥 Import
        </button>
        <input type="file" id="import-training-file" accept=".json" style="display:none;" />
        <a href="https://github.com/CipherPole?tab=repositories" target="_blank" class="btn btn-primary btn-sm">
          <span>🚀</span> Open GitHub (CipherPole)
        </a>
      </div>
    </div>

    <!-- Stat Strip -->
    <div class="grid-4" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-value text-gold">${avgReadiness}%</div>
        <div class="stat-label">$200k Lead Readiness Index</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-green">${conqueredSkillsCount}</div>
        <div class="stat-label">Conquered Skills Mastered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#06b6d4;">${activeProjectsCount}</div>
        <div class="stat-label">Projects In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#a855f7;">${conqueredProjectsCount} 🏆</div>
        <div class="stat-label">Showcase Repos Conquered</div>
      </div>
    </div>

    <!-- Radar Chart & Priority Focus Grid -->
    <div class="radar-grid">
      <!-- Radar Card -->
      <div class="radar-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-weight:700;font-size:16px;">Skill Matrix Diagnostic</div>
          <div class="chip gold" style="font-size:10px;">Target: $200k Lead Benchmark</div>
        </div>
        <div class="radar-canvas-wrap">
          <canvas id="skillsRadarChart"></canvas>
        </div>
        <div class="radar-legend">
          <div class="radar-legend-item">
            <div class="radar-dot gold"></div>
            <span>Joseph's Current Mastery (${avgReadiness}%)</span>
          </div>
          <div class="radar-legend-item">
            <div class="radar-dot cyan"></div>
            <span>Target for $200k DevOps/Platform Lead (~90%)</span>
          </div>
        </div>
      </div>

      <!-- Priority Focus & Quick Conquest -->
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="focus-box">
          <div class="focus-header">
            <span>⚡</span> Priority Focus: Highest ROI Skill Gaps
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">
            Targeting these top-demand skills closes the gap from $145k to $200k compensation. Click the checkbox to mark as mastered.
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:240px;overflow-y:auto;padding-right:4px;">
            ${unmasteredGaps.slice(0, 7).map(gap => `
              <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div>
                  <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${gap.name}</div>
                  <div style="font-size:10px;color:var(--text-dim);">${gap.category} • 200k Demand: ⭐ ${gap.demand200k}/5</div>
                </div>
                <button class="btn btn-secondary btn-sm quick-conquer-btn" data-skill="${gap.name}" style="font-size:10px;padding:4px 8px;">
                  Mark Mastered ✓
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Next Recommended Action -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;">
          <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:8px;display:flex;align-items:center;gap:8px;">
            <span>🚀</span> Next Recommended Weekend Sprint
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">
            Deploy <strong>ArgoCD GitOps Delivery Mesh</strong> on EKS to master GitOps, ArgoCD, and Helm in one public showcase repository.
          </div>
          <button class="btn btn-primary btn-sm w-full" id="btn-jump-top-project">
            View ArgoCD GitOps Project Guide →
          </button>
        </div>
      </div>
    </div>

    <!-- Recommended Portfolio Projects -->
    <div style="margin-top:32px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:18px;font-weight:800;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <span>🛠️</span> Recommended Projects (Skill Gap Conquerors)
          </div>
          <div style="font-size:12px;color:var(--text-secondary);">
            Complete and host these on public GitHub (<code style="color:var(--gold-light);">CipherPole</code>) to provide undeniable proof of capability to recruiters and hiring managers.
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="training-filter-bar">
        <button class="training-filter-btn active" data-filter="all">All Projects (${trainingProjects.length})</button>
        <button class="training-filter-btn" data-filter="GitOps & CI/CD">GitOps & CI/CD</button>
        <button class="training-filter-btn" data-filter="Observability & SRE">Observability & SRE</button>
        <button class="training-filter-btn" data-filter="Cloud & IaC">Cloud & IaC</button>
        <button class="training-filter-btn" data-filter="Security & DevSecOps">DevSecOps & Security</button>
        <button class="training-filter-btn" data-filter="Languages & Scripting">Golang & Microservices</button>
        <button class="training-filter-btn" data-filter="AI-Assisted Development">AI Ops</button>
      </div>

      <!-- Projects Grid -->
      <div class="training-projects-grid" id="training-projects-grid">
        ${trainingProjects.map(proj => renderProjectCard(proj, trainingState)).join('')}
      </div>
    </div>

    <!-- Conquered Trophy Wall -->
    <div class="trophy-wall">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px;">
            <span>🏆</span> Conquered Trophy Wall
          </div>
          <div style="font-size:12px;color:var(--text-secondary);">
            Showcase of projects conquered and skills verified for your public GitHub presence.
          </div>
        </div>
        <div class="chip gold" style="font-size:11px;">
          ${conqueredProjectsCount} Projects Conquered
        </div>
      </div>

      <div class="trophy-grid" id="trophy-grid">
        ${renderTrophyGrid(trainingProjects, trainingState)}
      </div>
    </div>

    <!-- README Preview & Git Setup Modal -->
    <div class="modal-overlay" id="project-modal">
      <div class="modal-box">
        <div class="modal-header">
          <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;" id="modal-title">
            <span>📄</span> Project Setup & README Starter
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-close-modal" style="padding:4px 10px;">✕</button>
        </div>
        <div class="modal-body" id="modal-body">
          <!-- Populated dynamically -->
        </div>
        <div class="modal-footer" id="modal-footer">
          <button class="btn btn-secondary btn-sm" id="btn-modal-close-action">Close</button>
          <button class="btn btn-primary btn-sm" id="btn-modal-copy-readme">📋 Copy README.md</button>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers and initialize radar chart
  initRadarChart(radarData);
  attachTrainingEvents(trainingProjects, trainingState);
}

// ── Render Single Project Card ────────────────────────────────
function renderProjectCard(proj, trainingState) {
  const pState = (trainingState.projectStates || {})[proj.id] || { status: proj.statusDefault || 'available', repoUrl: '' };
  const isConquered = pState.status === 'conquered';
  const isInProgress = pState.status === 'in-progress';

  let badgeClass = 'badge-available';
  let badgeLabel = 'Available';
  let cardClass = '';

  if (isConquered) {
    badgeClass = 'badge-conquered';
    badgeLabel = '🏆 Conquered';
    cardClass = 'conquered';
  } else if (isInProgress) {
    badgeClass = 'badge-in-progress';
    badgeLabel = '⏳ In Progress';
    cardClass = 'in-progress';
  }

  const difficultyStars = '★'.repeat(proj.difficulty) + '☆'.repeat(5 - proj.difficulty);

  return `
    <div class="project-train-card ${cardClass}" data-project-id="${proj.id}" data-category="${proj.category}">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:24px;width:40px;height:40px;background:rgba(255,255,255,0.05);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;">
              ${proj.icon}
            </div>
            <div>
              <div style="font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:700;">${proj.category}</div>
              <div style="font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.3;">${proj.title}</div>
            </div>
          </div>
          <span class="project-train-badge ${badgeClass}">${badgeLabel}</span>
        </div>

        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.5;">
          ${proj.tagline}
        </div>

        <!-- Metrics -->
        <div style="display:flex;gap:12px;margin-bottom:14px;font-size:11px;color:var(--text-dim);flex-wrap:wrap;">
          <span>Difficulty: <span style="color:var(--gold);">${difficultyStars}</span></span>
          <span>Effort: <strong style="color:var(--text-secondary);">${proj.estimatedHours} hrs</strong></span>
          <span>$200k Impact: <strong style="color:var(--green);">${proj.impactScore}/10</strong></span>
        </div>

        <!-- Target Skills Conquered -->
        <div style="margin-bottom:16px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">
            Skills This Project Conquers:
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${(proj.gapSkills || []).map(sk => `
              <span class="chip ${trainingState.conqueredSkills.includes(sk) ? 'green' : 'gold'}" style="font-size:10px;padding:2px 8px;">
                ${trainingState.conqueredSkills.includes(sk) ? '✓ ' : '+ '}${sk}
              </span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:8px;">
        <!-- Public Git URL input if in progress or conquered -->
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
          <input type="url" class="input git-url-input" data-project-id="${proj.id}" 
            placeholder="https://github.com/CipherPole/${proj.githubRepoSuggested}" 
            value="${pState.repoUrl || ''}"
            style="font-size:11px;padding:6px 10px;height:30px;flex:1;" />
          <button class="btn btn-secondary btn-sm save-git-url-btn" data-project-id="${proj.id}" style="font-size:10px;padding:6px 10px;height:30px;" title="Save public repo URL">
            💾
          </button>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm view-starter-btn" data-project-id="${proj.id}" style="font-size:11px;flex:1;">
            📖 Architecture & README
          </button>

          ${!isConquered ? `
            <button class="btn ${isInProgress ? 'btn-primary' : 'btn-secondary'} btn-sm toggle-status-btn" data-project-id="${proj.id}" data-action="toggle-progress" style="font-size:11px;">
              ${isInProgress ? 'Mark Conquered 🏆' : 'Start Project ⚡'}
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm toggle-status-btn" data-project-id="${proj.id}" data-action="reopen" style="font-size:11px;color:var(--text-dim);" title="Mark as in-progress again">
              Undo
            </button>
            <a href="${pState.repoUrl || `https://github.com/CipherPole/${proj.githubRepoSuggested}`}" target="_blank" class="btn btn-primary btn-sm" style="font-size:11px;">
              View on Git ↗
            </a>
          `}
        </div>
      </div>
    </div>
  `;
}

// ── Render Trophy Grid ────────────────────────────────────────
function renderTrophyGrid(trainingProjects, trainingState) {
  const conqueredProjectIds = Object.entries(trainingState.projectStates || {})
    .filter(([_, p]) => p.status === 'conquered')
    .map(([id]) => id);

  if (conqueredProjectIds.length === 0) {
    return `
      <div style="grid-column: 1 / -1; text-align:center; padding: 30px; color:var(--text-dim); font-size:13px;">
        <div style="font-size:32px;margin-bottom:8px;">🥋</div>
        <div>No projects marked as conquered yet. Complete a recommended project above and mark it conquered to display it on your Trophy Wall!</div>
      </div>
    `;
  }

  return conqueredProjectIds.map(id => {
    const proj = trainingProjects.find(p => p.id === id);
    if (!proj) return '';
    const pState = (trainingState.projectStates || {})[id];
    const completedDate = pState?.completedAt ? new Date(pState.completedAt).toLocaleDateString() : 'Mastered';

    return `
      <div class="trophy-card">
        <div class="trophy-icon">🏆</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${proj.title}
          </div>
          <div style="font-size:10px;color:var(--gold-light);margin-top:2px;">
            Conquered on ${completedDate}
          </div>
          <div style="margin-top:4px;">
            <a href="${pState?.repoUrl || `https://github.com/CipherPole/${proj.githubRepoSuggested}`}" target="_blank" style="font-size:10px;color:var(--blue);text-decoration:none;">
              GitHub Repo ↗
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Initialize Radar Chart (Chart.js) ─────────────────────────
function initRadarChart(radarData) {
  const ctx = document.getElementById('skillsRadarChart');
  if (!ctx) return;

  if (typeof Chart === 'undefined') {
    ctx.parentElement.innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--text-dim);">
        <p>Loading visual radar chart engine...</p>
      </div>
    `;
    return;
  }

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: radarData.labels,
      datasets: [
        {
          label: "Joseph's Current Mastery",
          data: radarData.current,
          backgroundColor: 'rgba(245, 158, 11, 0.25)',
          borderColor: '#f59e0b',
          borderWidth: 2.5,
          pointBackgroundColor: '#fbbf24',
          pointBorderColor: '#09090c',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#f59e0b',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Target for $200k Lead Roles',
          data: radarData.target,
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          borderColor: 'rgba(6, 182, 212, 0.8)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#09090c',
          pointRadius: 3,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            display: false,
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
          pointLabels: {
            color: '#9898a8',
            font: {
              family: "'Inter', sans-serif",
              size: 11,
              weight: '600'
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#16161d',
          titleColor: '#f1f1f3',
          bodyColor: '#9898a8',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.raw}%`;
            }
          }
        }
      }
    }
  });
}

// ── Event Listeners ───────────────────────────────────────────
function attachTrainingEvents(trainingProjects, trainingState) {
  // Quick conquer buttons
  document.querySelectorAll('.quick-conquer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.dataset.skill;
      if (!trainingState.conqueredSkills.includes(skill)) {
        trainingState.conqueredSkills.push(skill);
        saveTrainingState(trainingState);
        window.toast?.(`Mastered: ${skill}! Radar updated.`, 'gold');
        renderTrainingHub();
      }
    });
  });

  // Jump to top project button
  const jumpBtn = document.getElementById('btn-jump-top-project');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const card = document.querySelector('.project-train-card[data-project-id="gitops-argocd-eks"]');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.borderColor = 'var(--gold)';
        setTimeout(() => { card.style.borderColor = ''; }, 2000);
      }
    });
  }

  // Filter Buttons
  document.querySelectorAll('.training-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.training-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      document.querySelectorAll('.project-train-card').forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Save Git URL buttons
  document.querySelectorAll('.save-git-url-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const projId = btn.dataset.projectId;
      const input = document.querySelector(`.git-url-input[data-project-id="${projId}"]`);
      if (input) {
        trainingState.projectStates = trainingState.projectStates || {};
        trainingState.projectStates[projId] = trainingState.projectStates[projId] || { status: 'available' };
        trainingState.projectStates[projId].repoUrl = input.value.trim();
        saveTrainingState(trainingState);
        window.toast?.('GitHub repository URL saved!', 'green');
      }
    });
  });

  // Toggle Project Status (Start Project / Mark Conquered / Undo)
  document.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const projId = btn.dataset.projectId;
      const action = btn.dataset.action;
      const proj = trainingProjects.find(p => p.id === projId);

      trainingState.projectStates = trainingState.projectStates || {};
      const current = trainingState.projectStates[projId] || { status: 'available', repoUrl: '' };

      if (action === 'toggle-progress') {
        if (current.status === 'available') {
          current.status = 'in-progress';
          window.toast?.(`Started: ${proj.title}!`, 'gold');
        } else if (current.status === 'in-progress') {
          current.status = 'conquered';
          current.completedAt = new Date().toISOString();
          // Also mark gap skills associated with this project as conquered
          (proj.gapSkills || []).forEach(sk => {
            if (!trainingState.conqueredSkills.includes(sk)) {
              trainingState.conqueredSkills.push(sk);
            }
          });
          window.toast?.(`🏆 Conquered: ${proj.title}! Added to Trophy Wall.`, 'green');
        }
      } else if (action === 'reopen') {
        current.status = 'in-progress';
        window.toast?.(`Reopened ${proj.title} as In Progress.`, 'gold');
      }

      trainingState.projectStates[projId] = current;
      saveTrainingState(trainingState);
      renderTrainingHub();
    });
  });

  // View Architecture & README Starter modal
  document.querySelectorAll('.view-starter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const projId = btn.dataset.projectId;
      const proj = trainingProjects.find(p => p.id === projId);
      if (!proj) return;
      openReadmeModal(proj);
    });
  });

  // Modal Close buttons
  const modal = document.getElementById('project-modal');
  const closeBtn = document.getElementById('btn-close-modal');
  const closeActionBtn = document.getElementById('btn-modal-close-action');
  if (closeBtn) closeBtn.onclick = () => modal?.classList.remove('open');
  if (closeActionBtn) closeActionBtn.onclick = () => modal?.classList.remove('open');
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('open');
    };
  }

  // Export Data
  const exportBtn = document.getElementById('btn-export-training');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trainingState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `career_engine_training_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.toast?.('Exported training backup JSON!', 'green');
    });
  }

  // Import Data
  const importBtn = document.getElementById('btn-import-training');
  const fileInput = document.getElementById('import-training-file');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.conqueredSkills || parsed.projectStates) {
            saveTrainingState(parsed);
            window.toast?.('Training progress imported successfully!', 'green');
            renderTrainingHub();
          }
        } catch {
          window.toast?.('Invalid training JSON file.', 'red');
        }
      };
      reader.readAsText(file);
    });
  }
}

// ── Open README / Setup Modal ─────────────────────────────────
function openReadmeModal(proj) {
  const modal = document.getElementById('project-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const copyBtn = document.getElementById('btn-modal-copy-readme');

  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.innerHTML = `<span>${proj.icon}</span> ${proj.title}`;
  modalBody.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:14px;font-weight:700;color:var(--gold-light);margin-bottom:6px;">Project Architecture & Plan</div>
      <p style="color:var(--text-secondary);margin-bottom:12px;">${proj.summary}</p>

      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">What You Will Build:</div>
      <ul style="padding-left:20px;color:var(--text-secondary);margin-bottom:16px;display:flex;flex-direction:column;gap:4px;">
        ${(proj.whatYouBuild || []).map(item => `<li>${item}</li>`).join('')}
      </ul>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Pre-Configured README.md Starter:</div>
        <a href="https://github.com/new?name=${proj.githubRepoSuggested}&description=${encodeURIComponent(proj.tagline)}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:11px;">
          🚀 Create "${proj.githubRepoSuggested}" on GitHub ↗
        </a>
      </div>
      <div class="code-preview" id="readme-code-content">${escapeHtml(proj.readmeStarter || '# ' + proj.title)}</div>
    </div>
  `;

  if (copyBtn) {
    copyBtn.onclick = () => {
      window.copyToClipboard?.(proj.readmeStarter || '', copyBtn);
    };
  }

  modal.classList.add('open');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
