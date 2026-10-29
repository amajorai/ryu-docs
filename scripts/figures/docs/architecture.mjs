/*
 * "Architecture": the layered stack, drawn as a stepped terrace of four tiers.
 * The engines' drums sit on the lowest, widest tier, Core (the lit unit) on the
 * next, the Gateway's patch panel above it and the surfaces on the top; leads
 * climb every riser from one tier to the next.
 */

import { cable, jack, k, knob, lamp, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const TIERS = 4;
const STEP = 52;
const BACK = -104;
const SPAN = { y: -58, d: 116 };
const TIER_H = 13;
const SIDE_INSET = 3;
const TOP = TIERS * TIER_H;

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: BACK, y: SPAN.y, w: STEP * TIERS, d: SPAN.d }, -4, 0),
    [BACK, SPAN.y, TOP + 34],
    [BACK, SPAN.y + SPAN.d, TOP + 34],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** Tier `i` (0 is the lowest): its plan, base and top heights, open strip. */
function tier(i) {
  const inset = i * SIDE_INSET;
  const plan = {
    x: BACK,
    y: SPAN.y + inset,
    w: STEP * (TIERS - i),
    d: SPAN.d - inset * 2,
    r: 3,
  };
  const z = i * TIER_H;
  const strip = { x0: plan.x + plan.w - STEP, x1: plan.x + plan.w };
  return { plan, z, top: z + TIER_H, strip, cx: (strip.x0 + strip.x1) / 2 };
}

function block(i) {
  const { plan, z, top } = tier(i);
  return [
    solid(k.slabOf(plan, z, TIER_H, P, 6, 0.8), { tone: "mid" }),
    line(k.sideSeam(plan, z + 3, P, 6), { tone: "faint" }),
    line(
      k.planOutline(
        {
          x: plan.x + plan.w - STEP + 4,
          y: plan.y + 4,
          w: STEP - 8,
          d: plan.d - 8,
          r: 2,
        },
        top,
        P,
        3,
      ),
      { tone: "faint" },
    ),
    screws(
      [
        [plan.x + plan.w - 5, plan.y + 5],
        [plan.x + plan.w - 5, plan.y + plan.d - 5],
      ],
      top,
      P,
      1.3,
    ),
  ].join("");
}

function base() {
  const plan = {
    x: BACK - 4,
    y: SPAN.y - 4,
    w: STEP * TIERS + 8,
    d: SPAN.d + 8,
    r: 5,
  };
  return [
    `<path class="iso-halo" d="${k.haloOf(plan, -4, 4, P)}"/>`,
    solid(k.slabOf(plan, -4, 4, P, 6, 0.4), { tone: "lo" }),
  ].join("");
}

/** A lead from tier `i` up the riser onto tier `i + 1`, at plan y `y`. */
function lead(i, y, from = 4) {
  const lower = tier(i);
  const upper = tier(i + 1);
  const riser = upper.strip.x1;
  const z0 = lower.top + 0.6;
  const z1 = upper.top + 0.6;
  return cable(
    [lower.cx + from, y, z0],
    [riser - 6, y, z1],
    [
      [riser + 3, y, z0],
      [riser + 0.6, y, z0 + 2],
      [riser + 0.6, y, z1 - 2],
      [riser - 2, y, z1],
    ],
    P,
    { tone: "mid" },
  );
}

/** A closed outline on the vertical face `x` between y0..y1 and z0..z1. */
const faceX = (y0, y1, z0, z1, x) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );

/** Engines: three drums with knurled bands and a shaft on top. */
function engines(cx, z) {
  const out = [];
  for (const y of [-28, 0, 28]) {
    out.push(
      solid(k.cylinder(cx, y, 13, z, 2, P, 40), { tone: "lo" }),
      solid(k.cylinder(cx, y, 11.5, z + 2, 15, P, 48, 0.6), { tone: "mid" }),
      line(k.knurl(cx, y, 11.5, z + 6, z + 12, 40, P), { tone: "lo" }),
      line(k.ring(cx, y, 7, z + 17, P, 32), { tone: "faint" }),
      solid(k.cylinder(cx, y, 2.2, z + 17, 4, P, 16), { tone: "mid" }),
    );
  }
  return out.join("");
}

/** Core: the lit unit with vents, a lamp, a knob and output jacks. */
function core(cx, z) {
  const box = { x: cx - 18, y: -38, w: 36, d: 76, r: 4 };
  const top = z + 20;
  const lid = k.insetPlan(box, 2);
  const out = [
    solid(k.slabOf(box, z, 3, P, 6, 0.4), { tone: "lo" }),
    solid(k.slabOf(lid, z + 3, 17, P, 6, 0.8), {
      tone: "hi",
      crease: "lo",
      lit: true,
    }),
  ];
  for (let i = 0; i < 6; i++) {
    const x = lid.x + 7 + i * 3.2;
    out.push(
      line(k.lineOnTop([x, lid.y + 8], [x, lid.y + 30], top, P), {
        tone: "lo",
      }),
    );
  }
  out.push(
    lamp([cx, lid.y + lid.d - 10], top, P),
    knob([cx, lid.y + lid.d - 24], top, P, { radius: 4.4 }),
    screws(k.corners(lid, 3.5), top, P, 1.3),
  );
  for (const y of [-2, 8]) {
    out.push(jack([cx + 8, y], top, P));
  }
  return out.join("");
}

/** Gateway: a patch panel with a row of jacks and a routing dial. */
function gateway(cx, z) {
  const panel = { x: cx - 11, y: -42, w: 22, d: 84, r: 2 };
  const top = z + 9;
  const row = cx - 2;
  const out = [
    solid(k.slabOf(panel, z, 9, P, 4, 0.6), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(panel, 3), top, P, 3), { tone: "faint" }),
    screws(k.corners(panel, 3.5), top, P, 1.1),
  ];
  for (let i = 0; i < 7; i++) {
    out.push(jack([row, panel.y + 12 + i * 8], top, P));
  }
  out.push(
    knob([cx, panel.y + panel.d - 11], top, P, { radius: 5, height: 4 }),
    k.wireSvg(at([row, panel.y + 20, top]), at([row, panel.y + 52, top]), {
      via: [at([row + 8, panel.y + 36, top + 6])],
      tone: "mid",
    }),
  );
  return out.join("");
}

/** Surfaces: a screen, a phone and a terminal puck on the top tier. */
function surfaces(cx, z) {
  const screen = { x: cx - 14, y: -30, w: 4, d: 50, r: 1.2 };
  const phone = { x: cx - 12, y: 28, w: 3.5, d: 17, r: 1.6 };
  const face = (plan) => plan.x + plan.w;
  const out = [
    solid(k.slabOf({ x: cx - 20, y: -14, w: 10, d: 18, r: 1 }, z, 10, P, 3), {
      tone: "mid",
    }),
    solid(k.slabOf(screen, z + 4, 30, P, 3, 0.4), { tone: "mid" }),
    line(
      faceX(screen.y + 3, screen.y + screen.d - 3, z + 7, z + 31, face(screen)),
      {
        tone: "lo",
      },
    ),
  ];
  for (const [i, width] of [30, 38, 22].entries()) {
    const lz = z + 27 - i * 6;
    out.push(
      line(
        k.segment(
          [face(screen), screen.y + 6, lz],
          [face(screen), screen.y + 6 + width, lz],
          P,
        ),
        {
          tone: i === 0 ? "mid" : "faint",
          free: true,
        },
      ),
    );
  }
  out.push(
    solid(
      k.slabOf(
        { x: phone.x - 2, y: phone.y - 2, w: 9, d: 21, r: 1.4 },
        z,
        4,
        P,
        3,
      ),
      {
        tone: "mid",
      },
    ),
    solid(k.slabOf(phone, z + 4, 28, P, 4, 0.4), { tone: "mid" }),
    line(
      faceX(phone.y + 2, phone.y + phone.d - 2, z + 7, z + 29, face(phone)),
      {
        tone: "lo",
      },
    ),
  );
  const [px, py] = [cx + 10, -38];
  out.push(
    solid(k.cylinder(px, py, 11, z, 3, P, 48), { tone: "lo" }),
    solid(k.cylinder(px, py, 9.8, z + 3, 5, P, 48, 0.6), { tone: "mid" }),
    // A prompt caret and a cursor block, as on the dock's terminal puck.
    line(
      k.onTop(
        [
          [px - 5, py - 3],
          [px - 2.5, py - 0.5],
          [px - 5, py + 2],
        ],
        z + 8,
        P,
      ),
      { tone: "mid" },
    ),
    solid(
      k.slabOf(
        { x: px - 0.5, y: py - 1.2, w: 4, d: 2.4, r: 0.3 },
        z + 8,
        0.4,
        P,
        2,
      ),
      { tone: "mid", crease: "none" },
    ),
  );
  return out.join("");
}

export function figure() {
  const levels = [engines, core, gateway, surfaces];
  const blocks = [];
  for (let i = 0; i < TIERS; i++) {
    blocks.push(block(i));
  }
  const contents = [];
  for (let i = TIERS - 1; i >= 0; i--) {
    const { cx, top } = tier(i);
    contents.push(levels[i](cx, top));
  }
  return {
    label:
      "A stepped terrace of four tiers: three drums on the lowest tier, a lit core unit on the next, a patch panel above it and a screen, a phone and a terminal puck on the top, with leads climbing each riser.",
    body: [
      base(),
      ...blocks,
      lead(0, 14),
      lead(0, -14),
      lead(1, 46, 0),
      lead(2, -46, 0),
      ...contents,
    ],
  };
}
