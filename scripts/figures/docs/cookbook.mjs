/*
 * "Cookbook": recipes that combine features, drawn as a kitchen tray. A row of
 * ingredient canisters stands at the back, measures pour along dotted arcs into
 * a mixing bowl, and the recipe card (the lit part) stands in its holder.
 */

import { byDepth, dots, k, knob, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const TRAY = { x: -96, y: -72, w: 192, d: 136, r: 10 };
const FLOOR = 4;
const RIM = 12;
const WALL = 4;
const CANISTERS = [
  { x: -70, r: 15, h: 44 },
  { x: -36, r: 13, h: 34 },
  { x: -2, r: 16, h: 52 },
  { x: 32, r: 12, h: 28 },
];
const ROW_Y = -46;
const SHAKERS = { x: 60, y: -54, step: 11 };
const BOWL = [26, 28];
const BOWL_STEPS = [
  [12, 4],
  [17, 4],
  [21, 4],
  [23, 4],
];
const CUPS = [
  [58, 20, 7.5],
  [64, 38, 6.2],
  [70, 53, 5],
];
const STAND = { x: -84, y: 20, w: 54, d: 16, r: 2 };
const CARD = { w: 46, h: 34 };

const P = k.fitProjection(
  [
    ...k.boxCorners(TRAY, -4, RIM),
    ...CANISTERS.map(({ x, r, h }) => [x - r, ROW_Y - r, FLOOR + h + 8]),
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const walls = {
  back: { x: TRAY.x, y: TRAY.y, w: TRAY.w, d: WALL, r: 2 },
  left: { x: TRAY.x, y: TRAY.y, w: WALL, d: TRAY.d, r: 2 },
  right: { x: TRAY.x + TRAY.w - WALL, y: TRAY.y, w: WALL, d: TRAY.d, r: 2 },
  front: { x: TRAY.x, y: TRAY.y + TRAY.d - WALL, w: TRAY.w, d: WALL, r: 2 },
};
const wall = (plan) =>
  solid(k.slabOf(plan, FLOOR, RIM - FLOOR, P, 3, 0.6), { tone: "mid" });

function trayBase() {
  return [
    `<path class="iso-halo" d="${k.haloOf(TRAY, -4, 4, P)}"/>`,
    solid(k.slabOf(TRAY, -4, FLOOR + 4, P, 8, 1.2), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(TRAY, WALL + 5), FLOOR, P), {
      tone: "faint",
    }),
  ].join("");
}

/** A handle cut through a side wall: a slot outline on the rim top. */
const handle = (plan) =>
  line(k.planOutline(plan, RIM, P, 3), { tone: "lo" }) +
  dots([at([plan.x + plan.w / 2, plan.y + plan.d / 2, RIM])], {
    size: 0.5,
  });

/** A canister: body, two label seams, a wider lid and a knob. */
function canister({ x, r, h }) {
  const z = FLOOR;
  const top = z + h;
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x - r, y: ROW_Y - r, w: r * 2, d: r * 2, r }, z, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.cylinder(x, ROW_Y, r, z, h, P, 32, 0.6), { tone: "mid" }),
    line(k.sideArc(x, ROW_Y, r, z + h * 0.32, P, 20), { tone: "faint" }),
    line(k.sideArc(x, ROW_Y, r, z + h * 0.62, P, 20), { tone: "faint" }),
    solid(k.cylinder(x, ROW_Y, r + 1.4, top, 4, P, 32), { tone: "mid" }),
    line(k.knurl(x, ROW_Y, r + 1.4, top, top + 4, 28, P), { tone: "faint" }),
    knob([x, ROW_Y], top + 4, P, { radius: 3, height: 3 }),
  ].join("");
}

/** A small grid of spice shakers with pierced caps. */
function shakers() {
  const out = [];
  const spots = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      spots.push([SHAKERS.x + i * SHAKERS.step, SHAKERS.y + j * SHAKERS.step]);
    }
  }
  for (const [x, y] of byDepth(spots, P)) {
    out.push(solid(k.cylinder(x, y, 5, FLOOR, 14, P, 20), { tone: "mid" }));
    out.push(
      solid(k.cylinder(x, y, 5.4, FLOOR + 14, 3, P, 20), { tone: "lo" }),
    );
    out.push(
      dots(
        [
          at([x - 1.6, y, FLOOR + 17]),
          at([x + 1.6, y, FLOOR + 17]),
          at([x, y - 1.6, FLOOR + 17]),
          at([x, y + 1.6, FLOOR + 17]),
        ],
        { size: 0.4, tone: "lo" },
      ),
    );
  }
  return out.join("");
}

/** A turned mixing bowl built from widening rings, with a rim and inner lip. */
function bowl() {
  const [x, y] = BOWL;
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: x - 18, y: y - 18, w: 36, d: 36, r: 18 }, FLOOR, 0.1, P)}" style="filter:blur(5px)"/>`,
  ];
  let z = FLOOR;
  for (const [r, h] of BOWL_STEPS) {
    out.push(solid(k.cylinder(x, y, r, z, h, P, 32, 0.4), { tone: "mid" }));
    z += h;
  }
  const rim = BOWL_STEPS.at(-1)[0];
  out.push(line(k.ring(x, y, rim - 2.5, z, P, 32), { tone: "lo" }));
  out.push(line(k.ring(x, y, rim - 9, z - 6, P, 32), { tone: "faint" }));
  out.push(
    dots(k.dotGrid(x - 6, y - 3, 4, 3, 3.6, z - 8, P), {
      size: 0.45,
      tone: "lo",
    }),
  );
  return out.join("");
}

/** Nested measuring cups in a row, each with a flat handle. */
function cups() {
  return byDepth(CUPS, P)
    .map(([x, y, r]) =>
      [
        solid(
          k.slabOf(
            { x: x + r - 1, y: y - 1.6, w: 9, d: 3.2, r: 1 },
            FLOOR + r * 0.9,
            1.2,
            P,
            2,
          ),
          { tone: "mid" },
        ),
        solid(k.cylinder(x, y, r, FLOOR, r * 1.1, P, 20, 0.3), {
          tone: "mid",
        }),
        line(k.ring(x, y, r - 1.2, FLOOR + r * 1.1, P, 20), { tone: "lo" }),
      ].join(""),
    )
    .join("");
}

/** Dotted pours from two canister lids into the bowl. */
function pours() {
  const [bx, by] = BOWL;
  const bowlTop = FLOOR + 16;
  return [CANISTERS[1], CANISTERS[3]]
    .map(({ x, h }) => {
      const from = [x, ROW_Y + 6, FLOOR + h + 10];
      const to = [bx - 4, by - 8, bowlTop + 2];
      const points = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        points.push(
          at([
            from[0] + (to[0] - from[0]) * t,
            from[1] + (to[1] - from[1]) * t,
            from[2] + (to[2] - from[2]) * t + 18 * Math.sin(Math.PI * t),
          ]),
        );
      }
      return line(k.pathOf(points), { tone: "mid", dotted: true });
    })
    .join("");
}

/** The recipe card upright in a slotted wooden holder: the lit part. */
function recipeStand() {
  const z = FLOOR;
  const slotY = STAND.y + STAND.d / 2 - 1;
  const card = {
    x: STAND.x + (STAND.w - CARD.w) / 2,
    y: slotY,
    w: CARD.w,
    d: 1.6,
    r: 0.4,
  };
  const face = card.y + card.d;
  const out = [
    `<path class="iso-halo" d="${k.haloOf(STAND, z, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(STAND, z, 7, P, 3, 0.6), { tone: "mid" }),
    line(k.planOutline({ ...card, y: slotY - 0.6, d: 2.8 }, z + 7, P, 2), {
      tone: "lo",
    }),
    solid(k.slabOf(card, z + 4, CARD.h, P, 2, 0.2), { tone: "hi", lit: true }),
  ];
  const left = card.x + 5;
  out.push(
    line(
      k.segment(
        [left, face, z + CARD.h - 3],
        [left + 20, face, z + CARD.h - 3],
        P,
      ),
      { tone: "hi" },
    ),
  );
  for (const [i, width] of [30, 34, 22, 28, 18].entries()) {
    const lineZ = z + CARD.h - 10 - i * 4.6;
    out.push(
      line(k.segment([left, face, lineZ], [left + width, face, lineZ], P), {
        tone: "lo",
        free: true,
      }),
    );
  }
  out.push(screws([[STAND.x + 5, STAND.y + STAND.d - 4]], z + 7, P, 1.2));
  return out.join("");
}

export function figure() {
  const inside = byDepth(
    [
      ...CANISTERS.map((can) => [can.x, ROW_Y, () => canister(can)]),
      [SHAKERS.x + 6, SHAKERS.y + 6, shakers],
      [BOWL[0], BOWL[1], bowl],
      [64, 38, cups],
      [STAND.x + STAND.w / 2, STAND.y + STAND.d / 2, recipeStand],
    ],
    P,
  );
  return {
    label:
      "A kitchen tray: ingredient canisters and spice shakers pour along dotted arcs into a mixing bowl, beside a lit recipe card in a holder.",
    body: [
      trayBase(),
      wall(walls.back),
      wall(walls.left),
      ...inside.map(([, , draw]) => draw()),
      pours(),
      wall(walls.right),
      wall(walls.front),
      handle({
        x: TRAY.x + TRAY.w / 2 - 22,
        y: TRAY.y + TRAY.d - 3,
        w: 44,
        d: 2,
        r: 1,
      }),
      handle({ x: TRAY.x + TRAY.w - 3, y: -20, w: 2, d: 32, r: 1 }),
    ],
  };
}
