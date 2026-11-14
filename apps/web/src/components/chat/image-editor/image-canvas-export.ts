import type { AnnotationItem, DrawStroke, EmojiAnnotation, TextAnnotation } from "./types";

/**
 * Draws a smooth stroke onto a 2D canvas context.
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  scale: number = 1,
) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width * scale;

  if (stroke.tool === "highlighter") {
    ctx.globalAlpha = 0.45;
  } else {
    ctx.globalAlpha = 1.0;
  }

  ctx.beginPath();
  const first = stroke.points[0];
  ctx.moveTo(first.x * scale, first.y * scale);

  if (stroke.points.length === 1) {
    ctx.lineTo(first.x * scale, first.y * scale);
  } else {
    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      ctx.lineTo(pt.x * scale, pt.y * scale);
    }
  }

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
) {
  if (!text.text.trim()) return;

  ctx.save();
  const px = (text.x / 100) * canvasWidth;
  const py = (text.y / 100) * canvasHeight;

  ctx.font = `bold ${text.fontSize}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Text outline for legibility on any background
  ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
  ctx.lineWidth = 4;
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
) {
  ctx.save();
  const px = (emoji.x / 100) * canvasWidth;
  const py = (emoji.y / 100) * canvasHeight;

  ctx.font = `${emoji.size}px sans-serif`;
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
      renderStroke(ctx, item, scale);
    } else if (item.type === "text") {
      renderText(ctx, item, canvasWidth, canvasHeight);
    } else if (item.type === "emoji") {
      renderEmoji(ctx, item, canvasWidth, canvasHeight);
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
  ctx.restore();

  // Render annotations over the rotated canvas
  renderAllAnnotations(ctx, annotations, targetWidth, targetHeight, 1);

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

