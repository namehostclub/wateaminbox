import type { AnnotationItem, DrawStroke, EmojiAnnotation, TextAnnotation } from "./types";

/**
 * Draws a smooth stroke onto a 2D canvas context using midpoint quadratic bezier curves.
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  canvasWidth: number = 0,
  canvasHeight: number = 0,
  scale: number = 1,
) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;

  const isHighlighter = stroke.tool === "highlighter";
  const strokeWidth =
    canvasWidth > 0
      ? isHighlighter
        ? Math.max(18 * scale, canvasWidth * 0.024)
        : Math.max(3 * scale, canvasWidth * 0.0045)
      : stroke.width * scale;

  ctx.lineWidth = strokeWidth;
  ctx.globalAlpha = isHighlighter ? 0.35 : 1.0;

  const getPx = (pt: { x: number; y: number }) => {
    // If point is normalized [0-1] and dimensions provided, scale by dimensions
    if (canvasWidth > 0 && canvasHeight > 0 && pt.x <= 1 && pt.y <= 1) {
      return { x: pt.x * canvasWidth, y: pt.y * canvasHeight };
    }
    // Fallback for raw pixel coordinates
    return { x: pt.x * scale, y: pt.y * scale };
  };

  const first = getPx(stroke.points[0]);

  if (stroke.points.length === 1) {
    ctx.beginPath();
    ctx.arc(first.x, first.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (stroke.points.length === 2) {
    const second = getPx(stroke.points[1]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(second.x, second.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(first.x, first.y);

  for (let i = 1; i < stroke.points.length - 1; i++) {
    const curr = getPx(stroke.points[i]);
    const next = getPx(stroke.points[i + 1]);
    const mid = { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 };
    ctx.quadraticCurveTo(curr.x, curr.y, mid.x, mid.y);
  }

  const last = getPx(stroke.points[stroke.points.length - 1]);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a text annotation onto a 2D canvas context.
 */
export function renderText(
  ctx: CanvasRenderingContext2D,
  text: TextAnnotation,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1,
) {
  if (!text.text.trim()) return;

  ctx.save();
  const px = (text.x / 100) * canvasWidth;
  const py = (text.y / 100) * canvasHeight;
  const scaledFontSize = Math.round(text.fontSize * scale);

  ctx.font = `bold ${scaledFontSize}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Text outline for legibility on any background
  ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
  ctx.lineWidth = Math.max(2, Math.round(4 * scale));
  ctx.strokeText(text.text, px, py);

  ctx.fillStyle = text.color;
  ctx.fillText(text.text, px, py);
  ctx.restore();
}

/**
 * Draws an emoji sticker onto a 2D canvas context.
 */
export function renderEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: EmojiAnnotation,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1,
) {
  ctx.save();
  const px = (emoji.x / 100) * canvasWidth;
  const py = (emoji.y / 100) * canvasHeight;
  const scaledSize = Math.round(emoji.size * scale);

  ctx.font = `${scaledSize}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(emoji.emoji, px, py);
  ctx.restore();
}

/**
 * Renders all annotations onto the canvas.
 */
export function renderAllAnnotations(
  ctx: CanvasRenderingContext2D,
  items: AnnotationItem[],
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1,
) {
  for (const item of items) {
    if (item.type === "stroke") {
      renderStroke(ctx, item, canvasWidth, canvasHeight, scale);
    } else if (item.type === "text") {
      renderText(ctx, item, canvasWidth, canvasHeight, scale);
    } else if (item.type === "emoji") {
      renderEmoji(ctx, item, canvasWidth, canvasHeight, scale);
    }
  }
}

/**
 * Composites the source image and annotations into an offscreen canvas and exports a File.
 */
export async function compositeAndExportFile(
  imageSource: HTMLImageElement | string,
  annotations: AnnotationItem[],
  rotation: number,
  originalFile: File,
  isHd: boolean,
): Promise<File> {
  // If there are no annotations and no rotation, return the original file untouched
  if (annotations.length === 0 && rotation % 360 === 0) {
    return originalFile;
  }

  // Load the image if a string URL was passed
  const img: HTMLImageElement =
    typeof imageSource === "string"
      ? await new Promise((resolve, reject) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = imageSource;
        })
      : imageSource;

  const isRotatedQuarter = rotation === 90 || rotation === 270;
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  // Max dimensions based on HD quality toggle
  const maxDim = isHd ? 2560 : 1600;
  let targetWidth = isRotatedQuarter ? origHeight : origWidth;
  let targetHeight = isRotatedQuarter ? origWidth : origHeight;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    const ratio = Math.min(maxDim / targetWidth, maxDim / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;
  const ctx = exportCanvas.getContext("2d");

  if (!ctx) throw new Error("Could not create canvas 2d context");

  // Apply rotation
  ctx.save();
  ctx.translate(targetWidth / 2, targetHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  const drawW = isRotatedQuarter ? targetHeight : targetWidth;
  const drawH = isRotatedQuarter ? targetWidth : targetHeight;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

  // Render annotations over the image in its local coordinate space
  ctx.translate(-drawW / 2, -drawH / 2);
  const exportScale = Math.max(1, drawW / 700);
  renderAllAnnotations(ctx, annotations, drawW, drawH, exportScale);
  ctx.restore();

  // Export to Blob & File
  const outputMime = originalFile.type === "image/png" ? "image/png" : "image/jpeg";
  const outputQuality = isHd ? 0.95 : 0.85;

  const blob: Blob = await new Promise((resolve, reject) => {
    exportCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob failed"));
      },
      outputMime,
      outputQuality,
    );
  });

  return new File([blob], originalFile.name, {
    type: outputMime,
    lastModified: Date.now(),
  });
}

