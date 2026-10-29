/*
 * "Scheduler": jobs that run on a clock, drawn as a mechanical segment timer
 * beside a stack of letter trays. Raised pins around the dial mark the slots
 * that fire, a fixed pointer marks now, and a lead runs from the timer to the
 * trays of queued work; the timer's lamp is the one lit part.
 */

import {
  benchPlate,
  byDepth,
  cable,
  k,
  knob,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -126, y: -82, w: 250, d: 140, r: 8 };
const HOUSING = { x: -110, y: -62, w: 100, d: 100, r: 16 };
const HOUSING_H = 20;
const DIAL = { x: -60, y: -12, r: 38 };
const DIAL_H = 5;
const PINS = 30;
const RAISED = [2, 3, 4, 9, 10, 17, 18, 19, 25];
const POINTER = { length: 11, half: 3 };
const BASE_TRAY = { x: 36, y: -72, w: 78, d: 58, r: 2 };
const TRAY_GAP = 22;
const TRAYS = 3;

const dialTop = HOUSING_H + DIAL_H;
const trayTop = TRAY_GAP * TRAYS;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [BASE_TRAY.x, BASE_TRAY.y, trayTop + 4],
    [BASE_TRAY.x + BASE_TRAY.w, BASE_TRAY.y, trayTop + 4],
    [HOUSING.x, HOUSING.y, HOUSING_H + DIAL_H + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);

/** The plan outline of one radial pin slot on the dial rim. */
function pinRing(index) {
  const a = (index / PINS) * Math.PI * 2;
  const along = [Math.cos(a), Math.sin(a)];
  const across = [-along[1], along[0]];
  const r0 = DIAL.r - 7;
  const r1 = DIAL.r - 1;
  const half = 1.6;
  return [
    [r0, -half],
    [r1, -half],
    [r1, half],
    [r0, half],
  ].map(([r, s]) => [
    DIAL.x + along[0] * r + across[0] * s,
    DIAL.y + along[1] * r + across[1] * s,
  ]);
}

function timer() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(HOUSING, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    solid(k.slabOf(HOUSING, 0, 4, P, 8, 0.6), { tone: "lo" }),
    solid(k.slabOf(k.insetPlan(HOUSING, 2), 4, HOUSING_H - 4, P, 8, 1), {
      tone: "mid",
    }),
    line(k.sideSeam(k.insetPlan(HOUSING, 2), 10, P, 8), { tone: "faint" }),
    screws(k.corners(HOUSING, 9), HOUSING_H, P, 1.3),
    solid(k.cylinder(DIAL.x, DIAL.y, DIAL.r + 2, HOUSING_H, 1.2, P, 48), {
      tone: "lo",
    }),
    solid(
      k.cylinder(
        DIAL.x,
        DIAL.y,
        DIAL.r,
        HOUSING_H + 1.2,
        DIAL_H - 1.2,
        P,
        48,
        0.6,
      ),
      {
        tone: "mid",
      },
    ),
  ];
  const ticks = k.radialTicks(
    DIAL.x,
    DIAL.y,
    DIAL.r - 9,
    24,
    6,
    dialTop,
    [2, 4],
    P,
  );
  out.push(
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    line(k.ring(DIAL.x, DIAL.y, DIAL.r - 16, dialTop, P, 48), {
      tone: "faint",
    }),
  );
  const pins = Array.from({ length: PINS }, (_, i) => {
    const a = (i / PINS) * Math.PI * 2;
    return [DIAL.x + Math.cos(a) * DIAL.r, DIAL.y + Math.sin(a) * DIAL.r, i];
  });
  // Lowered pins are flush slots; raised pins stand proud of the face.
  const flush = pins.filter(([, , i]) => !RAISED.includes(i));
  out.push(
    line(
      flush.map(([, , i]) => k.onTop(pinRing(i), dialTop, P, true)).join(""),
      {
        tone: "lo",
      },
    ),
  );
  for (const [, , i] of byDepth(pins, P, dialTop)) {
    if (RAISED.includes(i)) {
      out.push(
        solid(k.extrude(pinRing(i), dialTop, 4, P), {
          tone: "hi",
          crease: "lo",
        }),
      );
    }
  }
  out.push(knob([DIAL.x, DIAL.y], dialTop, P, { radius: 7, height: 6 }));
  // The fixed "now" pointer on the housing, aimed at the dial rim.
  const tip = DIAL.y + DIAL.r + 3;
  out.push(
    solid(
      k.extrude(
        [
          [DIAL.x, tip],
          [DIAL.x + POINTER.half, tip + POINTER.length],
          [DIAL.x, tip + POINTER.length - 2],
          [DIAL.x - POINTER.half, tip + POINTER.length],
        ],
        HOUSING_H,
        1.6,
        P,
        { convex: false },
      ),
      { tone: "hi", crease: "lo" },
    ),
  );
  out.push(
    lamp(
      [HOUSING.x + HOUSING.w - 12, HOUSING.y + HOUSING.d - 12],
      HOUSING_H,
      P,
      {
        lit: true,
        radius: 2.6,
      },
    ),
  );
  return out.join("");
}

/** One letter tray: a floor, three walls and a low front lip, with sheets. */
function tray(level, sheets) {
  const z = level * TRAY_GAP;
  const plan = BASE_TRAY;
  const wall = (part, h) =>
    solid(k.slabOf(part, z, h, P, 2, 0.3), { tone: "mid" });
  const out = [];
  if (level > 0) {
    for (const [x, y] of byDepth(k.corners(plan, 4), P)) {
      out.push(
        solid(k.cylinder(x, y, 1.6, z - TRAY_GAP + 2, TRAY_GAP - 2, P, 12), {
          tone: "lo",
        }),
      );
    }
  }
  out.push(
    solid(k.slabOf(plan, z, 2, P, 3, 0.4), { tone: "mid" }),
    wall({ x: plan.x, y: plan.y, w: plan.w, d: 3, r: 1 }, 10),
    wall({ x: plan.x, y: plan.y, w: 3, d: plan.d, r: 1 }, 10),
  );
  for (let i = 0; i < sheets; i++) {
    const sheet = {
      x: plan.x + 8 + i * 2,
      y: plan.y + 8 + i * 1.5,
      w: plan.w - 24,
      d: plan.d - 2,
      r: 0.5,
    };
    out.push(
      solid(k.slabOf(sheet, z + 2 + i * 1.2, 1, P, 1), {
        tone: i === sheets - 1 ? "mid" : "lo",
        crease: "none",
      }),
    );
  }
  out.push(
    wall({ x: plan.x + plan.w - 3, y: plan.y, w: 3, d: plan.d, r: 1 }, 6),
    wall({ x: plan.x, y: plan.y + plan.d - 3, w: plan.w, d: 3, r: 1 }, 4),
  );
  return out.join("");
}

function trays() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BASE_TRAY, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
  ];
  for (const [level, sheets] of [3, 2, 4].entries()) {
    out.push(tray(level, sheets));
  }
  return out.join("");
}

function lead() {
  const z = 0.8;
  const side = HOUSING.x + HOUSING.w;
  const from = [side, 0, 10];
  const lip = BASE_TRAY.y + BASE_TRAY.d;
  const to = [BASE_TRAY.x + 26, lip, 3];
  return cable(
    from,
    to,
    [
      [side + 5, 0, z],
      [side + 5, lip + 12, z],
      [to[0], lip + 12, z],
    ],
    P,
    { tone: "mid", flow: true },
  );
}

export function figure() {
  return {
    label:
      "A mechanical segment timer with a ring of raised and lowered pins around its dial and a lit lamp, cabled to a stack of three letter trays holding sheets of paper.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -4, y: PLATE.y + PLATE.d - 16, w: 112, d: 7, r: 1 }, P),
      lead(),
      timer(),
      trays(),
    ],
  };
}
