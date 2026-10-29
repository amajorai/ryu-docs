/*
 * "Extend": Ryu is built from parts you can add to, drawn as a construction
 * kit. A studded bench carries a wall laid in an offset bond and stepped down
 * at one end, a few loose bricks wait in front, and the next brick (the lit part) hovers above
 * the gap it is about to fill.
 */

import { benchPlate, k, line, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const UNIT = 8;
const BRICK_H = 9.6;
const STUD_R = 2.4;
const STUD_H = 1.8;
const GRID = { x: -36, y: -28, columns: 9, rows: 7 };
const PLATE = { x: -48, y: -40, w: 96, d: 80, r: 8 };
const LIFT = 16;

// Bricks as [column, row, width, depth, layer] on the stud grid: a wall laid
// in an offset bond and stepped down at one end, and loose bricks in front.
const WALL = [
  [0, 0, 2, 4, 0],
  [0, 4, 2, 3, 0],
  [0, 0, 2, 2, 1],
  [0, 2, 2, 4, 1],
  [0, 6, 2, 1, 1],
  [0, 0, 2, 4, 2],
  [0, 4, 2, 2, 2],
  [0, 0, 2, 2, 3],
];
const LOOSE = [
  [4, 0, 4, 2, 0],
  [3, 4, 2, 2, 0],
  [6, 3, 3, 2, 0],
  [5, 6, 4, 1, 0],
];
const NEXT = [0, 2, 2, 4, 3];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [GRID.x, GRID.y, 4 * BRICK_H + LIFT + STUD_H],
    [GRID.x, GRID.y + 6 * UNIT, 4 * BRICK_H + LIFT + STUD_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** The world box of a brick, raised by `lift`. */
function boxOf([column, row, w, d, layer], lift = 0) {
  const x0 = GRID.x + column * UNIT;
  const y0 = GRID.y + row * UNIT;
  const z0 = layer * BRICK_H + lift;
  return {
    x0,
    x1: x0 + w * UNIT,
    y0,
    y1: y0 + d * UNIT,
    z0,
    z1: z0 + BRICK_H,
  };
}

const covers = (brick, column, row, layer) =>
  brick[4] === layer &&
  column >= brick[0] &&
  column < brick[0] + brick[2] &&
  row >= brick[1] &&
  row < brick[1] + brick[3];

const placed = [...WALL, ...LOOSE];
const coveredAt = (column, row, layer) =>
  placed.some((brick) => covers(brick, column, row, layer));

function stud(x, y, z, { tone = "mid", lit = false } = {}) {
  return solid(k.cylinder(x, y, STUD_R, z, STUD_H, P, 10), {
    tone,
    lit,
  });
}

/** A low bench stud painted as one top-toned disc, to keep the file small. */
function benchStud(x, y) {
  const paths = k.cylinder(x, y, STUD_R, 0, STUD_H, P, 8);
  return `<g class="iso-solid"><path class="iso-top" d="${paths.fill}"/><path class="iso-line iso-edge" data-tone="lo" d="${paths.outline}"/></g>`;
}

/** A brick with the studs that nothing sits on. */
function brick(spec, { lift = 0, lit = false } = {}) {
  const box = boxOf(spec, lift);
  const tone = lit ? "hi" : "mid";
  const out = [
    solid(
      k.slabOf(
        {
          x: box.x0,
          y: box.y0,
          w: box.x1 - box.x0,
          d: box.y1 - box.y0,
          r: 0.6,
        },
        box.z0,
        BRICK_H,
        P,
        2,
      ),
      { tone, lit },
    ),
  ];
  const [column, row, w, d, layer] = spec;
  const studs = [];
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      if (lit || !coveredAt(column + i, row + j, layer + 1)) {
        studs.push([box.x0 + (i + 0.5) * UNIT, box.y0 + (j + 0.5) * UNIT]);
      }
    }
  }
  studs.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [x, y] of studs) {
    out.push(stud(x, y, box.z1, { tone, lit }));
  }
  return { box, svg: out.join("") };
}

/** The bench's own studs, wherever no brick stands on them. */
function benchStuds() {
  const items = [];
  for (let i = 0; i < GRID.columns; i++) {
    for (let j = 0; j < GRID.rows; j++) {
      if (coveredAt(i, j, 0)) {
        continue;
      }
      const x = GRID.x + (i + 0.5) * UNIT;
      const y = GRID.y + (j + 0.5) * UNIT;
      items.push({
        box: {
          x0: x - STUD_R,
          x1: x + STUD_R,
          y0: y - STUD_R,
          y1: y + STUD_R,
          z0: 0,
          z1: STUD_H,
        },
        svg: benchStud(x, y),
      });
    }
  }
  return items;
}

// `a` can never hide `b` when it is wholly behind it along some axis (the
// viewer looks down every axis from its positive side).
const clearOf = (a, b) => a.x1 <= b.x0 || a.y1 <= b.y0 || a.z1 <= b.z0;
const behind = (a, b) => clearOf(a, b) && !clearOf(b, a);

/** The screen rectangle a box covers. */
function extentOf({ x0, x1, y0, y1, z0, z1 }) {
  const points = k
    .boxCorners({ x: x0, y: y0, w: x1 - x0, d: y1 - y0 }, z0, z1)
    .map(at);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const overlap = (a, b) =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Paint order for disjoint boxes: of any two that overlap on screen, the one
 * that may be hidden by the other goes first.
 */
function paintOrder(items) {
  const depth = ({ box }) =>
    k.depthOf([(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, box.z0], P);
  const pending = [...items]
    .sort((a, b) => depth(a) - depth(b))
    .map((item) => ({ ...item, extent: extentOf(item.box) }));
  const out = [];
  while (pending.length > 0) {
    const index = pending.findIndex(
      (item) =>
        !pending.some(
          (other) =>
            other !== item &&
            overlap(other.extent, item.extent) &&
            behind(other.box, item.box),
        ),
    );
    const [next] = pending.splice(Math.max(0, index), 1);
    out.push(next.svg);
  }
  return out;
}

/** Dotted drop lines from the hovering brick to where it will seat. */
function guides() {
  const box = boxOf(NEXT);
  const corners = [
    [box.x0, box.y1],
    [box.x1, box.y1],
    [box.x1, box.y0],
  ];
  return line(
    corners
      .map(([x, y]) => k.segment([x, y, box.z0], [x, y, box.z0 + LIFT], P))
      .join(""),
    { tone: "lo", dotted: true },
  );
}

export function figure() {
  const items = [
    ...benchStuds(),
    ...placed.map((spec) => brick(spec)),
    { box: { ...boxOf(NEXT), z1: boxOf(NEXT).z0 + LIFT }, svg: guides() },
    brick(NEXT, { lift: LIFT, lit: true }),
  ];
  return {
    label:
      "A studded bench plate carrying a partly built wall of interlocking bricks, with loose bricks beside it and one lit brick hovering above the gap it will fill.",
    body: [
      benchPlate(PLATE, P),
      line(
        k.planOutline(
          {
            x: GRID.x - 2,
            y: GRID.y - 2,
            w: GRID.columns * UNIT + 4,
            d: GRID.rows * UNIT + 4,
            r: 1,
          },
          0,
          P,
          2,
        ),
        {
          tone: "faint",
        },
      ),
      ...paintOrder(items),
    ],
  };
}
