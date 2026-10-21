# AI Learning Notes — Career Engine

Plain-English notes on the AI concepts used in this project, with pointers to where each one lives in the code. Written so you can learn from the project while you build it.

---

## 1. Calling an AI model from your own app

A **model** (Claude, GPT, Gemini) is reached over HTTPS: your server sends a request with instructions and text, and gets text back. Three things always go in the request:

- **The model ID** — which model to run, e.g. `anthropic/claude-haiku-5.5`.
- **A system prompt** — standing instructions ("you extract job postings… never invent a salary").
- **The user message** — the actual input (the pasted job page plus a short profile).

The call is made from a **server function** (`api/job-analyze.js`), never from the browser, so credentials stay secret and you can enforce limits.

**Where:** `api/job-analyze.js` → `SYSTEM_PROMPT`, `userContent`, the `fetch` to AI Gateway.

---

## 2. Structured output (getting JSON, not prose)

Models normally reply in free text. For an app you want **predictable fields** — company, title, salary, a list of gaps. You get that by sending a **JSON Schema** with the request and asking the model to follow it strictly.

- OpenAI-style APIs and AI Gateway: `response_format: { type: 'json_schema', json_schema: { strict: true, schema } }`
- Anthropic: define a **tool** whose `input_schema` is your schema and force the model to call it (`tool_choice`).
- Gemini: `responseMimeType: 'application/json'` plus `responseJsonSchema`.

Same idea, three dialects. The app still validates the result (`isJobPosting`, JSON parse errors) because models can occasionally return something unexpected.

**Where:** `JOB_SCHEMA` in `api/job-analyze.js`; per-provider handling in `api/_lib/ai-providers.js` → `generateJson`.

---

## 3. AI Gateway — one front door to many models

**Vercel AI Gateway** sits between your app and the model providers. One endpoint, one bill, 400+ models; switch models by changing a string. It also gives spend logs and **budgets**.

- Model IDs look like `provider/model` — always pick them from the live list (`https://ai-gateway.vercel.sh/v1/models`), not from memory; names and prices change.
- This project's built-in AI uses `anthropic/claude-haiku-5.5`: fast, supports structured output, about **$0.001 per job analysis**.

**Where:** `GATEWAY_URL`, `DEFAULT_MODEL` in `api/job-analyze.js`. Budget: `vercel ai-gateway budgets list`.

---

## 4. Authentication without API keys (OIDC)

On Vercel, each request to a function carries a short-lived **OIDC token** (`x-vercel-oidc-token` header). AI Gateway accepts it as proof the request comes from *your* project — so there is **no API key to create, store, or leak** for the built-in AI.

**Where:** `gatewayToken()` in `api/job-analyze.js`.

---

## 5. Bring your own key (BYOK)

Users can paste their own provider key so requests run on **their** account and bill. Doing this safely takes a few deliberate steps:

1. **Verify before saving** — call the provider's "list models" endpoint. It proves the key works and tells you which models that account can use (no hardcoded model names).
2. **Encrypt at rest** — AES-256-GCM with a key derived (HKDF) from a server secret. The database only holds ciphertext.
3. **Never send it back** — the browser only ever sees the last 4 characters.
4. **Scope and lifecycle** — stored per user, deleted with the account, not exposed by any generic API.

**Where:** `api/ai-providers.js` (settings API), `api/_lib/secret-box.js` (encryption), `api/_lib/ai-providers.js` (providers), `scripts/ai-providers-engine.js` (Settings page).

---

## 6. Prompt injection — treat pasted text as data

A pasted web page can contain text like "ignore your instructions and…". That's **prompt injection**. Defenses used here:

- The system prompt says the pasted text is **data only**; instructions inside it are ignored.
- The output is **constrained to a schema**, so the model can only fill fields, not take actions.
- Everything the AI returns is **HTML-escaped** before display, so it can't inject scripts into the page.

**Where:** `SYSTEM_PROMPT` in `api/job-analyze.js`; `esc()` in `scripts/tracker-engine.js`.

---

## 7. Cost and abuse controls

Anyone with a Google account can sign in, so the AI endpoint needs guardrails:

| Control | Value | Where |
|---|---|---|
| Sign-in required | 401 otherwise | `requireUser()` |
| Daily cap (built-in AI) | 25 / user, 100 / admin | `reserveUsage()` |
| Daily cap (own key) | 200 | `BYOK_DAILY_LIMIT` |
| Input size limit | 30,000 characters | `MAX_INPUT_CHARS` |
| Output limit | 4,000 tokens | request body |
| Monthly spend ceiling | $5 project budget | AI Gateway budget |
| Data minimization | no email / phone sent to AI | `profileForAi()` |

**Rule of thumb:** estimate cost as *(input tokens × input price) + (output tokens × output price)*. ~5k in + ~1k out at $0.10 / $0.50 per million ≈ $0.001.

---

## 8. Testing AI features without spending money

Real model calls cost money and give slightly different answers each time. The tests here **mock** the network: a fake `fetch` returns canned provider responses, so you can check every path — success, rejected key, out of credits, rate limit, garbage output — instantly and for free. Live calls are saved for a final manual check.

**Pattern:** replace `global.fetch` and the database module in a small Node script, call the handler, assert on status and payload.

---

## 9. Where AI frameworks fit (LangChain and friends)

**LangChain** (and the Vercel **AI SDK**) are *client libraries* — they make it easier to call models, chain steps, use tools, and build agents. They are **not** model providers: you still need Anthropic, OpenAI, Google, or AI Gateway behind them, with a key or token.

For one structured request per action (this project), plain `fetch` is simpler and has zero dependencies. A framework starts paying off when you build **multi-step agents**, tool calling loops, retrieval (RAG), or streaming chat UIs.

---

## 10. Working with an AI coding agent (what this project shows)

- **Give the goal, not just the task** — "help me decide if a job is a good fit" led to research links, a scorecard, and outcome tracking, not just a form.
- **Keep a repeatable release path** — `npm run release:start / ship / prod` means every change gets the same checks, preview, and production verification.
- **Write things down** — `docs/SESSION_CHANGELOG.md`, `AGENTS.md`, and the skills in `.agents/skills/` let the next session (human or AI) pick up without guesswork.
- **Read the real error** — today's "Resource provisioning failed" was really "Neon branch limit reached". Logs and the actual message beat guessing.
- **Approve outward actions deliberately** — merges, production deploys, deletions, and spend limits were confirmed before they happened.

---

## Glossary

| Term | Meaning |
|---|---|
| **Token** | A chunk of text (~¾ of a word) — the unit models read, write, and bill by |
| **Context window** | How much text a model can read in one request |
| **System prompt** | Standing instructions that shape every reply |
| **Structured output** | Forcing replies to match a JSON Schema |
| **AI Gateway** | One API in front of many model providers, with billing and budgets |
| **OIDC token** | Short-lived identity token Vercel gives your functions — no stored key needed |
| **BYOK** | Bring Your Own Key — users supply their own provider API key |
| **Prompt injection** | Malicious instructions hidden in input text |
| **Mocking** | Replacing a real service with a fake one in tests |