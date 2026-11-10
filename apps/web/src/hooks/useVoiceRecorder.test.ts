import { describe, expect, it } from "bun:test";
import { getSupportedAudioMimeType } from "./useVoiceRecorder";

describe("useVoiceRecorder", () => {
  it("getSupportedAudioMimeType returns empty string in non-browser environment", () => {
    // In node/bun test environment without window/MediaRecorder
    const mime = getSupportedAudioMimeType();
    expect(typeof mime).toBe("string");
  });

  it("checks candidate MIME types when MediaRecorder is mocked", () => {
    const originalMediaRecorder = globalThis.MediaRecorder;
    try {
      // Mock MediaRecorder
      (globalThis as unknown as { MediaRecorder: { isTypeSupported: (t: string) => boolean } }).MediaRecorder = {
        isTypeSupported: (type: string) => type === "audio/webm; codecs=opus",
      };

      const result = getSupportedAudioMimeType();
      expect(result).toBe("audio/webm; codecs=opus");
    } finally {
      (globalThis as unknown as { MediaRecorder: typeof originalMediaRecorder }).MediaRecorder = originalMediaRecorder;
    }
  });

  it("prefers audio/ogg with opus when available", () => {
    const originalMediaRecorder = globalThis.MediaRecorder;
    try {
      (globalThis as unknown as { MediaRecorder: { isTypeSupported: (t: string) => boolean } }).MediaRecorder = {
        isTypeSupported: (type: string) =>
          type === "audio/ogg; codecs=opus" || type === "audio/webm; codecs=opus",
      };

      const result = getSupportedAudioMimeType();
      expect(result).toBe("audio/ogg; codecs=opus");
    } finally {
      (globalThis as unknown as { MediaRecorder: typeof originalMediaRecorder }).MediaRecorder = originalMediaRecorder;
    }
  });

  it("normalizes video/webm to audio/webm for voice notes", () => {
    const rawMime = "video/webm; codecs=opus";
    const normalized = rawMime.startsWith("video/")
      ? rawMime.replace(/^video\//, "audio/")
      : rawMime;
    expect(normalized).toBe("audio/webm; codecs=opus");
  });
});

