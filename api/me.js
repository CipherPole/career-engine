'use strict';

const { getUserById } = require('./_lib/db');
const { getSessionFromRequest } = require('./_lib/session');
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
    if (!user) {
      return json(res, 401, { ok: false, error: 'Unauthorized' });
    }

    return json(res, 200, {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('me endpoint error', error);
    return json(res, 500, { ok: false, error: 'Failed to load current user.' });
  }
};
