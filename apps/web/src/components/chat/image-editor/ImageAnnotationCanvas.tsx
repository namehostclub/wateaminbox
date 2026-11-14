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
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [textInputVal, setTextInputVal] = useState("");
  const [editingTextPos, setEditingTextPos] = useState<{ x: number; y: number } | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Update undo & edit callbacks
  useEffect(() => {
    const hasEdits = annotations.length > 0 || rotation !== 0;
    onHasEditsChange?.(hasEdits);
    onCanUndoChange?.(annotations.length > 0);
  }, [annotations.length, rotation, onHasEditsChange, onCanUndoChange]);

  // Sync canvas dimensions with image display dimensions
  const updateCanvasDimensions = useCallback(() => {
    const img = imageRef.current;
    if (!img || !img.complete) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (w > 0 && h > 0) {
      setCanvasSize({ width: w, height: h });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateCanvasDimensions);
    return () => window.removeEventListener("resize", updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  // Redraw canvas whenever annotations or canvasSize change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const itemsToDraw = currentStroke
      ? [...annotations, currentStroke]
      : annotations;

    renderAllAnnotations(
      ctx,
      itemsToDraw,
      canvas.width,
      canvas.height,
      canvas.width > 0 ? canvas.width / (imageRef.current?.naturalWidth || canvas.width) : 1,
    );
  }, [annotations, currentStroke]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, canvasSize]);

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
        x: 50, // Center
        y: 50,
        size: 48,
      };
      setAnnotations((prev) => [...prev, newEmoji]);
    },
    [],
  );

  // Expose addEmoji via window event or ref if needed
  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      addEmoji(e.detail);
    };
    window.addEventListener("add-image-editor-emoji" as any, handler as any);
    return () => {
      window.removeEventListener("add-image-editor-emoji" as any, handler as any);
    };
  }, [addEmoji]);

  // Drawing event handlers
  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "pen" || activeTool === "highlighter") {
      const stroke: DrawStroke = {
        id: `stroke-${Date.now()}`,
        type: "stroke",
        tool: activeTool,
        color: activeColor,
        width: activeTool === "highlighter" ? 20 : 4,
        points: [{ x, y }],
      };
      setCurrentStroke(stroke);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (activeTool === "text") {
      // Place text input at pointer location
      const pctX = (x / canvas.width) * 100;
      const pctY = (y / canvas.height) * 100;
      setEditingTextPos({ x: pctX, y: pctY });
      setActiveTextId(null);
      setTextInputVal("");
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }],
      };
    });
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (currentStroke) {
      setAnnotations((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_e) {
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
      className="relative flex items-center justify-center max-h-[58vh] max-w-full select-none overflow-hidden transition-transform duration-200"
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Base Image */}
      <img
        ref={imageRef}
        src={imageSrc}
        alt="Preview"
        draggable={false}
        onLoad={updateCanvasDimensions}
        className="max-h-[58vh] max-w-full rounded-lg object-contain shadow-2xl shadow-black/40 pointer-events-none"
      />

      {/* Interactive Overlay Canvas */}
      {canvasSize.width > 0 && canvasSize.height > 0 && (
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`absolute inset-0 z-10 size-full touch-none ${
            activeTool === "pen" || activeTool === "highlighter"
              ? "cursor-crosshair"
              : activeTool === "text"
              ? "cursor-text"
              : "cursor-default pointer-events-none"
          }`}
          style={{
            pointerEvents:
              activeTool === "pen" ||
              activeTool === "highlighter" ||
              activeTool === "text"
                ? "auto"
                : "none",
          }}
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

