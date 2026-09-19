/* ============================================================
   PROJECT-SHOWCASE.JS — Portfolio & GitHub Integration
   ============================================================ */

'use strict';

const GITHUB_USER = 'CipherPole';
const GITHUB_API  = `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=12&type=public`;

export async function renderProjects() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">🚀 Project Showcase</div>
      <div class="page-subtitle">Your portfolio — Unity Recovery, Mythralis, Robotics & Game Dev. GitHub integration ready for when repos go public.</div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" id="tab-featured" onclick="switchProjectTab('featured')">⭐ Featured Projects</button>
      <button class="tab-btn" id="tab-github" onclick="switchProjectTab('github')">💻 GitHub Repos</button>
      <button class="tab-btn" id="tab-portfolio" onclick="switchProjectTab('portfolio')">🌐 Portfolio Preview</button>
    </div>
    <div id="project-tab-content"></div>
  `;
  switchProjectTab('featured');
}

window.switchProjectTab = async function(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  const tc = document.getElementById('project-tab-content');
  if (tab === 'featured')   tc.innerHTML = await renderFeatured();
  else if (tab === 'github') await renderGitHub(tc);
  else if (tab === 'portfolio') tc.innerHTML = renderPortfolioPreview();
};

async function renderFeatured() {
  let projects = [];
  try {
    const res = await fetch('./data/projects.json');
    projects = await res.json();
  } catch { projects = []; }

  return `
    <div class="grid-2 gap-20">
      ${projects.map(p => projectCardHTML(p)).join('')}
    </div>

    <div class="mt-24">
      <div class="action-card">
        <div class="priority-label">💡 Portfolio Tip</div>
        <div class="priority-title">Make GitHub Repos Public to Unlock Live Integration</div>
        <div class="priority-desc">
          Once you make a repository public on <strong style="color:var(--gold);">github.com/CipherPole</strong>, the GitHub tab will automatically pull in live data — repo description, language breakdown, star count, and last commit date. No configuration needed.
          <br><br>
          <strong style="color:var(--text-primary);">Suggested repos to make public first:</strong> A Terraform module, a Playwright test framework, or your robotics automation scripts — these directly showcase your confirmed $200k+ skills.
        </div>
        <div class="flex gap-8 mt-16">
          <a href="https://github.com/CipherPole" target="_blank" class="btn btn-gold btn-sm">Open github.com/CipherPole →</a>
          <button class="btn btn-ghost btn-sm" onclick="switchProjectTab('github')">Check Live Repos →</button>
        </div>
      </div>
    </div>`;
}

function projectCardHTML(p) {
  const techBadges = (p.techStack || []).slice(0, 5)
    .map(t => `<span class="chip text-xs">${t}</span>`).join('');

  return `
    <div class="project-card" style="--accent:${p.color};">
      <div class="project-icon">${p.icon}</div>
      <div class="flex items-center gap-8 mb-8">
        <div class="project-name">${p.name}</div>
        <span class="chip ${p.status === 'live' ? 'green' : p.status === 'active' ? 'gold' : 'blue'}">${p.statusLabel}</span>
      </div>
      <div class="project-tagline">${p.tagline}</div>
      <div class="project-tech">${techBadges}</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;">${p.description}</div>
      <div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-dim);margin-bottom:8px;">Key Highlights</div>
        ${(p.highlights || []).map(h => `<div style="font-size:12px;color:var(--text-secondary);padding:3px 0;">• ${h}</div>`).join('')}
      </div>
      <div class="flex gap-8">
        ${p.github ? `<a href="${p.github}" target="_blank" class="btn btn-outline btn-sm">💻 GitHub →</a>` : `<span class="btn btn-ghost btn-sm" style="opacity:0.5;cursor:default;">💻 Private</span>`}
        ${p.demo ? `<a href="${p.demo}" target="_blank" class="btn btn-gold btn-sm">🚀 Live Demo →</a>` : ''}
      </div>
    </div>`;
}

async function renderGitHub(container) {
  container.innerHTML = `
    <div class="card mb-16" style="text-align:center;padding:32px;">
      <div class="animate-pulse" style="font-size:32px;margin-bottom:12px;">⏳</div>
      <div style="font-size:13px;color:var(--text-secondary);">Checking github.com/CipherPole for public repositories...</div>
    </div>`;

  try {
    const res = await fetch(GITHUB_API);
    if (!res.ok) throw new Error(`GitHub API status: ${res.status}`);
    const repos = await res.json();

    if (!repos || repos.length === 0) {
      container.innerHTML = noPublicReposHTML();
      return;
    }

    const repoCards = repos.map(r => `
      <div class="card">
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">
          <a href="${r.html_url}" target="_blank" style="color:var(--text-primary);">${r.name}</a>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">${r.description || 'No description'}</div>
        <div class="flex gap-8 items-center" style="flex-wrap:wrap;">
          ${r.language ? `<span class="chip blue">${r.language}</span>` : ''}
          <span class="chip">⭐ ${r.stargazers_count}</span>
          <span class="chip">🍴 ${r.forks_count}</span>
          <span class="chip text-xs">${new Date(r.updated_at).toLocaleDateString()}</span>
        </div>
        <div class="mt-8">
          <a href="${r.html_url}" target="_blank" class="btn btn-outline btn-sm">View Repo →</a>
        </div>
      </div>`).join('');

    container.innerHTML = `
      <div class="flex justify-between items-center mb-16">
        <div class="section-title" style="margin:0;">💻 github.com/CipherPole — Live Public Repos</div>
        <a href="https://github.com/CipherPole" target="_blank" class="btn btn-outline btn-sm">View All on GitHub →</a>
      </div>
      <div class="grid-3 gap-16">${repoCards}</div>`;

  } catch (err) {
    if (err.message.includes('403') || err.message.includes('429')) {
      container.innerHTML = `<div class="card"><div style="color:var(--gold);">⚠️ GitHub API rate limit hit. Wait a few minutes and try again.</div></div>`;
    } else {
      container.innerHTML = noPublicReposHTML();
    }
  }
}

function noPublicReposHTML() {
  return `
    <div class="empty-state">
      <div class="empty-icon">💻</div>
      <div class="empty-title">No Public Repos Found on @CipherPole</div>
      <div class="empty-desc">
        Your GitHub profile currently has no public repositories. Once you make a repo public, it will automatically appear here with live data.<br><br>
        <strong style="color:var(--gold);">Recommended first public repos:</strong><br>
        • A Terraform module (shows IaC expertise)<br>
        • A Playwright test framework (shows QA automation)<br>
        • Robotics/Arduino automation scripts (unique differentiator)<br>
        • A Docker/Kubernetes demo project
      </div>
      <div class="flex gap-8 mt-16">
        <a href="https://github.com/CipherPole" target="_blank" class="btn btn-gold">Open GitHub Profile →</a>
      </div>
    </div>`;
}

function renderPortfolioPreview() {
  return `
    <div class="card mb-16 gold-border">
      <div style="font-size:14px;font-weight:700;color:var(--gold);margin-bottom:8px;">🌐 This is a preview of your public Vercel portfolio page</div>
      <div style="font-size:13px;color:var(--text-secondary);">When deployed to Vercel, this will be live at <strong>josepherexson.vercel.app</strong> — visible to recruiters, hiring managers, and AI crawlers 24/7.</div>
      <div class="flex gap-8 mt-12">
        <a href="./pages/portfolio.html" target="_blank" class="btn btn-gold btn-sm">Open Full Portfolio Page →</a>
        <span class="chip green">✅ Vercel-Ready</span>
      </div>
    </div>

    <div style="border:2px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;">
      <div style="background:var(--bg-panel);padding:12px 16px;border-bottom:1px solid var(--border);display:flex;gap:6px;align-items:center;">
        <div style="width:12px;height:12px;border-radius:50%;background:var(--red);"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:var(--gold);"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:var(--green);"></div>
        <div style="flex:1;background:var(--bg-card);border-radius:4px;padding:4px 12px;margin-left:8px;font-size:11px;color:var(--text-dim);font-family:monospace;">josepherexson.vercel.app</div>
      </div>
      <iframe src="./pages/portfolio.html" style="width:100%;height:600px;border:none;background:#fff;" title="Portfolio Preview"></iframe>
    </div>`;
}
