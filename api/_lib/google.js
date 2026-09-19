'use strict';

const { OAuth2Client } = require('google-auth-library');

const OWNER_EMAIL = 'jerexson3@gmail.com';
const oauthClient = new OAuth2Client();

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured.');
  }
  return clientId;
}

async function verifyGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string') {
    throw new Error('Missing Google credential.');
  }

  const clientId = getGoogleClientId();
  const ticket = await oauthClient.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email || !payload?.email_verified) {
    throw new Error('Google token payload missing required verified identity fields.');
  }

  const email = payload.email.toLowerCase();
  return {
    sub: payload.sub,
    email,
    name: payload.name || payload.given_name || 'Career Explorer',
    picture: payload.picture || '',
    role: email === OWNER_EMAIL.toLowerCase() ? 'admin' : 'user',
  };
}

module.exports = {
  verifyGoogleCredential,
};
