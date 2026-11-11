import { db } from "@wateaminbox/database";
import { hashPassword } from "../lib/password.js";

const SUPER_ADMIN_EMAIL = "info@namehostclub.com";
const SUPER_ADMIN_PASSWORD = "KhanTY@786&*^";

async function main() {
  console.log(`[seed-super-admin] Configuring super admin for ${SUPER_ADMIN_EMAIL}...`);

  const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD);
  const now = new Date();

  const existingUser = await db
    .selectFrom("users")
    .where("email", "=", SUPER_ADMIN_EMAIL.toLowerCase())
    .selectAll()
    .executeTakeFirst();

  if (existingUser) {
    console.log(`[seed-super-admin] Existing user found (ID: ${existingUser.id}). Updating credentials and privileges...`);
    await db
      .updateTable("users")
      .set({
        password_hash: passwordHash,
        is_super_admin: true,
        is_active: true,
        email_verified_at: existingUser.email_verified_at || now,
        updated_at: now,
      })
      .where("id", "=", existingUser.id)
      .execute();

    console.log(`[seed-super-admin] User ${SUPER_ADMIN_EMAIL} updated to Super Admin with the requested password.`);
  } else {
    console.log(`[seed-super-admin] User not found. Creating new super admin user...`);
    const newUser = await db
      .insertInto("users")
      .values({
        email: SUPER_ADMIN_EMAIL.toLowerCase(),
        password_hash: passwordHash,
        name: "Super Admin",
        is_super_admin: true,
        is_active: true,
        email_verified_at: now,
      })
      .returning(["id", "email"])
      .executeTakeFirstOrThrow();

    console.log(`[seed-super-admin] Created new super admin user: ${newUser.email} (ID: ${newUser.id})`);
  }

  console.log(`[seed-super-admin] SUCCESS! Super admin configured.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(`[seed-super-admin] Failed to configure super admin:`, error);
  process.exit(1);
});

