/**
 * Dashboard analytics
 */

import { db } from "@wateaminbox/database";
import { startOfDay } from "@wateaminbox/shared";
import { getTenantConnection } from "../tenant.service.js";
import type { DashboardStats } from "./types.js";

/**
 * Get dashboard overview statistics
 */
export async function getDashboardStats(
  companyId: string,
): Promise<DashboardStats> {
  const tenantDb = getTenantConnection(companyId);

  const today = startOfDay().toDate();

  const [messageStats, contactStats, memberStats, unreadStats] =
    await Promise.all([
      tenantDb
        .selectFrom("messages")
        .select((eb) => [
          eb.fn.countAll().as("total"),
          eb.fn
            .count("id")
            .filterWhere("from_me", "=", true)
            .filterWhere("timestamp", ">=", today)
            .as("sent_today"),
          eb.fn
            .count("id")
            .filterWhere("from_me", "=", false)
            .filterWhere("timestamp", ">=", today)
            .as("received_today"),
          eb.fn
            .coalesce(eb.fn.sum<number>("media_size"), eb.lit(0))
            .as("storage_bytes"),
          eb.fn
            .count("id")
            .filterWhere("media_url", "is not", null)
            .as("media_count"),
        ])
        .executeTakeFirst(),
      tenantDb
        .selectFrom("contacts")
        .select((eb) => eb.fn.countAll().as("total"))
        .where("is_group", "=", false)
        .executeTakeFirst(),
      db
        .selectFrom("company_members")
        .select((eb) => eb.fn.countAll().as("total"))
        .where("company_id", "=", companyId)
        .executeTakeFirst(),
      tenantDb
        .selectFrom("conversation_states")
        .select((eb) => eb.fn.countAll().as("total"))
        .where("unread_count", ">", 0)
        .executeTakeFirst(),
    ]);

  const storageBytes = Number(messageStats?.storage_bytes || 0);
  const storageLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GB standard workspace quota
  const storageUsagePercent = Math.min(
    100,
    Math.round((storageBytes / storageLimitBytes) * 100),
  );
  const storageMediaFiles = Number(messageStats?.media_count || 0);

  return {
    totalMessages: Number(messageStats?.total || 0),
    totalContacts: Number(contactStats?.total || 0),
    activeUsers: Number(memberStats?.total || 0),
    messagesSentToday: Number(messageStats?.sent_today || 0),
    messagesReceivedToday: Number(messageStats?.received_today || 0),
    unreadConversations: Number(unreadStats?.total || 0),
    storageBytes,
    storageLimitBytes,
    storageUsagePercent,
    storageMediaFiles,
  };
}
