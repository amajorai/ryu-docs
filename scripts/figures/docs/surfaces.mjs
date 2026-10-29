/*
 * "Surfaces": every place Ryu runs, drawn as a two-step display riser. A
 * browser panel, a laptop and a phone (the lit part) stand on the back step,
 * a watch and a terminal puck on the front one, the same context on each.
 */

import { byDepth, dots, k, lamp, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 380;

const BASE = { x: -62, y: -96, w: 92, d: 192, r: 6 };
const BASE_H = 8;
const STEP = { x: -62, y: -96, w: 50, d: 192, r: 6 };
const STEP_H = 14;
const PANEL = { x: -40, y: -88, w: 3, d: 62, r: 1 };
const PANEL_H = 46;
const LAPTOP = { x: -56, y: -14, w: 40, d: 60, r: 3 };
const LID_H = 36;
const PHONE = { x: -40, y: 60, w: 3.5, d: 22, r: 2 };
const PHONE_H = 42;
const WATCH = [9, 40];
const WATCH_R = 9;
const PUCK = [9, -44];
const PUCK_R = 14;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H, STEP_H),
    [PANEL.x, PANEL.y, STEP_H + PANEL_H + 4],
    [LAPTOP.x, LAPTOP.y, STEP_H + LID_H + 8],
    [PHONE.x, PHONE.y + PHONE.d, STEP_H + PHONE_H + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan, z) =>
  `<path class="iso-halo" d="${k.haloOf(plan, z, 0.1, P)}" style="filter:blur(4px)"/>`;

// Screens face +x; on that face the viewer's left is +y, so rows start at the
// larger y and run toward the smaller.
/** A closed outline on the vertical face `x` between y0..y1 and z0..z1. */
const faceRect = (y0, y1, z0, z1, x) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );
const faceLine = (y0, y1, z, x, tone = "faint") =>
  line(k.segment([x, y0, z], [x, y1, z], P), { tone, free: true });

/** The riser: a low base and a taller back step, each with a seam and screws. */
function riser() {
  const front = STEP.x + STEP.w;
  return [
    `<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H, BASE_H, P)}"/>`,
    solid(k.slabOf(BASE, -BASE_H, BASE_H, P, 6, 1), { tone: "mid" }),
    line(k.sideSeam(BASE, -BASE_H / 2, P, 6), { tone: "faint" }),
    line(
      k.planOutline(
        { x: front + 4, y: BASE.y + 5, w: BASE.w - STEP.w - 9, d: BASE.d - 10 },
        0,
        P,
      ),
      { tone: "faint" },
    ),
    screws(
      [
        [BASE.x + BASE.w - 6, BASE.y + 6],
        [BASE.x + BASE.w - 6, BASE.y + BASE.d - 6],
      ],
      0,
      P,
      1.4,
    ),
    solid(k.slabOf(STEP, 0, STEP_H, P, 6, 1), { tone: "mid" }),
    line(k.sideSeam(STEP, STEP_H / 2, P, 6), { tone: "faint" }),
    screws(
      [
        [front - 6, STEP.y + 6],
        [front - 6, STEP.y + STEP.d - 6],
      ],
      STEP_H,
      P,
      1.4,
    ),
  ].join("");
}

/** A browser window on a foot: chrome bar, three dots, address field, blocks. */
function browserPanel() {
  const z = STEP_H;
  const foot = { x: PANEL.x - 9, y: PANEL.y + 17, w: 22, d: 28, r: 2 };
  const face = PANEL.x + PANEL.w;
  const near = PANEL.y + PANEL.d;
  const far = PANEL.y;
  const top = z + PANEL_H;
  const out = [
    halo(foot, z),
    solid(k.slabOf(foot, z, 2.5, P, 3, 0.4), { tone: "mid" }),
    solid(k.slabOf(PANEL, z + 2.5, PANEL_H - 2.5, P, 3, 0.4), { tone: "mid" }),
    line(faceRect(near - 2.5, far + 2.5, z + 5, top - 2.5, face), {
      tone: "lo",
    }),
    faceLine(near - 2.5, far + 2.5, top - 8, face, "lo"),
    dots(
      [0, 1, 2].map((i) => at([face, near - 6 - i * 3.4, top - 5.2])),
      { size: 0.7 },
    ),
    line(faceRect(near - 18, far + 6, top - 6.6, top - 3.8, face), {
      tone: "faint",
    }),
    line(faceRect(near - 6, near - 22, z + 9, top - 12, face), {
      tone: "faint",
    }),
  ];
  for (const [i, width] of [26, 18, 28, 14, 22].entries()) {
    out.push(faceLine(near - 27, near - 27 - width, top - 14 - i * 5, face));
  }
  return out.join("");
}

function laptop() {
  const z = STEP_H;
  const base = LAPTOP;
  const deck = z + 3.5;
  const out = [
    halo(base, z),
    solid(k.slabOf(base, z, 3.5, P, 4, 0.5), { tone: "mid" }),
  ];
  const keys = { x: base.x + 7, y: base.y + 6, w: 16, d: base.d - 12, r: 1 };
  out.push(line(k.planOutline(keys, deck, P, 2), { tone: "faint" }));
  out.push(
    dots(k.dotGrid(keys.x + 3, keys.y + 3, 3, 11, 4.4, deck, P), {
      size: 0.4,
      tone: "lo",
    }),
  );
  out.push(
    line(
      k.planOutline(
        { x: base.x + 27, y: base.y + base.d / 2 - 9, w: 8, d: 18, r: 1 },
        deck,
        P,
        2,
      ),
      { tone: "lo" },
    ),
  );
  const lid = { x: base.x - 1, y: base.y + 1.5, w: 3, d: base.d - 3, r: 1 };
  const face = lid.x + lid.w;
  const near = lid.y + lid.d;
  const top = deck + LID_H;
  out.push(solid(k.slabOf(lid, deck, LID_H, P, 3, 0.4), { tone: "mid" }));
  out.push(
    line(faceRect(near - 3, lid.y + 3, deck + 3.5, top - 3, face), {
      tone: "lo",
    }),
  );
  // A sidebar and a conversation column on the screen.
  out.push(
    line(
      k.segment([face, near - 15, deck + 3.5], [face, near - 15, top - 3], P),
      {
        tone: "faint",
      },
    ),
  );
  for (const [i, width] of [28, 20, 32, 16].entries()) {
    out.push(faceLine(near - 19, near - 19 - width, top - 8 - i * 6, face));
  }
  return out.join("");
}

/** A phone upright in a slim stand: the lit part. */
function phone() {
  const z = STEP_H;
  const stand = { x: PHONE.x - 7, y: PHONE.y - 2, w: 14, d: PHONE.d + 4, r: 2 };
  const face = PHONE.x + PHONE.w;
  const near = PHONE.y + PHONE.d;
  const top = z + PHONE_H;
  const out = [
    halo(stand, z),
    solid(k.slabOf(stand, z, 3, P, 3, 0.4), { tone: "mid" }),
    solid(k.slabOf(PHONE, z + 3, PHONE_H - 3, P, 5, 0.4), {
      tone: "hi",
      lit: true,
    }),
    line(faceRect(near - 2, PHONE.y + 2, z + 7, top - 3, face), {
      tone: "lo",
    }),
    faceLine(near - 8, PHONE.y + 8, top - 1.6, face, "mid"),
  ];
  for (const [i, width] of [12, 16, 9, 14].entries()) {
    out.push(faceLine(near - 5, near - 5 - width, top - 8 - i * 6, face));
  }
  return out.join("");
}

/** A watch lying flat: strap, round case, crown and two hands. */
function watch() {
  const [x, y] = WATCH;
  const strap = { x: x - 20, y: y - 5.5, w: 40, d: 11, r: 3 };
  return [
    halo(strap, 0),
    solid(k.slabOf(strap, 0, 1.6, P, 3, 0.3), { tone: "lo" }),
    line(
      k.lineOnTop([x + 13, y - 3], [x + 13, y + 3], 1.6, P) +
        k.lineOnTop([x + 16, y - 3], [x + 16, y + 3], 1.6, P),
      { tone: "mid" },
    ),
    solid(k.cylinder(x, y + WATCH_R + 1, 1.6, 2.5, 2.6, P, 16), {
      tone: "mid",
    }),
    solid(k.cylinder(x, y, WATCH_R, 1.6, 4.4, P, 40, 0.6), { tone: "mid" }),
    line(k.ring(x, y, WATCH_R - 1.8, 6, P, 40), { tone: "lo" }),
    line(k.radialTicks(x, y, WATCH_R - 2.4, 12, 3, 6, [0.6, 1.4], P).major, {
      tone: "mid",
    }),
    line(
      k.onTop(
        [
          [x - 3.6, y - 1.8],
          [x, y],
          [x + 2.4, y - 4],
        ],
        6,
        P,
      ),
      { tone: "hi" },
    ),
  ].join("");
}

/** The terminal puck with a prompt caret and a status lamp. */
function puck() {
  const [x, y] = PUCK;
  return [
    halo(
      { x: x - PUCK_R, y: y - PUCK_R, w: PUCK_R * 2, d: PUCK_R * 2, r: PUCK_R },
      0,
    ),
    solid(k.cylinder(x, y, PUCK_R, 0, 3, P, 48), { tone: "lo" }),
    solid(k.cylinder(x, y, PUCK_R - 1.5, 3, 8, P, 48, 0.8), { tone: "mid" }),
    line(k.sideArc(x, y, PUCK_R - 1.5, 6.5, P, 32), { tone: "faint" }),
    line(k.ring(x, y, PUCK_R - 4.5, 11, P, 48), { tone: "lo" }),
    line(
      k.onTop(
        [
          [x - 6, y - 3],
          [x - 3, y],
          [x - 6, y + 3],
        ],
        11,
        P,
      ),
      { tone: "hi" },
    ),
    line(k.lineOnTop([x - 1, y + 2.6], [x + 4, y + 2.6], 11, P), {
      tone: "mid",
    }),
    lamp([x + 5, y - 6], 11, P, { radius: 1.4 }),
  ].join("");
}

export function figure() {
  const back = byDepth(
    [
      [PANEL.x, PANEL.y + PANEL.d / 2, browserPanel],
      [LAPTOP.x + LAPTOP.w / 2, LAPTOP.y + LAPTOP.d / 2, laptop],
      [PHONE.x, PHONE.y + PHONE.d / 2, phone],
    ],
    P,
  );
  const front = byDepth(
    [
      [WATCH[0], WATCH[1], watch],
      [PUCK[0], PUCK[1], puck],
    ],
    P,
  );
  return {
    label:
      "A two-step display riser holding a browser panel, a laptop and a lit phone on the back step, with a watch and a round terminal puck on the front step.",
    body: [riser(), ...[...back, ...front].map(([, , draw]) => draw())],
  };
}
