/*
 * "Notify": one event fanned out to every subscriber, drawn as a bell hung in
 * a yoke on a bench plate. The lit clapper has just struck; sound arcs spread
 * on both sides and ripple rings run across the plate.
 */

import { benchPlate, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -86, y: -84, w: 172, d: 168, r: 8 };
const BASE = { x: -58, y: -20, w: 116, d: 40, r: 4 };
const BASE_H = 8;
const POST_X = 46;
const POST_R = 4;
const BEAM_Z = 100;
const BEAM_H = 7;
const LIP_Z = 40;
const CROWN_H = 6;
/** The bell's profile from lip to crown as [radius, height] pairs. */
const BELL = [
  [31, 0],
  [31, 2.6],
  [28, 4.4],
  [23, 12],
  [20.5, 22],
  [19, 32],
  [17.5, 40],
  [14.5, 46],
  [9, 49.6],
  [0, 50.6],
];
const BELL_TOP = LIP_Z + BELL.at(-1)[1];
const CLAPPER = { z: LIP_Z - 31, r: 6.5 };
const STEPS = 40;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [-POST_X - 6, 0, BEAM_Z + BEAM_H + 4]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

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
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** Where the horizontal line at screen height `y` crosses a convex polygon. */
function spanAt(polygon, y) {
  const xs = [];
  for (const [index, [ax, ay]] of polygon.entries()) {
    const [bx, by] = polygon[(index + 1) % polygon.length];
    if ((ay - y) * (by - y) <= 0 && ay !== by) {
      xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
  }
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
}

/**
 * A solid of revolution about the vertical axis through (cx, cy): a profile of
 * [radius, height] pairs from bottom to top, returned in the kit's solid shape
 * (silhouette fill and outline, shaded visible bands) for `solidSvg`.
 */
function lathe(cx, cy, profile, z, projection) {
  const ring = ([r, h]) =>
    Array.from({ length: STEPS }, (_, j) => {
      const a = (j / STEPS) * Math.PI * 2;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a), z + h];
    });
  const rings = profile.map(ring);
  const flat = rings.map((points) => points.map((p) => k.iso(p, projection)));
  const hulls = flat.slice(1).map((top, i) => hull([...flat[i], ...top]));
  const ys = flat.flat().map(([, y]) => y);
  const [low, high] = [Math.min(...ys), Math.max(...ys)];
  const left = [];
  const right = [];
  for (let s = 0; s <= 90; s++) {
    const y = low + ((high - low) * s) / 90;
    const spans = hulls.map((polygon) => spanAt(polygon, y)).filter(Boolean);
    if (!spans.length) continue;
    left.push([Math.min(...spans.map(([a]) => a)), y]);
    right.push([Math.max(...spans.map(([, b]) => b)), y]);
  }
  const outline = k.pathOf([...left, ...right.reverse()], true);
  const { sinA, cosA, sinE, cosE } = k.cameraOf(projection);
  const view = [cosA * cosE, sinA * cosE, sinE];
  const light = [-sinA, cosA];
  const shades = Array.from({ length: k.SHADES }, () => []);
  const patches = [];
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, h0] = profile[i];
    const [r1, h1] = profile[i + 1];
    const length = Math.hypot(r1 - r0, h1 - h0) || 1;
    const [nr, nz] = [(h1 - h0) / length, (r0 - r1) / length];
    for (let j = 0; j < STEPS; j++) {
      const a = ((j + 0.5) / STEPS) * Math.PI * 2;
      const n = [nr * Math.cos(a), nr * Math.sin(a), nz];
      if (n[0] * view[0] + n[1] * view[1] + n[2] * view[2] <= 0) continue;
      // Shade by bearing only, so bands run down the bell as clean wedges.
      const lit = (Math.cos(a) * light[0] + Math.sin(a) * light[1] + 1) / 2;
      const shade = Math.min(k.SHADES - 1, Math.max(0, Math.floor(lit * 4)));
      const next = (j + 1) % STEPS;
      const quad = [
        flat[i][j],
        flat[i][next],
        flat[i + 1][next],
        flat[i + 1][j],
      ];
      patches.push([k.depthOf(rings[i][j], projection), shade, quad]);
    }
  }
  patches.sort((a, b) => a[0] - b[0]);
  for (const [, shade, quad] of patches) {
    shades[shade].push(k.pathOf(quad, true));
  }
  return {
    fill: outline,
    outline,
    crease: "",
    top: "",
    shades: shades.map((paths) => paths.join("")),
  };
}

/** A sphere's profile as [radius, height] pairs from its bottom. */
const sphereProfile = (r) =>
  Array.from({ length: 11 }, (_, i) => {
    const t = -Math.PI / 2 + (i / 10) * Math.PI;
    return [Math.max(0.01, r * Math.cos(t)), r + r * Math.sin(t)];
  });

function stand() {
  const top = k.insetPlan(BASE, 5);
  return [
    `<path class="iso-halo" d="${k.haloOf(BASE, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    solid(k.slabOf(BASE, 0, BASE_H, P, 4, 0.8), { tone: "mid" }),
    line(k.planOutline(top, BASE_H, P, 3), { tone: "faint" }),
    screws(k.corners(BASE, 5), BASE_H, P, 1.3),
  ].join("");
}

function post(x) {
  return [
    solid(k.cylinder(x, 0, POST_R + 2.4, BASE_H, 3, P, 28), { tone: "lo" }),
    solid(k.cylinder(x, 0, POST_R, BASE_H + 3, BEAM_Z - BASE_H - 3, P, 28), {
      tone: "mid",
    }),
  ].join("");
}

function beam() {
  const plan = { x: -POST_X - 6, y: -5, w: POST_X * 2 + 12, d: 10, r: 2 };
  return [
    solid(k.slabOf(plan, BEAM_Z, BEAM_H, P, 3, 0.6), { tone: "mid" }),
    screws(
      [
        [-POST_X, 0],
        [POST_X, 0],
      ],
      BEAM_Z + BEAM_H,
      P,
      1.6,
    ),
  ].join("");
}

function bell() {
  const out = [
    solid(lathe(0, 0, BELL, LIP_Z, P), { tone: "mid", crease: "none" }),
  ];
  for (const [r, h] of [BELL[1], BELL[3], BELL[6]]) {
    out.push(line(k.sideArc(0, 0, r, LIP_Z + h, P, 32), { tone: "lo" }));
  }
  // Crown: a short neck and a hanging loop under the beam.
  out.push(
    solid(k.cylinder(0, 0, 4.5, BELL_TOP - 0.6, CROWN_H / 2, P, 24), {
      tone: "mid",
    }),
    line(k.sideRing([0, 0, BELL_TOP + CROWN_H], 3.4, "y", P, 20), {
      tone: "mid",
    }),
  );
  return out.join("");
}

function clapper() {
  return [
    line(k.rise([0, 0], CLAPPER.z + CLAPPER.r * 2, LIP_Z + 8, P), {
      tone: "mid",
    }),
    solid(lathe(0, 0, sphereProfile(CLAPPER.r), CLAPPER.z, P), {
      tone: "hi",
      lit: true,
      crease: "none",
    }),
  ].join("");
}

/** Sound arcs in the plane x = 0, on the side of the bell given by `side`. */
function soundArcs(side) {
  const zc = LIP_Z + 22;
  const out = [];
  for (const [i, radius] of [58, 67, 76].entries()) {
    const points = [];
    for (let s = 0; s <= 16; s++) {
      const t = (-0.3 + (s / 16) * 0.6) * Math.PI * 0.5;
      points.push(
        at([0, side * radius * Math.cos(t), zc + radius * Math.sin(t)]),
      );
    }
    out.push(
      line(k.pathOf(points), { tone: ["mid", "lo", "faint"][i], free: true }),
    );
  }
  return out.join("");
}

function ripples() {
  return [62, 70, 77]
    .map((radius, i) =>
      line(k.ring(0, 0, radius, 0, P, 72), {
        tone: i === 0 ? "lo" : "faint",
        dashed: i > 0,
      }),
    )
    .join("");
}

export function figure() {
  return {
    label:
      "A bell hung in a yoke on a bench plate with a lit clapper beneath it, sound arcs on both sides and ripple rings across the plate.",
    body: [
      benchPlate(PLATE, P),
      ripples(),
      dots(k.dotGrid(PLATE.x + 14, PLATE.y + 14, 2, 2, 8, 0, P), {
        size: 0.4,
        tone: "lo",
      }),
      stand(),
      soundArcs(-1),
      post(-POST_X),
      clapper(),
      bell(),
      post(POST_X),
      beam(),
      soundArcs(1),
    ],
  };
}
