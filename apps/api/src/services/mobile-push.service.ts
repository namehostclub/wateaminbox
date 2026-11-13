import { db } from "@wateaminbox/database";
import { createLogger, formatError } from "../lib/logger.js";

const logger = createLogger("MobilePushService");

export interface RegisterDeviceTokenInput {
  token: string;
  platform: "ios" | "android" | "web";
  deviceName?: string;
}

export interface MobilePushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
}

export interface MobilePushDeliverySummary {
  attempted: number;
  succeeded: number;
  failed: number;
  invalidTokensPruned: number;
}

/**
 * Registers or refreshes a device push token for a user and workspace.
 */
export async function registerDeviceToken(
  companyId: string,
  userId: string,
  input: RegisterDeviceTokenInput,
): Promise<void> {
  const now = new Date();
  await db
    .insertInto("user_device_tokens")
    .values({
      company_id: companyId,
      user_id: userId,
      token: input.token,
      platform: input.platform,
      device_name: input.deviceName ?? null,
      last_seen_at: now,
      created_at: now,
    })
    .onConflict((oc) =>
      oc.columns(["user_id", "token"]).doUpdateSet({
        company_id: companyId,
        platform: input.platform,
        device_name: input.deviceName ?? null,
        last_seen_at: now,
      }),
    )
    .execute();

  logger.info(
    { userId, companyId, platform: input.platform },
    "Registered mobile device push token",
  );
}

/**
 * Removes a specific device push token on logout or uninstallation.
 */
export async function deleteDeviceToken(
  userId: string,
  token: string,
): Promise<boolean> {
  const result = await db
    .deleteFrom("user_device_tokens")
    .where("user_id", "=", userId)
    .where("token", "=", token)
    .executeTakeFirst();

  return (result.numDeletedRows ?? 0n) > 0n;
}

/**
 * Removes all device push tokens for a user (e.g. account deactivation or total session purge).
 */
export async function deleteAllDeviceTokensForUser(
  userId: string,
): Promise<number> {
  const result = await db
    .deleteFrom("user_device_tokens")
    .where("user_id", "=", userId)
    .executeTakeFirst();

  return Number(result.numDeletedRows ?? 0n);
}

/**
 * Dispatches a push notification to all registered mobile devices for the given users.
 * Supports standard Expo Push Tokens (ExponentPushToken[...]) as well as direct push tokens.
 */
export async function sendMobilePushToUsers(
  companyId: string,
  userIds: string[],
  payload: MobilePushPayload,
): Promise<MobilePushDeliverySummary> {
  if (userIds.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, invalidTokensPruned: 0 };
  }

  const devices = await db
    .selectFrom("user_device_tokens")
    .select(["id", "token", "platform", "user_id"])
    .where("company_id", "=", companyId)
    .where("user_id", "in", userIds)
    .execute();

  if (devices.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, invalidTokensPruned: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  let invalidTokensPruned = 0;

  // Filter Expo push tokens
  const expoTokens = devices
    .filter((d) => d.token.startsWith("ExponentPushToken[") || d.token.startsWith("ExpoPushToken["))
    .map((d) => d.token);

  if (expoTokens.length > 0) {
    try {
      const messages = expoTokens.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: payload.sound ?? "default",
        badge: payload.badge,
        priority: "high",
        channelId: "messages",
      }));

      // Expo accepts batches of up to 100
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        const json = (await response.json()) as {
          data?: Array<{ status: string; id?: string; message?: string; details?: { error?: string } }>;
        };
        const tickets = json.data ?? [];
        const deadTokens: string[] = [];

        tickets.forEach((ticket, idx) => {
          if (ticket.status === "ok") {
            succeeded++;
          } else {
            failed++;
            if (ticket.details?.error === "DeviceNotRegistered") {
              const deadToken = expoTokens[idx];
              if (deadToken) deadTokens.push(deadToken);
            }
          }
        });

        // Prune stale tokens if any
        if (deadTokens.length > 0) {
          await db
            .deleteFrom("user_device_tokens")
            .where("token", "in", deadTokens)
            .execute();
          invalidTokensPruned += deadTokens.length;
          logger.info({ deadCount: deadTokens.length }, "Pruned dead Expo push tokens");
        }
      } else {
        failed += expoTokens.length;
        logger.warn(
          { status: response.status, statusText: response.statusText },
          "Expo push API returned error status",
        );
      }
    } catch (err) {
      failed += expoTokens.length;
      logger.error(
        { err: formatError(err) },
        "Exception while sending Expo push notifications",
      );
    }
  }

  return {
    attempted: devices.length,
    succeeded,
    failed,
    invalidTokensPruned,
  };
}
