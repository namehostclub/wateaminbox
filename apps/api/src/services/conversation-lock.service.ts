import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../lib/env.js";

const UNLOCK_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const failedAttemptsMap = new Map<string, RateLimitEntry>();

function getRateLimitKey(contactId: string, ip: string): string {
  return `${contactId}:${ip}`;
}

export function isAttemptBlocked(contactId: string, ip: string): boolean {
  const key = getRateLimitKey(contactId, ip);
  const entry = failedAttemptsMap.get(key);
  if (!entry) return false;

  if (Date.now() > entry.resetAt) {
    failedAttemptsMap.delete(key);
    return false;
  }

  return entry.count >= MAX_FAILED_ATTEMPTS;
}

export function recordFailedAttempt(
  contactId: string,
  ip: string,
): { remainingAttempts: number; isBlocked: boolean } {
  const key = getRateLimitKey(contactId, ip);
  const now = Date.now();
  let entry = failedAttemptsMap.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + LOCKOUT_DURATION_MS };
  } else {
    entry.count += 1;
  }

  failedAttemptsMap.set(key, entry);

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - entry.count);
  return {
    remainingAttempts,
    isBlocked: entry.count >= MAX_FAILED_ATTEMPTS,
  };
}

export function clearFailedAttempts(contactId: string, ip: string): void {
  const key = getRateLimitKey(contactId, ip);
  failedAttemptsMap.delete(key);
}

/**
 * Mint a secure HMAC-signed unlock token for a conversation.
 */
export function createUnlockToken(
  contactId: string,
  companyId: string,
  userId: string,
): string {
  const expiresAt = Date.now() + UNLOCK_TOKEN_EXPIRATION_MS;
  const payload = `${contactId}:${companyId}:${userId}:${expiresAt}`;
  const signature = createHmac("sha256", env.JWT_SECRET)
    .update(`conv_unlock:${payload}`)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/**
 * Verify a conversation unlock token.
 */
export function verifyUnlockToken(
  token: string | undefined | null,
  contactId: string,
  companyId: string,
): boolean {
  if (!token) return false;

  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const parts = raw.split(":");
    if (parts.length !== 5) return false;

    const [tokenContactId, tokenCompanyId, _userId, expiresAtStr, signature] = parts;
    const expiresAt = Number(expiresAtStr);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false;
    }

    if (tokenContactId !== contactId || tokenCompanyId !== companyId) {
      return false;
    }

    const payload = `${tokenContactId}:${tokenCompanyId}:${_userId}:${expiresAtStr}`;
    const expectedSignature = createHmac("sha256", env.JWT_SECRET)
      .update(`conv_unlock:${payload}`)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

