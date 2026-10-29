/*
 * "Integrate": Ryu working with the systems around it, drawn as two machines
 * on one bench driven through a gear train. A square housing and a ribbed drum
 * each carry a gear; the idler gear meshed between them is the one lit part.
 */

import {
  benchPlate,
  k,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 380;

const SIDE = { pitch: 15, teeth: 12 };
const IDLER = { pitch: 20, teeth: 16 };
const SPAN = SIDE.pitch + IDLER.pitch;
const TOOTH = 3.4;
const LEFT = [-SPAN, 0];
const RIGHT = [SPAN, 0];
const HOUSING_H = 26;
const HOUSING = { x: LEFT[0] - 24, y: LEFT[1] - 24, w: 48, d: 48, r: 4 };
const DRUM_R = 25;
const DRUM_H = 26;
const GEAR_Z = HOUSING_H + 2;
const GEAR_H = 4;
const PLATE = { x: -80, y: -40, w: 160, d: 80, r: 8 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    ...k.boxCorners(
      { x: LEFT[0] - 20, y: -20, w: RIGHT[0] - LEFT[0] + 40, d: 40 },
      GEAR_Z,
      GEAR_Z + GEAR_H + 3,
    ),
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);

/** One tooth of a gear centred at `angle`, as a small plan quad. */
function toothRing([cx, cy], pitch, angle, step) {
  const root = pitch - TOOTH / 2;
  const tip = pitch + TOOTH / 2;
  return [
    [-0.3, root - 0.6],
    [-0.15, tip],
    [0.15, tip],
    [0.3, root - 0.6],
  ].map(([offset, radius]) => [
    cx + radius * Math.cos(angle + offset * step),
    cy + radius * Math.sin(angle + offset * step),
  ]);
}

/** A spur gear with `teeth` teeth around its pitch circle, one at `phase`. */
function gear(
  center,
  { pitch, teeth },
  phase,
  { lit = false, holes = 0 } = {},
) {
  const [x, y] = center;
  const top = GEAR_Z + GEAR_H;
  const step = (Math.PI * 2) / teeth;
  const style = { tone: lit ? "hi" : "mid", lit, crease: "lo" };
  const centreDepth = k.depthOf([x, y, GEAR_Z], P);
  const back = [];
  const front = [];
  for (let i = 0; i < teeth; i++) {
    const angle = phase + i * step;
    const ring = toothRing(center, pitch, angle, step);
    const tip = [x + pitch * Math.cos(angle), y + pitch * Math.sin(angle)];
    const depth = k.depthOf([tip[0], tip[1], GEAR_Z], P);
    const drawn = [depth, solid(k.extrude(ring, GEAR_Z, GEAR_H, P), style)];
    (depth < centreDepth ? back : front).push(drawn);
  }
  const sorted = (list) =>
    list.sort((a, b) => a[0] - b[0]).map(([, svg]) => svg);
  const out = [
    ...sorted(back),
    solid(
      k.cylinder(x, y, pitch - TOOTH / 2, GEAR_Z, GEAR_H, P, 40, 0.4),
      style,
    ),
    ...sorted(front),
    line(k.ring(x, y, pitch - TOOTH - 1.5, top, P, 48), {
      tone: lit ? "mid" : "faint",
    }),
  ];
  for (let i = 0; i < holes; i++) {
    const angle = phase + (i / holes) * Math.PI * 2 + Math.PI / holes;
    const r = pitch * 0.55;
    out.push(
      line(
        k.ring(
          x + r * Math.cos(angle),
          y + r * Math.sin(angle),
          2.6,
          top,
          P,
          20,
        ),
        { tone: "lo" },
      ),
    );
  }
  out.push(
    solid(k.cylinder(x, y, 5, top, 2.4, P, 28, 0.4), style),
    line(k.ring(x, y, 1.8, top + 2.4, P, 16), { tone: lit ? "hi" : "lo" }),
  );
  return out.join("");
}

/** A short collar carrying a gear up from a machine top at `z`. */
const collar = ([x, y], z) =>
  [
    solid(k.cylinder(x, y, 7, z, 1.2, P, 28), { tone: "lo" }),
    solid(k.cylinder(x, y, 4.5, z + 1.2, GEAR_Z - z - 1.2, P, 24), {
      tone: "mid",
    }),
  ].join("");

/** Ryu's side: a square housing with vents and a lamp. */
function housing() {
  const top = HOUSING_H;
  const face = HOUSING.y + HOUSING.d;
  const vents = [];
  for (let i = 0; i < 6; i++) {
    const x = HOUSING.x + 10 + i * 5;
    vents.push(k.segment([x, face, 7], [x, face, 17], P));
  }
  return [
    `<path class="iso-halo" d="${k.haloOf(HOUSING, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(HOUSING, 0, 4, P, 6, 0.6), { tone: "lo" }),
    solid(k.slabOf(k.insetPlan(HOUSING, 2), 4, top - 4, P, 6, 0.8), {
      tone: "mid",
    }),
    line(vents.join(""), { tone: "lo" }),
    line(k.planOutline(k.insetPlan(HOUSING, 5), top, P, 4), { tone: "faint" }),
    screws(k.corners(HOUSING, 5.5), top, P, 1.2),
    lamp([HOUSING.x + HOUSING.w - 9, HOUSING.y + HOUSING.d - 9], top, P),
    collar(LEFT, top),
  ].join("");
}

/** The other system: a ribbed drum on a flange. */
function drum() {
  const [x, y] = RIGHT;
  const top = DRUM_H;
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x - DRUM_R, y: y - DRUM_R, w: DRUM_R * 2, d: DRUM_R * 2, r: DRUM_R }, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.cylinder(x, y, DRUM_R + 2, 0, 4, P, 40), { tone: "lo" }),
    solid(k.cylinder(x, y, DRUM_R, 4, top - 4, P, 40, 0.8), { tone: "mid" }),
    line(k.knurl(x, y, DRUM_R, 8, top - 4, 30, P), { tone: "faint" }),
    line(k.sideArc(x, y, DRUM_R, 8, P, 40), { tone: "lo" }),
    line(k.sideArc(x, y, DRUM_R, top - 4, P, 40), { tone: "lo" }),
    line(k.ring(x, y, DRUM_R - 4, top, P, 40), { tone: "faint" }),
    collar(RIGHT, top),
  ].join("");
}

/** The idler's post, standing on the bench between the two machines. */
const post = () =>
  [
    solid(k.cylinder(0, 0, 7, 0, 2, P, 28), { tone: "lo" }),
    solid(k.cylinder(0, 0, 3.6, 2, GEAR_Z - 2, P, 24), { tone: "mid" }),
  ].join("");

export function figure() {
  const idlerStep = (Math.PI * 2) / IDLER.teeth;
  return {
    label:
      "Two machines on one bench, a square housing and a ribbed drum, each carrying a gear; a lit idler gear on a post between them meshes with both.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip(
        { x: PLATE.x + 14, y: PLATE.y + PLATE.d - 15, w: 64, d: 7, r: 1 },
        P,
      ),
      post(),
      housing(),
      drum(),
      gear(LEFT, SIDE, 0, { holes: 4 }),
      gear([0, 0], IDLER, Math.PI + idlerStep / 2, { lit: true }),
      gear(RIGHT, SIDE, Math.PI, { holes: 4 }),
    ],
  };
}
