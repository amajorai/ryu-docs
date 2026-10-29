/*
 * "Passport": identity and credentials an agent carries, drawn as travel
 * papers on a bench plate. An open passport shows a photo page and a fresh
 * round stamp, the rubber stamp that made it stands by, and a lanyard badge
 * with a lit chip lies in front.
 */

import { benchPlate, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -112, y: -82, w: 236, d: 150, r: 8 };
const BOOK = { x: -100, y: -58, w: 138, d: 98, r: 4 };
const SPINE = BOOK.x + BOOK.w / 2;
const COVER_H = 2.2;
const PAGE_H = 4;
const PAGES_TOP = COVER_H + PAGE_H;
const MARK = [SPINE + 34, BOOK.y + 34];
const STAMP = { x: 76, y: -54, r: 17 };
const STAMP_H = 12;
const CARD = { x: 52, y: -10, w: 42, d: 62, r: 4 };
const CARD_H = 1.4;
const LOOP = { cx: 110, cy: -18, rx: 11, ry: 20 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [STAMP.x, STAMP.y, STAMP_H + 32]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

function book() {
  const left = {
    x: BOOK.x + 3,
    y: BOOK.y + 3,
    w: SPINE - BOOK.x - 5,
    d: BOOK.d - 6,
    r: 2,
  };
  const right = { ...left, x: SPINE + 2 };
  return [
    `<path class="iso-halo" d="${k.haloOf(BOOK, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(BOOK, 0, COVER_H, P, 4, 0.4), { tone: "mid" }),
    solid(k.slabOf(left, COVER_H, PAGE_H, P, 3), { tone: "mid", crease: "lo" }),
    solid(k.slabOf(right, COVER_H, PAGE_H, P, 3), {
      tone: "mid",
      crease: "lo",
    }),
    line(
      k.lineOnTop(
        [SPINE, BOOK.y + 1],
        [SPINE, BOOK.y + BOOK.d - 1],
        COVER_H + 0.4,
        P,
      ),
      {
        tone: "lo",
      },
    ),
    pageEdges(left),
    pageEdges(right),
    photoPage(left),
    stampPage(right),
  ].join("");
}

/** Faint seams on a page block's visible sides for the stacked leaves. */
const pageEdges = (page) =>
  line(
    [0.8, 1.6, 2.4, 3.2]
      .map((h) => k.sideSeam(page, COVER_H + h, P, 3))
      .join(""),
    { tone: "faint" },
  );

/** The photo page: a portrait frame, rule lines and a machine-read zone. */
function photoPage(page) {
  const z = PAGES_TOP;
  const photo = { x: page.x + 6, y: page.y + 8, w: 20, d: 26, r: 1 };
  const out = [
    line(k.planOutline(photo, z, P, 2), { tone: "lo" }),
    line(k.ring(photo.x + 10, photo.y + 10, 4.4, z, P, 28), { tone: "lo" }),
    line(
      k.onTop(
        Array.from({ length: 13 }, (_, i) => {
          const a = Math.PI + (i / 12) * Math.PI;
          return [
            photo.x + 10 + Math.cos(a) * 8,
            photo.y + 26 + Math.sin(a) * 7,
          ];
        }),
        z,
        P,
      ),
      { tone: "lo" },
    ),
  ];
  for (const [i, length] of [24, 18, 26, 14, 20].entries()) {
    const y = photo.y + 2 + i * 5;
    out.push(
      line(k.lineOnTop([photo.x + 26, y], [photo.x + 26 + length, y], z, P), {
        tone: i === 0 ? "mid" : "faint",
      }),
    );
  }
  for (let row = 0; row < 2; row++) {
    out.push(
      dots(
        k.dotGrid(page.x + 6, page.y + page.d - 14 + row * 5, 22, 1, 2.4, z, P),
        {
          size: 0.4,
          tone: "mid",
        },
      ),
    );
  }
  return out.join("");
}

/** The stamp page: a round entry stamp and an older dashed visa block. */
function stampPage(page) {
  const z = PAGES_TOP;
  const [x, y] = MARK;
  const ticks = k.radialTicks(x, y, 13, 36, 3, z, [1.6, 2.6], P);
  const visa = { x: page.x + 8, y: page.y + page.d - 30, w: 40, d: 22, r: 2 };
  return [
    line(k.ring(x, y, 14.5, z, P, 48), { tone: "mid" }),
    line(k.ring(x, y, 9, z, P, 40), { tone: "mid" }),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    line(k.onTop(starOf(x, y, 4.5, 2), z, P, true), { tone: "mid" }),
    line(k.planOutline(visa, z, P, 2), { tone: "lo", dashed: true }),
    line(
      k.lineOnTop([visa.x + 6, visa.y + 8], [visa.x + 30, visa.y + 8], z, P),
      {
        tone: "faint",
      },
    ),
    line(
      k.lineOnTop([visa.x + 6, visa.y + 14], [visa.x + 22, visa.y + 14], z, P),
      {
        tone: "faint",
      },
    ),
  ].join("");
}

/** A five-pointed star outline in plan, centred on (x, y). */
function starOf(x, y, outer, inner) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  });
}

/**
 * The rubber stamp: a round mount on a rubber foot the size of the imprint,
 * with a turned neck and a knurled grip.
 */
function rubberStamp() {
  const { x, y, r } = STAMP;
  const top = STAMP_H;
  const foot = { x: x - r, y: y - r, w: r * 2, d: r * 2, r };
  return [
    `<path class="iso-halo" d="${k.haloOf(foot, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.cylinder(x, y, r - 1.2, 0, 2.4, P, 40), { tone: "lo" }),
    solid(k.cylinder(x, y, r, 2.4, top - 2.4, P, 48, 0.8), { tone: "mid" }),
    line(k.sideArc(x, y, r, 6, P, 40), { tone: "faint" }),
    line(k.ring(x, y, r - 3.5, top, P, 40), { tone: "faint" }),
    screws(
      [0, 1, 2].map((i) => {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
        return [x + Math.cos(a) * (r - 6.5), y + Math.sin(a) * (r - 6.5)];
      }),
      top,
      P,
      1.1,
    ),
    solid(k.cylinder(x, y, 6, top, 2, P, 28), { tone: "lo" }),
    solid(k.cylinder(x, y, 4, top + 2, 14, P, 24), { tone: "mid" }),
    solid(k.cylinder(x, y, 9.5, top + 16, 3, P, 32, 0.5), { tone: "mid" }),
    solid(k.cylinder(x, y, 8.4, top + 19, 11, P, 32, 1.2), { tone: "mid" }),
    line(k.knurl(x, y, 8.4, top + 19, top + 30, 28, P), { tone: "lo" }),
    line(k.ring(x, y, 5, top + 30, P, 28), { tone: "faint" }),
    dots([at([x, y, top + 30])], { size: 0.5, tone: "mid" }),
  ].join("");
}

/** A closed ellipse band in plan, open where it meets the badge clip. */
function strapLoop(rx, ry) {
  const { cx, cy } = LOOP;
  const points = [];
  for (let s = 0; s <= 40; s++) {
    const a = Math.PI * 0.86 + 0.2 + (s / 40) * (Math.PI * 2 - 0.4);
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return points;
}

function lanyard() {
  const clip = [CARD.x + CARD.w / 2, CARD.y - 3];
  const z = 0.4;
  const strap = (rx, ry) => k.onTop([clip, ...strapLoop(rx, ry), clip], z, P);
  return [
    line(strap(LOOP.rx, LOOP.ry), { tone: "mid" }),
    line(strap(LOOP.rx - 3.2, LOOP.ry - 3.2), { tone: "lo" }),
    solid(
      k.slabOf(
        { x: clip[0] - 4, y: clip[1] - 3, w: 8, d: 7, r: 1.5 },
        0,
        2.4,
        P,
        3,
      ),
      {
        tone: "mid",
      },
    ),
  ].join("");
}

/** The badge: a card with a slot, a portrait, rules and the lit chip. */
function badge() {
  const z = CARD_H;
  const slot = {
    x: CARD.x + CARD.w / 2 - 7,
    y: CARD.y + 4,
    w: 14,
    d: 3,
    r: 1.5,
  };
  const photo = { x: CARD.x + 6, y: CARD.y + 14, w: 14, d: 18, r: 1 };
  const chip = { x: CARD.x + 24, y: CARD.y + 16, w: 9, d: 8, r: 1 };
  const out = [
    `<path class="iso-halo" d="${k.haloOf(CARD, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(CARD, 0, z, P, 4, 0.3), { tone: "mid" }),
    line(k.planOutline(slot, z, P, 3), { tone: "lo" }),
    line(k.planOutline(photo, z, P, 2), { tone: "lo" }),
    line(k.ring(photo.x + 7, photo.y + 7, 3.2, z, P, 24), { tone: "faint" }),
    solid(k.slabOf(chip, z, 0.8, P, 2), {
      tone: "hi",
      lit: true,
      crease: "lo",
    }),
    line(
      k.lineOnTop(
        [chip.x + chip.w / 2, chip.y + 1.5],
        [chip.x + chip.w / 2, chip.y + chip.d - 1.5],
        z + 0.8,
        P,
      ),
      {
        tone: "lo",
      },
    ),
  ];
  for (const [i, length] of [26, 20, 24].entries()) {
    const y = CARD.y + 38 + i * 5;
    out.push(
      line(k.lineOnTop([CARD.x + 6, y], [CARD.x + 6 + length, y], z, P), {
        tone: "faint",
      }),
    );
  }
  return out.join("");
}

export function figure() {
  return {
    label:
      "An open passport with a photo page and a round stamp on a bench plate, a rubber stamp standing beside it and a lanyard badge with a lit chip in front.",
    body: [benchPlate(PLATE, P), book(), rubberStamp(), lanyard(), badge()],
  };
}
