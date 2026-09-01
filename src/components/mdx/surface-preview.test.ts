import { describe, expect, test } from "bun:test";
import {
  SURFACE_PREVIEW_METADATA,
  type SurfacePreviewSurface,
} from "./surface-preview";

describe("surface preview contract", () => {
  test("keeps each documented surface tied to real shared UI primitives", () => {
    const surfaces: SurfacePreviewSurface[] = [
      "chat",
      "governance",
      "plugin",
      "workflow",
    ];

    expect(Object.keys(SURFACE_PREVIEW_METADATA)).toEqual(surfaces);
    for (const surface of surfaces) {
      expect(SURFACE_PREVIEW_METADATA[surface].source).toContain("+");
      expect(SURFACE_PREVIEW_METADATA[surface].label.length).toBeGreaterThan(0);
    }
  });
});
