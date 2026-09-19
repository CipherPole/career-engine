'use strict';

const { getProfileByUserId, upsertProfileByUserId, getUserById } = require('./_lib/db');
const { getSessionFromRequest } = require('./_lib/session');
const { json, methodNotAllowed, readJsonBody } = require('./_lib/http');

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

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'PUT') {
      return methodNotAllowed(res, ['GET', 'PUT']);
    }

    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const profile = await getProfileByUserId(user.id);
      return json(res, 200, { ok: true, profile });
    }

    const body = await readJsonBody(req);
    const profile = body?.profile;
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      return json(res, 400, { ok: false, error: 'Invalid profile payload.' });
    }

    const saved = await upsertProfileByUserId(user.id, profile);
    return json(res, 200, { ok: true, profile: saved });
  } catch (error) {
    console.error('profile endpoint error', error);
    return json(res, 500, { ok: false, error: 'Profile request failed.' });
  }
};
