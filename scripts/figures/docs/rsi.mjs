/*
 * "Recursive self-improvement": a loop whose output drives its own next turn,
 * drawn as a chain drive. Four gears, each larger than the last, share one
 * closed chain, so the biggest gear feeds straight back into the smallest; a
 * gauge pod beside the loop carries the one lit lamp.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -100, y: -78, w: 200, d: 152, r: 8 };
const POST_H = 9;
const GEAR_H = 6;
const GEAR_Z = POST_H;
const GEAR_TOP = GEAR_Z + GEAR_H;
const TOOTH = 10;
const TOOTH_DEPTH = 3;
const CHAIN_GAP = 1.6;
const LINK = 4.6;
/** [x, y, tip radius]: each gear in the loop is larger than the one before. */
const GEARS = [
  [-62, -28, 14],
  [-8, -48, 19],
  [58, -16, 25],
  [-30, 22, 32],
];
const POD = { x: 44, y: 30, w: 42, d: 32, r: 4 };
const POD_H = 9;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [PLATE.x, PLATE.y, GEAR_TOP + 6]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A plan outline of a spur gear: flat-topped teeth around a root circle. */
function gearRing(cx, cy, tip) {
  const root = tip - TOOTH_DEPTH;
  const teeth = Math.round((2 * Math.PI * tip) / TOOTH);
  const step = (2 * Math.PI) / teeth;
  const ring = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [share, radius] of [
      [0, root],
      [0.2, tip],
      [0.5, tip],
      [0.7, root],
    ]) {
      const angle = a + share * step;
      ring.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return ring;
}

/**
 * The toothed wheel as one solid. The kit's concave extrude strokes every tooth
 * flank, back ones included, so the edges here are the top outline plus only
 * the flanks on the near half of the wheel.
 */
function gearBody(cx, cy, tip) {
  const ring = gearRing(cx, cy, tip);
  const paths = k.extrude(ring, GEAR_Z, GEAR_H, P, { convex: false });
  const [vx, vy] = k.towardViewer(P);
  const near = ([x, y]) => (x - cx) * vx + (y - cy) * vy > 0;
  const top = (point) => at([point[0], point[1], GEAR_TOP]);
  const base = (point) => at([point[0], point[1], GEAR_Z]);
  const edges = [k.pathOf(ring.map(top), true)];
  for (const [i, a] of ring.entries()) {
    const b = ring[(i + 1) % ring.length];
    // Outward normal of the flank a→b (the ring runs counter-clockwise).
    const facing = (b[1] - a[1]) * vx - (b[0] - a[0]) * vy > 0;
    if (!(facing && near(a) && near(b))) {
      continue;
    }
    edges.push(k.pathOf([top(a), base(a), base(b), top(b)]));
  }
  return solid(
    { ...paths, outline: edges.join(""), crease: "" },
    { tone: "mid" },
  );
}

function gear([cx, cy, tip], index) {
  const root = tip - TOOTH_DEPTH;
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: cx - tip, y: cy - tip, w: tip * 2, d: tip * 2, r: tip }, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.cylinder(cx, cy, 4.6, 0, 1, P, 20), { tone: "lo" }),
    solid(k.cylinder(cx, cy, 3.4, 1, POST_H - 1, P, 16), { tone: "mid" }),
    gearBody(cx, cy, tip),
    line(k.ring(cx, cy, root - 2.4, GEAR_TOP, P, 40), { tone: "faint" }),
  ];
  // Larger gears are lightened with a ring of holes between hub and rim.
  if (index > 0) {
    const holes = index + 3;
    const span = (root - 2.4 + 6) / 2;
    const size = Math.min(3.2, span * 0.28);
    const rings = [];
    for (let i = 0; i < holes; i++) {
      const angle = (i / holes) * Math.PI * 2 + index;
      rings.push(
        k.ring(
          cx + span * Math.cos(angle),
          cy + span * Math.sin(angle),
          size,
          GEAR_TOP,
          P,
          12,
        ),
      );
    }
    out.push(line(rings.join(""), { tone: "lo" }));
  }
  out.push(
    solid(k.cylinder(cx, cy, 5, GEAR_TOP, 2, P, 28, 0.4), { tone: "mid" }),
  );
  out.push(line(k.ring(cx, cy, 2.4, GEAR_TOP + 2, P, 6), { tone: "lo" }));
  out.push(dots([at([cx, cy, GEAR_TOP + 2])], { size: 0.5 }));
  return out.join("");
}

/** Monotone-chain convex hull of plan points, counter-clockwise. */
function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const point of list) {
      while (out.length >= 2 && cross(out.at(-2), out.at(-1), point) <= 0) {
        out.pop();
      }
      out.push(point);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half(sorted.reverse())];
}

/** Points every `gap` along a closed plan polygon. */
function along(polygon, gap) {
  const out = [];
  let carry = 0;
  for (const [i, [ax, ay]] of polygon.entries()) {
    const [bx, by] = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(bx - ax, by - ay);
    for (let t = carry; t < length; t += gap) {
      out.push([ax + ((bx - ax) * t) / length, ay + ((by - ay) * t) / length]);
    }
    carry = (carry - length) % gap;
    carry = carry < 0 ? carry + gap : carry;
  }
  return out;
}

/** Plan offsets of the chain's two edges and its link row past each gear tip. */
const CHAIN_EDGES = [CHAIN_GAP + 1.4, CHAIN_GAP - 0.6];
const CHAIN_LINKS = CHAIN_GAP + 0.4;

const wrap = (offset) =>
  hull(GEARS.flatMap(([x, y, tip]) => k.circleRing(x, y, tip + offset, 40)));

/** True where the chain runs round the far side of a gear, hidden by its rim. */
function behindGear([x, y], offset) {
  const [vx, vy] = k.towardViewer(P);
  return GEARS.some(
    ([cx, cy, tip]) =>
      Math.hypot(x - cx, y - cy) < tip + offset + 0.5 &&
      (x - cx) * vx + (y - cy) * vy < 0,
  );
}

/** Splits a closed run of plan points into open stretches on one side. */
function stretches(points, keep) {
  const start = points.findIndex((point) => !keep(point));
  if (start < 0) {
    return [[...points, points[0]]];
  }
  const out = [];
  let current = [];
  for (let i = 1; i <= points.length; i++) {
    const point = points[(start + i) % points.length];
    if (keep(point)) {
      current.push(point);
    } else if (current.length > 0) {
      out.push(current);
      current = [];
    }
  }
  return out.filter((stretch) => stretch.length > 1);
}

/**
 * The one closed chain wrapped around every gear. The stretches round the far
 * side of a gear paint before the gears, the rest after them.
 */
function chain(far) {
  const z = GEAR_TOP - 1;
  const side = (offset) => (point) => behindGear(point, offset) === far;
  const edge = (offset, style) =>
    line(
      stretches(along(wrap(offset), 2.5), side(offset))
        .map((stretch) => k.onTop(stretch, z, P))
        .join(""),
      { tone: "mid", ...style },
    );
  const links = along(wrap(CHAIN_LINKS), LINK).filter(side(CHAIN_LINKS));
  return [
    edge(CHAIN_EDGES[0], { flow: true }),
    edge(CHAIN_EDGES[1], {}),
    dots(
      links.map(([x, y]) => at([x, y, z])),
      { size: 0.6, tone: "mid" },
    ),
  ].join("");
}

/** The gauge pod: a dial whose needle sits near the top of its sweep. */
function gaugePod() {
  const top = POD_H;
  const dial = [POD.x + 15, POD.y + POD.d / 2];
  const sweep = Math.PI * 1.5;
  const start = -Math.PI * 0.75;
  const ticks = k.radialTicks(
    dial[0],
    dial[1],
    10,
    16,
    4,
    top + 1,
    [1.4, 2.6],
    P,
    start,
    sweep,
  );
  const needle = start + sweep * 0.86;
  return [
    `<path class="iso-halo" d="${k.haloOf(POD, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(POD, 0, top, P, 5, 0.6), { tone: "mid" }),
    line(k.sideSeam(POD, 3, P, 5), { tone: "faint" }),
    solid(k.cylinder(dial[0], dial[1], 12, top, 1, P, 40), { tone: "mid" }),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    line(
      k.lineOnTop(
        dial,
        [dial[0] + 8 * Math.sin(needle), dial[1] - 8 * Math.cos(needle)],
        top + 1,
        P,
      ),
      { tone: "hi" },
    ),
    dots([at([dial[0], dial[1], top + 1])], { size: 0.8, tone: "hi" }),
    lamp([POD.x + POD.w - 9, POD.y + 9], top, P, { lit: true, radius: 3 }),
    lamp([POD.x + POD.w - 9, POD.y + POD.d - 9], top, P, { radius: 2.4 }),
    screws(k.corners(POD, 3.2), top, P, 1.1),
  ].join("");
}

export function figure() {
  const parts = byDepth(
    [
      ...GEARS.map((spec, index) => [
        spec[0],
        spec[1],
        () => gear(spec, index),
      ]),
      [POD.x + POD.w / 2, POD.y + POD.d / 2, gaugePod],
    ],
    P,
  );
  return {
    label:
      "A chain drive on a bench plate: four gears of growing size share one closed chain that runs from the largest gear back to the smallest, beside a gauge pod with a lit lamp.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip(
        { x: PLATE.x + 12, y: PLATE.y + PLATE.d - 13, w: 90, d: 6, r: 1 },
        P,
      ),
      chain(true),
      ...parts.map(([, , draw]) => draw()),
      chain(false),
    ],
  };
}
