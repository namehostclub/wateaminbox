import { describe, expect, test } from "bun:test";
import {
  clearFailedAttempts,
  createUnlockToken,
  isAttemptBlocked,
  recordFailedAttempt,
  verifyUnlockToken,
} from "./conversation-lock.service.js";

describe("Conversation Lock Service", () => {
  const contactId = "11111111-1111-1111-1111-111111111111";
  const companyId = "22222222-2222-2222-2222-222222222222";
  const userId = "33333333-3333-3333-3333-333333333333";

  describe("Unlock Token Minting and Verification", () => {
    test("mints a valid HMAC token that verifies successfully", () => {
      const token = createUnlockToken(contactId, companyId, userId);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const isValid = verifyUnlockToken(token, contactId, companyId);
      expect(isValid).toBe(true);
    });

    test("fails verification if contactId does not match", () => {
      const token = createUnlockToken(contactId, companyId, userId);
      const otherContact = "44444444-4444-4444-4444-444444444444";
      expect(verifyUnlockToken(token, otherContact, companyId)).toBe(false);
    });

    test("fails verification if companyId does not match", () => {
      const token = createUnlockToken(contactId, companyId, userId);
      const otherCompany = "55555555-5555-5555-5555-555555555555";
      expect(verifyUnlockToken(token, contactId, otherCompany)).toBe(false);
    });

    test("fails verification for tampered token", () => {
      const token = createUnlockToken(contactId, companyId, userId);
      const tampered = token.slice(0, -4) + "abcd";
      expect(verifyUnlockToken(tampered, contactId, companyId)).toBe(false);
    });

    test("fails verification for empty or malformed token", () => {
      expect(verifyUnlockToken("", contactId, companyId)).toBe(false);
      expect(verifyUnlockToken(undefined, contactId, companyId)).toBe(false);
      expect(verifyUnlockToken("not-a-token", contactId, companyId)).toBe(false);
    });
  });

  describe("Rate Limiting", () => {
    const ip = "192.168.1.100";
    const testContact = "66666666-6666-6666-6666-666666666666";

    test("tracks failed attempts and blocks after 5 tries", () => {
      clearFailedAttempts(testContact, ip);
      expect(isAttemptBlocked(testContact, ip)).toBe(false);

      const attempt1 = recordFailedAttempt(testContact, ip);
      expect(attempt1.remainingAttempts).toBe(4);
      expect(attempt1.isBlocked).toBe(false);

      recordFailedAttempt(testContact, ip); // 2
      recordFailedAttempt(testContact, ip); // 3
      recordFailedAttempt(testContact, ip); // 4
      const attempt5 = recordFailedAttempt(testContact, ip); // 5

      expect(attempt5.remainingAttempts).toBe(0);
      expect(attempt5.isBlocked).toBe(true);
      expect(isAttemptBlocked(testContact, ip)).toBe(true);

      // Clearing resets
      clearFailedAttempts(testContact, ip);
      expect(isAttemptBlocked(testContact, ip)).toBe(false);
    });
  });
});

