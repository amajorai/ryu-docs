/*
 * "Getting started": install and first run, drawn as an unboxing. An open
 * plank crate sits on the bench with its lid laid beside it; the device (the
 * lit part) is lifted clear of its foam bed and a coiled power lead waits next
 * to it.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -112, y: -78, w: 224, d: 144, r: 8 };
const CRATE = { x: -78, y: -60, w: 94, d: 74, r: 1.5 };
const WALL = 4;
const CRATE_H = 36;
const FOAM_H = 22;
const PLANK = 9;
const LID = { x: 28, y: -66, w: 64, d: 80, r: 1.5 };
const DEVICE = { x: -56, y: -41, w: 50, d: 36, r: 5 };
const DEVICE_H = 16;
const LIFT = CRATE_H + 22;
const COIL = [-80, 44];
const COIL_R = 19;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [CRATE.x, CRATE.y, CRATE_H],
    [DEVICE.x, DEVICE.y, LIFT + DEVICE_H + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const walls = {
  back: { x: CRATE.x, y: CRATE.y, w: CRATE.w, d: WALL, r: 0.6 },
  left: { x: CRATE.x, y: CRATE.y, w: WALL, d: CRATE.d, r: 0.6 },
  right: {
    x: CRATE.x + CRATE.w - WALL,
    y: CRATE.y,
    w: WALL,
    d: CRATE.d,
    r: 0.6,
  },
  front: {
    x: CRATE.x,
    y: CRATE.y + CRATE.d - WALL,
    w: CRATE.w,
    d: WALL,
    r: 0.6,
  },
};

/** One crate wall with plank seams on its outward faces. */
function wall(plan) {
  const out = [solid(k.slabOf(plan, 0, CRATE_H, P, 2, 0.4), { tone: "mid" })];
  for (let z = PLANK; z < CRATE_H; z += PLANK) {
    out.push(line(k.sideSeam(plan, z, P, 2), { tone: "lo" }));
  }
  return out.join("");
}

/** Corner battens on the two walls facing the viewer, nailed at each plank. */
function battens() {
  const out = [];
  const nails = [];
  const front = CRATE.y + CRATE.d;
  const right = CRATE.x + CRATE.w;
  const posts = [
    { x: CRATE.x - 1, y: front - 1, w: 9, d: 2.4, r: 0.4 },
    { x: right - 8, y: front - 1, w: 9, d: 2.4, r: 0.4 },
    { x: right - 1, y: CRATE.y - 1, w: 2.4, d: 9, r: 0.4 },
    { x: right - 1, y: front - 8, w: 2.4, d: 9, r: 0.4 },
  ];
  for (const post of posts) {
    out.push(solid(k.slabOf(post, 0, CRATE_H, P, 2), { tone: "mid" }));
  }
  for (let z = PLANK / 2; z < CRATE_H; z += PLANK) {
    nails.push(
      at([CRATE.x + 3.5, front + 1.4, z]),
      at([right - 3.5, front + 1.4, z]),
      at([right + 1.4, CRATE.y + 3.5, z]),
      at([right + 1.4, front - 3.5, z]),
    );
  }
  out.push(dots(nails, { size: 0.45, tone: "mid" }));
  return out.join("");
}

/** The foam bed inside the crate, with the empty cavity the device left. */
function foam() {
  const bed = k.insetPlan(CRATE, WALL);
  return [
    solid(k.slabOf({ ...bed, r: 0.4 }, 0, FOAM_H, P, 2), {
      tone: "lo",
      crease: "none",
    }),
    line(k.planOutline(k.insetPlan(DEVICE, -1.5), FOAM_H, P, 4), {
      tone: "mid",
    }),
    line(k.planOutline(k.insetPlan(DEVICE, 1), FOAM_H, P, 4), {
      tone: "faint",
    }),
    dots(
      k
        .dotGrid(bed.x + 4, bed.y + bed.d - 9, 4, 2, 4, FOAM_H, P)
        .concat(k.dotGrid(bed.x + bed.w - 18, bed.y + 4, 4, 2, 4, FOAM_H, P)),
      { size: 0.4, tone: "lo" },
    ),
    `<path class="iso-halo" d="${k.haloOf(DEVICE, FOAM_H, 0.1, P)}" style="filter:blur(6px);opacity:.35"/>`,
  ].join("");
}

function device() {
  const z = LIFT;
  const top = z + DEVICE_H;
  const lid = k.insetPlan(DEVICE, 1.5);
  const out = [
    solid(k.slabOf(DEVICE, z, DEVICE_H, P, 6, 0.8), {
      tone: "hi",
      crease: "lo",
      lit: true,
    }),
    line(k.sideSeam(DEVICE, z + 4, P, 6), { tone: "lo" }),
    line(k.planOutline(k.insetPlan(lid, 3), top, P, 4), { tone: "faint" }),
  ];
  for (let i = 0; i < 6; i++) {
    const y = DEVICE.y + 9 + i * 3;
    out.push(
      line(k.lineOnTop([DEVICE.x + 8, y], [DEVICE.x + 24, y], top, P), {
        tone: "lo",
      }),
    );
  }
  out.push(
    lamp([DEVICE.x + DEVICE.w - 10, DEVICE.y + 10], top, P, { lit: true }),
    screws(k.corners(lid, 3), top, P, 1.2),
  );
  return out.join("");
}

/** The crate lid laid flat beside it: slats on two cross battens. */
function lid() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(LID, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
  ];
  for (const y of [LID.y + 12, LID.y + LID.d - 22]) {
    out.push(
      solid(
        k.slabOf(
          { x: LID.x + 4, y, w: LID.w - 8, d: 10, r: 0.4 },
          0,
          2.5,
          P,
          2,
        ),
        { tone: "lo" },
      ),
    );
  }
  const slat = LID.w / 4;
  for (let i = 0; i < 4; i++) {
    const plan = {
      x: LID.x + i * slat,
      y: LID.y,
      w: slat - 1,
      d: LID.d,
      r: 0.6,
    };
    out.push(solid(k.slabOf(plan, 2.5, 3, P, 2), { tone: "mid" }));
    out.push(
      dots(
        [
          at([plan.x + slat / 2, LID.y + 17, 5.5]),
          at([plan.x + slat / 2, LID.y + LID.d - 17, 5.5]),
        ],
        { size: 0.45, tone: "mid" },
      ),
    );
  }
  return out.join("");
}

/** A coiled power lead tied with a strap, its plug lying beside it. */
function lead() {
  const [cx, cy] = COIL;
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: cx - COIL_R, y: cy - COIL_R, w: COIL_R * 2, d: COIL_R * 2, r: COIL_R }, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
  ];
  for (let i = 0; i < 6; i++) {
    const r = COIL_R - (i % 3) * 1.4;
    out.push(
      line(k.ring(cx + i * 0.6, cy - i * 0.5, r, 0.8 + i * 1.1, P, 56), {
        tone: i === 5 ? "hi" : "mid",
      }),
    );
  }
  const strap = { x: cx - 4, y: cy - COIL_R - 3, w: 8, d: 7, r: 1 };
  out.push(solid(k.slabOf(strap, 0, 8, P, 2), { tone: "mid" }));
  // The tail runs out of the coil to a plug with two prongs.
  const plug = { x: cx + COIL_R + 10, y: cy - 2, w: 10, d: 14, r: 2 };
  out.push(
    line(
      k.onTop(
        [
          [cx + COIL_R - 0.6, cy + 4],
          [cx + COIL_R + 5, cy + 5],
          [plug.x, plug.y + plug.d / 2],
        ],
        1.2,
        P,
      ),
      { tone: "hi" },
    ),
    solid(k.slabOf(plug, 0, 6, P, 3, 0.4), { tone: "mid" }),
  );
  for (const y of [plug.y + 4, plug.y + plug.d - 4]) {
    out.push(
      solid(
        k.slabOf(
          { x: plug.x + plug.w, y: y - 0.8, w: 7, d: 1.6, r: 0.3 },
          2,
          2.4,
          P,
          1,
        ),
        { tone: "mid", crease: "none" },
      ),
    );
  }
  return out.join("");
}

function crate() {
  return [
    `<path class="iso-halo" d="${k.haloOf(CRATE, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    wall(walls.back),
    wall(walls.left),
    foam(),
    wall(walls.right),
    wall(walls.front),
    battens(),
    device(),
  ].join("");
}

export function figure() {
  const parts = byDepth(
    [
      [CRATE.x + CRATE.w / 2, CRATE.y + CRATE.d / 2, crate],
      [LID.x + LID.w / 2, LID.y + LID.d / 2, lid],
      [COIL[0], COIL[1], lead],
    ],
    P,
  );
  return {
    label:
      "An open plank crate on a bench plate with its lid laid beside it; the lit device is lifted out of its foam bed and a coiled power lead with its plug lies nearby.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -10, y: PLATE.y + PLATE.d - 16, w: 104, d: 7, r: 1 }, P),
      ...parts.map(([, , draw]) => draw()),
    ],
  };
}
