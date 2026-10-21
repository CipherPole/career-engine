/* ============================================================
   AI-PROVIDERS-ENGINE.JS — Settings → AI Providers (BYOK)
   Pick the AI that powers job analysis: the free built-in AI
   or your own Anthropic / OpenAI / Google / AI Gateway key.
   ============================================================ */

'use strict';

import { getCurrentUser } from './auth-engine.js?v=8';

let settings = null;
let busy = false;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function api(method, body) {
  const res = await fetch('/api/ai-providers', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function renderAiProviders() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">🤖 AI Providers</div>
      <div class="page-subtitle">Choose which AI powers job analysis: the free built-in AI, or your own provider key</div>
    </div>
    <div id="aip-root"><div class="card"><div class="job-muted">Loading your AI settings…</div></div></div>
  `;
  const root = document.getElementById('aip-root');
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  try {
    settings = await api('GET');
    render();
  } catch (error) {
    root.innerHTML = `<div class="card"><div class="job-muted">Could not load AI settings: ${esc(error.message)}</div>
      <button class="btn btn-ghost btn-sm mt-16" data-action="reload">Try again</button></div>`;
  }
}

function render() {
  const root = document.getElementById('aip-root');
  if (!root || !settings) return;
  const isAdmin = getCurrentUser()?.role === 'admin';
  const configured = settings.providers.filter(p => p.configured);
  const options = [
    { id: 'platform', label: 'Career Engine AI (built-in)', detail: `Free · ${isAdmin ? 100 : 25} analyses per day` },
    ...configured.map(p => ({ id: p.id, label: p.label, detail: `Your key •••• ${p.last4} · ${p.model}` })),
  ];

  root.innerHTML = `
    <div class="card mb-16">
      <div class="card-title"><span class="dot"></span>Active AI for job analysis</div>
      <div class="aip-options" role="radiogroup" aria-label="Active AI provider">
        ${options.map(o => `
          <label class="aip-option ${settings.preferred === o.id ? 'active' : ''}">
            <input type="radio" name="aip-preferred" value="${esc(o.id)}" data-pref ${settings.preferred === o.id ? 'checked' : ''} ${busy ? 'disabled' : ''}>
            <span>
              <span class="aip-option-label">${esc(o.label)}</span>
              <span class="job-muted">${esc(o.detail)}</span>
            </span>
          </label>`).join('')}
      </div>
      <div class="job-muted mt-16">🔒 Keys are checked with the provider, encrypted before they're stored, never shown again, and only used for your own requests. The provider bills you directly for usage on your key.</div>
    </div>

    <div class="grid-2">
      ${settings.providers.map(renderProvider).join('')}
    </div>
  `;
}

function renderProvider(p) {
  return `
    <div class="card aip-provider">
      <div class="aip-provider-head">
        <div class="card-title" style="margin-bottom:0;"><span class="dot"></span>${esc(p.label)}</div>
        ${p.configured ? `<span class="chip green">Connected •••• ${esc(p.last4)}</span>` : '<span class="chip">Not connected</span>'}
      </div>
      ${p.configured ? `
        <div class="mt-16">
          <label class="field-label" for="aip-model-${esc(p.id)}">Model</label>
          <select id="aip-model-${esc(p.id)}" class="select w-full" data-model="${esc(p.id)}" ${busy ? 'disabled' : ''}>
            ${p.models.map(m => `<option value="${esc(m)}" ${m === p.model ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
        </div>` : ''}
      <div class="mt-16">
        <label class="field-label" for="aip-key-${esc(p.id)}">${p.configured ? 'Replace key' : 'API key'}</label>
        <input id="aip-key-${esc(p.id)}" class="field" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your ${esc(p.label)} API key">
      </div>
      <div class="flex gap-8 mt-16 items-center" style="flex-wrap:wrap;">
        <button class="btn btn-gold btn-sm" data-action="save" data-provider="${esc(p.id)}" ${busy ? 'disabled' : ''}>${p.configured ? 'Replace & verify' : 'Save & verify'}</button>
        ${p.configured ? `<button class="btn btn-ghost btn-sm" data-action="remove" data-provider="${esc(p.id)}" ${busy ? 'disabled' : ''}>Remove</button>` : ''}
        <a class="btn btn-ghost btn-sm" href="${esc(p.consoleUrl)}" target="_blank" rel="noopener noreferrer">Get a key ↗</a>
      </div>
    </div>`;
}

async function run(task, success) {
  if (busy) return;
  busy = true;
  render();
  try {
    settings = await task();
    if (success) window.toast?.(success, 'green');
  } catch (error) {
    window.toast?.(esc(error.message), 'red');
  } finally {
    busy = false;
    render();
  }
}

function onClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const provider = el.dataset.provider;
  if (el.dataset.action === 'reload') {
    renderAiProviders();
  } else if (el.dataset.action === 'save') {
    const input = document.getElementById(`aip-key-${provider}`);
    const apiKey = input?.value?.trim() || '';
    if (!apiKey) { window.toast?.('Paste an API key first', 'red'); return; }
    if (input) input.value = '';
    run(() => api('POST', { action: 'save', provider, apiKey }), 'Key verified and saved — it is now your active AI');
  } else if (el.dataset.action === 'remove') {
    if (!confirm('Remove this API key? Job analysis will switch back to the built-in AI.')) return;
    run(() => api('POST', { action: 'remove', provider }), 'Key removed');
  }
}

function onChange(event) {
  const el = event.target;
  if (el.dataset.pref !== undefined) {
    run(() => api('POST', { action: 'preferred', provider: el.value }), 'Active AI updated');
  } else if (el.dataset.model) {
    run(() => api('POST', { action: 'model', provider: el.dataset.model, model: el.value }), 'Model updated');
  }
}