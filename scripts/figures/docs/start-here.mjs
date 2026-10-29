/*
 * "Start here": one local runtime that every surface, model and tool plugs
 * into, drawn as a console. A round core (the lit lamp) sits in the middle of
 * the deck; a screen, a model cartridge, a phone and a tool plug each seat in
 * their own bay, and engraved traces run from every bay back to the core.
 */

import {
  byDepth,
  cable,
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

const DECK = { x: -100, y: -68, w: 200, d: 136, r: 16 };
const LIP_H = 4;
const DECK_TOP = 16;
const CORE = [0, 0];
const CORE_R = 26;
const CORE_H = 10;
const SCREEN = { x: -86, y: -58, w: 64, d: 4, r: 1.2 };
const SCREEN_H = 44;
const CART = { x: 14, y: 52, w: 44, d: 9, r: 1.4 };
const CART_H = 22;
const PHONE = { x: -80, y: 8, w: 34, d: 50, r: 4 };
const SOCKET = [70, -26];
const PLUG_Z = 34;
const PLUG_R = 11;

const P = k.fitProjection(
  [
    ...k.boxCorners(DECK, -LIP_H - 2, DECK_TOP),
    [SCREEN.x, SCREEN.y, DECK_TOP + SCREEN_H + 4],
    [SOCKET[0], SOCKET[1], PLUG_Z + 22],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the vertical face `y` between x0..x1 and z0..z1. */
const faceY = (x0, x1, z0, z1, y) =>
  k.pathOf(
    [
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ].map(at),
    true,
  );

/** A recessed bay: a groove outline around a plan on the deck. */
const bay = (plan, by = 3) =>
  line(k.planOutline(k.insetPlan(plan, -by), DECK_TOP, P, 3), { tone: "lo" });

function deck() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DECK, -LIP_H, 4, P)}"/>`];
  out.push(
    solid(k.slabOf(k.insetPlan(DECK, -3), -LIP_H, LIP_H, P, 10, 0.6), {
      tone: "lo",
    }),
  );
  out.push(solid(k.slabOf(DECK, 0, DECK_TOP, P, 10, 1.6), { tone: "mid" }));
  out.push(
    line(k.sideSeam(DECK, DECK_TOP / 2, P, 10), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(DECK, 6), DECK_TOP, P, 8), {
      tone: "faint",
    }),
    screws(k.corners(DECK, 11), DECK_TOP, P, 1.6),
  );
  // Vent slots along the front edge of the deck.
  for (let i = 0; i < 8; i++) {
    const x = -50 + i * 4;
    out.push(line(k.lineOnTop([x, 54], [x, 64], DECK_TOP, P), { tone: "lo" }));
  }
  out.push(bay(SCREEN), bay(CART), bay(PHONE, 2));
  return out.join("");
}

/** Engraved traces from every bay back to the core ring. */
function traces() {
  const z = DECK_TOP;
  const runs = [
    [
      [-54, -51],
      [-54, -36],
      [-18, -36],
      [-18, -20],
    ],
    [
      [CART.x + CART.w / 2, CART.y - 3],
      [CART.x + CART.w / 2, 36],
      [12, 36],
      [12, 22],
    ],
    [
      [-43, 24],
      [-36, 24],
      [-36, 10],
      [-24, 10],
    ],
    [
      [SOCKET[0] - 13, SOCKET[1]],
      [42, SOCKET[1]],
      [42, -10],
      [26, -10],
    ],
  ];
  const out = [];
  const bends = [];
  for (const run of runs) {
    out.push(line(k.onTop(run, z, P), { tone: "lo" }));
    bends.push(...run.slice(1, -1).map(([x, y]) => at([x, y, z])));
    const [x, y] = run.at(-1);
    out.push(line(k.ring(x, y, 1.4, z, P, 12), { tone: "mid" }));
  }
  out.push(dots(bends, { size: 0.45, tone: "lo" }));
  return out.join("");
}

function core() {
  const [x, y] = CORE;
  const top = DECK_TOP + CORE_H;
  const ticks = k.radialTicks(x, y, CORE_R - 3, 48, 6, top, [1.2, 2.6], P);
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x - CORE_R, y: y - CORE_R, w: CORE_R * 2, d: CORE_R * 2, r: CORE_R }, DECK_TOP, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.cylinder(x, y, CORE_R + 3, DECK_TOP, 2, P, 64), { tone: "lo" }),
    solid(k.cylinder(x, y, CORE_R, DECK_TOP + 2, CORE_H - 2, P, 72, 0.8), {
      tone: "hi",
      crease: "lo",
    }),
    line(k.knurl(x, y, CORE_R, top - 3.2, top, 72, P, 0.3), { tone: "lo" }),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    line(k.ring(x, y, CORE_R - 8, top, P, 56), { tone: "faint" }),
    lamp([x, y], top, P, { lit: true, radius: 5 }),
  ].join("");
}

function screen() {
  const face = SCREEN.y + SCREEN.d;
  const top = DECK_TOP + SCREEN_H;
  const out = [
    solid(
      k.slabOf(
        { x: SCREEN.x + 18, y: SCREEN.y - 5, w: 30, d: 6, r: 1.4 },
        DECK_TOP,
        16,
        P,
        3,
      ),
      { tone: "mid" },
    ),
    solid(k.slabOf(SCREEN, DECK_TOP, SCREEN_H, P, 3, 0.4), { tone: "mid" }),
    line(
      faceY(SCREEN.x + 4, SCREEN.x + SCREEN.w - 4, DECK_TOP + 6, top - 4, face),
      {
        tone: "lo",
      },
    ),
  ];
  for (const [i, width] of [40, 50, 30, 44].entries()) {
    const z = top - 12 - i * 7;
    out.push(
      line(
        k.segment(
          [SCREEN.x + 10, face, z],
          [SCREEN.x + 10 + width, face, z],
          P,
        ),
        { tone: i === 0 ? "mid" : "faint", free: true },
      ),
    );
  }
  return out.join("");
}

function cartridge() {
  const face = CART.y + CART.d;
  const top = DECK_TOP + CART_H;
  const out = [
    solid(k.slabOf(CART, DECK_TOP, CART_H, P, 3, 0.5), { tone: "mid" }),
    line(faceY(CART.x + 6, CART.x + CART.w - 6, DECK_TOP + 4, top - 9, face), {
      tone: "lo",
    }),
  ];
  // Grip ridges along the top of the shell.
  for (let i = 0; i < 4; i++) {
    const z = top - 2 - i * 1.6;
    out.push(
      line(
        k.segment([CART.x + 10, face, z], [CART.x + CART.w - 10, face, z], P),
        { tone: "faint", free: true },
      ),
    );
  }
  out.push(
    line(
      k.lineOnTop(
        [CART.x + 4, CART.y + CART.d / 2],
        [CART.x + CART.w - 4, CART.y + CART.d / 2],
        top,
        P,
      ),
      { tone: "faint" },
    ),
  );
  return out.join("");
}

function phone() {
  const z = DECK_TOP;
  const top = z + 3;
  const screenPlan = k.insetPlan(PHONE, 2.5);
  const out = [
    solid(k.slabOf(PHONE, z, 3, P, 6, 0.4), { tone: "mid" }),
    line(k.planOutline(screenPlan, top, P, 4), { tone: "lo" }),
    line(
      k.lineOnTop(
        [PHONE.x + 12, PHONE.y + 4.5],
        [PHONE.x + PHONE.w - 12, PHONE.y + 4.5],
        top,
        P,
      ),
      { tone: "mid" },
    ),
  ];
  for (const [i, width] of [20, 14, 22, 12].entries()) {
    const y = PHONE.y + 12 + i * 8;
    out.push(
      line(k.lineOnTop([PHONE.x + 6, y], [PHONE.x + 6 + width, y], top, P), {
        tone: "faint",
      }),
    );
  }
  return out.join("");
}

/** A round socket on the deck with a tool plug lifted above it. */
function plug() {
  const [x, y] = SOCKET;
  const body = PLUG_Z + 4;
  const out = [
    solid(k.cylinder(x, y, 12, DECK_TOP, 1.4, P, 40), { tone: "mid" }),
    line(k.ring(x, y, 9.5, DECK_TOP + 1.4, P, 40), { tone: "faint" }),
    jack([x - 5, y], DECK_TOP + 1.4, P),
    jack([x + 5, y], DECK_TOP + 1.4, P),
    `<path class="iso-halo" d="${k.haloOf({ x: x - PLUG_R, y: y - PLUG_R, w: PLUG_R * 2, d: PLUG_R * 2, r: PLUG_R }, DECK_TOP, 0.1, P)}" style="filter:blur(6px);opacity:.45"/>`,
  ];
  for (const px of [x - 5, x + 5]) {
    out.push(
      solid(k.cylinder(px, y, 1.2, PLUG_Z - 10, 10, P, 12), {
        tone: "mid",
        crease: "none",
      }),
    );
  }
  out.push(
    solid(k.cylinder(x, y, PLUG_R, PLUG_Z, 4, P, 40, 0.4), { tone: "mid" }),
    solid(k.cylinder(x, y, PLUG_R - 2, body, 10, P, 40, 0.6), { tone: "mid" }),
    line(k.knurl(x, y, PLUG_R - 2, body + 2, body + 8, 28, P), { tone: "lo" }),
    solid(k.cylinder(x, y, 2.6, body + 10, 5, P, 20), { tone: "lo" }),
  );
  return out.join("");
}

/** Points along a quadratic curve through control point `c`, ends excluded. */
function arc(a, c, b, steps = 16) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push(a.map((v, n) => u * u * v + 2 * u * t * c[n] + t * t * b[n]));
  }
  return out;
}

/** The plug's lead arcs back down to the deck and into a clamp at its rear. */
function lead() {
  const [x, y] = SOCKET;
  const top = PLUG_Z + 19;
  const z = DECK_TOP + 1.2;
  const clamp = { x: x - 5, y: DECK.y + 4, w: 10, d: 6, r: 1.2 };
  return [
    cable(
      [x, y, top],
      [x, clamp.y + clamp.d, z + 1],
      arc([x, y, top], [x, y - 16, top + 16], [x, clamp.y + clamp.d + 6, z]),
      P,
      { tone: "mid" },
    ),
    solid(k.slabOf(clamp, DECK_TOP, 4, P, 3, 0.4), { tone: "mid" }),
    screws(
      [
        [clamp.x + 2.4, clamp.y + clamp.d / 2],
        [clamp.x + clamp.w - 2.4, clamp.y + clamp.d / 2],
      ],
      DECK_TOP + 4,
      P,
      1,
    ),
  ].join("");
}

export function figure() {
  const parts = byDepth(
    [
      [SCREEN.x + SCREEN.w / 2, SCREEN.y, screen],
      [CART.x + CART.w / 2, CART.y, cartridge],
      [CORE[0], CORE[1], core],
      [PHONE.x + PHONE.w / 2, PHONE.y + PHONE.d / 2, phone],
      [SOCKET[0], SOCKET[1], plug],
    ],
    P,
  );
  return {
    label:
      "A console deck with a round core and a lit lamp at its centre; a screen, a cartridge, a phone and a lifted tool plug each sit in their own bay, joined to the core by engraved traces.",
    body: [deck(), traces(), lead(), ...parts.map(([, , draw]) => draw())],
  };
}
