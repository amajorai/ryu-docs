import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSvgViewBox } from "./diagram-viewbox";

const FIXTURE = readFileSync(
  join(import.meta.dir, "__fixtures__", "excalidraw-export.svg"),
  "utf8",
);

describe("parseSvgViewBox", () => {
  test("reads the root viewBox, not the export's scaled width/height", () => {
    // The fixture is a 2x export: width="824" height="324".
    expect(parseSvgViewBox(FIXTURE)).toEqual({ width: 412, height: 162 });
  });

  test("ignores viewBoxes on nested elements", () => {
    expect(
      parseSvgViewBox(
        '<svg width="5"><symbol viewBox="0 0 10 10"></symbol></svg>',
      ),
    ).toEqual({ width: 0, height: 0 });
  });

  test("accepts comma separators, single quotes and a leading XML prolog", () => {
    expect(
      parseSvgViewBox(
        "<?xml version=\"1.0\"?><svg viewBox='0,0,320.5,180'></svg>",
      ),
    ).toEqual({ width: 320.5, height: 180 });
  });

  test("treats invalid or non-positive sizes as unknown", () => {
    expect(parseSvgViewBox('<svg viewBox="0 0 NaN -1"></svg>')).toEqual({
      width: 0,
      height: 0,
    });
    expect(parseSvgViewBox('<svg viewBox="0 0 -10 20"></svg>')).toEqual({
      width: 0,
      height: 0,
    });
    expect(parseSvgViewBox('<svg viewBox="0 0 10"></svg>')).toEqual({
      width: 0,
      height: 0,
    });
    expect(parseSvgViewBox("not an svg")).toEqual({ width: 0, height: 0 });
  });
});
