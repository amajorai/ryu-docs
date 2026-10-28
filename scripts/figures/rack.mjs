/*
 * "Extend Ryu": plugins and apps snap into one host, drawn as a modular synth
 * case. Modules of different widths sit on the case rails, patched together;
 * one module (the lit part) is lifted out above its empty slot.
 */

import {
  byDepth,
  dots,
  jack,
  k,
  knob,
  lamp,
  line,
  screws,
  solid,
} from "./parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const CASE = { x: -128, y: -62, w: 256, d: 124, r: 6 };
const FLOOR_H = 8;
const WALL = 5;
const TOP = 20;
const MODULE_Z = FLOOR_H;
const MODULE_H = TOP - FLOOR_H - 1;
const LIFT = 28;
const RAIL_D = 8;
const SPAN = { y: CASE.y + WALL + 2, d: CASE.d - (WALL + 2) * 2 };
const WIDTHS = [34, 26, 46, 30, 42, 36];
const LIFTED = 4;

const P = k.fitProjection(
  [...k.boxCorners(CASE, -6, TOP), [0, 0, TOP + LIFT + 8]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const modules = (() => {
  let x = CASE.x + WALL + 3;
  return WIDTHS.map((w, index) => {
    const plan = { x, y: SPAN.y, w, d: SPAN.d, r: 1.4 };
    x += w + 1.5;
    return { index, plan };
  });
})();

function caseBody() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, -6, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(CASE, 16), P)) {
    out.push(solid(k.cylinder(x, y, 5, -6, 6, P, 24), { tone: "lo" }));
  }
  out.push(solid(k.slabOf(CASE, 0, FLOOR_H, P, 8, 1.2), { tone: "mid" }));
  return out.join("");
}

const walls = {
  back: { x: CASE.x, y: CASE.y, w: CASE.w, d: WALL, r: 2 },
  left: { x: CASE.x, y: CASE.y, w: WALL, d: CASE.d, r: 2 },
  right: { x: CASE.x + CASE.w - WALL, y: CASE.y, w: WALL, d: CASE.d, r: 2 },
  front: { x: CASE.x, y: CASE.y + CASE.d - WALL, w: CASE.w, d: WALL, r: 2 },
};

const wall = (plan) =>
  solid(k.slabOf(plan, FLOOR_H, TOP - FLOOR_H, P, 3, 0.6), { tone: "mid" });

function rails() {
  const out = [];
  for (const y of [SPAN.y, SPAN.y + SPAN.d - RAIL_D]) {
    const rail = {
      x: CASE.x + WALL,
      y,
      w: CASE.w - WALL * 2,
      d: RAIL_D,
      r: 0.8,
    };
    out.push(solid(k.slabOf(rail, FLOOR_H, 2, P, 2, 0.3), { tone: "lo" }));
    out.push(
      line(
        k.lineOnTop(
          [rail.x + 2, y + RAIL_D / 2],
          [rail.x + rail.w - 2, y + RAIL_D / 2],
          FLOOR_H + 2,
          P,
        ),
        { tone: "faint" },
      ),
    );
  }
  return out.join("");
}

/** One module's panel and its controls, standing at height `z`. */
function moduleAt({ index, plan }, z, lit = false) {
  const top = z + MODULE_H;
  const cx = plan.x + plan.w / 2;
  const out = [
    solid(k.slabOf(plan, z, MODULE_H, P, 3, 0.5), {
      tone: lit ? "hi" : "mid",
      lit,
      crease: "lo",
    }),
  ];
  out.push(
    screws(
      [
        [plan.x + 3.5, plan.y + 4],
        [plan.x + plan.w - 3.5, plan.y + plan.d - 4],
      ],
      top,
      P,
      1.2,
    ),
  );
  const rows = plan.w > 40 ? [cx - 10, cx + 10] : [cx];
  for (const [row, x] of rows.entries()) {
    out.push(
      knob([x, plan.y + 22], top, P, {
        radius: plan.w > 30 ? 5.5 : 4,
        height: 4,
      }),
    );
    out.push(knob([x, plan.y + 44], top, P, { radius: 3.4, height: 3.5 }));
    if (index % 2 === row % 2) {
      out.push(lamp([x, plan.y + 60], top, P, { lit }));
    } else {
      // A fader slot with its cap.
      out.push(
        line(
          k.planOutline(
            { x: x - 1.2, y: plan.y + 54, w: 2.4, d: 22, r: 1.2 },
            top,
            P,
            3,
          ),
          { tone: "lo" },
        ),
      );
      out.push(
        solid(
          k.slabOf(
            { x: x - 2.6, y: plan.y + 60, w: 5.2, d: 4, r: 0.8 },
            top,
            2.2,
            P,
            2,
          ),
          { tone: "mid" },
        ),
      );
    }
  }
  for (const x of rows.length > 1 ? [cx - 10, cx, cx + 10] : [cx - 6, cx + 6]) {
    out.push(jack([x, plan.y + plan.d - 14], top, P));
  }
  out.push(
    line(
      k.lineOnTop(
        [plan.x + 3, plan.y + 8],
        [plan.x + plan.w - 3, plan.y + 8],
        top,
        P,
      ),
      { tone: "faint" },
    ),
  );
  return out.join("");
}

/** A patch cable that leaves one jack, sags as a catenary and lands on another. */
function patch(fromModule, fromX, toModule, toX, sag = 10) {
  const z = TOP - 1;
  const y = (m) => modules[m].plan.y + modules[m].plan.d - 14;
  const a = [fromX, y(fromModule), z];
  const b = [toX, y(toModule), z];
  const via = [];
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    via.push(
      at([
        a[0] + (b[0] - a[0]) * t,
        a[1] + 10 * Math.sin(Math.PI * t),
        z + sag * Math.sin(Math.PI * t),
      ]),
    );
  }
  return k.wireSvg(at(a), at(b), { via, tone: "hi", size: 1.4 });
}

export function rackFigure() {
  const lifted = modules[LIFTED];
  const seated = modules.filter((m) => m.index !== LIFTED);
  const cx = (m) => modules[m].plan.x + modules[m].plan.w / 2;
  const slot = lifted.plan;
  return {
    label:
      "A modular synth case with six modules on its rails, patched together with cables; one lit module is lifted out above its empty slot.",
    body: [
      caseBody(),
      wall(walls.back),
      wall(walls.left),
      rails(),
      line(k.planOutline(k.insetPlan(slot, 2), FLOOR_H + 0.1, P, 3), {
        tone: "lo",
      }),
      dots(k.dotGrid(slot.x + 8, slot.y + 20, 4, 9, 8, FLOOR_H, P), {
        size: 0.4,
        tone: "lo",
      }),
      ...seated.map((m) => moduleAt(m, MODULE_Z)),
      wall(walls.right),
      wall(walls.front),
      screws(k.corners(CASE, 2.5), TOP, P, 1.3),
      patch(0, cx(0) - 6, 2, cx(2) + 10, 12),
      patch(1, cx(1), 3, cx(3) + 6, 16),
      `<path class="iso-halo" d="${k.haloOf(slot, FLOOR_H, 0.1, P)}" style="filter:blur(6px);opacity:.5"/>`,
      moduleAt(lifted, MODULE_Z + LIFT, true),
    ],
  };
}
