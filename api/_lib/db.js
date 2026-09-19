'use strict';

const { neon } = require('@neondatabase/serverless');

const OWNER_EMAIL = 'jerexson3@gmail.com';

let schemaReadyPromise = null;

function getSql() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL/DATABASE_URL is not configured.');
  }
  return neon(connectionString);
}

async function ensureSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        google_sub TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        picture TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_states (
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        state_key TEXT NOT NULL,
        state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, state_key)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS auth_events (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        email TEXT,
        role TEXT,
        event_type TEXT NOT NULL,
        is_new_user BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
  })();

  return schemaReadyPromise;
}

async function upsertUserFromGoogle(identity) {
  await ensureSchema();
  const sql = getSql();
  const normalizedEmail = String(identity?.email || '').toLowerCase();
  const effectiveRole = normalizedEmail === OWNER_EMAIL.toLowerCase() ? 'admin' : 'user';

  const existing = await sql`
    SELECT id FROM users WHERE google_sub = ${identity.sub} LIMIT 1;
  `;
  const isNewUser = existing.length === 0;

  const rows = await sql`
    INSERT INTO users (google_sub, email, name, picture, role, updated_at)
    VALUES (${identity.sub}, ${normalizedEmail}, ${identity.name}, ${identity.picture}, ${effectiveRole}, NOW())
    ON CONFLICT (google_sub)
    DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      role = EXCLUDED.role,
      updated_at = NOW()
    RETURNING id, google_sub, email, name, picture, role;
  `;

  return {
    user: rows[0],
    isNewUser,
  };
}

async function getUserById(userId) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, google_sub, email, name, picture, role
    FROM users
    WHERE id = ${userId}
    LIMIT 1;
  `;
  return rows[0] || null;
}

async function getProfileByUserId(userId) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT profile_json
    FROM user_profiles
    WHERE user_id = ${userId}
    LIMIT 1;
  `;
  return rows[0]?.profile_json || null;
}

async function upsertProfileByUserId(userId, profile) {
  await ensureSchema();
  const sql = getSql();
  const payload = JSON.stringify(profile || {});

  const rows = await sql`
    INSERT INTO user_profiles (user_id, profile_json, updated_at)
    VALUES (${userId}, ${payload}::jsonb, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      profile_json = EXCLUDED.profile_json,
      updated_at = NOW()
    RETURNING profile_json;
  `;

  return rows[0]?.profile_json || {};
}

async function ensureProfileForUser(userId, seedProfile) {
  await ensureSchema();
  const sql = getSql();
  const payload = JSON.stringify(seedProfile || {});
  await sql`
    INSERT INTO user_profiles (user_id, profile_json, updated_at)
    VALUES (${userId}, ${payload}::jsonb, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  `;
}

async function getUserStateByKey(userId, stateKey) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT state_json
    FROM user_states
    WHERE user_id = ${userId} AND state_key = ${stateKey}
    LIMIT 1;
  `;
  return rows[0]?.state_json ?? null;
}

async function upsertUserStateByKey(userId, stateKey, stateValue) {
  await ensureSchema();
  const sql = getSql();
  const payload = JSON.stringify(stateValue ?? {});
  const rows = await sql`
    INSERT INTO user_states (user_id, state_key, state_json, updated_at)
    VALUES (${userId}, ${stateKey}, ${payload}::jsonb, NOW())
    ON CONFLICT (user_id, state_key)
    DO UPDATE SET
      state_json = EXCLUDED.state_json,
      updated_at = NOW()
    RETURNING state_json;
  `;
  return rows[0]?.state_json ?? {};
}

async function logAuthEvent({ userId = null, email = '', role = 'user', eventType, isNewUser = false, metadata = {} }) {
  await ensureSchema();
  const sql = getSql();
  const payload = JSON.stringify(metadata || {});
  await sql`
    INSERT INTO auth_events (user_id, email, role, event_type, is_new_user, metadata)
    VALUES (${userId}, ${email}, ${role}, ${eventType}, ${isNewUser}, ${payload}::jsonb);
  `;
}

async function getRecentAuthEvents(limit = 100) {
  await ensureSchema();
  const sql = getSql();
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const rows = await sql`
    SELECT id, user_id, email, role, event_type, is_new_user, metadata, created_at
    FROM auth_events
    ORDER BY created_at DESC
    LIMIT ${safeLimit};
  `;
  return rows;
async function deleteUserAccount(userId) {
  await ensureSchema();
  const sql = getSql();
  const user = await getUserById(userId);
  if (!user) return false;
  if (user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    throw new Error('Cannot delete platform owner account.');
  }

  await sql`
    DELETE FROM users WHERE id = ${userId};
  `;
  return true;
}

module.exports = {
  ensureSchema,
  upsertUserFromGoogle,
  getUserById,
  getProfileByUserId,
  upsertProfileByUserId,
  ensureProfileForUser,
  getUserStateByKey,
  upsertUserStateByKey,
  logAuthEvent,
  getRecentAuthEvents,
  deleteUserAccount,
};
