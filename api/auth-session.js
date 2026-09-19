'use strict';

const { verifyGoogleCredential } = require('./_lib/google');
const { upsertUserFromGoogle } = require('./_lib/db');
const { json, methodNotAllowed, readJsonBody } = require('./_lib/http');
const { encodeSession, serializeCookie, clearCookieHeader, ONE_WEEK_SECONDS } = require('./_lib/session');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const credential = body?.credential;
      const identity = await verifyGoogleCredential(credential);
      const { user, isNewUser } = await upsertUserFromGoogle(identity);

      const now = Math.floor(Date.now() / 1000);
      const sessionPayload = {
        uid: user.id,
        sub: user.google_sub,
        role: user.role,
        email: user.email,
        iat: now,
        exp: now + ONE_WEEK_SECONDS,
      };

      res.setHeader('Set-Cookie', serializeCookie(encodeSession(sessionPayload), ONE_WEEK_SECONDS));
      return json(res, 200, {
        ok: true,
        isNewUser,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: user.role,
        },
      });
    }

    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', clearCookieHeader());
      return json(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ['POST', 'DELETE']);
  } catch (error) {
    console.error('auth-session error', error);
    return json(res, 401, { ok: false, error: 'Authentication failed.' });
  }
};
