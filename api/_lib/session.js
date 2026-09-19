'use strict';

const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'career_engine_session';
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short.');
  }
  return secret;
}

function base64urlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64urlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(payloadEncoded, secret) {
  return crypto.createHmac('sha256', secret).update(payloadEncoded).digest('base64url');
}

function encodeSession(payload) {
  const secret = getSessionSecret();
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signature = sign(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

function decodeSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) {
    return null;
  }

  const secret = getSessionSecret();
  const expectedSignature = sign(payloadEncoded, secret);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(payloadEncoded));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function serializeCookie(value, maxAge = ONE_WEEK_SECONDS) {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=${maxAge}`;
}

function clearCookieHeader() {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`;
}

function parseCookies(req) {
  const cookieHeader = req.headers?.cookie || '';
  const result = {};
  cookieHeader.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    result[k] = rest.join('=');
  });
  return result;
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  return decodeSession(token);
}

module.exports = {
  SESSION_COOKIE_NAME,
  ONE_WEEK_SECONDS,
  encodeSession,
  serializeCookie,
  clearCookieHeader,
  getSessionFromRequest,
};
