import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Film,
  Maximize,
  Minimize,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMediaViewer } from "@/contexts";
import type { GalleryMediaItem } from "./media-viewer/types";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export interface MediaLightboxProps {
  /** Legacy optional explicit open control */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Legacy single-item props */
  src?: string;
  alt?: string;
  caption?: string;
  mediaType?: "document" | "image" | "video" | "sticker";
  /** Optional custom items to display instead of conversation items */
  items?: GalleryMediaItem[];
  initialIndex?: number;
}

export function MediaLightbox({
  open: explicitOpen,
  onOpenChange: explicitOnOpenChange,
  src: legacySrc,
  alt: legacyAlt,
  caption: legacyCaption,
  mediaType: legacyMediaType = "image",
  items: explicitItems,
  initialIndex = 0,
}: MediaLightboxProps) {
  const { t } = useTranslation();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);

  // Connect to centralized MediaViewerContext
  const mediaViewer = useMediaViewer();

  // Determine whether we are in controlled mode (legacy) or context mode
  const isControlled = explicitOpen !== undefined;
  const isOpen = isControlled ? explicitOpen : mediaViewer.isOpen;

  // Local state for navigation if explicit items are passed
  const [localIndex, setLocalIndex] = useState(initialIndex);

  // Image manipulation state
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);

  // Touch gesture state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Resolve media items list
  const items: GalleryMediaItem[] = isControlled
    ? explicitItems && explicitItems.length > 0
      ? explicitItems
      : legacySrc
      ? [
          {
            id: "legacy",
            url: legacySrc,
            caption: legacyCaption,
            mediaType: legacyMediaType,
            fileName: legacyAlt,
          },
        ]
      : []
    : mediaViewer.items;

  const totalCount = items.length;
  const currentIndex = isControlled ? localIndex : mediaViewer.currentIndex;

  const activeItem: GalleryMediaItem | null =
    totalCount > 0 && currentIndex >= 0 && currentIndex < totalCount
      ? items[currentIndex]
      : legacySrc
      ? {
          id: "fallback",
          url: legacySrc,
          caption: legacyCaption,
          mediaType: legacyMediaType,
          fileName: legacyAlt,
        }
      : null;

  const activeSrc = activeItem?.url || legacySrc || "";
  const activeCaption = activeItem?.caption || legacyCaption;
  const activeMediaType = activeItem?.mediaType || legacyMediaType;
  const activeFileName = activeItem?.fileName || legacyAlt || "media";
  const isImage = activeMediaType === "image" || activeMediaType === "sticker";
  const isVideo = activeMediaType === "video";
  const isDocument = activeMediaType === "document";

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (totalCount <= 1) return;
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    if (isControlled) {
      setLocalIndex((prev) => (prev + 1 < totalCount ? prev + 1 : 0));
    } else {
      mediaViewer.nextMedia();
    }
  }, [totalCount, isControlled, mediaViewer]);

  const handlePrev = useCallback(() => {
    if (totalCount <= 1) return;
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    if (isControlled) {
      setLocalIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalCount - 1));
    } else {
      mediaViewer.prevMedia();
    }
  }, [totalCount, isControlled, mediaViewer]);

  const handleGoToIndex = useCallback(
    (index: number) => {
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      if (isControlled) {
        setLocalIndex(index);
      } else {
        mediaViewer.goToIndex(index);
      }
    },
    [isControlled, mediaViewer],
  );

  const handleClose = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    if (isControlled) {
      explicitOnOpenChange?.(false);
    } else {
      mediaViewer.closeMedia();
    }
  }, [isControlled, explicitOnOpenChange, mediaViewer]);

  // Reset transforms whenever active item changes
  useEffect(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, [currentIndex]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentIndex]);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handlePrev();
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        case "+":
        case "=":
          e.preventDefault();
          setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
          break;
        case "-":
        case "_":
          e.preventDefault();
          setZoom((current) => {
            const next = Math.max(MIN_ZOOM, current - ZOOM_STEP);
            if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
            return next;
          });
          break;
        case "0":
          e.preventDefault();
          setZoom(MIN_ZOOM);
          setPan({ x: 0, y: 0 });
          setRotation(0);
          break;
        case "r":
        case "R":
          e.preventDefault();
          setRotation((current) => (current + 90) % 360);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "d":
        case "D":
          e.preventDefault();
          handleDownload();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleClose]);

  // Zoom helpers
  const zoomIn = () =>
    setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
  const zoomOut = () =>
    setZoom((current) => {
      const next = Math.max(MIN_ZOOM, current - ZOOM_STEP);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  const resetZoom = () => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };
  const rotateClockwise = () =>
    setRotation((current) => (current + 90) % 360);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!isImage) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((current) => Math.min(MAX_ZOOM, current + 0.25));
    } else {
      setZoom((current) => {
        const next = Math.max(MIN_ZOOM, current - 0.25);
        if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse drag-to-pan handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (zoom <= MIN_ZOOM) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanning || zoom <= MIN_ZOOM) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch gesture handlers for mobile swipe & pan
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      if (zoom > MIN_ZOOM) {
        setIsPanning(true);
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (zoom > MIN_ZOOM && isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    setIsPanning(false);
    if (zoom === MIN_ZOOM && touchStartRef.current) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Detect horizontal swipe (at least 50px in under 400ms with low vertical variance)
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 60 && deltaTime < 400) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
    touchStartRef.current = null;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Download media
  const handleDownload = async () => {
    if (!activeSrc) return;
    try {
      const response = await fetch(activeSrc);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const ext = blob.type.split("/")[1] || (isVideo ? "mp4" : "jpg");
      link.download = activeFileName.includes(".")
        ? activeFileName
        : `${activeFileName}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (_err) {
      window.open(activeSrc, "_blank");
    }
  };

  // Copy image to clipboard
  const handleCopy = async () => {
    if (!activeSrc) return;
    try {
      const response = await fetch(activeSrc);
      const blob = await response.blob();
      if (navigator.clipboard && "write" in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        toast.success(t("chat.copiedMedia", "Image copied to clipboard"));
        return;
      }
      throw new Error("Clipboard write unsupported");
    } catch (_err) {
      // Fallback: copy link
      await navigator.clipboard.writeText(activeSrc);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
      toast.success(t("chat.copiedMedia", "Media link copied to clipboard"));
    }
  };

  if (!isOpen) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-[#0b141a]/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={containerRef}
          className="fixed inset-0 z-[71] flex flex-col text-white outline-none select-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-describedby={activeCaption ? descriptionId : undefined}
          onMouseUp={handleMouseUp}
        >
          <DialogPrimitive.Title className="sr-only">
            {activeFileName}
          </DialogPrimitive.Title>

          {/* TOP HEADER BAR */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#111b21]/90 px-3 backdrop-blur-md sm:px-5">
            {/* Left section: Close + Sender Info + Counter */}
            <div className="flex min-w-0 items-center gap-3">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  onClick={handleClose}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]"
                  aria-label="Close"
                  title={`${t("common.close", "Close")} (Esc)`}
                >
                  <X className="size-5.5" aria-hidden="true" />
                </button>
              </DialogPrimitive.Close>

              {/* Sender Details */}
              <div className="flex min-w-0 items-center gap-2.5">
                {activeItem?.senderAvatarUrl ? (
                  <img
                    src={activeItem.senderAvatarUrl}
                    alt=""
                    className="size-8.5 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : activeItem?.senderName ? (
                  <div className="grid size-8.5 place-items-center rounded-full bg-[#00a884] text-xs font-semibold text-white">
                    {activeItem.senderName.slice(0, 2).toUpperCase()}
                  </div>
                ) : null}

                <div className="min-w-0 flex flex-col">
                  {activeItem?.senderName && (
                    <span className="truncate text-sm font-semibold text-white/95">
                      {activeItem.senderName}
                    </span>
                  )}
                  <span className="truncate text-xs text-white/60">
                    {activeItem?.timestamp
                      ? new Date(activeItem.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : activeFileName}
                  </span>
                </div>
              </div>

              {/* Counter Badge: 3 of 12 */}
              {totalCount > 1 && (
                <div className="ml-2 hidden rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/85 sm:inline-flex">
                  {t("chat.mediaCounter", {
                    defaultValue: "{{current}} of {{total}}",
                    current: currentIndex + 1,
                    total: totalCount,
                  })}
                </div>
              )}
            </div>

            {/* Right section: Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Rotate Image */}
              {isImage && (
                <button
                  type="button"
                  onClick={rotateClockwise}
                  className="grid size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  title={`${t("chat.rotate", "Rotate")} (R)`}
                  aria-label={t("chat.rotate", "Rotate")}
                >
                  <RotateCw className="size-4.5" aria-hidden="true" />
                </button>
              )}

              {/* Zoom Controls */}
              {isImage && (
                <div className="hidden items-center gap-0.5 sm:flex">
                  <button
                    type="button"
                    onClick={zoomOut}
                    disabled={zoom <= MIN_ZOOM}
                    className="grid size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    title={`${t("chat.zoomOut", "Zoom out")} (-)`}
                    aria-label={t("chat.zoomOut", "Zoom out")}
                  >
                    <Minus className="size-4.5" aria-hidden="true" />
                  </button>

                  <span className="min-w-[42px] text-center text-xs font-semibold tabular-nums text-white/75">
                    {Math.round(zoom * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={zoom >= MAX_ZOOM}
                    className="grid size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    title={`${t("chat.zoomIn", "Zoom in")} (+)`}
                    aria-label={t("chat.zoomIn", "Zoom in")}
                  >
                    <Plus className="size-4.5" aria-hidden="true" />
                  </button>

                  {(zoom !== MIN_ZOOM || rotation !== 0) && (
                    <button
                      type="button"
                      onClick={resetZoom}
                      className="grid size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      title={`${t("chat.resetZoom", "Reset zoom")} (0)`}
                      aria-label={t("chat.resetZoom", "Reset zoom")}
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="hidden size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:grid"
                title={`${isFullscreen ? t("chat.exitFullscreen", "Exit full screen") : t("chat.fullscreen", "Full screen")} (F)`}
                aria-label={t("chat.fullscreen", "Full screen")}
              >
                {isFullscreen ? (
                  <Minimize className="size-4.5" aria-hidden="true" />
                ) : (
                  <Maximize className="size-4.5" aria-hidden="true" />
                )}
              </button>

              {/* Copy Image / Link */}
              {isImage && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="grid size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  title={t("chat.copyMedia", "Copy image")}
                  aria-label={t("chat.copyMedia", "Copy image")}
                >
                  {hasCopied ? (
                    <Check className="size-4.5 text-[#00a884]" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4.5" aria-hidden="true" />
                  )}
                </button>
              )}

              {/* Toggle Thumbnails */}
              {totalCount > 1 && (
                <button
                  type="button"
                  onClick={() => setShowThumbnails((prev) => !prev)}
                  className={`grid size-9.5 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-white ${
                    showThumbnails ? "text-[#00a884]" : "text-white/80"
                  }`}
                  title={t("chat.toggleThumbnails", "Toggle thumbnails")}
                  aria-label={t("chat.toggleThumbnails", "Toggle thumbnails")}
                >
                  <Film className="size-4.5" aria-hidden="true" />
                </button>
              )}

              {/* Download */}
              <button
                type="button"
                onClick={handleDownload}
                className="grid size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title={`${t("chat.downloadMedia", "Download")} (D)`}
                aria-label={t("chat.downloadMedia", "Download")}
              >
                <Download className="size-4.5" aria-hidden="true" />
              </button>

              {/* Open Original */}
              <a
                href={activeSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-9.5 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title={t("chat.openOriginal", "Open original")}
                aria-label={t("chat.openOriginal", "Open original")}
              >
                <ExternalLink className="size-4.5" aria-hidden="true" />
              </a>
            </div>
          </header>

          {/* MAIN CANVAS AREA WITH PREVIOUS / NEXT BUTTONS */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-6"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => {
              if (e.target === e.currentTarget && zoom === MIN_ZOOM) {
                handleClose();
              }
            }}
          >
            {/* FLOATING PREVIOUS BUTTON */}
            {totalCount > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="group absolute left-3 z-30 grid size-12 place-items-center rounded-full bg-[#111b21]/70 text-white/80 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-[#111b21]/95 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884] sm:left-6 sm:size-14"
                title={`${t("chat.previousMedia", "Previous")} (Left Arrow)`}
                aria-label={t("chat.previousMedia", "Previous")}
              >
                <ChevronLeft className="size-6 sm:size-7 transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}

            {/* FLOATING NEXT BUTTON */}
            {totalCount > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="group absolute right-3 z-30 grid size-12 place-items-center rounded-full bg-[#111b21]/70 text-white/80 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-[#111b21]/95 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884] sm:right-6 sm:size-14"
                title={`${t("chat.nextMedia", "Next")} (Right Arrow)`}
                aria-label={t("chat.nextMedia", "Next")}
              >
                <ChevronRight className="size-6 sm:size-7 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            {/* MEDIA CONTENT */}
            {isImage ? (
              <div
                className={`relative flex max-h-full max-w-full items-center justify-center transition-transform ${
                  isPanning ? "cursor-grabbing" : zoom > MIN_ZOOM ? "cursor-grab" : "cursor-default"
                }`}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: isPanning ? "none" : "transform 0.15s ease-out",
                }}
                onDoubleClick={() => {
                  if (zoom === MIN_ZOOM) {
                    setZoom(2);
                  } else {
                    resetZoom();
                  }
                }}
              >
                <img
                  src={activeSrc}
                  alt={activeFileName}
                  draggable={false}
                  className="max-h-[82vh] max-w-[90vw] select-none rounded-sm object-contain shadow-2xl shadow-black/60 pointer-events-none"
                />
              </div>
            ) : isVideo ? (
              <div className="relative flex max-h-full max-w-full items-center justify-center">
                <video
                  key={activeSrc}
                  src={activeSrc}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[82vh] max-w-[90vw] rounded-lg bg-black object-contain shadow-2xl shadow-black/60"
                  aria-label={activeFileName}
                />
              </div>
            ) : isDocument ? (
              <iframe
                src={activeSrc}
                title={activeFileName}
                className="h-[80vh] w-full max-w-5xl rounded-lg border-0 bg-white shadow-2xl shadow-black/50"
              />
            ) : null}

            {/* FLOATING CAPTION BAR */}
            {activeCaption && (
              <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center px-4">
                <div className="pointer-events-auto max-w-2xl rounded-2xl border border-white/10 bg-[#111b21]/90 px-5 py-2.5 text-center text-sm font-medium leading-relaxed text-white/95 shadow-xl backdrop-blur-md">
                  {activeCaption}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM THUMBNAIL FILMSTRIP RIBBON (LIGHTGALLERY & WHATSAPP WEB STYLE) */}
          {totalCount > 1 && showThumbnails && (
            <div className="relative z-30 shrink-0 border-t border-white/10 bg-[#111b21]/92 backdrop-blur-md transition-all">
              <div className="flex h-20 items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-thin scrollbar-thumb-white/20">
                {items.map((item, idx) => {
                  const isActive = idx === currentIndex;
                  const isItemVideo = item.mediaType === "video";
                  return (
                    <button
                      key={item.id || idx}
                      ref={isActive ? activeThumbnailRef : undefined}
                      type="button"
                      onClick={() => handleGoToIndex(idx)}
                      className={`group relative size-14 shrink-0 overflow-hidden rounded-lg transition-all focus-visible:outline-none ${
                        isActive
                          ? "ring-2 ring-[#00a884] ring-offset-2 ring-offset-[#111b21] scale-105 opacity-100 shadow-md"
                          : "opacity-45 hover:opacity-90 hover:scale-102"
                      }`}
                      aria-label={`Slide ${idx + 1} of ${totalCount}`}
                    >
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                      {isItemVideo && (
                        <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                          <Film className="size-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
