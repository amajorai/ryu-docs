/*
 * "Configuration": settings and environment variables, drawn as a two-tier
 * control desk. The raised rear deck carries a row of knobs and a row of
 * toggle switches beside a status lamp (the lit part); the front deck holds a
 * bank of faders, a block of DIP switches, a master dial and push buttons.
 */

import { byDepth, dots, k, lamp, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const DESK = { x: -122, y: -72, w: 244, d: 144, r: 10 };
const DESK_H = 12;
const REAR = { x: -122, y: -72, w: 78, d: 144, r: 10 };
const REAR_H = 16;
const REAR_TOP = DESK_H + REAR_H;
const FOOT_H = 4;
const KNOBS_X = -100;
const KNOB_Y = [-48, -24, 0, 24, 48];
const TOGGLES_X = -66;
const TOGGLE_Y = [-52, -40, -28, -16, -4, 8, 20, 32];
const TOGGLES_UP = [true, false, true, true, false, true, false, false];
const FADERS = { from: -26, to: 38 };
const FADER_Y = [-54, -38, -22, -6, 10, 26, 42, 58];
const FADER_AT = [0.7, 0.35, 0.55, 0.2, 0.8, 0.45, 0.6, 0.3];
const DIP = { x: 60, y: -54, w: 46, d: 18, r: 1.5 };
const DIP_UP = [true, false, false, true, false, true, true, false];
const DIAL = [84, 30];
const DIAL_R = 14;
const BUTTONS_Y = 58;
const BUTTON_X = [52, 64, 76, 88, 100];

const P = k.fitProjection(
  [...k.boxCorners(DESK, -FOOT_H, DESK_H), [REAR.x, REAR.y, REAR_TOP + 10]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

function body() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DESK, -FOOT_H, 4, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(DESK, 16), P)) {
    out.push(
      solid(k.cylinder(x, y, 5, -FOOT_H, FOOT_H, P, 24), { tone: "lo" }),
    );
  }
  out.push(
    solid(k.slabOf(DESK, 0, DESK_H, P, 10, 1.2), { tone: "mid" }),
    line(k.sideSeam(DESK, 4, P, 10), { tone: "faint" }),
    screws(
      [
        [DESK.x + DESK.w - 8, DESK.y + 8],
        [DESK.x + DESK.w - 8, DESK.y + DESK.d - 8],
      ],
      DESK_H,
      P,
      1.6,
    ),
  );
  return out.join("");
}

function rearDeck() {
  const out = [
    solid(k.slabOf(REAR, DESK_H, REAR_H, P, 10, 1), { tone: "mid" }),
    line(
      k.planOutline(
        { x: REAR.x + 8, y: REAR.y + 8, w: REAR.w - 16, d: REAR.d - 16, r: 4 },
        REAR_TOP,
        P,
        4,
      ),
      { tone: "faint" },
    ),
  ];
  // Vent slots on the riser face that steps down to the front deck.
  const face = REAR.x + REAR.w;
  for (let i = 0; i < 9; i++) {
    const y = -20 + i * 5;
    out.push(
      line(k.segment([face, y, DESK_H + 4], [face, y, REAR_TOP - 4], P), {
        tone: "lo",
        free: true,
      }),
    );
  }
  return out.join("");
}

/** A light knurled knob (fewer facets than the shared one) with a pointer. */
function knob([x, y], z) {
  const radius = 5.6;
  const top = z + 5;
  return [
    solid(k.cylinder(x, y, radius + 1.2, z, 1, P, 20), { tone: "lo" }),
    solid(k.cylinder(x, y, radius, z + 1, 4, P, 24), { tone: "mid" }),
    line(k.knurl(x, y, radius, z + 1, top, 22, P), { tone: "lo" }),
    line(k.lineOnTop([x, y], [x + radius - 0.8, y], top, P), { tone: "hi" }),
    dots([k.iso([x, y, top], P)], { size: 0.45, tone: "hi" }),
  ].join("");
}

/** A bat-handle toggle: nut ring, collar and a lever leaning one way. */
function toggle([x, y], z, up) {
  const lean = up ? -4 : 4;
  const tip = [x + lean, y, z + 8];
  const half = 0.8;
  const lever = k.pathOf(
    [
      [x, y - half, z + 2],
      [x, y + half, z + 2],
      [tip[0], y + half, tip[2]],
      [tip[0], y - half, tip[2]],
    ].map(at),
    true,
  );
  return [
    line(k.ring(x, y, 3.4, z, P, 6), { tone: "lo" }),
    solid(k.cylinder(x, y, 2.2, z, 2, P, 10), { tone: "mid" }),
    `<g class="iso-solid"><path class="iso-fill" d="${lever}"/><path class="iso-line iso-edge" data-tone="mid" d="${lever}"/></g>`,
    solid(k.cylinder(tip[0], y, 1.4, tip[2] - 1, 1.8, P, 10), { tone: "mid" }),
  ].join("");
}

function rearControls() {
  const out = [];
  const items = [
    ...KNOB_Y.map((y) => [KNOBS_X, y, () => knob([KNOBS_X, y], REAR_TOP)]),
    ...TOGGLE_Y.map((y, i) => [
      TOGGLES_X,
      y,
      () => toggle([TOGGLES_X, y], REAR_TOP, TOGGLES_UP[i]),
    ]),
    [
      TOGGLES_X,
      52,
      () => lamp([TOGGLES_X, 52], REAR_TOP, P, { lit: true, radius: 3.6 }),
    ],
  ];
  for (const [, , draw] of byDepth(items, P)) {
    out.push(draw());
  }
  return out.join("");
}

/** One fader: a slot with scale ticks and a cap at `share` of its travel. */
function fader(y, share) {
  const { from, to } = FADERS;
  const ticks = k.topTicks(
    from + 2,
    to - 2,
    6,
    3,
    y + 3.4,
    DESK_H,
    [1.4, 2.8],
    P,
  );
  const capX = from + 3 + (to - from - 10) * share;
  const cap = { x: capX, y: y - 3.4, w: 5, d: 6.8, r: 0.8 };
  return [
    line(
      k.planOutline(
        { x: from, y: y - 1, w: to - from, d: 2, r: 1 },
        DESK_H,
        P,
        3,
      ),
      { tone: "lo" },
    ),
    line(ticks.minor, { tone: "faint" }),
    line(ticks.major, { tone: "lo" }),
    solid(k.slabOf(cap, DESK_H, 4, P, 2, 0.3), { tone: "mid" }),
    line(
      k.lineOnTop(
        [capX + 2.5, cap.y + 1],
        [capX + 2.5, cap.y + cap.d - 1],
        DESK_H + 4,
        P,
      ),
      { tone: "hi" },
    ),
  ].join("");
}

/** A DIP-switch block: eight windows, each with its slide at one end. */
function dipBlock() {
  const top = DESK_H + 4;
  const out = [solid(k.slabOf(DIP, DESK_H, 4, P, 3, 0.4), { tone: "mid" })];
  const pitch = (DIP.w - 8) / DIP_UP.length;
  for (const [i, up] of DIP_UP.entries()) {
    const x = DIP.x + 4 + i * pitch + 0.6;
    const window = { x, y: DIP.y + 3, w: pitch - 1.2, d: DIP.d - 6, r: 0.4 };
    out.push(line(k.planOutline(window, top, P, 1), { tone: "lo" }));
    const slide = {
      x: x + 0.6,
      y: up ? window.y + 0.6 : window.y + window.d - 5.6,
      w: window.w - 1.2,
      d: 5,
      r: 0.3,
    };
    out.push(
      solid(k.slabOf(slide, top, 1.2, P, 1), { tone: "mid", crease: "none" }),
    );
  }
  return out.join("");
}

function dial() {
  const [x, y] = DIAL;
  const top = DESK_H + 7;
  const ticks = k.radialTicks(
    x,
    y,
    DIAL_R + 5,
    30,
    5,
    DESK_H,
    [1.2, 2.6],
    P,
    -Math.PI * 0.75,
    Math.PI * 1.5,
  );
  const angle = -Math.PI * 0.75 + Math.PI * 1.5 * 0.4;
  return [
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    solid(k.cylinder(x, y, DIAL_R + 1.5, DESK_H, 1.4, P, 40), { tone: "lo" }),
    solid(k.cylinder(x, y, DIAL_R, DESK_H + 1.4, 5.6, P, 44, 0.6), {
      tone: "mid",
    }),
    line(k.knurl(x, y, DIAL_R, DESK_H + 2, top, 48, P), { tone: "lo" }),
    line(k.ring(x, y, DIAL_R - 4, top, P, 48), { tone: "faint" }),
    line(
      k.lineOnTop(
        [x + Math.sin(angle) * 3, y - Math.cos(angle) * 3],
        [
          x + Math.sin(angle) * (DIAL_R - 2),
          y - Math.cos(angle) * (DIAL_R - 2),
        ],
        top,
        P,
      ),
      { tone: "hi" },
    ),
  ].join("");
}

/** A square push button in a recessed bezel. */
function button(x) {
  const y = BUTTONS_Y;
  return [
    line(
      k.planOutline(
        { x: x - 4.4, y: y - 4.4, w: 8.8, d: 8.8, r: 1.4 },
        DESK_H,
        P,
        2,
      ),
      {
        tone: "lo",
      },
    ),
    solid(
      k.slabOf(
        { x: x - 3.2, y: y - 3.2, w: 6.4, d: 6.4, r: 1 },
        DESK_H,
        2.4,
        P,
        2,
        0.3,
      ),
      {
        tone: "mid",
      },
    ),
  ].join("");
}

function frontControls() {
  const items = [
    ...FADER_Y.map((y, i) => [
      FADERS.from + 30,
      y,
      () => fader(y, FADER_AT[i]),
    ]),
    [DIP.x + DIP.w / 2, DIP.y + DIP.d / 2, dipBlock],
    [DIAL[0], DIAL[1], dial],
    ...BUTTON_X.map((x) => [x, BUTTONS_Y, () => button(x)]),
  ];
  return byDepth(items, P)
    .map(([, , draw]) => draw())
    .join("");
}

export function figure() {
  return {
    label:
      "A two-tier control desk: knobs, toggle switches and a lit status lamp on the raised rear deck, and a bank of faders, a block of DIP switches, a master dial and a row of push buttons on the front deck.",
    body: [body(), rearDeck(), rearControls(), frontControls()],
  };
}
