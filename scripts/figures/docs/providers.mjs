/*
 * "Providers": many model providers, one way in, drawn as a power strip on a
 * bench plate. Plugs of different makes (a round plug, an adapter brick, a
 * square plug and a right-angle plug) fill its sockets, one left free. Their
 * cables lead off the plate, the strip's own cord drops off its side, and the
 * square plug is the one lit part.
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
export const HEIGHT = 380;

const PLATE = { x: -118, y: -54, w: 220, d: 104, r: 8 };
const STRIP = { x: -104, y: -24, w: 192, d: 30, r: 9 };
const STRIP_H = 13;
const TOP = STRIP_H;
const ROW_Y = STRIP.y + STRIP.d / 2;
const SOCKETS = [-80, -48, -16, 16, 48];
const SOCKET_R = 9;
const SWITCH_X = 72;
const EDGE = PLATE.y + PLATE.d;
const FLOOR = -17;
const FADE = 110;
const RUN_OUT = 24;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, FLOOR, 0),
    [SOCKETS[1], ROW_Y - 12, TOP + 22],
    [SOCKETS[0] - 10, EDGE + RUN_OUT, FLOOR],
    [PLATE.x + PLATE.w + RUN_OUT, ROW_Y + 16, FLOOR],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const square = (cx, cy, w, d, r) => ({ x: cx - w / 2, y: cy - d / 2, w, d, r });

function strip() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(STRIP, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(STRIP, 0, STRIP_H, P, 8, 1.2), { tone: "mid" }),
    line(k.sideSeam(STRIP, 4, P, 8), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(STRIP, 3), TOP, P, 6), { tone: "faint" }),
    screws(
      [
        [STRIP.x + 7, ROW_Y],
        [STRIP.x + STRIP.w - 6, ROW_Y],
      ],
      TOP,
      P,
      1.3,
    ),
  ];
  for (const x of SOCKETS) {
    out.push(
      line(k.ring(x, ROW_Y, SOCKET_R, TOP, P, 36), { tone: "lo" }),
      line(k.ring(x, ROW_Y, SOCKET_R - 1.6, TOP, P, 32), { tone: "faint" }),
      dots([at([x - 3.4, ROW_Y, TOP]), at([x + 3.4, ROW_Y, TOP])], {
        size: 0.9,
        tone: "hi",
      }),
    );
  }
  // The master rocker switch and its pilot lamp.
  const frame = square(SWITCH_X, ROW_Y, 10, 16, 1.6);
  out.push(
    solid(k.slabOf(frame, TOP, 1.2, P, 2), { tone: "mid" }),
    solid(k.slabOf(k.insetPlan(frame, 1.6), TOP + 1.2, 2.4, P, 2, 0.3), {
      tone: "lo",
    }),
    line(
      k.lineOnTop(
        [frame.x + 2, ROW_Y],
        [frame.x + frame.w - 2, ROW_Y],
        TOP + 3.6,
        P,
      ),
      { tone: "mid" },
    ),
    lamp([SWITCH_X - 12, ROW_Y + 8], TOP, P, { radius: 1.6 }),
  );
  return out.join("");
}

/** A round plug: a ribbed barrel with a capped strain relief. */
function roundPlug(x) {
  const top = TOP + 16;
  return [
    solid(k.cylinder(x, ROW_Y, 8, TOP, 16, P, 36, 0.6), { tone: "mid" }),
    line(k.knurl(x, ROW_Y, 8, TOP + 3, TOP + 11, 30, P), { tone: "faint" }),
    solid(k.cylinder(x, ROW_Y, 3.4, top, 4, P, 20), { tone: "mid" }),
  ].join("");
}

/** An adapter brick with a vented top. */
function brick(x) {
  const plan = square(x, ROW_Y, 22, 26, 3);
  const top = TOP + 20;
  const out = [solid(k.slabOf(plan, TOP, 20, P, 4, 0.8), { tone: "mid" })];
  out.push(line(k.sideSeam(plan, TOP + 5, P, 4), { tone: "faint" }));
  for (let i = 0; i < 5; i++) {
    const vx = plan.x + 5 + i * 3;
    out.push(
      line(k.lineOnTop([vx, plan.y + 6], [vx, plan.y + 16], top, P), {
        tone: "lo",
      }),
    );
  }
  return out.join("");
}

/** A square plug, the lit one, with grip ridges on its near side. */
function squarePlug(x) {
  const plan = square(x, ROW_Y, 16, 16, 2.4);
  const face = plan.x + plan.w;
  const out = [
    solid(k.slabOf(plan, TOP, 15, P, 3, 0.8), {
      tone: "hi",
      lit: true,
      crease: "lo",
    }),
  ];
  for (let i = 0; i < 4; i++) {
    const z = TOP + 4 + i * 2.4;
    out.push(
      line(k.segment([face, plan.y + 4, z], [face, plan.y + 12, z], P), {
        tone: "lo",
        free: true,
      }),
    );
  }
  return out.join("");
}

/** A right-angle plug lying low, its cable leaving toward the viewer. */
function anglePlug(x) {
  const plan = { x: x - 7, y: ROW_Y - 7, w: 14, d: 22, r: 3 };
  return [
    solid(k.slabOf(plan, TOP, 8, P, 4, 0.6), { tone: "mid" }),
    line(k.sideSeam(plan, TOP + 4, P, 4), { tone: "faint" }),
    solid(
      k.slabOf(
        { x: x - 3, y: plan.y + plan.d, w: 6, d: 5, r: 2 },
        TOP + 1.5,
        5,
        P,
        3,
      ),
      { tone: "lo" },
    ),
  ].join("");
}

/** A cable that runs to the plate's near edge and fades as it goes over. */
function lead(from, lean, rise = 0) {
  const [x0, y0, z0] = from;
  const points = [];
  const steps = 24;
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const y = y0 + (EDGE - 2 - y0) * t;
    const x = x0 + lean * Math.sin((Math.PI / 2) * t);
    const z =
      t < 0.4
        ? z0 +
          (0.8 - z0) * Math.sin((Math.PI / 2) * (t / 0.4)) +
          rise * Math.sin(Math.PI * (t / 0.4))
        : 0.8;
    points.push(at([x, y, z]));
  }
  // Over the lip, down the plate's face and out across the paper.
  const x = x0 + lean;
  points.push(
    at([x, EDGE + 1, 0]),
    at([x, EDGE + 3, -3]),
    at([x, EDGE + 5, FLOOR + 1]),
    at([x - 2, EDGE + RUN_OUT, FLOOR + 0.5]),
  );
  return k.fadeLineSvg(points, { fade: [0, FADE], tone: "mid" });
}

function cables() {
  return [
    lead([SOCKETS[0], ROW_Y + 8, TOP + 8], -10, 3),
    lead([SOCKETS[1], ROW_Y + 13, TOP + 6], -2),
    lead([SOCKETS[3], ROW_Y + 8, TOP + 7], 6),
    lead([SOCKETS[4], ROW_Y + 20, TOP + 4], 16),
  ].join("");
}

/** The strip's own cord leaves its near end and drops off the plate's side. */
function cord() {
  const end = STRIP.x + STRIP.w;
  const side = PLATE.x + PLATE.w;
  const points = [
    at([end, ROW_Y + 4, 5]),
    at([end + 4, ROW_Y + 5, 3]),
    at([end + 7, ROW_Y + 7, 0.8]),
    at([side - 1, ROW_Y + 10, 0.8]),
    at([side + 1, ROW_Y + 11, 0]),
    at([side + 3, ROW_Y + 12, -3]),
    at([side + 5, ROW_Y + 13, FLOOR + 1]),
    at([side + RUN_OUT, ROW_Y + 16, FLOOR + 0.5]),
  ];
  return k.fadeLineSvg(points, { fade: [0, 40], tone: "mid" });
}

export function figure() {
  const plugs = byDepth(
    [
      [SOCKETS[0], ROW_Y, roundPlug],
      [SOCKETS[1], ROW_Y, brick],
      [SOCKETS[3], ROW_Y, squarePlug],
      [SOCKETS[4], ROW_Y, anglePlug],
    ],
    P,
  );
  return {
    label:
      "A power strip on a bench plate with four different plugs in its sockets and one socket free; the cables lead off the plate and one square plug is lit.",
    body: [
      benchPlate(PLATE, P),
      strip(),
      cord(),
      ...plugs.map(([x, , draw]) => draw(x)),
      cables(),
    ],
  };
}
