'use strict';

/* ============================================================
   AI provider adapters for bring-your-own-key (BYOK) requests.
   Each provider can: list models (validates the key) and run a
   structured-JSON request. Keys are never logged or returned.
   ============================================================ */

const TIMEOUT_MS = 55000;

const PROVIDERS = {
  anthropic: {
    label: 'Anthropic (Claude)',
    keyHint: /^sk-ant-/,
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    preferModel: [/haiku/i, /sonnet/i],
  },
  openai: {
    label: 'OpenAI (GPT)',
    keyHint: /^sk-/,
    consoleUrl: 'https://platform.openai.com/api-keys',
    preferModel: [/luna/i, /nano/i, /mini/i],
  },
  google: {
    label: 'Google (Gemini)',
    keyHint: /^AIza/,
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    preferModel: [/flash-lite/i, /flash/i],
  },
  gateway: {
    label: 'Vercel AI Gateway',
    keyHint: /^vck_/,
    consoleUrl: 'https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys',
    preferModel: [/^anthropic\/claude-haiku/i, /^google\/gemini.*flash/i, /^openai\/gpt.*(luna|mini|nano)/i],
  },
};

class ProviderError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.kind = kind; // 'auth' | 'quota' | 'rate' | 'model' | 'bad_output' | 'unavailable'
    this.status = status;
  }
}

async function request(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    throw new ProviderError('unavailable', error.name === 'AbortError' ? 'The AI provider took too long to respond.' : 'Could not reach the AI provider.');
  } finally {
    clearTimeout(timer);
  }
}

async function failFrom(res, provider) {
  const text = await res.text().catch(() => '');
  const label = PROVIDERS[provider].label;
  console.error(`ai provider ${provider} error`, res.status, text.slice(0, 300));
  if (res.status === 401 || res.status === 403) return new ProviderError('auth', `Your ${label} key was rejected. Check it in AI Providers.`, res.status);
  if (res.status === 402 || /insufficient_quota|credit|billing|budget/i.test(text)) return new ProviderError('quota', `Your ${label} account is out of credits or over its limit.`, res.status);
  if (res.status === 429) return new ProviderError('rate', `${label} is rate-limiting requests. Wait a moment and try again.`, res.status);
  if (res.status === 404 || /model/i.test(text) && res.status === 400) return new ProviderError('model', `The selected ${label} model isn't available on your account. Pick another model in AI Providers.`, res.status);
  return new ProviderError('unavailable', `${label} returned an error (${res.status}). Try again.`, res.status);
}

// ── Model listing (doubles as key validation) ────────────────
async function listModels(provider, apiKey) {
  let res;
  let ids = [];
  if (provider === 'anthropic') {
    res = await request('https://api.anthropic.com/v1/models?limit=100', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });
    if (!res.ok) throw await failFrom(res, provider);
    ids = ((await res.json()).data || []).map(m => m.id);
  } else if (provider === 'openai') {
    res = await request('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw await failFrom(res, provider);
    ids = ((await res.json()).data || []).map(m => m.id)
      .filter(id => /^(gpt|o\d)/.test(id) && !/audio|realtime|image|tts|transcribe|search|embedding|instruct/.test(id));
  } else if (provider === 'google') {
    res = await request('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': apiKey } });
    if (!res.ok) throw await failFrom(res, provider);
    ids = ((await res.json()).models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => String(m.name).replace(/^models\//, ''))
      .filter(id => /^gemini/.test(id) && !/image|tts|embedding|live|audio/.test(id));
  } else if (provider === 'gateway') {
    // The catalog is public, so validate the key with a 1-token request (fractions of a cent on the user's account).
    res = await request('https://ai-gateway.vercel.sh/v1/models', {});
    if (!res.ok) throw await failFrom(res, provider);
    ids = ((await res.json()).data || []).filter(m => (m.type || 'language') === 'language' && (m.tags || []).includes('structured-output')).map(m => m.id);
    const ping = await request('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-haiku-5.5', max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }),
    });
    if (!ping.ok) throw await failFrom(ping, provider);
  } else {
    throw new ProviderError('unavailable', 'Unknown AI provider.');
  }
  return [...new Set(ids)].sort().reverse().slice(0, 150);
}

function pickDefaultModel(provider, models) {
  for (const pattern of PROVIDERS[provider].preferModel) {
    const match = models.find(m => pattern.test(m) && !/preview|exp|latest|batch/i.test(m));
    if (match) return match;
  }
  return models[0] || '';
}

// ── Structured generation ─────────────────────────────────────
function parseJson(text, provider) {
  try {
    return JSON.parse(String(text || '').replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new ProviderError('bad_output', `${PROVIDERS[provider].label} returned an unexpected response. Try again.`);
  }
}

async function generateJson({ provider, apiKey, model, system, user, schema, schemaName }) {
  if (provider === 'anthropic') {
    const res = await request('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system,
        tools: [{ name: schemaName, description: 'Record the extracted result.', input_schema: schema }],
        tool_choice: { type: 'tool', name: schemaName },
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw await failFrom(res, provider);
    const data = await res.json();
    const tool = (data.content || []).find(b => b.type === 'tool_use');
    if (!tool?.input) throw new ProviderError('bad_output', 'Claude returned an unexpected response. Try again.');
    return { result: tool.input, model: data.model || model };
  }

  if (provider === 'google') {
    const call = generationConfig => request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4000, temperature: 0, ...generationConfig },
      }),
    });
    let res = await call({ responseJsonSchema: schema });
    // Some Gemini models reject full JSON Schema; fall back to JSON mode guided by the prompt.
    if (res.status === 400) res = await call({});
    if (!res.ok) throw await failFrom(res, provider);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    return { result: parseJson(text, provider), model };
  }

  // OpenAI and Vercel AI Gateway share the Chat Completions shape.
  const url = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://ai-gateway.vercel.sh/v1/chat/completions';
  const body = {
    model,
    response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  };
  if (provider === 'openai') body.max_completion_tokens = 6000; // newer OpenAI models reject max_tokens/temperature
  else { body.max_tokens = 4000; body.temperature = 0; }
  const res = await request(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failFrom(res, provider);
  const data = await res.json();
  return { result: parseJson(data?.choices?.[0]?.message?.content, provider), model: data.model || model };
}

module.exports = { PROVIDERS, ProviderError, listModels, pickDefaultModel, generateJson };