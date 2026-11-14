import type { Message } from "@wateaminbox/shared";
import type { GalleryMediaItem } from "./types";

function timestamp(value: Date | string | undefined): number {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Checks whether a message qualifies as previewable gallery media.
 */
export function isPreviewableMediaMessage(message: Message): boolean {
  if (message.isDeleted) return false;
  if (message.metadata?.mediaPending && !message.metadata?.mediaUrl) {
    return false;
  }

  const type = message.messageType;
  if (type === "image" || type === "video" || type === "sticker" || type === "document") {
    const url = message.metadata?.mediaUrl || message.content;
    return Boolean(url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")));
  }

  return false;
}

/**
 * Extracts a GalleryMediaItem from a Message.
 */
export function messageToGalleryItem(message: Message): GalleryMediaItem | null {
  if (!isPreviewableMediaMessage(message)) return null;

  const url = message.metadata?.mediaUrl || message.content;
  const caption = message.metadata?.caption || (message.messageType === "document" ? "" : message.content);
  const mediaType = (
    message.messageType === "video"
      ? "video"
      : message.messageType === "document"
      ? "document"
      : message.messageType === "sticker"
      ? "sticker"
      : "image"
  ) as GalleryMediaItem["mediaType"];

  const senderName =
    message.sentByUserName ||
    message.senderName ||
    (message.senderType === "user" ? "You" : undefined);

  return {
    id: message.id,
    url,
    mediaType,
    caption: caption && caption.trim().length > 0 && caption !== url ? caption : undefined,
    fileName: message.metadata?.fileName,
    fileSize: message.metadata?.fileSize,
    mimeType: message.metadata?.mimeType,
    senderName,
    senderAvatarUrl: message.sentByUserAvatarUrl || message.senderAvatarUrl || undefined,
    timestamp: message.createdAt,
    isOwn: message.senderType === "user",
    thumbnailUrl: message.metadata?.thumbnailUrl,
    duration: message.metadata?.duration,
  };
}

/**
 * Extracts all gallery media items from a list of conversation messages.
 * Items are returned sorted chronologically by message creation time.
 */
export function extractGalleryMediaItems(messages: Message[]): GalleryMediaItem[] {
  const items: GalleryMediaItem[] = [];
  const seenIds = new Set<string>();

  for (const message of messages) {
    if (seenIds.has(message.id)) continue;
    const item = messageToGalleryItem(message);
    if (item) {
      seenIds.add(message.id);
      items.push(item);
    }
  }

  // Sort chronologically (oldest to newest)
  items.sort((a, b) => timestamp(a.timestamp) - timestamp(b.timestamp));

  return items;
}

