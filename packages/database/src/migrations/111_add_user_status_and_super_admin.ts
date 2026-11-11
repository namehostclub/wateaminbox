import { type Kysely, sql } from "kysely";

/**
 * Migration 111: Add user status and super admin flags to public.users
 *
 * Adds:
 * - is_active (boolean default true): Allows administrators to deactivate accounts.
 *   Deactivation immediately revokes active sessions and prevents further logins.
 * - is_super_admin (boolean default false): Designates platform-wide super administrators.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS users_is_active_idx ON public.users (is_active)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS users_is_super_admin_idx ON public.users (is_super_admin)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS public.users_is_super_admin_idx`.execute(db);
  await sql`DROP INDEX IF EXISTS public.users_is_active_idx`.execute(db);
  await sql`
    ALTER TABLE public.users
    DROP COLUMN IF EXISTS is_super_admin,
    DROP COLUMN IF EXISTS is_active
  `.execute(db);
}

