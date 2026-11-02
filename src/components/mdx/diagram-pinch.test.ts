import { describe, expect, test } from "bun:test";
import {
  type PointerPoint,
  pinchDistance,
  pinchZoomFactor,
} from "./diagram-pinch";

describe("diagram pinch zoom", () => {
  test("measures the distance between two active pointers", () => {
    const pointers = new Map<number, PointerPoint>([
      [1, { x: 0, y: 0 }],
      [2, { x: 30, y: 40 }],
    ]);
    expect(pinchDistance(pointers)).toBe(50);
  });

  test("has no pinch with a single pointer", () => {
    expect(pinchDistance(new Map([[1, { x: 5, y: 5 }]]))).toBeNull();
    expect(pinchDistance(new Map())).toBeNull();
  });

  test("spreading fingers zooms in and pinching zooms out", () => {
    expect(pinchZoomFactor(100, 150)).toBe(1.5);
    expect(pinchZoomFactor(100, 50)).toBe(0.5);
  });

  test("ignores degenerate pinches instead of collapsing the zoom", () => {
    expect(pinchZoomFactor(0, 100)).toBe(1);
    expect(pinchZoomFactor(100, 0)).toBe(1);
    expect(pinchZoomFactor(Number.NaN, 100)).toBe(1);
  });
});
