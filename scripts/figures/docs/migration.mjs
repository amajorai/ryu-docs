/*
 * "Migration": moving an existing setup across, drawn as two trays joined by a
 * conveyor. Blocks leave the half-empty source tray, ride the belt (one of
 * them, mid-transit, is the lit part) and land in the matching slots of the
 * destination tray.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  knob,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 380;

const PLATE = { x: -154, y: -54, w: 308, d: 104, r: 8 };
const TRAY = 74;
const TRAY_WALL = 5;
const TRAY_H = 10;
const FLOOR = 3;
const SOURCE = { x: -146, y: -48, w: TRAY, d: TRAY, r: 4 };
const TARGET = { x: 72, y: -48, w: TRAY, d: TRAY, r: 4 };
const CONTROL = { x: -12, y: 29, w: 46, d: 18, r: 3 };
const RULER = { x: -138, y: 35, w: 104, d: 7, r: 1 };
const CELL = 18;
const GAP = 4;
const BLOCK_H = 14;
// Row by row from the back: the source keeps its back-left blocks and the
// target has filled its first slots nearest the belt.
const SOURCE_FULL = [true, true, false, true, false, false, true, false, false];
const TARGET_FULL = [
  true,
  false,
  false,
  true,
  false,
  false,
  false,
  false,
  false,
];
const BELT = { x: -66, y: -24, w: 132, d: 26, r: 2 };
const RAIL_W = 4;
const BELT_Z = 16;
const LEGS = [-50, 0, 50];
const RIDERS = [-38, 0, 38];
const LIT_RIDER = 1;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [SOURCE.x, SOURCE.y, BLOCK_H + FLOOR],
    [BELT.x, BELT.y, BELT_Z + BLOCK_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A cube block with a groove round its top and a dimple in the middle. */
function block([x, y], z, lit = false) {
  const plan = { x, y, w: CELL, d: CELL, r: 1.6 };
  const top = z + BLOCK_H;
  return [
    solid(k.slabOf(plan, z, BLOCK_H, P, 3, 0.6), {
      tone: lit ? "hi" : "mid",
      crease: lit ? "lo" : "faint",
      lit,
    }),
    line(k.planOutline(k.insetPlan(plan, 3), top, P, 2), { tone: "faint" }),
    dots([at([x + CELL / 2, y + CELL / 2, top])], {
      size: 0.5,
      tone: lit ? "hi" : "mid",
    }),
  ].join("");
}

/** Cell origins of a tray's three-by-three grid. */
function cells(tray) {
  const out = [];
  const start = TRAY_WALL + 1;
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      out.push([
        tray.x + start + column * (CELL + GAP),
        tray.y + start + row * (CELL + GAP),
      ]);
    }
  }
  return out;
}

const trayWalls = (tray) => ({
  back: { x: tray.x, y: tray.y, w: tray.w, d: TRAY_WALL, r: 1 },
  left: { x: tray.x, y: tray.y, w: TRAY_WALL, d: tray.d, r: 1 },
  right: {
    x: tray.x + tray.w - TRAY_WALL,
    y: tray.y,
    w: TRAY_WALL,
    d: tray.d,
    r: 1,
  },
  front: {
    x: tray.x,
    y: tray.y + tray.d - TRAY_WALL,
    w: tray.w,
    d: TRAY_WALL,
    r: 1,
  },
});

const wall = (plan) =>
  solid(k.slabOf(plan, FLOOR, TRAY_H - FLOOR, P, 2, 0.4), { tone: "mid" });

function tray(plan, full) {
  const walls = trayWalls(plan);
  const grid = cells(plan);
  const filled = grid.filter((_, index) => full[index]);
  const empty = grid.filter((_, index) => !full[index]);
  return [
    `<path class="iso-halo" d="${k.haloOf(plan, 0, 4, P)}"/>`,
    solid(k.slabOf(plan, 0, FLOOR, P, 6, 0.4), { tone: "lo" }),
    wall(walls.back),
    wall(walls.left),
    ...empty.map(([x, y]) =>
      line(
        k.planOutline({ x, y, w: CELL, d: CELL, r: 1.6 }, FLOOR + 0.1, P, 3),
        { tone: "lo", dashed: true },
      ),
    ),
    ...byDepth(filled, P).map((cell) => block(cell, FLOOR)),
    wall(walls.right),
    wall(walls.front),
    screws(k.corners(plan, 2), TRAY_H, P, 1),
  ].join("");
}

/** A leg pair under the belt with a cross brace. */
function legs(x) {
  const out = [];
  for (const y of [BELT.y + 2, BELT.y + BELT.d - 2]) {
    out.push(
      solid(k.cylinder(x, y, 3.4, 0, 1.2, P, 20), { tone: "lo" }),
      solid(k.cylinder(x, y, 2, 1.2, BELT_Z - 6, P, 16), { tone: "mid" }),
    );
  }
  out.push(
    solid(
      k.slabOf(
        { x: x - 1.2, y: BELT.y + 2, w: 2.4, d: BELT.d - 4, r: 0.4 },
        6,
        2,
        P,
        1,
      ),
      { tone: "mid", crease: "none" },
    ),
  );
  return out.join("");
}

const rail = (y) =>
  solid(
    k.slabOf(
      { x: BELT.x, y, w: BELT.w, d: RAIL_W, r: 1 },
      BELT_Z - 7,
      9,
      P,
      2,
      0.4,
    ),
    { tone: "mid" },
  );

function belt() {
  const inner = {
    x: BELT.x + 2,
    y: BELT.y + RAIL_W,
    w: BELT.w - 4,
    d: BELT.d - RAIL_W * 2,
    r: 1,
  };
  const out = [
    solid(k.slabOf(inner, BELT_Z - 4, 4, P, 2), { tone: "lo", crease: "none" }),
  ];
  for (let x = inner.x + 4; x < inner.x + inner.w - 2; x += 6) {
    out.push(
      line(
        k.lineOnTop(
          [x, inner.y + 0.6],
          [x, inner.y + inner.d - 0.6],
          BELT_Z,
          P,
        ),
        {
          tone: "faint",
        },
      ),
    );
  }
  // Engraved chevrons point the way the belt runs.
  for (const x of [-57, -19, 19, 57]) {
    out.push(
      line(
        k.onTop(
          [
            [x - 3, inner.y + 2],
            [x + 2, inner.y + inner.d / 2],
            [x - 3, inner.y + inner.d - 2],
          ],
          BELT_Z + 0.05,
          P,
        ),
        { tone: "mid" },
      ),
    );
  }
  return out.join("");
}

/** Roller axle caps along the front rail's outer face. */
function rollerCaps() {
  const face = BELT.y + BELT.d;
  const caps = [];
  const centres = [];
  for (let x = BELT.x + 8; x < BELT.x + BELT.w - 4; x += 16) {
    caps.push(k.sideRing([x, face, BELT_Z - 2.5], 2, "y", P, 16));
    centres.push(at([x, face, BELT_Z - 2.5]));
  }
  return [
    line(caps.join(""), { tone: "lo" }),
    dots(centres, { size: 0.45, tone: "mid" }),
  ].join("");
}

function conveyor() {
  const riders = RIDERS.map((x, index) => [
    x - CELL / 2,
    BELT.y + RAIL_W,
    index,
  ]);
  return [
    `<path class="iso-halo" d="${k.haloOf(BELT, 0, 2, P)}" style="opacity:.2"/>`,
    ...LEGS.map(legs),
    rail(BELT.y),
    belt(),
    ...byDepth(riders, P).map(([x, y, index]) =>
      block([x, y], BELT_Z, index === LIT_RIDER),
    ),
    rail(BELT.y + BELT.d - RAIL_W),
    rollerCaps(),
  ].join("");
}

/** The belt's control box: a speed knob and an idle lamp. */
function control() {
  const top = 10;
  const lid = k.insetPlan(CONTROL, 1.5);
  return [
    `<path class="iso-halo" d="${k.haloOf(CONTROL, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(CONTROL, 0, top, P, 4, 0.6), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(lid, 2), top, P, 3), { tone: "faint" }),
    knob([CONTROL.x + 12, CONTROL.y + CONTROL.d / 2], top, P, { radius: 5 }),
    lamp([CONTROL.x + 28, CONTROL.y + CONTROL.d / 2], top, P),
    screws(
      [
        [CONTROL.x + CONTROL.w - 6, CONTROL.y + 5],
        [CONTROL.x + CONTROL.w - 6, CONTROL.y + CONTROL.d - 5],
      ],
      top,
      P,
      1.1,
    ),
  ].join("");
}

export function figure() {
  return {
    label:
      "Two trays of blocks on a bench plate joined by a raised conveyor belt: blocks leave gaps in the source tray, ride the belt (the middle one lit) and fill matching slots in the destination tray.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip(RULER, P),
      tray(SOURCE, SOURCE_FULL),
      conveyor(),
      tray(TARGET, TARGET_FULL),
      control(),
    ],
  };
}
