/*
 * "Mail": an inbox an agent owns, drawn as a rural mailbox on a post. Its
 * raised flag (the one lit part) says post is waiting, and a desk tray in front
 * holds a small stack of envelopes, the top one stamped.
 */

import { benchPlate, k, line, rulerStrip, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -100, y: -62, w: 192, d: 104, r: 8 };
const FOOT = { x: -58, y: -45, w: 26, d: 26, r: 3 };
const POST = { x: -50, y: -37, w: 10, d: 10, r: 1 };
const MOUNT = 50;
const BOX = { x0: -92, x1: -4, y0: -50, y1: -14, wall: 22 };
const ARCH = (BOX.y1 - BOX.y0) / 2;
const BOX_TOP = MOUNT + 3 + BOX.wall + ARCH;
const FLAG = { x: -80, z0: MOUNT + 14, z1: BOX_TOP + 18, w: 20, h: 12 };
const TRAY = { x: 8, y: -40, w: 76, d: 56, r: 3 };
const WALL = 2.4;
const WALL_H = 7;
const ENVELOPE = { w: 56, d: 34 };
const ENVELOPE_T = 1.6;
const STACK = [
  [0.07, -1, 1],
  [-0.05, 1.5, -0.5],
  [0.03, -0.5, 0.5],
  [-0.08, 0.8, -1],
];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [BOX.x0, BOX.y0, BOX_TOP + 4],
    [FLAG.x, BOX.y1, FLAG.z1 + 2],
    [BOX.x1 + 2, BOX.y1, FLAG.z1],
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

/** The mailbox's cross-section: straight walls under a half-round roof. */
function mailboxProfile(grow = 0) {
  const r = ARCH + grow;
  const mid = (BOX.y0 + BOX.y1) / 2;
  const z0 = MOUNT + 3 - grow;
  const spring = MOUNT + 3 + BOX.wall;
  const roof = Array.from({ length: 17 }, (_, i) => {
    const angle = (i / 16) * Math.PI;
    return [mid + r * Math.cos(angle), spring + r * Math.sin(angle)];
  });
  return [[mid - r, z0], [mid + r, z0], ...roof];
}

/** The part of the profile at x that faces the viewer: a rib around the roof. */
function rib(x) {
  const ring = mailboxProfile(0.3);
  const facing = (i) => {
    const [ay, az] = ring[i];
    const [by, bz] = ring[(i + 1) % ring.length];
    return k.depthOf([0, bz - az, ay - by], P) > 0;
  };
  const points = ring.filter((_, i) => i > 1 && (facing(i) || facing(i - 1)));
  return line(k.pathOf(points.map(([y, z]) => at([x, y, z]))), {
    tone: "lo",
  });
}

function post() {
  return [
    `<path class="iso-halo" d="${k.haloOf(FOOT, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(FOOT, 0, 3, P, 4, 0.6), { tone: "lo" }),
    screws(k.corners(FOOT, 3.5), 3, P, 1.1),
    solid(k.slabOf(POST, 3, MOUNT - 3, P, 2), { tone: "mid" }),
    solid(k.slabOf({ x: -70, y: -44, w: 48, d: 24, r: 1.5 }, MOUNT, 3, P, 3), {
      tone: "mid",
    }),
  ].join("");
}

function mailbox() {
  const doorFace = BOX.x1 + 1.6;
  const midY = (BOX.y0 + BOX.y1) / 2;
  return [
    sweep(mailboxProfile(), "x", BOX.x0, BOX.x1, { tone: "mid" }),
    rib(BOX.x0 + 6),
    rib(BOX.x1 - 6),
    sweep(mailboxProfile(1), "x", BOX.x1, doorFace, { tone: "mid" }),
    line(
      k.pathOf(
        mailboxProfile(-3)
          .slice(2)
          .map(([y, z]) => at([doorFace, y, z])),
      ),
      { tone: "faint" },
    ),
    // The door's latch tab.
    sweep(
      [
        [midY - 3, BOX_TOP - 4],
        [midY + 3, BOX_TOP - 4],
        [midY + 3, BOX_TOP + 1],
        [midY - 3, BOX_TOP + 1],
      ],
      "x",
      doorFace,
      doorFace + 2.4,
      { tone: "mid" },
    ),
  ].join("");
}

/** The raised flag on its pivot, on the mailbox's near side. */
function flag() {
  const y0 = BOX.y1 + 0.4;
  const pivotZ = FLAG.z0;
  return [
    sweep(
      [
        [FLAG.x - 1.6, pivotZ - 3],
        [FLAG.x + 1.6, pivotZ - 3],
        [FLAG.x + 1.6, FLAG.z1],
        [FLAG.x - 1.6, FLAG.z1],
      ],
      "y",
      y0,
      y0 + 1.2,
      { tone: "mid" },
    ),
    sweep(
      [
        [FLAG.x + 1.6, FLAG.z1 - FLAG.h],
        [FLAG.x + 1.6 + FLAG.w, FLAG.z1 - FLAG.h],
        [FLAG.x + 1.6 + FLAG.w, FLAG.z1],
        [FLAG.x + 1.6, FLAG.z1],
      ],
      "y",
      y0,
      y0 + 1.2,
      { tone: "hi", lit: true },
    ),
    line(k.sideRing([FLAG.x, y0 + 1.3, pivotZ], 2.2, "y", P, 16), {
      tone: "lo",
    }),
  ].join("");
}

/** A tray wall as a thin slab along one edge of the tray. */
const wall = (plan) =>
  solid(k.slabOf(plan, 2, WALL_H - 2, P, 2), { tone: "mid" });

/** One envelope turned by `angle` about the tray centre, at height z. */
function envelope([angle, dx, dy], z, top) {
  const cx = TRAY.x + TRAY.w / 2 + dx;
  const cy = TRAY.y + TRAY.d / 2 + dy;
  const turn = ([x, y]) => {
    const [u, v] = [x - cx, y - cy];
    return [
      cx + u * Math.cos(angle) - v * Math.sin(angle),
      cy + u * Math.sin(angle) + v * Math.cos(angle),
    ];
  };
  const plan = {
    x: cx - ENVELOPE.w / 2,
    y: cy - ENVELOPE.d / 2,
    w: ENVELOPE.w,
    d: ENVELOPE.d,
    r: 1,
  };
  const ring = k.roundedPlan(plan, 2).map(turn);
  const out = [
    solid(k.extrude(ring, z, ENVELOPE_T, P, { convex: true }), {
      tone: "mid",
      crease: "none",
    }),
  ];
  if (top) {
    const lid = z + ENVELOPE_T;
    const flap = [
      [plan.x + 1, plan.y + 1],
      [cx, cy + 3],
      [plan.x + plan.w - 1, plan.y + 1],
    ].map(turn);
    const stamp = {
      x: plan.x + plan.w - 13,
      y: plan.y + plan.d - 14,
      w: 9,
      d: 10,
      r: 0.5,
    };
    out.push(
      line(k.onTop(flap, lid, P), { tone: "lo" }),
      line(k.onTop(k.roundedPlan(stamp, 1).map(turn), lid, P, true), {
        tone: "mid",
      }),
      line(
        k.onTop(
          k
            .circleRing(stamp.x - 4, stamp.y + 5, 4.5, 20)
            .slice(6, 15)
            .map(turn),
          lid,
          P,
        ),
        { tone: "faint" },
      ),
    );
  }
  return out.join("");
}

function tray() {
  const { x, y, w, d } = TRAY;
  const out = [
    `<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(TRAY, 0, 2, P, 3, 0.4), { tone: "lo" }),
    wall({ x, y, w, d: WALL, r: 0.6 }),
    wall({ x, y, w: WALL, d, r: 0.6 }),
  ];
  for (const [i, entry] of STACK.entries()) {
    out.push(envelope(entry, 2 + i * ENVELOPE_T, i === STACK.length - 1));
  }
  out.push(
    wall({ x: x + w - WALL, y, w: WALL, d, r: 0.6 }),
    wall({ x, y: y + d - WALL, w, d: WALL, r: 0.6 }),
  );
  return out.join("");
}

export function figure() {
  return {
    label:
      "A rural mailbox on a post with its flag raised and lit, beside a desk tray holding a stack of envelopes, the top one stamped.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -88, y: PLATE.y + PLATE.d - 16, w: 80, d: 7, r: 1 }, P),
      post(),
      mailbox(),
      flag(),
      tray(),
    ],
  };
}
