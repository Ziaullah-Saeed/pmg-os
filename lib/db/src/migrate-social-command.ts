/**
 * Phase 0 migration for Social Command (Outreach → unified social inbox).
 *
 * Creates the five new tables (social_accounts, channel_identities,
 * conversations, messages, social_interactions) + their indexes.
 *
 * We ship this as a hand-written idempotent DDL script rather than
 * `drizzle-kit push` because push is blocked by a pre-existing data-loss drift
 * guard on this database (see CLAUDE.md §10). Every statement is
 * `IF NOT EXISTS`, so it is safe to run repeatedly and safe on a populated DB.
 * The DDL mirrors the Drizzle definitions in ./schema/* exactly, so a future
 * `drizzle-kit push` will see no drift for these tables.
 *
 * Run:  pnpm --filter @workspace/db run migrate:social
 * (requires DATABASE_URL — same env the app uses)
 */
import { pool } from "./index";

const DDL = `
-- 1. social_accounts ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_accounts (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_account_id TEXT,
  display_name TEXT,
  handle TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  is_active BOOLEAN NOT NULL DEFAULT false,
  integration_id INTEGER REFERENCES integrations(id) ON DELETE SET NULL,
  credentials JSONB,
  config JSONB,
  webhook_subscribed BOOLEAN NOT NULL DEFAULT false,
  owner_type TEXT NOT NULL DEFAULT 'pmg',
  client_id INTEGER,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  last_sync_error TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_accounts_platform_idx ON social_accounts (platform);
CREATE INDEX IF NOT EXISTS social_accounts_client_idx ON social_accounts (client_id);

-- 2. channel_identities ------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_identities (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  handle TEXT,
  display_name TEXT,
  profile_url TEXT,
  avatar_url TEXT,
  confidence REAL NOT NULL DEFAULT 1,
  verified BOOLEAN NOT NULL DEFAULT false,
  social_account_id INTEGER REFERENCES social_accounts(id) ON DELETE SET NULL,
  owner_type TEXT NOT NULL DEFAULT 'pmg',
  client_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_identities_lookup_idx ON channel_identities (platform, external_user_id);
CREATE INDEX IF NOT EXISTS channel_identities_contact_idx ON channel_identities (contact_id);

-- 3. conversations -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  subject TEXT,
  primary_channel TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  last_direction TEXT,
  first_inbound_at TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  intent_score INTEGER,
  sentiment TEXT,
  converted_lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  converted_opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
  owner_type TEXT NOT NULL DEFAULT 'pmg',
  client_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_contact_idx ON conversations (contact_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations (status);
CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON conversations (last_message_at);
CREATE INDEX IF NOT EXISTS conversations_client_idx ON conversations (client_id);

-- 4. messages ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  external_message_id TEXT,
  social_account_id INTEGER REFERENCES social_accounts(id) ON DELETE SET NULL,
  channel_identity_id INTEGER REFERENCES channel_identities(id) ON DELETE SET NULL,
  body TEXT,
  attachments JSONB,
  status TEXT NOT NULL DEFAULT 'received',
  sentiment TEXT,
  intent_score INTEGER,
  sent_by_mode TEXT,
  performed_by TEXT,
  external_timestamp TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_external_idx ON messages (channel, external_message_id);

-- 5. social_interactions -----------------------------------------------------
CREATE TABLE IF NOT EXISTS social_interactions (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  channel_identity_id INTEGER REFERENCES channel_identities(id) ON DELETE SET NULL,
  social_account_id INTEGER REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  type TEXT NOT NULL,
  external_id TEXT,
  post_id TEXT,
  post_url TEXT,
  content TEXT,
  external_parent_id TEXT,
  intent_score INTEGER,
  sentiment TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  converted_to_lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  converted_conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  owner_type TEXT NOT NULL DEFAULT 'pmg',
  client_id INTEGER,
  external_timestamp TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_interactions_contact_idx ON social_interactions (contact_id);
CREATE INDEX IF NOT EXISTS social_interactions_external_idx ON social_interactions (platform, external_id);
CREATE INDEX IF NOT EXISTS social_interactions_status_idx ON social_interactions (status);
`;

async function main() {
  console.log("[migrate:social] Creating Social Command tables (idempotent)...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(DDL);
    await client.query("COMMIT");
    console.log("[migrate:social] Done — 5 tables + indexes ensured.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[migrate:social] FAILED, rolled back:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
