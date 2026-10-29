/*
 * "Memory": what Ryu keeps and retrieves, drawn as a card-catalogue cabinet.
 * A bank of drawers stands on a bench plate; one drawer is pulled out to show
 * its index cards, and the card being retrieved (the lit part) rises out of the
 * row beside a magnifier lying on the plate.
 */

import { benchPlate, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -62, y: -66, w: 136, d: 136, r: 8 };
const CAB = { x: -42, y: -48, w: 54, d: 82, r: 2 };
const LEG_H = 5;
const ROW_H = 17;
const ROWS = 4;
const COLUMNS = 2;
const GAP = 2;
const CAB_H = ROWS * ROW_H + (ROWS + 1) * GAP;
const LID_H = 3;
const OPEN = { row: 3, column: 0 };
const PULL = 40;
const CARDS = 11;
const LIFTED = 6;
const LIFT = 10;
const LENS = { x: 40, y: 46, r: 12 };

const face = CAB.x + CAB.w;
const top = LEG_H + CAB_H;
const lidTop = top + LID_H;
const STACK = [CAB.x + 12, CAB.y + 30];
const colW = (CAB.d - (COLUMNS + 1) * GAP) / COLUMNS;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [CAB.x, CAB.y, top + LID_H + 8]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the drawer face x = `x`, between y0..y1 and z0..z1. */
const faceRect = (y0, y1, z0, z1, x = face) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );

const cell = (row, column) => {
  const y0 = CAB.y + GAP + column * (colW + GAP);
  const z0 = LEG_H + GAP + row * (ROW_H + GAP);
  return { y0, y1: y0 + colW, z0, z1: z0 + ROW_H };
};

/** A cup pull and an empty label frame on a drawer front at plane x. */
function pull({ y0, y1, z0, z1 }, x) {
  const cy = (y0 + y1) / 2;
  const cz = (z0 + z1) / 2;
  return [
    line(faceRect(cy - 6, cy + 6, cz + 2.5, cz + 6.5, x), { tone: "lo" }),
    solid(
      k.slabOf({ x, y: cy - 6, w: 2.2, d: 12, r: 1 }, cz - 3.5, 2.6, P, 3),
      { tone: "mid" },
    ),
  ].join("");
}

function cabinet() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(CAB, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
  ];
  for (const [x, y] of k.corners(CAB, 4)) {
    out.push(
      solid(
        k.slabOf({ x: x - 2.5, y: y - 2.5, w: 5, d: 5, r: 1 }, 0, LEG_H, P, 2),
        {
          tone: "lo",
        },
      ),
    );
  }
  out.push(solid(k.slabOf(CAB, LEG_H, CAB_H, P, 3, 0.4), { tone: "mid" }));
  const lid = { x: CAB.x - 2, y: CAB.y - 2, w: CAB.w + 4, d: CAB.d + 4, r: 2 };
  out.push(solid(k.slabOf(lid, top, LID_H, P, 3, 0.6), { tone: "mid" }));
  out.push(screws(k.corners(lid, 4), top + LID_H, P, 1.2));
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const c = cell(row, column);
      if (row === OPEN.row && column === OPEN.column) {
        out.push(line(faceRect(c.y0, c.y1, c.z0, c.z1), { tone: "hi" }));
        continue;
      }
      out.push(line(faceRect(c.y0, c.y1, c.z0, c.z1), { tone: "lo" }));
      out.push(pull(c, face));
    }
  }
  // Panel seams down the near side.
  const side = CAB.y + CAB.d;
  for (const x of [CAB.x + 4, face - 4]) {
    out.push(
      line(k.segment([x, side, LEG_H + 3], [x, side, top - 3], P), {
        tone: "faint",
      }),
    );
  }
  return out.join("");
}

function drawer() {
  const { y0, y1, z0 } = cell(OPEN.row, OPEN.column);
  const zb = z0 + 1;
  const wallH = ROW_H - 4;
  const end = face + PULL;
  const out = [
    solid(
      k.slabOf(
        { x: face, y: y0 + 1, w: PULL, d: y1 - y0 - 2, r: 0.5 },
        zb,
        1.2,
        P,
        2,
      ),
      {
        tone: "lo",
      },
    ),
    solid(
      k.slabOf(
        { x: face, y: y0 + 1, w: PULL, d: 1.4, r: 0.4 },
        zb,
        wallH,
        P,
        2,
      ),
      {
        tone: "mid",
      },
    ),
  ];
  // The rod that runs through the cards' punched holes.
  out.push(
    line(
      k.segment([face, (y0 + y1) / 2, zb + 4], [end, (y0 + y1) / 2, zb + 4], P),
      {
        tone: "lo",
      },
    ),
  );
  for (let i = 0; i < CARDS; i++) {
    const x = face + 4 + i * ((PULL - 9) / (CARDS - 1));
    const lifted = i === LIFTED;
    const card = { x, y: y0 + 3.5, w: 0.8, d: y1 - y0 - 7, r: 0.2 };
    out.push(
      solid(k.slabOf(card, zb + 1.2 + (lifted ? LIFT : 0), wallH + 3, P, 1), {
        tone: lifted ? "hi" : "mid",
        lit: lifted,
        crease: "none",
      }),
    );
    if (lifted) {
      out.push(
        line(
          k.segment(
            [x + 0.8, card.y + 3, zb + LIFT + wallH + 1.5],
            [x + 0.8, card.y + card.d - 3, zb + LIFT + wallH + 1.5],
            P,
          ),
          { tone: "hi" },
        ),
      );
    }
  }
  out.push(
    solid(
      k.slabOf(
        { x: face, y: y1 - 2.4, w: PULL, d: 1.4, r: 0.4 },
        zb,
        wallH,
        P,
        2,
      ),
      {
        tone: "mid",
      },
    ),
  );
  const front = {
    y0: y0 - 0.5,
    y1: y1 + 0.5,
    z0: z0 - 0.5,
    z1: z0 + ROW_H + 0.5,
  };
  out.push(
    solid(
      k.slabOf(
        { x: end, y: front.y0, w: 2.6, d: front.y1 - front.y0, r: 0.6 },
        front.z0,
        ROW_H + 1,
        P,
        2,
      ),
      { tone: "mid" },
    ),
    pull(front, end + 2.6),
  );
  return out.join("");
}

/** A reading magnifier lying on the plate: a rimmed lens and a turned handle. */
function magnifier() {
  const { x, y, r } = LENS;
  const handle = { x: x - r - 23, y: y - 2.5, w: 24, d: 5, r: 2.4 };
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: handle.x, y: y - r, w: r * 2 + 24, d: r * 2, r }, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(handle, 0, 4, P, 4), { tone: "mid" }),
    line(k.sideSeam({ ...handle, w: handle.w - 6 }, 2, P, 3), { tone: "lo" }),
    solid(k.cylinder(x, y, r, 0, 3.4, P, 48, 0.4), { tone: "mid" }),
    line(k.ring(x, y, r - 2.4, 3.4, P, 48), { tone: "lo" }),
    line(
      k.onTop(
        [
          [x - 6, y - 3],
          [x - 2, y - 7],
        ],
        3.4,
        P,
      ),
      { tone: "faint" },
    ),
    dots([at([handle.x + 3, y, 4])], { size: 0.5 }),
  ].join("");
}

/** A small stack of loose index cards on the plate. */
function cardStack() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const card = {
      x: STACK[0] + i * 1.2,
      y: STACK[1] + i * 1.6,
      w: 20,
      d: 30,
      r: 1,
    };
    out.push(
      solid(k.slabOf(card, lidTop + i * 1.1, 1.1, P, 2), {
        tone: "mid",
        crease: "none",
      }),
    );
  }
  const last = { x: STACK[0] + 3.6, y: STACK[1] + 4.8, w: 20, d: 30, r: 1 };
  for (const [i, width] of [22, 16, 19].entries()) {
    const x = last.x + 5 + i * 4;
    out.push(
      line(
        k.lineOnTop([x, last.y + 4], [x, last.y + 4 + width], lidTop + 4.4, P),
        {
          tone: i === 0 ? "mid" : "faint",
        },
      ),
    );
  }
  return out.join("");
}

export function figure() {
  return {
    label:
      "A card-catalogue cabinet of drawers on a bench plate with one drawer pulled out to show its index cards; one lit card rises out of the row beside a magnifier and a small stack of loose cards.",
    body: [benchPlate(PLATE, P), cabinet(), cardStack(), drawer(), magnifier()],
  };
}
