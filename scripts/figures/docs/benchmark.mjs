/*
 * "RyuBench": timed, ranked runs, drawn as a stopwatch standing in its cradle
 * beside a three-step podium. Rank marks sit on the podium faces and the token
 * on the top step is the one lit part.
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

const PLATE = { x: -96, y: -54, w: 184, d: 100, r: 8 };
const STEP = { w: 28, d: 26, y: -6 };
// Second, first and third place, back to front.
const STEPS = [
  { x: -80, h: 26, rank: 2 },
  { x: -52, h: 40, rank: 1 },
  { x: -24, h: 16, rank: 3 },
];
const WATCH = { x: 50, y: -24, r: 28, t: 10, foot: 4 };
const TOKEN_R = 6;

const WATCH_Z = WATCH.foot + WATCH.r;
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [WATCH.x, WATCH.y, WATCH_Z + WATCH.r + 16],
    [STEPS[1].x, STEP.y, STEPS[1].h + 8],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const { sinA, cosA } = k.cameraOf(P);

/** The kit's fill class for a face with this normal: top or a side shade. */
function paintOf([nx, ny, nz]) {
  if (nz > 0.6) {
    return 'class="iso-top"';
  }
  const across = Math.hypot(nx, ny) || 1;
  const light = ((nx * -sinA + ny * cosA) / across + 1) / 2;
  const shade = nz < -0.3 ? 0 : Math.min(3, Math.floor(light * 4));
  return `class="iso-shade" data-shade="${shade}"`;
}

function step({ x, h, rank }) {
  const plan = { x, y: STEP.y, w: STEP.w, d: STEP.d, r: 1 };
  const face = STEP.y + STEP.d;
  const lit = rank === 1;
  const marks = Array.from({ length: rank }, (_, i) =>
    at([x + STEP.w / 2 + (i - (rank - 1) / 2) * 4, face, h - 6]),
  );
  return [
    solid(k.slabOf(plan, 0, h, P, 2, 0.5), { tone: "mid" }),
    line(k.sideSeam(plan, 4, P, 2), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(plan, 3), h, P, 2), {
      tone: lit ? "lo" : "faint",
    }),
    dots(marks, { size: 1.1, tone: lit ? "hi" : "mid" }),
  ].join("");
}

/** The winner's token standing on the top step: the lit accent. */
function token() {
  const first = STEPS[1];
  const x = first.x + STEP.w / 2;
  const y = STEP.y + STEP.d / 2;
  return [
    solid(k.cylinder(x, y, TOKEN_R + 1.5, first.h, 1.4, P, 32), {
      tone: "mid",
    }),
    solid(k.cylinder(x, y, TOKEN_R, first.h + 1.4, 3.2, P, 32, 0.4), {
      tone: "hi",
      lit: true,
    }),
    line(k.ring(x, y, TOKEN_R - 2.2, first.h + 4.6, P, 24), { tone: "mid" }),
  ].join("");
}

function podium() {
  const base = {
    x: STEPS[0].x - 4,
    y: STEP.y - 4,
    w: STEP.w * 3 + 8,
    d: STEP.d + 8,
    r: 3,
  };
  return [
    `<path class="iso-halo" d="${k.haloOf(base, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(base, 0, 2, P, 3, 0.4), { tone: "lo" }),
    screws(k.corners(base, 2.2), 2, P, 0.9),
    ...STEPS.map(step),
    token(),
  ].join("");
}

/** The watch case as a short drum along y, its silhouette traced. */
function watchCase(ring, y0, y1) {
  const { x } = WATCH;
  const faces = [];
  const edges = [];
  const facing = ring.map(([ax, az], i) => {
    const [bx, bz] = ring[(i + 1) % ring.length];
    return k.depthOf([(ax + bx) / 2 - x, 0, (az + bz) / 2 - WATCH_Z], P) > 0;
  });
  for (const [i, [ax, az]] of ring.entries()) {
    const [bx, bz] = ring[(i + 1) % ring.length];
    const normal = [(ax + bx) / 2 - x, 0, (az + bz) / 2 - WATCH_Z];
    if (facing[i]) {
      faces.push(
        `<path ${paintOf(normal)} d="${k.pathOf([at([ax, y0, az]), at([ax, y1, az]), at([bx, y1, bz]), at([bx, y0, bz])], true)}"/>`,
      );
      // The back rim of a face turned to the viewer is on the silhouette.
      edges.push(k.segment([ax, y0, az], [bx, y0, bz], P));
    }
    if (facing[i] !== facing.at(i - 1)) {
      edges.push(k.segment([ax, y0, az], [ax, y1, az], P));
    }
  }
  const back = ring.map(([cx, cz]) => at([cx, y0, cz]));
  const front = ring.map(([cx, cz]) => at([cx, y1, cz]));
  return [
    `<g class="iso-solid" data-seamless=""><path class="iso-fill" d="${k.pathOf(back, true)}${k.pathOf(front, true)}"/>${faces.join("")}<path class="iso-shade" data-shade="3" d="${k.pathOf(front, true)}"/></g>`,
    line(k.pathOf(front, true) + edges.join(""), { tone: "mid" }),
  ].join("");
}

/** The dial on the front face: bezel, minute ticks, sub-dial and the hand. */
function dial(face) {
  const { x, r } = WATCH;
  const onFace = (radius, angle) => [
    x + radius * Math.sin(angle),
    face,
    WATCH_Z + radius * Math.cos(angle),
  ];
  const minor = [];
  const major = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    const inner = r - 5 - (big ? 3 : 1.6);
    (big ? major : minor).push(
      k.segment(onFace(inner, angle), onFace(r - 5, angle), P),
    );
  }
  const hand = 1.05;
  return [
    line(k.sideRing([x, face, WATCH_Z], r - 3, "y", P, 48), { tone: "lo" }),
    line(minor.join(""), { tone: "lo" }),
    line(major.join(""), { tone: "mid" }),
    line(k.sideRing([x, face, WATCH_Z - 9], 4.5, "y", P, 24), {
      tone: "faint",
    }),
    line(k.segment(onFace(4, hand + Math.PI), onFace(r - 8, hand), P), {
      tone: "hi",
    }),
    dots([at([x, face, WATCH_Z])], { size: 1.1, tone: "hi" }),
  ].join("");
}

/** The crown on top with its bow loop, and a pusher at two o'clock. */
function crown(y) {
  const { x, r } = WATCH;
  const top = WATCH_Z + r - 0.6;
  const pusher = [x + r * Math.sin(0.75), WATCH_Z + r * Math.cos(0.75)];
  return [
    line(k.sideRing([x, y, top + 9], 6, "y", P, 28), { tone: "mid" }),
    solid(k.cylinder(x, y, 2.4, top, 4, P, 16), { tone: "mid" }),
    solid(k.cylinder(x, y, 4.2, top + 4, 3, P, 24, 0.4), { tone: "mid" }),
    line(k.knurl(x, y, 4.2, top + 4, top + 7, 18, P), { tone: "lo" }),
    solid(
      k.slabOf(
        { x: pusher[0] - 1, y: y - 2.5, w: 4, d: 5, r: 1 },
        pusher[1] - 1,
        3.5,
        P,
        2,
      ),
      { tone: "mid" },
    ),
  ].join("");
}

function stopwatch() {
  const { x, y, r, t, foot } = WATCH;
  const y0 = y - t / 2;
  const y1 = y + t / 2;
  const cradle = { x: x - 16, y: y0 - 5, w: 32, d: t + 10, r: 3 };
  return [
    `<path class="iso-halo" d="${k.haloOf(cradle, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(cradle, 0, foot, P, 3, 0.5), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(cradle, 2.5), foot, P, 2), {
      tone: "faint",
    }),
    watchCase(k.circleRing(x, WATCH_Z, r, 56), y0, y1),
    crown(y),
    dial(y1),
  ].join("");
}

export function figure() {
  const parts = byDepth(
    [
      [STEPS[1].x, STEP.y + STEP.d / 2, podium],
      [WATCH.x, WATCH.y, stopwatch],
    ],
    P,
  );
  return {
    label:
      "A stopwatch standing in a cradle beside a three-step podium with rank dots on its faces and a lit token on the top step.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: 16, y: PLATE.y + PLATE.d - 16, w: 64, d: 7, r: 1 }, P),
      ...parts.map(([, , draw]) => draw()),
    ],
  };
}
