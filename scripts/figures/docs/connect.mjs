/*
 * "Connect": one API in front of many tools, drawn as a junction box on a
 * bench plate. Cables enter it through glands on all four sides from small
 * terminals spread across the plate; the lamp on its lid is the one lit part.
 */

import {
  benchPlate,
  byDepth,
  cable,
  dots,
  k,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -114, y: -98, w: 228, d: 188, r: 8 };
const BOX = { x: -42, y: -38, w: 84, d: 70, r: 4 };
const BOX_H = 26;
const LID_H = 5;
const GLAND = { w: 10, out: 6, z: 7, h: 10 };
const CABLE_Z = 1;

/**
 * Each run: the side of the box it enters, its offset along that side, the
 * plan route it follows across the plate and the terminal it ends at.
 */
const RUNS = [
  {
    side: "back",
    at: -18,
    route: [
      [-18, -66],
      [-80, -72],
    ],
    end: "puck",
  },
  {
    side: "back",
    at: 18,
    route: [
      [18, -68],
      [40, -84],
    ],
    end: "block",
  },
  {
    side: "left",
    at: -16,
    route: [
      [-70, -16],
      [-98, -26],
    ],
    end: "block",
  },
  {
    side: "left",
    at: 14,
    route: [
      [-72, 14],
      [-94, 30],
    ],
    end: "socket",
  },
  {
    side: "front",
    at: -20,
    route: [
      [-20, 54],
      [-52, 70],
    ],
    end: "socket",
  },
  { side: "front", at: 16, route: [[16, 70]], end: "puck" },
  {
    side: "right",
    at: -14,
    route: [
      [68, -14],
      [90, -48],
    ],
    end: "socket",
  },
  {
    side: "right",
    at: 16,
    route: [
      [80, 16],
      [92, 44],
    ],
    end: "block",
  },
];
const FAR = new Set(["back", "left"]);

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [BOX.x, BOX.y, BOX_H + LID_H + 4]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** Outward unit vector and gland mouth for a run, in plan. */
function mouthOf({ side, at: offset }) {
  const cx = BOX.x + BOX.w / 2;
  const cy = BOX.y + BOX.d / 2;
  const reach = GLAND.out;
  switch (side) {
    case "back":
      return { normal: [0, -1], mouth: [cx + offset, BOX.y - reach] };
    case "front":
      return { normal: [0, 1], mouth: [cx + offset, BOX.y + BOX.d + reach] };
    case "left":
      return { normal: [-1, 0], mouth: [BOX.x - reach, cy + offset] };
    default:
      return { normal: [1, 0], mouth: [BOX.x + BOX.w + reach, cy + offset] };
  }
}

/** A gland: a square boss with a nut ring around the cable entry. */
function gland(run) {
  const { normal, mouth } = mouthOf(run);
  const [nx, ny] = normal;
  const half = GLAND.w / 2;
  const plan =
    nx === 0
      ? {
          x: mouth[0] - half,
          y: Math.min(mouth[1], mouth[1] - ny * GLAND.out),
          w: GLAND.w,
          d: GLAND.out,
          r: 1,
        }
      : {
          x: Math.min(mouth[0], mouth[0] - nx * GLAND.out),
          y: mouth[1] - half,
          w: GLAND.out,
          d: GLAND.w,
          r: 1,
        };
  const zc = GLAND.z + GLAND.h / 2;
  const axis = nx === 0 ? "y" : "x";
  return [
    solid(k.slabOf(plan, GLAND.z, GLAND.h, P, 2, 0.4), { tone: "mid" }),
    line(k.sideRing([mouth[0], mouth[1], zc], 3.4, axis, P, 6), { tone: "lo" }),
    line(k.sideRing([mouth[0], mouth[1], zc], 2, axis, P, 16), { tone: "mid" }),
  ].join("");
}

function wire(run) {
  const { normal, mouth } = mouthOf(run);
  const zc = GLAND.z + GLAND.h / 2;
  const drop = [mouth[0] + normal[0] * 7, mouth[1] + normal[1] * 7];
  const route = run.route.map(([x, y]) => [x, y, CABLE_Z]);
  return cable(
    [mouth[0], mouth[1], zc],
    route.at(-1),
    [
      [mouth[0] + normal[0] * 3, mouth[1] + normal[1] * 3, zc - 1],
      [drop[0], drop[1], CABLE_Z + 2],
      [drop[0] + normal[0] * 4, drop[1] + normal[1] * 4, CABLE_Z],
      ...route.slice(0, -1),
    ],
    P,
    { tone: "mid", ends: "none" },
  );
}

const halo = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(4px)"/>`;

/** A terminal: a round puck, a small block or a socket plate. */
function terminal([x, y], kind) {
  if (kind === "puck") {
    return [
      halo({ x: x - 9, y: y - 9, w: 18, d: 18, r: 9 }),
      solid(k.cylinder(x, y, 9, 0, 2, P, 36), { tone: "lo" }),
      solid(k.cylinder(x, y, 7.6, 2, 5, P, 36, 0.6), { tone: "mid" }),
      line(k.ring(x, y, 4.2, 7, P, 28), { tone: "lo" }),
      dots([at([x, y, 7])], { size: 0.5 }),
    ].join("");
  }
  if (kind === "block") {
    const plan = { x: x - 9, y: y - 7, w: 18, d: 14, r: 2 };
    return [
      halo(plan),
      solid(k.slabOf(plan, 0, 9, P, 3, 0.6), { tone: "mid" }),
      dots(k.dotGrid(plan.x + 4, plan.y + 4, 4, 3, 3.2, 9, P), {
        size: 0.45,
        tone: "lo",
      }),
    ].join("");
  }
  const plan = { x: x - 8, y: y - 8, w: 16, d: 16, r: 2 };
  return [
    halo(plan),
    solid(k.slabOf(plan, 0, 4, P, 3, 0.5), { tone: "mid" }),
    line(k.ring(x, y, 4.2, 4, P, 6), { tone: "mid" }),
    line(k.ring(x, y, 2.4, 4, P, 20), { tone: "lo" }),
    screws(k.corners(plan, 2.8), 4, P, 0.9),
  ].join("");
}

function junctionBox() {
  const lid = { ...BOX, r: BOX.r + 1 };
  const top = BOX_H + LID_H;
  const inner = k.insetPlan(lid, 6);
  const out = [
    halo(BOX),
    solid(k.slabOf(BOX, 0, BOX_H, P, 4, 0.6), { tone: "mid" }),
    line(k.sideSeam(BOX, 4, P, 4), { tone: "faint" }),
    solid(k.slabOf(lid, BOX_H, LID_H, P, 4, 0.8), {
      tone: "mid",
      crease: "lo",
    }),
    line(k.planOutline(inner, top, P, 3), { tone: "faint" }),
    screws(k.corners(lid, 4), top, P, 1.4),
  ];
  for (let i = 0; i < 5; i++) {
    const y = inner.y + 8 + i * 3.4;
    out.push(
      line(k.lineOnTop([inner.x + 6, y], [inner.x + 28, y], top, P), {
        tone: "lo",
      }),
    );
  }
  out.push(
    lamp([inner.x + inner.w - 9, inner.y + 9], top, P, {
      lit: true,
      radius: 2.6,
    }),
  );
  return out.join("");
}

export function figure() {
  const far = RUNS.filter(({ side }) => FAR.has(side));
  const near = RUNS.filter(({ side }) => !FAR.has(side));
  const terminals = (runs) =>
    byDepth(
      runs.map(({ route, end }) => [...route.at(-1), end]),
      P,
    ).map(([x, y, kind]) => terminal([x, y], kind));
  return {
    label:
      "A junction box with a lit lamp on its lid on a bench plate, with cables entering through glands on all four sides from small terminals spread around it.",
    body: [
      benchPlate(PLATE, P),
      ...far.map(wire),
      ...terminals(far),
      ...far.map(gland),
      junctionBox(),
      ...near.map(gland),
      ...near.map(wire),
      ...terminals(near),
    ],
  };
}
