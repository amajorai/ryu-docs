/*
 * "Plugins": capabilities that slot into Ryu, drawn as a cartridge console.
 * A low base carries a row of slots; cartridges stand seated in most of them,
 * and one (the lit part) is caught mid-insertion above its slot, contacts
 * showing.
 */

import {
  byDepth,
  dots,
  k,
  knob,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const BASE = { x: -100, y: -44, w: 200, d: 84, r: 10 };
const FOOT_H = 4;
const BASE_H = 20;
const TOP = BASE_H;
const SLOT_X = [-86, -50, -14, 22, 58];
const CART_W = 28;
const CART_D = 8;
const CART_H = 42;
const SLOT_Y = -16;
const INSERTING = 3;
const LIFT = 22;
const LAMP_Y = SLOT_Y + CART_D + 9;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -FOOT_H, TOP),
    [SLOT_X[0], SLOT_Y, TOP + CART_H + 2],
    [SLOT_X[INSERTING] + CART_W, SLOT_Y, TOP + CART_H + LIFT + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the vertical face `y` between x0..x1 and z0..z1. */
const faceRect = (x0, x1, z0, z1, y) =>
  k.pathOf(
    [
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ].map(at),
    true,
  );
const slotPlan = (x) => ({
  x: x - 2,
  y: SLOT_Y - 2,
  w: CART_W + 4,
  d: CART_D + 4,
  r: 2,
});

function base() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BASE, -FOOT_H, FOOT_H, P)}"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(BASE, 18), P)) {
    out.push(
      solid(k.cylinder(x, y, 5, -FOOT_H, FOOT_H, P, 24), { tone: "lo" }),
    );
  }
  out.push(
    solid(k.slabOf(BASE, 0, BASE_H, P, 8, 1.4), { tone: "mid" }),
    line(k.sideSeam(BASE, 7, P, 8), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(BASE, 5), TOP, P, 6), { tone: "faint" }),
    screws(k.corners(BASE, 9), TOP, P, 1.3),
  );
  for (const x of SLOT_X) {
    const slot = slotPlan(x);
    out.push(
      line(k.planOutline(slot, TOP, P, 3), { tone: "lo" }),
      line(k.planOutline(k.insetPlan(slot, 1.6), TOP, P, 3), {
        tone: "faint",
      }),
      lamp([x + CART_W / 2, LAMP_Y], TOP, P, { radius: 1.8 }),
    );
  }
  // A shared bus rail that every slot feeds, with pitch marks.
  const bus = { x: BASE.x + 12, y: LAMP_Y + 7, w: 150, d: 5, r: 1 };
  const ticks = k.topTicks(
    bus.x + 3,
    bus.x + bus.w - 3,
    4,
    9,
    bus.y + 1,
    TOP + 0.8,
    [1.6, 3],
    P,
  );
  out.push(
    solid(k.slabOf(bus, TOP, 0.8, P, 2), { tone: "lo", crease: "none" }),
    line(ticks.minor, { tone: "faint" }),
    line(ticks.major, { tone: "lo" }),
  );
  out.push(
    knob([BASE.x + BASE.w - 18, BASE.y + BASE.d - 16], TOP, P, { radius: 5 }),
  );
  return out.join("");
}

/** The open throat of the slot the lifted cartridge is leaving. */
function openSlot(x) {
  const slot = k.insetPlan(slotPlan(x), 1.6);
  return [
    solid(k.slabOf(slot, TOP - 0.2, 0.2, P, 3), {
      tone: "lo",
      crease: "none",
    }),
    dots(
      Array.from({ length: 6 }, (_, i) =>
        at([slot.x + 4 + i * ((slot.w - 8) / 5), slot.y + slot.d / 2, TOP]),
      ),
      { size: 0.6, tone: "hi" },
    ),
  ].join("");
}

/** One cartridge with its bottom edge at `z`. */
function cartridge(x, z, lit = false) {
  const plan = { x, y: SLOT_Y, w: CART_W, d: CART_D, r: 1.6 };
  const face = SLOT_Y + CART_D;
  const top = z + CART_H;
  const out = [
    solid(k.slabOf(plan, z, CART_H, P, 3, 0.6), {
      tone: lit ? "hi" : "mid",
      lit,
      crease: "lo",
    }),
    // The label recess and the grip ridges above it.
    line(faceRect(x + 4, x + CART_W - 4, z + 8, top - 12, face), {
      tone: "lo",
    }),
  ];
  for (let i = 0; i < 3; i++) {
    const ridge = top - 4 - i * 2.4;
    out.push(
      line(k.segment([x + 6, face, ridge], [x + CART_W - 6, face, ridge], P), {
        tone: "faint",
        free: true,
      }),
    );
  }
  if (lit) {
    // Contact fingers along the bottom edge, visible while it is out.
    const fingers = [];
    for (let i = 0; i < 7; i++) {
      const fx = x + 5 + i * 3;
      fingers.push(k.segment([fx, face, z + 0.8], [fx, face, z + 4.5], P));
    }
    out.push(line(fingers.join(""), { tone: "hi" }));
  }
  return out.join("");
}

/** Dotted guides from the lifted cartridge's near face down to its slot. */
function guides(x) {
  const face = SLOT_Y + CART_D;
  return [x + CART_W / 2, x + CART_W]
    .map((gx) =>
      line(k.segment([gx, face, TOP + LIFT - 1], [gx, face, TOP + 1.5], P), {
        tone: "mid",
        dotted: true,
      }),
    )
    .join("");
}

export function figure() {
  const lifted = SLOT_X[INSERTING];
  const standing = SLOT_X.map((x, i) =>
    i === INSERTING
      ? [
          x + CART_W / 2,
          SLOT_Y,
          () => guides(x) + cartridge(x, TOP + LIFT, true),
        ]
      : [x + CART_W / 2, SLOT_Y, () => cartridge(x, TOP)],
  );
  return {
    label:
      "A cartridge console: a low base with a row of slots, cartridges seated in four of them and one lit cartridge caught mid-insertion above its slot.",
    body: [
      base(),
      openSlot(lifted),
      ...byDepth(standing, P).map(([, , draw]) => draw()),
    ],
  };
}
