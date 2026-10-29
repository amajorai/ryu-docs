/*
 * "Secret vault": credentials kept behind one locked door and handed out one
 * at a time, drawn as a key cabinet. A shallow cabinet on a plinth has its door
 * swung wide on barrel hinges, showing rows of hooks with a key on each; one
 * key (the lit part) is lifted off its hook toward the reader.
 */

import { benchPlate, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -40, y: -74, w: 100, d: 138, r: 8 };
const PLINTH = { x: -28, y: -58, w: 30, d: 116, r: 3 };
const PLINTH_H = 6;
const BOX = { back: -24, front: -4, y0: -54, y1: 54 };
const TOP = PLINTH_H + 118;
const WALL = 4;
const HOOK_Y = [-36, -14, 8, 30];
const HOOK_Z = [TOP - 22, TOP - 54, TOP - 86];
const HOOK_LEN = 7;
const EMPTY = [1, 2];
const TAKEN = [1, 1];
const LIFT = 30;
const DOOR_T = 3;
const DOOR_W = BOX.y1 - BOX.y0;
const OPEN = (112 * Math.PI) / 180;

const BACK_FACE = BOX.back + WALL;
const KEY_X = BACK_FACE + 3;
const HINGE = [BOX.front + 1.5, BOX.y0 - 1.5];
const along = [Math.sin(OPEN), Math.cos(OPEN)];
const inward = [-Math.cos(OPEN), Math.sin(OPEN)];
const doorAt = (u, v = 0) => [
  HINGE[0] + along[0] * u - inward[0] * v,
  HINGE[1] + along[1] * u - inward[1] * v,
];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [BOX.back, BOX.y0, TOP],
    [BOX.back, BOX.y1, TOP],
    [...doorAt(DOOR_W), TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const { cosA } = k.cameraOf(P);
const shadeOf = (ny) =>
  Math.min(3, Math.max(0, Math.floor(((1 + ny * cosA) / 2) * 4)));

/** A profile of [y, z] pairs swept along x from x0 to x1 (cf. security.mjs). */
function prismX(profile, x0, x1, { tone = "mid", lit = false } = {}) {
  const count = profile.length;
  let area = 0;
  for (let i = 0; i < count; i++) {
    const [ay, az] = profile[i];
    const [by, bz] = profile[(i + 1) % count];
    area += ay * bz - by * az;
  }
  const sign = area > 0 ? 1 : -1;
  const point = ([y, z], x) => at([x, y, z]);
  const faces = [];
  for (let i = 0; i < count; i++) {
    const a = profile[i];
    const b = profile[(i + 1) % count];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ny = (sign * (b[1] - a[1])) / length;
    const nz = (-sign * (b[0] - a[0])) / length;
    if (k.depthOf([0, ny, nz], P) <= 1e-6) {
      continue;
    }
    const paint =
      nz > 0.55
        ? 'class="iso-top"'
        : `class="iso-shade" data-shade="${shadeOf(ny)}"`;
    const quad = k.pathOf(
      [point(a, x0), point(b, x0), point(b, x1), point(a, x1)],
      true,
    );
    faces.push({
      depth: k.depthOf([x0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2], P),
      svg: `<path ${paint} d="${quad}"/>`,
    });
  }
  const front = k.pathOf(
    profile.map((v) => point(v, x1)),
    true,
  );
  const body = faces
    .sort((a, b) => a.depth - b.depth)
    .map((face) => face.svg)
    .join("");
  return `<g class="iso-solid" data-seamless=""${lit ? ' data-lit=""' : ""}>${body}<path class="iso-shade" data-shade="3" d="${front}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${front}"/></g>`;
}

const box = (x0, x1, y0, y1, z0, z1) =>
  k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.6 }, z0, z1 - z0, P, 2);

/** A circle of [y, z] points. */
const disc = (cy, cz, r, steps = 16) =>
  Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [cy + r * Math.cos(a), cz + r * Math.sin(a)];
  });

/** A key hanging with its bow around a hook at (y, z), set at depth x. */
function key([y, z], x, { lit = false, variant = 0 } = {}) {
  const tone = lit ? "hi" : "mid";
  const bow = 4.6;
  const cz = z - 1.6;
  const stem = cz - bow + 0.6;
  const tip = stem - 16 - variant * 2;
  const shank = [
    [y - 1.1, stem],
    [y + 1.1, stem],
    [y + 1.1, tip],
    [y - 4.2, tip],
    [y - 4.2, tip + 2.6],
    [y - 2.6, tip + 2.6],
    [y - 2.6, tip + 4.4],
    [y - 4.2, tip + 4.4],
    [y - 4.2, tip + 7],
    [y - 1.1, tip + 7],
  ];
  return [
    prismX(shank, x, x + 1.2, { tone, lit }),
    prismX(disc(y, cz, bow), x, x + 1.4, { tone, lit }),
    line(k.sideRing([x + 1.4, y, cz + 1.6], 1.4, "x", P, 12), { tone: "lo" }),
  ].join("");
}

/** A hook: a short rod off the back panel with an upturned tip. */
function hook([y, z]) {
  const end = BACK_FACE + HOOK_LEN;
  return [
    solid(box(BACK_FACE, end, y - 0.9, y + 0.9, z, z + 1.8), { tone: "lo" }),
    solid(box(end - 1.8, end, y - 0.9, y + 0.9, z + 1.8, z + 4), {
      tone: "lo",
    }),
  ].join("");
}

function interior() {
  const out = [];
  for (const [row, z] of HOOK_Z.entries()) {
    out.push(
      line(
        k.segment(
          [BACK_FACE, BOX.y0 + WALL + 5, z + 8],
          [BACK_FACE, BOX.y1 - WALL - 5, z + 8],
          P,
        ),
        { tone: "faint" },
      ),
    );
    for (const [column, y] of HOOK_Y.entries()) {
      const empty = EMPTY[0] === row && EMPTY[1] === column;
      const taken = TAKEN[0] === row && TAKEN[1] === column;
      if (!(empty || taken)) {
        out.push(key([y, z + 1.8], KEY_X, { variant: (row + column) % 3 }));
      }
      out.push(hook([y, z]));
    }
  }
  return out.join("");
}

function cabinet() {
  const { back, front, y0, y1 } = BOX;
  const floor = PLINTH_H + WALL;
  return [
    `<path class="iso-halo" d="${k.haloOf(PLINTH, 0, 2, P)}"/>`,
    solid(k.slabOf(PLINTH, 0, PLINTH_H, P, 4, 0.6), { tone: "lo" }),
    solid(box(back, BACK_FACE, y0, y1, PLINTH_H, TOP), { tone: "mid" }),
    solid(box(BACK_FACE, front, y0, y1, PLINTH_H, floor), { tone: "mid" }),
    solid(box(BACK_FACE, front, y0, y0 + WALL, floor, TOP - WALL), {
      tone: "mid",
    }),
    interior(),
    solid(box(BACK_FACE, front, y1 - WALL, y1, floor, TOP - WALL), {
      tone: "mid",
    }),
    solid(box(back, front, y0, y1, TOP - WALL, TOP), { tone: "mid" }),
    line(
      k.planOutline(
        { x: back + 4, y: y0 + 4, w: front - back - 8, d: y1 - y0 - 8, r: 1 },
        TOP,
        P,
        2,
      ),
      { tone: "faint" },
    ),
    screws(
      k.corners({ x: back, y: y0, w: front - back, d: y1 - y0 }, 3),
      TOP,
      P,
      1.1,
    ),
    // Strike plate on the far wall, where the door's bolt meets it.
    solid(box(front, front + 0.8, y1 - WALL + 0.6, y1 - 0.6, 52, 68), {
      tone: "lo",
    }),
  ].join("");
}

function door() {
  const z0 = PLINTH_H + 1;
  const z1 = TOP - 1;
  const ring = [
    doorAt(0),
    doorAt(DOOR_W),
    doorAt(DOOR_W, DOOR_T),
    doorAt(0, DOOR_T),
  ];
  const onFace = (u, z) => at([...doorAt(u), z]);
  const panel = (u0, u1, za, zb) =>
    k.pathOf(
      [onFace(u0, za), onFace(u1, za), onFace(u1, zb), onFace(u0, zb)],
      true,
    );
  const rules = [];
  for (let i = 0; i < 7; i++) {
    const z = TOP - 30 - i * 7;
    rules.push(k.pathOf([onFace(26, z), onFace(i % 3 ? 82 : 70, z)]));
  }
  const knuckles = [TOP - 28, PLINTH_H + 16].map((z) =>
    solid(k.cylinder(HINGE[0], HINGE[1], 2, z, 14, P, 14), { tone: "mid" }),
  );
  const bolt = [...doorAt(DOOR_W - 8), 66];
  return [
    solid(k.extrude(ring, z0, z1 - z0, P), { tone: "mid" }),
    ...knuckles,
    line(panel(7, DOOR_W - 7, z0 + 7, z1 - 7), { tone: "faint" }),
    line(panel(18, DOOR_W - 18, TOP - 22, TOP - 80), { tone: "lo" }),
    line(rules.join(""), { tone: "faint" }),
    line(k.ring(bolt[0], bolt[1], 3.6, bolt[2], P, 20), { tone: "lo" }),
    line(k.segment(bolt, [bolt[0], bolt[1], bolt[2] - 14], P), {
      tone: "mid",
    }),
    dots([at(bolt)], { size: 0.6, tone: "mid" }),
  ].join("");
}

/** The key lifted off its hook and out of the cabinet toward the reader. */
function takenKey() {
  const y = HOOK_Y[TAKEN[1]];
  const z = HOOK_Z[TAKEN[0]] + 1.8;
  const x = BOX.front + LIFT;
  return [
    line(k.segment([BACK_FACE + HOOK_LEN, y, z], [x, y, z], P), {
      tone: "lo",
      dotted: true,
    }),
    key([y, z], x, { lit: true }),
  ].join("");
}

export function figure() {
  return {
    label:
      "A key cabinet on a bench plate with its door swung wide, rows of hooks holding keys, and one lit key lifted off its hook toward the viewer.",
    body: [benchPlate(PLATE, P), cabinet(), door(), takenKey()],
  };
}
