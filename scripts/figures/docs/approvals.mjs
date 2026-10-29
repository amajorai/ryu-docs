/*
 * "Approvals": a person signs off before a risky action runs, drawn as a desk
 * stamp. A letter tray holds the stack of pending requests, an ink pad waits
 * with its lid up, and the rubber stamp (the lit part) has just lifted off the
 * sheet in front, leaving its ringed check mark behind.
 */

import {
  benchPlate,
  dots,
  k,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -92, y: -68, w: 150, d: 116, r: 8 };
const TRAY = { x: -80, y: -2, w: 56, d: 46, r: 2 };
const TRAY_H = 12;
const TRAY_WALL = 2.4;
const SHEETS = 6;
const PAD = { x: -78, y: -58, w: 38, d: 30, r: 3 };
const PAD_H = 5;
const LID_H = 26;
const SHEET = { x: -14, y: -38, w: 58, d: 44, r: 0.6 };
const SEAL = [20, -16];
const SEAL_R = 11;
const STAMP = { w: 30, d: 26, block: 9, rubber: 2 };
const STAMP_Z = 30;
const HANDLE = [4.6, 4.2, 4, 4.2, 4.8, 5.8, 6.8, 7.6, 8, 8, 7.6, 6.8, 5.2];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [SEAL[0], SEAL[1], STAMP_Z + 40],
    [PAD.x, PAD.y, LID_H + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const halo = (plan, blur = 4) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(${blur}px)"/>`;

const box = (x0, x1, y0, y1, z0, z1, r = 0.8) =>
  k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 2);

/** An open letter tray with a stack of pending sheets. */
function tray() {
  const { x, y, w, d } = TRAY;
  const x1 = x + w;
  const y1 = y + d;
  const out = [
    halo(TRAY),
    solid(k.slabOf(TRAY, 0, 2, P, 3), { tone: "mid" }),
    solid(box(x, x + TRAY_WALL, y, y1, 2, TRAY_H), { tone: "mid" }),
    solid(box(x, x1, y, y + TRAY_WALL, 2, TRAY_H), { tone: "mid" }),
  ];
  for (let i = 0; i < SHEETS; i++) {
    const shift = (i % 2) * 1.2 - 0.6;
    out.push(
      solid(
        box(
          x + TRAY_WALL + 2 + shift,
          x1 - 6 + shift,
          y + TRAY_WALL + 2,
          y1 - TRAY_WALL - 2,
          2 + i * 1.1,
          3.1 + i * 1.1,
          0.3,
        ),
        { tone: i === SHEETS - 1 ? "mid" : "lo", crease: "none" },
      ),
    );
  }
  const top = 2 + SHEETS * 1.1;
  for (const [i, width] of [30, 24, 34, 18].entries()) {
    const rule = x + 12 + i * 5;
    out.push(
      line(
        k.lineOnTop([rule, y1 - 10], [rule, y1 - 10 - width], top + 0.05, P),
        { tone: "faint" },
      ),
    );
  }
  out.push(
    solid(box(x, x1, y1 - TRAY_WALL, y1, 2, TRAY_H), { tone: "mid" }),
    solid(box(x1 - TRAY_WALL, x1, y, y1, 2, 6), { tone: "mid" }),
    screws(
      [
        [x + TRAY_WALL / 2, y1 - TRAY_WALL / 2],
        [x1 - TRAY_WALL / 2, y1 - TRAY_WALL / 2],
      ],
      TRAY_H,
      P,
      0.7,
    ),
  );
  return out.join("");
}

/** The ink pad: a shallow tin with a felt bed and its lid tipped up behind. */
function inkPad() {
  const { x, y, w, d } = PAD;
  const felt = k.insetPlan(PAD, 3);
  return [
    halo(PAD),
    solid(box(x - 3.2, x - 1.2, y + 1, y + d - 1, 2, 2 + LID_H, 1), {
      tone: "mid",
    }),
    line(
      k.pathOf(
        [
          [x - 1.2, y + 5, 7],
          [x - 1.2, y + d - 5, 7],
          [x - 1.2, y + d - 5, LID_H - 3],
          [x - 1.2, y + 5, LID_H - 3],
        ].map(at),
        true,
      ),
      { tone: "faint" },
    ),
    solid(k.cylinder(x - 1.6, y + 6, 1.4, 1, 3, P, 12), { tone: "lo" }),
    solid(k.slabOf(PAD, 0, PAD_H, P, 4, 0.6), { tone: "mid" }),
    solid(k.slabOf(felt, PAD_H - 1.6, 1.4, P, 3), {
      tone: "lo",
      crease: "none",
    }),
    dots(k.dotGrid(felt.x + 3, felt.y + 3, 6, 4, 5.4, PAD_H - 0.2, P), {
      size: 0.4,
      tone: "faint",
    }),
    solid(k.cylinder(x + w - 1, y + d - 1, 1.4, 1, 3, P, 12), { tone: "lo" }),
  ].join("");
}

/** The sheet in front, ruled, with the stamp's ringed check mark on it. */
function sheet() {
  const { x, y, w, d } = SHEET;
  const z = 0.6;
  const rules = [];
  for (let i = 0; i < 5; i++) {
    const rx = x + 8 + i * 5;
    rules.push(
      k.lineOnTop([rx, y + d - 6], [rx, y + d - (i % 2 ? 20 : 26)], z, P),
    );
  }
  const [sx, sy] = SEAL;
  return [
    halo(SHEET, 3),
    solid(k.slabOf(SHEET, 0, z, P, 2), { tone: "mid", crease: "none" }),
    line(rules.join(""), { tone: "faint" }),
    line(k.lineOnTop([x + w - 9, y + d - 6], [x + w - 9, y + 4], z, P), {
      tone: "lo",
    }),
    line(k.ring(sx, sy, SEAL_R, z, P, 40), { tone: "hi" }),
    line(k.ring(sx, sy, SEAL_R - 1.8, z, P, 40), { tone: "mid" }),
    line(
      k.onTop(
        [
          [sx - 1.5, sy + 4.5],
          [sx + 2.5, sy + 1],
          [sx - 3.5, sy - 4.5],
        ],
        z,
        P,
      ),
      { tone: "hi" },
    ),
  ].join("");
}

/** The stamp, just lifted: a rubber die, a mount block and a turned handle. */
function stamp() {
  const [sx, sy] = SEAL;
  const block = {
    x: sx - STAMP.d / 2,
    y: sy - STAMP.w / 2,
    w: STAMP.d,
    d: STAMP.w,
    r: 2,
  };
  const zBlock = STAMP_Z + STAMP.rubber;
  const zTop = zBlock + STAMP.block;
  const out = [
    line(
      k
        .corners(block, 2)
        .map(([x, y]) => k.segment([x, y, 1], [x, y, STAMP_Z], P))
        .join(""),
      { tone: "faint", dotted: true },
    ),
    solid(k.slabOf(k.insetPlan(block, 1.4), STAMP_Z, STAMP.rubber, P, 3), {
      tone: "lo",
    }),
    solid(k.slabOf(block, zBlock, STAMP.block, P, 4, 0.6), {
      tone: "hi",
      lit: true,
      crease: "lo",
    }),
    line(k.sideSeam(block, zBlock + STAMP.block / 2, P, 4), { tone: "lo" }),
    line(k.planOutline(k.insetPlan(block, 3), zTop, P, 3), { tone: "lo" }),
  ];
  let z = zTop;
  for (const radius of HANDLE) {
    out.push(solid(k.cylinder(sx, sy, radius, z, 2, P, 28), { tone: "mid" }));
    z += 2;
  }
  out.push(dots([at([sx, sy, z])], { size: 0.6, tone: "mid" }));
  return out.join("");
}

export function figure() {
  return {
    label:
      "A desk on a bench plate with a letter tray of pending sheets, an open ink pad, and a lit rubber stamp lifted just above a sheet that carries its ringed check mark.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -14, y: PLATE.y + PLATE.d - 16, w: 62, d: 7, r: 1 }, P),
      inkPad(),
      tray(),
      sheet(),
      stamp(),
    ],
  };
}
