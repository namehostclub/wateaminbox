import { describe, expect, test } from "bun:test";
import { renderAllAnnotations } from "./image-canvas-export";
import type { AnnotationItem } from "./types";

describe("image-canvas-export", () => {
  test("renders stroke and text annotations without throwing", () => {
    // Mock 2D canvas context
    const calls: string[] = [];
    const mockCtx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      beginPath: () => calls.push("beginPath"),
      moveTo: () => calls.push("moveTo"),
      lineTo: () => calls.push("lineTo"),
      stroke: () => calls.push("stroke"),
      strokeText: () => calls.push("strokeText"),
      fillText: () => calls.push("fillText"),
      set lineCap(_v: string) {},
      set lineJoin(_v: string) {},
      set strokeStyle(_v: string) {},
      set fillStyle(_v: string) {},
      set lineWidth(_v: number) {},
      set globalAlpha(_v: number) {},
      set font(_v: string) {},
      set textBaseline(_v: string) {},
      set textAlign(_v: string) {},
    } as unknown as CanvasRenderingContext2D;

    const items: AnnotationItem[] = [
      {
        id: "1",
        type: "stroke",
        tool: "pen",
        color: "#ff0000",
        width: 4,
        points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      },
      {
        id: "2",
        type: "stroke",
        tool: "highlighter",
        color: "#ffff00",
        width: 16,
        points: [{ x: 50, y: 50 }, { x: 100, y: 50 }],
      },
      {
        id: "3",
        type: "text",
        text: "Special Offer",
        x: 50,
        y: 50,
        color: "#ffffff",
        fontSize: 24,
      },
      {
        id: "4",
        type: "emoji",
        emoji: "🔥",
        x: 30,
        y: 30,
        size: 32,
      },
    ];

    expect(() => renderAllAnnotations(mockCtx, items, 800, 600)).not.toThrow();
    expect(calls).toContain("beginPath");
    expect(calls).toContain("stroke");
    expect(calls).toContain("fillText");
  });
});

