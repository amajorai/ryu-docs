/*
 * "SDKs": ready-made parts for building on Ryu, drawn as a box of building
 * blocks with its lid set aside. Each compartment holds one kind of block; a
 * small build in front ends in one lit brick, the part just snapped on.
 */

import { byDepth, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 330;

const CASE = { x: -72, y: -48, w: 144, d: 96, r: 4 };
const FLOOR_H = 4;
const WALL = 3;
const CASE_H = 15;
const DIV = 1.6;
const DIV_H = CASE_H - 2.5;
const COLS = 3;
const ROWS = 2;
const INNER = k.insetPlan(CASE, WALL);
const CELL_W = (INNER.w - DIV * (COLS - 1)) / COLS;
const CELL_D = (INNER.d - DIV * (ROWS - 1)) / ROWS;
const LID = { x: CASE.x + 34, y: CASE.y - 84, w: CASE.w - 18, d: 72, r: 5 };
const LID_H = 6;
const BUILD = [CASE.x + CASE.w + 34, CASE.y + 30];
const BRICK = { w: 22, d: 13, h: 8 };
const STUD_R = 2.3;
const STUD_H = 2;

const P = k.fitProjection(
  [
    ...k.boxCorners(CASE, 0, CASE_H),
    ...k.boxCorners(LID, 0, LID_H),
    [BUILD[0] + BRICK.w, BUILD[1] + BRICK.d, 0],
    [BUILD[0], BUILD[1], BRICK.h * 2 + STUD_H + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);

const prism = (ring, z, h, { lit = false } = {}) =>
  solid(k.extrude(ring, z, h, P, { convex: true, bevel: 0.4 }), {
    tone: lit ? "hi" : "mid",
    lit,
    crease: "lo",
  });

const box = (x, y, w, d, z, h, r = 1) =>
  prism(k.roundedPlan({ x, y, w, d, r }, 3), z, h);

/** A brick with a grid of studs on its top, its bottom at `z`. */
function brick(x, y, z, { cols = 3, rows = 2, lit = false } = {}) {
  const top = z + BRICK.h;
  const plan = { x, y, w: BRICK.w, d: BRICK.d, r: 1 };
  const studs = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      studs.push([x + 3.5 + c * ((BRICK.w - 7) / (cols - 1)), y + 3.5 + r * 6]);
    }
  }
  return [
    prism(k.roundedPlan(plan, 3), z, BRICK.h, { lit }),
    ...byDepth(studs, P).map(([sx, sy]) =>
      solid(k.cylinder(sx, sy, STUD_R, top, STUD_H, P, 12), {
        tone: lit ? "hi" : "mid",
        lit,
        crease: "none",
      }),
    ),
  ].join("");
}

const triangle = (x, y, s) => [
  [x, y + s],
  [x + s, y + s],
  [x + s / 2, y],
];

/** The blocks that fill compartment `index`, as [x, y, draw] in plan. */
function contents(index, cell) {
  const { x, y } = cell;
  const z = FLOOR_H;
  const grid = (gap, size, draw) => {
    const out = [];
    for (let c = 0; c < 2; c++) {
      for (let r = 0; r < 2; r++) {
        const px = x + 6 + c * gap;
        const py = y + 6 + r * gap;
        out.push([px + size / 2, py + size / 2, () => draw(px, py)]);
      }
    }
    return out;
  };
  switch (index) {
    case 0:
      return grid(17, 12, (px, py) => box(px, py, 12, 12, z, 11));
    case 1:
      return grid(17, 12, (px, py) =>
        solid(k.cylinder(px + 6, py + 6, 6, z, 11, P, 24, 0.4), {
          tone: "mid",
          crease: "lo",
        }),
      );
    case 2:
      return [
        [x + 16, y + 10, () => brick(x + 8, y + 4, z)],
        [x + 16, y + 26, () => brick(x + 8, y + 21, z)],
      ];
    case 3:
      return [0, 1, 2].map((i) => [
        x + 8 + i * 12,
        y + 20,
        () => prism(triangle(x + 4 + i * 12, y + 10, 11), z, 10),
      ]);
    case 4:
      return grid(17, 12, (px, py) =>
        prism(k.circleRing(px + 6, py + 6, 6.6, 6), z, 9),
      );
    default:
      return [0, 1, 2, 3].map((i) => [
        x + CELL_W / 2,
        y + 7 + i * 9,
        () => box(x + 5, y + 4 + i * 9, CELL_W - 10, 6, z, 6, 0.8),
      ]);
  }
}

/** Interior dividers that close the right and front sides of a cell. */
function dividers(cell, col, row) {
  const out = [];
  if (col < COLS - 1) {
    out.push(
      box(cell.x + CELL_W, cell.y, DIV, CELL_D + DIV, FLOOR_H, DIV_H, 0.3),
    );
  }
  if (row < ROWS - 1) {
    out.push(box(cell.x, cell.y + CELL_D, CELL_W, DIV, FLOOR_H, DIV_H, 0.3));
  }
  return out.join("");
}

function compartments() {
  const cells = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cell = {
        x: INNER.x + col * (CELL_W + DIV),
        y: INNER.y + row * (CELL_D + DIV),
      };
      const draw = () =>
        byDepth(contents(row * COLS + col, cell), P)
          .map(([, , part]) => part())
          .join("") + dividers(cell, col, row);
      cells.push([cell.x + CELL_W / 2, cell.y + CELL_D / 2, draw]);
    }
  }
  return byDepth(cells, P).map(([, , draw]) => draw());
}

const wall = (plan) =>
  solid(k.slabOf(plan, FLOOR_H, CASE_H - FLOOR_H, P, 2, 0.4), { tone: "mid" });

function caseBack() {
  return [
    `<path class="iso-halo" d="${k.haloOf(CASE, 0, 2, P)}"/>`,
    solid(k.slabOf(CASE, 0, FLOOR_H, P, 6, 0.6), { tone: "mid" }),
    wall({ x: CASE.x, y: CASE.y, w: CASE.w, d: WALL, r: 1 }),
    wall({ x: CASE.x, y: CASE.y, w: WALL, d: CASE.d, r: 1 }),
  ].join("");
}

function caseFront() {
  const right = {
    x: CASE.x + CASE.w - WALL,
    y: CASE.y,
    w: WALL,
    d: CASE.d,
    r: 1,
  };
  const front = {
    x: CASE.x,
    y: CASE.y + CASE.d - WALL,
    w: CASE.w - WALL,
    d: WALL,
    r: 1,
  };
  const face = CASE.y + CASE.d;
  // Two latch keepers on the front, where the lid's clasps catch.
  const keepers = [CASE.x + 30, CASE.x + CASE.w - 30].map((x) =>
    solid(k.slabOf({ x: x - 5, y: face, w: 10, d: 1.6, r: 0.5 }, 5, 6, P, 2), {
      tone: "mid",
      crease: "lo",
    }),
  );
  return [
    wall(front),
    wall(right),
    ...keepers,
    line(k.sideSeam(CASE, FLOOR_H, P, 2), { tone: "faint" }),
    screws(k.corners(CASE, 1.5).slice(1), CASE_H, P, 0.9),
  ].join("");
}

function lid() {
  const top = LID_H;
  return [
    `<path class="iso-halo" d="${k.haloOf(LID, 0, 2, P)}"/>`,
    solid(k.slabOf(LID, 0, LID_H, P, 6, 0.8), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(LID, 5), top, P, 4), { tone: "lo" }),
    line(k.planOutline(k.insetPlan(LID, 7), top, P, 4), { tone: "faint" }),
    screws(k.corners(LID, 2.6), top, P, 1.1),
    // A carry handle across the middle of the upturned lid.
    solid(
      k.slabOf(
        {
          x: LID.x + LID.w / 2 - 22,
          y: LID.y + LID.d / 2 - 4,
          w: 44,
          d: 8,
          r: 3,
        },
        top,
        3,
        P,
        4,
        0.4,
      ),
      { tone: "mid", crease: "lo" },
    ),
  ].join("");
}

function build() {
  const [x, y] = BUILD;
  return [
    `<path class="iso-halo" d="${k.haloOf({ x, y, w: BRICK.w, d: BRICK.d, r: 2 }, 0, 1, P)}" style="filter:blur(5px)"/>`,
    brick(x, y, 0),
    brick(x - 6, y, BRICK.h, { lit: true }),
  ].join("");
}

export function figure() {
  return {
    label:
      "An open box of building blocks with its lid set aside: compartments hold cubes, cylinders, wedges, hexagons, beams and studded bricks, and a small build in front is topped with one lit brick.",
    body: [lid(), caseBack(), ...compartments(), caseFront(), build()],
  };
}
