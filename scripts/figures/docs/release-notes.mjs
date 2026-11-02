/*
 * "Release notes": what changed in each build, drawn as a slip printer. A
 * squat printer stands on its feet with a row of channel lamps and a feed knob
 * on its deck; a ruled slip (the lit part) rises out of its slot behind the
 * tear bar, and the slips torn off before it lie stacked on the bench beside it.
 */

import { byDepth, dots, k, knob, lamp, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const BODY = { x: -62, y: -34, w: 92, d: 68, r: 10 };
const FOOT_H = 4;
const BODY_H = 30;
const TOP = BODY_H;
const SLOT = { x: BODY.x + 10, y: BODY.y + 16, w: 72, d: 5, r: 1.5 };
const SLIP_X = SLOT.x + 4;
const SLIP_W = SLOT.w - 8;
const SLIP_Y = SLOT.y + 2;
const SLIP_D = 0.8;
const SLIP_H = 74;
const BAR = { x: SLOT.x - 2, y: SLOT.y + SLOT.d, w: SLOT.w + 4, d: 3, r: 1 };
const LAMP_Y = BODY.y + BODY.d - 12;
const LAMP_X = [BODY.x + 14, BODY.x + 24, BODY.x + 34];
const STACK = { x: 44, y: -26, w: 40, d: 56, r: 1.2 };
const STACK_SLIPS = 6;
const STACK_SLIP_H = 1.1;

const P = k.fitProjection(
  [
    ...k.boxCorners(BODY, -FOOT_H, TOP),
    ...k.boxCorners(STACK, -FOOT_H, STACK_SLIPS * STACK_SLIP_H),
    [SLIP_X, SLIP_Y, TOP + SLIP_H],
    [SLIP_X + SLIP_W, SLIP_Y + SLIP_D, TOP + SLIP_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A straight rule on the vertical face `y` at height `z`. */
const faceRule = (x0, x1, z, y) => k.segment([x0, y, z], [x1, y, z], P);

function body() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BODY, -FOOT_H, FOOT_H, P)}"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(BODY, 14), P)) {
    out.push(
      solid(k.cylinder(x, y, 5, -FOOT_H, FOOT_H, P, 24), { tone: "lo" }),
    );
  }
  out.push(
    solid(k.slabOf(BODY, 0, BODY_H, P, 8, 1.4), { tone: "mid" }),
    line(k.sideSeam(BODY, 8, P, 8), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(BODY, 5), TOP, P, 6), { tone: "faint" }),
    screws(k.corners(BODY, 9), TOP, P, 1.3),
    // The paper slot: a dark throat with a lip around it.
    solid(k.slabOf(SLOT, TOP - 0.2, 0.2, P, 3), { tone: "lo", crease: "none" }),
    line(k.planOutline(k.insetPlan(SLOT, -1.6), TOP, P, 3), { tone: "lo" }),
  );
  return out.join("");
}

/** The slip rising out of the slot, ruled into entries under short headings. */
function slip() {
  const plan = { x: SLIP_X, y: SLIP_Y, w: SLIP_W, d: SLIP_D, r: 0.2 };
  const face = SLIP_Y + SLIP_D;
  const top = TOP + SLIP_H;
  const left = SLIP_X + 6;
  const out = [
    solid(k.slabOf(plan, TOP - 2, SLIP_H + 2, P, 2), {
      tone: "hi",
      lit: true,
      crease: "lo",
    }),
    // The perforation the next tear follows.
    line(faceRule(SLIP_X + 1, SLIP_X + SLIP_W - 1, top - 5, face), {
      tone: "mid",
      dotted: true,
    }),
  ];
  const bullets = [];
  let z = top - 12;
  for (const entries of [
    [44, 50, 36],
    [48, 30],
    [52, 40, 46],
  ]) {
    out.push(
      line(faceRule(left, left + 22, z, face), { tone: "hi", free: true }),
    );
    z -= 5;
    for (const width of entries) {
      bullets.push(at([left + 1, face, z]));
      out.push(
        line(faceRule(left + 4, left + 4 + width, z, face), {
          tone: "lo",
          free: true,
        }),
      );
      z -= 4;
    }
    z -= 3;
  }
  out.push(dots(bullets, { size: 0.5, tone: "lo" }));
  return out.join("");
}

/** The deck in front of the slip: the tear bar, channel lamps and feed knob. */
function deck() {
  const ticks = k.topTicks(
    BAR.x + 2,
    BAR.x + BAR.w - 2,
    2,
    4,
    BAR.y + BAR.d,
    TOP + 1.4,
    [0.8, 1.4],
    P,
  );
  return [
    solid(k.slabOf(BAR, TOP, 1.4, P, 2), { tone: "mid", crease: "lo" }),
    line(ticks.minor, { tone: "faint" }),
    line(ticks.major, { tone: "lo" }),
    ...LAMP_X.map((x) => lamp([x, LAMP_Y], TOP, P, { radius: 2 })),
    knob([BODY.x + BODY.w - 16, LAMP_Y - 2], TOP, P, { radius: 6 }),
  ].join("");
}

/** The slips already torn off, squared into a stack on the bench. */
function stack() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(STACK, 0, 1, P)}"/>`,
  ];
  for (let i = 0; i < STACK_SLIPS; i++) {
    const shift = i % 2 === 0 ? 0 : 1.4;
    const plan = { ...STACK, x: STACK.x + shift, y: STACK.y - shift / 2 };
    out.push(
      solid(k.slabOf(plan, i * STACK_SLIP_H, STACK_SLIP_H, P, 2), {
        tone: "mid",
        crease: "faint",
      }),
    );
  }
  const top = STACK_SLIPS * STACK_SLIP_H;
  const plan = { x: STACK.x + 1.4, y: STACK.y - 0.7 };
  out.push(
    line(k.lineOnTop([plan.x + 6, plan.y + 8], [plan.x + 24, plan.y + 8], top, P), {
      tone: "lo",
    }),
  );
  for (const [i, width] of [28, 22, 30, 18, 26, 24].entries()) {
    const y = plan.y + 15 + i * 6;
    out.push(
      line(k.lineOnTop([plan.x + 6, y], [plan.x + 6 + width, y], top, P), {
        tone: "faint",
      }),
    );
  }
  return out.join("");
}

export function figure() {
  const printer = () => body() + slip() + deck();
  const parts = byDepth(
    [
      [BODY.x + BODY.w / 2, BODY.y + BODY.d / 2, printer],
      [STACK.x + STACK.w / 2, STACK.y + STACK.d / 2, stack],
    ],
    P,
  );
  return {
    label:
      "A slip printer: a lit, ruled slip rises out of its slot behind the tear bar, with channel lamps and a feed knob on the deck, and the slips torn off before it lie stacked beside it.",
    body: parts.map(([, , draw]) => draw()),
  };
}
