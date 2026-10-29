/*
 * "CI/CD": every change passes a check before it ships, drawn as an assembly
 * line with a quality gate. Plain parcels ride a belt from a control pod
 * through a scanning arch; a pusher drops a failed parcel into a reject bin,
 * and the sealed ones stack on a pallet at the end of the line. The arch's lamp
 * is the one lit part.
 */

import {
  benchPlate,
  byDepth,
  dots,
  jack,
  k,
  knob,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -62, y: -110, w: 118, d: 220, r: 8 };
const BELT = { x: -14, y: -100, w: 28, d: 168, r: 4 };
const LEG_H = 9;
const FRAME_H = 5;
const BELT_Z = LEG_H + FRAME_H;
const GATE_Y = -14;
const PILLAR = { w: 9, d: 12 };
const GATE_H = 50;
const BEAM_H = 8;
const ITEM = { w: 16, d: 16, h: 12 };
/** Parcels on the belt: [y, sealed]. */
const PARCELS = [
  [-90, false],
  [-58, false],
  [52, true],
];
const BIN = { x: 20, y: 10, w: 28, d: 30, r: 3 };
const BIN_H = 12;
const PUSHER = { x: -48, y: 18, w: 22, d: 14, r: 2 };
const CONSOLE = { x: 24, y: -98, w: 24, d: 30, r: 3 };
const CONSOLE_H = 8;
const PALLET = { x: -26, y: 78, w: 46, d: 28, r: 2 };
const PALLET_H = 6;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [BELT.x - PILLAR.w - 6, GATE_Y - PILLAR.d, GATE_H + BEAM_H + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan, blur = 5) =>
  `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(${blur}px)"/>`;

function conveyor() {
  const out = [halo(BELT)];
  const right = BELT.x + BELT.w;
  for (const y of [BELT.y + 10, GATE_Y + 30, BELT.y + BELT.d - 10]) {
    for (const x of [BELT.x + 4, right - 4]) {
      const leg = { x: x - 2.5, y: y - 2.5, w: 5, d: 5, r: 1 };
      out.push(solid(k.slabOf(leg, 0, LEG_H, P, 2), { tone: "lo" }));
    }
  }
  out.push(solid(k.slabOf(BELT, LEG_H, FRAME_H, P, 6, 0.5), { tone: "mid" }));
  const belt = k.insetPlan(BELT, 3);
  out.push(line(k.planOutline(belt, BELT_Z, P, 4), { tone: "lo" }));
  for (let y = belt.y + 6; y < belt.y + belt.d - 4; y += 8) {
    out.push(
      line(k.lineOnTop([belt.x + 1, y], [belt.x + belt.w - 1, y], BELT_Z, P), {
        tone: "faint",
      }),
    );
  }
  // Roller ends along the near rail.
  const rollers = [];
  for (let y = BELT.y + 8; y < BELT.y + BELT.d - 4; y += 16) {
    rollers.push(k.sideRing([right, y, LEG_H + FRAME_H / 2], 1.6, "x", P, 12));
  }
  out.push(line(rollers.join(""), { tone: "lo" }));
  return out.join("");
}

const pillar = (x) =>
  solid(
    k.slabOf(
      { x, y: GATE_Y - PILLAR.d / 2, w: PILLAR.w, d: PILLAR.d, r: 1.5 },
      0,
      GATE_H,
      P,
      3,
      0.4,
    ),
    { tone: "mid" },
  );

/** The far pillar of the arch, behind the belt. */
const farPillar = () => pillar(BELT.x - PILLAR.w - 4);

/**
 * The parcel under inspection, the scan curtain above it, the near pillar and
 * the cross beam with its scanner bar.
 */
function gate() {
  const left = BELT.x - PILLAR.w - 6;
  const beam = {
    x: left,
    y: GATE_Y - PILLAR.d / 2 - 2,
    w: BELT.w + PILLAR.w * 2 + 12,
    d: PILLAR.d + 4,
    r: 2,
  };
  const top = GATE_H + BEAM_H;
  const curtain = [];
  for (let x = BELT.x + 4; x <= BELT.x + BELT.w - 4; x += 3) {
    curtain.push(
      k.segment([x, GATE_Y, BELT_Z + ITEM.h + 2], [x, GATE_Y, GATE_H - 5], P),
    );
  }
  return [
    parcel([0, GATE_Y], BELT_Z, false),
    line(curtain.join(""), { tone: "mid", dotted: true }),
    pillar(BELT.x + BELT.w + 4),
    solid(
      k.slabOf(
        { x: BELT.x + 2, y: GATE_Y - 3, w: BELT.w - 4, d: 6, r: 1 },
        GATE_H - 5,
        5,
        P,
        2,
      ),
      { tone: "lo" },
    ),
    solid(k.slabOf(beam, GATE_H, BEAM_H, P, 3, 0.6), { tone: "mid" }),
    line(k.sideSeam(beam, GATE_H + 3, P, 3), { tone: "faint" }),
    screws(k.corners(beam, 3.2), top, P, 1.1),
    lamp([beam.x + beam.w - 12, GATE_Y], top, P, { lit: true, radius: 3.2 }),
    ...[0, 1, 2, 3].map((i) =>
      line(
        k.lineOnTop(
          [beam.x + 9 + i * 3.2, GATE_Y - 4],
          [beam.x + 9 + i * 3.2, GATE_Y + 4],
          top,
          P,
        ),
        { tone: "lo" },
      ),
    ),
  ].join("");
}

/**
 * A parcel. A sealed one carries a ring and a centre dot on its lid; a failed
 * one has its lid knocked askew.
 */
function parcel([x, y], z, sealed, failed = false) {
  const plan = {
    x: x - ITEM.w / 2,
    y: y - ITEM.d / 2,
    w: ITEM.w,
    d: ITEM.d,
    r: 1,
  };
  const top = z + ITEM.h;
  const out = [
    solid(k.slabOf(plan, z, ITEM.h, P, 2, 0.3), { tone: "mid" }),
    line(k.lineOnTop([plan.x, y], [plan.x + plan.w, y], top, P), {
      tone: "lo",
    }),
  ];
  if (sealed) {
    out.push(line(k.ring(x, y, 3.4, top, P, 20), { tone: "mid" }));
    out.push(dots([at([x, y, top])], { size: 0.6 }));
  }
  if (failed) {
    const turn = 0.35;
    const lid = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([u, v]) => {
      const [px, py] = [u * (ITEM.w / 2 - 1), v * (ITEM.d / 2 - 1)];
      return [
        x + 2 + px * Math.cos(turn) - py * Math.sin(turn),
        y - 1 + px * Math.sin(turn) + py * Math.cos(turn),
      ];
    });
    out.push(solid(k.extrude(lid, top, 1.6, P), { tone: "mid" }));
  }
  return out.join("");
}

/** The reject bin beside the belt, a failed parcel lying in it. */
function rejectBin() {
  const inner = k.insetPlan(BIN, 2.5);
  return [
    halo(BIN),
    solid(k.slabOf(BIN, 0, BIN_H, P, 4, 0.5), { tone: "mid" }),
    solid(k.slabOf(inner, BIN_H - 0.2, 0.2, P, 3), {
      tone: "lo",
      crease: "none",
    }),
    line(k.sideSeam(BIN, 4, P, 4), { tone: "faint" }),
    parcel([BIN.x + BIN.w / 2, BIN.y + BIN.d / 2], BIN_H - 9, false, true),
  ].join("");
}

/** The pusher on the far side of the belt, its ram reaching over the rail. */
function pusher() {
  const z = BELT_Z + 2;
  const ram = { x: PUSHER.x + PUSHER.w, y: PUSHER.y + 4, w: 14, d: 6, r: 1 };
  return [
    halo(PUSHER, 4),
    solid(k.slabOf(PUSHER, 0, z + 8, P, 3, 0.5), { tone: "mid" }),
    solid(k.slabOf(ram, z + 2, 4, P, 2), { tone: "lo" }),
    solid(
      k.slabOf(
        { x: ram.x + ram.w, y: ram.y - 3, w: 3, d: 12, r: 0.6 },
        z,
        8,
        P,
        2,
      ),
      { tone: "mid" },
    ),
    lamp([PUSHER.x + 7, PUSHER.y + PUSHER.d / 2], z + 8, P),
    screws(k.corners(PUSHER, 2.6), z + 8, P, 0.9),
  ].join("");
}

/** The control pod at the head of the line, where each run is started. */
function controlPod() {
  const top = CONSOLE_H;
  const midX = CONSOLE.x + CONSOLE.w / 2;
  return [
    halo(CONSOLE),
    solid(k.slabOf(CONSOLE, 0, top, P, 4, 0.5), { tone: "mid" }),
    line(k.sideSeam(CONSOLE, 3, P, 4), { tone: "faint" }),
    knob([midX, CONSOLE.y + 10], top, P, { radius: 4.4 }),
    jack([midX - 5, CONSOLE.y + CONSOLE.d - 7], top, P),
    jack([midX + 5, CONSOLE.y + CONSOLE.d - 7], top, P),
    screws(k.corners(CONSOLE, 3), top, P, 1),
  ].join("");
}

/** The pallet at the end of the line with sealed parcels stacked on it. */
function pallet() {
  const out = [
    halo(PALLET),
    solid(k.slabOf(PALLET, 0, PALLET_H, P, 3, 0.4), { tone: "lo" }),
  ];
  for (const x of [PALLET.x + 8, PALLET.x + PALLET.w - 8]) {
    out.push(
      line(
        k.segment(
          [x, PALLET.y + PALLET.d, 0.8],
          [x, PALLET.y + PALLET.d, PALLET_H - 1],
          P,
        ),
        { tone: "faint" },
      ),
    );
  }
  // Two sealed parcels side by side, a third on top of the far one.
  const stack = [
    [-9, 0],
    [-9, 1],
    [9, 0],
  ];
  for (const [dx, level] of stack) {
    out.push(
      parcel([dx, PALLET.y + PALLET.d / 2], PALLET_H + level * ITEM.h, true),
    );
  }
  return out.join("");
}

export function figure() {
  const front = byDepth(
    [
      ...PARCELS.map(([y, sealed]) => [
        0,
        y,
        () => parcel([0, y], BELT_Z, sealed),
      ]),
      [0, GATE_Y, gate],
      [BIN.x + BIN.w / 2, BIN.y + BIN.d / 2, rejectBin],
      [CONSOLE.x + CONSOLE.w / 2, CONSOLE.y + CONSOLE.d / 2, controlPod],
    ],
    P,
  );
  return {
    label:
      "An assembly line on a bench plate: parcels ride a belt from a control pod through a scanning gate with a lit lamp, a pusher drops a failed parcel into a reject bin, and sealed parcels stack on a pallet at the end.",
    body: [
      benchPlate(PLATE, P),
      farPillar(),
      pusher(),
      conveyor(),
      ...front.map(([, , draw]) => draw()),
      pallet(),
    ],
  };
}
