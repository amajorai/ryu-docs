/*
 * "Sandbox": work runs sealed off from the host, drawn as a glovebox. A
 * glass-walled enclosure on a bench plate holds one lit block (the isolated
 * workload) behind glove ports, a pass-through airlock and a latched hinged
 * hatch; nothing reaches the block except through those sealed openings.
 */

import { benchPlate, byDepth, dots, k, lamp, line, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -118, y: -86, w: 236, d: 168, r: 8 };
const BOX = { x: -86, y: -60, w: 150, d: 96, r: 3 };
const BASE_H = 10;
const TOP = 66;
const POST = 4;
const HATCH = { x: BOX.x + 6, y: BOX.y + 4, w: BOX.w - 12, d: 34, r: 2 };
const LOCK = { x: BOX.x + BOX.w, y: -26, w: 30, d: 36, r: 2 };
const LOCK_H = 34;
const BLOCK = { x: -40, y: 0, w: 30, d: 26, r: 2 };
const BLOCK_H = 16;
const PORTS = [-64, 42];
const PORT_Z = 34;
const PORT_R = 12;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [BOX.x, BOX.y, TOP + 10]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const front = BOX.y + BOX.d;
const flank = BOX.x + BOX.w;

/** A glass pane between four world corners: a faint tint and two glints. */
function pane(corners, glints) {
  const d = k.pathOf(corners.map(at), true);
  const out = [
    `<path class="iso-shade" data-shade="3" style="fill-opacity:.35" d="${d}"/>`,
    line(d, { tone: "faint" }),
  ];
  for (const glint of glints) {
    out.push(line(k.pathOf(glint.map(at)), { tone: "lo", free: true }));
  }
  return out.join("");
}

const post = (x, y) =>
  solid(
    k.slabOf({ x, y, w: POST, d: POST, r: 0.6 }, BASE_H, TOP - BASE_H, P, 2),
    {
      tone: "mid",
    },
  );

function base() {
  return [
    `<path class="iso-halo" d="${k.haloOf(BOX, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    solid(k.slabOf(BOX, 0, BASE_H, P, 4, 0.8), { tone: "mid" }),
    line(k.sideSeam(BOX, 4, P, 4), { tone: "faint" }),
    dots(k.dotGrid(BOX.x + 10, BOX.y + 10, 14, 8, 10, BASE_H, P), {
      size: 0.4,
      tone: "lo",
    }),
  ].join("");
}

/** The workload: a lit block on a low turntable in the middle of the floor. */
function workload() {
  const cx = BLOCK.x + BLOCK.w / 2;
  const cy = BLOCK.y + BLOCK.d / 2;
  const top = BASE_H + 3 + BLOCK_H;
  return [
    solid(k.cylinder(cx, cy, 22, BASE_H, 3, P, 48, 0.4), { tone: "lo" }),
    line(k.ring(cx, cy, 18.5, BASE_H + 3, P, 48), { tone: "faint" }),
    solid(k.slabOf(BLOCK, BASE_H + 3, BLOCK_H, P, 4, 0.8), {
      tone: "hi",
      lit: true,
      crease: "lo",
    }),
    line(k.planOutline(k.insetPlan(BLOCK, 4), top, P, 3), { tone: "lo" }),
    line(k.sideSeam(BLOCK, BASE_H + 9, P, 4), { tone: "faint" }),
  ].join("");
}

/** The front pane with two round glove ports and their clamp rings. */
function glovePorts() {
  const out = [];
  for (const x of PORTS) {
    const centre = [x, front, PORT_Z];
    out.push(
      line(k.sideRing(centre, PORT_R + 3, "y", P, 40), { tone: "mid" }),
      line(k.sideRing(centre, PORT_R, "y", P, 40), { tone: "lo" }),
      line(k.sideRing([x, front - 8, PORT_Z - 1], PORT_R - 2, "y", P, 32), {
        tone: "faint",
      }),
      dots(
        [0, 1, 2, 3].map((i) => {
          const a = Math.PI / 4 + (i * Math.PI) / 2;
          return at([
            x + Math.cos(a) * (PORT_R + 1.5),
            front,
            PORT_Z + Math.sin(a) * (PORT_R + 1.5),
          ]);
        }),
        { size: 0.5 },
      ),
    );
  }
  return out.join("");
}

/** The airlock on the right flank: a small chamber with its own door. */
function airlock() {
  const face = LOCK.x + LOCK.w;
  const out = [
    solid(k.slabOf(LOCK, BASE_H, LOCK_H, P, 3, 0.6), { tone: "mid" }),
    line(
      k.pathOf(
        [
          [face, LOCK.y + 5, BASE_H + 5],
          [face, LOCK.y + LOCK.d - 5, BASE_H + 5],
          [face, LOCK.y + LOCK.d - 5, BASE_H + LOCK_H - 5],
          [face, LOCK.y + 5, BASE_H + LOCK_H - 5],
        ].map(at),
        true,
      ),
      { tone: "lo" },
    ),
  ];
  // A wheel latch on the airlock door.
  const hub = [face, LOCK.y + LOCK.d / 2, BASE_H + LOCK_H / 2];
  out.push(line(k.sideRing(hub, 6, "x", P, 28), { tone: "mid" }));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    out.push(
      line(
        k.segment(
          hub,
          [face, hub[1] + Math.cos(a) * 6, hub[2] + Math.sin(a) * 6],
          P,
        ),
        { tone: "mid" },
      ),
    );
  }
  out.push(lamp([LOCK.x + LOCK.w / 2, LOCK.y + 9], BASE_H + LOCK_H, P));
  return out.join("");
}

/** The hatch on the roof: a slab on two hinge knuckles with a pull handle. */
function hatch() {
  const z = TOP;
  const out = [
    solid(k.slabOf(HATCH, z, 3, P, 4, 0.5), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(HATCH, 3), z + 3, P, 3), { tone: "faint" }),
  ];
  for (const x of [HATCH.x + 18, HATCH.x + HATCH.w - 30]) {
    out.push(
      solid(
        k.slabOf({ x, y: HATCH.y - 3, w: 12, d: 5, r: 2.4 }, z + 1, 4, P, 4),
        {
          tone: "mid",
        },
      ),
    );
  }
  const handle = {
    x: HATCH.x + HATCH.w / 2 - 14,
    y: HATCH.y + HATCH.d - 8,
    w: 28,
    d: 4,
    r: 2,
  };
  out.push(solid(k.slabOf(handle, z + 3, 3, P, 3), { tone: "mid" }));
  // Filter vents on the hatch.
  for (const x of [HATCH.x + 14, HATCH.x + HATCH.w - 14]) {
    out.push(
      line(k.ring(x, HATCH.y + 16, 6, z + 3, P, 32), { tone: "lo" }),
      dots(k.dotGrid(x - 3, HATCH.y + 13, 3, 3, 3, z + 3, P), {
        size: 0.35,
        tone: "lo",
      }),
    );
  }
  return out.join("");
}

function frame() {
  const back = [
    [BOX.x, BOX.y],
    [flank - POST, BOX.y],
    [BOX.x, front - POST],
  ];
  return byDepth(back, P).map(([x, y]) => post(x, y));
}

function topRim() {
  const rim = (plan) =>
    solid(k.slabOf(plan, TOP - 3, 3, P, 2), { tone: "mid", crease: "lo" });
  return [
    rim({ x: BOX.x, y: BOX.y, w: BOX.w, d: POST + 2, r: 0.6 }),
    rim({ x: BOX.x, y: BOX.y, w: POST + 2, d: BOX.d, r: 0.6 }),
    rim({ x: flank - POST - 2, y: BOX.y, w: POST + 2, d: BOX.d, r: 0.6 }),
    rim({ x: BOX.x, y: front - POST - 2, w: BOX.w, d: POST + 2, r: 0.6 }),
  ].join("");
}

export function figure() {
  const z0 = BASE_H;
  const glint = (from, to) => [from, to];
  return {
    label:
      "A glass-walled glovebox on a bench plate: a lit block sits sealed inside behind two glove ports, with an airlock on its flank and a latched hatch on its roof.",
    body: [
      benchPlate(PLATE, P),
      base(),
      ...frame(),
      workload(),
      pane(
        [
          [BOX.x, BOX.y, TOP],
          [flank, BOX.y, TOP],
          [flank, front, TOP],
          [BOX.x, front, TOP],
        ],
        [],
      ),
      pane(
        [
          [flank, BOX.y, z0],
          [flank, front, z0],
          [flank, front, TOP],
          [flank, BOX.y, TOP],
        ],
        [
          glint([flank, BOX.y + 6, z0 + 26], [flank, BOX.y + 22, z0 + 50]),
          glint([flank, BOX.y + 6, z0 + 16], [flank, BOX.y + 26, z0 + 46]),
        ],
      ),
      airlock(),
      pane(
        [
          [BOX.x, front, z0],
          [flank, front, z0],
          [flank, front, TOP],
          [BOX.x, front, TOP],
        ],
        [
          glint([BOX.x + 52, front, z0 + 22], [BOX.x + 68, front, z0 + 46]),
          glint([BOX.x + 56, front, z0 + 12], [BOX.x + 76, front, z0 + 42]),
        ],
      ),
      glovePorts(),
      post(flank - POST, front - POST),
      topRim(),
      hatch(),
    ],
  };
}
