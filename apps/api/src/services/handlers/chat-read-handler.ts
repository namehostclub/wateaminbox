/**
 * Chat read event handler - synchronizes read status from mobile device app state sync
 */

import { normalizeJid, toDbDate } from "@wateaminbox/shared";
import { sql } from "kysely";
import { formatError } from "../../lib/logger.js";
import type { ChatReadEvent } from "../../lib/nats/index.js";
import {
  broadcastToContactViewers,
  broadcastToConversationViewers,
} from "../message-broadcast.service.js";
import { getTenantConnection } from "../tenant.service.js";
import { handlerLogger as logger } from "./types.js";

/**
 * Handles chat read events (emitted when a whole chat or messages are read/opened on mobile)
 */
export async function handleChatReadEvent(event: ChatReadEvent): Promise<void> {
  const { companyId, connectionId, payload } = event;

  logger.debug(
    { companyId, connectionId, chatJid: payload.chatJid, read: payload.read },
    "Chat read event received",
  );

  const normalizedChatJid = normalizeJid(payload.chatJid);
  if (!normalizedChatJid) {
    logger.warn({ rawChatJid: payload.chatJid }, "Invalid chat JID in chat_read event");
    return;
  }

  try {
    const tenantDb = getTenantConnection(companyId);

    // Resolve the contact by exact JID or stripped device suffix
    let contact = await tenantDb
      .selectFrom("contacts")
      .select(["id", "jid"])
      .where("whatsapp_connection_id", "=", connectionId)
      .where("jid", "=", normalizedChatJid)
      .executeTakeFirst();

    if (!contact) {
      const bareJid = normalizedChatJid.replace(/:[0-9]+@/, "@");
      contact = await tenantDb
        .selectFrom("contacts")
        .select(["id", "jid"])
        .where("whatsapp_connection_id", "=", connectionId)
        .where((eb) =>
          eb(sql`regexp_replace(jid, ':[0-9]+@', '@')`, "=", bareJid),
        )
        .executeTakeFirst();
    }

    // Fallback: Resolve LID <-> Phone Number mappings if contact is not found directly
    if (!contact && normalizedChatJid.endsWith("@lid")) {
      const bareLid = normalizedChatJid.replace(/:[0-9]+@/, "@");
      const mappingResult = await sql<{ jid: string }>`
        SELECT jid
        FROM whatsapp_sessions.whatsmeow_lid_mappings
        WHERE (
          connection_id = ${connectionId}
          OR connection_id IN (
            SELECT id::text FROM whatsapp_connection_sessions
            WHERE whatsapp_connection_id = ${connectionId}
          )
        )
        AND regexp_replace(lid, ':[0-9]+@', '@') = ${bareLid}
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1
      `.execute(tenantDb);

      const mappedJid = mappingResult.rows[0]?.jid;
      if (mappedJid) {
        const bareMappedJid = mappedJid.replace(/:[0-9]+@/, "@");
        contact = await tenantDb
          .selectFrom("contacts")
          .select(["id", "jid"])
          .where("whatsapp_connection_id", "=", connectionId)
          .where((eb) =>
            eb.or([
              eb("jid", "=", mappedJid),
              eb(sql`regexp_replace(jid, ':[0-9]+@', '@')`, "=", bareMappedJid),
            ]),
          )
          .executeTakeFirst();
      }
    } else if (!contact && normalizedChatJid.endsWith("@s.whatsapp.net")) {
      const barePn = normalizedChatJid.replace(/:[0-9]+@/, "@");
      const mappingResult = await sql<{ lid: string }>`
        SELECT lid
        FROM whatsapp_sessions.whatsmeow_lid_mappings
        WHERE (
          connection_id = ${connectionId}
          OR connection_id IN (
            SELECT id::text FROM whatsapp_connection_sessions
            WHERE whatsapp_connection_id = ${connectionId}
          )
        )
        AND regexp_replace(jid, ':[0-9]+@', '@') = ${barePn}
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1
      `.execute(tenantDb);

      const mappedLid = mappingResult.rows[0]?.lid;
      if (mappedLid) {
        const bareMappedLid = mappedLid.replace(/:[0-9]+@/, "@");
        contact = await tenantDb
          .selectFrom("contacts")
          .select(["id", "jid"])
          .where("whatsapp_connection_id", "=", connectionId)
          .where((eb) =>
            eb.or([
              eb("jid", "=", mappedLid),
              eb(sql`regexp_replace(jid, ':[0-9]+@', '@')`, "=", bareMappedLid),
            ]),
          )
          .executeTakeFirst();
      }
    }

    if (!contact) {
      logger.debug(
        { chatJid: normalizedChatJid, connectionId },
        "Contact not found for chat_read event; skipping",
      );
      return;
    }

    // Check if there is an active conversation linked to this contact
    const conversation = await tenantDb
      .selectFrom("conversations")
      .select("id")
      .where("legacy_contact_id", "=", contact.id)
      .where("archived_at", "is", null)
      .executeTakeFirst();

    const timestampDate = payload.timestamp
      ? toDbDate(payload.timestamp)
      : toDbDate();

    if (payload.read) {
      // 1. Reset unread count to 0 in conversation_states
      const stateUpdate = tenantDb.updateTable("conversation_states").set({
        unread_count: 0,
        read_at: timestampDate,
        updated_at: toDbDate(),
      });

      if (conversation?.id) {
        await stateUpdate
          .where((eb) =>
            eb.or([
              eb("contact_id", "=", contact.id),
              eb("conversation_id", "=", conversation.id),
            ]),
          )
          .execute();
      } else {
        await stateUpdate.where("contact_id", "=", contact.id).execute();
      }

      // 2. Mark incoming messages as read
      const messageUpdateQuery = tenantDb
        .updateTable("messages")
        .set({ status: "read" })
        .where("contact_id", "=", contact.id)
        .where("whatsapp_connection_id", "=", connectionId)
        .where("from_me", "=", false)
        .where("status", "!=", "read");

      if (payload.messageIds && payload.messageIds.length > 0) {
        await messageUpdateQuery
          .where("message_id", "in", payload.messageIds)
          .execute();
      } else {
        await messageUpdateQuery.execute();
      }

      // 3. Broadcast real-time "conversation:read" to all open web clients
      const broadcastPayload = {
        contactId: contact.id,
        conversationId: conversation?.id ?? contact.id,
        unreadCount: 0,
      };

      await broadcastToContactViewers(
        companyId,
        contact.id,
        "conversation:read",
        broadcastPayload,
        { connectionId },
      );

      if (conversation?.id) {
        await broadcastToConversationViewers(
          companyId,
          conversation.id,
          "conversation:read",
          broadcastPayload,
          { connectionId },
        );
      }
    } else {
      // If explicitly marked as unread on phone
      const unreadCount = 1;
      await tenantDb
        .updateTable("conversation_states")
        .set({
          unread_count: unreadCount,
          updated_at: toDbDate(),
        })
        .where("contact_id", "=", contact.id)
        .execute();

      await broadcastToContactViewers(
        companyId,
        contact.id,
        "conversation:updated",
        {
          contactId: contact.id,
          conversationId: conversation?.id ?? contact.id,
          unreadCount,
        },
        { connectionId },
      );
    }
  } catch (error) {
    logger.error(formatError(error), "Failed to handle chat_read event");
    throw error;
  }
}

