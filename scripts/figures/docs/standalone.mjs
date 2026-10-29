/*
 * "Standalone services": separate products that share one account, drawn as a
 * row of free-standing cabinets on one plinth. Each cabinet has its own size,
 * door and fittings, and stands apart from its neighbours; one top lamp is lit.
 */

import { benchPlate, dots, k, lamp, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 340;

const PLATE = { x: -52, y: -176, w: 104, d: 352, r: 8 };
const BACK = -36;
const GAP = 11;
const PLINTH = 3;
const LIT = 2;
const CABINETS = [
  { w: 52, d: 52, h: 62, draw: drawers },
  { w: 34, d: 40, h: 42, draw: grille },
  { w: 40, d: 46, h: 88, draw: locker },
  { w: 46, d: 52, h: 54, draw: patchPanel },
  { w: 38, d: 42, h: 36, draw: mailSlot },
  { w: 50, d: 48, h: 72, draw: display },
];

const ROW_W =
  CABINETS.reduce((sum, { w }) => sum + w, 0) + GAP * (CABINETS.length - 1);

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [BACK, ROW_W / 2, 92],
    [BACK, -ROW_W / 2, 92],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/*
 * Cabinet faces lie on the plane x = `face.x`; `u` runs across a face from its
 * left edge to its right edge as seen, so face drawings read left to right.
 */
const onFace = (face, u, z) => [face.x, face.y + face.w - u, z];
const faceAt = (face, u, z) => at(onFace(face, u, z));

const faceRect = (face, u0, u1, z0, z1) =>
  k.pathOf(
    [
      faceAt(face, u0, z0),
      faceAt(face, u1, z0),
      faceAt(face, u1, z1),
      faceAt(face, u0, z1),
    ],
    true,
  );

const faceLine = (face, u0, u1, z) =>
  k.pathOf([faceAt(face, u0, z), faceAt(face, u1, z)]);

const faceRing = (face, u, z, radius, steps = 14) =>
  k.sideRing(onFace(face, u, z), radius, "x", P, steps);

/** Stacked drawers, each with a short pull bar. */
function drawers(face) {
  const { w, h } = face;
  const rows = Math.round((h - PLINTH) / 18);
  const step = (h - PLINTH - 4) / rows;
  const out = [];
  for (let i = 0; i < rows; i++) {
    const z0 = PLINTH + 2 + i * step;
    out.push(
      line(faceRect(face, 3, w - 3, z0 + 1, z0 + step - 1), { tone: "lo" }),
      line(faceLine(face, w / 2 - 7, w / 2 + 7, z0 + step - 5), {
        tone: "mid",
      }),
    );
  }
  return out.join("");
}

/** A round speaker grille above a single button. */
function grille(face) {
  const { w, h } = face;
  const z = PLINTH + h * 0.58;
  const holes = [];
  for (const [r, n] of [
    [3, 6],
    [7, 12],
  ]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      holes.push(faceAt(face, w / 2 + Math.cos(a) * r, z + Math.sin(a) * r));
    }
  }
  return [
    line(faceRing(face, w / 2, z, 11, 32), { tone: "lo" }),
    dots(holes, { size: 0.55, tone: "mid" }),
    line(faceRect(face, w / 2 - 4, w / 2 + 4, PLINTH + 5, PLINTH + 9), {
      tone: "mid",
    }),
  ].join("");
}

/** A tall locker door with a vent block and a lever handle. */
function locker(face) {
  const { w, h } = face;
  const out = [
    line(faceRect(face, 3, w - 3, PLINTH + 3, h - 3), { tone: "lo" }),
  ];
  for (let i = 0; i < 5; i++) {
    out.push(line(faceLine(face, 9, w - 9, h - 10 - i * 3), { tone: "faint" }));
  }
  const u = w - 9;
  out.push(
    line(k.pathOf([faceAt(face, u, h / 2 + 6), faceAt(face, u, h / 2 - 6)]), {
      tone: "mid",
    }),
    line(faceRing(face, u, h / 2 + 8, 1.6), { tone: "mid" }),
  );
  return out.join("");
}

/** A grid of jacks in a framed panel over a blank service door. */
function patchPanel(face) {
  const { w, h } = face;
  const out = [line(faceRect(face, 4, w - 4, h - 26, h - 5), { tone: "lo" })];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      out.push(
        line(faceRing(face, 11 + col * 8, h - 11 - row * 9, 2), {
          tone: "mid",
        }),
      );
    }
  }
  out.push(
    line(faceRect(face, 4, w - 4, PLINTH + 4, h - 31), { tone: "faint" }),
  );
  return out.join("");
}

/** A mailbox front: a letter slot with a flap and a small lock. */
function mailSlot(face) {
  const { w, h } = face;
  return [
    line(faceRect(face, 7, w - 7, h - 12, h - 8), { tone: "mid" }),
    line(faceLine(face, 8, w - 8, h - 13.5), { tone: "faint" }),
    line(faceRect(face, 3, w - 3, PLINTH + 3, h - 18), { tone: "lo" }),
    line(faceRing(face, w - 9, PLINTH + 10, 1.6), { tone: "mid" }),
  ].join("");
}

/** A display window with page rules and a tile grid, over one drawer. */
function display(face) {
  const { w, h } = face;
  const out = [
    line(faceRect(face, 4, w - 4, 24, h - 5), { tone: "lo" }),
    line(faceRect(face, 4, w - 4, PLINTH + 3, 20), { tone: "lo" }),
    line(faceLine(face, w / 2 - 7, w / 2 + 7, 15), { tone: "mid" }),
  ];
  for (const [i, length] of [26, 18, 22].entries()) {
    out.push(
      line(faceLine(face, 9, 9 + length, h - 12 - i * 5), {
        tone: i === 0 ? "mid" : "faint",
      }),
    );
  }
  for (let col = 0; col < 3; col++) {
    const u = 9 + col * 11;
    out.push(line(faceRect(face, u, u + 8, 29, 37), { tone: "faint" }));
  }
  return out.join("");
}

/** One cabinet: a recessed plinth, the body, its face and a top lamp. */
function cabinet({ w, d, h, draw }, y, index) {
  const plan = { x: BACK, y, w: d, d: w, r: 2 };
  const top = k.insetPlan(plan, 3);
  return [
    `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(k.insetPlan(plan, 2), 0, PLINTH, P, 3), { tone: "lo" }),
    solid(k.slabOf(plan, PLINTH, h - PLINTH, P, 3, 0.6), { tone: "mid" }),
    line(k.planOutline(top, h, P, 3), { tone: "faint" }),
    screws(k.corners(top, 2.5), h, P, 1.1),
    draw({ x: BACK + d, y, w, h }),
    lamp([BACK + 10, y + 9], h, P, { lit: index === LIT, radius: 2.2 }),
  ].join("");
}

/** Cabinets from the far end of the plinth to the near end. */
function row() {
  const out = [];
  let y = -ROW_W / 2;
  for (const [index, spec] of CABINETS.entries()) {
    out.push(cabinet(spec, y, index));
    y += spec.w + GAP;
  }
  return out;
}

export function figure() {
  const edge = PLATE.x + PLATE.w - 12;
  return {
    label:
      "A row of six free-standing cabinets of different sizes on one long plinth, each with its own door and fittings, one with a lit lamp on top.",
    body: [
      benchPlate(PLATE, P),
      dots(
        Array.from({ length: 40 }, (_, i) =>
          at([edge, PLATE.y + 20 + i * 8, 0]),
        ),
        { size: 0.45, tone: "lo" },
      ),
      ...row(),
    ],
  };
}
