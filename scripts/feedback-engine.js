/* ============================================================
   FEEDBACK-ENGINE.JS — Assistant Chatbot & Issue Intelligence
   ============================================================ */

'use strict';

import { getActiveSession } from './auth-engine.js?v=8';
import { logEvent, LOG_LEVELS, LOG_CATEGORIES } from './telemetry-engine.js?v=8';

const LOCAL_FEEDBACK_KEY = 'careerEngine_local_feedback_v1';

// Predefined AI Assistant Knowledge Base for Fast FAQ Matching
const FAQ_KNOWLEDGE_BASE = [
  {
    triggers: ['ats', 'score', 'resume', 'format', 'parsing'],
    response: `🎯 **ATS Resume Scoring:** Career Engine evaluates your resume across keyword density, executive summary impact, quantifiable achievements, and modern ATS parseability. You can optimize sections in real-time under **Resume Studio**!`
  },
  {
    triggers: ['skill', 'gap', 'radar', 'benchmark', 'competency'],
    response: `🧠 **Skill Gap Engine:** Our radar chart compares your current proficiency against market demand for Lead Platform, Staff SRE, and Cloud Architect roles. Head over to **Skill Gap Engine** to identify high-value competencies to acquire next.`
  },
  {
    triggers: ['job', 'tracker', 'application', 'crm', 'pipeline'],
    response: `💼 **Job Application CRM:** Track your full hiring pipeline from Wishlist to Applied, Technical Screen, and Offer. All application data is stored with zero-broker privacy right in your isolated session!`
  },
  {
    triggers: ['privacy', 'broker', 'security', 'data', 'safe'],
    response: `🔒 **Zero-Broker Privacy Guarantee:** Career Engine never sells, shares, or monetizes candidate telemetry. Your resume data stays under your direct control, with Google OIDC zero-trust session authentication.`
  },
  {
    triggers: ['roadmap', 'features', 'version', 'future', 'changelog'],
    response: `🚀 **Strategic Roadmap:** You can view audited release milestones (v1.0 - v2.8) and strategic backlogs inside the Administrator Console (#settings) or our repo documentation in docs/ROADMAP.md.`
  },
  {
    triggers: ['cert', 'certification', 'exam', 'aws', 'kubernetes', 'cka'],
    response: `📜 **Certifications Hub:** Track your credentials (AWS Solutions Architect, CKA, GCP, etc.) and calculate your career credential index under **Certifications**.`
  },
  {
    triggers: ['training', 'project', 'lab', 'portfolio', 'practice'],
    response: `🛠️ **Training & Architecture Hub:** Build real-world portfolio projects (e.g., Kubernetes GitOps, Multi-Region Terraform, Microservices Telemetry) with structured milestones in the **Training** tab.`
  },
  {
    triggers: ['bug', 'issue', 'broken', 'error', 'wrong', 'problem', 'fail'],
    response: `🐛 **Found an issue?** We're right on it! You can click the **Report Issue** tab at the top of this window to submit a direct ticket to our engineering team. We'll generate an AI work prompt to resolve it promptly!`
  },
  {
    triggers: ['feedback', 'suggest', 'suggestion', 'idea', 'feature request'],
    response: `💡 **Have an idea or feature suggestion?** We love candidate feedback! Switch over to the **Report Issue / Feedback** tab above, and your suggestion will be sent straight to the admin intelligence dashboard.`
  }
];

// Helper: match query against FAQ triggers
function getAssistantReply(query) {
  const normalized = (query || '').toLowerCase();
  for (const item of FAQ_KNOWLEDGE_BASE) {
    if (item.triggers.some(t => normalized.includes(t))) {
      return item.response;
    }
  }
  return `🤖 I'm here to help with questions about ATS scoring, skill radar, jobs tracking, certifications, and reporting platform issues. Would you like to report a bug or suggest a feature? Click the **Report / Feedback** tab above!`;
}

// ── Submit Feedback to API with Local Fallback ───────────────────
export async function submitFeedback({ type = 'feedback', subject, message, userName = '', userEmail = '' }) {
  const session = getActiveSession();
  const effectiveUser = session?.user || {};
  const finalName = userName.trim() || effectiveUser.name || 'Candidate';
  const finalEmail = userEmail.trim() || effectiveUser.email || 'guest@candidate.local';

  const payload = {
    type,
    subject: subject.trim(),
    message: message.trim(),
    userName: finalName,
    userEmail: finalEmail,
  };

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      logEvent(LOG_LEVELS.INFO, LOG_CATEGORIES.GENERAL, `FEEDBACK_SUBMITTED -> #${data.id || 'ok'}`, { type, subject });
      return { ok: true, id: data.id || 'FB-' + Date.now().toString().slice(-4), feedback: data.feedback };
    }
  } catch (err) {
    console.warn('API feedback submission offline, saving to local store', err);
  }

  // Graceful Offline / Local Fallback
  const localList = getLocalFeedbackList();
  const fakeId = Date.now();
  const localItem = {
    id: fakeId,
    type,
    subject: payload.subject,
    message: payload.message,
    user_name: finalName,
    user_email: finalEmail,
    status: 'open',
    ai_prompt: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localList.unshift(localItem);
  saveLocalFeedbackList(localList);

  logEvent(LOG_LEVELS.INFO, LOG_CATEGORIES.GENERAL, `FEEDBACK_SAVED_LOCALLY -> #${fakeId}`, { type, subject });
  return { ok: true, id: fakeId, feedback: localItem };
}

function getLocalFeedbackList() {
  try {
    const raw = localStorage.getItem(LOCAL_FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFeedbackList(list) {
  try {
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(list));
  } catch {}
}

// ── Admin Feedback Fetch & Update API ────────────────────────────
export async function fetchAdminFeedback(limit = 100) {
  try {
    const res = await fetch(`/api/admin-feedback?limit=${limit}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.feedback)) {
        return data.feedback;
      }
    }
  } catch (err) {
    console.warn('fetchAdminFeedback error, using fallback', err);
  }

  // Merge server with local storage fallback if needed
  return getLocalFeedbackList();
}

export async function updateAdminFeedbackStatus(id, { status, aiPrompt }) {
  try {
    const res = await fetch('/api/admin-feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status, aiPrompt }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.feedback;
    }
  } catch (err) {
    console.warn('updateAdminFeedbackStatus API offline, updating local cache', err);
  }

  // Update in local fallback list
  const list = getLocalFeedbackList();
  const item = list.find(f => String(f.id) === String(id));
  if (item) {
    if (status) item.status = status;
    if (aiPrompt !== undefined) item.ai_prompt = aiPrompt;
    item.updated_at = new Date().toISOString();
    saveLocalFeedbackList(list);
    return item;
  }
  return null;
}

// ── AI Coding Agent Prompt Generator ─────────────────────────────
export function generateAgentWorkPrompt(item) {
  const typeTitles = {
    bug: 'BUG FIX & REMEDIATION',
    suggestion: 'FEATURE SPECIFICATION & ENHANCEMENT',
    question: 'TECHNICAL INVESTIGATION & SUPPORT',
    feedback: 'USER EXPERIENCE & FEEDBACK REVIEW',
  };

  const title = typeTitles[item.type] || 'ENGINEERING WORK ITEM';
  const createdDate = item.created_at ? new Date(item.created_at).toLocaleString() : new Date().toLocaleString();

  return `# Career Engine — Engineering Work Order

**Ticket ID:** #${item.id}
**Category:** ${item.type.toUpperCase()} — ${title}
**Status:** In Progress → Reported
**Submitted At:** ${createdDate}
**Reporter:** ${item.user_name || 'Candidate'} (${item.user_email || 'guest@local'})

---

### 📌 Summary of Reported Item
**Subject:** ${item.subject}
**User Feedback / Reproduction Details:**
> ${item.message.replace(/\n/g, '\n> ')}

---

### 🔍 Architectural Context & Touchpoints
- **Application:** Career Engine v2.8.0 (Vanilla JS SPA + Vercel Serverless + Neon Postgres)
- **Live Production URL:** https://career-engine-five.vercel.app
- **Related Engine Modules:**
  - UI & Routing: \`scripts/app.js\`, \`index.html\`, \`styles/main.css\`
  - Auth & Admin: \`scripts/auth-engine.js\`, \`api/_lib/db.js\`, \`api/_lib/session.js\`
  - Feedback Subsystem: \`scripts/feedback-engine.js\`, \`api/feedback.js\`, \`api/admin-feedback.js\`
  - Career Features: \`scripts/resume-engine.js\`, \`scripts/tracker-engine.js\`, \`scripts/training-engine.js\`
- **Reference Standards:**
  - UI Quality Guidelines: \`docs/UI_PROGRAMMING_STANDARDS.md\`
  - Architecture Guide: \`docs/MODULE_GUIDE.md\`
  - Session & Operating Rules: \`AGENTS.md\`

---

### 📋 Action Plan for Agent
1. **Analyze & Reproduce:** Inspect the active codebase to trace the behavior reported above.
2. **Implement Fix/Feature:** Apply clean, zero-dependency Vanilla JS edits conforming to existing design tokens.
3. **Run Pre-Commit Verification:**
   - \`npm test\` (Zero-vulnerability security & hygiene scanner)
   - \`npm audit\`
4. **Git Branch & Release Flow:**
   - Work on feature/hotfix branch.
   - Commit with clear message: \`fix: resolve #${item.id} - ${item.subject.slice(0, 40)}\`
   - Create PR into \`main\` and verify Vercel preview.
5. **Mark Ticket:** Once deployed to production, update ticket status in Admin Console to **Completed**.
`;
}

// ── Chatbot UI Component Mount & Logic ───────────────────────────
export function initFeedbackChatbot() {
  if (document.getElementById('ce-chat-trigger')) return;

  // 1. Create floating launcher trigger button
  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'ce-chat-trigger';
  triggerBtn.className = 'chat-launcher-btn';
  triggerBtn.setAttribute('aria-label', 'Open Career Engine Assistant and Feedback');
  triggerBtn.title = 'Career Engine Assistant & Feedback';
  triggerBtn.innerHTML = `
    <span>💬</span>
    <span class="chat-launcher-badge"></span>
  `;

  // 2. Create floating chat widget container
  const widget = document.createElement('div');
  widget.id = 'ce-chat-widget';
  widget.className = 'chat-widget-panel chat-hidden';
  widget.innerHTML = `
    <!-- Header -->
    <div class="chat-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#d97706);display:flex;align-items:center;justify-content:center;font-size:16px;color:#000;font-weight:800;">
          ✨
        </div>
        <div>
          <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;color:var(--text-primary);">
            Career Engine Assistant
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);" title="Online"></span>
          </div>
          <div style="font-size:10px;color:var(--text-secondary);">Ask questions or submit feedback to engineers</div>
        </div>
      </div>
      <button id="ce-chat-close" style="background:transparent;border:none;color:var(--text-dim);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;">✕</button>
    </div>

    <!-- Tabs -->
    <div class="chat-nav-tabs">
      <div class="chat-nav-tab active" id="tab-btn-assistant" data-target="chat-pane-assistant">
        🤖 Ask Assistant
      </div>
      <div class="chat-nav-tab" id="tab-btn-report" data-target="chat-pane-report">
        📝 Report / Feedback
      </div>
    </div>

    <!-- Pane 1: Assistant Chat & FAQ -->
    <div id="chat-pane-assistant" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
      <div class="chat-messages" id="ce-chat-messages">
        <div class="chat-bubble bot">
          👋 <strong>Hi there!</strong> I'm your Career Engine Assistant. Ask me anything about our platform, ATS resume scoring, skill radar, or submit feedback to our team!
          <div class="chat-quick-chips">
            <span class="chat-chip" data-q="How does ATS resume scoring work?">🎯 ATS Scoring</span>
            <span class="chat-chip" data-q="How does the Skill Gap radar work?">🧠 Skill Gap Radar</span>
            <span class="chat-chip" data-q="How do I track job applications?">💼 Job Tracker CRM</span>
            <span class="chat-chip" data-q="Is my candidate data private?">🔒 Privacy & Security</span>
            <span class="chat-chip" data-q="I found a bug to report">🐛 Report Bug</span>
          </div>
        </div>
      </div>

      <div class="chat-input-row">
        <input type="text" id="ce-chat-input" placeholder="Ask a question or type 'bug'..." />
        <button class="btn btn-gold btn-sm" id="ce-chat-send" style="padding:7px 12px;font-weight:700;">
          Send
        </button>
      </div>
    </div>

    <!-- Pane 2: Submit Feedback & Issue -->
    <div id="chat-pane-report" style="display:none;flex-direction:column;flex:1;overflow-y:auto;padding:16px;gap:12px;">
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.4;">
        Submit a bug report, suggestion, or question. All items flow directly to the Administrator Console for AI analysis and engineering resolution.
      </div>

      <!-- Category Selector -->
      <div>
        <label style="font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:700;display:block;margin-bottom:6px;">Category</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;" id="feedback-type-group">
          <button type="button" class="feedback-type-btn active" data-type="bug">🐛 Bug</button>
          <button type="button" class="feedback-type-btn" data-type="suggestion">💡 Suggestion</button>
          <button type="button" class="feedback-type-btn" data-type="question">❓ Question</button>
          <button type="button" class="feedback-type-btn" data-type="feedback">💬 Feedback</button>
        </div>
      </div>

      <!-- Submitter info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:700;display:block;margin-bottom:4px;">Your Name</label>
          <input type="text" id="fb-input-name" class="input" style="font-size:11px;padding:6px 10px;width:100%;" placeholder="e.g. Alex Chen" />
        </div>
        <div>
          <label style="font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:700;display:block;margin-bottom:4px;">Email</label>
          <input type="email" id="fb-input-email" class="input" style="font-size:11px;padding:6px 10px;width:100%;" placeholder="alex@example.com" />
        </div>
      </div>

      <!-- Subject -->
      <div>
        <label style="font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:700;display:block;margin-bottom:4px;">Subject</label>
        <input type="text" id="fb-input-subject" class="input" style="font-size:11px;padding:7px 10px;width:100%;" placeholder="Brief summary of the issue or idea..." />
      </div>

      <!-- Details -->
      <div style="flex:1;display:flex;flex-direction:column;">
        <label style="font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:700;display:block;margin-bottom:4px;">Detailed Message</label>
        <textarea id="fb-input-message" class="input" style="font-size:11px;padding:8px 10px;width:100%;min-height:90px;resize:vertical;font-family:inherit;" placeholder="Describe what happened, what you expected, or your suggested enhancement..."></textarea>
      </div>

      <!-- Action Button -->
      <div>
        <button class="btn btn-gold w-full" id="fb-btn-submit" style="justify-content:center;padding:10px;font-weight:700;font-size:12px;">
          🚀 Submit to Engineering Team
        </button>
      </div>
      <div id="fb-submit-status" style="font-size:11px;text-align:center;min-height:16px;"></div>
    </div>
  `;

  document.body.appendChild(triggerBtn);
  document.body.appendChild(widget);

  // ── Event Handlers ──────────────────────────────────────────
  function toggleChat(forceOpen = null) {
    const isHidden = widget.classList.contains('chat-hidden');
    const shouldOpen = forceOpen !== null ? forceOpen : isHidden;
    if (shouldOpen) {
      widget.classList.remove('chat-hidden');
      // Autofill user details if logged in
      const session = getActiveSession();
      if (session?.user) {
        const nameEl = document.getElementById('fb-input-name');
        const emailEl = document.getElementById('fb-input-email');
        if (nameEl && !nameEl.value) nameEl.value = session.user.name || '';
        if (emailEl && !emailEl.value) emailEl.value = session.user.email || '';
      }
      setTimeout(() => document.getElementById('ce-chat-input')?.focus(), 200);
    } else {
      widget.classList.add('chat-hidden');
    }
  }

  triggerBtn.addEventListener('click', () => toggleChat());
  document.getElementById('ce-chat-close')?.addEventListener('click', () => toggleChat(false));

  // Tab switching
  const tabBtns = widget.querySelectorAll('.chat-nav-tab');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.dataset.target;
      const paneAssistant = document.getElementById('chat-pane-assistant');
      const paneReport = document.getElementById('chat-pane-report');
      if (targetId === 'chat-pane-assistant') {
        paneAssistant.style.display = 'flex';
        paneReport.style.display = 'none';
      } else {
        paneAssistant.style.display = 'none';
        paneReport.style.display = 'flex';
      }
    });
  });

  // Category Selector in Feedback form
  let selectedFeedbackType = 'bug';
  widget.querySelectorAll('.feedback-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      widget.querySelectorAll('.feedback-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFeedbackType = btn.dataset.type;
    });
  });

  // Assistant Question Answering
  function handleSendMessage(text) {
    const query = (text || document.getElementById('ce-chat-input')?.value || '').trim();
    if (!query) return;

    const input = document.getElementById('ce-chat-input');
    if (input) input.value = '';

    const messagesBox = document.getElementById('ce-chat-messages');
    if (!messagesBox) return;

    // Append user message
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.textContent = query;
    messagesBox.appendChild(userBubble);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    // If query is specifically about filing feedback/bug, offer switch
    const lower = query.toLowerCase();
    if (lower.includes('bug') || lower.includes('report') || lower.includes('issue') || lower.includes('feedback') || lower.includes('suggestion')) {
      setTimeout(() => {
        const botBubble = document.createElement('div');
        botBubble.className = 'chat-bubble bot';
        botBubble.innerHTML = `
          I can help you file that report! <br><br>
          <button class="btn btn-gold btn-sm" id="btn-quick-switch-report" style="font-size:11px;padding:5px 10px;margin-top:4px;">
            📝 Open Feedback Form
          </button>
        `;
        messagesBox.appendChild(botBubble);
        messagesBox.scrollTop = messagesBox.scrollHeight;

        document.getElementById('btn-quick-switch-report')?.addEventListener('click', () => {
          document.getElementById('tab-btn-report')?.click();
          const subjInput = document.getElementById('fb-input-subject');
          if (subjInput && !subjInput.value) subjInput.value = query;
        });
      }, 400);
      return;
    }

    // Default FAQ match
    setTimeout(() => {
      const reply = getAssistantReply(query);
      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble bot';
      // Format simple markdown bold
      botBubble.innerHTML = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      messagesBox.appendChild(botBubble);
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }, 450);
  }

  document.getElementById('ce-chat-send')?.addEventListener('click', () => handleSendMessage());
  document.getElementById('ce-chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  // Quick Chips
  widget.addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-chip')) {
      const q = e.target.dataset.q;
      if (q) handleSendMessage(q);
    }
  });

  // Submit Feedback Form
  const submitBtn = document.getElementById('fb-btn-submit');
  const statusEl = document.getElementById('fb-submit-status');

  submitBtn?.addEventListener('click', async () => {
    const subject = document.getElementById('fb-input-subject')?.value.trim();
    const message = document.getElementById('fb-input-message')?.value.trim();
    const userName = document.getElementById('fb-input-name')?.value.trim();
    const userEmail = document.getElementById('fb-input-email')?.value.trim();

    if (!subject) {
      if (statusEl) { statusEl.textContent = '⚠️ Please provide a subject.'; statusEl.style.color = 'var(--gold)'; }
      return;
    }
    if (!message) {
      if (statusEl) { statusEl.textContent = '⚠️ Please describe the message or issue.'; statusEl.style.color = 'var(--gold)'; }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Sending to Team...';
    if (statusEl) { statusEl.textContent = ''; }

    try {
      const result = await submitFeedback({
        type: selectedFeedbackType,
        subject,
        message,
        userName,
        userEmail,
      });

      if (result.ok) {
        if (statusEl) {
          statusEl.textContent = `✓ Feedback #${result.id} recorded! Thank you.`;
          statusEl.style.color = 'var(--green)';
        }

        // Reset form
        const subjInput = document.getElementById('fb-input-subject');
        const msgInput = document.getElementById('fb-input-message');
        if (subjInput) subjInput.value = '';
        if (msgInput) msgInput.value = '';

        // Switch to assistant chat with acknowledgement
        setTimeout(() => {
          document.getElementById('tab-btn-assistant')?.click();
          const messagesBox = document.getElementById('ce-chat-messages');
          if (messagesBox) {
            const confirmBubble = document.createElement('div');
            confirmBubble.className = 'chat-bubble bot';
            confirmBubble.innerHTML = `
              🎉 <strong>Report #${result.id} Received!</strong><br>
              Your ${selectedFeedbackType} has been dispatched to our engineering team. System administrators can analyze it with AI and assign it to an AI agent for rapid resolution!
            `;
            messagesBox.appendChild(confirmBubble);
            messagesBox.scrollTop = messagesBox.scrollHeight;
          }
        }, 1200);

        window.toast?.(`📬 Feedback #${result.id} submitted successfully!`, 'green');
      } else {
        if (statusEl) {
          statusEl.textContent = 'Failed to submit. Please try again.';
          statusEl.style.color = 'var(--red)';
        }
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = 'Error sending feedback.';
        statusEl.style.color = 'var(--red)';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚀 Submit to Engineering Team';
    }
  });
}
