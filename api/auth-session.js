'use strict';

const { verifyGoogleCredential } = require('./_lib/google');
const { upsertUserFromGoogle, ensureProfileForUser, logAuthEvent } = require('./_lib/db');
const { json, methodNotAllowed, readJsonBody } = require('./_lib/http');
const { encodeSession, serializeCookie, clearCookieHeader, ONE_WEEK_SECONDS, getSessionFromRequest } = require('./_lib/session');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const credential = body?.credential;
      const identity = await verifyGoogleCredential(credential);
      const { user, isNewUser } = await upsertUserFromGoogle(identity);

      await ensureProfileForUser(user.id, {
        contact: {
          name: identity.name,
          email: identity.email,
        },
        createdAt: new Date().toISOString(),
        source: 'google-signin',
      });

      await logAuthEvent({
        userId: user.id,
        email: user.email,
        role: user.role,
        eventType: isNewUser ? 'USER_CREATED' : 'USER_SIGNIN',
        isNewUser,
        metadata: {
          provider: 'google',
        },
      });

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
      const session = getSessionFromRequest(req);
      if (session?.uid) {
        await logAuthEvent({
          userId: session.uid,
          email: session.email || '',
          role: session.role || 'user',
          eventType: 'USER_SIGNOUT',
          isNewUser: false,
          metadata: {
            source: 'manual_or_idle_logout',
          },
        });
      }
      res.setHeader('Set-Cookie', clearCookieHeader());
      return json(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ['POST', 'DELETE']);
  } catch (error) {
    console.error('auth-session error', error);
    return json(res, 401, { ok: false, error: 'Authentication failed.' });
  }
};
