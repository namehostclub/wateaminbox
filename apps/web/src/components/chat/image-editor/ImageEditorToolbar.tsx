import {
  Highlighter,
  Pencil,
  RotateCw,
  Smile,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmojiInputPicker } from "../EmojiInputPicker";
import { WHATSAPP_COLORS, type EditorTool } from "./types";

export interface ImageEditorToolbarProps {
  activeTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  isHd: boolean;
  onToggleHd: () => void;
  onRotate: () => void;
  onAddEmoji: (emoji: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  onClear: () => void;
  canClear: boolean;
}

export function ImageEditorToolbar({
  activeTool,
  onSelectTool,
  activeColor,
  onSelectColor,
  isHd,
  onToggleHd,
  onRotate,
  onAddEmoji,
  onUndo,
  canUndo,
  onClear,
  canClear,
}: ImageEditorToolbarProps) {
  const { t } = useTranslation();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const isDrawingOrText =
    activeTool === "pen" || activeTool === "highlighter" || activeTool === "text";

  return (
    <div className="flex flex-col items-end">
      {/* Top Header Buttons (WhatsApp Web style) */}
      <div className="flex items-center gap-1">
        {/* HD Quality Toggle */}
        <button
          type="button"
          onClick={onToggleHd}
          className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition-all ${
            isHd
              ? "bg-[#00a884] text-white shadow-sm ring-1 ring-[#00a884]"
              : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
          }`}
          title={t("chat.editorHd", "HD quality")}
          aria-label={t("chat.editorHd", "HD quality")}
        >
          <span>HD</span>
          {isHd && <span className="size-1.5 rounded-full bg-white" />}
        </button>

        {/* Rotate Image 90° */}
        <button
          type="button"
          onClick={onRotate}
          className="grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]"
          title={`${t("chat.editorRotate", "Rotate")} 90°`}
          aria-label={t("chat.editorRotate", "Rotate")}
        >
          <RotateCw className="size-4.5" />
        </button>

        {/* Emoji & Stickers Popover */}
        <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`grid size-9 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884] ${
                activeTool === "sticker" ? "bg-white/20 text-[#00a884]" : "text-white/80"
              }`}
              title={t("chat.editorStickers", "Stickers & Emoji")}
              aria-label={t("chat.editorStickers", "Stickers & Emoji")}
            >
              <Smile className="size-4.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            className="w-80 p-0 border-white/10 bg-[#111b21] shadow-2xl z-[90]"
          >
            <EmojiInputPicker
              onSelectEmoji={(emoji) => {
                onAddEmoji(emoji);
                setIsEmojiPickerOpen(false);
              }}
              onClose={() => setIsEmojiPickerOpen(false)}
            />
          </PopoverContent>
        </Popover>

        {/* Text Tool */}
        <button
          type="button"
          onClick={() =>
            onSelectTool(activeTool === "text" ? "select" : "text")
          }
          className={`grid size-9 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884] ${
            activeTool === "text"
              ? "bg-[#00a884] text-white shadow-sm"
              : "text-white/80"
          }`}
          title={t("chat.editorText", "Add text")}
          aria-label={t("chat.editorText", "Add text")}
        >
          <Type className="size-4.5" />
        </button>

        {/* Pen / Highlighter Tool */}
        <button
          type="button"
          onClick={() =>
            onSelectTool(
              activeTool === "pen" || activeTool === "highlighter"
                ? "select"
                : "pen",
            )
          }
          className={`grid size-9 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884] ${
            activeTool === "pen" || activeTool === "highlighter"
              ? "bg-[#00a884] text-white shadow-sm"
              : "text-white/80"
          }`}
          title={t("chat.editorPen", "Draw or highlight")}
          aria-label={t("chat.editorPen", "Draw or highlight")}
        >
          <Pencil className="size-4.5" />
        </button>

        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]"
          title={t("chat.editorUndo", "Undo")}
          aria-label={t("chat.editorUndo", "Undo")}
        >
          <Undo2 className="size-4.5" />
        </button>

        {/* Clear All */}
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            className="grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-red-500/20 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            title={t("chat.editorClear", "Clear all")}
            aria-label={t("chat.editorClear", "Clear all")}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {/* Secondary Color & Tool Palette Ribbon */}
      {isDrawingOrText && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-[#202c33]/95 px-3 py-1.5 shadow-lg backdrop-blur-md animate-in fade-in-0 slide-in-from-top-1">
          {/* Switch Pen vs Highlighter if in drawing mode */}
          {(activeTool === "pen" || activeTool === "highlighter") && (
            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
              <button
                type="button"
                onClick={() => onSelectTool("pen")}
                className={`grid size-7.5 place-items-center rounded-full text-xs transition-all ${
                  activeTool === "pen"
                    ? "bg-white/20 text-[#00a884] font-bold"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                title={t("chat.editorPen", "Pen")}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectTool("highlighter")}
                className={`grid size-7.5 place-items-center rounded-full text-xs transition-all ${
                  activeTool === "highlighter"
                    ? "bg-white/20 text-[#00a884] font-bold"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                title={t("chat.editorHighlighter", "Highlighter")}
              >
                <Highlighter className="size-3.5" />
              </button>
            </div>
          )}

          {/* Color Swatches */}
          <div className="flex items-center gap-1.5">
            {WHATSAPP_COLORS.map((color) => {
              const isSelected = activeColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onSelectColor(color)}
                  style={{ backgroundColor: color }}
                  className={`size-5 rounded-full transition-transform focus-visible:outline-none ${
                    isSelected
                      ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#202c33]"
                      : "opacity-80 hover:opacity-100 hover:scale-110"
                  }`}
                  aria-label={`Color ${color}`}
                />
              );
            })}
          </div>

          {/* Exit Editing Mode */}
          <button
            type="button"
            onClick={() => onSelectTool("select")}
            className="ml-1 grid size-6 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            title={t("common.done", "Done")}
            aria-label={t("common.done", "Done")}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

