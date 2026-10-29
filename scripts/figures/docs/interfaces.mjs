/*
 * "Interfaces": one workspace shown through different layouts, drawn as three
 * glass panes floating in a stack over a bench plate. The lowest pane is a
 * board of columns and cards, the middle one (the lit part) a canvas of linked
 * nodes, and the top one a chat of alternating messages.
 */

import { benchPlate, dots, k, line, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -92, y: -92, w: 184, d: 184, r: 10 };
const KEYS_Y = 68;
const KEY = 11;
const KEY_GAP = 15;
const PANE_W = 112;
const PANE_D = 84;
const PANE_T = 3;
const RISE = 30;
const FIRST_Z = 18;
const STEP = 24;
const SHIFT = 8;

/** The plan of pane `i` (0 is lowest), stepping back as it rises. */
const paneOf = (i) => ({
  x: -PANE_W / 2 + (1 - i) * STEP + SHIFT,
  y: -PANE_D / 2 + (1 - i) * STEP + SHIFT,
  w: PANE_W,
  d: PANE_D,
  r: 4,
});
const zOf = (i) => FIRST_Z + i * RISE;
const TOP_PANE = paneOf(2);

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    ...k.boxCorners(TOP_PANE, zOf(2), zOf(2) + PANE_T),
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const shadow = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(6px)"/>`;

/** A rounded outline drawn on a pane's top face. */
const outline = (plan, z, tone = "lo") =>
  line(k.planOutline(plan, z, P, 3), { tone });

/** The pane's glass and bezel; the screen area starts below a header rule. */
function glass(plan, z, style) {
  const top = z + PANE_T;
  const inner = k.insetPlan(plan, 4);
  return [
    solid(k.slabOf(plan, z, PANE_T, P, 4, 0.5), style),
    outline(inner, top, "faint"),
    line(
      k.lineOnTop(
        [inner.x + 9, inner.y],
        [inner.x + 9, inner.y + inner.d],
        top,
        P,
      ),
      { tone: "faint" },
    ),
    dots(
      [0, 1, 2].map((n) =>
        at([inner.x + 4.5, inner.y + inner.d - 4 - n * 3.4, top]),
      ),
      { size: 0.6 },
    ),
  ].join("");
}

/** Board: three columns of cards. */
function board(plan, top) {
  const out = [];
  const column = (plan.d - 8 - 8) / 3;
  for (let c = 0; c < 3; c++) {
    const y = plan.y + 4 + 2 + c * (column + 2);
    out.push(
      outline(
        { x: plan.x + 16, y, w: plan.w - 22, d: column, r: 1.5 },
        top,
        "faint",
      ),
    );
    for (let card = 0; card < 3 - (c % 2); card++) {
      out.push(
        outline(
          {
            x: plan.x + 19 + card * 18,
            y: y + 2.5,
            w: 15,
            d: column - 5,
            r: 1.2,
          },
          top,
        ),
      );
    }
  }
  return out.join("");
}

/** Canvas: a dot grid with linked nodes. */
function canvas(plan, top) {
  const nodes = [
    [plan.x + 30, plan.y + 58],
    [plan.x + 52, plan.y + 26],
    [plan.x + 80, plan.y + 52],
  ];
  const out = [
    dots(k.dotGrid(plan.x + 18, plan.y + 10, 11, 8, 8.6, top, P), {
      size: 0.4,
      tone: "lo",
    }),
    line(
      k.onTop(
        [nodes[0], [nodes[1][0], nodes[0][1]], nodes[1], nodes[2]],
        top,
        P,
      ),
      { tone: "mid" },
    ),
  ];
  for (const [x, y] of nodes) {
    out.push(
      solid(
        k.slabOf({ x: x - 5, y: y - 7, w: 10, d: 14, r: 1.5 }, top, 1.4, P, 2),
        {
          tone: "mid",
        },
      ),
    );
  }
  out.push(
    line(k.ring(plan.x + 86, plan.y + 22, 6, top, P, 32), { tone: "mid" }),
  );
  return out.join("");
}

/** Chat: alternating message bubbles over a composer bar. */
function chat(plan, top) {
  const near = plan.y + plan.d - 8;
  const far = plan.y + 8;
  const bubbles = [
    [18, near - 46, 46],
    [32, far, 40],
    [46, near - 52, 52],
    [64, far, 30],
  ];
  const out = [];
  for (const [x, y, d] of bubbles) {
    out.push(outline({ x: plan.x + x, y, w: 9, d, r: 2.5 }, top));
  }
  out.push(
    outline(
      { x: plan.x + plan.w - 16, y: far, w: 9, d: near - far, r: 4.5 },
      top,
      "mid",
    ),
  );
  return out.join("");
}

const LAYOUTS = [board, canvas, chat];

/** A selector of three keys on the plate, one per layout; the middle is down. */
function selector() {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const plan = { x: -54 + i * KEY_GAP, y: KEYS_Y, w: KEY, d: KEY, r: 1.5 };
    const height = i === 1 ? 0.6 : 3.4;
    out.push(
      solid(k.slabOf(k.insetPlan(plan, -1.2), 0, 0.8, P, 3), {
        tone: "lo",
        crease: "none",
      }),
      solid(k.slabOf(plan, 0.8, height, P, 3, 0.4), { tone: "mid" }),
      line(k.planOutline(k.insetPlan(plan, 2.2), 0.8 + height, P, 2), {
        tone: "faint",
      }),
    );
  }
  return out.join("");
}

function pane(i) {
  const plan = paneOf(i);
  const z = zOf(i);
  const lit = i === 1;
  return [
    glass(plan, z, lit ? { tone: "hi", lit: true } : { tone: "mid" }),
    LAYOUTS[i](k.insetPlan(plan, 4), z + PANE_T),
  ].join("");
}

export function figure() {
  return {
    label:
      "Three panes floating in a stack over a bench plate with a three-key selector: a board of cards at the bottom, a lit canvas of linked nodes in the middle and a chat of messages on top.",
    body: [
      benchPlate(PLATE, P),
      selector(),
      ...[0, 1, 2].map((i) => shadow(k.insetPlan(paneOf(i), 6))),
      ...[0, 1, 2].map(pane),
    ],
  };
}
