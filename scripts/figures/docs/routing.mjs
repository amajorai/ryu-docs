/*
 * "Routing": one request lane split across providers, drawn as a railway
 * junction. A wagon waits on a single track that runs into a set of points
 * fanning it out to three lanes, each guarded by a signal post and ending at a
 * buffer stop; a ground frame of levers sets the route, and the chosen lane's
 * signal is the lit part.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -114, y: -74, w: 236, d: 146, r: 8 };
const GAUGE = 7;
const RAIL_H = 2.2;
const SLEEPER_H = 1.4;
const INPUT = { from: -104, to: -66 };
const SPLIT_X = INPUT.to;
const CURVE_LEN = 116;
const LANE_END = 106;
const LANES = [-40, 0, 40];
const CHOSEN = 2;
const SIGNAL_X = 74;
const SIGNAL_H = 30;
const FRAME = { x: -102, y: 30, w: 36, d: 26, r: 3 };
const FRAME_H = 10;
const LEVER_H = 22;
const PULLED = 2;
const WAGON = { x: -94, y: -9, w: 24, d: 18, r: 2.5 };
const WAGON_TOP = 15;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [SIGNAL_X, LANES[0] - 17, SIGNAL_H + 8],
    [FRAME.x, FRAME.y, FRAME_H + LEVER_H + 4],
    [WAGON.x, WAGON.y, WAGON_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Merge flat, non-overlapping solids into one so repeated parts stay light. */
function merged(parts) {
  return {
    fill: parts.map((part) => part.fill).join(""),
    shades: parts[0].shades.map((_, i) =>
      parts.map((part) => part.shades[i]).join(""),
    ),
    top: parts.map((part) => part.top).join(""),
    outline: parts.map((part) => part.outline).join(""),
    crease: "",
  };
}

/** Centreline y of the lane ending at `laneY`, at position x. */
const laneAt = (laneY, x) => laneY * smooth((x - SPLIT_X) / CURVE_LEN);

/** Centreline samples of one branch with their unit normals. */
function branch(laneY) {
  const out = [];
  for (let x = SPLIT_X; x <= LANE_END + 0.01; x += 10) {
    const y = laneAt(laneY, x);
    const slope = (laneAt(laneY, x + 0.5) - laneAt(laneY, x - 0.5)) / 1;
    const length = Math.hypot(1, slope);
    out.push({ x, y, n: [-slope / length, 1 / length] });
  }
  return out;
}

/** A rail as a thin ribbon offset `by` from the centreline, extruded upward. */
function rail(samples, by, z = SLEEPER_H) {
  const side = (offset) =>
    samples.map(({ x, y, n }) => [x + n[0] * offset, y + n[1] * offset]);
  const ring = [...side(by - 1.1), ...side(by + 1.1).reverse()];
  return k.extrude(ring, z, RAIL_H, P, { convex: false });
}

/** A sleeper of `length` centred on (x, y), turned to the normal `n`. */
function sleeper(x, y, n, length) {
  const [nx, ny] = n;
  const [tx, ty] = [ny, -nx];
  const half = length / 2;
  const ring = [
    [-2.2, -half],
    [2.2, -half],
    [2.2, half],
    [-2.2, half],
  ].map(([a, b]) => [x + tx * a + nx * b, y + ty * a + ny * b]);
  return k.extrude(ring, 0, SLEEPER_H, P);
}

/** Long shared timbers under the points, then each lane's own sleepers. */
function sleepers() {
  const out = [];
  for (let x = INPUT.from + 3; x < LANE_END - 2; x += 9) {
    const spread = laneAt(LANES[2], x);
    if (spread < 23) {
      out.push(sleeper(x, 0, [0, 1], 22 + spread * 2));
      continue;
    }
    for (const laneY of LANES) {
      const y = laneAt(laneY, x);
      const slope = laneAt(laneY, x + 0.5) - laneAt(laneY, x - 0.5);
      const length = Math.hypot(1, slope);
      out.push(sleeper(x, y, [-slope / length, 1 / length], 22));
    }
  }
  return solid(merged(out), { tone: "lo", crease: "none" });
}

function rails() {
  const input = [{ x: INPUT.from, y: 0, n: [0, 1] }];
  // Outer lanes first, so the straight road paints over their switch toes.
  return [LANES[0], LANES[2], LANES[1]]
    .map((laneY) => {
      const samples = branch(laneY);
      const head = laneY === 0 ? input : [];
      const path = [...head, ...samples];
      return solid(merged([rail(path, -GAUGE), rail(path, GAUGE)]), {
        tone: "mid",
      });
    })
    .join("");
}

/** End stop: a buffer beam with two sprung pads facing the track. */
function bufferStop(x, y) {
  return [
    solid(k.slabOf({ x, y: y - 12, w: 6, d: 24, r: 1 }, 0, 12, P, 2, 0.4), {
      tone: "mid",
    }),
    solid(k.slabOf({ x: x - 3, y: y - 9, w: 3, d: 5, r: 1 }, 5, 4, P, 2), {
      tone: "mid",
    }),
    solid(k.slabOf({ x: x - 3, y: y + 4, w: 3, d: 5, r: 1 }, 5, 4, P, 2), {
      tone: "mid",
    }),
    dots([at([x + 3, y - 8, 12]), at([x + 3, y + 8, 12])], { size: 0.45 }),
  ].join("");
}

/** The request: a small wagon on the input track, heading for the points. */
function wagon() {
  const chassis = { x: WAGON.x + 3, y: -6, w: WAGON.w - 6, d: 12, r: 1 };
  const deck = SLEEPER_H + RAIL_H;
  const out = [
    solid(k.slabOf(chassis, deck, 3, P, 2), { tone: "lo" }),
    solid(k.slabOf(WAGON, deck + 3, WAGON_TOP - deck - 3, P, 4, 0.6), {
      tone: "mid",
    }),
    line(k.sideSeam(WAGON, deck + 6, P, 4), { tone: "faint" }),
  ];
  for (let x = WAGON.x + 6; x < WAGON.x + WAGON.w - 4; x += 6) {
    out.push(
      line(
        k.lineOnTop([x, WAGON.y + 3], [x, WAGON.y + WAGON.d - 3], WAGON_TOP, P),
        {
          tone: "lo",
        },
      ),
    );
  }
  return out.join("");
}

/** A signal post on a footing with a hooded head; the chosen one is lit. */
function signal(x, y, lit) {
  const head = SIGNAL_H;
  return [
    solid(k.slabOf({ x: x - 5, y: y - 5, w: 10, d: 10, r: 1.5 }, 0, 3, P, 3), {
      tone: "mid",
    }),
    solid(k.cylinder(x, y, 1.4, 3, head - 3, P, 10), {
      tone: "mid",
      crease: "none",
    }),
    solid(k.cylinder(x, y, 5, head, 6, P, 20), { tone: "mid" }),
    line(k.sideArc(x, y, 5, head + 2, P, 10), { tone: "faint" }),
    solid(k.cylinder(x, y, 2.8, head + 6, 1.4, P, 16), {
      tone: lit ? "hi" : "lo",
      lit,
    }),
  ].join("");
}

/** The ground frame: a box with three lever slots, one lever pulled. */
function groundFrame() {
  const top = FRAME_H;
  const out = [
    `<path class="iso-halo" d="${k.haloOf(FRAME, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(FRAME, 0, top, P, 4, 0.6), { tone: "mid" }),
    line(k.sideSeam(FRAME, 3, P, 4), { tone: "faint" }),
    screws(k.corners(FRAME, 3), top, P, 1.1),
  ];
  const levers = [0, 1, 2].map((i) => {
    const y = FRAME.y + 5 + i * 6;
    const x = i === PULLED ? FRAME.x + FRAME.w - 9 : FRAME.x + 9;
    return { i, x, y };
  });
  for (const { y } of levers) {
    out.push(
      line(
        k.planOutline(
          { x: FRAME.x + 6, y: y - 1, w: FRAME.w - 12, d: 2, r: 1 },
          top,
          P,
          3,
        ),
        { tone: "lo" },
      ),
    );
  }
  for (const { i, x, y } of levers) {
    const height = i === PULLED ? LEVER_H - 4 : LEVER_H;
    out.push(
      solid(k.cylinder(x, y, 1.3, top, height, P, 12), {
        tone: "mid",
        crease: "none",
      }),
      solid(k.cylinder(x, y, 2.3, top + height, 4, P, 16), { tone: "mid" }),
    );
  }
  return out.join("");
}

/** The rod that runs from the ground frame to the points. */
function pointRod() {
  const z = 0.6;
  const from = [FRAME.x + FRAME.w, FRAME.y + 11, z];
  const corner = [SPLIT_X + 14, FRAME.y + 11, z];
  const to = [SPLIT_X + 14, GAUGE + 5, z];
  return k.wireSvg(at(from), at(to), {
    via: [at(corner)],
    tone: "mid",
    dashed: true,
    size: 1,
  });
}

export function figure() {
  const standing = byDepth(
    [
      ...LANES.map((y, i) => [
        SIGNAL_X,
        y - 17,
        () => signal(SIGNAL_X, y - 17, i === CHOSEN),
      ]),
      ...LANES.map((y) => [LANE_END, y, () => bufferStop(LANE_END, y)]),
      [WAGON.x + WAGON.w / 2, 0, wagon],
      [FRAME.x + FRAME.w / 2, FRAME.y + FRAME.d / 2, groundFrame],
    ],
    P,
  );
  return {
    label:
      "A railway junction on a bench plate: a wagon waits on one track that runs into a set of points that fans it out to three lanes, each with a signal post and a buffer stop, set by a lever frame; the signal on the chosen lane is lit.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -100, y: PLATE.y + 10, w: 90, d: 7, r: 1 }, P),
      sleepers(),
      rails(),
      pointRod(),
      ...standing.map(([, , draw]) => draw()),
    ],
  };
}
