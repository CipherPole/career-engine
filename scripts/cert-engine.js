/* ============================================================
   CERT-ENGINE.JS — Certification Roadmap, YouTube Courses & IDE Labs
   ============================================================ */

'use strict';

const STORAGE_KEY = 'careerEngine_certs_v1';

const DEFAULT_CERT_STATE = {
  certStates: {}, // [certId]: { status: 'not-started'|'studying'|'scheduled'|'earned', earnedAt: null }
};

function getCertStateFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading cert state:', e);
  }
  return { ...DEFAULT_CERT_STATE };
}

async function getCertState() {
  const localState = getCertStateFromLocal();
  try {
    const res = await fetch('/api/state?key=certs', { credentials: 'include' });
    if (res.ok) {
      const body = await res.json();
      if (body?.state && typeof body.state === 'object' && !Array.isArray(body.state)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(body.state));
        return body.state;
      }
    }
  } catch {}
  return localState;
}

function saveCertState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed saving cert state:', e);
  }

  fetch('/api/state?key=certs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ state }),
  }).catch(() => {});
}

// ── Main Page Render ──────────────────────────────────────────
export async function renderCertifications() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const certs = window._state?.certsData || [];
  const certState = await getCertState();

  // Metrics calculation
  const totalCerts = certs.length;
  const freeCertsCount = certs.filter(c => c.tier === 'free').length;
  const studyingCount = Object.values(certState.certStates || {}).filter(s => s.status === 'studying').length;
  const earnedCount = Object.values(certState.certStates || {}).filter(s => s.status === 'earned').length;

  content.innerHTML = `
    <!-- Header -->
    <div class="training-header">
      <div>
        <div class="page-title" style="display:flex;align-items:center;gap:10px;">
          <span>🎓</span> Certification Strategy & Learning Hub
        </div>
        <div class="page-subtitle">
          Free digital badges ($0), $200k career-accelerating credentials, curated YouTube courses, and Antigravity & VS Code lab workflows.
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button class="btn btn-secondary btn-sm" id="btn-export-certs" title="Export certification data">
          💾 Export Data
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-import-certs" title="Import certification data">
          📥 Import
        </button>
        <input type="file" id="import-certs-file" accept=".json" style="display:none;" />
        <button class="btn btn-primary btn-sm" id="btn-jump-to-training">
          <span>🎯</span> Open Training Projects →
        </button>
      </div>
    </div>

    <!-- Stat Strip -->
    <div class="grid-4" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-value text-green">${freeCertsCount}</div>
        <div class="stat-label">Free Badges ($0 Cost)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gold">${studyingCount}</div>
        <div class="stat-label">Certs In Study ⏳</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#06b6d4;">${earnedCount} 🎓</div>
        <div class="stat-label">Credentials Earned</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#a855f7;">$200k</div>
        <div class="stat-label">Target Role Benchmark</div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="training-filter-bar">
      <button class="training-filter-btn active" data-filter="all">All Credentials (${totalCerts})</button>
      <button class="training-filter-btn" data-filter="free">Free Badges ($0) (${freeCertsCount})</button>
      <button class="training-filter-btn" data-filter="paid">Paid $200k Accelerators (${totalCerts - freeCertsCount})</button>
      <button class="training-filter-btn" data-filter="studying">Currently Studying (${studyingCount})</button>
      <button class="training-filter-btn" data-filter="earned">Earned 🎓 (${earnedCount})</button>
    </div>

    <!-- Certification Cards Grid -->
    <div class="cert-grid" id="cert-grid">
      ${certs.map(cert => renderCertCard(cert, certState)).join('')}
    </div>

    <!-- IDE Lab Guide Modal -->
    <div class="modal-overlay" id="ide-modal">
      <div class="modal-box">
        <div class="modal-header">
          <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;" id="ide-modal-title">
            <span>💻</span> IDE Lab & Terminal Practice Guide
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-close-ide-modal" style="padding:4px 10px;">✕</button>
        </div>
        <div class="modal-body" id="ide-modal-body">
          <!-- Populated dynamically -->
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="btn-ide-modal-close">Close</button>
          <button class="btn btn-primary btn-sm" id="btn-copy-ide-commands">📋 Copy Setup Commands</button>
        </div>
      </div>
    </div>
  `;

  attachCertEvents(certs, certState);
}

// ── Render Single Certification Card ──────────────────────────
function renderCertCard(cert, certState) {
  const cState = (certState.certStates || {})[cert.id] || { status: cert.statusDefault || 'not-started' };
  const isFree = cert.tier === 'free';
  const isEarned = cState.status === 'earned';
  const isStudying = cState.status === 'studying';

  let cardClasses = 'cert-card';
  if (isEarned) cardClasses += ' earned';
  if (isStudying) cardClasses += ' studying';

  const costPill = isFree
    ? `<span class="cost-pill-free">✨ $0 FREE</span>`
    : `<span class="cost-pill-paid">💳 ${cert.cost}</span>`;

  return `
    <div class="${cardClasses}" data-cert-id="${cert.id}" data-tier="${cert.tier}" data-status="${cState.status}">
      <div>
        <!-- Top row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:24px;width:42px;height:42px;background:rgba(255,255,255,0.05);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;">
              ${cert.icon}
            </div>
            <div>
              <div style="font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:700;">${cert.provider}</div>
              <div style="font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.3;">${cert.name}</div>
            </div>
          </div>
          ${costPill}
        </div>

        <!-- Exam Details Strip -->
        <div style="display:flex;gap:12px;font-size:11px;color:var(--text-secondary);margin-bottom:12px;flex-wrap:wrap;">
          <span>⏱️ Study: <strong style="color:var(--text-primary);">${cert.studyHours}</strong></span>
          <span>⭐ ROI: <strong style="color:var(--gold-light);">${cert.roiScore}/10</strong> (${cert.roiLabel})</span>
        </div>

        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px;">
          ${cert.summary}
        </div>

        <!-- YouTube Video Course Box -->
        ${cert.youtubeCourse ? `
          <div class="youtube-box">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;">
                ▶️ Free YouTube Video Course
              </span>
              <span style="font-size:10px;color:var(--text-dim);">${cert.youtubeCourse.duration}</span>
            </div>
            <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-top:2px;">
              ${cert.youtubeCourse.title}
            </div>
            <div style="font-size:10px;color:var(--text-secondary);">
              By ${cert.youtubeCourse.creator} • ${cert.youtubeCourse.highlights}
            </div>
            <div style="margin-top:6px;">
              <a href="${cert.youtubeCourse.url}" target="_blank" class="youtube-btn">
                <span>▶ Watch Full Course on YouTube</span> ↗
              </a>
            </div>
          </div>
        ` : ''}

        <!-- Paired Training Project -->
        ${cert.pairedProjectId ? `
          <div class="paired-project-box">
            <div>
              <div style="font-size:9px;text-transform:uppercase;color:var(--gold);font-weight:700;">
                🛠️ Hands-on Portfolio Project Alignment:
              </div>
              <div style="font-size:11px;font-weight:600;color:var(--text-primary);margin-top:2px;">
                ${cert.pairedProjectTitle}
              </div>
            </div>
            <button class="btn btn-secondary btn-sm jump-proj-btn" data-project-id="${cert.pairedProjectId}" style="font-size:10px;padding:4px 8px;flex-shrink:0;">
              View Project 🎯
            </button>
          </div>
        ` : ''}

        <!-- Voucher Tip -->
        ${cert.voucherTip ? `
          <div style="font-size:11px;color:var(--text-dim);background:rgba(255,255,255,0.02);border:1px dashed var(--border);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:14px;">
            💡 <strong style="color:var(--text-secondary);">Pro Tip:</strong> ${cert.voucherTip}
          </div>
        ` : ''}
      </div>

      <!-- Card Footer: Status Selector & Actions -->
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <button class="ide-guide-btn" data-cert-id="${cert.id}">
          💻 IDE Lab Guide
        </button>

        <div style="display:flex;gap:8px;align-items:center;">
          <select class="cert-status-select" data-cert-id="${cert.id}">
            <option value="not-started" ${cState.status === 'not-started' ? 'selected' : ''}>Not Started</option>
            <option value="studying" ${cState.status === 'studying' ? 'selected' : ''}>⏳ Studying</option>
            <option value="scheduled" ${cState.status === 'scheduled' ? 'selected' : ''}>📅 Scheduled</option>
            <option value="earned" ${cState.status === 'earned' ? 'selected' : ''}>🎓 Earned</option>
          </select>

          <a href="${cert.whereToTakeUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:11px;">
            Provider Portal ↗
          </a>
        </div>
      </div>
    </div>
  `;
}

// ── Event Handlers ────────────────────────────────────────────
function attachCertEvents(certs, certState) {
  // Filter Buttons
  document.querySelectorAll('.training-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.training-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      document.querySelectorAll('.cert-card').forEach(card => {
        const tier = card.dataset.tier;
        const status = card.dataset.status;

        if (filter === 'all') {
          card.style.display = 'flex';
        } else if (filter === 'free' && tier === 'free') {
          card.style.display = 'flex';
        } else if (filter === 'paid' && tier === 'paid') {
          card.style.display = 'flex';
        } else if (filter === 'studying' && status === 'studying') {
          card.style.display = 'flex';
        } else if (filter === 'earned' && status === 'earned') {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Status dropdown change
  document.querySelectorAll('.cert-status-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const certId = sel.dataset.certId;
      const newStatus = sel.value;
      const cert = certs.find(c => c.id === certId);

      certState.certStates = certState.certStates || {};
      certState.certStates[certId] = certState.certStates[certId] || {};
      certState.certStates[certId].status = newStatus;
      if (newStatus === 'earned') {
        certState.certStates[certId].earnedAt = new Date().toISOString();
        window.toast?.(`🎉 Earned: ${cert.name}! Added to your verified credentials.`, 'green');
      } else {
        window.toast?.(`Updated status to: ${newStatus}`, 'gold');
      }

      saveCertState(certState);
      renderCertifications();
    });
  });

  // Jump to Paired Training Project
  document.querySelectorAll('.jump-proj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.navigate?.('training');
    });
  });

  // Jump to training button in header
  const jumpTrainBtn = document.getElementById('btn-jump-to-training');
  if (jumpTrainBtn) {
    jumpTrainBtn.addEventListener('click', () => {
      window.navigate?.('training');
    });
  }

  // Open IDE Lab Guide Modal
  document.querySelectorAll('.ide-guide-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const certId = btn.dataset.certId;
      const cert = certs.find(c => c.id === certId);
      if (!cert || !cert.ideLabGuide) return;
      openIdeModal(cert);
    });
  });

  // Modal Close buttons
  const modal = document.getElementById('ide-modal');
  const closeBtn = document.getElementById('btn-close-ide-modal');
  const closeActionBtn = document.getElementById('btn-ide-modal-close');
  if (closeBtn) closeBtn.onclick = () => modal?.classList.remove('open');
  if (closeActionBtn) closeActionBtn.onclick = () => modal?.classList.remove('open');
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('open');
    };
  }

  // Export Data
  const exportBtn = document.getElementById('btn-export-certs');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(certState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `career_engine_certs_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.toast?.('Exported certifications backup JSON!', 'green');
    });
  }

  // Import Data
  const importBtn = document.getElementById('btn-import-certs');
  const fileInput = document.getElementById('import-certs-file');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.certStates) {
            saveCertState(parsed);
            window.toast?.('Certifications state imported successfully!', 'green');
            renderCertifications();
          }
        } catch {
          window.toast?.('Invalid certifications JSON file.', 'red');
        }
      };
      reader.readAsText(file);
    });
  }
}

// ── Open IDE Lab Guide Modal ──────────────────────────────────
function openIdeModal(cert) {
  const modal = document.getElementById('ide-modal');
  const title = document.getElementById('ide-modal-title');
  const body = document.getElementById('ide-modal-body');
  const copyBtn = document.getElementById('btn-copy-ide-commands');

  if (!modal || !title || !body) return;

  const guide = cert.ideLabGuide;
  const commandsText = (guide.setupCommands || []).join('\n');

  title.innerHTML = `<span>💻</span> ${cert.name} — IDE Lab Guide`;
  body.innerHTML = `
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--gold-light);margin-bottom:8px;">
        Target Environment: ${guide.ide || 'Antigravity IDE & Visual Studio Code'}
      </div>

      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">
        Recommended IDE Extensions:
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
        ${(guide.recommendedExtensions || []).map(ext => `
          <span class="chip gold" style="font-size:11px;">${ext}</span>
        `).join('')}
      </div>

      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">
        Terminal Setup & Verification Commands:
      </div>
      <div class="code-preview" style="max-height:220px;margin-bottom:16px;">${escapeHtml(commandsText)}</div>

      <div style="background:rgba(245, 158, 11, 0.06);border:1px solid var(--gold-border);border-radius:var(--radius-md);padding:12px;font-size:12px;color:var(--text-secondary);line-height:1.5;">
        <strong style="color:var(--gold-light);">💡 Lab Practice Workflow:</strong>
        <p style="margin-top:4px;">${guide.labNotes || ''}</p>
      </div>
    </div>
  `;

  if (copyBtn) {
    copyBtn.onclick = () => {
      window.copyToClipboard?.(commandsText, copyBtn);
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
