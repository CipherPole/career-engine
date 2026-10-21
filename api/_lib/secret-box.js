'use strict';

/* Encrypts user-supplied secrets (AI provider API keys) at rest with AES-256-GCM.
   The key is derived from AI_KEYS_SECRET, or SESSION_SECRET when that isn't set.
   Rotating the source secret makes stored values unreadable: users re-enter their keys. */

const crypto = require('crypto');

function encryptionKey() {
  const secret = process.env.AI_KEYS_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('AI_KEYS_SECRET or SESSION_SECRET (32+ chars) is required.');
  return Buffer.from(crypto.hkdfSync('sha256', secret, 'career-engine-ai-keys', 'ai-provider-keys-v1', 32));
}

function seal(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

/** Returns the plaintext, or null when the value can't be decrypted (tampered or secret rotated). */
function open(box) {
  try {
    if (!box || box.v !== 1) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(box.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { seal, open };
