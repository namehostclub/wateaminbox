/**
 * Rules for turning a drag-and-drop file payload into composer attachments.
 *
 * Kept free of React so file type decisions, gallery bundling, and payload validation
 * stay strictly unit-testable.
 */

import { appendGalleryFiles, type PendingAttachment } from "./media-gallery";

/** Checks if a drag event carries OS files rather than internal text or link dragging. */
export function hasDragFiles(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer) return false;
  return Array.from(dataTransfer.types).includes("Files");
}

/**
 * Parses files dropped into the chat composer into pending attachments.
 */
export function pickDroppedAttachments(
  fileList: ArrayLike<File> | null | undefined,
): PendingAttachment[] {
  if (!fileList || fileList.length === 0) return [];
  const files = Array.from(fileList).filter((f) => f && f.size > 0);
  if (files.length === 0) return [];

  // If all files are images or videos, queue them as an image gallery (up to MAX_MEDIA_GALLERY_ITEMS)
  const areAllVisual = files.every(
    (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
  );

  if (areAllVisual) {
    const gallery = appendGalleryFiles([], files);
    return gallery.attachments;
  }

  // Audio files
  if (files.length === 1 && files[0].type.startsWith("audio/")) {
    return [{ file: files[0], type: "audio" }];
  }

  // If mixed or documents, default to document type for each file
  return files.map((file) => ({
    file,
    type: (file.type.startsWith("image/") || file.type.startsWith("video/")
      ? "image"
      : file.type.startsWith("audio/")
        ? "audio"
        : "document") as "image" | "document" | "audio",
  }));
}

