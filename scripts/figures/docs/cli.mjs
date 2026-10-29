/*
 * "CLI": Ryu from the terminal, drawn as a monolith terminal on a bench plate.
 * Its recessed screen shows prompt lines with a raised cursor block (the lit
 * part); a mechanical keyboard sits in front on a coiled cable, and a punched
 * paper tape (the session log) runs out of the tower's side.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -112, y: -88, w: 152, d: 204, r: 8 };
const TOWER = { x: -98, y: -74, w: 34, d: 112, r: 4 };
const TOWER_H = 86;
const KEYBOARD = { x: -36, y: -44, w: 56, d: 116, r: 4 };
const CASE_H = 6;
const CAP = 8.4;
const CAP_GAP = 1.8;
const CAP_H = 3;
const ROWS = 4;
const CABLE_Y = -22;
// A punched paper tape fed out of a slot in the tower's side, the session log.
const TAPE = { x: -90, y: TOWER.y + TOWER.d, w: 18, d: 66, r: 1 };
const TAPE_T = 0.5;
const HOLE_GAP = 4.4;
// Data holes per tape row: offsets across the tape, a readable bit pattern.
const PUNCHES = [
  [4, 13],
  [9],
  [4, 9, 13],
  [13],
  [4],
  [9, 13],
  [4, 9],
  [],
  [4, 13],
  [9, 13],
  [4, 9, 13],
  [9],
  [4],
];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [TOWER.x, TOWER.y, TOWER_H + 4],
    [TOWER.x, TOWER.y + TOWER.d, TOWER_H + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(5px)"/>`;

// The screen faces +x; on that face the viewer's left is +y, so lines start
// at the larger y and run toward the smaller.
const FACE = TOWER.x + TOWER.w;
const LEFT = TOWER.y + TOWER.d - 12;
const RIGHT = TOWER.y + 12;
const BOTTOM = 22;
const TOP = TOWER_H - 10;
const ROW = 7.5;

/** A closed outline on the vertical face `x` between y0..y1 and z0..z1. */
const faceRect = (y0, y1, z0, z1, x = FACE) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );
const faceLine = (y0, y1, z, tone = "faint") =>
  line(k.segment([FACE, y0, z], [FACE, y1, z], P), { tone, free: true });

/** A prompt chevron at the left margin of a screen row. */
const chevron = (z) =>
  line(
    k.pathOf(
      [
        [FACE, LEFT - 5, z + 2.4],
        [FACE, LEFT - 8.5, z],
        [FACE, LEFT - 5, z - 2.4],
      ].map(at),
    ),
    { tone: "mid", free: true },
  );

function tower() {
  const out = [
    halo(TOWER),
    solid(k.slabOf(TOWER, 0, TOWER_H, P, 5, 1), { tone: "mid" }),
    line(k.sideSeam(TOWER, 10, P, 5), { tone: "faint" }),
    line(faceRect(LEFT + 4, RIGHT - 4, BOTTOM - 4, TOP + 4), { tone: "lo" }),
    line(faceRect(LEFT, RIGHT, BOTTOM, TOP), { tone: "lo" }),
  ];
  // Rows: prompt, output, output, prompt, output, then the live prompt.
  const rows = [
    ["prompt", 46],
    ["out", 70],
    ["out", 54],
    ["prompt", 34],
    ["out", 62],
    ["out", 40],
  ];
  for (const [i, [kind, width]] of rows.entries()) {
    const z = TOP - 7 - i * ROW;
    if (kind === "prompt") {
      out.push(chevron(z), faceLine(LEFT - 12, LEFT - 12 - width, z, "mid"));
    } else {
      out.push(faceLine(LEFT - 5, LEFT - 5 - width, z, "lo"));
    }
  }
  out.push(chevron(liveRow()));
  // Vent slots and a status lamp on the lid.
  for (let i = 0; i < 7; i++) {
    const y = TOWER.y + 14 + i * 4;
    out.push(
      line(
        k.lineOnTop([TOWER.x + 9, y], [TOWER.x + TOWER.w - 9, y], TOWER_H, P),
        {
          tone: "lo",
        },
      ),
    );
  }
  out.push(lamp([TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d - 12], TOWER_H, P));
  out.push(screws(k.corners(TOWER, 4), TOWER_H, P, 1.2));
  out.push(dots([at([FACE, LEFT + 2, BOTTOM - 8])], { size: 0.7 }));
  return out.join("");
}

const liveRow = () => TOP - 7 - 6 * ROW;

/** The cursor block on the live prompt, raised off the glass: the lit part. */
function cursor() {
  const z = liveRow();
  const plan = { x: FACE, y: LEFT - 19, w: 1.8, d: 6, r: 0.3 };
  return solid(k.slabOf(plan, z - 2.2, 4.4, P, 2, 0.2), {
    tone: "hi",
    lit: true,
  });
}

/** The paper tape: a slot in the tower's side and a punched strip on the plate. */
function tape() {
  const side = TOWER.y + TOWER.d;
  const slot = [TAPE.x - 1, TAPE.x + TAPE.w + 1];
  const out = [
    line(k.segment([slot[0], side, 7], [slot[1], side, 7], P), {
      tone: "lo",
      free: true,
    }),
    solid(k.slabOf({ ...TAPE, y: side - 2, d: TAPE.d + 2 }, 0, TAPE_T, P, 2), {
      tone: "lo",
      crease: "none",
    }),
  ];
  const feed = [];
  const data = [];
  for (const [i, row] of PUNCHES.entries()) {
    const y = side + 4 + i * HOLE_GAP;
    feed.push(at([TAPE.x + 6.5, y, TAPE_T]));
    for (const offset of row) {
      data.push(at([TAPE.x + offset, y, TAPE_T]));
    }
  }
  out.push(dots(feed, { size: 0.45, tone: "lo" }));
  out.push(dots(data, { size: 0.9, tone: "mid" }));
  return out.join("");
}

/** The coiled cable from the keyboard's back edge to the tower's foot. */
function coiledCable() {
  const from = FACE + 2;
  const to = KEYBOARD.x - 2;
  const spring = k.coil(from, to, [CABLE_Y, 3], 2.4, 7, "x", P, 14);
  return [
    line(spring.back, { tone: "lo" }),
    solid(
      k.slabOf({ x: FACE, y: CABLE_Y - 2, w: 3, d: 4, r: 1 }, 1.5, 3, P, 2),
      { tone: "lo" },
    ),
    line(spring.front, { tone: "mid" }),
  ].join("");
}

function keycap(x, y, depth) {
  const plan = { x, y, w: CAP, d: depth, r: 1.2 };
  return solid(k.slabOf(plan, CASE_H, CAP_H, P, 2, 0.6), { tone: "mid" });
}

function keyboard() {
  const out = [
    halo(KEYBOARD),
    solid(k.slabOf(KEYBOARD, 0, CASE_H, P, 5, 0.8), { tone: "lo" }),
  ];
  const caps = [];
  const first = KEYBOARD.y + 6;
  const last = KEYBOARD.y + KEYBOARD.d - 6;
  for (let row = 0; row < ROWS; row++) {
    const x = KEYBOARD.x + 5 + row * (CAP + CAP_GAP);
    for (let y = first + (row % 2) * 3; y + CAP <= last; y += CAP + CAP_GAP) {
      caps.push([x + CAP / 2, y + CAP / 2, () => keycap(x, y, CAP)]);
    }
  }
  const spaceX = KEYBOARD.x + 5 + ROWS * (CAP + CAP_GAP);
  caps.push([
    spaceX + CAP / 2,
    KEYBOARD.y + KEYBOARD.d / 2,
    () => keycap(spaceX, KEYBOARD.y + 34, KEYBOARD.d - 68),
  ]);
  for (const [, , draw] of byDepth(caps, P)) {
    out.push(draw());
  }
  return out.join("");
}

export function figure() {
  return {
    label:
      "A monolith terminal on a bench plate: its screen shows prompt lines and a lit cursor block, with a mechanical keyboard on a coiled cable in front and a punched paper tape running out of its side.",
    body: [
      benchPlate(PLATE, P),
      tower(),
      cursor(),
      tape(),
      coiledCable(),
      keyboard(),
    ],
  };
}
