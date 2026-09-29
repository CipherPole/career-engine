'use strict';

const { createFeedback, getUserById } = require('./_lib/db');
const { getSessionFromRequest } = require('./_lib/session');
const { json, methodNotAllowed, readJsonBody } = require('./_lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readJsonBody(req);
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();
    let type = String(body?.type || 'feedback').toLowerCase().trim();

    const allowedTypes = ['bug', 'suggestion', 'question', 'feedback'];
    if (!allowedTypes.includes(type)) {
      type = 'feedback';
    }

    if (!subject || subject.length < 2) {
      return json(res, 400, { ok: false, error: 'Subject must be at least 2 characters.' });
    }
    if (!message || message.length < 5) {
      return json(res, 400, { ok: false, error: 'Message must be at least 5 characters.' });
    }

    let userId = null;
    let userEmail = String(body?.userEmail || body?.email || '').trim().toLowerCase();
    let userName = String(body?.userName || body?.name || '').trim();

    // Check if request is authenticated
    try {
      const session = getSessionFromRequest(req);
      if (session?.uid) {
        const user = await getUserById(session.uid);
        if (user) {
          userId = user.id;
          userEmail = user.email || userEmail;
          userName = user.name || userName;
        }
      }
    } catch (authErr) {
      // Allow guest submission even if session fails
    }

    const item = await createFeedback({
      userId,
      userEmail: userEmail || 'anonymous@guest.local',
      userName: userName || 'Guest User',
      type,
      subject,
      message,
    });

    return json(res, 201, {
      ok: true,
      id: item?.id,
      feedback: item,
    });
  } catch (error) {
    console.error('feedback submission error', error);
    return json(res, 500, { ok: false, error: 'Failed to record feedback.' });
  }
};
