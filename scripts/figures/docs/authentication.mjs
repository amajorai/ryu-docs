/*
 * "Authentication": proving who (or which device) is asking before anything
 * opens, drawn as a badge reader. An ID card stands seated in the slot on top
 * of an upright reader with a keypad and a small screen; the card (the lit
 * part) is the identity being checked, and a phone showing a pairing code and a
 * one-time-code fob lie beside it.
 */

import {
  benchPlate,
  cable,
  dots,
  k,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -46, y: -70, w: 128, d: 128, r: 8 };
const BASE = { x: -34, y: -38, w: 30, d: 66, r: 3 };
const BASE_H = 5;
const BODY = { x0: -28, x1: -10, y0: -32, y1: 22 };
const TOP = BASE_H + 64;
const CARD = { y0: -14, y1: 18, rise: 34, t: 1.2 };
const KEYS = {
  y: [-16, -5, 6],
  z: [BASE_H + 36, BASE_H + 26, BASE_H + 16, BASE_H + 6],
};
const SCREEN = { y0: -26, y1: 16, z0: BASE_H + 43, z1: BASE_H + 58 };
const FOB = { x: 16, y: 22, w: 32, d: 16, r: 6 };
const PHONE = { x: 8, y: -60, w: 58, d: 30, r: 5 };
const PHONE_H = 3.6;
const CODE = 13;
const CELL = 1.6;
const FOB_H = 4.5;

const CARD_X = (BODY.x0 + BODY.x1) / 2;
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [CARD_X, CARD.y0, TOP + CARD.rise],
    [CARD_X, CARD.y1, TOP + CARD.rise],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const { cosA } = k.cameraOf(P);
const shadeOf = (ny) =>
  Math.min(3, Math.max(0, Math.floor(((1 + ny * cosA) / 2) * 4)));

/** A profile of [y, z] pairs swept along x from x0 to x1 (cf. security.mjs). */
function prismX(profile, x0, x1, { tone = "mid", lit = false } = {}) {
  const count = profile.length;
  let area = 0;
  for (let i = 0; i < count; i++) {
    const [ay, az] = profile[i];
    const [by, bz] = profile[(i + 1) % count];
    area += ay * bz - by * az;
  }
  const sign = area > 0 ? 1 : -1;
  const point = ([y, z], x) => at([x, y, z]);
  const faces = [];
  for (let i = 0; i < count; i++) {
    const a = profile[i];
    const b = profile[(i + 1) % count];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ny = (sign * (b[1] - a[1])) / length;
    const nz = (-sign * (b[0] - a[0])) / length;
    if (k.depthOf([0, ny, nz], P) <= 1e-6) {
      continue;
    }
    const paint =
      nz > 0.55
        ? 'class="iso-top"'
        : `class="iso-shade" data-shade="${shadeOf(ny)}"`;
    const quad = k.pathOf(
      [point(a, x0), point(b, x0), point(b, x1), point(a, x1)],
      true,
    );
    faces.push({
      depth: k.depthOf([x0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2], P),
      svg: `<path ${paint} d="${quad}"/>`,
    });
  }
  const front = k.pathOf(
    profile.map((v) => point(v, x1)),
    true,
  );
  const body = faces
    .sort((a, b) => a.depth - b.depth)
    .map((face) => face.svg)
    .join("");
  return `<g class="iso-solid" data-seamless=""${lit ? ' data-lit=""' : ""}>${body}<path class="iso-shade" data-shade="3" d="${front}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${front}"/></g>`;
}

/** A rounded rectangle as [y, z] points. */
function roundRect(y0, y1, z0, z1, r) {
  return k
    .roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, 4)
    .map(([y, z]) => [y, z]);
}

/** A closed outline on the face x between y0..y1 and z0..z1. */
const faceRect = (x, y0, y1, z0, z1) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );

function reader() {
  const { x0, x1, y0, y1 } = BODY;
  const slot = {
    x: CARD_X - 1.6,
    y: CARD.y0 - 3,
    w: 3.2,
    d: CARD.y1 - CARD.y0 + 6,
    r: 1.2,
  };
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BASE, 0, 2, P)}"/>`,
    solid(k.slabOf(BASE, 0, BASE_H, P, 4, 0.6), { tone: "lo" }),
    screws(
      k.corners(BASE, 3.5).filter(([x]) => x > BASE.x + 10),
      BASE_H,
      P,
      1,
    ),
    solid(
      k.slabOf(
        { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 4 },
        BASE_H,
        TOP - BASE_H,
        P,
        5,
        1,
      ),
      {
        tone: "mid",
      },
    ),
    line(
      k.sideSeam({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 4 }, TOP - 6, P, 5),
      {
        tone: "faint",
      },
    ),
    solid(k.slabOf(slot, TOP - 0.4, 0.4, P, 2), { tone: "lo", crease: "none" }),
    `<path class="iso-shade" data-shade="0" d="${faceRect(x1, SCREEN.y0, SCREEN.y1, SCREEN.z0, SCREEN.z1)}"/>`,
    line(faceRect(x1, SCREEN.y0, SCREEN.y1, SCREEN.z0, SCREEN.z1), {
      tone: "lo",
    }),
    line(
      faceRect(x1, SCREEN.y0 - 2, SCREEN.y1 + 2, SCREEN.z0 - 2, SCREEN.z1 + 2),
      {
        tone: "faint",
      },
    ),
  ];
  // A progress bar and two dashes stand for the screen's prompt.
  const mid = (SCREEN.z0 + SCREEN.z1) / 2;
  out.push(
    line(faceRect(x1, SCREEN.y0 + 6, SCREEN.y1 - 6, mid - 2, mid + 2), {
      tone: "mid",
    }),
    `<path class="iso-shade" data-shade="3" d="${faceRect(x1, SCREEN.y0 + 6, SCREEN.y0 + 26, mid - 2, mid + 2)}"/>`,
    line(
      k.segment(
        [x1, SCREEN.y0 + 6, SCREEN.z1 - 5],
        [x1, SCREEN.y0 + 20, SCREEN.z1 - 5],
        P,
      ),
      { tone: "faint" },
    ),
  );
  for (const z of KEYS.z) {
    for (const y of KEYS.y) {
      out.push(
        prismX(roundRect(y - 3.6, y + 3.6, z - 3, z + 3, 1), x1, x1 + 1.4, {
          tone: "lo",
        }),
      );
    }
  }
  // A grille of slots under the keypad.
  for (let i = 0; i < 5; i++) {
    const y = 12 + i * 2;
    out.push(
      line(k.segment([x1, y, BASE_H + 8], [x1, y, BASE_H + 34], P), {
        tone: "faint",
      }),
    );
  }
  out.push(
    lamp([x1 - 5, y0 + 6], TOP, P, { radius: 2.4 }),
    screws([[x1 - 4, y1 - 5]], TOP, P, 1),
  );
  return out.join("");
}

/** The ID card seated in the slot: a photo, rule lines and a clip hole. */
function card() {
  const { y0, y1, rise, t } = CARD;
  const face = CARD_X + t / 2;
  const top = TOP + rise;
  const photo = { y0: y1 - 13, y1: y1 - 3, z0: top - 22, z1: top - 9 };
  const head = [face, (photo.y0 + photo.y1) / 2, photo.z1 - 4.5];
  const rules = [];
  for (const [i, width] of [12, 9, 11].entries()) {
    const z = top - 12 - i * 4.5;
    rules.push(k.segment([face, y0 + 3, z], [face, y0 + 3 + width, z], P));
  }
  const shoulders = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (i / 8);
    return at([face, head[1] + Math.cos(a) * 4, photo.z0 + Math.sin(a) * 4.5]);
  });
  return [
    prismX(roundRect(y0, y1, TOP, top, 2.4), CARD_X - t / 2, face, {
      tone: "hi",
      lit: true,
    }),
    line(faceRect(face, photo.y0, photo.y1, photo.z0, photo.z1), {
      tone: "lo",
    }),
    line(k.sideRing(head, 2.2, "x", P, 14), { tone: "lo" }),
    line(k.pathOf(shoulders), { tone: "lo" }),
    line(rules.join(""), { tone: "faint" }),
    line(
      faceRect(
        face,
        (y0 + y1) / 2 - 4,
        (y0 + y1) / 2 + 4,
        top - 4.5,
        top - 2.8,
      ),
      {
        tone: "lo",
      },
    ),
    line(k.segment([face, y0 + 3, TOP + 6], [face, y1 - 3, TOP + 6], P), {
      tone: "faint",
    }),
  ].join("");
}

/** A one-time-code fob lying on the bench: a code window, a button, a ring. */
function fob() {
  const { x, y, w, d } = FOB;
  const window = { x: x + 6, y: y + 4, w: 12, d: d - 8, r: 1 };
  const ring = [x + w - 4, y + d / 2];
  return [
    `<path class="iso-halo" d="${k.haloOf(FOB, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(FOB, 0, FOB_H, P, 6, 0.6), { tone: "mid" }),
    solid(k.slabOf(window, FOB_H, 0.3, P, 2), { tone: "lo", crease: "none" }),
    dots(
      Array.from({ length: 6 }, (_, i) =>
        at([window.x + window.w / 2, window.y + 1.6 + i * 1.4, FOB_H + 0.3]),
      ),
      { size: 0.45, tone: "hi" },
    ),
    solid(k.cylinder(x + 23, y + d / 2, 2.4, FOB_H, 0.8, P, 20), {
      tone: "lo",
    }),
    line(k.ring(ring[0], ring[1], 1.6, FOB_H, P, 16), { tone: "lo" }),
    line(k.ring(ring[0] + 6, ring[1], 6, 0.2, P, 32), { tone: "mid" }),
  ].join("");
}

/** A paired phone lying face up, its screen showing a pairing code matrix. */
function phone() {
  const screen = k.insetPlan(PHONE, 2.4);
  const z = PHONE_H + 0.3;
  const size = CODE * CELL;
  const [ox, oy] = [screen.x + 16, screen.y + (screen.d - size) / 2];
  const square = (i, j, span, inset = 0) =>
    k.planOutline(
      {
        x: ox + i * CELL + inset,
        y: oy + j * CELL + inset,
        w: span * CELL - inset * 2,
        d: span * CELL - inset * 2,
        r: 0,
      },
      z,
      P,
      1,
    );
  const finders = [
    [0, 0],
    [CODE - 4, 0],
    [0, CODE - 4],
  ];
  const inFinder = (i, j) =>
    finders.some(([fi, fj]) => i >= fi && i < fi + 4 && j >= fj && j < fj + 4);
  const centre = (i, j) =>
    at([ox + (i + 0.5) * CELL, oy + (j + 0.5) * CELL, z]);
  const cells = [];
  for (let i = 0; i < CODE; i++) {
    for (let j = 0; j < CODE; j++) {
      if (!inFinder(i, j) && (i * 31 + j * 17 + i * j * 7) % 5 < 2) {
        cells.push(centre(i, j));
      }
    }
  }
  return [
    `<path class="iso-halo" d="${k.haloOf(PHONE, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(PHONE, 0, PHONE_H, P, 6, 0.6), { tone: "mid" }),
    solid(k.slabOf(screen, PHONE_H, 0.3, P, 4), { tone: "lo", crease: "none" }),
    dots(cells, { size: 0.85, tone: "lo" }),
    dots(
      finders.map(([i, j]) =>
        at([ox + (i + 2) * CELL, oy + (j + 2) * CELL, z]),
      ),
      { size: 1.3, tone: "lo" },
    ),
    line(finders.map(([i, j]) => square(i, j, 4, 0.3)).join(""), {
      tone: "lo",
    }),
    line(
      k.lineOnTop(
        [screen.x + 5, screen.y + 7],
        [screen.x + 5, screen.y + screen.d - 7],
        z,
        P,
      ),
      { tone: "faint" },
    ),
  ].join("");
}

export function figure() {
  return {
    label:
      "A badge reader on a bench plate with a lit ID card seated in its top slot, a keypad and a screen on its face, beside a phone showing a pairing code and a one-time-code fob.",
    body: [
      benchPlate(PLATE, P),
      cable(
        [BASE.x + 4, BASE.y + 6, BASE_H],
        [PLATE.x + 10, PLATE.y + 12, 0.4],
        [[BASE.x - 4, BASE.y + 6, 0.4]],
        P,
        { tone: "mid" },
      ),
      reader(),
      card(),
      phone(),
      fob(),
    ],
  };
}
