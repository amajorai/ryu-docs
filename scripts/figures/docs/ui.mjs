/*
 * "UI": the shared component library, drawn as a sample tray of component
 * swatches. Buttons, a toggle, a slider, checkboxes, radios, a segmented
 * control, an input and a dial each sit in their own well; the primary button
 * is the one lit part.
 */

import { byDepth, dots, k, knob, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 360;

const TRAY = { x: -98, y: -60, w: 196, d: 120, r: 5 };
const RIM = 4;
const RIM_H = 4;
const TRAY_H = 8;
const FOOT_H = 3;
const TOP = TRAY_H;
const COLS = [-86, -28, 30];
const ROWS = [-48, -16, 16];
const CELL_W = 56;
const CELL_D = 30;

const P = k.fitProjection(
  [...k.boxCorners(TRAY, -FOOT_H, TOP + RIM_H)],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const raised = (plan, z, h, { lit = false, tone = "mid" } = {}) =>
  solid(k.slabOf(plan, z, h, P, 4, 0.3), {
    tone: lit ? "hi" : tone,
    lit,
    crease: "lo",
  });

function tray() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(TRAY, -FOOT_H, FOOT_H, P)}"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(TRAY, 16), P)) {
    out.push(
      solid(k.cylinder(x, y, 4.5, -FOOT_H, FOOT_H, P, 24), { tone: "lo" }),
    );
  }
  out.push(
    solid(k.slabOf(TRAY, 0, TRAY_H, P, 8, 1.4), { tone: "mid" }),
    line(k.sideSeam(TRAY, 3, P, 8), { tone: "faint" }),
    rim("back"),
    rim("left"),
  );
  for (const x of COLS) {
    for (const y of ROWS) {
      const well = { x, y, w: CELL_W, d: CELL_D, r: 3 };
      out.push(
        line(k.planOutline(well, TOP, P, 3), { tone: "lo" }),
        line(k.planOutline(k.insetPlan(well, 1.4), TOP, P, 3), {
          tone: "faint",
        }),
      );
    }
  }
  return out.join("");
}

const RIMS = {
  back: { x: TRAY.x, y: TRAY.y, w: TRAY.w, d: RIM, r: 2 },
  left: { x: TRAY.x, y: TRAY.y, w: RIM, d: TRAY.d, r: 2 },
  front: { x: TRAY.x, y: TRAY.y + TRAY.d - RIM, w: TRAY.w - RIM, d: RIM, r: 2 },
  right: { x: TRAY.x + TRAY.w - RIM, y: TRAY.y, w: RIM, d: TRAY.d, r: 2 },
};

function rim(side) {
  return solid(k.slabOf(RIMS[side], TOP, RIM_H, P, 2, 0.4), { tone: "mid" });
}

/** The near rims, drawn over the swatches, with screws at their corners. */
function nearRims() {
  return [
    rim("front"),
    rim("right"),
    screws(k.corners(TRAY, RIM / 2).slice(1), TOP + RIM_H, P, 0.9),
  ].join("");
}

const PILL = (cx, cy) => ({ x: cx - 20, y: cy - 7, w: 40, d: 14, r: 7 });

/** The primary button: a tall filled pill, the lit part of the figure. */
const primary = (cx, cy) => raised(PILL(cx, cy), TOP, 3.4, { lit: true });

/** A secondary button: a low pill with an inset outline. */
const secondary = (cx, cy) =>
  [
    raised(PILL(cx, cy), TOP, 1.6, { tone: "lo" }),
    line(k.planOutline(k.insetPlan(PILL(cx, cy), 1.6), TOP + 1.6, P, 6), {
      tone: "mid",
    }),
  ].join("");

function toggle(cx, cy) {
  const track = { x: cx - 15, y: cy - 7, w: 30, d: 14, r: 7 };
  return [
    raised(track, TOP, 1.6, { tone: "lo" }),
    solid(k.cylinder(cx + 8, cy, 5.8, TOP + 1.6, 2.8, P, 28, 0.4), {
      tone: "mid",
      crease: "lo",
    }),
  ].join("");
}

function slider(cx, cy) {
  const track = { x: cx - 22, y: cy - 1.2, w: 44, d: 2.4, r: 1.2 };
  const ticks = k.topTicks(cx - 20, cx + 20, 5, 4, cy + 4, TOP, [1.4, 2.6], P);
  return [
    raised(track, TOP, 0.8, { tone: "lo" }),
    line(ticks.minor, { tone: "faint" }),
    line(ticks.major, { tone: "lo" }),
    solid(k.cylinder(cx - 6, cy, 3.6, TOP + 0.8, 3, P, 24, 0.4), {
      tone: "mid",
      crease: "lo",
    }),
  ].join("");
}

function checkboxes(cx, cy) {
  const out = [];
  for (const [i, x] of [cx - 16, cx, cx + 16].entries()) {
    out.push(raised({ x: x - 5.5, y: cy - 5.5, w: 11, d: 11, r: 1.8 }, TOP, 2));
    if (i === 0) {
      out.push(
        line(
          k.onTop(
            [
              [x - 2.8, cy],
              [x - 0.6, cy + 2.6],
              [x + 3, cy - 2.8],
            ],
            TOP + 2,
            P,
          ),
          { tone: "hi" },
        ),
      );
    }
  }
  return out.join("");
}

function radios(cx, cy) {
  const out = [];
  for (const [i, x] of [cx - 16, cx, cx + 16].entries()) {
    out.push(
      solid(k.cylinder(x, cy, 5.4, TOP, 1.4, P, 28), {
        tone: "mid",
        crease: "lo",
      }),
    );
    if (i === 1) {
      out.push(dots([at([x, cy, TOP + 1.4])], { size: 1.6, tone: "hi" }));
    }
  }
  return out.join("");
}

function segmented(cx, cy) {
  const bar = { x: cx - 24, y: cy - 6, w: 48, d: 12, r: 3 };
  return [
    raised(bar, TOP, 1.4, { tone: "lo" }),
    line(k.lineOnTop([cx - 8, cy - 4], [cx - 8, cy + 4], TOP + 1.4, P), {
      tone: "lo",
    }),
    raised({ x: cx - 6.5, y: cy - 4.8, w: 13, d: 9.6, r: 2 }, TOP + 1.4, 1.6),
    line(k.lineOnTop([cx + 8, cy - 4], [cx + 8, cy + 4], TOP + 1.4, P), {
      tone: "lo",
    }),
  ].join("");
}

function input(cx, cy) {
  const field = { x: cx - 24, y: cy - 6, w: 48, d: 12, r: 2.4 };
  return [
    raised(field, TOP, 1.2, { tone: "lo" }),
    line(k.planOutline(k.insetPlan(field, 1.4), TOP + 1.2, P, 3), {
      tone: "faint",
    }),
    line(k.lineOnTop([cx - 16, cy - 3], [cx - 16, cy + 3], TOP + 1.2, P), {
      tone: "hi",
    }),
    line(k.lineOnTop([cx - 20, cy], [cx - 17.5, cy], TOP + 1.2, P), {
      tone: "mid",
    }),
  ].join("");
}

const dial = (cx, cy) => knob([cx, cy], TOP, P, { radius: 7.5, height: 4.5 });

const SWATCHES = [
  primary,
  toggle,
  slider,
  secondary,
  checkboxes,
  radios,
  segmented,
  input,
  dial,
];

export function figure() {
  const cells = [];
  for (const [col, x] of COLS.entries()) {
    for (const [row, y] of ROWS.entries()) {
      const cx = x + CELL_W / 2;
      const cy = y + CELL_D / 2;
      cells.push([cx, cy, () => SWATCHES[row * COLS.length + col](cx, cy)]);
    }
  }
  return {
    label:
      "A sample tray of interface components: a lit primary button, a secondary button, a toggle, a slider, checkboxes, radios, a segmented control, an input and a dial, each in its own well.",
    body: [
      tray(),
      ...byDepth(cells, P).map(([, , draw]) => draw()),
      nearRims(),
    ],
  };
}
