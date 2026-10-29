/*
 * "Sites": generated websites, drawn as an H-frame easel holding a stack of
 * wireframe page panels on stepped risers. The front panel shows a header, a
 * hero with an image placeholder and a call-to-action button (the one lit
 * part) above a row of cards; spare page cards lie stacked on the bench.
 */

import {
  benchPlate,
  dots,
  k,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -112, y: -50, w: 212, d: 94, r: 8 };
const UPRIGHT_X = [-90, 44];
const UPRIGHT = { y: -24, w: 6, d: 5, h: 104 };
const FOOT = { y: -40, d: 38, h: 4 };
const STRETCHER_Z = 8;
const CROSSBAR_Z = 94;
const LEDGE = { x: -90, y: -22, w: 140, d: 28, r: 1.5 };
const LEDGE_Z = 18;
const LEDGE_H = 4;
const PAGE = { w: 100, d: 3, h: 60 };
const PAGES = [
  { x: -64, y: -18, z: 34 },
  { x: -70, y: -11, z: 28 },
  { x: -76, y: -4, z: LEDGE_Z + LEDGE_H },
];
const TIER = { x: -84, w: 126, step: 1 };
const CARDS = { x: 56, y: 6, w: 34, d: 26, r: 2 };
const CARD_T = 1.4;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [UPRIGHT_X[0], UPRIGHT.y, UPRIGHT.h + 2],
    [UPRIGHT_X[1] + UPRIGHT.w, UPRIGHT.y, UPRIGHT.h + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
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

const faceLine = (x0, x1, z, y) => k.segment([x0, y, z], [x1, y, z], P);

/** The easel's feet, uprights and lower stretcher: everything behind the pages. */
function frame() {
  const out = [];
  for (const x of UPRIGHT_X) {
    const foot = { x: x - 2, y: FOOT.y, w: UPRIGHT.w + 4, d: FOOT.d, r: 2 };
    out.push(
      `<path class="iso-halo" d="${k.haloOf(foot, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
      solid(k.slabOf(foot, 0, FOOT.h, P, 3, 0.4), { tone: "lo" }),
      solid(
        k.slabOf(
          { x, y: UPRIGHT.y, w: UPRIGHT.w, d: UPRIGHT.d, r: 1 },
          FOOT.h,
          UPRIGHT.h - FOOT.h,
          P,
          2,
        ),
        { tone: "mid" },
      ),
    );
  }
  const span = {
    x: UPRIGHT_X[0] + UPRIGHT.w,
    w: UPRIGHT_X[1] - UPRIGHT_X[0] - UPRIGHT.w,
    d: 3,
    r: 0.6,
  };
  out.push(
    solid(k.slabOf({ ...span, y: UPRIGHT.y + 1 }, STRETCHER_Z, 4, P, 2), {
      tone: "lo",
    }),
    solid(k.slabOf({ ...span, y: UPRIGHT.y + 1 }, CROSSBAR_Z, 5, P, 2), {
      tone: "mid",
    }),
  );
  // Height-adjust holes down the front of each upright.
  const holes = [];
  for (const x of UPRIGHT_X) {
    for (let z = 30; z < UPRIGHT.h - 14; z += 12) {
      holes.push(at([x + UPRIGHT.w / 2, UPRIGHT.y + UPRIGHT.d, z]));
    }
  }
  out.push(dots(holes, { size: 0.55, tone: "lo" }));
  return out.join("");
}

/** The ledge the pages stand on, with a lip in front of the front page. */
function ledge() {
  return solid(k.slabOf(LEDGE, LEDGE_Z, LEDGE_H, P, 3, 0.4), { tone: "mid" });
}

/** The stepped riser under a back page: a block from the ledge to its foot. */
function tier({ y, z }) {
  return solid(
    k.slabOf(
      { x: TIER.x, y: y - TIER.step, w: TIER.w, d: PAGE.d + 4, r: 0.6 },
      LEDGE_Z + LEDGE_H,
      z - LEDGE_Z - LEDGE_H,
      P,
      2,
      0.3,
    ),
    { tone: "lo" },
  );
}

function lip() {
  const front = PAGES[2].y + PAGE.d;
  return [
    solid(
      k.slabOf(
        { x: LEDGE.x, y: front, w: LEDGE.w, d: 3, r: 1 },
        LEDGE_Z + LEDGE_H,
        3,
        P,
        2,
      ),
      { tone: "mid" },
    ),
    screws(
      [
        [LEDGE.x + 4, front + 1.5],
        [LEDGE.x + LEDGE.w - 4, front + 1.5],
      ],
      LEDGE_Z + LEDGE_H + 3,
      P,
      0.9,
    ),
  ].join("");
}

/** The wireframe drawn on a page's front face; the full one only up front. */
function wireframe({ x, y, z }, full) {
  const face = y + PAGE.d;
  const top = z + PAGE.h;
  const x0 = x + 6;
  const x1 = x + PAGE.w - 6;
  const out = [
    line(faceRect(x0, x1, top - 11, top - 5, face), { tone: "lo" }),
    line(
      [0, 7, 14]
        .map((dx) => faceLine(x1 - 22 + dx, x1 - 18 + dx, top - 8, face))
        .join(""),
      { tone: "faint" },
    ),
    line(faceRect(x0 + 2, x0 + 8, top - 9.5, top - 6.5, face), {
      tone: "mid",
    }),
  ];
  if (!full) {
    return out.join("");
  }
  const heroTop = top - 15;
  const heroBottom = top - 36;
  const split = x0 + 46;
  out.push(
    line(
      [
        faceLine(x0, x0 + 38, heroTop - 3, face),
        faceLine(x0, x0 + 30, heroTop - 7, face),
      ].join(""),
      { tone: "mid" },
    ),
    line(
      [
        faceLine(x0, x0 + 34, heroTop - 12, face),
        faceLine(x0, x0 + 26, heroTop - 15, face),
      ].join(""),
      { tone: "faint" },
    ),
    // The image placeholder: a frame crossed corner to corner.
    line(
      [
        faceRect(split, x1, heroBottom, heroTop, face),
        k.segment([split, face, heroBottom], [x1, face, heroTop], P),
        k.segment([split, face, heroTop], [x1, face, heroBottom], P),
      ].join(""),
      { tone: "lo" },
    ),
  );
  const cardWidth = (x1 - x0 - 8) / 3;
  const cards = [];
  for (let i = 0; i < 3; i++) {
    const cx = x0 + i * (cardWidth + 4);
    cards.push(
      faceRect(cx, cx + cardWidth, z + 6, heroBottom - 5, face),
      faceLine(cx + 3, cx + cardWidth - 6, heroBottom - 9, face),
    );
  }
  out.push(line(cards.join(""), { tone: "faint" }));
  // The call-to-action button stands proud of the face and is lit.
  out.push(
    solid(
      k.slabOf(
        { x: x0, y: face, w: 16, d: 1.2, r: 0.4 },
        heroBottom + 1,
        4.5,
        P,
        2,
      ),
      { tone: "hi", lit: true },
    ),
  );
  return out.join("");
}

function pages() {
  return PAGES.map((page, i) => {
    const plan = { x: page.x, y: page.y, w: PAGE.w, d: PAGE.d, r: 0.6 };
    const full = i === PAGES.length - 1;
    return [
      full ? "" : tier(page),
      solid(k.slabOf(plan, page.z, PAGE.h, P, 2, 0.3), {
        tone: "mid",
        crease: "lo",
      }),
      wireframe(page, full),
    ].join("");
  }).join("");
}

/** A short stack of spare page cards on the bench, each a little askew. */
function cardStack() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(CARDS, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
  ];
  for (const [i, shift] of [0, 2.5, -1.5].entries()) {
    const card = { ...CARDS, x: CARDS.x + shift, y: CARDS.y - shift * 0.6 };
    const z = i * CARD_T;
    out.push(solid(k.slabOf(card, z, CARD_T, P, 3), { tone: "mid" }));
    if (i === 2) {
      const top = z + CARD_T;
      out.push(
        line(
          k.planOutline(
            { x: card.x + 4, y: card.y + 4, w: card.w - 8, d: 5, r: 0.6 },
            top,
            P,
            2,
          ),
          { tone: "lo" },
        ),
        line(
          [10, 14, 18, 22]
            .map((dy) =>
              k.lineOnTop(
                [card.x + 4, card.y + dy],
                [card.x + (dy % 8 === 2 ? 26 : 20), card.y + dy],
                top,
                P,
              ),
            )
            .join(""),
          { tone: "faint" },
        ),
      );
    }
  }
  return out.join("");
}

export function figure() {
  return {
    label:
      "An easel on a bench plate holding a stack of wireframe web page panels, the front one with a header, hero image, lit button and row of cards, beside a stack of spare page cards.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -96, y: PLATE.y + PLATE.d - 16, w: 92, d: 7, r: 1 }, P),
      frame(),
      ledge(),
      pages(),
      lip(),
      cardStack(),
    ],
  };
}
