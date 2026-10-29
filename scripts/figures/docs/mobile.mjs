/*
 * "Mobile": the phone app paired to your own Ryu node, drawn as a phone in a
 * docking cradle (the lit part) and a small base station on one bench plate.
 * The station shows a pairing code on its face and sends pairing arcs across
 * to the phone.
 */

import {
  benchPlate,
  dots,
  k,
  knob,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -50, y: -84, w: 110, d: 156, r: 8 };
const CRADLE = { x: -22, y: 6, w: 30, d: 56, r: 4 };
const CRADLE_H = 7;
const PHONE = { x: -10, y: 12, w: 4.5, d: 44, r: 2.2 };
const PHONE_H = 74;
const STATION = { x: -6, y: -72, w: 54, d: 54, r: 9 };
const EMITTER = [16, -28];
const STATION_H = 26;
const ARC_RADII = [12, 21, 30, 39];
// Arc angles above and below the emitter's horizon, in radians.
const ARC_FROM = -0.32;
const ARC_TO = 0.78;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [PHONE.x, PHONE.y, CRADLE_H + PHONE_H + 4],
    [PHONE.x, PHONE.y + PHONE.d, CRADLE_H + PHONE_H + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(5px)"/>`;

/** A closed outline on the vertical face `x` between y0..y1 and z0..z1. */
const faceRect = (y0, y1, z0, z1, x) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );

// Faces point +x; on a face the viewer's left is +y.
const PHONE_FACE = PHONE.x + PHONE.w;
const PHONE_BASE = CRADLE_H;
const STATION_FACE = STATION.x + STATION.w;

function cradle() {
  return [
    halo(CRADLE),
    solid(k.slabOf(CRADLE, 0, CRADLE_H, P, 5, 0.6), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(CRADLE, 3), CRADLE_H, P, 3), {
      tone: "faint",
    }),
    screws(k.corners(CRADLE, 4), CRADLE_H, P, 1.2),
    // Back rest that holds the phone upright.
    solid(
      k.slabOf(
        { x: PHONE.x - 4, y: PHONE.y + 8, w: 4, d: PHONE.d - 16, r: 1.2 },
        CRADLE_H,
        40,
        P,
        3,
        0.4,
      ),
      { tone: "mid" },
    ),
  ].join("");
}

/** The phone: the lit part, with a chat on its screen. */
function phone() {
  const top = PHONE_BASE + PHONE_H;
  const left = PHONE.y + PHONE.d - 3;
  const right = PHONE.y + 3;
  const out = [
    solid(k.slabOf(PHONE, PHONE_BASE, PHONE_H, P, 6, 0.4), {
      tone: "hi",
      lit: true,
    }),
    line(faceRect(left, right, PHONE_BASE + 5, top - 5, PHONE_FACE), {
      tone: "lo",
    }),
    line(
      k.segment(
        [PHONE_FACE, PHONE.y + PHONE.d / 2 + 6, top - 2.6],
        [PHONE_FACE, PHONE.y + PHONE.d / 2 - 6, top - 2.6],
        P,
      ),
      { tone: "mid" },
    ),
  ];
  // Message bubbles alternating sides, then a composer bar.
  const bubbles = [
    [left - 3, left - 26, 10],
    [right + 24, right + 3, 8],
    [left - 3, left - 22, 12],
  ];
  let z = top - 12;
  for (const [from, to, height] of bubbles) {
    out.push(
      line(faceRect(from, to, z - height, z, PHONE_FACE), { tone: "lo" }),
    );
    z -= height + 5;
  }
  out.push(
    line(
      faceRect(
        left - 3,
        right + 3,
        PHONE_BASE + 9,
        PHONE_BASE + 15,
        PHONE_FACE,
      ),
      {
        tone: "mid",
      },
    ),
  );
  return out.join("");
}

/** The cradle's front lip, painted over the phone's foot. */
const lip = () =>
  solid(
    k.slabOf(
      { x: PHONE_FACE + 1, y: CRADLE.y + 6, w: 3, d: CRADLE.d - 12, r: 1 },
      CRADLE_H,
      5,
      P,
      3,
    ),
    { tone: "mid" },
  );

/** A pairing code on the station's face: three finder squares and a scatter. */
function pairingCode(y0, z0, size) {
  const cell = size / 7;
  const out = [];
  const finder = (y, z) => {
    out.push(
      line(faceRect(y, y - cell * 2.4, z, z + cell * 2.4, STATION_FACE), {
        tone: "mid",
      }),
      dots([at([STATION_FACE, y - cell * 1.2, z + cell * 1.2])], { size: 0.8 }),
    );
  };
  finder(y0, z0 + size - cell * 2.4);
  finder(y0 - size + cell * 2.4, z0 + size - cell * 2.4);
  finder(y0, z0);
  const scatter = [
    [3.5, 0.5],
    [4.5, 1.5],
    [5.5, 0.5],
    [3.5, 2.5],
    [5.5, 3.5],
    [4.5, 4.5],
    [6.5, 5.5],
    [3.5, 5.5],
    [1.5, 3.5],
    [0.5, 4.5],
  ];
  out.push(
    dots(
      scatter.map(([c, r]) => at([STATION_FACE, y0 - c * cell, z0 + r * cell])),
      { size: 0.9, tone: "lo" },
    ),
  );
  return out.join("");
}

function station() {
  const lid = k.insetPlan(STATION, 2);
  const out = [
    halo(STATION),
    solid(k.slabOf(STATION, 0, 4, P, 8, 0.8), { tone: "lo" }),
    solid(k.slabOf(lid, 4, STATION_H - 4, P, 8, 0.8), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(lid, 4), STATION_H, P, 6), {
      tone: "faint",
    }),
    line(
      faceRect(
        STATION.y + 46,
        STATION.y + 12,
        6,
        STATION_H - 4,
        STATION_FACE - 2,
      ),
      { tone: "lo" },
    ),
    pairingCode(STATION.y + 42, 7.5, 14.5),
  ];
  for (let i = 0; i < 5; i++) {
    const x = lid.x + 30 + i * 3.4;
    out.push(
      line(k.lineOnTop([x, lid.y + 8], [x, lid.y + 24], STATION_H, P), {
        tone: "lo",
      }),
    );
  }
  // The emitter dome the pairing arcs leave from.
  const [ex, ey] = EMITTER;
  out.push(
    solid(k.cylinder(ex, ey, 6, STATION_H, 1.2, P, 28), { tone: "lo" }),
    solid(k.cylinder(ex, ey, 4, STATION_H + 1.2, 2.4, P, 28, 0.8), {
      tone: "mid",
    }),
    line(k.ring(ex, ey, 2, STATION_H + 3.6, P, 20), { tone: "lo" }),
  );
  out.push(lamp([lid.x + 12, lid.y + 10], STATION_H, P));
  out.push(knob([lid.x + 40, lid.y + 38], STATION_H, P, { radius: 4.2 }));
  out.push(screws(k.corners(lid, 4.5), STATION_H, P, 1.2));
  return out.join("");
}

/** Arcs leaving the station's top toward the phone, in the vertical plane between them. */
function pairingArcs() {
  const center = [EMITTER[0], EMITTER[1], STATION_H + 4];
  const target = [PHONE.x, PHONE.y + PHONE.d / 2];
  const dx = target[0] - center[0];
  const dy = target[1] - center[1];
  const length = Math.hypot(dx, dy);
  const [ux, uy] = [dx / length, dy / length];
  return ARC_RADII.map((radius, index) => {
    const points = [];
    for (let step = 0; step <= 16; step++) {
      const angle = ARC_FROM + (step / 16) * (ARC_TO - ARC_FROM);
      const along = radius * Math.cos(angle);
      points.push(
        at([
          center[0] + ux * along,
          center[1] + uy * along,
          center[2] + radius * Math.sin(angle),
        ]),
      );
    }
    return line(k.pathOf(points), {
      tone: index < 2 ? "mid" : "lo",
      dashed: index === ARC_RADII.length - 1,
    });
  }).join("");
}

export function figure() {
  return {
    label:
      "A phone standing lit in a docking cradle beside a small base station that shows a pairing code, with pairing arcs passing from the station to the phone.",
    body: [
      benchPlate(PLATE, P),
      station(),
      pairingArcs(),
      cradle(),
      phone(),
      lip(),
    ],
  };
}
