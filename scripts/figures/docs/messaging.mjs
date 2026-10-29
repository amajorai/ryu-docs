/*
 * "Messaging": a number that takes calls and texts, drawn as a desk phone. The
 * handset rests in its cradle with a coiled cord running down to the base; the
 * sloped face carries a keypad and a small screen showing two message bubbles,
 * and the message-waiting lamp beside it is the one lit part. A SIM card lies
 * on the bench in front.
 */

import { benchPlate, dots, k, line, rulerStrip, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -84, y: -64, w: 168, d: 112, r: 8 };
const BASE = { x0: -64, x1: 30, back: -50, ridge: -16, front: 14 };
const BASE_H = 24;
const LIP_H = 6;
const HANDSET = { x0: -68, x1: 34, cup: 22, y0: -46, y1: -18 };
const GRIP = { y0: -36, y1: -28, z0: 33, z1: 41 };
const CUP = { z0: 27, z1: 37 };
const KEYS = { x: [-52, -42, -32], s: [6, 12.5, 19, 25.5], w: 7.6, d: 4.6 };
const SCREEN = { x0: -20, x1: 22, s0: 5, s1: 22 };
const SIM = { x: 40, y: 18, w: 28, d: 19, r: 2 };
const CORD = { turns: 30, steps: 12, radius: 2.4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [HANDSET.x0, HANDSET.y0, GRIP.z1 + 2],
    [HANDSET.x1, HANDSET.y0, GRIP.z1 + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const { sinA, cosA } = k.cameraOf(P);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((c) => c / length);
};
const mean = (points) =>
  [0, 1, 2].map(
    (i) => points.reduce((sum, p) => sum + p[i], 0) / points.length,
  );

/** The outward unit normal of a planar polygon (Newell), away from `inside`. */
function normalOf(face, inside) {
  const n = [0, 0, 0];
  for (const [i, a] of face.entries()) {
    const b = face[(i + 1) % face.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const out = unit(n);
  return dot(out, sub(mean(face), inside)) < 0 ? out.map((c) => -c) : out;
}

/** The kit's fill class for a face with this normal: top or a side shade. */
function paintOf([nx, ny, nz]) {
  if (nz > 0.6) {
    return 'class="iso-top"';
  }
  const across = Math.hypot(nx, ny) || 1;
  const light = ((nx * -sinA + ny * cosA) / across + 1) / 2;
  const shade = nz < -0.3 ? 0 : Math.min(3, Math.floor(light * 4));
  return `class="iso-shade" data-shade="${shade}"`;
}

/** The closed convex hull of screen points (monotone chain). */
function hullPath(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length > 1 && cross(out.at(-2), out.at(-1), p) <= 0) {
        out.pop();
      }
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return k.pathOf([...half(sorted), ...half([...sorted].reverse())], true);
}

/** A convex solid from its 3D faces: shaded faces, hard creases, silhouette. */
function convexSolid(faces, { tone = "mid", lit = false, crease = 0.9 } = {}) {
  const inside = mean(faces.flat());
  const shown = faces
    .map((face) => ({ face, normal: normalOf(face, inside) }))
    .filter(({ normal }) => k.depthOf(normal, P) > 1e-6);
  const seen = new Map();
  const creases = [];
  const keyOf = (p) => p.map((c) => c.toFixed(2)).join(",");
  for (const { face, normal } of shown) {
    for (const [i, a] of face.entries()) {
      const b = face[(i + 1) % face.length];
      const key = [keyOf(a), keyOf(b)].sort().join("|");
      if (seen.has(key) && dot(seen.get(key), normal) < crease) {
        creases.push(k.segment(a, b, P));
      }
      seen.set(key, normal);
    }
  }
  const outline = hullPath(faces.flat().map(at));
  const paint = shown
    .map(
      ({ face, normal }) =>
        `<path ${paintOf(normal)} d="${k.pathOf(face.map(at), true)}"/>`,
    )
    .join("");
  return `<g class="iso-solid" data-seamless=""${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${outline}"/>${paint}${line(creases.join(""), { tone: "faint" })}<path class="iso-line iso-edge" data-tone="${tone}" d="${outline}"/></g>`;
}

/** A convex [u, z] profile swept along `axis` ("x" or "y") from s0 to s1. */
function sweep(profile, axis, s0, s1, style) {
  const place = ([u, z], s) => (axis === "x" ? [s, u, z] : [u, s, z]);
  const near = profile.map((p) => place(p, s0));
  const far = profile.map((p) => place(p, s1));
  const sides = profile.map((_, i) => {
    const j = (i + 1) % profile.length;
    return [near[i], near[j], far[j], far[i]];
  });
  return convexSolid([near, far, ...sides], style);
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v, by) => v.map((c) => c * by);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** The sloped keypad face: a point `s` down the slope from the ridge at x. */
const SLOPE = unit([0, BASE.front - BASE.ridge, LIP_H - BASE_H]);
const NORMAL = unit([0, BASE_H - LIP_H, BASE.front - BASE.ridge]);
const onSlope = (x, s, lift = 0) =>
  add(add([x, BASE.ridge, BASE_H], scale(SLOPE, s)), scale(NORMAL, lift));

/** A rectangle on the slope, as a closed path at height `lift` above it. */
const slopeRect = (x0, x1, s0, s1, lift = 0) =>
  k.pathOf(
    [
      onSlope(x0, s0, lift),
      onSlope(x1, s0, lift),
      onSlope(x1, s1, lift),
      onSlope(x0, s1, lift),
    ].map(at),
    true,
  );

/** A key raised `height` off the slope over x0..x1 and s0..s1. */
function slopeKey(x0, x1, s0, s1, height, style) {
  const foot = [
    onSlope(x0, s0),
    onSlope(x1, s0),
    onSlope(x1, s1),
    onSlope(x0, s1),
  ];
  const cap = foot.map((p) => add(p, scale(NORMAL, height)));
  const sides = foot.map((_, i) => {
    const j = (i + 1) % 4;
    return [foot[i], foot[j], cap[j], cap[i]];
  });
  return convexSolid([foot, cap, ...sides], style);
}

function base() {
  const { x0, x1, back, ridge, front } = BASE;
  const profile = [
    [back, 0],
    [front, 0],
    [front, LIP_H],
    [ridge, BASE_H],
    [back, BASE_H],
  ];
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: x0, y: back, w: x1 - x0, d: front - back, r: 4 }, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    sweep(profile, "x", x0, x1, { tone: "mid" }),
    line(
      k.pathOf(
        [
          [x1, front - 2, 2],
          [x1, back + 2, 2],
        ].map(at),
      ),
      { tone: "faint" },
    ),
  ];
  // Speaker grille on the right flank.
  for (let i = 0; i < 4; i++) {
    const y = back + 5 + i * 3.4;
    out.push(line(k.segment([x1, y, 8], [x1, y, 18], P), { tone: "lo" }));
  }
  // Cradle seats on the flat back deck.
  for (const x of [x0 + 14, x1 - 14]) {
    out.push(
      solid(
        k.slabOf(
          { x: x - 4, y: back + 8, w: 8, d: 26, r: 1.5 },
          BASE_H,
          3,
          P,
          3,
        ),
        {
          tone: "lo",
        },
      ),
    );
  }
  return out.join("");
}

function keypad() {
  const out = [line(slopeRect(-57, -15, 3, 31), { tone: "faint" })];
  for (const s of KEYS.s) {
    for (const x of KEYS.x) {
      out.push(
        slopeKey(
          x - KEYS.w / 2,
          x + KEYS.w / 2,
          s - KEYS.d / 2,
          s + KEYS.d / 2,
          1.4,
          {
            tone: "mid",
          },
        ),
      );
    }
  }
  return out.join("");
}

/** The screen with one incoming and one outgoing bubble, and the lamp. */
function screen() {
  const { x0, x1, s0, s1 } = SCREEN;
  const bubble = (bx0, bx1, bs0, bs1, tail) =>
    k.pathOf(
      [
        onSlope(bx0, bs0, 0.1),
        onSlope(bx1, bs0, 0.1),
        onSlope(bx1, bs1, 0.1),
        onSlope(tail[1], bs1, 0.1),
        onSlope(tail[0], bs1 + 2, 0.1),
        onSlope(tail[2], bs1, 0.1),
        onSlope(bx0, bs1, 0.1),
      ].map(at),
      true,
    );
  return [
    line(slopeRect(x0 - 2, x1 + 2, s0 - 2, s1 + 2), { tone: "faint" }),
    `<path class="iso-shade" data-shade="0" d="${slopeRect(x0, x1, s0, s1)}"/>`,
    line(slopeRect(x0, x1, s0, s1), { tone: "lo" }),
    line(bubble(x0 + 3, x0 + 22, s0 + 2.5, s0 + 7, [x0 + 5, x0 + 8, x0 + 11]), {
      tone: "lo",
    }),
    line(bubble(x1 - 20, x1 - 3, s0 + 10, s0 + 14, [x1 - 5, x1 - 9, x1 - 12]), {
      tone: "mid",
    }),
    slopeKey(x1 - 4, x1 + 1, 25, 29, 1.6, { tone: "hi", lit: true }),
    dots([at(onSlope(x1 - 12, 27, 0.1)), at(onSlope(x1 - 18, 27, 0.1))], {
      size: 0.8,
      tone: "lo",
    }),
  ].join("");
}

/** A rounded [y, z] section: a rectangle with its corners cut at `r`. */
function section(y0, y1, z0, z1, r) {
  return k
    .roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, 3)
    .map(([y, z]) => [y, z]);
}

function handset() {
  const { x0, x1, cup, y0, y1 } = HANDSET;
  const cupPlan = (x) => ({ x, y: y0, w: cup, d: y1 - y0, r: 8 });
  const cupSolid = (x) =>
    solid(k.slabOf(cupPlan(x), CUP.z0, CUP.z1 - CUP.z0, P, 6, 1), {
      tone: "mid",
    });
  const mid = (y0 + y1) / 2;
  return [
    cupSolid(x0),
    dots(k.dotGrid(x0 + 5, mid - 4, 3, 3, 4, CUP.z1, P), {
      size: 0.5,
      tone: "lo",
    }),
    sweep(
      section(GRIP.y0, GRIP.y1, GRIP.z0, GRIP.z1, 3),
      "x",
      x0 + cup / 2,
      x1 - cup / 2,
      { tone: "mid" },
    ),
    cupSolid(x1 - cup),
    line(k.planOutline(k.insetPlan(cupPlan(x1 - cup), 3), CUP.z1, P, 6), {
      tone: "faint",
    }),
  ].join("");
}

/** The cord's centre line: handset cup, down the flank, a loop on the bench. */
const CORD_PATH = [
  [HANDSET.x1 - 3, HANDSET.y1 - 3, CUP.z0 - 1],
  [BASE.x1 + 7, HANDSET.y1 - 2, 15],
  [BASE.x1 + 16, -10, CORD.radius],
  [BASE.x1 + 16, 6, CORD.radius],
  [BASE.x1 + 0.5, 6, 6],
];

/** A point `t` along the Catmull-Rom spline through CORD_PATH. */
function cordAt(t) {
  const last = CORD_PATH.length - 1;
  const span = Math.min(last - 1, Math.floor(t * last));
  const f = t * last - span;
  const p0 = CORD_PATH[Math.max(0, span - 1)];
  const [p1, p2] = [CORD_PATH[span], CORD_PATH[span + 1]];
  const p3 = CORD_PATH[Math.min(last, span + 2)];
  return [0, 1, 2].map(
    (i) =>
      0.5 *
      (2 * p1[i] +
        (p2[i] - p0[i]) * f +
        (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * f ** 2 +
        (3 * p1[i] - p0[i] - 3 * p2[i] + p3[i]) * f ** 3),
  );
}

/** The coiled cord: a helix wound along CORD_PATH with parallel-transported frames. */
function cord() {
  const count = CORD.turns * CORD.steps;
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  let u = [1, 0, 0];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const tangent = unit(
      sub(cordAt(Math.min(1, t + 0.005)), cordAt(Math.max(0, t - 0.005))),
    );
    u = unit(sub(u, scale(tangent, dot(u, tangent))));
    const v = cross(tangent, u);
    const angle = (i / CORD.steps) * Math.PI * 2;
    const out = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)));
    const point = at(add(cordAt(t), scale(out, CORD.radius)));
    const facing = k.depthOf(out, P) > 0;
    if (near !== null && facing !== near) {
      run.push(point);
      (near ? front : back).push(k.pathOf(run));
      run = [];
    }
    near = facing;
    run.push(point);
  }
  (near ? front : back).push(k.pathOf(run));
  return [
    line(back.join(""), { tone: "faint" }),
    line(front.join(""), { tone: "mid" }),
  ].join("");
}

/** A SIM card lying on the bench: a notched plate with a contact pad. */
function sim() {
  const { x, y, w, d } = SIM;
  const ring = [
    [x, y],
    [x + w - 6, y],
    [x + w, y + 6],
    [x + w, y + d],
    [x, y + d],
  ];
  const pad = { x: x + 6, y: y + 5, w: 12, d: 10, r: 1.5 };
  return [
    `<path class="iso-halo" d="${k.haloOf(SIM, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.extrude(ring, 0, 1.2, P, { convex: true }), { tone: "mid" }),
    line(k.planOutline(pad, 1.2, P, 2), { tone: "mid" }),
    line(
      [
        k.lineOnTop([pad.x + 6, pad.y], [pad.x + 6, pad.y + pad.d], 1.2, P),
        k.lineOnTop([pad.x, pad.y + 5], [pad.x + pad.w, pad.y + 5], 1.2, P),
      ].join(""),
      { tone: "lo" },
    ),
  ].join("");
}

export function figure() {
  return {
    label:
      "A desk phone on a bench plate: the handset rests in its cradle with a coiled cord, the sloped face has a keypad and a screen with two message bubbles beside a lit lamp, and a SIM card lies in front.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -72, y: PLATE.y + PLATE.d - 16, w: 96, d: 7, r: 1 }, P),
      base(),
      keypad(),
      screen(),
      handset(),
      cord(),
      sim(),
    ],
  };
}
