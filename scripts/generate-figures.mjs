/*
 * Writes the docs-home figures to public/figures/<name>-<theme>.svg.
 *
 * Each figure is an Anatomy-style isometric drawing (scripts/figures/, built
 * with the vendored kit) without the card text: no figure number, title, hint,
 * readout or caption. The SVGs are standalone, with the kit's styles embedded
 * and the paper colour matched to the page background they sit on.
 * Run with `bun run generate:figures`; `--check` fails when a file is stale.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  HEIGHT as DOCK_H,
  WIDTH as DOCK_W,
  dockFigure,
} from "./figures/dock.mjs";
import { k } from "./figures/parts.mjs";
import {
  HEIGHT as RACK_H,
  WIDTH as RACK_W,
  rackFigure,
} from "./figures/rack.mjs";
import {
  HEIGHT as YARD_H,
  WIDTH as YARD_W,
  yardFigure,
} from "./figures/yard.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/figures");

// No panel behind the figures: the paper is the page itself, --background
// from the shared palette (oklch(1 0 0) light, oklch(0.145 0 0) dark).
const PAPER = {
  light:
    '.iso[data-theme="light"]{--anatomy-paper:#ffffff;--anatomy-card:#ffffff}',
  dark: '.iso[data-theme="dark"]{--anatomy-paper:#0a0a0a;--anatomy-card:#0a0a0a}',
};

const FIGURES = [
  { name: "dock", build: dockFigure, width: DOCK_W, height: DOCK_H },
  { name: "yard", build: yardFigure, width: YARD_W, height: YARD_H },
  { name: "rack", build: rackFigure, width: RACK_W, height: RACK_H },
];

const check = process.argv.includes("--check");
let stale = 0;
mkdirSync(OUT, { recursive: true });

for (const figure of FIGURES) {
  const { body, label } = figure.build();
  for (const theme of ["light", "dark"]) {
    const svg = k
      .figureSvg({
        width: figure.width,
        height: figure.height,
        label,
        body,
        standalone: theme,
      })
      .replace("</style>", `${PAPER[theme]}</style>`);
    const file = join(OUT, `${figure.name}-${theme}.svg`);
    if (check) {
      let current = "";
      try {
        current = readFileSync(file, "utf8");
      } catch {
        // A missing file is stale.
      }
      if (current !== `${svg}\n`) {
        stale += 1;
        console.error(`stale: public/figures/${figure.name}-${theme}.svg`);
      }
    } else {
      writeFileSync(file, `${svg}\n`);
    }
  }
}

if (stale > 0) {
  console.error("Run `bun run generate:figures` to refresh the figures.");
  process.exit(1);
}
