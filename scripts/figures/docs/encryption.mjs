/*
 * "Encryption at rest": data is sealed before it touches the disk, drawn as a
 * vault safe. A heavy body on a plinth has its thick door swung slightly ajar on
 * barrel hinges, showing a combination dial, a spoked handle and the locking
 * bolts; the sealed cartridge on the shelf inside is the one lit part.
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

const PLATE = { x: -96, y: -76, w: 190, d: 214, r: 8 };
const PLINTH = { x: -66, y: -58, w: 128, d: 112, r: 5 };
const PLINTH_H = 8;
const BODY = { x: -60, y: -52, w: 116, d: 100, r: 4 };
const BODY_H = 96;
const FRAME = 9;
const DOOR_T = 12;
const OPEN = 62;
const BOLTS = [0.22, 0.5, 0.78];

const front = BODY.y + BODY.d;
const z0 = PLINTH_H;
const zTop = PLINTH_H + BODY_H;
const opening = {
  x0: BODY.x + FRAME,
  x1: BODY.x + BODY.w - FRAME,
  z0: z0 + FRAME,
  z1: zTop - FRAME,
};
const DOOR_W = opening.x1 - opening.x0;
const HINGE = [opening.x1, front + 2];
const cos = Math.cos((OPEN * Math.PI) / 180);
const sin = Math.sin((OPEN * Math.PI) / 180);

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    ...k.boxCorners(PLINTH, 0, zTop + 4),
    [HINGE[0] - DOOR_W * cos, HINGE[1] + DOOR_W * sin, zTop],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A point on the door, in its own frame (u along it, v out of it), at z. */
const onDoor = (u, v, z) => [
  HINGE[0] + u * cos + v * sin,
  HINGE[1] - u * sin + v * cos,
  z,
];

/** A circle of radius r on the door's outer face, centred at (u, z). */
const doorCircle = (u, z, r, steps = 36) =>
  k.pathOf(
    Array.from({ length: steps }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      return at(onDoor(u + Math.cos(a) * r, 0, z + Math.sin(a) * r));
    }),
    true,
  );

function body() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(PLINTH, 0, 2, P)}"/>`,
    solid(k.slabOf(PLINTH, 0, PLINTH_H, P, 5, 0.8), { tone: "lo" }),
    solid(k.slabOf(BODY, z0, BODY_H, P, 5, 1.2), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(BODY, 6), zTop, P, 4), { tone: "faint" }),
    screws(k.corners(BODY, 10), zTop, P, 1.4),
  ];
  // A recessed panel and a rivet line on the right flank.
  const flank = BODY.x + BODY.w;
  const y0 = BODY.y + 10;
  const y1 = front - 10;
  out.push(
    line(
      k.pathOf(
        [
          [flank, y0, z0 + 10],
          [flank, y1, z0 + 10],
          [flank, y1, zTop - 10],
          [flank, y0, zTop - 10],
        ].map(at),
        true,
      ),
      { tone: "faint" },
    ),
    dots(
      Array.from({ length: 9 }, (_, i) => {
        const y = y0 + 4 + ((y1 - y0 - 8) * i) / 8;
        return [at([flank, y, zTop - 5]), at([flank, y, z0 + 5])];
      }).flat(),
      { size: 0.6 },
    ),
  );
  // The dark doorway on the front face, with its frame lip.
  const { x0, x1 } = opening;
  const rect = (a, b, c, d, y = front) =>
    k.pathOf(
      [
        [a, y, c],
        [b, y, c],
        [b, y, d],
        [a, y, d],
      ].map(at),
      true,
    );
  out.push(
    `<path class="iso-shade" data-shade="0" d="${rect(x0, x1, opening.z0, opening.z1)}"/>`,
    line(rect(x0, x1, opening.z0, opening.z1), { tone: "mid" }),
    line(rect(x0 - 3, x1 + 3, opening.z0 - 3, opening.z1 + 3), {
      tone: "faint",
    }),
  );
  return out.join("");
}

/** A shelf inside the doorway carrying the sealed cartridge (lit). */
function contents() {
  const shelfZ = opening.z1 - 30;
  const depth = BODY.d - FRAME * 2;
  const shelf = {
    x: opening.x0,
    y: front - depth,
    w: DOOR_W,
    d: depth,
    r: 0,
  };
  const { x0, x1 } = opening;
  const doorway = k.pathOf(
    [
      [x0, front, opening.z0],
      [x1, front, opening.z0],
      [x1, front, opening.z1],
      [x0, front, opening.z1],
    ].map(at),
    true,
  );
  const inside = [
    solid(k.slabOf(shelf, shelfZ, 2, P, 1), { tone: "lo", crease: "none" }),
    solid(
      k.slabOf(
        { x: opening.x0 + 8, y: front - 34, w: 26, d: 26, r: 2 },
        shelfZ + 2,
        14,
        P,
        3,
        0.5,
      ),
      { tone: "hi", lit: true, crease: "lo" },
    ),
    solid(
      k.slabOf(
        { x: opening.x0 + 8, y: front - 70, w: 26, d: 26, r: 2 },
        shelfZ + 2,
        10,
        P,
        3,
      ),
      { tone: "lo" },
    ),
  ].join("");
  // Clip the interior to the doorway so nothing paints over the front face.
  return `<defs><clipPath id="encryption-doorway"><path d="${doorway}"/></clipPath></defs><g clip-path="url(#encryption-doorway)">${inside}</g>`;
}

/** Locking bolts standing out of the door's free edge. */
function bolts() {
  const out = [];
  for (const share of BOLTS) {
    const z = opening.z0 + (opening.z1 - opening.z0) * share;
    const ring = [
      onDoor(-DOOR_W - 9, -DOOR_T + 3, 0),
      onDoor(-DOOR_W + 1, -DOOR_T + 3, 0),
      onDoor(-DOOR_W + 1, -3, 0),
      onDoor(-DOOR_W - 9, -3, 0),
    ].map(([x, y]) => [x, y]);
    out.push(
      solid(k.extrude(ring, z - 3, 6, P), { tone: "mid", crease: "lo" }),
    );
  }
  return out.join("");
}

function hinges() {
  return [opening.z0 + 10, opening.z1 - 22]
    .map((z) =>
      solid(k.cylinder(HINGE[0] + 1, HINGE[1] + 1, 4, z, 12, P, 20), {
        tone: "mid",
      }),
    )
    .join("");
}

function door() {
  const ring = [
    onDoor(0, 0, 0),
    onDoor(-DOOR_W, 0, 0),
    onDoor(-DOOR_W, -DOOR_T, 0),
    onDoor(0, -DOOR_T, 0),
  ].map(([x, y]) => [x, y]);
  const h = opening.z1 - opening.z0;
  const out = [
    solid(k.extrude(ring, opening.z0, h, P, { bevel: 0.6 }), { tone: "mid" }),
  ];
  // A raised panel line around the outer face.
  const inset = 7;
  out.push(
    line(
      k.pathOf(
        [
          onDoor(-inset, 0, opening.z0 + inset),
          onDoor(-DOOR_W + inset, 0, opening.z0 + inset),
          onDoor(-DOOR_W + inset, 0, opening.z1 - inset),
          onDoor(-inset, 0, opening.z1 - inset),
        ].map(at),
        true,
      ),
      { tone: "faint" },
    ),
  );
  // The combination dial: bezel, ticks and a knurled knob with a pointer.
  const du = -DOOR_W / 2;
  const dz = opening.z0 + h * 0.64;
  const ticks = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r0 = i % 5 === 0 ? 11.5 : 13;
    ticks.push(
      k.pathOf([
        at(onDoor(du + Math.cos(a) * r0, 0, dz + Math.sin(a) * r0)),
        at(onDoor(du + Math.cos(a) * 14.5, 0, dz + Math.sin(a) * 14.5)),
      ]),
    );
  }
  out.push(
    line(doorCircle(du, dz, 17), { tone: "mid" }),
    line(ticks.join(""), { tone: "lo" }),
    line(doorCircle(du, dz, 9), { tone: "mid" }),
    line(doorCircle(du, dz, 6.5, 24), { tone: "faint" }),
    line(k.pathOf([at(onDoor(du, 0, dz + 9)), at(onDoor(du, 0, dz + 18.5))]), {
      tone: "hi",
    }),
  );
  // The spoked handle wheel below the dial.
  const hz = opening.z0 + h * 0.26;
  const spokes = [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    return k.pathOf([
      at(onDoor(du, 0, hz)),
      at(onDoor(du + Math.cos(a) * 11, 0, hz + Math.sin(a) * 11)),
    ]);
  });
  out.push(
    line(spokes.join(""), { tone: "mid" }),
    line(doorCircle(du, hz, 3, 16), { tone: "mid" }),
    dots(
      [0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        return at(onDoor(du + Math.cos(a) * 11, 0, hz + Math.sin(a) * 11));
      }),
      { size: 1.4 },
    ),
  );
  return out.join("");
}

/** Four squat feet under the plinth. */
function feet() {
  return byDepth(k.corners(PLINTH, 12), P)
    .map(([x, y]) => solid(k.cylinder(x, y, 5, -4, 4, P, 24), { tone: "lo" }))
    .join("");
}

export function figure() {
  return {
    label:
      "A heavy vault safe on a bench plate with its thick door swung ajar on barrel hinges, showing a combination dial, a spoked handle and locking bolts; a lit cartridge sits on the shelf inside.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: 0, y: PLATE.y + PLATE.d - 16, w: 84, d: 7, r: 1 }, P),
      feet(),
      body(),
      contents(),
      bolts(),
      hinges(),
      door(),
    ],
  };
}
