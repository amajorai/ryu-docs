/*
 * "Reference": the fixed values everything else is measured against, drawn as
 * a metrology bench. A vernier calliper across the front grips a pin, a dial gauge
 * sits at the back, and a fitted tray holds a stepped set of gauge blocks; the
 * master block of the set is the one lit part.
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

const PLATE = { x: -102, y: -68, w: 182, d: 134, r: 8 };
const BEAM = { x: -88, y: 20, w: 146, d: 9, r: 1.5 };
const BEAM_H = 3;
const FIXED_X = -88;
const SLIDER = { x: -62, w: 26 };
const JAW = { w: 12, reach: 24, tip: 5 };
// The pin sits at the jaw tips, so every jaw face lies behind or beside it.
const PIN = { x: -69, y: BEAM.y + BEAM.d - 1 + JAW.reach, r: 7, h: 9 };
const TRAY = { x: -90, y: -54, w: 82, d: 30, r: 3 };
const BLOCKS = [10, 15, 21, 28, 36];
const MASTER = 3;
const BLOCK = { w: 10, d: 20, gap: 5 };
const DIAL = { x: 40, y: -22, r: 22, h: 9 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [
      TRAY.x + 6 + (BLOCKS.length - 1) * (BLOCK.w + BLOCK.gap),
      TRAY.y + 5,
      Math.max(...BLOCKS) + 4,
    ],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/**
 * A tapered jaw reaching toward the viewer from the beam's front edge; its
 * straight measuring edge faces the other jaw (`inner` is "right" or "left").
 */
function jaw(x, z, height, inner) {
  const y0 = BEAM.y + BEAM.d - 1;
  const { w, reach, tip } = JAW;
  const end = y0 + reach;
  const ring =
    inner === "right"
      ? [
          [x, y0],
          [x + w, y0],
          [x + w, end],
          [x + w - tip, end],
          [x, y0 + reach * 0.45],
        ]
      : [
          [x, y0],
          [x + w, y0],
          [x + w, y0 + reach * 0.45],
          [x + tip, end],
          [x, end],
        ];
  return solid(k.extrude(ring, z, height, P, { convex: false }), {
    tone: "mid",
  });
}

/** The round pin held between the jaws: the part being measured. */
function pin() {
  const { x, y, r, h } = PIN;
  return [
    solid(k.cylinder(x, y, r, 0, h, P, 40, 0.4), { tone: "mid" }),
    line(k.ring(x, y, r - 2, h, P, 32), { tone: "faint" }),
    dots([at([x, y, h])], { size: 0.5 }),
  ].join("");
}

function calliper() {
  const top = BEAM_H;
  const ticks = k.topTicks(
    SLIDER.x + SLIDER.w + 4,
    BEAM.x + BEAM.w - 4,
    2,
    5,
    BEAM.y + 0.8,
    top,
    [1.6, 3.2],
    P,
  );
  const slider = {
    x: SLIDER.x,
    y: BEAM.y - 2,
    w: SLIDER.w,
    d: BEAM.d + 4,
    r: 1.5,
  };
  const vernier = k.topTicks(
    slider.x + 6,
    slider.x + slider.w - 3,
    1.6,
    5,
    slider.y + slider.d - 0.6,
    top + 2,
    [-1.4, -2.6],
    P,
  );
  return [
    `<path class="iso-halo" d="${k.haloOf(BEAM, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    jaw(FIXED_X, 0, top, "right"),
    solid(k.slabOf(BEAM, 0, top, P, 2, 0.3), { tone: "mid" }),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    jaw(SLIDER.x, 0, top + 2, "left"),
    solid(k.slabOf(slider, 0, top + 2, P, 3, 0.5), { tone: "mid" }),
    line(vernier.minor, { tone: "lo" }),
    line(vernier.major, { tone: "mid" }),
    screws([[slider.x + 3.5, slider.y + 3]], top + 2, P, 1),
    thumbWheel([slider.x + slider.w - 4, slider.y - 3], 0),
    pin(),
  ].join("");
}

/** The knurled thumb wheel that drives the sliding jaw. */
function thumbWheel([x, y], z) {
  return [
    solid(k.cylinder(x, y, 3.4, z, 4, P, 24), { tone: "mid" }),
    line(k.knurl(x, y, 3.4, z, z + 4, 22, P), { tone: "lo" }),
    dots([at([x, y, z + 4])], { size: 0.5 }),
  ].join("");
}

function block(i) {
  const height = BLOCKS[i];
  const x = TRAY.x + 6 + i * (BLOCK.w + BLOCK.gap);
  const plan = { x, y: TRAY.y + 5, w: BLOCK.w, d: BLOCK.d, r: 0.8 };
  const lit = i === MASTER;
  return [
    solid(k.slabOf(plan, 2, height, P, 2, 0.4), {
      tone: lit ? "hi" : "mid",
      lit,
    }),
    line(k.sideSeam(plan, 2 + height - 3, P, 2), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(plan, 2), 2 + height, P, 2), {
      tone: lit ? "mid" : "faint",
    }),
  ].join("");
}

function tray() {
  const pockets = BLOCKS.map((_, i) => ({
    x: TRAY.x + 5 + i * (BLOCK.w + BLOCK.gap),
    y: TRAY.y + 4,
    w: BLOCK.w + 2,
    d: BLOCK.d + 2,
    r: 1,
  }));
  return [
    `<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(TRAY, 0, 2, P, 3, 0.4), { tone: "lo" }),
    line(pockets.map((plan) => k.planOutline(plan, 2, P, 2)).join(""), {
      tone: "lo",
    }),
    ...BLOCKS.map((_, i) => block(i)),
  ].join("");
}

/** A dial gauge lying face up: bezel, graduations, needle and the stem lug. */
function dialGauge() {
  const { x, y, r, h } = DIAL;
  const ticks = k.radialTicks(x, y, r - 4, 50, 5, h, [1.4, 3], P);
  const angle = 0.9;
  const needle = [x + Math.sin(angle) * (r - 7), y - Math.cos(angle) * (r - 7)];
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x - r, y: y - r, w: r * 2, d: r * 2, r }, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.cylinder(x, y - r - 3, 3, 0, 4, P, 20), { tone: "mid" }),
    solid(k.cylinder(x, y, r, 0, 3, P, 56), { tone: "lo" }),
    solid(k.cylinder(x, y, r - 1, 3, h - 3, P, 56, 0.6), { tone: "mid" }),
    line(k.knurl(x, y, r - 1, h - 3.5, h, 64, P), { tone: "faint" }),
    line(k.ring(x, y, r - 3, h, P, 48), { tone: "lo" }),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    line(k.ring(x + 8, y + 6, 4, h, P, 24), { tone: "faint" }),
    line(k.lineOnTop([x, y], needle, h, P), { tone: "hi" }),
    dots([at([x, y, h])], { size: 0.9, tone: "hi" }),
  ].join("");
}

export function figure() {
  const parts = byDepth(
    [
      [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, tray],
      [DIAL.x, DIAL.y, dialGauge],
    ],
    P,
  );
  return {
    label:
      "A metrology bench: a vernier calliper across the front gripping a pin, a dial gauge face up at the back and a tray of stepped gauge blocks, one of them lit as the master.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -6, y: PLATE.y + PLATE.d - 17, w: 70, d: 7, r: 1 }, P),
      ...parts.map(([, , draw]) => draw()),
      calliper(),
    ],
  };
}
