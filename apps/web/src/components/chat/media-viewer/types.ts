export interface GalleryMediaItem {
  id: string; // Message ID or unique media identifier
  url: string; // URL to media
  mediaType: "image" | "video" | "document" | "sticker";
  caption?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  timestamp?: string | Date;
  isOwn?: boolean;
  thumbnailUrl?: string;
  duration?: number;
}

export interface MediaViewerState {
  isOpen: boolean;
  activeId: string | null;
  items: GalleryMediaItem[];
  currentIndex: number;
}

