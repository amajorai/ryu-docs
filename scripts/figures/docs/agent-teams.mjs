/*
 * "Agent teams": a coordinator hands work to a ring of agents, drawn as a hub
 * and satellites on a round turntable. A knurled hub puck (its lamp the one lit
 * part) is cabled to five satellite pucks on a dotted ring, and one satellite
 * delegates onward to a smaller puck of its own.
 */

import {
  byDepth,
  dots,
  jack,
  k,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE_R = 100;
const PLATE_H = 10;
const FOOT_H = 5;
const HUB_R = 26;
const HUB_H = 32;
const RING_R = 64;
const SAT_R = 15;
const SAT_H = 19;
const ANGLES = [4, 76, 148, 220, 292].map((deg) => (deg * Math.PI) / 180);
const DELEGATE = 0;
const SUB_RING = 84;
const SUB_R = 8;
const SUB_H = 11;

const polar = (radius, angle) => [
  Math.cos(angle) * radius,
  Math.sin(angle) * radius,
];
const disc = ([x, y], r) => ({ x: x - r, y: y - r, w: r * 2, d: r * 2, r });

const P = k.fitProjection(
  [
    ...k.circleRing(0, 0, PLATE_R, 24).flatMap(([x, y]) => [
      [x, y, -PLATE_H - FOOT_H],
      [x, y, 0],
    ]),
    [0, 0, HUB_H + 6],
    ...ANGLES.map((angle) => [...polar(RING_R + SAT_R, angle), SAT_H + 2]),
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (centre, r) =>
  `<path class="iso-halo" d="${k.haloOf(disc(centre, r), 0, 0.1, P)}" style="filter:blur(5px)"/>`;

/** The turntable: a round plate on three feet with a groove and a dotted ring. */
function turntable() {
  const bottom = -PLATE_H - FOOT_H;
  const ticks = k.radialTicks(0, 0, PLATE_R - 8, 72, 6, 0, [1.4, 3], P);
  const out = [
    `<path class="iso-halo" d="${k.haloOf(disc([0, 0], PLATE_R), bottom, PLATE_H, P)}"/>`,
  ];
  const feet = [0, 1, 2].map((i) =>
    polar(PLATE_R - 26, (i * 2 * Math.PI) / 3 + 0.7),
  );
  for (const [x, y] of byDepth(feet, P)) {
    out.push(solid(k.cylinder(x, y, 7, bottom, FOOT_H, P, 24), { tone: "lo" }));
  }
  out.push(
    solid(k.cylinder(0, 0, PLATE_R, -PLATE_H, PLATE_H, P, 72, 1.6), {
      tone: "mid",
    }),
    line(k.ring(0, 0, PLATE_R - 6, 0, P, 72), { tone: "lo" }),
    line(ticks.minor, { tone: "faint" }),
    line(ticks.major, { tone: "lo" }),
    line(k.ring(0, 0, RING_R, 0, P, 72), { tone: "mid", dotted: true }),
    screws(
      [0, 1, 2, 3].map((i) =>
        polar(PLATE_R - 12, (i * Math.PI) / 2 + Math.PI / 4),
      ),
      0,
      P,
    ),
  );
  return out.join("");
}

/** A lead lying on the plate from radius r0 to r1 along `angle`. */
function lead(angle, r0, r1, z1, from = [0, 0]) {
  const [ux, uy] = [Math.cos(angle), Math.sin(angle)];
  const a = [from[0] + ux * r0, from[1] + uy * r0, 1.2];
  const b = [from[0] + ux * r1, from[1] + uy * r1, z1];
  return k.wireSvg(at(a), at(b), {
    via: [at([b[0] - ux * 3, b[1] - uy * 3, 0.8])],
    tone: "mid",
    size: 1,
  });
}

function hub() {
  const top = HUB_H;
  const out = [
    halo([0, 0], HUB_R + 4),
    solid(k.cylinder(0, 0, HUB_R + 3, 0, 4, P, 48), { tone: "lo" }),
    solid(k.cylinder(0, 0, HUB_R, 4, top - 4, P, 48, 0.8), { tone: "mid" }),
    line(k.knurl(0, 0, HUB_R, 8, top - 3, 56, P), { tone: "lo" }),
    line(k.ring(0, 0, HUB_R - 4, top, P, 48), { tone: "faint" }),
  ];
  for (const angle of ANGLES) {
    out.push(jack(polar(HUB_R - 9, angle), top, P));
  }
  out.push(lamp([0, 0], top, P, { lit: true, radius: 4.4 }));
  return out.join("");
}

/** A satellite puck with a collar, a ring on its face and an unlit lamp. */
function puck([x, y], r, h) {
  const cap = r * 0.55;
  return [
    halo([x, y], r + 2),
    solid(k.cylinder(x, y, r + 1.5, 0, 2.5, P, 32), { tone: "lo" }),
    solid(k.cylinder(x, y, r, 2.5, h - 4.5, P, 32, 0.6), { tone: "mid" }),
    line(k.sideArc(x, y, r, h * 0.45, P, 20), { tone: "faint" }),
    line(k.ring(x, y, r - 2.5, h - 2, P, 24), { tone: "lo" }),
    solid(k.cylinder(x, y, cap, h - 2, 2, P, 20), { tone: "mid" }),
    line(k.knurl(x, y, cap, h - 2, h, 24, P, 0.3), { tone: "lo" }),
    lamp([x, y], h, P, { radius: Math.max(1.6, r * 0.16) }),
    dots([at([x + r - 1.3, y, h - 2])], { size: 0.45 }),
  ].join("");
}

export function figure() {
  const satellites = ANGLES.map((angle) => polar(RING_R, angle));
  const delegator = satellites[DELEGATE];
  const sub = polar(SUB_RING, ANGLES[DELEGATE] + 0.42);
  const subAngle = Math.atan2(sub[1] - delegator[1], sub[0] - delegator[0]);
  const subDistance = Math.hypot(sub[0] - delegator[0], sub[1] - delegator[1]);
  const standing = byDepth(
    [
      [0, 0, hub],
      ...satellites.map(([x, y]) => [x, y, () => puck([x, y], SAT_R, SAT_H)]),
      [sub[0], sub[1], () => puck(sub, SUB_R, SUB_H)],
    ],
    P,
  );
  return {
    label:
      "A round turntable with a central hub puck, its lamp lit, cabled to five satellite pucks on a dotted ring; one satellite is cabled onward to a smaller puck.",
    body: [
      turntable(),
      ...ANGLES.map((angle) => lead(angle, HUB_R + 2, RING_R - SAT_R - 1, 3)),
      lead(subAngle, SAT_R + 1, subDistance - SUB_R - 1, 2.5, delegator),
      ...standing.map(([, , draw]) => draw()),
    ],
  };
}
