'use strict';

const { getSessionFromRequest } = require('./_lib/session');
const { getUserById, getRecentAuthEvents } = require('./_lib/db');
const { json, methodNotAllowed } = require('./_lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  try {
    const session = getSessionFromRequest(req);
    if (!session?.uid) {
      return json(res, 401, { ok: false, error: 'Unauthorized' });
    }

    const user = await getUserById(session.uid);
    if (!user || user.role !== 'admin') {
      return json(res, 403, { ok: false, error: 'Forbidden' });
    }

    const url = new URL(req.url, 'http://localhost');
    const limit = Number(url.searchParams.get('limit') || 100);
    const events = await getRecentAuthEvents(limit);

    return json(res, 200, { ok: true, events });
  } catch (error) {
    console.error('admin-auth-events error', error);
    return json(res, 500, { ok: false, error: 'Failed to fetch auth events.' });
  }
};
