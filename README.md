# 🚀 Joseph Erexson III — Personal AI Career Engine

[![CI Pipeline](https://github.com/CipherPole/career-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/CipherPole/career-engine/actions/workflows/ci.yml)
[![Paranoid Security Audit](https://github.com/CipherPole/career-engine/actions/workflows/security-audit.yml/badge.svg)](https://github.com/CipherPole/career-engine/actions/workflows/security-audit.yml)

> **Target:** DevOps Lead / Platform Engineering / $200k+ | 100% Remote  
> **GitHub:** [@CipherPole](https://github.com/CipherPole)  
> **LinkedIn:** [joseph-erexson-iii-46bb6285](https://www.linkedin.com/in/joseph-erexson-iii-46bb6285/)  

---

## Engineering Workflow And Agent Guide

- Agent operating guide: [AGENTS.md](AGENTS.md)
- End-to-end workflow runbook: [docs/ENGINEERING_WORKFLOW.md](docs/ENGINEERING_WORKFLOW.md)
- Security policy: [docs/CODE_REVIEW_SECURITY_POLICY.md](docs/CODE_REVIEW_SECURITY_POLICY.md)
- UI standards: [docs/UI_PROGRAMMING_STANDARDS.md](docs/UI_PROGRAMMING_STANDARDS.md)
- Implementation coaching playbook: [docs/IMPLEMENTATION_PLAYBOOK.md](docs/IMPLEMENTATION_PLAYBOOK.md)

Use these documents as the source of truth for commit, review, CI checks, preview validation, production release, and rollback.

---

## Antigravity Implementation Learning

This project now includes an in-app Growth page called **Implementation Lab** for improving implementation prompts and setup quality.

- Use it to rate how well a request was framed before or after a build session.
- Compare an original prompt against an improved, more implementation-ready version.
- Capture project-specific lessons so future agent sessions start from verified patterns instead of guesswork.

---

## ⚡ Opening Locally (No Server Required)

1. Open **File Explorer** → navigate to `e:\resume\`
2. Double-click `index.html` — opens in your default browser
3. That's it. No install, no server, no dependencies.

> **Tip:** For the best experience, open in **Chrome** or **Edge** (not Firefox — ES modules need a server or Chrome/Edge).

---

## 🖨️ Printing Your Clean Resume PDF

1. Click **Resume Studio** in the sidebar
2. Click **"Print / Export PDF"** button (or open `pages/resume.html` directly)
3. `Ctrl + P` → **Save as PDF** → ensure "Background graphics" is **OFF**
4. This gives you a 100% ATS-safe, properly encoded PDF with your real name, AWS/GCP skills, and team size clearly parsed.

---

## 📁 Project Structure

```
e:\resume\
├── index.html              ← Main career engine app
├── vercel.json             ← Vercel deployment config
├── .gitignore              ← Git rules
├── README.md               ← This file
│
├── data/
│   ├── resume.json         ← Structured resume (edit here to update all views)
│   ├── skills.json         ← Skills inventory + $200k gap ratings
│   ├── projects.json       ← Portfolio projects
│   └── jobs.json           ← Application tracker seed (live data in localStorage)
│
├── docs/
│   ├── RESUME_MASTER.md    ← Canonical Markdown resume
│   ├── LINKEDIN_STRATEGY.md← Optimized LinkedIn copy blocks
│   ├── SKILLS_ROADMAP.md   ← $200k+ gap analysis & learning paths
│   ├── PROJECTS_DEEPDIVE.md← Technical deep-dives on your projects
│   └── INTERVIEW_PLAYBOOK.md← STAR-format interview scripts
│
├── scripts/
│   ├── app.js              ← Core router & state
│   ├── resume-engine.js    ← Dashboard, Resume Studio, Skill Gap
│   ├── linkedin-engine.js  ← LinkedIn optimizer & copy blocks
│   ├── tracker-engine.js   ← Job boards & application pipeline
│   └── project-showcase.js ← Project cards & GitHub API
│
├── styles/
│   └── main.css            ← Dark/gold executive design system
│
├── pages/
│   ├── resume.html         ← Clean, ATS-safe printable resume
│   └── portfolio.html      ← Public-facing Vercel portfolio
│
└── assets/
    ├── JosephErexsonResume2024.pdf   ← Original (reference only — has encoding bug)
    └── JosephErexsonResume2024.txt   ← Original text extraction
```

---

## ✏️ Updating Your Resume

All content is driven by `data/resume.json`. To update:

1. Open `data/resume.json` in any text editor
2. Edit your experience, skills, accomplishments, or contact info
3. Save → refresh `index.html` — all views update automatically

---

## 🌐 Deploying to Vercel (Free)

### Prerequisites
- [Vercel account](https://vercel.com) — you already have one ✅
- Git repository on GitHub — push this folder as a new repo

### Steps

```bash
# 1. Initialize git (run in e:\resume)
git init
git add .
git commit -m "Initial Career Engine"

# 2. Create a new GitHub repo named 'career-engine' (private)
# Then connect:
git remote add origin https://github.com/CipherPole/career-engine.git
git push -u origin main
```

Then in Vercel:
1. Click **"Add New Project"**
2. Import `career-engine` from GitHub
3. Leave all settings default (it's a static site)
4. Click **Deploy** → live at `career-engine.vercel.app` in ~60 seconds

To use a custom domain later:
- Settings → Domains → Add `josepherexson.dev` (if purchased)

---

## 🔗 Key Resources

| Resource | Link |
|----------|------|
| LinkedIn Profile | [linkedin.com/in/joseph-erexson-iii-46bb6285](https://www.linkedin.com/in/joseph-erexson-iii-46bb6285/) |
| LinkedIn Certifications | [View Certifications](https://www.linkedin.com/in/joseph-erexson-iii-46bb6285/details/certifications/) |
| GitHub | [github.com/CipherPole](https://github.com/CipherPole) |
| AWS SAA-C03 (Priority Cert) | [aws.amazon.com/certification](https://aws.amazon.com/certification/certified-solutions-architect-associate/) |
| Terraform Associate Cert | [hashicorp.com/certification](https://www.hashicorp.com/certification/terraform-associate) |
| CKA Certification | [cncf.io/certification/cka](https://www.cncf.io/certification/cka/) |
| Levels.fyi (Comp Data) | [levels.fyi](https://www.levels.fyi/jobs?jobId=&country=254&title=devops) |

---

## 📊 Current Status

| Metric | Current | Target |
|--------|---------|--------|
| Compensation | ~$145k | $200k+ |
| ATS Score | ~71/100 | 88+ |
| LinkedIn Score | ~40% | 90%+ |
| Certifications | 2 (Kaseya, CW) | Add AWS SAA-C03 |
| GitHub Public Repos | 0 | 3+ |

---

*Built with 💛 by Joseph's Personal AI Career Engine*
