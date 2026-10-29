/*
 * "Apps": every app from the store is its own sandboxed satellite, drawn as a
 * tray of uniform rounded tiles, each seated in a pocket of its own and marked
 * with a different glyph. One tile (the lit part) is lifted out above its empty
 * pocket, as if just picked from the store.
 */

import { byDepth, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const COLUMNS = 4;
const ROWS = 3;
const TILE = 30;
const GAP = 13;
const MARGIN = 15;
const TRAY = {
  x: -(COLUMNS * TILE + (COLUMNS - 1) * GAP) / 2 - MARGIN,
  y: -(ROWS * TILE + (ROWS - 1) * GAP) / 2 - MARGIN,
  w: COLUMNS * TILE + (COLUMNS - 1) * GAP + MARGIN * 2,
  d: ROWS * TILE + (ROWS - 1) * GAP + MARGIN * 2,
  r: 9,
};
const FOOT_H = 4;
const TRAY_H = 12;
const TOP = TRAY_H;
const TILE_H = 7;
const LIFT = 42;
const LIFTED = 2;

const P = k.fitProjection(
  [
    ...k.boxCorners(TRAY, -FOOT_H, TOP + TILE_H),
    [TRAY.x + MARGIN + 2 * (TILE + GAP), TRAY.y, TOP + TILE_H + LIFT + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);

const cells = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const x = TRAY.x + MARGIN + column * (TILE + GAP);
  const y = TRAY.y + MARGIN + row * (TILE + GAP);
  return { index, plan: { x, y, w: TILE, d: TILE, r: 8 } };
});

function tray() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(TRAY, -FOOT_H, FOOT_H, P)}"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(TRAY, 18), P)) {
    out.push(
      solid(k.cylinder(x, y, 5, -FOOT_H, FOOT_H, P, 24), { tone: "lo" }),
    );
  }
  out.push(
    solid(k.slabOf(TRAY, 0, TRAY_H, P, 8, 1.4), { tone: "mid" }),
    line(k.sideSeam(TRAY, 4, P, 8), { tone: "faint" }),
    screws(k.corners(TRAY, 6), TOP, P, 1.3),
  );
  // A finger notch on the near long edge.
  const notch = {
    x: TRAY.x + TRAY.w / 2 - 14,
    y: TRAY.y + TRAY.d - 7,
    w: 28,
    d: 4,
    r: 2,
  };
  out.push(line(k.planOutline(notch, TOP, P, 3), { tone: "lo" }));
  return out.join("");
}

/** Each pocket: a cut outline with an inner lip, one per app. */
function pockets() {
  return cells
    .map(({ plan }) =>
      line(k.planOutline(k.insetPlan(plan, -2.5), TOP, P, 6), { tone: "lo" }),
    )
    .join("");
}

function emptyPocket(plan) {
  return [
    line(k.planOutline(k.insetPlan(plan, 1), TOP - 0.1, P, 6), {
      tone: "faint",
    }),
    dots(k.dotGrid(plan.x + 7, plan.y + 7, 4, 4, 5.4, TOP, P), {
      size: 0.45,
      tone: "lo",
    }),
    `<path class="iso-halo" d="${k.haloOf(plan, TOP, 0.1, P)}" style="filter:blur(6px);opacity:.5"/>`,
  ].join("");
}

/** A distinct mark per app, drawn on the tile's top face. */
function glyph(index, cx, cy, z) {
  const on = (points, closed = false) => k.onTop(points, z, P, closed);
  const marks = [
    () => k.ring(cx, cy, 7, z, P, 28),
    () =>
      on([
        [cx - 7, cy - 3],
        [cx + 7, cy - 3],
      ]) +
      on([
        [cx - 7, cy + 3],
        [cx + 3, cy + 3],
      ]),
    () =>
      on(
        [
          [cx, cy - 7],
          [cx + 7, cy + 6],
          [cx - 7, cy + 6],
        ],
        true,
      ),
    () => k.ring(cx, cy, 7, z, P, 4),
    () =>
      on(
        Array.from({ length: 17 }, (_, step) => [
          cx - 8 + step,
          cy + 3.5 * Math.sin((step / 16) * Math.PI * 3),
        ]),
      ),
    () =>
      k.planOutline({ x: cx - 7, y: cy - 7, w: 14, d: 14, r: 2 }, z, P, 2) +
      k.planOutline({ x: cx - 3, y: cy - 3, w: 6, d: 6, r: 1 }, z, P, 2),
    () => k.ring(cx, cy, 7.5, z, P, 30) + k.ring(cx, cy, 3, z, P, 16),
    () =>
      [-5, 0, 5]
        .map((dy, i) =>
          on([
            [cx + 7, cy + dy],
            [cx + 3 - i * 5, cy + dy],
          ]),
        )
        .join(""),
    () =>
      on([
        [cx - 7, cy],
        [cx + 7, cy],
      ]) +
      on([
        [cx, cy - 7],
        [cx, cy + 7],
      ]),
    () =>
      [
        [-7, -7],
        [1, -7],
        [-7, 1],
        [1, 1],
      ]
        .map(([dx, dy]) =>
          k.planOutline({ x: cx + dx, y: cy + dy, w: 6, d: 6, r: 1 }, z, P, 2),
        )
        .join(""),
    () => k.ring(cx, cy, 7.5, z, P, 6),
    () => k.ring(cx - 3, cy, 4.5, z, P, 20) + k.ring(cx + 3, cy, 4.5, z, P, 20),
  ];
  return marks[index % marks.length]();
}

/** One app tile standing at `z`. */
function tile({ index, plan }, z, lit = false) {
  const top = z + TILE_H;
  const cx = plan.x + TILE / 2;
  const cy = plan.y + TILE / 2;
  return [
    solid(k.slabOf(plan, z, TILE_H, P, 8, 1), {
      tone: lit ? "hi" : "mid",
      lit,
      crease: "lo",
    }),
    line(glyph(index, cx, cy, top), { tone: lit ? "hi" : "lo" }),
  ].join("");
}

/** Dotted guides from the lifted tile's near corners down to its pocket. */
function guides(plan) {
  const z = TOP + LIFT;
  return [
    [plan.x + plan.w, plan.y + plan.d / 2],
    [plan.x + plan.w / 2, plan.y + plan.d],
  ]
    .map(([x, y]) =>
      line(k.segment([x, y, z - 1], [x, y, TOP + 2], P), {
        tone: "mid",
        dotted: true,
      }),
    )
    .join("");
}

export function figure() {
  const lifted = cells[LIFTED];
  const seated = cells
    .filter((cell) => cell.index !== LIFTED)
    .map((cell) => [
      cell.plan.x + TILE / 2,
      cell.plan.y + TILE / 2,
      () => tile(cell, TOP),
    ]);
  return {
    label:
      "A tray of uniform rounded app tiles, each in its own pocket and marked with a different glyph; one lit tile is lifted out above its empty pocket.",
    body: [
      tray(),
      pockets(),
      emptyPocket(lifted.plan),
      ...byDepth(seated, P).map(([, , draw]) => draw()),
      guides(lifted.plan),
      tile(lifted, TOP + LIFT, true),
    ],
  };
}
