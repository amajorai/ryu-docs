/*
 * "Evals": candidate outputs weighed against each other, drawn as a balance
 * scale. A tapered beam pivots on a column over a stepped plinth, its pointer
 * swinging against a small arc scale; the heavier block (the lit part) has sunk
 * its pan, and a tray of calibration weights waits beside it.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -98, y: -38, w: 196, d: 88, r: 8 };
const BASE = { x: -36, y: -20, w: 72, d: 40, r: 4 };
const BASE_H = 6;
const STEP_H = 4;
const COLUMN_R = 3.6;
const PIVOT_Z = 96;
const TILT = (-8 * Math.PI) / 180;
const ARM = 64;
const HANG = 60;
const PAN_R = 18;
const PAN_H = 2.4;
const HEAVY = { w: 18, h: 16 };
const LIGHT = { w: 13, h: 11 };
const SCALE_R = 18;
const SCALE_SPAN = (24 * Math.PI) / 180;
const TRAY = { x: -82, y: 14, w: 58, d: 18, r: 3 };
const WEIGHTS = [
  [-72, 7],
  [-54, 5.4],
  [-38, 4],
];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [-ARM - PAN_R, 0, PIVOT_Z + 12],
    [ARM + PAN_R, 0, PIVOT_Z],
    [0, 0, PIVOT_Z + SCALE_R + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const { sinA } = k.cameraOf(P);

/** Rotate an [x, z] offset about the pivot by the beam's tilt. */
const tilted = ([x, z]) => [
  x * Math.cos(TILT) - z * Math.sin(TILT),
  PIVOT_Z + x * Math.sin(TILT) + z * Math.cos(TILT),
];

const shadeOf = (nx) =>
  Math.min(3, Math.max(0, Math.floor(((1 - nx * sinA) / 2) * 4)));

/**
 * A prism whose profile ([x, z] pairs) is swept along y from y0 to y1: the
 * faces turned toward the viewer are painted back to front, then the y1 face.
 */
function prismY(profile, y0, y1, { tone = "mid", lit = false } = {}) {
  const count = profile.length;
  let area = 0;
  for (let i = 0; i < count; i++) {
    const [ax, az] = profile[i];
    const [bx, bz] = profile[(i + 1) % count];
    area += ax * bz - bx * az;
  }
  const sign = area > 0 ? 1 : -1;
  const point = ([x, z], y) => at([x, y, z]);
  const faces = [];
  const facing = profile.map((a, i) => {
    const b = profile[(i + 1) % count];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (sign * (b[1] - a[1])) / length;
    const nz = (-sign * (b[0] - a[0])) / length;
    if (k.depthOf([nx, 0, nz], P) <= 1e-6) {
      return false;
    }
    const paint =
      nz > 0.55
        ? 'class="iso-top"'
        : `class="iso-shade" data-shade="${shadeOf(nx)}"`;
    const quad = k.pathOf(
      [point(a, y0), point(b, y0), point(b, y1), point(a, y1)],
      true,
    );
    faces.push({
      depth: k.depthOf([(a[0] + b[0]) / 2, y0, (a[1] + b[1]) / 2], P),
      svg: `<path ${paint} d="${quad}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${k.pathOf([point(a, y0), point(b, y0)])}"/>`,
    });
    return true;
  });
  const ridges = profile
    .filter((_, i) => facing[i] !== facing[(i + count - 1) % count])
    .map((v) => k.pathOf([point(v, y0), point(v, y1)]))
    .join("");
  const front = k.pathOf(
    profile.map((v) => point(v, y1)),
    true,
  );
  const body = faces
    .sort((a, b) => a.depth - b.depth)
    .map((face) => face.svg)
    .join("");
  return `<g class="iso-solid" data-seamless=""${lit ? ' data-lit=""' : ""}>${body}<path class="iso-line iso-edge" data-tone="${tone}" d="${ridges}"/><path class="iso-shade" data-shade="3" d="${front}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${front}"/></g>`;
}

function plinth() {
  const step = k.insetPlan(BASE, 7);
  return [
    `<path class="iso-halo" d="${k.haloOf(BASE, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(BASE, 0, BASE_H, P, 4, 0.6), { tone: "mid" }),
    screws(k.corners(BASE, 3.5), BASE_H, P, 1.1),
    solid(k.slabOf(step, BASE_H, STEP_H, P, 4, 0.5), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(step, 3), BASE_H + STEP_H, P, 3), {
      tone: "faint",
    }),
  ].join("");
}

function column() {
  const z0 = BASE_H + STEP_H;
  const ticks = [];
  for (let i = -4; i <= 4; i++) {
    const angle = (SCALE_SPAN * i) / 4;
    const inner = i % 2 === 0 ? SCALE_R + 0.6 : SCALE_R + 1.8;
    ticks.push(
      k.segment(
        [inner * Math.sin(angle), -2.5, PIVOT_Z + inner * Math.cos(angle)],
        [
          (SCALE_R + 3.6) * Math.sin(angle),
          -2.5,
          PIVOT_Z + (SCALE_R + 3.6) * Math.cos(angle),
        ],
        P,
      ),
    );
  }
  const arc = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const angle = -SCALE_SPAN + (2 * SCALE_SPAN * i) / steps;
    arc.push([SCALE_R * Math.sin(angle), PIVOT_Z + SCALE_R * Math.cos(angle)]);
  }
  for (let i = steps; i >= 0; i--) {
    const angle = -SCALE_SPAN + (2 * SCALE_SPAN * i) / steps;
    const r = SCALE_R + 4;
    arc.push([r * Math.sin(angle), PIVOT_Z + r * Math.cos(angle)]);
  }
  return [
    solid(k.cylinder(0, 0, COLUMN_R + 2, z0, 3, P, 24, 0.4), { tone: "mid" }),
    solid(k.cylinder(0, 0, COLUMN_R, z0 + 3, PIVOT_Z - z0 - 8, P, 24), {
      tone: "mid",
    }),
    line(k.sideArc(0, 0, COLUMN_R, z0 + 9, P, 16), { tone: "faint" }),
    // A slim rod rises behind the beam to carry the arc scale.
    solid(k.cylinder(0, -4.5, 1.2, PIVOT_Z - 6, SCALE_R + 2, P, 12), {
      tone: "mid",
    }),
    prismY(arc, -4, -2.5),
    line(ticks.join(""), { tone: "lo" }),
    solid(k.cylinder(0, 0, 6, PIVOT_Z - 8, 4, P, 24, 0.4), { tone: "mid" }),
  ].join("");
}

function beam() {
  const steps = 8;
  const half = (x) => 1.4 + 2.8 * (1 - Math.abs(x) / ARM);
  const top = [];
  const bottom = [];
  for (let i = 0; i <= steps * 2; i++) {
    const x = -ARM + (ARM * i) / steps;
    top.push(tilted([x, half(x)]));
    bottom.unshift(tilted([x, -half(x)]));
  }
  const tip = tilted([0, SCALE_R - 1]);
  return [
    prismY([...bottom, ...top], -2, 2),
    line(k.sideRing([0, 2, PIVOT_Z], 2.2, "y", P, 16), { tone: "mid" }),
    line(k.pathOf([at([0, 2.6, PIVOT_Z]), at([tip[0], 2.6, tip[1]])]), {
      tone: "hi",
    }),
    dots([at([0, 2.4, PIVOT_Z])], { size: 0.8, tone: "hi" }),
  ].join("");
}

/** One pan hanging from a beam end on three cords, with its load. */
function pan(side) {
  const [ex, ez] = tilted([side * ARM, 0]);
  const hook = [ex, 0, ez - 4];
  const top = ez - HANG;
  const load = side > 0 ? HEAVY : LIGHT;
  const rims = [90, 210, 330].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return [
      ex + (PAN_R - 1.5) * Math.cos(angle),
      (PAN_R - 1.5) * Math.sin(angle),
      top,
    ];
  });
  const centre = k.depthOf([ex, 0, top], P);
  const cords = (front) =>
    line(
      rims
        .filter((rim) => k.depthOf(rim, P) > centre === front)
        .map((rim) => k.segment(hook, rim, P))
        .join(""),
      { tone: "mid" },
    );
  const block = {
    x: ex - load.w / 2,
    y: -load.w / 2,
    w: load.w,
    d: load.w,
    r: 1.5,
  };
  return [
    line(k.sideRing([ex, 0, ez - 2.2], 2, "y", P, 14), { tone: "mid" }),
    cords(false),
    solid(k.cylinder(ex, 0, PAN_R, top - PAN_H, PAN_H, P, 48, 0.5), {
      tone: "mid",
    }),
    line(k.ring(ex, 0, PAN_R - 3, top, P, 48), { tone: "faint" }),
    solid(k.slabOf(block, top, load.h, P, 3, 0.5), {
      tone: side > 0 ? "hi" : "mid",
      lit: side > 0,
    }),
    line(k.planOutline(k.insetPlan(block, 2.5), top + load.h, P, 2), {
      tone: "faint",
    }),
    cords(true),
    dots([at(hook)], { size: 0.8, tone: "hi" }),
  ].join("");
}

/** A tray of calibration weights, each a stepped cylinder with a knob. */
function tray() {
  const out = [
    solid(k.slabOf(TRAY, 0, 3, P, 3, 0.5), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(TRAY, 2.5), 3, P, 2), { tone: "lo" }),
  ];
  const y = TRAY.y + TRAY.d / 2;
  for (const [x, r] of byDepth(
    WEIGHTS.map(([wx, wr]) => [wx, y, wr]),
    P,
  ).map(([wx, , wr]) => [wx, wr])) {
    const h = r * 1.3;
    out.push(
      solid(k.cylinder(x, y, r, 3, h, P, 28, 0.4), { tone: "mid" }),
      line(k.sideArc(x, y, r, 3 + h * 0.4, P, 16), { tone: "faint" }),
      solid(k.cylinder(x, y, r * 0.35, 3 + h, r * 0.4, P, 16), {
        tone: "mid",
      }),
    );
  }
  return out.join("");
}

export function figure() {
  return {
    label:
      "A balance scale on a bench plate: a tapered beam tilts on its column with a pointer against an arc scale, the lit heavier block sinking one pan below the lighter block, with a tray of calibration weights beside the plinth.",
    body: [
      benchPlate(PLATE, P),
      plinth(),
      pan(-1),
      column(),
      beam(),
      tray(),
      pan(1),
    ],
  };
}
