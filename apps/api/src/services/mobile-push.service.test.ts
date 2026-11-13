import { describe, expect, it } from "bun:test";
import {
  sendMobilePushToUsers,
} from "./mobile-push.service.js";

describe("mobilePushService", () => {
  it("sendMobilePushToUsers returns zero deliveries when userIds is empty", async () => {
    const summary = await sendMobilePushToUsers(
      "00000000-0000-0000-0000-000000000001",
      [],
      {
        title: "Test",
        body: "Hello",
      },
    );

    expect(summary.attempted).toBe(0);
    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(0);
  });
});
