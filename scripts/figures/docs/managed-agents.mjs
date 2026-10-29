/*
 * "Managed agents": agents that run in the cloud for you, drawn as a small
 * robot standing on a turntable inside a hosted bay. Two vented walls and three
 * posts frame it, the turntable keeps it turning over, and the lamp on the
 * robot's antenna is the one lit part.
 */

import {
  benchPlate,
  byDepth,
  cable,
  dots,
  jack,
  k,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -96, y: -80, w: 190, d: 140, r: 8 };
const BAY = { x: -66, y: -70, w: 104, d: 104, r: 4 };
const FLOOR_H = 5;
const BAY_H = 100;
const POST_R = 2.8;
const WALL_T = 2;
const CENTER = [BAY.x + BAY.w / 2 + 4, BAY.y + BAY.d / 2 + 4];
const TABLE_R = 38;
const DECK_Z = FLOOR_H + 7;
const BODY = { w: 26, d: 34, h: 32, r: 6 };
const BODY_Z = DECK_Z + 4;
const HEAD = { w: 26, d: 32, h: 24, r: 7 };
const HEAD_Z = BODY_Z + BODY.h + 4;
const ANTENNA_TOP = HEAD_Z + HEAD.h + 13;
const ARM = { w: 9, d: 6, h: 24 };
const JACK = [70, 46];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), ...k.boxCorners(BAY, 0, BAY_H + 2)],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const depth = ([x, y]) => k.depthOf([x, y, 0], P);

/** A plan of size {w, d} centred on the turntable axis. */
const centred = ({ w, d, r }) => ({
  x: CENTER[0] - w / 2,
  y: CENTER[1] - d / 2,
  w,
  d,
  r,
});

// The bay is open toward the viewer: posts stand on the three far corners.
const corners = k.corners(BAY, POST_R + 1);
const [backX, backY] = corners.reduce((far, c) =>
  depth(c) < depth(far) ? c : far,
);
const sides = corners.filter(([x, y]) => (x === backX) !== (y === backY));

/** The bay floor: a low tray with a vent row on its front lip. */
function floor() {
  const front = BAY.y + BAY.d;
  const vents = [];
  for (let x = BAY.x + 14; x < BAY.x + 40; x += 3) {
    vents.push(k.segment([x, front, 1.2], [x, front, FLOOR_H - 1.2], P));
  }
  return [
    `<path class="iso-halo" d="${k.haloOf(BAY, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    solid(k.slabOf(BAY, 0, FLOOR_H, P, 6, 0.6), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(BAY, 4), FLOOR_H, P, 4), { tone: "faint" }),
    line(vents.join(""), { tone: "lo" }),
  ].join("");
}

/** A wall panel from the back post to a side post, slotted with vents. */
function wall([x, y]) {
  const alongX = y === backY;
  const from = alongX ? Math.min(x, backX) : Math.min(y, backY);
  const span = Math.abs(alongX ? x - backX : y - backY);
  const plan = alongX
    ? { x: from, y: y - WALL_T / 2, w: span, d: WALL_T, r: 0.4 }
    : { x: x - WALL_T / 2, y: from, w: WALL_T, d: span, r: 0.4 };
  const inner = alongX ? y + WALL_T / 2 : x + WALL_T / 2;
  const slots = [];
  for (let s = from + 12; s < from + span - 8; s += 6) {
    const [a, b] = alongX
      ? [
          [s, inner, BAY_H - 30],
          [s, inner, BAY_H - 12],
        ]
      : [
          [inner, s, BAY_H - 30],
          [inner, s, BAY_H - 12],
        ];
    slots.push(k.segment(a, b, P));
  }
  return [
    solid(k.slabOf(plan, FLOOR_H, BAY_H - FLOOR_H - 2, P, 2), { tone: "lo" }),
    line(slots.join(""), { tone: "faint" }),
  ].join("");
}

/** One post with a cap screw on top. */
function post([x, y]) {
  return [
    solid(k.cylinder(x, y, POST_R, FLOOR_H, BAY_H - FLOOR_H, P, 16), {
      tone: "mid",
    }),
    solid(k.cylinder(x, y, POST_R + 1, BAY_H - 2, 2, P, 16), { tone: "mid" }),
    screws([[x, y]], BAY_H, P, 1),
  ].join("");
}

function turntable() {
  const [cx, cy] = CENTER;
  const ticks = k.radialTicks(
    cx,
    cy,
    TABLE_R - 1.5,
    48,
    6,
    DECK_Z,
    [1.4, 3],
    P,
  );
  return [
    solid(k.cylinder(cx, cy, TABLE_R + 2, FLOOR_H, 3, P, 48), { tone: "lo" }),
    solid(k.cylinder(cx, cy, TABLE_R, FLOOR_H + 3, 4, P, 48, 0.6), {
      tone: "mid",
    }),
    line(k.ring(cx, cy, TABLE_R - 7, DECK_Z, P, 48), { tone: "faint" }),
    line(ticks.minor, { tone: "faint" }),
    line(ticks.major, { tone: "lo" }),
  ].join("");
}

/** An arm hanging from one side of the body (side -1 is -y, 1 is +y). */
function arm(side) {
  const y = side < 0 ? CENTER[1] - BODY.d / 2 - ARM.d : CENTER[1] + BODY.d / 2;
  const plan = { x: CENTER[0] - ARM.w / 2, y, w: ARM.w, d: ARM.d, r: 2.4 };
  const top = BODY_Z + BODY.h - 3;
  return [
    solid(k.slabOf(plan, top - ARM.h, ARM.h, P, 3, 0.4), { tone: "mid" }),
    line(k.sideSeam(plan, top - ARM.h + 7, P, 3), { tone: "faint" }),
  ].join("");
}

/** The robot faces +x: chest grille, eyes and mouth seam on that face. */
function robot() {
  const [cx, cy] = CENTER;
  const chest = cx + BODY.w / 2;
  const face = cx + HEAD.w / 2;
  const eyeZ = HEAD_Z + HEAD.h / 2 + 2;
  const [farArm, nearArm] = byDepth(
    [
      [cx, cy - BODY.d, -1],
      [cx, cy + BODY.d, 1],
    ],
    P,
  ).map(([, , side]) => arm(side));
  const grille = [0, 1, 2, 3].map((i) => {
    const z = BODY_Z + 12 + i * 3.4;
    return k.segment([chest, cy - 9, z], [chest, cy + 9, z], P);
  });
  return [
    solid(k.slabOf(centred({ w: 22, d: 28, r: 5 }), DECK_Z, 4, P, 4), {
      tone: "lo",
    }),
    farArm,
    solid(k.slabOf(centred(BODY), BODY_Z, BODY.h, P, 5, 0.8), { tone: "mid" }),
    line(k.sideSeam(centred(BODY), BODY_Z + 7, P, 5), { tone: "faint" }),
    line(grille.join(""), { tone: "lo" }),
    nearArm,
    solid(k.cylinder(cx, cy, 5, BODY_Z + BODY.h, 4, P, 20), { tone: "lo" }),
    solid(k.slabOf(centred(HEAD), HEAD_Z, HEAD.h, P, 6, 0.8), { tone: "mid" }),
    line(
      k.planOutline(k.insetPlan(centred(HEAD), 3.5), HEAD_Z + HEAD.h, P, 4),
      {
        tone: "faint",
      },
    ),
    line(
      [
        k.sideRing([face, cy - 7, eyeZ], 3.6, "x", P, 24),
        k.sideRing([face, cy + 7, eyeZ], 3.6, "x", P, 24),
      ].join(""),
      { tone: "mid" },
    ),
    dots([at([face, cy - 7, eyeZ]), at([face, cy + 7, eyeZ])], { size: 1.1 }),
    line(k.segment([face, cy - 6, HEAD_Z + 5], [face, cy + 6, HEAD_Z + 5], P), {
      tone: "lo",
    }),
    solid(
      k.cylinder(
        cx,
        cy,
        1,
        HEAD_Z + HEAD.h,
        ANTENNA_TOP - HEAD_Z - HEAD.h - 3,
        P,
        12,
      ),
      {
        tone: "mid",
      },
    ),
    solid(k.cylinder(cx, cy, 4.2, ANTENNA_TOP - 3, 4.2, P, 24, 0.4), {
      tone: "hi",
      lit: true,
    }),
  ].join("");
}

export function figure() {
  const posts = byDepth([[backX, backY], ...sides], P);
  return {
    label:
      "A small robot with a lit antenna lamp standing on a turntable inside an open bay with vented back walls, on a bench plate, cabled to a jack.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -84, y: PLATE.y + PLATE.d - 16, w: 92, d: 7, r: 1 }, P),
      jack(JACK, 0, P),
      cable(
        [BAY.x + BAY.w, BAY.y + BAY.d - 12, 2.5],
        [JACK[0], JACK[1], 0],
        [[JACK[0] - 2, BAY.y + BAY.d + 4, 0]],
        P,
      ),
      floor(),
      ...sides.map(wall),
      ...posts.map(post),
      turntable(),
      robot(),
    ],
  };
}
