import { describe, expect, test } from "bun:test";
import {
  diagramDimension,
  excalidrawFitSize,
  excalidrawVariants,
} from "./excalidraw-variants";

describe("excalidrawVariants", () => {
  test("one light export serves both themes (inverted in dark mode)", () => {
    expect(excalidrawVariants("/diagrams/a.excalidraw.svg")).toEqual([
      { src: "/diagrams/a.excalidraw.svg", theme: "both" },
    ]);
  });

  test("a dark export replaces the inverted light one in dark mode", () => {
    expect(
      excalidrawVariants(
        "/diagrams/a.excalidraw.svg",
        "/diagrams/a-dark.excalidraw.svg",
      ),
    ).toEqual([
      { src: "/diagrams/a.excalidraw.svg", theme: "light" },
      { src: "/diagrams/a-dark.excalidraw.svg", theme: "dark" },
    ]);
  });

  test("a blank darkSrc falls back to inverting the light export", () => {
    expect(excalidrawVariants("/a.svg", "  ")).toEqual([
      { src: "/a.svg", theme: "both" },
    ]);
  });
});

describe("diagram dimensions", () => {
  test("parses MDX string attributes and rejects unusable values", () => {
    expect(diagramDimension("412")).toBe(412);
    expect(diagramDimension(162.5)).toBe(162.5);
    expect(diagramDimension(undefined)).toBe(0);
    expect(diagramDimension("wide")).toBe(0);
    expect(diagramDimension("-4")).toBe(0);
    expect(diagramDimension(0)).toBe(0);
  });

  test("the lightbox fits declared size first, then the loaded image", () => {
    const natural = { width: 824, height: 324 };
    expect(excalidrawFitSize({ width: 412, height: 162 }, natural)).toEqual({
      width: 412,
      height: 162,
    });
    expect(excalidrawFitSize({ width: 412, height: 0 }, natural)).toEqual(
      natural,
    );
    expect(excalidrawFitSize({ width: 0, height: 0 }, null)).toEqual({
      width: 0,
      height: 0,
    });
  });
});
