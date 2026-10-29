/*
 * "Engines": pluggable runtimes behind one conversation, drawn as an engine
 * bay. Finned cylinder modules seat in a row of sockets on a chassis, fed by
 * leads from a distributor; the active one is lit, and a spare stands on the
 * plate beside its empty socket, ready to swap in.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  knob,
  lamp,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -108, y: -94, w: 132, d: 204, r: 8 };
const CHASSIS = { x: -60, y: -80, w: 64, d: 146, r: 6 };
const CHASSIS_H = 18;
const ROW_X = -28;
const SOCKETS = [-54, -20, 14, 48];
const EMPTY = 3;
const ACTIVE = 1;
const CYL_R = 11;
const CYL_H = 38;
const FINS = 7;
const DIST = [-88, -4];
const DIST_R = 10;
const DIST_H = 26;
const SPARE = [ROW_X, 90];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [ROW_X, SOCKETS[0], CHASSIS_H + CYL_H + 12],
    [DIST[0], DIST[1], DIST_H + 8],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const halo = (plan, z = 0) =>
  `<path class="iso-halo" d="${k.haloOf(plan, z, 0.1, P)}" style="filter:blur(5px)"/>`;
/** The distributor cap post that feeds socket `i`. */
const post = (i) => [DIST[0] + 3, DIST[1] + (i - 1.5) * 4.2];
const disc = (x, y, r) => ({ x: x - r, y: y - r, w: r * 2, d: r * 2, r });

function chassis() {
  const top = k.insetPlan(CHASSIS, 4);
  const out = [
    halo(CHASSIS),
    solid(k.slabOf(CHASSIS, 0, CHASSIS_H, P, 6, 1), { tone: "mid" }),
    line(k.planOutline(top, CHASSIS_H, P, 4), { tone: "faint" }),
    line(k.sideSeam(CHASSIS, 6, P, 6), { tone: "faint" }),
    screws(k.corners(CHASSIS, 6), CHASSIS_H, P, 1.4),
  ];
  // Vent slots along the near face.
  const face = CHASSIS.x + CHASSIS.w;
  for (let i = 0; i < 12; i++) {
    const y = CHASSIS.y + 16 + i * 10;
    out.push(
      line(k.segment([face, y, 4], [face, y, CHASSIS_H - 6], P), {
        tone: "lo",
      }),
    );
  }
  for (const [i, y] of SOCKETS.entries()) {
    out.push(
      line(k.ring(ROW_X, y, CYL_R + 2.5, CHASSIS_H, P, 40), { tone: "lo" }),
    );
    if (i === EMPTY) {
      out.push(
        line(k.ring(ROW_X, y, CYL_R - 1, CHASSIS_H, P, 36), { tone: "faint" }),
        dots(
          [0, 1, 2, 3].map((j) => {
            const a = (j * Math.PI) / 2 + Math.PI / 4;
            return at([
              ROW_X + Math.cos(a) * 6,
              y + Math.sin(a) * 6,
              CHASSIS_H,
            ]);
          }),
          { size: 0.7, tone: "hi" },
        ),
      );
    }
  }
  out.push(
    knob(
      [CHASSIS.x + CHASSIS.w - 12, CHASSIS.y + CHASSIS.d - 12],
      CHASSIS_H,
      P,
      { radius: 4.4 },
    ),
  );
  return out.join("");
}

/** A finned cylinder module standing at `z` with a capped terminal on top. */
function cylinderModule([x, y], z, lit = false) {
  const top = z + CYL_H;
  const out = [
    solid(k.cylinder(x, y, CYL_R + 1.5, z, 3, P, 40, 0.4), { tone: "lo" }),
    solid(k.cylinder(x, y, CYL_R, z + 3, CYL_H - 3, P, 40, 0.6), {
      tone: lit ? "hi" : "mid",
      lit,
    }),
  ];
  for (let i = 0; i < FINS; i++) {
    out.push(
      line(k.sideArc(x, y, CYL_R, z + 9 + i * 3.6, P, 24), {
        tone: i === 0 || i === FINS - 1 ? "lo" : "faint",
      }),
    );
  }
  out.push(
    solid(k.cylinder(x, y, CYL_R - 3, top, 3.5, P, 32, 0.4), { tone: "mid" }),
    line(k.knurl(x, y, CYL_R - 3, top, top + 3.5, 26, P), { tone: "lo" }),
    solid(k.cylinder(x, y, 2.2, top + 3.5, 4, P, 16), { tone: "mid" }),
  );
  if (lit) {
    out.push(lamp([x + CYL_R - 5.5, y], top, P, { radius: 1.3 }));
  }
  return out.join("");
}

/** The distributor at the back: a capped drum with a lead post per socket. */
function distributor() {
  const [x, y] = DIST;
  const top = DIST_H;
  return [
    halo(disc(x, y, DIST_R + 4)),
    solid(k.slabOf({ ...disc(x, y, DIST_R + 4), r: 3 }, 0, 3, P, 3, 0.4), {
      tone: "mid",
    }),
    solid(k.cylinder(x, y, DIST_R, 3, top - 3, P, 40, 0.6), { tone: "mid" }),
    line(k.sideArc(x, y, DIST_R, 10, P, 24), { tone: "faint" }),
    line(k.ring(x, y, DIST_R - 2.5, top, P, 36), { tone: "lo" }),
    ...SOCKETS.map((_, i) => {
      const [px, py] = post(i);
      return solid(k.cylinder(px, py, 1.3, top, 2, P, 12), { tone: "mid" });
    }),
  ].join("");
}

/** Leads from the distributor posts to each seated module's terminal. */
function leads() {
  const end = CHASSIS_H + CYL_H + 7.5;
  return SOCKETS.map((socket, i) => {
    if (i === EMPTY) {
      return "";
    }
    const [px, py] = post(i);
    const from = [px, py, DIST_H + 2];
    const to = [ROW_X, socket, end];
    const via = [];
    for (let step = 1; step < 14; step++) {
      const t = step / 14;
      via.push(
        at([
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t,
          from[2] + (to[2] - from[2]) * t + 14 * Math.sin(Math.PI * t),
        ]),
      );
    }
    return k.wireSvg(at(from), at(to), {
      via,
      tone: i === ACTIVE ? "hi" : "mid",
      flow: i === ACTIVE,
      size: 1,
    });
  }).join("");
}

/** A dotted arc from the spare's cap to the empty socket: the swap path. */
function swapPath() {
  const from = [SPARE[0], SPARE[1], CYL_H + 10];
  const to = [ROW_X, SOCKETS[EMPTY], CHASSIS_H + 2];
  const points = [];
  for (let step = 0; step <= 16; step++) {
    const t = step / 16;
    points.push(
      at([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        from[2] + (to[2] - from[2]) * t + 20 * Math.sin(Math.PI * t),
      ]),
    );
  }
  return line(k.pathOf(points), { tone: "mid", dotted: true });
}

export function figure() {
  const seated = SOCKETS.flatMap((y, i) =>
    i === EMPTY
      ? []
      : [[ROW_X, y, () => cylinderModule([ROW_X, y], CHASSIS_H, i === ACTIVE)]],
  );
  const spare = () =>
    halo(disc(SPARE[0], SPARE[1], CYL_R + 2)) + cylinderModule(SPARE, 0);
  return {
    label:
      "An engine bay on a bench plate: finned cylinder modules seated in a chassis, wired to a distributor, one lit, with a spare cylinder standing beside an empty socket.",
    body: [
      benchPlate(PLATE, P),
      distributor(),
      chassis(),
      ...byDepth(seated, P).map(([, , draw]) => draw()),
      leads(),
      spare(),
      swapPath(),
    ],
  };
}
