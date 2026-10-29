/*
 * "Desktop": the Ryu app on your own machine, drawn as a workstation on a
 * bench plate. A wide display shows the split window (sidebar, conversation,
 * and a side panel that is the lit part, lifted off the glass), with a keyboard
 * and a mouse on its pad in front.
 */

import { benchPlate, byDepth, dots, k, lamp, line, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -96, y: -112, w: 140, d: 214, r: 8 };
const BASE = { x: -84, y: -24, w: 30, d: 44, r: 4 };
const NECK = { x: -78, y: -8, w: 6, d: 12, r: 1.5 };
const SCREEN = { x: -66, y: -92, w: 4, d: 170, r: 2 };
const SCREEN_Z = 24;
const SCREEN_H = 92;
const KEYBOARD = { x: -36, y: -66, w: 36, d: 108, r: 3 };
const KEY = 5.4;
const PAD = { x: -40, y: 54, w: 46, d: 36, r: 3 };
const MOUSE = { x: -24, y: 66, w: 18, d: 11, r: 5.5 };
const MUG = [20, -78];
const MUG_R = 8;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [SCREEN.x, SCREEN.y, SCREEN_Z + SCREEN_H],
    [SCREEN.x, SCREEN.y + SCREEN.d, SCREEN_Z + SCREEN_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(5px)"/>`;

// The glass faces +x; on it the viewer's left is +y, so panes run from the
// larger y toward the smaller.
const FACE = SCREEN.x + SCREEN.w;
const LEFT = SCREEN.y + SCREEN.d - 4;
const RIGHT = SCREEN.y + 4;
const BOTTOM = SCREEN_Z + 4;
const TOP = SCREEN_Z + SCREEN_H - 4;
const BAR = TOP - 8;
const SIDEBAR = LEFT - 32;
const SPLIT = RIGHT + 54;

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
const faceLine = (y0, y1, z, tone = "faint", x = FACE) =>
  line(k.segment([x, y0, z], [x, y1, z], P), { tone, free: true });

function stand() {
  return [
    halo(BASE),
    solid(k.slabOf(BASE, 0, 3, P, 5, 0.6), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(BASE, 3), 3, P, 4), { tone: "faint" }),
    solid(k.slabOf(NECK, 3, SCREEN_Z + 16, P, 3, 0.4), { tone: "mid" }),
    solid(
      k.slabOf(
        { x: SCREEN.x - 6, y: SCREEN.y + 20, w: 6, d: SCREEN.d - 40, r: 3 },
        SCREEN_Z + 8,
        SCREEN_H - 16,
        P,
        4,
        0.6,
      ),
      { tone: "mid" },
    ),
  ].join("");
}

/** The display and its window: title bar, sidebar, conversation, panel. */
function display() {
  const out = [
    solid(k.slabOf(SCREEN, SCREEN_Z, SCREEN_H, P, 3, 0.6), { tone: "mid" }),
    line(faceRect(LEFT, RIGHT, BOTTOM, TOP), { tone: "lo" }),
    faceLine(LEFT, RIGHT, BAR, "lo"),
    dots(
      [0, 1, 2].map((i) => at([FACE, LEFT - 5 - i * 3.6, BAR + 4])),
      { size: 0.7 },
    ),
    line(k.segment([FACE, SIDEBAR, BOTTOM], [FACE, SIDEBAR, BAR], P), {
      tone: "lo",
    }),
    line(k.segment([FACE, SPLIT, BOTTOM], [FACE, SPLIT, BAR], P), {
      tone: "lo",
    }),
  ];
  // Sidebar rows, one of them selected.
  for (let i = 0; i < 7; i++) {
    const z = BAR - 8 - i * 7;
    out.push(faceLine(LEFT - 5, SIDEBAR + 6, z, i === 1 ? "mid" : "faint"));
  }
  // Conversation: alternating message blocks and a composer at the foot.
  const blocks = [
    [SIDEBAR - 34, SPLIT + 6, 10],
    [SIDEBAR - 6, SIDEBAR - 46, 14],
    [SIDEBAR - 30, SPLIT + 6, 8],
  ];
  let z = BAR - 6;
  for (const [from, to, height] of blocks) {
    out.push(
      line(faceRect(from, to, z - height, z), { tone: "faint" }),
      faceLine(from - 3, to + 8, z - 4),
    );
    z -= height + 6;
  }
  out.push(
    line(faceRect(SIDEBAR - 6, SPLIT + 6, BOTTOM + 4, BOTTOM + 11), {
      tone: "lo",
    }),
  );
  return out.join("");
}

/** The side panel, lifted a little off the glass: the lit part. */
function sidePanel() {
  const plan = { x: FACE, y: RIGHT + 4, w: 2, d: SPLIT - RIGHT - 8, r: 0.6 };
  const front = FACE + 2;
  const top = BAR - 4;
  const near = plan.y + plan.d;
  const out = [
    solid(k.slabOf(plan, BOTTOM + 4, top - BOTTOM - 4, P, 2, 0.3), {
      tone: "hi",
      lit: true,
    }),
    line(faceRect(near - 4, plan.y + 4, top - 22, top - 4, front), {
      tone: "mid",
    }),
  ];
  for (const [i, width] of [36, 28, 40, 22, 32].entries()) {
    out.push(
      faceLine(near - 4, near - 4 - width, top - 28 - i * 6, "lo", front),
    );
  }
  return out.join("");
}

function keyboard() {
  const out = [
    halo(KEYBOARD),
    solid(k.slabOf(KEYBOARD, 0, 3.5, P, 4, 0.6), { tone: "mid" }),
  ];
  const left = KEYBOARD.y + 5;
  const keys = [];
  for (let row = 0; row < 4; row++) {
    const x = KEYBOARD.x + 5 + row * (KEY + 1);
    for (
      let y = left + (row % 2) * 2;
      y < KEYBOARD.y + KEYBOARD.d - 10;
      y += KEY + 1
    ) {
      keys.push(k.planOutline({ x, y, w: KEY, d: KEY, r: 0.8 }, 3.5, P, 1));
    }
  }
  const space = KEYBOARD.x + 5 + 4 * (KEY + 1);
  keys.push(
    k.planOutline(
      { x: space, y: KEYBOARD.y + 30, w: KEY, d: KEYBOARD.d - 60, r: 0.8 },
      3.5,
      P,
      1,
    ),
  );
  out.push(line(keys.join(""), { tone: "lo" }));
  out.push(
    lamp([KEYBOARD.x + 4, KEYBOARD.y + KEYBOARD.d - 5], 3.5, P, {
      radius: 1.2,
    }),
  );
  return out.join("");
}

/** A mug with its handle on the near side. */
function mug() {
  const [x, y] = MUG;
  const handle = { x: x - 1.5, y: y + MUG_R - 1, w: 3, d: 6, r: 1.5 };
  return [
    halo({ x: x - MUG_R, y: y - MUG_R, w: MUG_R * 2, d: MUG_R * 2, r: MUG_R }),
    solid(k.cylinder(x, y, MUG_R, 0, 16, P, 36, 0.6), { tone: "mid" }),
    line(k.sideArc(x, y, MUG_R, 12, P, 20), { tone: "faint" }),
    line(k.ring(x, y, MUG_R - 1.4, 16, P, 36), { tone: "lo" }),
    solid(k.slabOf(handle, 4, 9, P, 2, 0.3), { tone: "mid" }),
    line(k.rise([x, y + MUG_R + 3, 0], 6, 11, P), { tone: "lo" }),
  ].join("");
}

function mouse() {
  return [
    halo(PAD),
    solid(k.slabOf(PAD, 0, 1, P, 3), { tone: "lo", crease: "none" }),
    solid(k.slabOf(MOUSE, 1, 4, P, 6, 1.4), { tone: "mid" }),
    line(
      k.lineOnTop(
        [MOUSE.x + 1.5, MOUSE.y + MOUSE.d / 2],
        [MOUSE.x + 7, MOUSE.y + MOUSE.d / 2],
        5,
        P,
      ),
      { tone: "lo" },
    ),
  ].join("");
}

export function figure() {
  const front = byDepth(
    [
      [KEYBOARD.x + KEYBOARD.w / 2, KEYBOARD.y + KEYBOARD.d / 2, keyboard],
      [PAD.x + PAD.w / 2, PAD.y + PAD.d / 2, mouse],
      [MUG[0], MUG[1], mug],
    ],
    P,
  );
  return {
    label:
      "A workstation on a bench plate: a wide display showing a split window with a sidebar, a conversation and a lit side panel, with a keyboard and a mouse in front.",
    body: [
      benchPlate(PLATE, P),
      stand(),
      display(),
      sidePanel(),
      ...front.map(([, , draw]) => draw()),
    ],
  };
}
