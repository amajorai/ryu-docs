/*
 * "Skills": packaged instructions an agent loads on demand, drawn as a card
 * index box. Ruled cards stand in an open box between tabbed dividers; one
 * card (the lit part) is drawn up out of the file, ready to be read.
 */

import { k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const BOX = { x: -44, y: -66, w: 88, d: 132, r: 3 };
const WALL = 3;
const FLOOR_H = 3;
const BOX_H = 24;
const LIP = BOX_H - 4;
const CARD_X = BOX.x + WALL + 3;
const CARD_W = BOX.w - (WALL + 3) * 2;
const CARD_D = 1.1;
const CARD_H = 36;
const CARD_STEP = 6.2;
const CARD_COUNT = 18;
const FIRST_CARD_Y = BOX.y + WALL + 5;
const DIVIDER_EVERY = 4;
const TAB_W = 18;
const TAB_H = 6;
const TAB_SLOTS = [6, 28, 50];
const RAISED = 10;
const LIFT = 30;

const P = k.fitProjection(
  [
    ...k.boxCorners(BOX, 0, BOX_H),
    [CARD_X, FIRST_CARD_Y, FLOOR_H + CARD_H + TAB_H],
    [
      CARD_X + CARD_W,
      FIRST_CARD_Y + RAISED * CARD_STEP,
      FLOOR_H + CARD_H + TAB_H + LIFT,
    ],
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

const walls = {
  back: { x: BOX.x, y: BOX.y, w: BOX.w, d: WALL, r: 1 },
  left: { x: BOX.x, y: BOX.y, w: WALL, d: BOX.d, r: 1 },
  front: { x: BOX.x, y: BOX.y + BOX.d - WALL, w: BOX.w - WALL, d: WALL, r: 1 },
  right: { x: BOX.x + BOX.w - WALL, y: BOX.y, w: WALL, d: BOX.d, r: 1 },
};

const wall = (plan) =>
  solid(k.slabOf(plan, FLOOR_H, BOX_H - FLOOR_H, P, 2, 0.4), { tone: "mid" });

function boxFloor() {
  return [
    `<path class="iso-halo" d="${k.haloOf(BOX, 0, 2, P)}"/>`,
    solid(k.slabOf(BOX, 0, FLOOR_H, P, 4, 0.6), { tone: "mid" }),
    wall(walls.back),
    wall(walls.left),
  ].join("");
}

/** One card standing at `y` with its bottom edge at `z`. */
function card(y, z, { tab, lit = false }) {
  const plan = { x: CARD_X, y, w: CARD_W, d: CARD_D, r: 0.3 };
  const top = z + CARD_H;
  const out = [
    solid(k.slabOf(plan, z, CARD_H, P, 2), {
      tone: lit ? "hi" : "mid",
      lit,
      crease: tab === undefined ? "faint" : "lo",
    }),
  ];
  if (tab !== undefined) {
    const tabPlan = { x: CARD_X + tab, y, w: TAB_W, d: CARD_D, r: 0.3 };
    out.push(
      solid(k.slabOf(tabPlan, top, TAB_H, P, 2), {
        tone: lit ? "hi" : "mid",
        lit,
        crease: "lo",
      }),
    );
  }
  if (lit) {
    // Ruled lines and a heading bar on the face of the drawn card.
    const face = y + CARD_D;
    out.push(
      line(
        k.segment([CARD_X + 6, face, top - 6], [CARD_X + 30, face, top - 6], P),
        { tone: "hi" },
      ),
    );
    for (const [i, width] of [56, 50, 58, 40, 52].entries()) {
      const rule = top - 12 - i * 4.6;
      out.push(
        line(
          k.segment(
            [CARD_X + 6, face, rule],
            [CARD_X + 6 + width, face, rule],
            P,
          ),
          { tone: "lo", free: true },
        ),
      );
    }
  }
  return out.join("");
}

function cards() {
  const out = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const y = FIRST_CARD_Y + i * CARD_STEP;
    if (i === RAISED) {
      out.push(card(y, FLOOR_H + LIFT, { tab: TAB_SLOTS[1], lit: true }));
      continue;
    }
    const divider = i % DIVIDER_EVERY === 0;
    const tab = divider
      ? TAB_SLOTS[(i / DIVIDER_EVERY) % TAB_SLOTS.length]
      : undefined;
    out.push(card(y, FLOOR_H, { tab }));
  }
  return out.join("");
}

/** The front of the box: a label frame and a drawer pull. */
function front() {
  const face = BOX.y + BOX.d;
  const mid = BOX.x + BOX.w / 2;
  const pull = { x: mid - 11, y: face, w: 22, d: 2.6, r: 1 };
  return [
    wall(walls.front),
    wall(walls.right),
    line(faceRect(mid - 15, mid + 15, 12.5, 19.5, face), { tone: "lo" }),
    line(faceRect(mid - 13, mid + 13, 13.7, 18.3, face), { tone: "faint" }),
    solid(k.slabOf(pull, 6.5, 3.5, P, 3, 0.3), { tone: "mid", crease: "lo" }),
    screws(
      [
        [mid - 14, face],
        [mid + 14, face],
      ],
      10,
      P,
      0.8,
    ),
    line(k.sideSeam(BOX, FLOOR_H, P, 2), { tone: "faint" }),
    line(k.sideSeam(BOX, LIP, P, 2), { tone: "faint" }),
    screws(k.corners(BOX, 1.5).slice(1), BOX_H, P, 0.9),
  ].join("");
}

export function figure() {
  return {
    label:
      "A card index box: ruled cards stand between tabbed dividers in an open box, and one lit card is drawn up out of the file.",
    body: [boxFloor(), cards(), front()],
  };
}
