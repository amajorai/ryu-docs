/*
 * "Security": layered protection around everything Ryu touches, drawn as a
 * shield standing in a plinth. A hasp hangs from a hinge on its face, its slot
 * over a staple, and a padlock (the lit part) is shut through the staple; the
 * key lies on the bench beside it.
 */

import { benchPlate, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -80, y: -44, w: 160, d: 88, r: 8 };
const STAND = { x: -46, y: -24, w: 92, d: 30, r: 4 };
const STAND_H = 10;
const SHIELD = { half: 40, tip: 9, shoulder: 54, height: 100, corner: 5 };
const BACK = -13;
const FACE = -7;
const CHOCK = { w: 30, d: 5, h: 5 };
const HINGE = { x0: -11, x1: 11, z0: 82, z1: 94 };
const STRAP = { x0: -5, x1: 5, z0: 44, z1: 84 };
const STAPLE_Z = 52;
const STAPLE = { x: -4.5, y: FACE, w: 9, d: 9.5, r: 2.5 };
const HOLE = [0, FACE + 6];
const LOCK = { x: -6, y: -5, w: 24, d: 8, r: 3 };
const LOCK_TOP = 38;
const LOCK_H = 20;
const SHACKLE = { cx: 6, base: 60, outer: 7.5, inner: 4.5 };
const KEY = [28, 26];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [-SHIELD.half, BACK, STAND_H + SHIELD.height + 2],
    [SHIELD.half, BACK, STAND_H + SHIELD.height + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const { sinA } = k.cameraOf(P);
const lift = (z) => STAND_H + z;

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

/** The shield outline: a flat top with rounded corners, sides curving to a blunt tip. */
function shieldProfile() {
  const { half, tip, shoulder, height, corner } = SHIELD;
  const steps = 14;
  const side = [];
  for (let i = 0; i <= steps; i++) {
    const phi = (Math.PI / 2) * (1 - i / steps);
    side.push([
      tip + (half - tip) * Math.cos(phi),
      lift(shoulder * (1 - Math.sin(phi))),
    ]);
  }
  const top = lift(height);
  const right = [
    ...side,
    [half, top - corner],
    [half - corner * 0.3, top - corner * 0.3],
    [half - corner, top],
  ];
  const left = right.map(([x, z]) => [-x, z]).reverse();
  return [...right, ...left];
}

/** Scale a profile toward the shield's middle to trace an inset rim. */
const insetProfile = (profile, by) =>
  profile.map(([x, z]) => {
    const mid = lift(SHIELD.shoulder);
    return [x * (1 - by / SHIELD.half), mid + (z - mid) * (1 - by / 60)];
  });

const faceRect = ({ x0, x1, z0, z1 }) => [
  [x0, lift(z0)],
  [x1, lift(z0)],
  [x1, lift(z1)],
  [x0, lift(z1)],
];

function stand() {
  const chock = (y) => ({ x: -CHOCK.w / 2, y, w: CHOCK.w, d: CHOCK.d, r: 1.5 });
  return [
    `<path class="iso-halo" d="${k.haloOf(STAND, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(STAND, 0, STAND_H, P, 4, 0.6), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(STAND, 3), STAND_H, P, 3), {
      tone: "faint",
    }),
    screws(k.corners(STAND, 4), STAND_H, P, 1.2),
    solid(k.slabOf(chock(BACK - CHOCK.d), STAND_H, CHOCK.h, P, 2, 0.4), {
      tone: "mid",
    }),
  ].join("");
}

function shield() {
  const profile = shieldProfile();
  const rim = insetProfile(profile, 5);
  const rivets = rim.filter((_, i) => i % 6 === 3);
  return [
    prismY(profile, BACK, FACE),
    line(
      k.pathOf(
        rim.map(([x, z]) => at([x, FACE, z])),
        true,
      ),
      {
        tone: "lo",
      },
    ),
    line(
      rivets
        .map(([x, z]) => k.sideRing([x, FACE, z], 1.3, "y", P, 12))
        .join(""),
      { tone: "lo" },
    ),
    dots(
      rivets.map(([x, z]) => at([x, FACE, z])),
      { size: 0.5 },
    ),
    solid(
      k.slabOf(
        { x: -CHOCK.w / 2, y: FACE, w: CHOCK.w, d: CHOCK.d, r: 1.5 },
        STAND_H,
        CHOCK.h,
        P,
        2,
        0.4,
      ),
      { tone: "mid" },
    ),
  ].join("");
}

/** The hinge plate and the hasp strap hanging from it over the staple. */
function hasp() {
  const strapFace = FACE + 1.2;
  const pins = [
    [HINGE.x0 + 3, lift(HINGE.z0 + 6)],
    [HINGE.x1 - 3, lift(HINGE.z0 + 6)],
  ];
  return [
    prismY(faceRect(HINGE), FACE, FACE + 1.6),
    line(
      pins
        .map(([x, z]) => k.sideRing([x, FACE + 1.6, z], 1.2, "y", P, 12))
        .join(""),
      { tone: "lo" },
    ),
    prismY(faceRect(STRAP), FACE, strapFace),
    line(
      k.pathOf(
        faceRect({ x0: -2.6, x1: 2.6, z0: STAPLE_Z - 3, z1: STAPLE_Z + 5 }).map(
          ([x, z]) => at([x, strapFace, z]),
        ),
        true,
      ),
      { tone: "lo" },
    ),
  ].join("");
}

/** A shackle piece: legs and arc, as one profile swept through the lock's middle. */
function shackleProfile(from) {
  const { cx, base, outer, inner } = SHACKLE;
  const steps = 12;
  const arc = (radius, reverse) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const t = reverse ? i / steps : 1 - i / steps;
      const angle = Math.PI * t;
      return [
        cx + radius * Math.cos(angle),
        lift(base) + radius * Math.sin(angle),
      ];
    });
  return [
    [cx - outer, lift(from)],
    ...arc(outer, false),
    [cx + outer, lift(LOCK_TOP)],
    [cx + inner, lift(LOCK_TOP)],
    ...arc(inner, true),
    [cx - inner, lift(from)],
  ];
}

function padlock() {
  const { cx, outer, inner } = SHACKLE;
  const y0 = HOLE[1] - 1.5;
  const y1 = HOLE[1] + 1.5;
  const front = LOCK.y + LOCK.d;
  const z0 = lift(LOCK_TOP - LOCK_H);
  const keyhole = lift(LOCK_TOP - 8);
  const leg = [
    [cx - outer, lift(LOCK_TOP)],
    [cx - inner, lift(LOCK_TOP)],
    [cx - inner, lift(STAPLE_Z)],
    [cx - outer, lift(STAPLE_Z)],
  ];
  return [
    prismY(leg, y0, y1),
    solid(k.slabOf(STAPLE, lift(STAPLE_Z), 2, P, 3, 0.4), { tone: "mid" }),
    line(k.ring(HOLE[0], HOLE[1], 2.2, lift(STAPLE_Z) + 2, P, 16), {
      tone: "lo",
    }),
    prismY(shackleProfile(STAPLE_Z + 2), y0, y1),
    solid(k.slabOf(LOCK, z0, LOCK_H, P, 4, 0.6), { tone: "hi", lit: true }),
    line(k.sideSeam(LOCK, z0 + 4, P, 4), { tone: "lo" }),
    line(k.sideRing([LOCK.x + LOCK.w / 2, front, keyhole], 1.8, "y", P, 14), {
      tone: "hi",
    }),
    line(
      k.segment(
        [LOCK.x + LOCK.w / 2, front, keyhole - 1.8],
        [LOCK.x + LOCK.w / 2, front, keyhole - 6],
        P,
      ),
      { tone: "hi" },
    ),
  ].join("");
}

/** The key lying flat: a round bow with a hole, a shank and a toothed bit. */
function key() {
  const [x, y] = KEY;
  const bow = 7;
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x - bow, y: y - bow, w: 40, d: bow * 2, r: bow }, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(
      k.slabOf(
        { x: x + bow - 2, y: y - 1.6, w: 28, d: 3.2, r: 1 },
        0,
        1.8,
        P,
        2,
      ),
      {
        tone: "mid",
      },
    ),
    ...[17, 22].map((offset) =>
      solid(
        k.slabOf(
          { x: x + bow + offset, y: y + 1.2, w: 4, d: 4.4, r: 0.5 },
          0,
          1.8,
          P,
          1,
        ),
        { tone: "mid" },
      ),
    ),
    solid(k.cylinder(x, y, bow, 0, 2.2, P, 32, 0.4), { tone: "mid" }),
    line(k.ring(x, y, 2.4, 2.2, P, 16), { tone: "lo" }),
  ].join("");
}

export function figure() {
  return {
    label:
      "A shield standing in a plinth on a bench plate, with a hasp hanging from a hinge over a staple and a lit padlock shut through it, and its key lying on the bench beside it.",
    body: [benchPlate(PLATE, P), stand(), shield(), hasp(), padlock(), key()],
  };
}
