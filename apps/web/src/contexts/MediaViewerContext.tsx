import type { Message } from "@wateaminbox/shared";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  extractGalleryMediaItems,
} from "@/components/chat/media-viewer/media-viewer-items";
import type { GalleryMediaItem } from "@/components/chat/media-viewer/types";

export interface MediaViewerContextValue {
  isOpen: boolean;
  activeItem: GalleryMediaItem | null;
  items: GalleryMediaItem[];
  currentIndex: number;
  totalCount: number;
  openMedia: (messageId: string, customItems?: GalleryMediaItem[]) => void;
  closeMedia: () => void;
  nextMedia: () => void;
  prevMedia: () => void;
  goToIndex: (index: number) => void;
}

const MediaViewerContext = createContext<MediaViewerContextValue | undefined>(
  undefined,
);

interface MediaViewerProviderProps {
  children: ReactNode;
  messages?: Message[];
}

export function MediaViewerProvider({
  children,
  messages = [],
}: MediaViewerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [overrideItems, setOverrideItems] = useState<GalleryMediaItem[] | null>(
    null,
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // Derived gallery items from messages
  const baseItems = useMemo(
    () => extractGalleryMediaItems(messages),
    [messages],
  );

  const activeItems = overrideItems ?? baseItems;
  const totalCount = activeItems.length;

  const activeItem =
    totalCount > 0 && currentIndex >= 0 && currentIndex < totalCount
      ? activeItems[currentIndex]
      : null;

  const openMedia = useCallback(
    (messageId: string, customItems?: GalleryMediaItem[]) => {
      const itemsToUse = customItems && customItems.length > 0 ? customItems : baseItems;
      if (customItems && customItems.length > 0) {
        setOverrideItems(customItems);
      } else {
        setOverrideItems(null);
      }

      const foundIndex = itemsToUse.findIndex(
        (item) => item.id === messageId || item.url === messageId,
      );
      setCurrentIndex(foundIndex >= 0 ? foundIndex : 0);
      setIsOpen(true);
    },
    [baseItems],
  );

  const closeMedia = useCallback(() => {
    setIsOpen(false);
    setOverrideItems(null);
  }, []);

  const nextMedia = useCallback(() => {
    if (totalCount <= 1) return;
    setCurrentIndex((prev) => (prev + 1 < totalCount ? prev + 1 : 0));
  }, [totalCount]);

  const prevMedia = useCallback(() => {
    if (totalCount <= 1) return;
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalCount - 1));
  }, [totalCount]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalCount) {
        setCurrentIndex(index);
      }
    },
    [totalCount],
  );

  const contextValue = useMemo<MediaViewerContextValue>(
    () => ({
      isOpen,
      activeItem,
      items: activeItems,
      currentIndex,
      totalCount,
      openMedia,
      closeMedia,
      nextMedia,
      prevMedia,
      goToIndex,
    }),
    [
      isOpen,
      activeItem,
      activeItems,
      currentIndex,
      totalCount,
      openMedia,
      closeMedia,
      nextMedia,
      prevMedia,
      goToIndex,
    ],
  );

  return (
    <MediaViewerContext.Provider value={contextValue}>
      {children}
    </MediaViewerContext.Provider>
  );
}

export function useMediaViewer(): MediaViewerContextValue {
  const context = useContext(MediaViewerContext);
  if (!context) {
    // Return a safe fallback so components can still call openMedia safely
    return {
      isOpen: false,
      activeItem: null,
      items: [],
      currentIndex: 0,
      totalCount: 0,
      openMedia: () => {},
      closeMedia: () => {},
      nextMedia: () => {},
      prevMedia: () => {},
      goToIndex: () => {},
    };
  }
  return context;
}

