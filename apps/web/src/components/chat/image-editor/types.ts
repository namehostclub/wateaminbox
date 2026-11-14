export type EditorTool = "select" | "pen" | "highlighter" | "text" | "sticker";

export interface Point {
  /** Normalized X coordinate [0-1] relative to image width */
  x: number;
  /** Normalized Y coordinate [0-1] relative to image height */
  y: number;
}

export interface DrawStroke {
  id: string;
  type: "stroke";
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  points: Point[];
}

export interface TextAnnotation {
  id: string;
  type: "text";
  text: string;
  x: number; // percentage [0-100] relative to canvas
  y: number; // percentage [0-100] relative to canvas
  color: string;
  fontSize: number;
}

export interface EmojiAnnotation {
  id: string;
  type: "emoji";
  emoji: string;
  x: number; // percentage [0-100]
  y: number; // percentage [0-100]
  size: number;
}

export type AnnotationItem = DrawStroke | TextAnnotation | EmojiAnnotation;

export interface ImageEditorHandle {
  exportEditedFile: () => Promise<File | null>;
  hasEdits: () => boolean;
  undo: () => void;
  clear: () => void;
  rotate: () => void;
}

export const WHATSAPP_COLORS = [
  "#ffffff", // White
  "#000000", // Black
  "#ef4444", // Red
  "#f97316", // Orange
  "#facc15", // Yellow
  "#00a884", // WhatsApp Green
  "#3b82f6", // Blue
  "#a855f7", // Purple
] as const;

