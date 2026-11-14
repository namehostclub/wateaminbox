import { describe, expect, test } from "bun:test";
import type { Message } from "@wateaminbox/shared";
import {
  extractGalleryMediaItems,
  isPreviewableMediaMessage,
  messageToGalleryItem,
} from "./media-viewer-items";

function mockMessage(id: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    conversationId: "test-conv",
    senderId: "test-sender",
    senderType: "contact",
    content: "hello",
    messageType: "text",
    status: "delivered",
    createdAt: new Date("2026-11-14T12:00:00Z"),
    updatedAt: new Date("2026-11-14T12:00:00Z"),
    ...overrides,
  };
}

describe("media-viewer-items", () => {
  test("identifies previewable media messages correctly", () => {
    const textMsg = mockMessage("1", { messageType: "text", content: "Hi" });
    expect(isPreviewableMediaMessage(textMsg)).toBe(false);

    const deletedImage = mockMessage("2", {
      messageType: "image",
      content: "https://example.com/pic.jpg",
      isDeleted: true,
    });
    expect(isPreviewableMediaMessage(deletedImage)).toBe(false);

    const pendingImage = mockMessage("3", {
      messageType: "image",
      metadata: { mediaPending: true },
    });
    expect(isPreviewableMediaMessage(pendingImage)).toBe(false);

    const validImage = mockMessage("4", {
      messageType: "image",
      metadata: { mediaUrl: "https://example.com/pic.jpg" },
    });
    expect(isPreviewableMediaMessage(validImage)).toBe(true);

    const validVideo = mockMessage("5", {
      messageType: "video",
      metadata: { mediaUrl: "https://example.com/vid.mp4" },
    });
    expect(isPreviewableMediaMessage(validVideo)).toBe(true);

    const item = messageToGalleryItem(validVideo);
    expect(item).not.toBeNull();
    expect(item?.url).toBe("https://example.com/vid.mp4");
    expect(item?.mediaType).toBe("video");
  });

  test("extracts and sorts gallery media items chronologically", () => {
    const messages: Message[] = [
      mockMessage("msg-2", {
        messageType: "image",
        metadata: { mediaUrl: "https://example.com/img2.jpg", caption: "Photo 2" },
        createdAt: new Date("2026-11-14T12:10:00Z"),
      }),
      mockMessage("msg-text", {
        messageType: "text",
        content: "Just a text message",
        createdAt: new Date("2026-11-14T12:05:00Z"),
      }),
      mockMessage("msg-1", {
        messageType: "image",
        metadata: { mediaUrl: "https://example.com/img1.jpg", caption: "Photo 1" },
        createdAt: new Date("2026-11-14T12:00:00Z"),
      }),
      mockMessage("msg-3", {
        messageType: "video",
        metadata: { mediaUrl: "https://example.com/vid1.mp4", duration: 42 },
        createdAt: new Date("2026-11-14T12:20:00Z"),
      }),
    ];

    const items = extractGalleryMediaItems(messages);
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe("msg-1");
    expect(items[1].id).toBe("msg-2");
    expect(items[2].id).toBe("msg-3");
    expect(items[2].mediaType).toBe("video");
    expect(items[2].duration).toBe(42);
  });
});

