import { describe, expect, it } from "bun:test";
import {
  assertSafeUrl,
  clearPreviewCache,
  getLinkPreview,
  isDisallowedIp,
} from "./link-preview.service.js";

describe("link-preview.service", () => {
  describe("isDisallowedIp", () => {
    it("flags IPv4 loopback as disallowed", () => {
      expect(isDisallowedIp("127.0.0.1")).toBe(true);
      expect(isDisallowedIp("127.10.20.30")).toBe(true);
    });

    it("flags RFC 1918 private IPv4 addresses as disallowed", () => {
      expect(isDisallowedIp("10.0.0.1")).toBe(true);
      expect(isDisallowedIp("172.16.0.1")).toBe(true);
      expect(isDisallowedIp("172.31.255.255")).toBe(true);
      expect(isDisallowedIp("192.168.1.1")).toBe(true);
    });

    it("flags AWS/GCP cloud metadata IP 169.254.169.254 as disallowed", () => {
      expect(isDisallowedIp("169.254.169.254")).toBe(true);
      expect(isDisallowedIp("169.254.1.1")).toBe(true);
    });

    it("flags Carrier-grade NAT (100.64.0.0/10) as disallowed", () => {
      expect(isDisallowedIp("100.64.0.1")).toBe(true);
      expect(isDisallowedIp("100.127.255.254")).toBe(true);
    });

    it("flags IPv6 loopback and link-local as disallowed", () => {
      expect(isDisallowedIp("::1")).toBe(true);
      expect(isDisallowedIp("fe80::1")).toBe(true);
      expect(isDisallowedIp("fc00::1")).toBe(true);
      expect(isDisallowedIp("fd12:3456:789a::1")).toBe(true);
    });

    it("flags IPv4-mapped IPv6 loopback as disallowed", () => {
      expect(isDisallowedIp("::ffff:127.0.0.1")).toBe(true);
      expect(isDisallowedIp("::ffff:192.168.1.1")).toBe(true);
    });

    it("allows public routable IPv4 addresses", () => {
      expect(isDisallowedIp("8.8.8.8")).toBe(false);
      expect(isDisallowedIp("1.1.1.1")).toBe(false);
      expect(isDisallowedIp("91.229.63.91")).toBe(false);
    });
  });

  describe("assertSafeUrl", () => {
    it("rejects non-HTTP protocols", async () => {
      await expect(assertSafeUrl(new URL("ftp://ftp.example.com"))).rejects.toThrow(
        "Only HTTP and HTTPS are allowed",
      );
      await expect(assertSafeUrl(new URL("file:///etc/passwd"))).rejects.toThrow(
        "Only HTTP and HTTPS are allowed",
      );
    });

    it("rejects localhost and loopback domains", async () => {
      await expect(assertSafeUrl(new URL("http://localhost:3000"))).rejects.toThrow(
        "Target hostname is restricted",
      );
      await expect(assertSafeUrl(new URL("http://app.local"))).rejects.toThrow(
        "Target hostname is restricted",
      );
      await expect(assertSafeUrl(new URL("http://127.0.0.1:4447"))).rejects.toThrow(
        "Target IP address is restricted",
      );
    });

    it("rejects cloud metadata IP directly in URL", async () => {
      await expect(
        assertSafeUrl(new URL("http://169.254.169.254/latest/meta-data")),
      ).rejects.toThrow("Target IP address is restricted");
    });
  });

  describe("getLinkPreview", () => {
    it("extracts live metadata from public website", async () => {
      clearPreviewCache();
      const preview = await getLinkPreview("https://ayyansystems.com");
      expect(preview.domain).toBe("ayyansystems.com");
      expect(preview.title).toContain("Ayyan Systems");
      expect(typeof preview.description).toBe("string");
      expect(preview.imageUrl).toContain("ayyansystems.com");
    });

    it("caches preview for repeated queries", async () => {
      clearPreviewCache();
      const first = await getLinkPreview("https://ayyansystems.com");
      const second = await getLinkPreview("https://ayyansystems.com");
      expect(first).toEqual(second);
    });
  });
});

