/*
 * "Models": local and cloud models you load and swap, drawn as a cartridge
 * library. Cartridges of different sizes stand in a rack at the back; one (the
 * lit part) is slotted into a reader whose short mast reaches the cloud.
 */

import {
  benchPlate,
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

const PLATE = { x: -128, y: -84, w: 236, d: 140, r: 8 };
const RACK = { x: -116, y: -72, w: 116, d: 56, r: 3 };
const RACK_H = 7;
const CART_W = 6;
const CART_GAP = 15;
// [plan depth, height] per cartridge: bigger models, bigger cartridges.
const CARTRIDGES = [
  [46, 50],
  [40, 40],
  [46, 44],
  [34, 32],
  [40, 36],
  [30, 26],
];
const EMPTY = 4;
// A spare cartridge lying flat on the plate, off the rack.
const SPARE = { x: -92, y: -6, w: 40, d: 34, r: 1.5 };
const READER = { x: 14, y: -24, w: 72, d: 60, r: 5 };
const READER_H = 18;
const SLOT = { x: 36, y: -12, w: 8, d: 42, r: 1.5 };
const LOADED = { x: SLOT.x + 1, y: SLOT.y + 3, w: CART_W, d: 36, r: 1.2 };
const LOADED_H = 34;
const MAST = [76, -12];
const MAST_H = 52;
const ARC_RADII = [6, 11, 16];
const ARC_SPAN = 0.6;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [RACK.x, RACK.y, RACK_H + 52],
    [MAST[0], MAST[1], MAST_H + 12],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(5px)"/>`;

/** A closed outline on the vertical face `x` between y0..y1 and z0..z1. */
const faceRect = (y0, y1, z0, z1, x) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );

/** One cartridge standing on `z`: shell, label recess and grip ridges. */
function cartridge(plan, z, height, style = { tone: "mid" }) {
  const face = plan.x + plan.w;
  const near = plan.y + plan.d - 4;
  const far = plan.y + 4;
  const top = z + height;
  const out = [solid(k.slabOf(plan, z, height, P, 3, 0.4), style)];
  out.push(
    line(faceRect(near, far, top - 6 - height * 0.42, top - 6, face), {
      tone: "lo",
    }),
  );
  for (let i = 0; i < 3; i++) {
    const at3 = z + 4 + i * 2.4;
    out.push(
      line(k.segment([face, near - 2, at3], [face, near - 10, at3], P), {
        tone: "faint",
        free: true,
      }),
    );
  }
  out.push(
    line(
      k.lineOnTop(
        [plan.x + plan.w / 2, far + 4],
        [plan.x + plan.w / 2, near - 4],
        top,
        P,
      ),
      { tone: "faint" },
    ),
  );
  return out.join("");
}

function rack() {
  const out = [
    halo(RACK),
    solid(k.slabOf(RACK, 0, RACK_H, P, 4, 0.6), { tone: "mid" }),
  ];
  const slots = [];
  for (let i = 0; i < CARTRIDGES.length; i++) {
    const x = RACK.x + 8 + i * CART_GAP;
    slots.push(
      k.planOutline(
        { x: x - 1, y: RACK.y + 4, w: CART_W + 2, d: RACK.d - 8, r: 1 },
        RACK_H,
        P,
        2,
      ),
    );
  }
  out.push(line(slots.join(""), { tone: "lo" }));
  out.push(screws(k.corners(RACK, 3.5), RACK_H, P, 1.2));
  for (const [i, [depth, height]] of CARTRIDGES.entries()) {
    if (i === EMPTY) {
      continue;
    }
    const plan = {
      x: RACK.x + 8 + i * CART_GAP,
      y: RACK.y + RACK.d / 2 - depth / 2,
      w: CART_W,
      d: depth,
      r: 1.2,
    };
    out.push(cartridge(plan, RACK_H, height));
  }
  return out.join("");
}

function reader() {
  const top = READER_H;
  const lid = k.insetPlan(READER, 2);
  const out = [
    halo(READER),
    solid(k.slabOf(READER, 0, 4, P, 6, 0.8), { tone: "lo" }),
    solid(k.slabOf(lid, 4, top - 4, P, 6, 0.8), { tone: "mid" }),
    line(k.sideSeam(lid, 9, P, 6), { tone: "faint" }),
  ];
  // The slot mouth with its guide lips.
  out.push(solid(k.slabOf(SLOT, top, 1.2, P, 2), { tone: "lo" }));
  out.push(
    line(k.planOutline(k.insetPlan(SLOT, 1), top + 1.2, P, 2), { tone: "lo" }),
  );
  // Vent slots behind the mast.
  for (let i = 0; i < 5; i++) {
    const x = 56 + i * 3.4;
    out.push(
      line(k.lineOnTop([x, lid.y + 22], [x, lid.y + 50], top, P), {
        tone: "lo",
      }),
    );
  }
  out.push(lamp([lid.x + 30, lid.y + 8], top, P));
  out.push(knob([lid.x + 58, lid.y + lid.d - 8], top, P, { radius: 4 }));
  out.push(screws(k.corners(lid, 3.5), top, P, 1.2));
  return out.join("");
}

/** The spare cartridge lying flat: shell, label recess and grip ridges. */
function spare() {
  const top = CART_W;
  const label = {
    x: SPARE.x + 6,
    y: SPARE.y + 4,
    w: SPARE.w - 16,
    d: 18,
    r: 1,
  };
  const out = [
    halo(SPARE),
    solid(k.slabOf(SPARE, 0, top, P, 3, 0.4), { tone: "mid" }),
    line(k.planOutline(label, top, P, 2), { tone: "lo" }),
  ];
  for (let i = 0; i < 3; i++) {
    const y = SPARE.y + SPARE.d - 4 - i * 2.4;
    out.push(
      line(k.lineOnTop([SPARE.x + 6, y], [SPARE.x + 16, y], top, P), {
        tone: "faint",
      }),
    );
  }
  return out.join("");
}

/** The loaded cartridge: the lit part, seated in the reader's slot. */
const loaded = () =>
  cartridge(LOADED, READER_H + 1.2, LOADED_H, { tone: "hi", lit: true });

/** Signal arcs either side of the mast tip, in the plane facing the viewer. */
function signalArcs(center) {
  const [vx, vy] = k.towardViewer(P);
  const [hx, hy] = [-vy / Math.hypot(vx, vy), vx / Math.hypot(vx, vy)];
  const out = [];
  for (const [i, radius] of ARC_RADII.entries()) {
    for (const side of [0, Math.PI]) {
      const points = [];
      for (let step = 0; step <= 12; step++) {
        const angle = side - ARC_SPAN + (step / 12) * ARC_SPAN * 2;
        const across = radius * Math.cos(angle);
        points.push(
          at([
            center[0] + hx * across,
            center[1] + hy * across,
            center[2] + radius * Math.sin(angle),
          ]),
        );
      }
      out.push(
        line(k.pathOf(points), { tone: i === 0 ? "mid" : "lo", free: true }),
      );
    }
  }
  return out.join("");
}

/** A short antenna mast: the reader's reach to cloud models. */
function mast() {
  const [x, y] = MAST;
  return [
    solid(k.cylinder(x, y, 4, READER_H, 2, P, 24), { tone: "lo" }),
    solid(k.cylinder(x, y, 1.2, READER_H + 2, MAST_H - READER_H - 2, P, 16), {
      tone: "mid",
    }),
    solid(k.cylinder(x, y, 2.6, MAST_H, 3, P, 20, 0.4), { tone: "mid" }),
    signalArcs([x, y, MAST_H + 1.5]),
    dots([at([x, y, MAST_H + 3])], { size: 0.45 }),
  ].join("");
}

export function figure() {
  return {
    label:
      "A cartridge library on a bench plate: cartridges of different sizes stand in a rack, a spare lies flat, and one lit cartridge is slotted into a reader with a short antenna mast.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -112, y: PLATE.y + PLATE.d - 16, w: 112, d: 7, r: 1 }, P),
      rack(),
      spare(),
      reader(),
      loaded(),
      mast(),
    ],
  };
}
