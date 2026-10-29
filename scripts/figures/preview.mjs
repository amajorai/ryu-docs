/*
 * Renders docs figures straight from their modules to PNG so an author can look
 * at them before generating:
 *   node scripts/figures/preview.mjs <out-dir> <name> [<name> ...]
 * Writes <out-dir>/<name>.png with the light and dark drawings side by side and
 * prints each theme's SVG size.
 */

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { renderFigure } from "./render.mjs";

const [out, ...names] = process.argv.slice(2);
if (!out || names.length === 0) {
  console.error("usage: node scripts/figures/preview.mjs <out-dir> <name>...");
  process.exit(1);
}
const SOURCES = join(dirname(fileURLToPath(import.meta.url)), "docs");
const { chromium } = createRequire(import.meta.url)("playwright");

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 520 },
  deviceScaleFactor: 1.5,
});
for (const name of names) {
  const module = await import(
    `${pathToFileURL(join(SOURCES, `${name}.mjs`)).href}?t=${process.hrtime.bigint()}`
  );
  const figure = {
    build: module.figure,
    width: module.WIDTH,
    height: module.HEIGHT,
  };
  const light = renderFigure(figure, "light");
  const dark = renderFigure(figure, "dark");
  await page.setContent(
    `<body style="margin:0;display:grid;grid-template-columns:1fr 1fr">
      <div style="background:#fff;padding:12px">${light}</div>
      <div style="background:#0a0a0a;padding:12px">${dark}</div>
    </body>`,
  );
  const path = join(out, `${name}.png`);
  await page.screenshot({ fullPage: true, path });
  console.log(`${path} (light ${light.length} B, dark ${dark.length} B)`);
}
await browser.close();
