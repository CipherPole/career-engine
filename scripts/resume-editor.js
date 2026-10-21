/* ============================================================
   RESUME-EDITOR.JS — In-Studio Resume Editor
   Edits the active profile (contact, summary, skills, experience,
   education, certifications, accomplishments) and saves it to
   /api/profile with a local cache fallback.
   ============================================================ */

'use strict';

import { isOwner, getCurrentUser } from './auth-engine.js?v=8';

const SKILL_LABELS = {
  devops_cicd: 'DevOps & CI/CD', cloud_aws: 'AWS', cloud_gcp: 'Google Cloud', cloud_azure: 'Azure',
  containers_orchestration: 'Containers & Orchestration', iac: 'Infrastructure as Code', testing_qa: 'Testing & QA',
  languages: 'Languages', monitoring: 'Monitoring', networking: 'Networking', platforms: 'Platforms',
  ai_tools: 'AI Tools', databases: 'Databases', backup_dr: 'Backup & DR', methodology: 'Methodology',
};

let draft = null;
let dirty = false;
let onDone = null;

// ── Helpers ───────────────────────────────────────────────────
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function skillLabel(key) {
  return SKILL_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  keys.slice(0, -1).forEach((k, i) => {
    if (target[k] === undefined || target[k] === null) target[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    target = target[k];
  });
  target[keys[keys.length - 1]] = value;
}

function parseValue(el) {
  const raw = el.value;
  if (el.dataset.kind === 'lines') return raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (el.dataset.kind === 'csv') return raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  return raw.trim();
}

/** Only logged-in users editing their own profile (not the public showcase) can edit. */
export function canEditResume() {
  const showcase = sessionStorage.getItem('careerEngine_showcase_active') === 'true';
  return !!getCurrentUser()?.isLoggedIn && !showcase;
}

// ── Field Builders ────────────────────────────────────────────
function input(path, label, value, opts = {}) {
  const id = `re-${path.replace(/\./g, '-')}`;
  return `
    <div${opts.wide ? ' class="re-wide"' : ''}>
      <label class="field-label" for="${id}">${esc(label)}</label>
      <input id="${id}" class="field" type="${opts.type || 'text'}" data-path="${path}" value="${esc(value)}" ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}>
    </div>`;
}

function textarea(path, label, value, opts = {}) {
  const id = `re-${path.replace(/\./g, '-')}`;
  const text = Array.isArray(value) ? value.join(opts.kind === 'csv' ? ', ' : '\n') : (value || '');
  return `
    <div class="re-wide">
      <label class="field-label" for="${id}">${esc(label)}</label>
      <textarea id="${id}" class="field" rows="${opts.rows || 4}" data-path="${path}" ${opts.kind ? `data-kind="${opts.kind}"` : ''} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}>${esc(text)}</textarea>
      ${opts.help ? `<div class="re-help">${opts.help}</div>` : ''}
    </div>`;
}

function itemControls(list, index, total, noun) {
  return `
    <div class="re-item-controls">
      <button class="btn btn-ghost btn-sm" data-action="move" data-list="${list}" data-index="${index}" data-dir="-1" ${index === 0 ? 'disabled' : ''} aria-label="Move ${noun} up">↑</button>
      <button class="btn btn-ghost btn-sm" data-action="move" data-list="${list}" data-index="${index}" data-dir="1" ${index === total - 1 ? 'disabled' : ''} aria-label="Move ${noun} down">↓</button>
      <button class="btn btn-ghost btn-sm re-remove" data-action="remove" data-list="${list}" data-index="${index}">Remove</button>
    </div>`;
}

function section(title, body, addAction) {
  return `
    <div class="card mb-16">
      <div class="re-section-head">
        <div class="card-title" style="margin-bottom:0;"><span class="dot"></span>${title}</div>
        ${addAction ? `<button class="btn btn-outline btn-sm" data-action="add" data-list="${addAction.list}">+ ${addAction.label}</button>` : ''}
      </div>
      ${body}
    </div>`;
}

// ── Render ────────────────────────────────────────────────────
function renderSkills(skills) {
  if (skills && typeof skills === 'object' && !Array.isArray(skills)) {
    return `<div class="re-grid">${Object.keys(skills).map(key =>
      textarea(`skills.${key}`, skillLabel(key), skills[key], { kind: 'csv', rows: 2 })).join('')}</div>`;
  }
  return `<div class="re-grid">${textarea('skills', 'Skills', skills || [], { kind: 'csv', rows: 4, help: 'Separate skills with commas.' })}</div>`;
}

function renderExperience(list) {
  if (!list.length) return '<div class="re-help">No roles yet. Add your most recent role first.</div>';
  return list.map((exp, i) => `
    <div class="re-item">
      <div class="re-item-head">
        <div class="re-item-title">${esc(exp.title || 'New role')}${exp.company ? ` — ${esc(exp.company)}` : ''}</div>
        ${itemControls('experience', i, list.length, 'role')}
      </div>
      <div class="re-grid">
        ${input(`experience.${i}.title`, 'Job title', exp.title)}
        ${input(`experience.${i}.company`, 'Company', exp.company)}
        ${input(`experience.${i}.via`, 'Via (agency / contractor)', exp.via, { placeholder: 'Optional' })}
        ${input(`experience.${i}.location`, 'Location', exp.location)}
        ${input(`experience.${i}.startDate`, 'Start', exp.startDate, { placeholder: 'e.g., 2019-03' })}
        ${input(`experience.${i}.endDate`, 'End', exp.endDate, { placeholder: 'e.g., 2023-06 or present' })}
        ${input(`experience.${i}.teamSize`, 'Team size', exp.teamSize, { placeholder: 'Optional, e.g., 10+' })}
        ${input(`experience.${i}.duration`, 'Duration label', exp.duration, { placeholder: 'Optional, e.g., 7+ years' })}
        ${textarea(`experience.${i}.highlights`, 'Accomplishments (one bullet per line)', exp.highlights || [], { kind: 'lines', rows: 6, help: 'Start with a strong verb and include numbers where you can (e.g., "Cut deploy time by 80%").' })}
        ${textarea(`experience.${i}.techStack`, 'Tech stack', exp.techStack || [], { kind: 'csv', rows: 2, help: 'Separate with commas.' })}
      </div>
    </div>`).join('');
}

function renderEducation(list) {
  if (!list.length) return '<div class="re-help">No education listed.</div>';
  return list.map((edu, i) => `
    <div class="re-item">
      <div class="re-item-head">
        <div class="re-item-title">${esc(edu.degree || 'New entry')}</div>
        ${itemControls('education', i, list.length, 'education entry')}
      </div>
      <div class="re-grid">
        ${input(`education.${i}.degree`, 'Degree / program', edu.degree)}
        ${input(`education.${i}.school`, 'School', edu.school || edu.institution)}
        ${input(`education.${i}.location`, 'Location', edu.location)}
        ${input(`education.${i}.year`, 'Year', edu.year, { placeholder: 'Optional' })}
      </div>
    </div>`).join('');
}

function renderCertifications(list) {
  if (!list.length) return '<div class="re-help">No certifications listed.</div>';
  return list.map((cert, i) => {
    const c = typeof cert === 'string' ? { name: cert } : cert;
    return `
      <div class="re-item">
        <div class="re-item-head">
          <div class="re-item-title">${esc(c.name || 'New certification')}</div>
          ${itemControls('certifications', i, list.length, 'certification')}
        </div>
        <div class="re-grid">
          ${input(`certifications.${i}.name`, 'Certification', c.name)}
          <div>
            <label class="field-label" for="re-cert-status-${i}">Status</label>
            <select id="re-cert-status-${i}" class="select w-full" data-path="certifications.${i}.status">
              ${['active', 'in-progress', 'expired'].map(s => `<option value="${s}" ${s === (c.status || 'active') ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>`;
  }).join('');
}

function render() {
  const root = document.getElementById('resume-tab-content');
  if (!root || !draft) return;
  const contact = draft.contact || {};
  const meta = draft.meta || {};

  root.innerHTML = `
    <div id="resume-editor">
      <div class="re-savebar">
        <div>
          <div class="re-savebar-title">✏️ Edit Resume</div>
          <div class="re-help" id="re-status">${dirty ? '● Unsaved changes' : 'All changes saved'}</div>
        </div>
        <div class="flex gap-8" style="flex-wrap:wrap;">
          ${isOwner() ? '<button class="btn btn-ghost btn-sm" data-action="restore" title="Load the original resume from the site data">↺ Restore original</button>' : ''}
          <button class="btn btn-ghost btn-sm" data-action="discard">Discard</button>
          <button class="btn btn-gold btn-sm" data-action="save">💾 Save changes</button>
        </div>
      </div>

      ${section('Header & Contact', `
        <div class="re-grid">
          ${input('contact.name', 'Full name *', contact.name)}
          ${input('meta.targetTitle', 'Headline / target title', meta.targetTitle, { placeholder: 'e.g., DevOps Lead | Platform Engineer' })}
          ${input('contact.location', 'Location', contact.location, { placeholder: 'e.g., Charlotte, NC (Remote)' })}
          ${input('contact.phone', 'Phone', contact.phone)}
          ${input('contact.email', 'Email', contact.email, { type: 'email' })}
          ${input('contact.linkedin', 'LinkedIn URL', contact.linkedin, { type: 'url' })}
          ${input('contact.github', 'GitHub URL', contact.github, { type: 'url' })}
        </div>`)}

      ${section('Professional Summary', `
        <div class="re-grid">${textarea('summary', 'Summary', draft.summary, { rows: 5, help: '3–4 sentences: who you are, years of experience, top skills, and the impact you deliver.' })}</div>`)}

      ${section('Skills', renderSkills(draft.skills))}
      ${section('Professional Experience', renderExperience(draft.experience || []), { list: 'experience', label: 'Add role' })}
      ${section('Education', renderEducation(draft.education || []), { list: 'education', label: 'Add education' })}
      ${section('Certifications', renderCertifications(draft.certifications || []), { list: 'certifications', label: 'Add certification' })}
      ${section('Key Accomplishments', `
        <div class="re-grid">${textarea('accomplishments', 'Accomplishments (one per line)', draft.accomplishments || [], { kind: 'lines', rows: 5 })}</div>`)}

      <div class="flex gap-8 mb-24" style="justify-content:flex-end;">
        <button class="btn btn-ghost" data-action="discard">Discard</button>
        <button class="btn btn-gold" data-action="save">💾 Save changes</button>
      </div>
    </div>`;

  const editor = document.getElementById('resume-editor');
  editor.addEventListener('input', onInput);
  editor.addEventListener('change', onInput);
  editor.addEventListener('click', onClick);
}

function markDirty() {
  dirty = true;
  const status = document.getElementById('re-status');
  if (status) status.textContent = '● Unsaved changes';
}

// ── Events ────────────────────────────────────────────────────
function onInput(event) {
  const el = event.target;
  if (!el.dataset.path) return;
  setPath(draft, el.dataset.path, parseValue(el));
  markDirty();
}

const NEW_ITEMS = {
  experience: () => ({ id: `exp-${Date.now()}`, title: '', company: '', location: '', startDate: '', endDate: 'present', highlights: [], techStack: [] }),
  education: () => ({ degree: '', school: '', location: '' }),
  certifications: () => ({ name: '', status: 'active' }),
};

async function onClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const { action, list } = el.dataset;
  const index = Number(el.dataset.index);

  if (action === 'add') {
    draft[list] = Array.isArray(draft[list]) ? draft[list] : [];
    // New roles go first (most recent); other lists append.
    if (list === 'experience') draft[list].unshift(NEW_ITEMS[list]());
    else draft[list].push(NEW_ITEMS[list]());
    dirty = true;
    render();
  } else if (action === 'remove') {
    if (!confirm('Remove this entry?')) return;
    draft[list].splice(index, 1);
    dirty = true;
    render();
  } else if (action === 'move') {
    const to = index + Number(el.dataset.dir);
    const items = draft[list];
    if (to < 0 || to >= items.length) return;
    [items[index], items[to]] = [items[to], items[index]];
    dirty = true;
    render();
  } else if (action === 'discard') {
    if (dirty && !confirm('Discard your unsaved changes?')) return;
    dirty = false;
    onDone?.();
  } else if (action === 'restore') {
    if (!confirm('Replace the editor contents with the original resume? Nothing is saved until you click Save.')) return;
    try {
      draft = clone(await fetch('./data/resume.json').then(r => r.json()));
      dirty = true;
      render();
    } catch {
      window.toast?.('Could not load the original resume', 'red');
    }
  } else if (action === 'save') {
    await save();
  }
}

// ── Save ──────────────────────────────────────────────────────
function cleanDraft(profile) {
  const out = clone(profile);
  out.experience = (out.experience || []).filter(e => e.title || e.company || (e.highlights || []).length);
  out.education = (out.education || []).filter(e => e.degree || e.school);
  out.certifications = (out.certifications || []).filter(c => (typeof c === 'string' ? c : c.name));
  out.meta = { ...(out.meta || {}), lastUpdated: new Date().toISOString().slice(0, 10), editedInStudio: true };
  return out;
}

async function save() {
  if (!draft.contact?.name?.trim()) {
    window.toast?.('Full name is required', 'red');
    document.getElementById('re-contact-name')?.focus();
    return;
  }

  const profile = cleanDraft(draft);
  const buttons = document.querySelectorAll('#resume-editor [data-action="save"]');
  buttons.forEach(b => { b.disabled = true; b.textContent = 'Saving…'; });

  const emailKey = (getCurrentUser()?.email || profile.contact?.email || '').toLowerCase();
  try {
    localStorage.setItem('careerEngine_active_profile', JSON.stringify(profile));
    if (emailKey) localStorage.setItem(`careerEngine_profile_${emailKey}`, JSON.stringify(profile));
  } catch {}
  if (window._state) window._state.resumeData = profile;

  let synced = false;
  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profile }),
    });
    synced = res.ok;
  } catch {}

  dirty = false;
  window.updateSidebarMetrics?.();
  window.toast?.(synced ? 'Resume saved' : 'Saved on this device — cloud sync failed, try saving again later', synced ? 'green' : 'gold');
  onDone?.();
}

// ── Entry Point ───────────────────────────────────────────────
/**
 * Render the editor into #resume-tab-content.
 * @param {Function} done Called after save or discard (e.g. to return to the preview tab).
 */
export function renderResumeEditor(done) {
  onDone = done;
  draft = clone(window._state?.resumeData);
  draft.contact = draft.contact || {};
  draft.meta = draft.meta || {};
  dirty = false;
  render();
}

export function hasUnsavedResumeChanges() {
  return dirty;
}