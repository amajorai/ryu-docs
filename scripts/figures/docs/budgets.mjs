/*
 * "Budgets": spend measured against a limit, drawn as a panel meter beside
 * stacks of coins. The meter's needle sweeps toward the shaded limit band on
 * its scale and a coin slot on its lid takes the spend; the coin stacks shrink
 * from back to front. The meter's lamp is the one lit part.
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
export const HEIGHT = 400;

const PLATE = { x: -108, y: -66, w: 208, d: 118, r: 8 };
const METER = { x: -92, y: -54, w: 96, d: 42, r: 4 };
const METER_H = 66;
const BASE_H = 4;
const FACE = METER.y + METER.d - 2;
const SIDE = METER.x + METER.w - 2;
const BEZEL = { x0: -86, x1: -6, z0: 10, z1: 62 };
const DIAL = { x: -46, z: 17, r: 36 };
const SWEEP = (55 * Math.PI) / 180;
const LIMIT_FROM = (30 * Math.PI) / 180;
const NEEDLE = (21 * Math.PI) / 180;
const SLOT = { x: -80, y: -46, w: 34, d: 10, r: 2 };
const COIN_R = 11;
const COIN_T = 2.4;
const STACKS = [
  [38, -26, 11],
  [66, -2, 7],
  [32, 10, 4],
];
const LOOSE = [72, 26];
const COIN_SHIFT = [0.9, -0.7];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [METER.x, METER.y, METER_H + 8],
    [METER.x + METER.w, METER.y, METER_H + 8],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the meter's front face between x0..x1 and z0..z1. */
const faceRect = (x0, x1, z0, z1) =>
  k.pathOf(
    [
      [x0, FACE, z0],
      [x1, FACE, z0],
      [x1, FACE, z1],
      [x0, FACE, z1],
    ].map(at),
    true,
  );

/** A point on the dial face at `angle` from upright and `radius` out. */
const onDial = (angle, radius) => [
  DIAL.x + radius * Math.sin(angle),
  FACE,
  DIAL.z + radius * Math.cos(angle),
];

const arcPoints = (from, to, radius, steps = 24) =>
  Array.from({ length: steps + 1 }, (_, step) =>
    onDial(from + ((to - from) * step) / steps, radius),
  );

function housing() {
  const body = k.insetPlan(METER, 2);
  const out = [
    `<path class="iso-halo" d="${k.haloOf(METER, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(METER, 0, BASE_H, P, 4, 0.6), { tone: "lo" }),
    solid(k.slabOf(body, BASE_H, METER_H - BASE_H, P, 4, 0.6), {
      tone: "mid",
    }),
    line(k.sideSeam(body, METER_H - 8, P, 4), { tone: "faint" }),
  ];
  // Louvres on the flank.
  for (let i = 0; i < 5; i++) {
    const z = 18 + i * 4;
    out.push(
      line(
        k.segment(
          [SIDE, METER.y + 10, z],
          [SIDE, METER.y + METER.d - 12, z],
          P,
        ),
        { tone: "lo" },
      ),
    );
  }
  return out.join("");
}

function dial() {
  const { x0, x1, z0, z1 } = BEZEL;
  const window = faceRect(x0 + 3, x1 - 3, z0 + 3, z1 - 3);
  const ticks = [];
  const count = 22;
  for (let i = 0; i <= count; i++) {
    const angle = -SWEEP + (2 * SWEEP * i) / count;
    const inner = i % 4 === 0 ? DIAL.r - 6 : DIAL.r - 3.5;
    ticks.push(k.pathOf([onDial(angle, inner), onDial(angle, DIAL.r)].map(at)));
  }
  const band = [
    ...arcPoints(LIMIT_FROM, SWEEP, DIAL.r + 4, 12),
    ...arcPoints(SWEEP, LIMIT_FROM, DIAL.r + 0.8, 12),
  ].map(at);
  const tip = onDial(NEEDLE, DIAL.r + 1);
  const tail = onDial(NEEDLE + Math.PI, 3);
  return [
    line(faceRect(x0, x1, z0, z1), { tone: "mid" }),
    `<path class="iso-top" d="${window}"/>`,
    line(window, { tone: "lo" }),
    line(k.pathOf(arcPoints(-SWEEP, SWEEP, DIAL.r).map(at)), { tone: "lo" }),
    line(ticks.join(""), { tone: "mid" }),
    `<path class="iso-shade" data-shade="0" d="${k.pathOf(band, true)}"/>`,
    line(k.pathOf(band, true), { tone: "lo" }),
    line(k.pathOf([tail, tip].map(at)), { tone: "hi" }),
    line(k.sideRing([DIAL.x, FACE, DIAL.z], 2.6, "y", P, 20), { tone: "mid" }),
    dots([at([DIAL.x, FACE, DIAL.z])], { size: 0.8, tone: "hi" }),
    faceScrews([
      [x0 + 2.6, z0 + 2.6],
      [x1 - 2.6, z0 + 2.6],
      [x1 - 2.6, z1 - 2.6],
      [x0 + 2.6, z1 - 2.6],
    ]),
  ].join("");
}

/** Screw heads on the front face: a small ring with a centre dot. */
function faceScrews(points) {
  return [
    line(
      points
        .map(([x, z]) => k.sideRing([x, FACE, z], 1.2, "y", P, 12))
        .join(""),
      { tone: "lo" },
    ),
    dots(
      points.map(([x, z]) => at([x, FACE, z])),
      { size: 0.45 },
    ),
  ].join("");
}

function lid() {
  const top = METER_H;
  const plate = k.insetPlan(METER, 2);
  return [
    line(k.planOutline(k.insetPlan(plate, 3), top, P, 3), { tone: "faint" }),
    solid(k.slabOf(SLOT, top, 1.2, P, 3), { tone: "lo", crease: "none" }),
    line(
      k.lineOnTop(
        [SLOT.x + 5, SLOT.y + SLOT.d / 2],
        [SLOT.x + SLOT.w - 5, SLOT.y + SLOT.d / 2],
        top + 1.2,
        P,
      ),
      { tone: "hi" },
    ),
    knob([-26, METER.y + 30], top, P, { radius: 4.4 }),
    lamp([-12, METER.y + 12], top, P, { lit: true, radius: 2.6 }),
    screws(k.corners(plate, 3.5), top, P, 1.2),
  ].join("");
}

/** One stack of coins: a column with a seam at every coin, the top coin offset. */
function stack([x, y, count]) {
  const below = (count - 1) * COIN_T;
  const [cx, cy] = [x + COIN_SHIFT[0], y + COIN_SHIFT[1]];
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: x - COIN_R, y: y - COIN_R, w: COIN_R * 2, d: COIN_R * 2, r: COIN_R }, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
  ];
  if (below > 0) {
    out.push(solid(k.cylinder(x, y, COIN_R, 0, below, P, 36), { tone: "mid" }));
    const seams = [];
    for (let i = 1; i < count - 1; i++) {
      seams.push(k.sideArc(x, y, COIN_R, i * COIN_T, P, 24));
    }
    out.push(line(seams.join(""), { tone: "lo" }));
  }
  out.push(
    solid(k.cylinder(cx, cy, COIN_R, below, COIN_T, P, 36, 0.3), {
      tone: "mid",
    }),
    line(k.ring(cx, cy, COIN_R - 1.8, below + COIN_T, P, 36), {
      tone: "faint",
    }),
  );
  return out.join("");
}

export function figure() {
  const coins = byDepth(
    [...STACKS, [...LOOSE, 1]].map((entry) => [entry[0], entry[1], entry]),
    P,
  );
  return {
    label:
      "A panel meter on a bench plate with its needle sweeping toward a shaded limit band, a coin slot and a lit lamp on its lid, beside stacks of coins that shrink toward the front.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -96, y: PLATE.y + PLATE.d - 18, w: 104, d: 7, r: 1 }, P),
      housing(),
      dial(),
      lid(),
      ...coins.map(([, , entry]) => stack(entry)),
    ],
  };
}
