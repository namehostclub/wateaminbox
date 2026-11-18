import type { Kysely } from "kysely";
import { sql } from "kysely";
import { forEachTenant } from "./migration-helpers.js";

/**
 * Merge orphaned LID call contacts into canonical phone-number contacts.
 *
 * WhatsApp call events frequently arrive with an opaque LID JID (@lid) rather
 * than a phone JID (@s.whatsapp.net). When call events were ingested with raw
 * LIDs, duplicate contacts ("WhatsApp user (ID ...)") were created, separating
 * call notifications from the customer's real conversation thread.
 *
 * This migration:
 * 1. Finds all contacts in each tenant whose JID is a LID (@lid or @hosted.lid).
 * 2. Resolves their canonical phone JID from whatsapp_sessions.whatsmeow_lid_mappings.
 * 3. Merges messages and cases into the real contact if it already exists, then removes the duplicate.
 * 4. Otherwise updates the LID contact's JID to the canonical phone number.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql.raw("SET LOCAL lock_timeout = '5s'").execute(db);
  await sql.raw("SET LOCAL statement_timeout = '60s'").execute(db);

  await forEachTenant(db, async (schemaName) => {
    // 1. Fetch all LID contacts in this tenant
    const lidContacts = await sql<{
      id: string;
      jid: string;
      whatsapp_connection_id: string | null;
    }>`
      SELECT id, jid, whatsapp_connection_id
      FROM ${sql.table(`${schemaName}.contacts`)}
      WHERE split_part(jid, '@', 2) IN ('lid', 'hosted.lid')
    `.execute(db);

    if (lidContacts.rows.length === 0) return;

    for (const lidContact of lidContacts.rows) {
      const normalizedLid = lidContact.jid.replace(/:[0-9]+@/, "@");

      // 2. Resolve canonical phone JID from whatsmeow_lid_mappings.
      // Prioritize the connection matching the contact, but accept any connection's mapping.
      const mapping = await sql<{ canonical_jid: string }>`
        SELECT regexp_replace(jid, ':[0-9]+@', '@') AS canonical_jid
        FROM whatsapp_sessions.whatsmeow_lid_mappings
        WHERE regexp_replace(lid, ':[0-9]+@', '@') = ${normalizedLid}
        ORDER BY
          ${
            lidContact.whatsapp_connection_id
              ? sql`(connection_id::text = ${lidContact.whatsapp_connection_id}) DESC,`
              : sql``
          }
          created_at DESC
        LIMIT 1
      `.execute(db);

      const canonicalJid = mapping.rows[0]?.canonical_jid;
      if (!canonicalJid || canonicalJid.includes("@lid")) continue;

      // Extract phone digits from canonical JID (e.g. 447713469894)
      const phoneDigits = canonicalJid.split("@")[0]?.replace(/[^0-9]/g, "");

      // 3. Check if target contact already exists in this tenant
      const targetContact = await sql<{ id: string }>`
        SELECT id
        FROM ${sql.table(`${schemaName}.contacts`)}
        WHERE jid = ${canonicalJid}
          AND id != ${lidContact.id}::uuid
        ORDER BY
          ${
            lidContact.whatsapp_connection_id
              ? sql`(whatsapp_connection_id = ${lidContact.whatsapp_connection_id}::uuid) DESC,`
              : sql``
          }
          created_at ASC
        LIMIT 1
      `.execute(db);

      if (targetContact.rows[0]?.id) {
        const targetId = targetContact.rows[0].id;

        // Move all messages to target contact
        await sql`
          UPDATE ${sql.table(`${schemaName}.messages`)}
          SET contact_id = ${targetId}::uuid
          WHERE contact_id = ${lidContact.id}::uuid
        `.execute(db);

        // Handle active conversation cases to avoid violating cc_active_uidx
        await sql`
          DELETE FROM ${sql.table(`${schemaName}.conversation_cases`)}
          WHERE contact_id = ${lidContact.id}::uuid
            AND status IN ('open', 'pending')
            AND EXISTS (
              SELECT 1 FROM ${sql.table(`${schemaName}.conversation_cases`)}
              WHERE contact_id = ${targetId}::uuid AND status IN ('open', 'pending')
            )
        `.execute(db);

        // Move all remaining cases to target contact
        await sql`
          UPDATE ${sql.table(`${schemaName}.conversation_cases`)}
          SET contact_id = ${targetId}::uuid
          WHERE contact_id = ${lidContact.id}::uuid
        `.execute(db);

        // Update target conversation_states last_message_at if LID contact has newer message
        await sql`
          UPDATE ${sql.table(`${schemaName}.conversation_states`)} ts
          SET last_message_at = GREATEST(ts.last_message_at, ls.last_message_at),
              unread_count = ts.unread_count + ls.unread_count
          FROM ${sql.table(`${schemaName}.conversation_states`)} ls
          WHERE ts.contact_id = ${targetId}::uuid
            AND ls.contact_id = ${lidContact.id}::uuid
        `.execute(db);

        // Delete LID conversation_states
        await sql`
          DELETE FROM ${sql.table(`${schemaName}.conversation_states`)}
          WHERE contact_id = ${lidContact.id}::uuid
        `.execute(db);

        // Delete any locks on the LID contact
        await sql`
          DELETE FROM ${sql.table(`${schemaName}.conversation_locks`)}
          WHERE contact_id = ${lidContact.id}::uuid
        `.execute(db);

        // Repoint any foreign key references from conversations or endpoints
        await sql`
          UPDATE ${sql.table(`${schemaName}.conversations`)}
          SET legacy_contact_id = ${targetId}::uuid
          WHERE legacy_contact_id = ${lidContact.id}::uuid
        `.execute(db);

        await sql`
          UPDATE ${sql.table(`${schemaName}.contact_endpoints`)}
          SET contact_id = ${targetId}::uuid
          WHERE contact_id = ${lidContact.id}::uuid
        `.execute(db);

        // Delete the duplicate LID contact
        await sql`
          DELETE FROM ${sql.table(`${schemaName}.contacts`)}
          WHERE id = ${lidContact.id}::uuid
        `.execute(db);
      } else {
        // No canonical contact exists yet - update the LID contact directly
        await sql`
          UPDATE ${sql.table(`${schemaName}.contacts`)}
          SET jid = ${canonicalJid},
              phone_number = COALESCE(phone_number, ${phoneDigits}),
              updated_at = now()
          WHERE id = ${lidContact.id}::uuid
        `.execute(db);
      }
    }
  });
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Merged contact history cannot be unmerged without loss of causality;
  // leaving canonical contacts unchanged is safe and preserves data integrity.
}

