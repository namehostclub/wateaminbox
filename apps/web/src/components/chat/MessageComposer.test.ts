import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./MessageComposer.tsx", import.meta.url),
  "utf8",
);

/**
 * Slice the source between two unique markers so assertions stay scoped to
 * the handler that owns the bug. A bare `toContain` over the whole file would
 * pass on the text surface alone and hide a regression confined to the
 * attachment surface, which is exactly the defect this guard exists to catch.
 */
function extractBetween(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
  return source.slice(start, end);
}

describe("MessageComposer: reply context threads through every send surface", () => {
  describe("handleScheduleAttachment (scheduled attachment)", () => {
    const body = () =>
      extractBetween(
        "const handleScheduleAttachment = async (",
        "const handleFileSelect = (",
      );

    it("threads replyToMessageId into the schedule mutation payload", () => {
      expect(body()).toContain("replyToMessageId: replyToMessage?.id");
    });

    it("passes the attachment media and caption alongside the reply", () => {
      const handler = body();
      expect(handler).toContain("mediaUrl: upload.mediaUrl");
      expect(handler).toContain("content: caption");
      expect(handler).toContain("scheduledAt: scheduledAtIso");
      expect(handler).toContain("replyToMessageId: replyToMessage?.id");
    });
  });

  describe("handleSchedule (scheduled text) — regression guard", () => {
    const body = () =>
      extractBetween(
        "const handleSchedule = async (",
        "const handleScheduleAttachment = async (",
      );

    it("still threads replyToMessageId", () => {
      expect(body()).toContain("scheduleMessageMutation.mutate(");
      expect(body()).toContain("replyToMessageId: replyToMessage?.id");
    });
  });

  describe("handleSend (immediate text) — regression guard", () => {
    const body = () =>
      extractBetween("const handleSend = async (", "const handleSchedule =");

    it("still forwards the picked reply to onSendMessage", () => {
      expect(body()).toContain("onSendMessage(");
      expect(body()).toContain("replyToMessage?.id");
    });
  });

  describe("voice recording and audio messaging", () => {
    it("renders microphone button when message input is empty", () => {
      expect(source).toContain("message.trim() ? (");
      expect(source).toContain("<Send className=\"size-5.5\"");
      expect(source).toContain("voiceRecorder.startRecording()");
      expect(source).toContain("<Mic className=\"size-5.5\"");
    });

    it("renders VoiceRecorderBar when recording is active or paused", () => {
      expect(source).toContain("voiceRecorder.isRecording || voiceRecorder.isPaused ? (");
      expect(source).toContain("<VoiceRecorderBar");
      expect(source).toContain("handleSendVoiceRecording");
    });

    it("provides audio option in attachment menu", () => {
      expect(source).toContain('features.attachmentTypes.includes("audio")');
      expect(source).toContain('triggerFileInput("audio")');
      expect(source).toContain('accept="audio/*');
    });
  });
});
