---
name: ai-features
description: >-
  How Career Engine's AI features work and how to change them safely: AI job intake (api/job-analyze.js),
  bring-your-own-key AI Providers (api/ai-providers.js), provider adapters, key encryption, cost caps, and
  the mocked test pattern. Use when editing AI prompts, schemas, models, providers, limits, or budgets, or
  when debugging AI analysis errors.
---

# Career Engine AI Features

## Architecture
```
Job Tracker "Paste & analyze" ──POST /api/job-analyze──┐
                                                        ├─ user has active BYOK provider? ── yes → api/_lib/ai-providers.js generateJson()
Settings → 🤖 AI Providers ──GET/POST /api/ai-providers─┘                                   (Anthropic tool-use | OpenAI/Gateway json_schema | Gemini responseJsonSchema)
                                                        └─ no → Vercel AI Gateway (OIDC token, anthropic/claude-haiku-5.5)
```
- `api/job-analyze.js` — system prompt, `JOB_SCHEMA` (strict JSON), profile minimization (`profileContext`), daily caps (`reserveUsage`: `ai_usage` 25 user / 100 admin; `ai_usage_byok` 200), BYOK routing (`userProvider`). `meta.provider` reports `platform` or the provider id.
- `api/ai-providers.js` — `save` (verifies key via provider model list, seals it, picks default model, makes it active), `model`, `preferred` (`platform` or provider), `remove`. Stored in `user_states.ai_providers`; never returns key material (last 4 only).
- `api/_lib/ai-providers.js` — `PROVIDERS` registry, `listModels` (doubles as key validation), `pickDefaultModel` (preference regexes, not hardcoded IDs), `generateJson`, `ProviderError` kinds: auth, quota, rate, model, bad_output, unavailable.
- `api/_lib/secret-box.js` — AES-256-GCM; key = HKDF(`AI_KEYS_SECRET` || `SESSION_SECRET`). Rotation makes stored keys unreadable → user is told to re-add.
- Client: `scripts/tracker-engine.js` (`aiAnalyzeJob`, `renderAiReview`, outcome panel `setStage`), `scripts/ai-providers-engine.js` (route `#ai`), profile popup button in `scripts/auth-engine.js`.

## Rules
1. **Model IDs come from live sources.** Built-in default: check `curl -fsSL https://ai-gateway.vercel.sh/v1/models` before changing `DEFAULT_MODEL`. BYOK models come from each provider's model list at save time — do not hardcode.
2. **Keep the schema strict and in sync.** Changing `JOB_SCHEMA` means updating `required`, the client mapping in `aiAnalyzeJob`, and `renderAiReview`.
3. **Pasted text is untrusted data.** Keep the prompt-injection line in `SYSTEM_PROMPT`; keep all AI output HTML-escaped (`esc`).
4. **Never log or return keys.** Errors log status + a truncated provider message only.
5. **Data minimization.** `profileForAi()` sends target title, work preference, comp target, summary, skills, recent role titles/companies — no email, phone, or address.
6. **Spend changes are user decisions.** Caps live in code; the $5/month budget is `vercel ai-gateway budgets set project career-engine --limit <n> --refresh-period monthly` — only with the user's approval.
7. **Hobby function limit is 12.** Count `api/*.js` (excluding `_lib`) before adding endpoints; prefer `action` parameters on an existing endpoint.

## Adding a provider
1. Add an entry to `PROVIDERS` (label, consoleUrl, preferModel regexes).
2. Implement its branch in `listModels` (validate key + list text models) and `generateJson` (structured output).
3. Map its error statuses in `failFrom` if they differ.
4. Add a mocked case to the BYOK test and run all suites.

## Testing (no live spend)
Mock `api/_lib/db.js` and `api/_lib/session.js` through `require.cache`, replace `global.fetch` with canned provider responses, then call the handler with a fake `res`. Cover: signed-out 401, short paste 400, valid path, rejected key, quota, rate limit, bad output, non-job 422, caps, platform vs BYOK routing, key never in responses/storage. UI modules are tested by stubbing `document`/`window` and the `#job-root` / `#aip-root` delegated handlers.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| "out of credits or over budget" | AI Gateway credits or the $5 budget — check `vercel ai-gateway budgets list` and the AI Gateway dashboard |
| "AI analysis is not configured" | No OIDC token / key on that runtime (e.g. local server) — expected locally; test on a preview |
| "Your … key was rejected" | User key invalid/revoked — re-add in AI Providers |
| "can no longer be read" | `SESSION_SECRET` / `AI_KEYS_SECRET` rotated — user re-adds key |
| "Daily … limit reached" | Cap hit; BYOK users have a separate 200/day cap |