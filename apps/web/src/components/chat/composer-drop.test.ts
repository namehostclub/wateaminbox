import { describe, expect, it } from "bun:test";
import { hasDragFiles, pickDroppedAttachments } from "./composer-drop";

describe("hasDragFiles", () => {
  it("returns true when types include 'Files'", () => {
    const dt = { types: ["Files"] } as unknown as DataTransfer;
    expect(hasDragFiles(dt)).toBe(true);
  });

  it("returns false for null, undefined, or text drags", () => {
    expect(hasDragFiles(null)).toBe(false);
    expect(hasDragFiles(undefined)).toBe(false);
    const textDt = { types: ["text/plain"] } as unknown as DataTransfer;
    expect(hasDragFiles(textDt)).toBe(false);
  });
});

describe("pickDroppedAttachments", () => {
  it("returns empty array for empty or zero-byte file lists", () => {
    expect(pickDroppedAttachments(null)).toEqual([]);
    expect(pickDroppedAttachments([])).toEqual([]);
    const emptyFile = new File([], "empty.png", { type: "image/png" });
    expect(pickDroppedAttachments([emptyFile])).toEqual([]);
  });

  it("bundles multiple images/videos into an image gallery", () => {
    const img1 = new File(["bytes1"], "photo1.png", { type: "image/png" });
    const img2 = new File(["bytes2"], "video1.mp4", { type: "video/mp4" });
    const attachments = pickDroppedAttachments([img1, img2]);
    expect(attachments).toHaveLength(2);
    expect(attachments[0].type).toBe("image");
    expect(attachments[1].type).toBe("image");
  });

  it("handles audio files correctly", () => {
    const audio = new File(["audio-bytes"], "voice.mp3", { type: "audio/mp3" });
    const attachments = pickDroppedAttachments([audio]);
    expect(attachments).toHaveLength(1);
    expect(attachments[0].type).toBe("audio");
  });

  it("routes documents and mixed files correctly", () => {
    const pdf = new File(["pdf-bytes"], "contract.pdf", { type: "application/pdf" });
    const attachments = pickDroppedAttachments([pdf]);
    expect(attachments).toHaveLength(1);
    expect(attachments[0].type).toBe("document");
  });
});

