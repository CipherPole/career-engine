'use strict';

const STORAGE_KEY = 'careerEngine_implementation_lab_v1';

const RATING_FIELDS = [
  {
    id: 'goalClarity',
    label: 'Goal Clarity',
    prompt: 'Did I state the exact user-visible outcome I wanted?',
  },
  {
    id: 'codeAnchor',
    label: 'Code Anchor',
    prompt: 'Did I point to the page, file, behavior, or endpoint that owns the work?',
  },
  {
    id: 'constraints',
    label: 'Constraints',
    prompt: 'Did I mention security, UX, deployment, or stack constraints up front?',
  },
  {
    id: 'acceptance',
    label: 'Acceptance Test',
    prompt: 'Did I define how we would know the change was correct?',
  },
  {
    id: 'dataAuthority',
    label: 'Authority Model',
    prompt: 'Did I state which side is source of truth: browser, server, DB, or auth provider?',
  },
  {
    id: 'iterationControl',
    label: 'Iteration Control',
    prompt: 'Did I ask for a narrow implementation slice instead of a broad guessy change?',
  },
];

function getDefaultState() {
  return {
    latest: {
      ratings: Object.fromEntries(RATING_FIELDS.map((field) => [field.id, 3])),
      originalPrompt: '',
      improvedPrompt: defaultImprovedPrompt(),
      notes: '',
    },
    history: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultState(),
      ...parsed,
      latest: {
        ...getDefaultState().latest,
        ...(parsed.latest || {}),
        ratings: {
          ...getDefaultState().latest.ratings,
          ...((parsed.latest && parsed.latest.ratings) || {}),
        },
      },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return getDefaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampRating(value) {
  const num = Number(value) || 1;
  return Math.min(5, Math.max(1, num));
}

function calculateScore(ratings) {
  const values = RATING_FIELDS.map((field) => clampRating(ratings[field.id]));
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / (RATING_FIELDS.length * 5)) * 100);
}

function deriveStrongestWeakest(ratings) {
  const ordered = RATING_FIELDS
    .map((field) => ({
      label: field.label,
      value: clampRating(ratings[field.id]),
    }))
    .sort((a, b) => b.value - a.value);

  return {
    strongest: ordered[0],
    weakest: ordered[ordered.length - 1],
  };
}

function scoreBadge(score) {
  if (score >= 90) return { label: 'Operator Grade', color: 'var(--green)' };
  if (score >= 75) return { label: 'Implementation Ready', color: 'var(--gold-light)' };
  if (score >= 60) return { label: 'Needs Sharper Framing', color: 'var(--gold)' };
  return { label: 'Too Much Guessing Risk', color: 'var(--red)' };
}

function defaultImprovedPrompt() {
  return [
    'Implement this in the Growth section as a new page called "Implementation Lab".',
    'Goal: help me rate how well I framed implementation requests and show a stronger version of the same prompt.',
    'Anchor files: index.html for nav, scripts/app.js for routing, and a new scripts/implementation-engine.js page module.',
    'Requirements: include a 1-5 self-rating rubric, an original-vs-improved prompt example, local persistence, and notes about what worked in this project.',
    'Authority: local browser storage is fine for this page. No server changes needed unless you find a concrete reason.',
    'Validation: after the change I should see the new Growth nav item, open the page, save a rating snapshot, and reload without losing it.',
  ].join(' ');
}

function renderHistory(history) {
  if (!history.length) {
    return `
      <div style="padding:16px;border:1px dashed var(--border);border-radius:var(--radius-md);color:var(--text-secondary);font-size:12px;">
        No implementation ratings saved yet. Score one session and this timeline will capture what worked.
      </div>
    `;
  }

  return history
    .slice(0, 5)
    .map((entry) => {
      const badge = scoreBadge(entry.score);
      const strongest = entry.strongest?.label || 'N/A';
      const weakest = entry.weakest?.label || 'N/A';
      return `
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${new Date(entry.savedAt).toLocaleString()}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">Strongest: ${strongest} • Weakest: ${weakest}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:900;color:${badge.color};">${entry.score}</div>
            <div style="font-size:11px;color:var(--text-dim);">${badge.label}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function collectFormState() {
  const ratings = Object.fromEntries(
    RATING_FIELDS.map((field) => [field.id, clampRating(document.getElementById(`impl-${field.id}`)?.value)])
  );

  return {
    ratings,
    originalPrompt: document.getElementById('impl-original-prompt')?.value?.trim() || '',
    improvedPrompt: document.getElementById('impl-improved-prompt')?.value?.trim() || defaultImprovedPrompt(),
    notes: document.getElementById('impl-notes')?.value?.trim() || '',
  };
}

function renderSummary(state) {
  const score = calculateScore(state.latest.ratings);
  const badge = scoreBadge(score);
  const summary = deriveStrongestWeakest(state.latest.ratings);
  const strongestEl = document.getElementById('impl-strongest');
  const weakestEl = document.getElementById('impl-weakest');
  const scoreEl = document.getElementById('impl-score');
  const labelEl = document.getElementById('impl-score-label');

  if (strongestEl) strongestEl.textContent = `${summary.strongest.label} (${summary.strongest.value}/5)`;
  if (weakestEl) weakestEl.textContent = `${summary.weakest.label} (${summary.weakest.value}/5)`;
  if (scoreEl) scoreEl.textContent = String(score);
  if (labelEl) {
    labelEl.textContent = badge.label;
    labelEl.style.color = badge.color;
  }

  return { score, badge, summary };
}

export function renderImplementationLab() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const state = loadState();
  const score = calculateScore(state.latest.ratings);
  const badge = scoreBadge(score);
  const summary = deriveStrongestWeakest(state.latest.ratings);

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title" style="display:flex;align-items:center;gap:10px;">
        <span>🛰️</span> Antigravity Implementation Lab
      </div>
      <div class="page-subtitle">Score how well a request was framed, compare original vs improved prompts, and preserve winning implementation patterns for future agent sessions.</div>
    </div>

    <div class="grid-4" style="margin-bottom:24px;gap:16px;">
      <div class="stat-card">
        <div id="impl-score" class="stat-value text-gold">${score}</div>
        <div class="stat-label">Implementation Setup Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${badge.color};font-size:18px;" id="impl-score-label">${badge.label}</div>
        <div class="stat-label">Current Readiness Grade</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size:15px;color:var(--green);" id="impl-strongest">${summary.strongest.label} (${summary.strongest.value}/5)</div>
        <div class="stat-label">Strongest Prompt Trait</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size:15px;color:var(--red);" id="impl-weakest">${summary.weakest.label} (${summary.weakest.value}/5)</div>
        <div class="stat-label">Weakest Prompt Trait</div>
      </div>
    </div>

    <div class="grid-2 gap-20" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-title"><span class="dot"></span>Rate This Session Setup</div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${RATING_FIELDS.map((field) => `
            <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:700;color:var(--text-primary);font-size:13px;">${field.label}</div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:3px;">${field.prompt}</div>
                </div>
                <select id="impl-${field.id}" class="input" style="width:90px;">
                  ${[1, 2, 3, 4, 5].map((value) => `<option value="${value}" ${clampRating(state.latest.ratings[field.id]) === value ? 'selected' : ''}>${value}/5</option>`).join('')}
                </select>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button class="btn btn-gold" id="btn-save-implementation-score">Save Rating Snapshot</button>
          <button class="btn btn-secondary" id="btn-reset-implementation-score">Reset to Baseline</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="dot"></span>Antigravity-First Working Pattern</div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:12px;color:var(--text-secondary);line-height:1.7;">
          <div><strong style="color:var(--text-primary);">1. Start with a narrow anchor.</strong> Name the page, endpoint, file, symbol, or broken behavior before asking for a broad outcome.</div>
          <div><strong style="color:var(--text-primary);">2. State authority early.</strong> Example: "server cookie is source of truth for auth, UI must reflect it immediately."</div>
          <div><strong style="color:var(--text-primary);">3. Ask for one validation target.</strong> Example: "after sign-in, top pill must show Google name and admin role without refresh."</div>
          <div><strong style="color:var(--text-primary);">4. Cache winning prompts.</strong> Treat improved prompts as reusable templates for future Antigravity agent sessions.</div>
          <div style="padding:12px;border:1px dashed var(--border);border-radius:var(--radius-md);background:rgba(245,158,11,0.05);">
            <strong style="color:var(--gold-light);">What worked here:</strong> owner-email role enforcement on the server, session hydration from <code>/api/me</code>, and immediate UI refresh after auth state changes.
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2 gap-20" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-title"><span class="dot"></span>Original Prompt</div>
        <textarea id="impl-original-prompt" class="input" rows="10" placeholder="Paste the original request that caused extra guessing or multiple adjustments.">${state.latest.originalPrompt}</textarea>
      </div>
      <div class="card">
        <div class="card-title"><span class="dot"></span>Improved Prompt</div>
        <textarea id="impl-improved-prompt" class="input" rows="10">${state.latest.improvedPrompt}</textarea>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div class="card-title"><span class="dot"></span>Project-Specific Coaching Notes</div>
      <textarea id="impl-notes" class="input" rows="6" placeholder="What did this session teach about how to ask better implementation questions?">${state.latest.notes}</textarea>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin-top:16px;">
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
          <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Prompt Upgrade Example</div>
          <div style="margin-top:8px;font-size:12px;color:var(--text-secondary);line-height:1.6;">Instead of "make admin work right," ask for "fix the auth path so jerexson3@gmail.com is persisted as admin on the server and the top pill updates immediately after sign-in."</div>
        </div>
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
          <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Validation Upgrade Example</div>
          <div style="margin-top:8px;font-size:12px;color:var(--text-secondary);line-height:1.6;">Ask for the visible proof: "after login, I should see my Google name, Admin role, and Settings nav without manual refresh."</div>
        </div>
        <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
          <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Caching Upgrade Example</div>
          <div style="margin-top:8px;font-size:12px;color:var(--text-secondary);line-height:1.6;">Keep reusable prompt patterns and implementation outcomes in markdown so future sessions start from verified context instead of rediscovering it.</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="dot"></span>Recent Rating Snapshots</div>
      <div id="impl-history" style="display:flex;flex-direction:column;gap:12px;">${renderHistory(state.history)}</div>
    </div>
  `;

  const refresh = () => {
    state.latest = collectFormState();
    renderSummary(state);
  };

  RATING_FIELDS.forEach((field) => {
    document.getElementById(`impl-${field.id}`)?.addEventListener('change', refresh);
  });

  document.getElementById('impl-original-prompt')?.addEventListener('input', refresh);
  document.getElementById('impl-improved-prompt')?.addEventListener('input', refresh);
  document.getElementById('impl-notes')?.addEventListener('input', refresh);

  document.getElementById('btn-save-implementation-score')?.addEventListener('click', () => {
    state.latest = collectFormState();
    const snapshot = renderSummary(state);
    state.history.unshift({
      savedAt: new Date().toISOString(),
      score: snapshot.score,
      strongest: snapshot.summary.strongest,
      weakest: snapshot.summary.weakest,
      originalPrompt: state.latest.originalPrompt,
      improvedPrompt: state.latest.improvedPrompt,
      notes: state.latest.notes,
    });
    state.history = state.history.slice(0, 12);
    saveState(state);
    document.getElementById('impl-history').innerHTML = renderHistory(state.history);
    window.toast?.('Implementation rating saved.', 'green');
  });

  document.getElementById('btn-reset-implementation-score')?.addEventListener('click', () => {
    const fresh = getDefaultState();
    saveState(fresh);
    renderImplementationLab();
    window.toast?.('Implementation lab reset to baseline.', 'gold');
  });
}
