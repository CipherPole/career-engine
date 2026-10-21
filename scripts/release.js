#!/usr/bin/env node
/* ============================================================
   RELEASE.JS — Guided Branch → PR → Preview → Production Flow
   Usage:
     npm run release:start -- feature/my-change   Create a branch from latest main
     npm run release:ship  -- "feat: message"     Checks, commit, push, PR, wait for preview
     npm run release:prod                         Merge PR, wait for Vercel prod, smoke test
     npm run release:status                       Show branch, PR, and deploy status
   Add --yes to skip confirmation prompts.
   ============================================================ */

'use strict';

const { spawnSync } = require('child_process');
const readline = require('readline');

const PROD_URL = 'https://career-engine-five.vercel.app';
const BRANCH_PATTERN = /^(feature|hotfix|fix|docs|chore)\/[a-z0-9][a-z0-9._-]*$/;
const COMMIT_PATTERN = /^(feat|fix|docs|chore|refactor|style|test|perf|ci)(\([\w-]+\))?!?: .+/;
const DEPLOY_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 10 * 1000;

const args = process.argv.slice(2);
const command = args[0];
const yes = args.includes('--yes');
const positional = args.slice(1).filter(a => a !== '--yes');

// ── Helpers ───────────────────────────────────────────────────
function step(msg) { console.log(`\n▶ ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`\n🛑 ${msg}`); process.exit(1); }

function run(cmd, cmdArgs, { capture = false, allowFail = false } = {}) {
  // npm is a .cmd shim on Windows and needs a shell (only fixed args are passed); git/gh run without one so arguments are never shell-parsed.
  const opts = { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' };
  const res = cmd === 'npm'
    ? spawnSync(`npm ${cmdArgs.join(' ')}`, { ...opts, shell: true })
    : spawnSync(cmd, cmdArgs, opts);
  if (res.error) fail(`Could not run ${cmd}: ${res.error.message}`);
  if (res.status !== 0 && !allowFail) {
    if (capture) console.error((res.stderr || res.stdout || '').trim());
    fail(`${cmd} ${cmdArgs.join(' ')} failed (exit ${res.status}).`);
  }
  return { status: res.status, out: (res.stdout || '').trim() };
}

const git = (a, o) => run('git', a, o);
const gh = (a, o) => run('gh', a, o);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function currentBranch() { return git(['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).out; }
function workingTree() { return git(['status', '--porcelain'], { capture: true }).out; }

async function confirm(question) {
  if (yes) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(r => rl.question(`\n❓ ${question} (y/N) `, r));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function requireGh() {
  if (run('gh', ['auth', 'status'], { capture: true, allowFail: true }).status !== 0) {
    fail('GitHub CLI is not signed in. Run: gh auth login');
  }
}

function runChecks() {
  step('Running security scan (npm test)');
  run('npm', ['test']);
  ok('Security scan passed');
  step('Running dependency audit (npm audit)');
  run('npm', ['audit']);
  ok('Dependency audit passed');
}

function findPr(branch) {
  const res = gh(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,url,title'], { capture: true });
  const list = JSON.parse(res.out || '[]');
  return list[0] || null;
}

function previewUrl(prNumber) {
  const res = gh(['pr', 'view', String(prNumber), '--json', 'comments', '--jq', '.comments[].body'], { capture: true, allowFail: true });
  const match = (res.out || '').match(/https:\/\/[^\s)\]]*\.vercel\.app/);
  return match ? match[0] : '';
}

function repoSlug() {
  return gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { capture: true }).out;
}

async function waitForChecks(prNumber) {
  // Right after a push GitHub may not have registered the new runs yet, so `gh pr checks --watch`
  // can exit early. Only a check that actually reports `fail` counts as a failure.
  const started = Date.now();
  await sleep(POLL_MS);
  while (Date.now() - started < DEPLOY_TIMEOUT_MS) {
    const watch = gh(['pr', 'checks', String(prNumber), '--watch', '--interval', '15'], { allowFail: true });
    if (watch.status === 0) return;
    const snapshot = gh(['pr', 'checks', String(prNumber)], { capture: true, allowFail: true });
    if (snapshot.status === 0) return;
    if (/	fail	/.test(snapshot.out)) {
      console.log(snapshot.out);
      fail(`Checks failed on PR #${prNumber}. Fix, then rerun release:ship.`);
    }
    await sleep(POLL_MS);
  }
  fail('Timed out waiting for checks. Run npm run release:status to see where they are.');
}

async function waitForVercel(sha) {
  const repo = repoSlug();
  const started = Date.now();
  process.stdout.write('  ⏳ Waiting for Vercel production deploy');
  while (Date.now() - started < DEPLOY_TIMEOUT_MS) {
    const res = gh(['api', `repos/${repo}/commits/${sha}/status`, '--jq', '.statuses[] | select(.context == "Vercel") | "\\(.state) \\(.target_url)"'], { capture: true, allowFail: true });
    const [state, url] = (res.out.split('\n')[0] || '').split(' ');
    if (state === 'success') { console.log(''); ok(`Vercel production deploy succeeded ${url || ''}`); return; }
    if (state === 'failure' || state === 'error') { console.log(''); fail(`Vercel deploy ${state}. Inspect: ${url}`); }
    process.stdout.write('.');
    await sleep(POLL_MS);
  }
  console.log('');
  fail('Timed out waiting for Vercel. Check the Vercel dashboard.');
}

async function smokeTest() {
  step(`Smoke testing ${PROD_URL}`);
  const checks = [
    ['/', 'Home page'],
    ['/api/auth-config', 'Auth config API'],
    ['/scripts/tracker-engine.js', 'App scripts served'],
  ];
  let passed = true;
  for (const [path, label] of checks) {
    try {
      const res = await fetch(`${PROD_URL}${path}`, { redirect: 'follow' });
      if (res.ok) ok(`${label} — ${res.status}`);
      else { passed = false; console.error(`  ❌ ${label} — HTTP ${res.status}`); }
    } catch (err) {
      passed = false;
      console.error(`  ❌ ${label} — ${err.message}`);
    }
  }
  if (!passed) fail('Production smoke test failed. Consider rolling back in the Vercel dashboard (Instant Rollback).');
}

function printChecklist() {
  console.log(`
📋 Manual release verification (AGENTS.md):
  1. Sign in with a non-admin Google account
  2. Create or update profile
  3. Refresh and verify persistence
  4. Sign out and sign back in
  5. Verify jobs, training, and cert progress persist
  6. Verify admin account still resolves to admin role
  Then record the release in docs/SESSION_CHANGELOG.md.`);
}

// ── Commands ──────────────────────────────────────────────────
async function start() {
  const branch = positional[0];
  if (!branch || !BRANCH_PATTERN.test(branch)) {
    fail('Usage: npm run release:start -- feature/short-name  (prefix: feature/, hotfix/, fix/, docs/, chore/)');
  }
  const dirty = workingTree();
  if (dirty && currentBranch() !== 'main') {
    fail('You have uncommitted changes on another branch. Ship or stash them first.');
  }
  step('Updating main from GitHub');
  git(['fetch', 'origin']);
  if (currentBranch() !== 'main') git(['checkout', 'main']);
  git(['merge', '--ff-only', 'origin/main']);
  step(`Creating branch ${branch}`);
  git(['checkout', '-b', branch]);
  ok(`On ${branch}${dirty ? ' (your uncommitted changes came with you)' : ''}. Make your changes, then run: npm run release:ship -- "feat: what changed"`);
}

async function ship() {
  requireGh();
  const message = positional[0];
  if (!message || !COMMIT_PATTERN.test(message)) {
    fail('Usage: npm run release:ship -- "feat: short description"  (types: feat, fix, docs, chore, refactor, style, test, perf, ci)');
  }
  const branch = currentBranch();
  if (branch === 'main') fail('You are on main. Start a branch first: npm run release:start -- feature/short-name');

  runChecks();

  const dirty = workingTree();
  if (dirty) {
    step('Changes to commit');
    console.log(dirty.split('\n').map(l => `    ${l}`).join('\n'));
    if (!(await confirm('Commit all of these files?'))) fail('Cancelled. Stage files manually with git add, or update .gitignore.');
    git(['add', '-A']);
    git(['commit', '-m', message]);
    ok('Committed');
  } else {
    ok('No new changes to commit — pushing existing commits');
  }

  step(`Pushing ${branch}`);
  git(['push', '-u', 'origin', branch]);

  let pr = findPr(branch);
  if (!pr) {
    step('Opening pull request into main');
    const body = [
      '## Summary', message, '',
      '## Validation', '- `npm test`: pass', '- `npm audit`: pass', '',
      '## Preview checklist',
      '- [ ] Sign in on the Vercel preview',
      '- [ ] Changed pages load and work',
      '- [ ] Refresh and confirm data persists',
      '- [ ] Check mobile width',
    ].join('\n');
    gh(['pr', 'create', '--base', 'main', '--head', branch, '--title', message, '--body', body]);
    pr = findPr(branch);
  }
  if (!pr) fail('Could not find the pull request after creating it.');
  ok(`PR #${pr.number}: ${pr.url}`);

  step('Waiting for GitHub Actions and Vercel preview');
  await waitForChecks(pr.number);
  ok('All checks passed');

  const preview = previewUrl(pr.number);
  console.log(`\n🔍 Preview: ${preview || '(see the Vercel comment on the PR)'}`);
  console.log('   Preview uses the dev database (career_engine_dev). Test it, then run: npm run release:prod');
}

async function prod() {
  requireGh();
  const branch = currentBranch();
  const pr = positional[0] ? { number: positional[0] } : findPr(branch);
  if (!pr) fail(`No open PR for ${branch}. Pass a PR number: npm run release:prod -- 12`);
  if (workingTree()) fail('You have uncommitted changes. Ship them first so production matches the PR.');

  step(`Checking PR #${pr.number} status`);
  if (gh(['pr', 'checks', String(pr.number)], { allowFail: true }).status !== 0) {
    fail('Checks are not all green. Wait for them or fix failures before merging.');
  }
  ok('All checks green');

  if (!(await confirm(`Have you tested the preview? Merge PR #${pr.number} into main and deploy to production?`))) {
    fail('Cancelled. Nothing was merged.');
  }

  step(`Merging PR #${pr.number}`);
  gh(['pr', 'merge', String(pr.number), '--merge', '--delete-branch']);
  git(['checkout', 'main']);
  git(['fetch', 'origin']);
  git(['merge', '--ff-only', 'origin/main']);
  const sha = git(['rev-parse', 'HEAD'], { capture: true }).out;
  ok(`main is now at ${sha.slice(0, 7)}`);

  step('Deploying to production');
  await waitForVercel(sha);
  await smokeTest();

  console.log(`\n🚀 Released to ${PROD_URL}`);
  printChecklist();
}

async function status() {
  const branch = currentBranch();
  console.log(`Branch: ${branch}`);
  const dirty = workingTree();
  console.log(`Working tree: ${dirty ? `${dirty.split('\n').length} uncommitted change(s)` : 'clean'}`);
  if (branch !== 'main') {
    const ahead = git(['rev-list', '--count', `origin/main..${branch}`], { capture: true, allowFail: true }).out;
    console.log(`Commits not in main: ${ahead || '?'}`);
    requireGh();
    const pr = findPr(branch);
    console.log(pr ? `PR #${pr.number}: ${pr.url}` : 'PR: none yet (run release:ship)');
    if (pr) {
      gh(['pr', 'checks', String(pr.number)], { allowFail: true });
      const preview = previewUrl(pr.number);
      if (preview) console.log(`Preview: ${preview}`);
    }
  }
  console.log(`Production: ${PROD_URL}`);
}

const COMMANDS = { start, ship, prod, status };
if (!COMMANDS[command]) {
  console.log('Usage: node scripts/release.js <start|ship|prod|status> [args] [--yes]');
  process.exit(command ? 1 : 0);
}
COMMANDS[command]().catch(err => fail(err.message));