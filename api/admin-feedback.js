'use strict';

const { getSessionFromRequest } = require('./_lib/session');
const { getUserById, getAllFeedback, updateFeedbackStatus } = require('./_lib/db');
const { json, methodNotAllowed, readJsonBody } = require('./_lib/http');

async function requireAdmin(req, res) {
  const session = getSessionFromRequest(req);
  if (!session?.uid) {
    json(res, 401, { ok: false, error: 'Unauthorized' });
    return null;
  }

  const user = await getUserById(session.uid);
  if (!user || user.role !== 'admin') {
    json(res, 403, { ok: false, error: 'Forbidden' });
    return null;
  }

  return user;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return methodNotAllowed(res, ['GET', 'PATCH']);
  }

  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const limit = Number(url.searchParams.get('limit') || 100);
      const rows = await getAllFeedback(limit);
      return json(res, 200, { ok: true, feedback: rows });
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const id = body?.id;
      if (!id) {
        return json(res, 400, { ok: false, error: 'Feedback ID is required.' });
      }

      const status = body?.status;
      const aiPrompt = body?.aiPrompt;

      const updated = await updateFeedbackStatus(id, { status, aiPrompt });
      if (!updated) {
        return json(res, 404, { ok: false, error: 'Feedback item not found or failed to update.' });
      }

      return json(res, 200, { ok: true, feedback: updated });
    }
  } catch (error) {
    console.error('admin-feedback endpoint error', error);
    return json(res, 500, { ok: false, error: 'Feedback management request failed.' });
  }
};
