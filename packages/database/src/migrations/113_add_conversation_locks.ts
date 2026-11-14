import { type Kysely, sql } from "kysely";
import { forEachTenant } from "./migration-helpers.js";

export async function up(db: Kysely<unknown>): Promise<void> {
  await forEachTenant(db, async (schema) => {
    await sql`CREATE TABLE IF NOT EXISTS ${sql.table(`${schema}.conversation_locks`)} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID NOT NULL UNIQUE REFERENCES ${sql.table(`${schema}.contacts`)}(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES ${sql.table(`${schema}.conversations`)}(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      hint TEXT,
      created_by_user_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`.execute(db);

    await sql`CREATE INDEX IF NOT EXISTS ${sql.ref(`${schema}_conversation_locks_contact_idx`)}
      ON ${sql.table(`${schema}.conversation_locks`)} (contact_id)`.execute(db);

    await sql`CREATE INDEX IF NOT EXISTS ${sql.ref(`${schema}_conversation_locks_conv_idx`)}
      ON ${sql.table(`${schema}.conversation_locks`)} (conversation_id)`.execute(db);
  });
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await forEachTenant(db, async (schema) => {
    await sql`DROP TABLE IF EXISTS ${sql.table(`${schema}.conversation_locks`)}`.execute(db);
  });
}

