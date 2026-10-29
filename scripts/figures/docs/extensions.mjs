/*
 * "Extensions": panels, commands and hooks contributed into Ryu's surfaces,
 * drawn as an upright modular pegboard. Screen panels, key blocks and peg
 * hooks sit in its sockets; one module (the lit part) is caught snapping into
 * its empty socket.
 */

import { byDepth, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const BASE = { x: -116, y: -24, w: 232, d: 46, r: 6 };
const BASE_H = 7;
const BOARD = { x: -106, y: -7, w: 212, d: 7, r: 1.5 };
const BOARD_H = 88;
const FACE = BOARD.y + BOARD.d;
const MOD_D = 7;
const SNAP = 18;
const HOLE_STEP = 8;
const HOOK_REACH = 20;

/** Modules on the board face: x, width, bottom z, height and what they carry. */
const MODULES = [
  { x: -96, w: 92, z: 54, h: 32, kind: "panel" },
  { x: 2, w: 58, z: 54, h: 32, kind: "keys" },
  { x: 66, w: 30, z: 54, h: 32, kind: "hook" },
  { x: -96, w: 56, z: 16, h: 32, kind: "socket" },
  { x: -34, w: 30, z: 16, h: 32, kind: "hook" },
  { x: 2, w: 52, z: 16, h: 32, kind: "slider" },
  { x: 60, w: 36, z: 16, h: 32, kind: "panel" },
];
const SNAPPING = 3;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -4, BASE_H),
    ...k.boxCorners(BOARD, BASE_H, BASE_H + BOARD_H),
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the vertical face `y` between x0..x1 and z0..z1. */
const faceRect = (x0, x1, z0, z1, y) =>
  k.pathOf(
    [
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ].map(at),
    true,
  );

function stand() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -4, 4, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 12), P)) {
    out.push(solid(k.cylinder(x, y, 4.5, -4, 4, P, 24), { tone: "lo" }));
  }
  out.push(
    solid(k.slabOf(BASE, 0, BASE_H, P, 6, 1), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(BASE, 4), BASE_H, P, 4), { tone: "faint" }),
    screws(k.corners(BASE, 7), BASE_H, P, 1.2),
  );
  return out.join("");
}

function board() {
  const z0 = BASE_H;
  const z1 = BASE_H + BOARD_H;
  const holes = [];
  for (let x = BOARD.x + 8; x < BOARD.x + BOARD.w - 4; x += HOLE_STEP) {
    for (let z = z0 + 8; z < z1 - 4; z += HOLE_STEP) {
      holes.push(at([x, FACE, z]));
    }
  }
  return [
    solid(k.slabOf(BOARD, z0, BOARD_H, P, 2, 0.4), { tone: "mid" }),
    line(faceRect(BOARD.x + 3, BOARD.x + BOARD.w - 3, z0 + 3, z1 - 3, FACE), {
      tone: "faint",
    }),
    dots(holes, { size: 0.55, tone: "lo" }),
  ].join("");
}

const horizontal = (x0, x1, z, y, tone = "faint") =>
  line(k.segment([x0, y, z], [x1, y, z], P), { tone, free: true });

/** The face detail of one module, drawn on its front at `y`. */
function faceDetail(m, y, z) {
  const top = z + m.h;
  const x1 = m.x + m.w;
  switch (m.kind) {
    case "panel":
      return [
        line(faceRect(m.x + 4, x1 - 4, z + 4, top - 4, y), { tone: "lo" }),
        horizontal(m.x + 9, m.x + m.w * 0.45, top - 10, y, "mid"),
        horizontal(m.x + 9, x1 - 12, top - 15, y),
        horizontal(m.x + 9, x1 - 18, top - 20, y),
      ].join("");
    case "keys": {
      const keys = [];
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 2; r++) {
          const kx = m.x + 5 + c * ((m.w - 10) / 4);
          const kz = z + 4 + r * ((m.h - 8) / 2);
          keys.push(
            faceRect(
              kx + 1,
              kx + (m.w - 10) / 4 - 1,
              kz + 1,
              kz + (m.h - 8) / 2 - 1,
              y,
            ),
          );
        }
      }
      return line(keys.join(""), { tone: "lo" });
    }
    case "slider":
      return [
        horizontal(m.x + 6, x1 - 6, z + m.h / 2, y, "lo"),
        solid(
          k.slabOf(
            { x: m.x + 14, y, w: 6, d: 2.4, r: 0.6 },
            z + m.h / 2 - 5,
            10,
            P,
            2,
          ),
          { tone: "mid", crease: "lo" },
        ),
      ].join("");
    default:
      return line(faceRect(m.x + 4, x1 - 4, z + 4, top - 4, y), {
        tone: "faint",
      });
  }
}

/** A peg hook out of a hook module's face: a rod with an upturned tip. */
function pegHook(m) {
  const x = m.x + m.w / 2 - 1.2;
  const z = m.z + 9;
  const y = FACE + MOD_D;
  const style = { tone: "mid", crease: "lo" };
  return [
    line(faceRect(x - 3, x + 5.4, z - 3, z + 5.4, y), { tone: "lo" }),
    solid(
      k.slabOf({ x, y, w: 2.4, d: HOOK_REACH, r: 0.8 }, z, 2.4, P, 2),
      style,
    ),
    solid(
      k.slabOf(
        { x, y: y + HOOK_REACH - 2.4, w: 2.4, d: 2.4, r: 0.8 },
        z + 2.4,
        6,
        P,
        2,
      ),
      style,
    ),
  ].join("");
}

/** One module seated on the face, or pulled out by `out` when snapping in. */
function module(m, out = 0, lit = false) {
  const y = FACE + out;
  const plan = { x: m.x, y, w: m.w, d: MOD_D, r: 1.2 };
  const parts = [
    solid(k.slabOf(plan, m.z, m.h, P, 3, 0.5), {
      tone: lit ? "hi" : "mid",
      lit,
      crease: "lo",
    }),
    faceDetail(m, y + MOD_D, m.z),
    dots(
      [
        at([m.x + 2.2, y + MOD_D, m.z + m.h - 2.2]),
        at([m.x + m.w - 2.2, y + MOD_D, m.z + m.h - 2.2]),
        at([m.x + 2.2, y + MOD_D, m.z + 2.2]),
        at([m.x + m.w - 2.2, y + MOD_D, m.z + 2.2]),
      ],
      { size: 0.45 },
    ),
  ];
  if (m.kind === "hook") {
    parts.push(pegHook(m));
  }
  return parts.join("");
}

/** The empty socket and dotted guides for the module snapping in. */
function socket(m) {
  const pins = [];
  for (let i = 0; i < 5; i++) {
    pins.push(at([m.x + 8 + i * ((m.w - 16) / 4), FACE, m.z + m.h / 2]));
  }
  const guides = [
    [m.x, m.z],
    [m.x, m.z + m.h],
    [m.x + m.w, m.z + m.h],
  ].map(([gx, gz]) =>
    line(k.segment([gx, FACE + 0.5, gz], [gx, FACE + SNAP, gz], P), {
      tone: "mid",
      dotted: true,
    }),
  );
  return [
    line(faceRect(m.x, m.x + m.w, m.z, m.z + m.h, FACE), { tone: "lo" }),
    line(faceRect(m.x + 2, m.x + m.w - 2, m.z + 2, m.z + m.h - 2, FACE), {
      tone: "faint",
    }),
    dots(pins, { size: 0.8, tone: "hi" }),
    ...guides,
  ].join("");
}

export function figure() {
  const parts = MODULES.map((m, i) => {
    const draw =
      i === SNAPPING
        ? () => socket(m) + module(m, SNAP, true)
        : () => module(m);
    return [m.x + m.w / 2, FACE + MOD_D, draw, m.z];
  });
  const ordered = [...parts].sort(
    (a, b) =>
      k.depthOf([a[0], a[1], a[3]], P) - k.depthOf([b[0], b[1], b[3]], P),
  );
  return {
    label:
      "An upright modular pegboard on a stand: screen panels, key blocks, a slider and peg hooks sit in its sockets, and one lit module is caught snapping into an empty socket.",
    body: [stand(), board(), ...ordered.map(([, , draw]) => draw())],
  };
}
