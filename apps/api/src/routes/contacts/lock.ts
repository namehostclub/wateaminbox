import { toDbDate } from "@wateaminbox/shared";
import { Hono } from "hono";
import { z } from "zod";
import { badRequest, forbidden } from "../../lib/errors.js";
import { successData } from "../../lib/response.js";
import { zValidator } from "../../lib/validator.js";
import { getRouteContext } from "../../middleware/context.js";
import { requireContactVisibility } from "../../middleware/resource-visibility.js";
import { createAuditLog, getClientIp } from "../../services/audit.service.js";
import { resolveWorkflowContactId } from "../../services/channel-workflow.service.js";
import { resolveCanonicalContactId } from "../../services/contact-merge.service.js";
import {
  clearFailedAttempts,
  createUnlockToken,
  isAttemptBlocked,
  recordFailedAttempt,
} from "../../services/conversation-lock.service.js";

const setLockSchema = z.object({
  password: z.string().min(4, "Password must be at least 4 characters"),
  hint: z.string().max(100).optional().nullable(),
  currentPassword: z.string().optional(),
});

const unlockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

const removeLockSchema = z.object({
  currentPassword: z.string().optional(),
});

export const contactLockRoutes = new Hono();

contactLockRoutes.use("/:id/*", requireContactVisibility());

async function resolveEffectiveContactId(
  tenantDb: any,
  rawId: string,
): Promise<string> {
  const workflowContactId =
    (await resolveWorkflowContactId(tenantDb, rawId)) ?? rawId;
  const canonicalContactId =
    (await resolveCanonicalContactId(tenantDb, workflowContactId)) ??
    workflowContactId;
  return canonicalContactId;
}

/**
 * GET /contacts/:id/lock-status - Get lock status and hint
 */
contactLockRoutes.get("/:id/lock-status", async (c) => {
  const { tenantDb } = getRouteContext(c);
  const rawId = c.req.param("id");
  const contactId = await resolveEffectiveContactId(tenantDb, rawId);

  const lock = await tenantDb
    .selectFrom("conversation_locks")
    .select(["id", "hint", "created_at"])
    .where("contact_id", "=", contactId)
    .executeTakeFirst();

  return successData(c, {
    isPasswordProtected: Boolean(lock),
    hint: lock?.hint ?? null,
  });
});

/**
 * POST /contacts/:id/lock - Set or change conversation passcode
 */
contactLockRoutes.post(
  "/:id/lock",
  zValidator("json", setLockSchema),
  async (c) => {
    const { tenantDb, user, companyId } = getRouteContext(c);
    const rawId = c.req.param("id");
    const contactId = await resolveEffectiveContactId(tenantDb, rawId);
    const { password, hint, currentPassword } = c.req.valid("json");

    // Check existing lock
    const existingLock = await tenantDb
      .selectFrom("conversation_locks")
      .selectAll()
      .where("contact_id", "=", contactId)
      .executeTakeFirst();

    if (existingLock) {
      if (!currentPassword) {
        return badRequest(c, "Current password is required to change passcode");
      }
      const isValid = await Bun.password.verify(
        currentPassword,
        existingLock.password_hash,
      );
      if (!isValid) {
        return forbidden(c, "Current password is incorrect");
      }
    }

    const passwordHash = await Bun.password.hash(password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 2,
    });

    const conversation = await tenantDb
      .selectFrom("conversations")
      .select("id")
      .where("legacy_contact_id", "=", contactId)
      .where("archived_at", "is", null)
      .executeTakeFirst();

    if (existingLock) {
      await tenantDb
        .updateTable("conversation_locks")
        .set({
          password_hash: passwordHash,
          hint: hint ?? null,
          updated_at: toDbDate(new Date()),
        })
        .where("id", "=", existingLock.id)
        .execute();
    } else {
      await tenantDb
        .insertInto("conversation_locks")
        .values({
          contact_id: contactId,
          conversation_id: conversation?.id ?? null,
          password_hash: passwordHash,
          hint: hint ?? null,
          created_by_user_id: user.id,
          created_at: toDbDate(new Date()),
          updated_at: toDbDate(new Date()),
        })
        .execute();
    }

    await createAuditLog({
      companyId,
      userId: user.id,
      action: existingLock ? "contact.lock.updated" : "contact.lock.created",
      entityType: "contact",
      entityId: contactId,
      details: { hintProvided: Boolean(hint) },
      ipAddress: getClientIp(c),
    });

    const unlockToken = createUnlockToken(contactId, companyId, user.id);

    return successData(c, {
      success: true,
      isPasswordProtected: true,
      hint: hint ?? null,
      unlockToken,
    });
  },
);

/**
 * POST /contacts/:id/unlock - Verify passcode and obtain unlock token
 */
contactLockRoutes.post(
  "/:id/unlock",
  zValidator("json", unlockSchema),
  async (c) => {
    const { tenantDb, user, companyId } = getRouteContext(c);
    const rawId = c.req.param("id");
    const contactId = await resolveEffectiveContactId(tenantDb, rawId);
    const { password } = c.req.valid("json");
    const ip = getClientIp(c) || "127.0.0.1";

    if (isAttemptBlocked(contactId, ip)) {
      return c.json(
        {
          error:
            "Too many failed unlock attempts. Please wait 10 minutes before trying again.",
        },
        429,
      );
    }

    const lock = await tenantDb
      .selectFrom("conversation_locks")
      .select(["id", "password_hash"])
      .where("contact_id", "=", contactId)
      .executeTakeFirst();

    if (!lock) {
      // Not locked, return success with token
      const unlockToken = createUnlockToken(contactId, companyId, user.id);
      return successData(c, { success: true, unlocked: true, unlockToken });
    }

    const isValid = await Bun.password.verify(password, lock.password_hash);
    if (!isValid) {
      const { remainingAttempts, isBlocked } = recordFailedAttempt(contactId, ip);
      if (isBlocked) {
        return c.json(
          {
            error:
              "Too many failed unlock attempts. Locked out for 10 minutes.",
          },
          429,
        );
      }
      return c.json(
        {
          error: "Incorrect passcode",
          remainingAttempts,
        },
        401,
      );
    }

    clearFailedAttempts(contactId, ip);
    const unlockToken = createUnlockToken(contactId, companyId, user.id);

    return successData(c, {
      success: true,
      unlocked: true,
      unlockToken,
    });
  },
);

/**
 * DELETE /contacts/:id/lock - Remove passcode protection
 */
contactLockRoutes.delete(
  "/:id/lock",
  zValidator("json", removeLockSchema),
  async (c) => {
    const { tenantDb, user, companyId, role } = getRouteContext(c);
    const rawId = c.req.param("id");
    const contactId = await resolveEffectiveContactId(tenantDb, rawId);
    const { currentPassword } = c.req.valid("json");

    const existingLock = await tenantDb
      .selectFrom("conversation_locks")
      .selectAll()
      .where("contact_id", "=", contactId)
      .executeTakeFirst();

    if (!existingLock) {
      return successData(c, { success: true, isPasswordProtected: false });
    }

    // Require current password unless user is owner or admin
    const canBypassPassword = role === "owner" || role === "admin";
    if (!canBypassPassword) {
      if (!currentPassword) {
        return badRequest(c, "Current password is required to remove protection");
      }
      const isValid = await Bun.password.verify(
        currentPassword,
        existingLock.password_hash,
      );
      if (!isValid) {
        return forbidden(c, "Current password is incorrect");
      }
    }

    await tenantDb
      .deleteFrom("conversation_locks")
      .where("id", "=", existingLock.id)
      .execute();

    await createAuditLog({
      companyId,
      userId: user.id,
      action: "contact.lock.deleted",
      entityType: "contact",
      entityId: contactId,
      details: {},
      ipAddress: getClientIp(c),
    });

    return successData(c, {
      success: true,
      isPasswordProtected: false,
    });
  },
);
