/*
 * One figure as a standalone SVG for a theme: the kit's styles embedded and the
 * paper colour matched to the page background it sits on. Shared by
 * generate-figures.mjs and preview.mjs so a preview is exactly what ships.
 */

import { k } from "./parts.mjs";

// No panel behind the figures: the paper is the page itself, --background
// from the shared palette (oklch(1 0 0) light, oklch(0.145 0 0) dark).
const PAPER = {
  light:
    '.iso[data-theme="light"]{--anatomy-paper:#ffffff;--anatomy-card:#ffffff}',
  dark: '.iso[data-theme="dark"]{--anatomy-paper:#0a0a0a;--anatomy-card:#0a0a0a}',
};

/** `figure` is { build, width, height }; build() returns { label, body }. */
export function renderFigure(figure, theme) {
  const { body, label } = figure.build();
  return k
    .figureSvg({
      width: figure.width,
      height: figure.height,
      label,
      body,
      standalone: theme,
    })
    .replace("</style>", `${PAPER[theme]}</style>`);
}
