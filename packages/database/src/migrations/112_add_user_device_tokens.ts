import { type Kysely, sql } from "kysely";

/**
 * Migration 112: Add user_device_tokens table to public schema for mobile push notifications
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.user_device_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform VARCHAR(20) NOT NULL,
      device_name VARCHAR(100),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_device_tokens_user_token_unique UNIQUE (user_id, token)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_device_tokens_lookup 
    ON public.user_device_tokens (user_id, company_id)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_device_tokens_company 
    ON public.user_device_tokens (company_id)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.user_device_tokens`.execute(db);
}

