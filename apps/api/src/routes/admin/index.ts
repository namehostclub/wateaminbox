import { Hono } from "hono";
import { db } from "@wateaminbox/database";
import { sql } from "kysely";
import { hashPassword } from "../../lib/password.js";
import {
  successData,
  successMessage,
  successWithMessage,
} from "../../lib/response.js";
import { zValidator } from "../../lib/validator.js";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { superAdminMiddleware } from "../../middleware/super-admin.js";
import { toAuthUserResponse } from "../../services/auth.service.js";
import { tenantSchemaExists } from "../../services/tenant.service.js";

export const adminRoutes = new Hono();

// Apply auth and super-admin protection to all /api/admin routes
adminRoutes.use("*", authMiddleware, superAdminMiddleware);

/**
 * GET /api/admin/overview
 * Platform-wide KPI overview
 */
adminRoutes.get("/overview", async (c) => {
  // 1. Users overview
  const userCounts = await db
    .selectFrom("users")
    .select([
      sql<number>`count(*)`.as("total"),
      sql<number>`count(*) FILTER (WHERE is_active = true)`.as("active"),
      sql<number>`count(*) FILTER (WHERE is_active = false)`.as("inactive"),
    ])
    .executeTakeFirst();

  // 2. Workspaces overview
  const companyCounts = await db
    .selectFrom("companies")
    .select([
      sql<number>`count(*)`.as("total"),
      sql<number>`count(*) FILTER (WHERE status = 'active')`.as("active"),
    ])
    .executeTakeFirst();

  // 3. Aggregate data usage across all active tenant schemas
  const activeCompanies = await db
    .selectFrom("companies")
    .where("status", "=", "active")
    .select(["id", "name", "schema_name"])
    .execute();

  let totalMessages = 0;
  let inboundMessages = 0;
  let outboundMessages = 0;
  let totalMediaFiles = 0;
  let totalStorageBytes = 0;
  let totalConnections = 0;
  let totalContacts = 0;

  for (const company of activeCompanies) {
    const exists = await tenantSchemaExists(company.id);
    if (!exists) continue;

    try {
      const stats = await sql<{
        total_messages: string | number;
        inbound_messages: string | number;
        outbound_messages: string | number;
        media_count: string | number;
        media_bytes: string | number;
        contacts_count: string | number;
        connections_count: string | number;
      }>`
        SELECT
          (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)}) as total_messages,
          (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)} WHERE from_me = false) as inbound_messages,
          (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)} WHERE from_me = true) as outbound_messages,
          (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)} WHERE media_url IS NOT NULL) as media_count,
          (SELECT coalesce(sum(media_size), 0) FROM ${sql.raw(`"${company.schema_name}".messages`)}) as media_bytes,
          (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".contacts`)}) as contacts_count,
          (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".whatsapp_connections`)} WHERE status = 'connected') as connections_count
      `.execute(db);

      const row = stats.rows[0];
      if (row) {
        totalMessages += Number(row.total_messages || 0);
        inboundMessages += Number(row.inbound_messages || 0);
        outboundMessages += Number(row.outbound_messages || 0);
        totalMediaFiles += Number(row.media_count || 0);
        totalStorageBytes += Number(row.media_bytes || 0);
        totalContacts += Number(row.contacts_count || 0);
        totalConnections += Number(row.connections_count || 0);
      }
    } catch {
      // Skip if individual schema has unmigrated tables or is locked
    }
  }

  // 4. Recent signups
  const recentUsersRaw = await db
    .selectFrom("users")
    .select([
      "id",
      "email",
      "name",
      "avatar_key",
      "email_verified_at",
      "is_active",
      "is_super_admin",
      "created_at",
    ])
    .orderBy("created_at", "desc")
    .limit(5)
    .execute();

  const recentUsers = await Promise.all(
    recentUsersRaw.map(async (u) => ({
      ...(await toAuthUserResponse({
        id: u.id,
        email: u.email,
        name: u.name,
        avatarKey: u.avatar_key,
        emailVerifiedAt: u.email_verified_at,
        isActive: u.is_active,
        isSuperAdmin: u.is_super_admin,
      })),
      createdAt: u.created_at,
    })),
  );

  return successData(c, {
    users: {
      total: Number(userCounts?.total || 0),
      active: Number(userCounts?.active || 0),
      inactive: Number(userCounts?.inactive || 0),
    },
    workspaces: {
      total: Number(companyCounts?.total || 0),
      active: Number(companyCounts?.active || 0),
    },
    dataUsage: {
      totalMessages,
      inboundMessages,
      outboundMessages,
      totalMediaFiles,
      totalStorageBytes,
      totalConnections,
      totalContacts,
    },
    recentUsers,
  });
});

/**
 * GET /api/admin/users
 * List all users with workspace memberships and session activity
 */
adminRoutes.get("/users", async (c) => {
  const searchQuery = c.req.query("search")?.toLowerCase().trim() || "";
  const statusFilter = c.req.query("status") || "all";

  let query = db
    .selectFrom("users")
    .select([
      "id",
      "name",
      "email",
      "avatar_key",
      "email_verified_at",
      "is_active",
      "is_super_admin",
      "created_at",
      "updated_at",
    ])
    .orderBy("created_at", "desc");

  if (statusFilter === "active") {
    query = query.where("is_active", "=", true);
  } else if (statusFilter === "inactive") {
    query = query.where("is_active", "=", false);
  }

  if (searchQuery) {
    query = query.where((eb) =>
      eb.or([
        eb(sql`lower(email)`, "like", `%${searchQuery}%`),
        eb(sql`lower(coalesce(name, ''))`, "like", `%${searchQuery}%`),
      ]),
    );
  }

  const [usersRaw, memberships, lastSessions, companies] = await Promise.all([
    query.execute(),
    db
      .selectFrom("company_members as cm")
      .innerJoin("companies as c", "c.id", "cm.company_id")
      .select([
        "cm.user_id",
        "c.id as company_id",
        "c.name as company_name",
        "cm.role",
        "cm.joined_at",
      ])
      .execute(),
    db
      .selectFrom("user_sessions")
      .select(["user_id", sql<Date>`max(last_active_at)`.as("last_active_at")])
      .groupBy("user_id")
      .execute(),
    db
      .selectFrom("companies")
      .select(["id", "schema_name", "status"])
      .where("status", "!=", "deleted")
      .execute(),
  ]);

  // Query per-workspace storage and message stats
  const workspaceStatsMap = new Map<
    string,
    { storageBytes: number; totalMessages: number }
  >();

  for (const company of companies) {
    if (!company.schema_name) continue;
    const exists = await tenantSchemaExists(company.id);
    if (!exists) continue;

    try {
      const stats = await sql<{
        total_messages: string | number;
        media_bytes: string | number;
      }>`
        SELECT 
          (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)}) as total_messages,
          (SELECT coalesce(sum(media_size), 0) FROM ${sql.raw(`"${company.schema_name}".messages`)}) as media_bytes
      `.execute(db);

      const row = stats.rows[0];
      if (row) {
        workspaceStatsMap.set(company.id, {
          storageBytes: Number(row.media_bytes || 0),
          totalMessages: Number(row.total_messages || 0),
        });
      }
    } catch {
      // Skip if individual schema has unmigrated tables or is locked
    }
  }

  const membershipsByUser = new Map<
    string,
    Array<{
      companyId: string;
      companyName: string;
      role: string;
      joinedAt: Date;
      storageBytes: number;
      totalMessages: number;
    }>
  >();

  for (const m of memberships) {
    const list = membershipsByUser.get(m.user_id) || [];
    const stats = workspaceStatsMap.get(m.company_id);
    list.push({
      companyId: m.company_id,
      companyName: m.company_name,
      role: m.role,
      joinedAt: m.joined_at,
      storageBytes: stats?.storageBytes ?? 0,
      totalMessages: stats?.totalMessages ?? 0,
    });
    membershipsByUser.set(m.user_id, list);
  }

  const lastActiveByUser = new Map<string, Date>();
  for (const s of lastSessions) {
    if (s.last_active_at) {
      lastActiveByUser.set(s.user_id, s.last_active_at);
    }
  }

  const users = await Promise.all(
    usersRaw.map(async (u) => {
      const publicUser = await toAuthUserResponse({
        id: u.id,
        email: u.email,
        name: u.name,
        avatarKey: u.avatar_key,
        emailVerifiedAt: u.email_verified_at,
        isActive: u.is_active,
        isSuperAdmin: u.is_super_admin,
      });

      const userWorkspaces = membershipsByUser.get(u.id) || [];
      const totalStorageBytes = userWorkspaces.reduce(
        (sum, w) => sum + (w.storageBytes || 0),
        0,
      );
      const totalMessages = userWorkspaces.reduce(
        (sum, w) => sum + (w.totalMessages || 0),
        0,
      );

      return {
        ...publicUser,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        lastActiveAt: lastActiveByUser.get(u.id) || null,
        workspaces: userWorkspaces,
        totalStorageBytes,
        totalMessages,
      };
    }),
  );

  return successData(c, users);
});

/**
 * PATCH /api/admin/users/:userId/status
 * Activate or deactivate a user
 */
const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

adminRoutes.patch(
  "/users/:userId/status",
  zValidator("json", updateStatusSchema),
  async (c) => {
    const currentUser = c.get("user");
    const userId = c.req.param("userId");
    const { isActive } = c.req.valid("json");

    if (userId === currentUser.id && !isActive) {
      return c.json(
        {
          error: "Forbidden",
          message: "You cannot deactivate your own super admin account.",
        },
        400,
      );
    }

    const targetUser = await db
      .selectFrom("users")
      .where("id", "=", userId)
      .select(["id", "email", "name"])
      .executeTakeFirst();

    if (!targetUser) {
      return c.json(
        {
          error: "Not Found",
          message: "User not found",
        },
        404,
      );
    }

    await db
      .updateTable("users")
      .set({ is_active: isActive, updated_at: new Date() })
      .where("id", "=", userId)
      .execute();

    // If deactivated, revoke all active sessions immediately
    if (!isActive) {
      await db
        .deleteFrom("user_sessions")
        .where("user_id", "=", userId)
        .execute();
    }

    return successWithMessage(
      c,
      `User ${targetUser.email} has been ${isActive ? "activated" : "deactivated"} successfully.`,
      { userId, isActive },
    );
  },
);

/**
 * POST /api/admin/users/:userId/reset-password
 * Reset user password directly by super admin
 */
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

adminRoutes.post(
  "/users/:userId/reset-password",
  zValidator("json", resetPasswordSchema),
  async (c) => {
    const userId = c.req.param("userId");
    const { newPassword } = c.req.valid("json");

    const targetUser = await db
      .selectFrom("users")
      .where("id", "=", userId)
      .select(["id", "email"])
      .executeTakeFirst();

    if (!targetUser) {
      return c.json(
        {
          error: "Not Found",
          message: "User not found",
        },
        404,
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .updateTable("users")
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where("id", "=", userId)
      .execute();

    // Invalidate existing sessions for security
    await db
      .deleteFrom("user_sessions")
      .where("user_id", "=", userId)
      .execute();

    return successMessage(
      c,
      `Password for ${targetUser.email} was successfully reset.`,
    );
  },
);

/**
 * GET /api/admin/usage
 * Detailed data usage breakdown per workspace
 */
adminRoutes.get("/usage", async (c) => {
  const companies = await db
    .selectFrom("companies")
    .select(["id", "name", "schema_name", "status", "created_at"])
    .orderBy("created_at", "desc")
    .execute();

  const owners = await db
    .selectFrom("company_members as cm")
    .innerJoin("users as u", "u.id", "cm.user_id")
    .where("cm.role", "=", "owner")
    .select([
      "cm.company_id",
      "u.id as owner_id",
      "u.email as owner_email",
      "u.name as owner_name",
    ])
    .execute();

  const ownerByCompany = new Map(
    owners.map((o) => [
      o.company_id,
      { id: o.owner_id, email: o.owner_email, name: o.owner_name },
    ]),
  );

  const memberCounts = await db
    .selectFrom("company_members")
    .select(["company_id", sql<number>`count(*)`.as("count")])
    .groupBy("company_id")
    .execute();

  const memberCountByCompany = new Map(
    memberCounts.map((m) => [m.company_id, Number(m.count)]),
  );

  const usageList = [];

  for (const company of companies) {
    const exists = await tenantSchemaExists(company.id);

    let totalMessages = 0;
    let inboundMessages = 0;
    let outboundMessages = 0;
    let mediaCount = 0;
    let mediaBytes = 0;
    let contactsCount = 0;
    let connectionsCount = 0;

    if (exists && company.status !== "deleted") {
      try {
        const stats = await sql<{
          total_messages: string | number;
          inbound_messages: string | number;
          outbound_messages: string | number;
          media_count: string | number;
          media_bytes: string | number;
          contacts_count: string | number;
          connections_count: string | number;
        }>`
          SELECT
            (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)}) as total_messages,
            (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)} WHERE from_me = false) as inbound_messages,
            (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)} WHERE from_me = true) as outbound_messages,
            (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".messages`)} WHERE media_url IS NOT NULL) as media_count,
            (SELECT coalesce(sum(media_size), 0) FROM ${sql.raw(`"${company.schema_name}".messages`)}) as media_bytes,
            (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".contacts`)}) as contacts_count,
            (SELECT count(*) FROM ${sql.raw(`"${company.schema_name}".whatsapp_connections`)} WHERE status = 'connected') as connections_count
        `.execute(db);

        const row = stats.rows[0];
        if (row) {
          totalMessages = Number(row.total_messages || 0);
          inboundMessages = Number(row.inbound_messages || 0);
          outboundMessages = Number(row.outbound_messages || 0);
          mediaCount = Number(row.media_count || 0);
          mediaBytes = Number(row.media_bytes || 0);
          contactsCount = Number(row.contacts_count || 0);
          connectionsCount = Number(row.connections_count || 0);
        }
      } catch {
        // Schema missing tables or during migration
      }
    }

    usageList.push({
      companyId: company.id,
      companyName: company.name,
      status: company.status,
      createdAt: company.created_at,
      owner: ownerByCompany.get(company.id) || null,
      memberCount: memberCountByCompany.get(company.id) || 0,
      totalMessages,
      inboundMessages,
      outboundMessages,
      mediaCount,
      storageBytes: mediaBytes,
      contactsCount,
      connectionsCount,
    });
  }

  return successData(c, usageList);
});
