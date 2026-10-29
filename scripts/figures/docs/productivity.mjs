/*
 * "Productivity": calendar, notes and tasks kept in one place, drawn as a desk
 * organiser on a bench plate. A ring-bound calendar block shows a month grid
 * with today's tile (the lit part) raised; a spiral notepad carries a checklist
 * and a pen tray holds two pens.
 */

import { benchPlate, byDepth, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -116, y: -90, w: 200, d: 150, r: 8 };
const CAL = { x: -102, y: -32, w: 30, d: 78, r: 3 };
const CAL_H = 60;
const GRID = { cols: 7, rows: 5, cell: 8, top: 44 };
const TODAY = { col: 3, row: 2 };
const NOTES = { x: 46, y: -30, w: 26, d: 26, r: 2 };
const NOTES_H = 14;
const PAD = { x: -10, y: -6, w: 74, d: 60, r: 2 };
const SHEETS = 4;
const SHEET_T = 1.1;
const TRAY = { x: -56, y: -78, w: 108, d: 30, r: 3 };
const TRAY_FLOOR = 2;
const TRAY_WALL = 3;
const TRAY_H = 9;
const PENS = [-69, -58];
const PEN_R = 2.6;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [CAL.x, CAL.y, CAL_H + 6]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(5px)"/>`;

// The calendar faces +x; on that face the viewer's left is +y, so columns
// start at the larger y and run toward the smaller.
const FACE = CAL.x + CAL.w;
const LEFT = CAL.y + CAL.d - 7;
const cellY = (col) => LEFT - col * GRID.cell;
const cellZ = (row) => GRID.top - row * GRID.cell;

/** A closed outline on the vertical face `x` between y0..y1 and z0..z1. */
const faceRect = (y0, y1, z0, z1, x = FACE) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );
const faceLine = (from, to, tone = "lo") =>
  line(k.segment(from, to, P), { tone, free: true });

function calendar() {
  const right = cellY(GRID.cols);
  const bottom = cellZ(GRID.rows);
  const out = [
    halo(CAL),
    solid(k.slabOf(CAL, 0, CAL_H, P, 4, 0.8), { tone: "mid" }),
    line(faceRect(LEFT, right, GRID.top + 4, CAL_H - 6), { tone: "lo" }),
    line(faceRect(LEFT, right, bottom, GRID.top), { tone: "lo" }),
  ];
  for (let col = 1; col < GRID.cols; col++) {
    out.push(
      faceLine(
        [FACE, cellY(col), bottom],
        [FACE, cellY(col), GRID.top],
        "faint",
      ),
    );
  }
  for (let row = 1; row < GRID.rows; row++) {
    out.push(
      faceLine([FACE, LEFT, cellZ(row)], [FACE, right, cellZ(row)], "faint"),
    );
  }
  // A binder bar along the top edge with two rings through it.
  const bar = {
    x: CAL.x + CAL.w / 2 - 3.5,
    y: CAL.y + 6,
    w: 7,
    d: CAL.d - 12,
    r: 3.5,
  };
  out.push(solid(k.slabOf(bar, CAL_H, 3, P, 4, 0.4), { tone: "mid" }));
  for (const y of [CAL.y + 20, CAL.y + CAL.d - 20]) {
    out.push(
      solid(k.cylinder(bar.x + 3.5, y, 2.6, CAL_H + 3, 1, P, 20), {
        tone: "lo",
      }),
    );
  }
  return out.join("");
}

/** Today's tile, standing proud of the grid: the lit part. */
function today() {
  const y = cellY(TODAY.col + 1) + 1;
  const z = cellZ(TODAY.row + 1) + 1;
  const plan = { x: FACE, y, w: 1.6, d: GRID.cell - 2, r: 0.4 };
  return solid(k.slabOf(plan, z, GRID.cell - 2, P, 2, 0.2), {
    tone: "hi",
    lit: true,
  });
}

/** A check box on the pad, ticked or open, with its task line. */
function task(x, ticked, z) {
  const box = { x, y: PAD.y + PAD.d - 16, w: 6, d: 6, r: 1 };
  const out = [line(k.planOutline(box, z, P, 2), { tone: "mid" })];
  if (ticked) {
    out.push(
      line(
        k.onTop(
          [
            [x + 3.4, box.y + 5.2],
            [x + 4.8, box.y + 3.4],
            [x + 1.2, box.y + 1.4],
          ],
          z,
          P,
        ),
        { tone: "mid" },
      ),
    );
  }
  const length = ticked ? 30 : 40;
  out.push(
    line(k.lineOnTop([x + 3, box.y - 4], [x + 3, box.y - 4 - length], z, P), {
      tone: ticked ? "faint" : "lo",
    }),
  );
  return out.join("");
}

/** A cube of sticky notes, its sheets showing as seams down the sides. */
function stickyNotes() {
  const out = [
    halo(NOTES),
    solid(k.slabOf(NOTES, 0, NOTES_H, P, 3, 0.4), { tone: "mid" }),
  ];
  for (let z = 2; z < NOTES_H - 1; z += 2) {
    out.push(line(k.sideSeam(NOTES, z, P, 3), { tone: "faint" }));
  }
  const peel = {
    x: NOTES.x + 2,
    y: NOTES.y + 2,
    w: NOTES.w - 4,
    d: NOTES.d - 4,
    r: 1.5,
  };
  out.push(line(k.planOutline(peel, NOTES_H, P, 2), { tone: "lo" }));
  return out.join("");
}

function notepad() {
  const top = SHEETS * SHEET_T + 1.4;
  const spine = PAD.x + 4;
  const ringZ = top - 0.6;
  const spiral = k.coil(
    PAD.y + 4,
    PAD.y + PAD.d - 4,
    [spine, ringZ],
    2.6,
    11,
    "y",
    P,
    14,
  );
  const out = [
    halo(PAD),
    line(spiral.back, { tone: "lo" }),
    solid(k.slabOf(PAD, 0, 1.4, P, 2), { tone: "lo", crease: "none" }),
  ];
  for (let i = 0; i < SHEETS; i++) {
    const sheet = { ...PAD, x: PAD.x + 1 + i * 0.4, w: PAD.w - 2 - i * 0.4 };
    out.push(
      solid(k.slabOf(sheet, 1.4 + i * SHEET_T, SHEET_T, P, 2), {
        tone: i === SHEETS - 1 ? "mid" : "lo",
        crease: "none",
      }),
    );
  }
  for (const [i, ticked] of [true, true, false, false].entries()) {
    out.push(task(PAD.x + 16 + i * 13, ticked, top));
  }
  out.push(line(spiral.front, { tone: "mid" }));
  return out.join("");
}

function pens(z) {
  const out = [];
  for (const [i, y] of PENS.entries()) {
    const x = TRAY.x + 10 + i * 8;
    const body = { x, y: y - PEN_R, w: 74, d: PEN_R * 2, r: PEN_R };
    const tip = { x: x + 72, y: y - 1.2, w: 9, d: 2.4, r: 1.2 };
    out.push(
      solid(k.slabOf(tip, z, 1.8, P, 3), { tone: "lo" }),
      solid(k.slabOf(body, z, PEN_R * 1.6, P, 4, 0.4), { tone: "mid" }),
      line(k.sideSeam(body, z + PEN_R * 0.8, P, 4), { tone: "faint" }),
      solid(
        k.slabOf(
          { x: x + 6, y: y - 0.8, w: 22, d: 1.6, r: 0.6 },
          z + PEN_R * 1.6,
          1,
          P,
          2,
        ),
        { tone: "lo" },
      ),
    );
  }
  return out.join("");
}

function trayWall(plan) {
  return solid(k.slabOf(plan, TRAY_FLOOR, TRAY_H - TRAY_FLOOR, P, 2, 0.4), {
    tone: "mid",
  });
}

function tray() {
  const { x, y, w, d } = TRAY;
  const out = [
    halo(TRAY),
    solid(k.slabOf(TRAY, 0, TRAY_FLOOR, P, 4, 0.4), { tone: "lo" }),
    trayWall({ x, y, w, d: TRAY_WALL, r: 1 }),
    trayWall({ x, y, w: TRAY_WALL, d, r: 1 }),
    pens(TRAY_FLOOR),
    trayWall({ x: x + w - TRAY_WALL, y, w: TRAY_WALL, d, r: 1 }),
    trayWall({ x, y: y + d - TRAY_WALL, w, d: TRAY_WALL, r: 1 }),
    screws(
      [
        [x + 1.5, y + d / 2],
        [x + w - 1.5, y + d / 2],
      ],
      TRAY_H,
      P,
      0.9,
    ),
  ];
  return out.join("");
}

export function figure() {
  const parts = byDepth(
    [
      [CAL.x + CAL.w / 2, CAL.y + CAL.d / 2, () => calendar() + today()],
      [PAD.x + PAD.w / 2, PAD.y + PAD.d / 2, notepad],
      [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, tray],
      [NOTES.x + NOTES.w / 2, NOTES.y + NOTES.d / 2, stickyNotes],
    ],
    P,
  );
  return {
    label:
      "A desk organiser on a bench plate: a ring-bound calendar block with today's tile lit, a spiral notepad with a checklist, a cube of sticky notes and a tray holding two pens.",
    body: [benchPlate(PLATE, P), ...parts.map(([, , draw]) => draw())],
  };
}
