import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  compositeAndExportFile,
  renderAllAnnotations,
} from "./image-canvas-export";
import type {
  AnnotationItem,
  DrawStroke,
  EditorTool,
  EmojiAnnotation,
  ImageEditorHandle,
  Point,
  TextAnnotation,
} from "./types";

interface ImageAnnotationCanvasProps {
  imageSrc: string;
  originalFile: File;
  activeTool: EditorTool;
  activeColor: string;
  rotation: number;
  isHd: boolean;
  onHasEditsChange?: (hasEdits: boolean) => void;
  onCanUndoChange?: (canUndo: boolean) => void;
}

export const ImageAnnotationCanvas = forwardRef<
  ImageEditorHandle,
  ImageAnnotationCanvasProps
>(function ImageAnnotationCanvas(
  {
    imageSrc,
    originalFile,
    activeTool,
    activeColor,
    rotation,
    isHd,
    onHasEditsChange,
    onCanUndoChange,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [textInputVal, setTextInputVal] = useState("");
  const [editingTextPos, setEditingTextPos] = useState<{ x: number; y: number } | null>(null);

  // Exact rendered stage dimensions (in CSS pixels, unrotated)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Direct active drawing refs (Zero React re-renders while mouse is dragging!)
  const activeStrokeRef = useRef<{
    tool: "pen" | "highlighter";
    color: string;
    points: Point[];
  } | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Update undo & edit callbacks
  useEffect(() => {
    const hasEdits = annotations.length > 0 || rotation !== 0;
    onHasEditsChange?.(hasEdits);
    onCanUndoChange?.(annotations.length > 0);
  }, [annotations.length, rotation, onHasEditsChange, onCanUndoChange]);

  // Sync stage dimensions with rendered image dimensions
  const updateStageDimensions = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    const w = img.clientWidth || img.offsetWidth;
    const h = img.clientHeight || img.offsetHeight;
    if (w > 0 && h > 0) {
      setStageSize({ width: w, height: h });
    }
  }, []);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => {
      updateStageDimensions();
    });
    ro.observe(img);
    return () => ro.disconnect();
  }, [updateStageDimensions]);

  // Redraw canvas whenever annotations, rotation, or stageSize change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || stageSize.width === 0 || stageSize.height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Scale for High-DPI / Retina screens
    ctx.scale(dpr, dpr);

    renderAllAnnotations(
      ctx,
      annotations,
      stageSize.width,
      stageSize.height,
      1,
    );

    ctx.restore();
  }, [annotations, stageSize, dpr]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Expose imperative handle methods
  useImperativeHandle(
    ref,
    () => ({
      exportEditedFile: async () => {
        if (annotations.length === 0 && rotation === 0) {
          return originalFile;
        }
        return await compositeAndExportFile(
          imageRef.current || imageSrc,
          annotations,
          rotation,
          originalFile,
          isHd,
        );
      },
      hasEdits: () => annotations.length > 0 || rotation !== 0,
      undo: () => {
        setAnnotations((prev) => prev.slice(0, prev.length - 1));
      },
      clear: () => {
        setAnnotations([]);
        setActiveTextId(null);
        setEditingTextPos(null);
      },
      rotate: () => {
        // rotation handled by parent
      },
    }),
    [annotations, rotation, originalFile, imageSrc, isHd],
  );

  // Add Emoji Sticker
  const addEmoji = useCallback(
    (emoji: string) => {
      const newEmoji: EmojiAnnotation = {
        id: `emoji-${Date.now()}`,
        type: "emoji",
        emoji,
        x: 50, // Center [0-100]
        y: 50,
        size: 48,
      };
      setAnnotations((prev) => [...prev, newEmoji]);
    },
    [],
  );

  // Expose addEmoji via window event
  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      addEmoji(e.detail);
    };
    window.addEventListener("add-image-editor-emoji" as any, handler as any);
    return () => {
      window.removeEventListener("add-image-editor-emoji" as any, handler as any);
    };
  }, [addEmoji]);

  /**
   * Translates pointer event coordinates into normalized [0-1] coordinates relative to
   * the unrotated image, using an inverse rotation transform.
   */
  const getNormalizedPoint = (
    e: ReactPointerEvent<HTMLCanvasElement> | PointerEvent,
    canvas: HTMLCanvasElement,
  ): Point => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;

    // Invert the CSS visual rotation angle so pointer tracks unrotated image coordinates
    if (rotation % 360 !== 0) {
      const rad = (-rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      dx = rx;
      dy = ry;
    }

    const localX = dx + stageSize.width / 2;
    const localY = dy + stageSize.height / 2;

    const nx = Math.max(0, Math.min(1, localX / stageSize.width));
    const ny = Math.max(0, Math.min(1, localY / stageSize.height));

    return { x: nx, y: ny };
  };

  // Blazing Fast Real-time 2D Canvas Drawing (Zero Lag, Instant Cursor Tracking)
  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || stageSize.width === 0 || stageSize.height === 0) return;

    const pt = getNormalizedPoint(e, canvas);
    const px = pt.x * stageSize.width;
    const py = pt.y * stageSize.height;
    const cx = px * dpr;
    const cy = py * dpr;

    if (activeTool === "pen" || activeTool === "highlighter") {
      const toolType = activeTool === "highlighter" ? "highlighter" : "pen";
      activeStrokeRef.current = {
        tool: toolType,
        color: activeColor,
        points: [pt],
      };
      lastPointRef.current = { x: cx, y: cy };

      const ctx = canvas.getContext("2d");
      if (ctx) {
        const strokeWidth =
          (toolType === "highlighter"
            ? Math.max(18, stageSize.width * 0.024)
            : Math.max(3, stageSize.width * 0.0045)) * dpr;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = activeColor;
        ctx.fillStyle = activeColor;
        ctx.lineWidth = strokeWidth;
        ctx.globalAlpha = toolType === "highlighter" ? 0.35 : 1.0;

        ctx.beginPath();
        ctx.arc(cx, cy, strokeWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_err) {
        // ignore
      }
    } else if (activeTool === "text") {
      setEditingTextPos({ x: pt.x * 100, y: pt.y * 100 });
      setActiveTextId(null);
      setTextInputVal("");
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!activeStrokeRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use coalesced events to process all high-frequency mouse samples without dropping frames
    const nativeEvent = e.nativeEvent as PointerEvent;
    const events =
      typeof nativeEvent?.getCoalescedEvents === "function"
        ? nativeEvent.getCoalescedEvents()
        : [e];

    for (const ev of events) {
      const pt = getNormalizedPoint(ev, canvas);
      const px = pt.x * stageSize.width;
      const py = pt.y * stageSize.height;
      const cx = px * dpr;
      const cy = py * dpr;

      activeStrokeRef.current.points.push(pt);

      // Direct zero-latency line connection straight to current cursor position
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      lastPointRef.current = { x: cx, y: cy };
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeStrokeRef.current && activeStrokeRef.current.points.length > 0) {
      const finishedStroke: DrawStroke = {
        id: `stroke-${Date.now()}`,
        type: "stroke",
        tool: activeStrokeRef.current.tool,
        color: activeStrokeRef.current.color,
        width: activeStrokeRef.current.tool === "highlighter" ? 20 : 4,
        points: activeStrokeRef.current.points,
      };

      setAnnotations((prev) => [...prev, finishedStroke]);
      activeStrokeRef.current = null;
      lastPointRef.current = null;

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_err) {
        // ignore
      }
    }
  };

  // Commit text annotation
  const handleFinishText = () => {
    if (textInputVal.trim() && editingTextPos) {
      if (activeTextId) {
        setAnnotations((prev) =>
          prev.map((item) =>
            item.id === activeTextId
              ? { ...item, text: textInputVal.trim(), color: activeColor }
              : item,
          ),
        );
      } else {
        const newText: TextAnnotation = {
          id: `text-${Date.now()}`,
          type: "text",
          text: textInputVal.trim(),
          x: editingTextPos.x,
          y: editingTextPos.y,
          color: activeColor,
          fontSize: 24,
        };
        setAnnotations((prev) => [...prev, newText]);
      }
    }
    setEditingTextPos(null);
    setActiveTextId(null);
    setTextInputVal("");
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block select-none max-h-[58vh] max-w-full transition-transform duration-200"
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Base Image - Shrink-wraps container exactly to rendered pixels */}
      <img
        ref={imageRef}
        src={imageSrc}
        alt="Preview"
        draggable={false}
        onLoad={updateStageDimensions}
        className="block max-h-[58vh] max-w-full rounded-lg object-contain shadow-2xl shadow-black/40 pointer-events-none"
      />

      {/* Interactive Overlay Canvas - Perfectly aligned 1:1 with base image */}
      {stageSize.width > 0 && stageSize.height > 0 && (
        <canvas
          ref={canvasRef}
          width={stageSize.width * dpr}
          height={stageSize.height * dpr}
          style={{
            width: `${stageSize.width}px`,
            height: `${stageSize.height}px`,
            pointerEvents:
              activeTool === "pen" ||
              activeTool === "highlighter" ||
              activeTool === "text"
                ? "auto"
                : "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute inset-0 z-10 touch-none ${
            activeTool === "pen" || activeTool === "highlighter"
              ? "cursor-crosshair"
              : activeTool === "text"
              ? "cursor-text"
              : "cursor-default"
          }`}
        />
      )}

      {/* Floating Editable Text Box */}
      {editingTextPos && (
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${editingTextPos.x}%`,
            top: `${editingTextPos.y}%`,
          }}
        >
          <input
            autoFocus
            type="text"
            value={textInputVal}
            onChange={(e) => setTextInputVal(e.target.value)}
            onBlur={handleFinishText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleFinishText();
              } else if (e.key === "Escape") {
                setEditingTextPos(null);
                setActiveTextId(null);
                setTextInputVal("");
              }
            }}
            placeholder="Type text..."
            style={{ color: activeColor }}
            className="rounded-md border border-white/20 bg-black/60 px-3 py-1.5 text-center text-xl font-bold shadow-2xl backdrop-blur-md outline-none focus:ring-2 focus:ring-[#00a884]"
          />
        </div>
      )}
    </div>
  );
});
