/*
 * "Browser extension": Ryu rides along inside the browser, drawn as a browser
 * window lying flat as a slab. Tabs run along its back edge, and a puzzle-piece
 * module (the lit part) hovers above its matching socket in the toolbar, about
 * to click in beside the extensions already seated there.
 */

import { dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 380;

const WINDOW = { x: -105, y: -68, w: 210, d: 136, r: 8 };
const WINDOW_H = 10;
const TOP = WINDOW_H;
const CHROME = TOP + 1.4;
const TAB_Y = WINDOW.y + 5;
const TAB_D = 14;
const TABS = [
  { x: -66, w: 48 },
  { x: -16, w: 48 },
  { x: 34, w: 48 },
];
const BAR = { x: WINDOW.x + 5, y: TAB_Y + TAB_D, w: WINDOW.w - 10, d: 30 };
const BAR_MID = BAR.y + BAR.d / 2;
const ADDRESS = { x: -56, y: BAR.y + 9, w: 68, d: 12, r: 6 };
const SEATED = [18, 36];
const PIECE = 20;
const SOCKET = [62, BAR.y + 5];
const LIFT = 38;
const PIECE_H = 7;
const KNOB_R = 4.4;
const NECK = KNOB_R * 0.55;
const PAGE = {
  x: WINDOW.x + 10,
  y: BAR.y + BAR.d + 6,
  w: WINDOW.w - 20,
  d: 0,
  r: 3,
};
PAGE.d = WINDOW.y + WINDOW.d - 10 - PAGE.y;

const P = k.fitProjection(
  [...k.boxCorners(WINDOW, 0, TOP), [SOCKET[0], SOCKET[1], TOP + LIFT + 6]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan, z, blur = 5, opacity = 1) =>
  `<path class="iso-halo" d="${k.haloOf(plan, z, 0.1, P)}" style="filter:blur(${blur}px);opacity:${opacity}"/>`;

/** A knob that bulges out of an edge: midpoint `m`, travel `t`, outward `n`. */
function knobArc([mx, my], [tx, ty], [nx, ny], radius) {
  const neck = NECK;
  const half = Math.sqrt(radius * radius - neck * neck);
  const phi = Math.asin(neck / radius);
  const cx = mx + nx * neck;
  const cy = my + ny * neck;
  const out = [];
  const steps = 14;
  for (let step = 0; step <= steps; step++) {
    const angle = Math.PI - phi + (step / steps) * (Math.PI + 2 * phi);
    // Local frame: e1 along travel, e2 pointing inward.
    const u = radius * Math.cos(angle);
    const v = radius * Math.sin(angle);
    out.push([cx + tx * u - nx * v, cy + ty * u - ny * v]);
  }
  out[0] = [mx - tx * half, my - ty * half];
  out[steps] = [mx + tx * half, my + ty * half];
  return out;
}

/** A puzzle-piece plan ring with knobs on its left and right edges. */
function puzzleRing([x, y], size) {
  const mid = size / 2;
  return [
    [x, y],
    [x + size, y],
    ...knobArc([x + size, y + mid], [0, 1], [1, 0], KNOB_R),
    [x + size, y + size],
    [x, y + size],
    ...knobArc([x, y + mid], [0, -1], [-1, 0], KNOB_R),
  ];
}

function windowBody() {
  return [
    halo(WINDOW, 0, 6),
    solid(k.slabOf(WINDOW, 0, WINDOW_H, P, 8, 1.2), { tone: "mid" }),
    line(k.sideSeam(WINDOW, 4, P, 8), { tone: "faint" }),
    screws(k.corners(WINDOW, 4.5), TOP, P, 1.2),
  ].join("");
}

function tabStrip() {
  const out = [
    // Window controls at the left end of the strip.
    ...[0, 1, 2].map((i) =>
      line(k.ring(WINDOW.x + 12 + i * 8, TAB_Y + TAB_D / 2, 2.2, TOP, P, 18), {
        tone: i === 0 ? "mid" : "lo",
      }),
    ),
  ];
  for (const [i, tab] of TABS.entries()) {
    const active = i === 0;
    const plan = { x: tab.x, y: TAB_Y, w: tab.w, d: TAB_D + 2, r: 3 };
    const z = active ? CHROME : TOP + 0.8;
    // The active tab is raised and joins the toolbar; the others are cut in.
    out.push(
      active
        ? solid(k.slabOf(plan, TOP, CHROME - TOP, P, 4), { tone: "mid" })
        : solid(k.slabOf({ ...plan, d: TAB_D - 2 }, TOP, 0.8, P, 4), {
            tone: "lo",
            crease: "none",
          }),
      line(
        k.planOutline(
          { x: tab.x + 5, y: TAB_Y + 4.5, w: 5, d: 5, r: 1 },
          z,
          P,
          2,
        ),
        { tone: active ? "mid" : "lo" },
      ),
      line(
        k.lineOnTop(
          [tab.x + 14, TAB_Y + 7],
          [tab.x + tab.w - 16, TAB_Y + 7],
          z,
          P,
        ),
        { tone: "faint" },
      ),
    );
  }
  // A new-tab button after the last tab.
  const plus = [TABS[2].x + TABS[2].w + 10, TAB_Y + TAB_D / 2];
  out.push(
    line(
      k.lineOnTop([plus[0] - 3, plus[1]], [plus[0] + 3, plus[1]], TOP, P) +
        k.lineOnTop([plus[0], plus[1] - 3], [plus[0], plus[1] + 3], TOP, P),
      { tone: "lo" },
    ),
  );
  return out.join("");
}

function toolbar() {
  const out = [
    solid(k.slabOf({ ...BAR, r: 2 }, TOP, CHROME - TOP, P, 3), {
      tone: "mid",
    }),
  ];
  // Back, forward and reload.
  for (const i of [0, 1, 2]) {
    out.push(
      line(k.ring(BAR.x + 10 + i * 11, BAR_MID, 3.2, CHROME, P, 20), {
        tone: "lo",
      }),
    );
  }
  out.push(
    solid(k.slabOf(ADDRESS, CHROME - 0.6, 0.6, P, 6), {
      tone: "lo",
      crease: "none",
    }),
    line(
      k.lineOnTop(
        [ADDRESS.x + 14, ADDRESS.y + ADDRESS.d / 2],
        [ADDRESS.x + 62, ADDRESS.y + ADDRESS.d / 2],
        CHROME,
        P,
      ),
      { tone: "faint" },
    ),
    line(k.ring(ADDRESS.x + 7, ADDRESS.y + ADDRESS.d / 2, 2, CHROME, P, 14), {
      tone: "mid",
    }),
  );
  // Extensions already seated: low square buttons.
  for (const x of SEATED) {
    const plan = { x, y: BAR.y + 7, w: 15, d: 15, r: 2.2 };
    out.push(solid(k.slabOf(plan, CHROME, 1.4, P, 3, 0.3), { tone: "mid" }));
    out.push(
      line(k.ring(x + 7.5, BAR.y + 14.5, 3, CHROME + 1.4, P, 16), {
        tone: "lo",
      }),
    );
  }
  // The empty socket the piece is about to drop into.
  const socket = k.onTop(puzzleRing(SOCKET, PIECE), CHROME, P, true);
  out.push(
    `<path class="iso-halo" d="${socket}" style="filter:blur(3px);opacity:.45"/>`,
    line(socket, { tone: "mid" }),
  );
  // An overflow menu at the far end.
  out.push(
    dots(
      [0, 1, 2].map((i) => at([BAR.x + BAR.w - 8, BAR.y + 8 + i * 5, CHROME])),
      { size: 0.7, tone: "lo" },
    ),
  );
  return out.join("");
}

function page() {
  const out = [line(k.planOutline(PAGE, TOP, P, 4), { tone: "faint" })];
  const left = PAGE.x + 14;
  out.push(
    line(k.lineOnTop([left, PAGE.y + 14], [left + 72, PAGE.y + 14], TOP, P), {
      tone: "mid",
    }),
  );
  for (const [i, width] of [100, 88, 104, 64, 92].entries()) {
    const y = PAGE.y + 26 + i * 9;
    out.push(
      line(k.lineOnTop([left, y], [left + width, y], TOP, P), {
        tone: "faint",
      }),
    );
  }
  // An image block on the right of the page.
  const image = { x: PAGE.x + 128, y: PAGE.y + 10, w: 50, d: 40, r: 2 };
  out.push(
    line(k.planOutline(image, TOP, P, 2), { tone: "lo" }),
    line(
      k.onTop(
        [
          [image.x + 6, image.y + image.d - 6],
          [image.x + 24, image.y + 18],
          [image.x + 36, image.y + 32],
          [image.x + 44, image.y + 24],
          [image.x + image.w - 6, image.y + image.d - 6],
        ],
        TOP,
        P,
      ),
      { tone: "faint" },
    ),
    line(k.ring(image.x + image.w - 12, image.y + 11, 3.5, TOP, P, 18), {
      tone: "faint",
    }),
  );
  return out.join("");
}

/** Drop guides from the hovering piece down to its socket. */
function guides() {
  const [x, y] = SOCKET;
  const z = CHROME + LIFT;
  return [
    [x, y + PIECE],
    [x + PIECE, y + PIECE],
  ]
    .map(([gx, gy]) =>
      line(k.segment([gx, gy, z - 1], [gx, gy, CHROME + 2], P), {
        tone: "mid",
        dotted: true,
      }),
    )
    .join("");
}

function piece() {
  const [x, y] = SOCKET;
  const z = CHROME + LIFT;
  const lit = { tone: "hi", lit: true, crease: "lo" };
  const mid = PIECE / 2;
  // The left knob sits behind the body, the right knob in front of it; one
  // cap then covers the whole outline so the piece reads as a single part.
  const cap = k.onTop(puzzleRing(SOCKET, PIECE), z + PIECE_H, P, true);
  return [
    solid(k.cylinder(x - NECK, y + mid, KNOB_R, z, PIECE_H, P, 24), lit),
    solid(k.slabOf({ x, y, w: PIECE, d: PIECE, r: 1 }, z, PIECE_H, P, 3), lit),
    solid(
      k.cylinder(x + PIECE + NECK, y + mid, KNOB_R, z, PIECE_H, P, 24),
      lit,
    ),
    solid({ fill: cap, top: cap, outline: cap, shades: [], crease: "" }, lit),
  ].join("");
}

export function figure() {
  return {
    label:
      "A browser window lying flat as a slab, with tabs along its back edge and a toolbar; a lit puzzle-piece module hovers above its matching socket in the toolbar.",
    body: [windowBody(), page(), tabStrip(), toolbar(), guides(), piece()],
  };
}
