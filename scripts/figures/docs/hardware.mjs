/*
 * "Hardware": thin-client devices that lean on a node, drawn as an ESP32-S3
 * dev board on a bench plate. A shielded radio module with its antenna, a small
 * screen, a speaker grille and pin headers sit on standoffs; a USB-C cable
 * leads off the plate, radio arcs rise from the antenna, and the status LED is
 * the one lit part.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 380;

const PLATE = { x: -112, y: -52, w: 200, d: 104, r: 8 };
const BOARD = { x: -96, y: -32, w: 158, d: 62, r: 4 };
const STAND_H = 6;
const PCB_H = 2;
const TOP = STAND_H + PCB_H;
const END = BOARD.x + BOARD.w;
const MODULE = { x: -90, y: -15, w: 48, d: 30, r: 1 };
const SHIELD = { x: -78, y: -13, w: 34, d: 26, r: 1.2 };
const SHIELD_H = 3.2;
const SCREEN = { x: -32, y: -15, w: 34, d: 30, r: 2 };
const SPEAKER = [24, 0];
const SPEAKER_R = 11;
const HEADER_D = 4.6;
const HEADER_H = 2.4;
const PIN_STEP = 5;
const PIN_H = 3.4;
const LED = [46, -14];
const BUTTONS = [
  [46, 14],
  [46, 2],
];
const USB = { x: END - 8, y: -5, w: 10, d: 10, r: 1.6 };
const USB_H = 3.4;
const PLUG = { x: END + 3, y: -6.5, w: 16, d: 13, r: 3 };
const ARCS = [9, 15, 21];
const PAPER = -17;
const TAIL = { x: PLATE.x + PLATE.w + 12, y: 34, w: 9, d: 22, r: 2 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [MODULE.x + 4, 0, TOP + ARCS[2] + 2],
    [TAIL.x + TAIL.w, TAIL.y + TAIL.d + 12, PAPER],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

function board() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BOARD, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(BOARD, 4.5), P)) {
    out.push(solid(k.cylinder(x, y, 2.6, 0, STAND_H, P, 6), { tone: "mid" }));
  }
  out.push(solid(k.slabOf(BOARD, STAND_H, PCB_H, P, 6, 0.3), { tone: "mid" }));
  out.push(screws(k.corners(BOARD, 4.5), TOP, P, 1.8));
  // A few traces running from the module across to the screen.
  for (const y of [-6, -2, 2, 6]) {
    out.push(
      line(k.lineOnTop([MODULE.x + MODULE.w, y], [SCREEN.x, y], TOP, P), {
        tone: "faint",
      }),
    );
  }
  return out.join("");
}

/** A header strip along `y` with a row of square pins standing on it. */
function header(y) {
  const strip = { x: BOARD.x + 14, y, w: BOARD.w - 34, d: HEADER_D, r: 0.6 };
  const top = TOP + HEADER_H;
  const pins = [];
  for (let x = strip.x + 2.5; x < strip.x + strip.w - 1; x += PIN_STEP) {
    pins.push(k.rise([x, y + HEADER_D / 2], top, top + PIN_H, P));
  }
  const tips = [];
  for (let x = strip.x + 2.5; x < strip.x + strip.w - 1; x += PIN_STEP) {
    tips.push(at([x, y + HEADER_D / 2, top + PIN_H]));
  }
  return [
    solid(k.slabOf(strip, TOP, HEADER_H, P, 2, 0.3), { tone: "lo" }),
    line(pins.join(""), { tone: "mid" }),
    dots(tips, { size: 0.65, tone: "hi" }),
  ].join("");
}

/** The radio module: a shield can and a meandering antenna trace. */
function radioModule() {
  const top = TOP + 0.8;
  const meander = [];
  for (let i = 0; i <= 6; i++) {
    const y = MODULE.y + 4 + i * 3.6;
    meander.push(
      [MODULE.x + (i % 2 ? 8 : 3), y],
      [MODULE.x + (i % 2 ? 3 : 8), y],
    );
  }
  return [
    solid(k.slabOf(MODULE, TOP, 0.8, P, 2), { tone: "mid" }),
    line(k.onTop(meander, top, P), { tone: "lo" }),
    solid(k.slabOf(SHIELD, top, SHIELD_H, P, 3, 0.5), { tone: "hi" }),
    line(k.planOutline(k.insetPlan(SHIELD, 3), top + SHIELD_H, P, 3), {
      tone: "faint",
    }),
    dots([at([SHIELD.x + 5, SHIELD.y + 5, top + SHIELD_H])], { size: 0.6 }),
  ].join("");
}

function screen() {
  const top = TOP + 2;
  const glass = k.insetPlan(SCREEN, 3);
  const out = [
    solid(k.slabOf(SCREEN, TOP, 2, P, 3, 0.4), { tone: "mid" }),
    solid(k.slabOf(glass, top - 0.4, 0.4, P, 2), {
      tone: "lo",
      crease: "none",
    }),
  ];
  for (const [i, width] of [18, 12, 15].entries()) {
    const x = glass.x + 5 + i * 6;
    out.push(
      line(k.lineOnTop([x, glass.y + 4], [x, glass.y + 4 + width], top, P), {
        tone: i === 0 ? "mid" : "faint",
      }),
    );
  }
  return out.join("");
}

function speaker() {
  const [x, y] = SPEAKER;
  const top = TOP + 2.6;
  const holes = [];
  for (let gx = -7; gx <= 7; gx += 2.8) {
    for (let gy = -7; gy <= 7; gy += 2.8) {
      if (Math.hypot(gx, gy) < SPEAKER_R - 3) {
        holes.push(at([x + gx, y + gy, top]));
      }
    }
  }
  return [
    solid(k.cylinder(x, y, SPEAKER_R, TOP, 2.6, P, 40, 0.4), { tone: "mid" }),
    line(k.ring(x, y, SPEAKER_R - 1.8, top, P, 36), { tone: "lo" }),
    dots(holes, { size: 0.45, tone: "lo" }),
  ].join("");
}

function controls() {
  const out = BUTTONS.map(([x, y]) =>
    [
      solid(
        k.slabOf(
          { x: x - 3.5, y: y - 3.5, w: 7, d: 7, r: 0.8 },
          TOP,
          1.6,
          P,
          2,
        ),
        { tone: "mid" },
      ),
      solid(k.cylinder(x, y, 2, TOP + 1.6, 1.2, P, 18), { tone: "mid" }),
    ].join(""),
  );
  out.push(lamp(LED, TOP, P, { lit: true, radius: 2.4 }));
  return out.join("");
}

function usb() {
  const mid = USB.y + USB.d / 2;
  return [
    solid(k.slabOf(USB, TOP, USB_H, P, 3, 0.3), { tone: "mid" }),
    // The plug's metal shell and its overmold, pushed home.
    solid(
      k.slabOf(
        { x: END + 1, y: mid - 4, w: 3, d: 8, r: 1.2 },
        TOP + 0.2,
        3,
        P,
        2,
      ),
      { tone: "mid" },
    ),
    solid(k.slabOf(PLUG, TOP - 1, 5.4, P, 4, 0.8), { tone: "mid" }),
    line(k.sideSeam(PLUG, TOP + 1.7, P, 4), { tone: "faint" }),
    solid(
      k.slabOf(
        { x: PLUG.x + PLUG.w, y: mid - 3, w: 6, d: 6, r: 2.4 },
        TOP,
        3.4,
        P,
        3,
      ),
      { tone: "lo" },
    ),
  ].join("");
}

/** A smooth curve through world points (Catmull-Rom), sampled for drawing. */
function smooth(points, perSpan = 6) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let step = 0; step < perSpan; step++) {
      const t = step / perSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        [0, 1, 2].map(
          (axis) =>
            0.5 *
            (2 * p1[axis] +
              (p2[axis] - p0[axis]) * t +
              (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2 +
              (3 * p1[axis] - p0[axis] - 3 * p2[axis] + p3[axis]) * t3),
        ),
      );
    }
  }
  out.push(points.at(-1));
  return out;
}

/** The USB cable: it sags onto the plate, rolls over the lip and drops. */
function usbCable() {
  const y = USB.y + USB.d / 2;
  const edge = PLATE.x + PLATE.w;
  const tailX = TAIL.x + TAIL.w / 2;
  const path = smooth([
    [PLUG.x + PLUG.w + 6, y, TOP + 1.7],
    [edge - 1.5, y + 2, 2.4],
    [edge + 1.2, y + 4, -0.6],
    [edge + 2.2, y + 7, -8],
    [edge + 5, y + 12, PAPER + 1.2],
    [tailX, y + 20, PAPER + 1],
    [tailX, TAIL.y - 1, PAPER + 2],
  ]);
  return line(k.pathOf(path.map(at)), { tone: "mid" });
}

/** The far end of the cable: a USB-A plug lying on the paper. */
function tailPlug() {
  const shell = {
    x: TAIL.x + 1,
    y: TAIL.y + TAIL.d - 1,
    w: TAIL.w - 2,
    d: 11,
    r: 0.5,
  };
  const top = PAPER + 3.6;
  const contact = (x) =>
    k.planOutline({ x, y: shell.y + 5, w: 1.6, d: 2.5, r: 0 }, top, P, 1);
  return [
    `<path class="iso-halo" d="${k.haloOf({ ...TAIL, d: TAIL.d + 10 }, PAPER, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(TAIL, PAPER, 5, P, 4, 0.8), { tone: "mid" }),
    line(k.sideSeam(TAIL, PAPER + 2.5, P, 4), { tone: "faint" }),
    solid(k.slabOf(shell, PAPER + 0.7, 3.6 - 0.7, P, 2), { tone: "mid" }),
    line(contact(shell.x + 1.6) + contact(shell.x + shell.w - 3.2), {
      tone: "lo",
    }),
  ].join("");
}

/** Dotted radio arcs standing over the antenna end of the module. */
function radioArcs() {
  const cx = MODULE.x + 5;
  const z0 = TOP + 2;
  return ARCS.map((radius, i) => {
    const points = [];
    for (let step = 0; step <= 18; step++) {
      const angle = 0.35 + (step / 18) * (Math.PI - 0.7);
      points.push(
        at([cx, -Math.cos(angle) * radius, z0 + Math.sin(angle) * radius]),
      );
    }
    return line(k.pathOf(points), {
      tone: i === ARCS.length - 1 ? "lo" : "mid",
      dotted: true,
    });
  }).join("");
}

export function figure() {
  const parts = byDepth(
    [
      [MODULE.x + MODULE.w / 2, 0, radioModule],
      [SCREEN.x + SCREEN.w / 2, 0, screen],
      [SPEAKER[0], SPEAKER[1], speaker],
      [LED[0], 0, controls],
    ],
    P,
  );
  return {
    label:
      "An ESP32-S3 dev board on a bench plate: a shielded radio module with radio arcs over its antenna, a small screen, a speaker grille, pin headers, a lit status LED and a USB-C cable leading off the plate.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip(
        { x: PLATE.x + 16, y: PLATE.y + PLATE.d - 14, w: 96, d: 7, r: 1 },
        P,
      ),
      board(),
      header(BOARD.y + 3),
      ...parts.map(([, , draw]) => draw()),
      usb(),
      header(BOARD.y + BOARD.d - 3 - HEADER_D),
      tailPlug(),
      usbCable(),
      radioArcs(),
    ],
  };
}
