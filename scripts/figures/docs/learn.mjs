/*
 * "Learn": guided paths through Ryu, drawn as a study bench. A row of volumes
 * stands between bookends, a stack of books (the top one lit) holds its place
 * with a ribbon, and an open notebook traces a dotted path from stop to stop.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -112, y: -72, w: 224, d: 136, r: 8 };
const ROW = { x: -90, y: -62, d: 34 };
const SPINES = [
  [11, 50],
  [9, 58],
  [13, 46],
  [10, 54],
  [12, 48],
  [8, 52],
  [14, 42],
];
const ENDS_H = 36;
const STACK = [
  { x: 14, y: -58, w: 84, d: 62, h: 10, turn: -4 },
  { x: 20, y: -52, w: 72, d: 52, h: 8 },
  { x: 24, y: -48, w: 64, d: 48, h: 7 },
];
const NOTE = { x: -100, y: -6, w: 96, d: 56, r: 2 };
const NOTE_H = 4;
const PENCIL = { x: 34, y: 28, w: 48, d: 3, r: 0.6 };

const tallest = Math.max(...SPINES.map(([, h]) => h));
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [ROW.x, ROW.y, tallest]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(5px)"/>`;

/** A rounded plan turned by `degrees` about its own centre. */
function turnedRing(plan, degrees = 0) {
  const ring = k.roundedPlan({ r: 1.2, ...plan }, 3);
  if (!degrees) {
    return ring;
  }
  const a = (degrees * Math.PI) / 180;
  const cx = plan.x + plan.w / 2;
  const cy = plan.y + plan.d / 2;
  return ring.map(([x, y]) => [
    cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
    cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
  ]);
}

/** A ribbon over the front edge at `z`, hanging `drop` down the page block. */
function ribbon(x, edge, z, drop, width) {
  const strip = [
    [x, edge - 12, z + 0.1],
    [x, edge + 0.2, z + 0.1],
    [x, edge + 0.2, z - drop],
  ];
  const near = strip.map(at);
  const far = strip.map(([sx, sy, sz]) => at([sx + width, sy, sz])).reverse();
  const notch = at([x + width / 2, edge + 0.2, z - drop + 2.4]);
  const d = k.pathOf([...near, notch, ...far], true);
  return `<g class="iso-solid"><path class="iso-fill" d="${d}"/><path class="iso-line iso-edge" data-tone="mid" d="${d}"/></g>`;
}

function bookend(x, outward) {
  const upright = { x, y: ROW.y - 1, w: 3, d: ROW.d + 2, r: 0.8 };
  const foot = {
    x: outward < 0 ? x - 12 : x,
    y: ROW.y + 4,
    w: 15,
    d: ROW.d - 8,
    r: 1,
  };
  return [
    solid(k.slabOf(foot, 0, 1.6, P, 3, 0.3), { tone: "mid" }),
    solid(k.slabOf(upright, 0, ENDS_H, P, 3, 0.4), { tone: "mid" }),
    dots([at([foot.x + foot.w / 2 + outward * 3, foot.y + foot.d / 2, 1.6])], {
      size: 0.5,
    }),
  ].join("");
}

/** Upright volumes in a row, spines facing the viewer with two bands each. */
function shelfRow() {
  const out = [bookend(ROW.x - 4, -1)];
  let x = ROW.x;
  for (const [i, [w, h]] of SPINES.entries()) {
    const depth = ROW.d - (i % 3) * 2;
    const plan = { x, y: ROW.y, w, d: depth, r: 1 };
    out.push(solid(k.slabOf(plan, 0, h, P, 3, 0.3), { tone: "mid" }));
    const face = ROW.y + depth;
    for (const z of [5, h - 6]) {
      out.push(
        line(k.segment([x + 1.2, face, z], [x + w - 1.2, face, z], P), {
          tone: "lo",
        }),
      );
    }
    if (i % 2 === 0) {
      out.push(
        line(
          k.pathOf(
            [
              [x + w / 2, face, h - 12],
              [x + w / 2, face, h - 22],
            ].map(at),
          ),
          { tone: "faint" },
        ),
      );
    }
    x += w + 0.6;
  }
  out.push(bookend(x + 0.4, 1));
  return out.join("");
}

/** One book lying flat: covers around an inset page block with page lines. */
function flatBook(book, z, lit = false) {
  const { h, turn = 0 } = book;
  const pages = {
    x: book.x + 1.5,
    y: book.y + 2,
    w: book.w - 3.5,
    d: book.d - 4,
    r: 0.6,
  };
  const pageRing = turnedRing(pages, turn);
  const out = [
    solid(k.extrude(turnedRing(book, turn), z, 1.4, P), { tone: "mid" }),
    solid(k.extrude(pageRing, z + 1.4, h - 2.8, P), {
      tone: "lo",
      crease: "none",
    }),
  ];
  for (let s = z + 2.4; s < z + h - 1.6; s += 1.1) {
    out.push(line(k.ringSeam(pageRing, s, P), { tone: "faint" }));
  }
  out.push(
    solid(k.extrude(turnedRing(book, turn), z + h - 1.4, 1.4, P), {
      tone: lit ? "hi" : "mid",
      lit,
    }),
  );
  return out.join("");
}

function stack() {
  const out = [halo(STACK[0])];
  let z = 0;
  for (const [i, book] of STACK.entries()) {
    out.push(flatBook(book, z, i === STACK.length - 1));
    z += book.h;
  }
  const top = STACK.at(-1);
  // Embossed title panel, then the ribbon over the front edge onto the book below.
  out.push(
    line(
      k.planOutline(
        { x: top.x + 10, y: top.y + 8, w: 22, d: 12, r: 1 },
        z,
        P,
        2,
      ),
      { tone: "lo" },
    ),
  );
  const below = STACK[1].h + top.h - 2;
  out.push(ribbon(top.x + top.w - 16, top.y + top.d, z, below, 3.5));
  return out.join("");
}

/** An open notebook: two pages with ruled lines and a dotted learning path. */
function notebook() {
  const out = [
    halo(NOTE),
    solid(k.slabOf(NOTE, 0, 1.4, P, 3, 0.3), { tone: "mid" }),
  ];
  const half = (NOTE.w - 4) / 2;
  const pages = [0, 1].map((i) => ({
    x: NOTE.x + 2 + i * half,
    y: NOTE.y + 2,
    w: half,
    d: NOTE.d - 4,
    r: 0.6,
  }));
  for (const page of pages) {
    out.push(solid(k.slabOf(page, 1.4, NOTE_H - 1.4, P, 2), { tone: "mid" }));
  }
  const [left, right] = pages;
  for (let y = left.y + 7; y < left.y + left.d - 4; y += 4.5) {
    out.push(
      line(k.lineOnTop([left.x + 5, y], [left.x + left.w - 5, y], NOTE_H, P), {
        tone: "faint",
      }),
    );
  }
  const stops = [
    [right.x + 7, right.y + right.d - 8],
    [right.x + 17, right.y + 30],
    [right.x + 30, right.y + 22],
    [right.x + 33, right.y + 8],
  ];
  out.push(line(k.onTop(stops, NOTE_H, P), { tone: "mid", dotted: true }));
  out.push(screws(stops, NOTE_H, P, 1.6));
  return out.join("");
}

function pencil() {
  const body = PENCIL;
  const { y } = body;
  return [
    solid(k.slabOf(body, 0, 3, P, 2, 0.2), { tone: "mid" }),
    solid(k.slabOf({ ...body, x: body.x - 6, w: 6.4 }, 0.4, 2.2, P, 2), {
      tone: "mid",
    }),
    line(k.lineOnTop([body.x + 40, y], [body.x + 40, y + 3], 3, P), {
      tone: "lo",
    }),
    dots([at([body.x - 6, y + 1.5, 1.5])], { size: 0.6, tone: "hi" }),
  ].join("");
}

export function figure() {
  const parts = byDepth(
    [
      [-50, -45, shelfRow],
      [56, -27, stack],
      [NOTE.x + NOTE.w / 2, NOTE.y + NOTE.d / 2, notebook],
      [PENCIL.x + PENCIL.w / 2, PENCIL.y, pencil],
    ],
    P,
  );
  return {
    label:
      "A study bench: a row of upright books between bookends, a stack of books with a ribbon bookmark and a lit top volume, and an open notebook with a dotted path.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: 16, y: PLATE.y + PLATE.d - 16, w: 100, d: 7, r: 1 }, P),
      ...parts.map(([, , draw]) => draw()),
    ],
  };
}
