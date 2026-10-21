'use strict';

/* ============================================================
   /api/ai-providers — per-user AI provider keys (BYOK)
   GET  → configured providers (never the key itself)
   POST { action: 'save' | 'model' | 'preferred' | 'remove', ... }
   Keys are validated with the provider, then stored encrypted
   in user_states under 'ai_providers' (not exposed by /api/state).
   ============================================================ */

const { getUserById, getUserStateByKey, upsertUserStateByKey } = require('./_lib/db');
const { getSessionFromRequest } = require('./_lib/session');
const { json, methodNotAllowed, readJsonBody } = require('./_lib/http');
const { seal } = require('./_lib/secret-box');
const { PROVIDERS, ProviderError, listModels, pickDefaultModel } = require('./_lib/ai-providers');

const STATE_KEY = 'ai_providers';
const PLATFORM = 'platform';

async function requireUser(req, res) {
  const session = getSessionFromRequest(req);
  const user = session?.uid ? await getUserById(session.uid) : null;
  if (!user) {
    json(res, 401, { ok: false, error: 'Sign in to manage AI providers.' });
    return null;
  }
  return user;
}

async function loadSettings(userId) {
  const s = (await getUserStateByKey(userId, STATE_KEY)) || {};
  return { preferred: s.preferred || PLATFORM, providers: s.providers && typeof s.providers === 'object' ? s.providers : {} };
}

/** Public view of the settings — key material is never included. */
function publicView(settings) {
  return {
    preferred: settings.preferred in settings.providers ? settings.preferred : PLATFORM,
    providers: Object.entries(PROVIDERS).map(([id, p]) => {
      const saved = settings.providers[id];
      return {
        id,
        label: p.label,
        consoleUrl: p.consoleUrl,
        configured: !!saved,
        last4: saved?.last4 || '',
        model: saved?.model || '',
        models: saved?.models || [],
        addedAt: saved?.addedAt || '',
      };
    }),
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const settings = await loadSettings(user.id);

    if (req.method === 'GET') return json(res, 200, { ok: true, ...publicView(settings) });

    const body = await readJsonBody(req);
    const action = String(body?.action || '');
    const provider = String(body?.provider || '');
    const known = Object.prototype.hasOwnProperty.call(PROVIDERS, provider);

    if (action === 'save') {
      if (!known) return json(res, 400, { ok: false, error: 'Unknown provider.' });
      const apiKey = String(body?.apiKey || '').trim();
      if (apiKey.length < 20 || apiKey.length > 300 || /\s/.test(apiKey)) {
        return json(res, 400, { ok: false, error: 'That does not look like a valid API key.' });
      }
      let models;
      try {
        models = await listModels(provider, apiKey);
      } catch (error) {
        const message = error instanceof ProviderError ? error.message : 'Could not verify the key. Try again.';
        return json(res, 400, { ok: false, error: message });
      }
      if (!models.length) return json(res, 400, { ok: false, error: 'The key works, but no compatible models are available on that account.' });

      settings.providers[provider] = {
        box: seal(apiKey),
        last4: apiKey.slice(-4),
        models,
        model: pickDefaultModel(provider, models),
        addedAt: new Date().toISOString(),
      };
      // A newly added key becomes the active provider.
      settings.preferred = provider;
    } else if (action === 'model') {
      const saved = known && settings.providers[provider];
      const model = String(body?.model || '');
      if (!saved || !saved.models.includes(model)) return json(res, 400, { ok: false, error: 'Pick a model from the list.' });
      saved.model = model;
    } else if (action === 'preferred') {
      if (provider !== PLATFORM && !(known && settings.providers[provider])) {
        return json(res, 400, { ok: false, error: 'Add a key for that provider first.' });
      }
      settings.preferred = provider;
    } else if (action === 'remove') {
      if (!known) return json(res, 400, { ok: false, error: 'Unknown provider.' });
      delete settings.providers[provider];
      if (settings.preferred === provider) settings.preferred = PLATFORM;
    } else {
      return json(res, 400, { ok: false, error: 'Unknown action.' });
    }

    await upsertUserStateByKey(user.id, STATE_KEY, settings);
    return json(res, 200, { ok: true, ...publicView(settings) });
  } catch (error) {
    console.error('ai-providers error', error);
    return json(res, 500, { ok: false, error: 'AI provider settings request failed.' });
  }
};