'use strict';

const { getUserById, getUserStateByKey, upsertUserStateByKey } = require('./_lib/db');
const { getSessionFromRequest } = require('./_lib/session');
const { json, methodNotAllowed, readJsonBody } = require('./_lib/http');

const ALLOWED_STATE_KEYS = new Set(['jobs', 'training', 'certs']);

async function requireUser(req, res) {
  const session = getSessionFromRequest(req);
  if (!session?.uid) {
    json(res, 401, { ok: false, error: 'Unauthorized' });
    return null;
  }

  const user = await getUserById(session.uid);
  if (!user) {
    json(res, 401, { ok: false, error: 'Unauthorized' });
    return null;
  }

  return user;
}

function getStateKey(req) {
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('key');
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'PUT') {
      return methodNotAllowed(res, ['GET', 'PUT']);
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const stateKey = getStateKey(req);
    if (!stateKey || !ALLOWED_STATE_KEYS.has(stateKey)) {
      return json(res, 400, { ok: false, error: 'Invalid state key.' });
    }

    if (req.method === 'GET') {
      const state = await getUserStateByKey(user.id, stateKey);
      return json(res, 200, { ok: true, state });
    }

    const body = await readJsonBody(req);
    const state = body?.state;
    if (state === undefined) {
      return json(res, 400, { ok: false, error: 'Missing state payload.' });
    }

    const saved = await upsertUserStateByKey(user.id, stateKey, state);
    return json(res, 200, { ok: true, state: saved });
  } catch (error) {
    console.error('state endpoint error', error);
    return json(res, 500, { ok: false, error: 'State request failed.' });
  }
};
