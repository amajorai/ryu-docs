/*
 * "Use Ryu": one Core context reached from every surface, drawn as a docking
 * station. A hub on a bench plate (Core) is cabled to a workstation (Desktop),
 * a phone in a cradle (Mobile) and a terminal puck (CLI); the hub's lamp is the
 * one lit part.
 */

import {
  benchPlate,
  byDepth,
  cable,
  dots,
  jack,
  k,
  knob,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "./parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -146, y: -76, w: 266, d: 138, r: 8 };
const HUB = { x: -30, y: -22, w: 60, d: 46, r: 4 };
const HUB_H = 20;
const DESK = { x: -136, y: -64, w: 80, d: 54, r: 3 };
const SCREEN_H = 52;
const CRADLE = { x: 64, y: -64, w: 46, d: 26, r: 3 };
const PHONE = { x: 71, y: -58, w: 32, d: 4.5, r: 2.5 };
const PUCK = [72, 30];
const PUCK_R = 18;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [DESK.x, DESK.y, SCREEN_H + 6],
    [PHONE.x + PHONE.w, PHONE.y, 66],
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

function workstation() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(DESK, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
  ];
  out.push(solid(k.slabOf(DESK, 0, 5, P, 5, 0.6), { tone: "mid" }));
  const keys = { x: DESK.x + 8, y: DESK.y + 14, w: DESK.w - 16, d: 22, r: 1.5 };
  out.push(line(k.planOutline(keys, 5, P, 3), { tone: "faint" }));
  out.push(
    dots(k.dotGrid(keys.x + 4, keys.y + 3.5, 13, 4, 5, 5, P), {
      size: 0.45,
      tone: "lo",
    }),
  );
  const pad = {
    x: DESK.x + DESK.w / 2 - 12,
    y: DESK.y + 40,
    w: 24,
    d: 11,
    r: 1.5,
  };
  out.push(line(k.planOutline(pad, 5, P, 3), { tone: "lo" }));
  // Hinge barrel, then the lid standing on it.
  out.push(
    solid(
      k.slabOf(
        { x: DESK.x + 6, y: DESK.y, w: DESK.w - 12, d: 5, r: 2 },
        5,
        3,
        P,
        4,
      ),
      {
        tone: "mid",
      },
    ),
  );
  const lid = { x: DESK.x + 2, y: DESK.y - 1, w: DESK.w - 4, d: 3.5, r: 1.2 };
  out.push(solid(k.slabOf(lid, 6, SCREEN_H, P, 3, 0.4), { tone: "mid" }));
  const face = lid.y + lid.d;
  out.push(
    line(faceRect(lid.x + 4, lid.x + lid.w - 4, 10, 6 + SCREEN_H - 4, face), {
      tone: "lo",
    }),
  );
  // A few rule lines stand for a document on the screen.
  for (const [i, width] of [44, 52, 36, 48, 28].entries()) {
    const z = 6 + SCREEN_H - 12 - i * 6;
    out.push(
      line(k.segment([lid.x + 10, face, z], [lid.x + 10 + width, face, z], P), {
        tone: i === 0 ? "mid" : "faint",
        free: true,
      }),
    );
  }
  out.push(
    dots([at([lid.x + lid.w / 2, face, 6 + SCREEN_H - 2])], { size: 0.5 }),
  );
  return out.join("");
}

function phone() {
  const out = [solid(k.slabOf(CRADLE, 0, 7, P, 5, 0.6), { tone: "mid" })];
  out.push(
    line(k.planOutline(k.insetPlan(CRADLE, 3), 7, P, 3), { tone: "faint" }),
  );
  out.push(screws(k.corners(CRADLE, 4), 7, P, 1.4));
  // Back rest that holds the phone upright.
  out.push(
    solid(
      k.slabOf(
        { x: PHONE.x + 4, y: PHONE.y - 3, w: PHONE.w - 8, d: 3, r: 1 },
        7,
        30,
        P,
        3,
      ),
      {
        tone: "mid",
      },
    ),
  );
  out.push(
    solid(k.slabOf(PHONE, 7, 58, P, 6, 0.5), { tone: "hi", crease: "lo" }),
  );
  const face = PHONE.y + PHONE.d;
  out.push(
    line(faceRect(PHONE.x + 2.5, PHONE.x + PHONE.w - 2.5, 12, 60, face), {
      tone: "lo",
    }),
  );
  out.push(
    line(
      k.segment(
        [PHONE.x + 12, face, 62.5],
        [PHONE.x + PHONE.w - 12, face, 62.5],
        P,
      ),
      {
        tone: "mid",
      },
    ),
  );
  for (const [i, width] of [18, 22, 14].entries()) {
    const z = 52 - i * 7;
    out.push(
      line(
        k.segment([PHONE.x + 6, face, z], [PHONE.x + 6 + width, face, z], P),
        {
          tone: "faint",
          free: true,
        },
      ),
    );
  }
  // Front lip of the cradle.
  out.push(
    solid(
      k.slabOf(
        { x: CRADLE.x + 4, y: face + 1, w: CRADLE.w - 8, d: 3, r: 1 },
        7,
        4,
        P,
        3,
      ),
      {
        tone: "mid",
      },
    ),
  );
  return out.join("");
}

function hub() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(HUB, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(HUB, 0, 4, P, 6, 0.8), { tone: "lo" }),
    solid(k.slabOf(k.insetPlan(HUB, 2), 4, HUB_H - 4, P, 6, 0.8), {
      tone: "hi",
      crease: "lo",
    }),
  ];
  const top = { ...k.insetPlan(HUB, 2) };
  out.push(
    line(k.planOutline(k.insetPlan(top, 4), HUB_H, P, 4), { tone: "faint" }),
  );
  // Vent slots on the lid.
  for (let i = 0; i < 6; i++) {
    const y = top.y + 9 + i * 3.2;
    out.push(
      line(k.lineOnTop([top.x + 9, y], [top.x + 26, y], HUB_H, P), {
        tone: "lo",
      }),
    );
  }
  out.push(lamp([top.x + top.w - 11, top.y + 10], HUB_H, P, { lit: true }));
  out.push(
    knob([top.x + top.w - 11, top.y + top.d - 11], HUB_H, P, { radius: 4.2 }),
  );
  out.push(screws(k.corners(top, 3.5), HUB_H, P, 1.3));
  // Three output jacks along the front face line on the lid.
  for (const x of [-12, 0, 12]) {
    out.push(jack([x, top.y + top.d - 6], HUB_H, P));
  }
  return out.join("");
}

function puck() {
  const [x, y] = PUCK;
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x - PUCK_R, y: y - PUCK_R, w: PUCK_R * 2, d: PUCK_R * 2, r: PUCK_R }, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.cylinder(x, y, PUCK_R, 0, 3, P, 64), { tone: "lo" }),
    solid(k.cylinder(x, y, PUCK_R - 1.5, 3, 9, P, 64, 0.8), { tone: "mid" }),
    line(k.sideArc(x, y, PUCK_R - 1.5, 7.5, P, 40), { tone: "faint" }),
    line(k.ring(x, y, PUCK_R - 5, 12, P, 64), { tone: "lo" }),
    // A prompt caret and a cursor block on the round display.
    line(
      k.onTop(
        [
          [x - 7, y - 4],
          [x - 4, y - 1],
          [x - 7, y + 2],
        ],
        12,
        P,
      ),
      { tone: "hi" },
    ),
    solid(
      k.slabOf({ x: x - 1, y: y - 1.5, w: 5, d: 3, r: 0.4 }, 12, 0.4, P, 2),
      {
        tone: "mid",
        crease: "none",
      },
    ),
    dots([at([x, y + PUCK_R - 3.2, 12])], { size: 0.45 }),
  ].join("");
}

function cables() {
  const lidFront = HUB.y + HUB.d - 2 - 6;
  const z = 0.8;
  return [
    cable(
      [-12, lidFront, HUB_H],
      [-70, DESK.y + DESK.d, 2.5],
      [
        [-12, HUB.y + HUB.d + 6, z],
        [-70, HUB.y + HUB.d + 6, z],
      ],
      P,
      {
        tone: "mid",
      },
    ),
    cable(
      [12, lidFront, HUB_H],
      [CRADLE.x + 10, CRADLE.y + CRADLE.d, 3.5],
      [
        [12, HUB.y + HUB.d + 10, z],
        [52, HUB.y + HUB.d + 10, z],
        [52, CRADLE.y + CRADLE.d + 6, z],
        [CRADLE.x + 10, CRADLE.y + CRADLE.d + 6, z],
      ],
      P,
      {
        tone: "mid",
      },
    ),
    cable(
      [0, lidFront, HUB_H],
      [PUCK[0] - PUCK_R + 1, PUCK[1], 4],
      [[0, PUCK[1], z]],
      P,
      {
        tone: "mid",
        flow: true,
      },
    ),
  ].join("");
}

export function dockFigure() {
  const standing = byDepth(
    [
      [DESK.x + DESK.w / 2, DESK.y + DESK.d / 2, workstation],
      [CRADLE.x + CRADLE.w / 2, CRADLE.y + CRADLE.d / 2, phone],
      [0, 0, hub],
      [PUCK[0], PUCK[1], puck],
    ],
    P,
  );
  return {
    label:
      "A docking station on a bench plate: a central hub with a lit lamp is cabled to a workstation, a phone in a cradle and a round terminal puck.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -130, y: PLATE.y + PLATE.d - 16, w: 130, d: 7, r: 1 }, P),
      cables(),
      ...standing.map(([, , draw]) => draw()),
    ],
  };
}
