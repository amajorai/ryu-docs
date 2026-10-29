/*
 * "Tools": one catalog of callable tools, drawn as a shadow-board tool case. A
 * foam tray holds a wrench, a hammer, a socket rail and a tape measure in fitted
 * pockets under a pegboard back panel; the screwdriver (the lit part) is lifted
 * out above its empty pocket, the way an agent picks one tool to call.
 */

import { byDepth, dots, k, knob, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const CASE = { x: -124, y: -62, w: 236, d: 124, r: 6 };
const CASE_H = 14;
const FOAM = k.insetPlan(CASE, 6);
const FOAM_Z = CASE_H + 2;
const BOARD = { x: CASE.x + 6, y: CASE.y - 6, w: CASE.w - 12, d: 6, r: 1.5 };
const BOARD_H = 38;
const WRENCH = { y: -14, from: -52, to: 4, ring: 8, jaw: 8.5, half: 2.8 };
const DRIVER = { y: 18, handle: [-104, -70], shaft: [-70, -32] };
const LIFT = 24;
const SOCKETS = { y: -42, x: -100, radii: [3, 3.6, 4.2, 4.8, 5.4, 6] };
const HAMMER = { x: 18, y: -48 };
const TAPE = [82, -30];
const KEYS = { x: -100, y: 42, count: 6 };
const BIN = { x: 64, y: 6, w: 38, d: 40, r: 2 };

const P = k.fitProjection(
  [
    ...k.boxCorners(CASE, -5, FOAM_Z),
    [BOARD.x, BOARD.y, CASE_H + BOARD_H + 4],
    [BOARD.x + BOARD.w, BOARD.y, CASE_H + BOARD_H + 4],
    [DRIVER.handle[0], DRIVER.y, FOAM_Z + LIFT + 10],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** Grow (or shrink, with a negative `by`) a plan polygon by mitred offsets. */
function offsetRing(ring, by) {
  const count = ring.length;
  let area = 0;
  for (let i = 0; i < count; i++) {
    const [ax, ay] = ring[i];
    const [bx, by2] = ring[(i + 1) % count];
    area += ax * by2 - bx * ay;
  }
  const normal = (a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1;
    return area > 0 ? [dy / length, -dx / length] : [-dy / length, dx / length];
  };
  return ring.map((point, i) => {
    const before = normal(ring[(i + count - 1) % count], point);
    const after = normal(point, ring[(i + 1) % count]);
    const mx = before[0] + after[0];
    const my = before[1] + after[1];
    const length = Math.hypot(mx, my) || 1;
    const miter = Math.max(
      0.5,
      (mx / length) * after[0] + (my / length) * after[1],
    );
    return [
      point[0] + (mx / length) * (by / miter),
      point[1] + (my / length) * (by / miter),
    ];
  });
}

/** A pocket cut to a tool's outline: a hard rim and a soft inner wall line. */
const pocketOf = (ring) =>
  [
    line(k.onTop(offsetRing(ring, 2.2), FOAM_Z, P, true), { tone: "lo" }),
    line(k.onTop(offsetRing(ring, 1), FOAM_Z, P, true), { tone: "faint" }),
  ].join("");

/** A rounded pocket around a plan. */
const pocket = (plan) => pocketOf(k.ringOf(k.insetPlan(plan, 2.2), 4));

function caseBody() {
  return [
    `<path class="iso-halo" d="${k.haloOf(CASE, -5, 5, P)}"/>`,
    solid(k.slabOf(CASE, -5, 5, P, 8, 0.8), { tone: "lo" }),
    solid(k.slabOf(CASE, 0, CASE_H, P, 8, 1.2), { tone: "mid" }),
    line(k.sideSeam(CASE, 4, P, 8), { tone: "faint" }),
    solid(k.slabOf(FOAM, CASE_H, 2, P, 6), { tone: "lo", crease: "none" }),
    screws(k.corners(CASE, 3), CASE_H, P, 1.2),
  ].join("");
}

/** Two latches on the front face of the case. */
function latches() {
  const face = CASE.y + CASE.d;
  return [-60, 40]
    .map((x) =>
      solid(k.slabOf({ x, y: face, w: 16, d: 2, r: 0.6 }, 3, 8, P, 2, 0.3), {
        tone: "mid",
      }),
    )
    .join("");
}

/** The pegboard panel standing at the back, with holes and two hooks. */
function pegboard() {
  const face = BOARD.y + BOARD.d;
  const out = [
    solid(k.slabOf(BOARD, CASE_H, BOARD_H, P, 3, 0.4), { tone: "mid" }),
  ];
  const holes = [];
  for (let col = 0; col < 21; col++) {
    for (let row = 0; row < 3; row++) {
      holes.push(at([BOARD.x + 9 + col * 10.5, face, CASE_H + 12 + row * 9.5]));
    }
  }
  out.push(dots(holes, { size: 0.6, tone: "mid" }));
  const peg = (x, z) =>
    solid(k.slabOf({ x, y: face, w: 2.4, d: 4, r: 0.6 }, z, 2.4, P, 1), {
      tone: "mid",
    });
  const panel = (x, w, z, h) =>
    solid(k.slabOf({ x, y: face + 1, w, d: 1.4, r: 0.3 }, z, h, P, 1), {
      tone: "mid",
      crease: "lo",
    });
  // A coil of cable on one peg.
  const coil = [-74, face + 2, CASE_H + 26];
  out.push(
    line(
      [0, 1.4, 2.8]
        .map((dx) =>
          k.sideRing(
            [coil[0] + dx, coil[1], coil[2] - dx * 0.4],
            8,
            "y",
            P,
            32,
          ),
        )
        .join(""),
      { tone: "mid" },
    ),
    peg(coil[0], coil[2] + 7),
  );
  // A carpenter's square hung from two pegs.
  const sq = { x: 34, z: CASE_H + 12 };
  out.push(
    peg(sq.x + 2, sq.z + 26),
    peg(sq.x + 40, sq.z + 6),
    panel(sq.x, 6, sq.z, 26),
    panel(sq.x, 54, sq.z, 6),
  );
  const marks = k.sideTicks(
    sq.x + 10,
    sq.x + 52,
    3,
    4,
    face + 2.4,
    sq.z + 6,
    [1.2, 2.4],
    P,
  );
  out.push(line(marks.minor + marks.major, { tone: "lo" }));
  return out.join("");
}

/** Points on a circle of `radius` round `centre`, from angle a0 to a1. */
const arc = ([cx, cy], radius, a0, a1, steps) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  });

/** A combination wrench outline: a ring end, a shaft and an open jaw. */
function wrenchRing() {
  const { y, from, to, ring, jaw, half } = WRENCH;
  const left = [from, y];
  const right = [to, y];
  const neckL = Math.asin(half / ring);
  const neckR = Math.asin(half / jaw);
  const mouth = Math.asin((half + 0.6) / jaw);
  const throat = to - 1.5;
  return [
    ...arc(left, ring, neckL, Math.PI * 2 - neckL, 28),
    ...arc(right, jaw, Math.PI + neckR, Math.PI * 2 - mouth, 12),
    [throat, y - half - 0.6],
    [throat, y + half + 0.6],
    ...arc(right, jaw, mouth, Math.PI - neckR, 12),
  ];
}

function wrench() {
  const { y, from, to, ring } = WRENCH;
  const outline = wrenchRing();
  const top = FOAM_Z + 2.6;
  return [
    pocketOf(outline),
    solid(k.extrude(outline, FOAM_Z, 2.6, P, { convex: false }), {
      tone: "mid",
    }),
    line(k.ring(from, y, ring - 3.6, top, P, 12), { tone: "lo" }),
    line(k.lineOnTop([from + ring + 4, y], [to - 12, y], top, P), {
      tone: "faint",
    }),
  ].join("");
}

const driverPocket = () =>
  pocket({
    x: DRIVER.handle[0] - 2,
    y: DRIVER.y - 7,
    w: DRIVER.shaft[1] - DRIVER.handle[0] + 4,
    d: 14,
    r: 6,
  });

/** The screwdriver: a fluted handle, a ferrule and a long shaft. */
function screwdriver(z, lit) {
  const [h0, h1] = DRIVER.handle;
  const [s0, s1] = DRIVER.shaft;
  const y = DRIVER.y;
  const handle = { x: h0, y: y - 5.5, w: h1 - h0, d: 11, r: 5.5 };
  const out = [
    solid(
      k.slabOf(
        { x: s0, y: y - 1.8, w: s1 - s0, d: 3.6, r: 1.8 },
        z + 2,
        3.6,
        P,
        3,
      ),
      {
        tone: "mid",
      },
    ),
    solid(
      k.slabOf(
        { x: s1 - 1, y: y - 2.2, w: 4, d: 4.4, r: 0.4 },
        z + 2.4,
        2,
        P,
        2,
      ),
      {
        tone: "mid",
      },
    ),
    solid(k.slabOf(handle, z, 9, P, 6, 0.6), {
      tone: lit ? "hi" : "mid",
      lit,
      crease: "lo",
    }),
    solid(k.slabOf({ x: h1 - 1, y: y - 4, w: 5, d: 8, r: 2 }, z + 1, 7, P, 4), {
      tone: "mid",
    }),
  ];
  for (const dy of [-3, 0, 3]) {
    out.push(
      line(k.lineOnTop([h0 + 6, y + dy], [h1 - 5, y + dy], z + 9, P), {
        tone: "lo",
      }),
    );
  }
  return out.join("");
}

/** A rail of sockets in rising sizes, each with a hex bore on its face. */
function sockets() {
  const { y, x, radii } = SOCKETS;
  const rail = { x: x - 8, y: y - 3, w: 82, d: 6, r: 2 };
  const out = [
    pocket(k.insetPlan(rail, -3)),
    solid(k.slabOf(rail, FOAM_Z, 2, P, 3), { tone: "lo" }),
  ];
  let cx = x;
  const placed = radii.map((r) => {
    const centre = [cx, y];
    cx += r * 2 + 3;
    return [...centre, r];
  });
  for (const [px, py, r] of byDepth(placed, P)) {
    out.push(
      solid(k.cylinder(px, py, r, FOAM_Z + 2, 5 + r, P, 28), { tone: "mid" }),
      line(k.ring(px, py, r * 0.55, FOAM_Z + 7 + r, P, 6), { tone: "lo" }),
    );
  }
  return out.join("");
}

function hammer() {
  const { x, y } = HAMMER;
  const head = { x, y, w: 40, d: 12, r: 2 };
  const grip = { x: x + 16, y: y + 12, w: 8, d: 72, r: 3 };
  return [
    pocketOf([
      [x, y],
      [x + 40, y],
      [x + 40, y + 12],
      [x + 24, y + 12],
      [x + 24, y + 84],
      [x + 16, y + 84],
      [x + 16, y + 12],
      [x, y + 12],
    ]),
    solid(k.slabOf(grip, FOAM_Z, 5, P, 4), { tone: "mid" }),
    line(
      k.planOutline(
        k.insetPlan({ ...grip, y: grip.y + 40, d: 30 }, 1.5),
        FOAM_Z + 5,
        P,
        3,
      ),
      {
        tone: "lo",
      },
    ),
    solid(k.slabOf(head, FOAM_Z, 8, P, 3, 0.5), { tone: "mid" }),
    line(k.lineOnTop([x + 6, y + 6], [x + 34, y + 6], FOAM_Z + 8, P), {
      tone: "faint",
    }),
  ].join("");
}

function tape() {
  const [x, y] = TAPE;
  return [
    pocket({ x: x - 16, y: y - 16, w: 32, d: 32, r: 15 }),
    solid(k.cylinder(x, y, 14, FOAM_Z, 9, P, 48, 0.8), { tone: "mid" }),
    line(k.ring(x, y, 8, FOAM_Z + 9, P, 40), { tone: "lo" }),
    knob([x, y], FOAM_Z + 9, P, { radius: 3, height: 2 }),
  ].join("");
}

/** A hex-key stand: bent keys of falling length standing in a stepped block. */
function hexKeys() {
  const { x, y, count } = KEYS;
  const block = { x: x - 5, y: y - 5, w: count * 8 + 2, d: 10, r: 2 };
  const out = [
    pocket(k.insetPlan(block, -3)),
    solid(k.slabOf(block, FOAM_Z, 5, P, 3, 0.4), { tone: "mid" }),
  ];
  for (let i = 0; i < count; i++) {
    const cx = x + i * 8;
    const r = 1.6 - i * 0.15;
    const top = FOAM_Z + 22 - i * 2.4;
    out.push(
      solid(k.cylinder(cx, y, r, FOAM_Z + 5, top - FOAM_Z - 5, P, 6), {
        tone: "mid",
        crease: "none",
      }),
      solid(
        k.slabOf(
          { x: cx - r, y: y - 7 + i * 0.4, w: r * 2, d: 7 - i * 0.4, r: 0.3 },
          top - r * 2,
          r * 2,
          P,
          1,
        ),
        { tone: "mid", crease: "none" },
      ),
    );
  }
  return out.join("");
}

/** A small parts bin of compartments filled with screws. */
function bin() {
  const out = [solid(k.slabOf(BIN, FOAM_Z, 4, P, 3, 0.4), { tone: "mid" })];
  const cell = { w: BIN.w / 2, d: BIN.d / 2 };
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 2; row++) {
      const plan = {
        x: BIN.x + col * cell.w + 1.5,
        y: BIN.y + row * cell.d + 1.5,
        w: cell.w - 3,
        d: cell.d - 3,
        r: 1,
      };
      out.push(line(k.planOutline(plan, FOAM_Z + 4, P, 3), { tone: "lo" }));
    }
  }
  out.push(
    dots(k.dotGrid(BIN.x + 6, BIN.y + 6, 3, 2, 3, FOAM_Z + 4, P), {
      size: 0.6,
    }),
  );
  return out.join("");
}

export function figure() {
  return {
    label:
      "An open tool case with a pegboard back panel: a wrench, a hammer, a socket rail, a tape measure and a parts bin sit in fitted foam pockets, and a lit screwdriver is lifted out above its empty pocket.",
    body: [
      caseBody(),
      pegboard(),
      latches(),
      sockets(),
      hammer(),
      wrench(),
      driverPocket(),
      tape(),
      bin(),
      hexKeys(),
      `<path class="iso-halo" d="${k.haloOf({ x: DRIVER.handle[0], y: DRIVER.y - 6, w: 72, d: 12, r: 6 }, FOAM_Z, 0.1, P)}" style="filter:blur(6px);opacity:.5"/>`,
      screwdriver(FOAM_Z + LIFT, true),
    ],
  };
}
