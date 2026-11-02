import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { figure, HEIGHT, WIDTH } from "./release-notes.mjs";

const PUBLIC_FIGURES = join(import.meta.dir, "../../../public/figures/docs");

test("the release notes figure draws parts and carries no text", () => {
  const { label, body } = figure();
  expect(WIDTH).toBe(640);
  expect(HEIGHT).toBe(400);
  expect(label.length).toBeGreaterThan(0);
  const markup = body.join("");
  expect(markup).toContain("<path");
  expect(markup).not.toContain("<text");
});

test("both generated themes exist without figure text", () => {
  for (const theme of ["light", "dark"]) {
    const svg = readFileSync(
      join(PUBLIC_FIGURES, `release-notes-${theme}.svg`),
      "utf8",
    );
    expect(svg).toContain(`data-theme="${theme}"`);
    expect(svg).not.toContain("<text");
  }
});
