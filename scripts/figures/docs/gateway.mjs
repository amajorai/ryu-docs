/*
 * "Gateway": one control point in front of every model request, drawn as a toll
 * checkpoint. A lane crosses a bench plate between two kerbed islands; a booth
 * and a barrier post stand on the far island and the striped arm drops across
 * the lane onto a rest post, holding a waiting crate. The post's lamp is lit.
 */

import { benchPlate, dots, k, lamp, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -104, y: -76, w: 208, d: 140, r: 8 };
const ISLAND_H = 4;
const BACK = { x: -92, y: -66, w: 184, d: 38, r: 3 };
const FRONT = { x: -92, y: 36, w: 184, d: 18, r: 3 };
const LANE = { y0: BACK.y + BACK.d, y1: FRONT.y };
const BOOTH = { x: -70, y: -62, w: 38, d: 30, r: 2.5 };
const BOOTH_H = 48;
const ROOF_H = 4;
const POST = { x: -6, y: -54, w: 18, d: 22, r: 2 };
const POST_H = 26;
const ARM_Z = ISLAND_H + 18;
const ARM_X = POST.x + POST.w / 2 - 2;
const ARM_W = 5;
const ARM_H = 4.4;
const ARM_FROM = POST.y + POST.d;
const ARM_TO = FRONT.y + 8;
const STRIPE = 8;
const REST = [ARM_X + 2, FRONT.y + 11];
const CRATE = { x: -84, y: -6, w: 30, d: 24, r: 1.5 };
const CRATE_Z = 4;
const CRATE_H = 16;
const BOLLARDS = [36, 58, 80];
const BOLLARD_Y = BACK.y + BACK.d / 2;
const BOLLARD_R = 3.4;
const BOLLARD_H = 12;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [BOOTH.x, BOOTH.y, ISLAND_H + BOOTH_H + ROOF_H + 2],
    [POST.x, POST.y, ISLAND_H + POST_H + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the vertical face x = `x`, between y0..y1 and z0..z1. */
const sideRect = (y0, y1, z0, z1, x) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );

/** A closed outline on the vertical face y = `y`, between x0..x1 and z0..z1. */
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

const shaded = (d) => `<path class="iso-shade" data-shade="0" d="${d}"/>`;

function road() {
  const out = [
    solid(k.slabOf(BACK, 0, ISLAND_H, P, 3, 0.5), { tone: "mid" }),
    solid(k.slabOf(FRONT, 0, ISLAND_H, P, 3, 0.5), { tone: "mid" }),
  ];
  // Centre dashes along the lane and a stop line before the arm.
  const mid = (LANE.y0 + LANE.y1) / 2;
  for (let x = -96; x < 92; x += 20) {
    out.push(line(k.lineOnTop([x, mid], [x + 11, mid], 0, P), { tone: "lo" }));
  }
  out.push(
    line(
      k.lineOnTop([ARM_X - 12, LANE.y0 + 4], [ARM_X - 12, LANE.y1 - 4], 0, P),
      {
        tone: "mid",
      },
    ),
  );
  out.push(
    line(k.planOutline(k.insetPlan(BACK, 4), ISLAND_H, P, 2), {
      tone: "faint",
    }),
  );
  return out.join("");
}

function booth() {
  const z0 = ISLAND_H;
  const top = z0 + BOOTH_H;
  const front = BOOTH.y + BOOTH.d;
  const side = BOOTH.x + BOOTH.w;
  const roof = { ...k.insetPlan(BOOTH, -3), r: 3 };
  return [
    `<path class="iso-halo" d="${k.haloOf(BOOTH, z0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(BOOTH, z0, BOOTH_H, P, 4, 0.6), { tone: "mid" }),
    // A wide window on each visible face, with its sill and a mullion.
    line(faceRect(BOOTH.x + 5, side - 5, z0 + 20, top - 6, front), {
      tone: "lo",
    }),
    line(sideRect(BOOTH.y + 5, front - 5, z0 + 20, top - 6, side), {
      tone: "lo",
    }),
    line(
      k.segment(
        [side, BOOTH.y + BOOTH.d / 2, z0 + 20],
        [side, BOOTH.y + BOOTH.d / 2, top - 6],
        P,
      ),
      {
        tone: "faint",
      },
    ),
    line(
      k.segment([side, BOOTH.y + 3, z0 + 18], [side, front - 3, z0 + 18], P),
      {
        tone: "mid",
      },
    ),
    // A door on the front face.
    line(faceRect(BOOTH.x + 6, BOOTH.x + 16, z0, z0 + 15, front), {
      tone: "faint",
    }),
    solid(k.slabOf(roof, top, ROOF_H, P, 3, 0.5), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(roof, 4), top + ROOF_H, P, 2), {
      tone: "faint",
    }),
    screws(k.corners(roof, 2.5), top + ROOF_H, P, 1.1),
  ].join("");
}

function crate() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(CRATE, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
  ];
  // Four small wheels under a flat-topped crate.
  for (const [x, y] of k.corners(CRATE, 4)) {
    out.push(solid(k.cylinder(x, y, 3, 0, CRATE_Z, P, 16), { tone: "lo" }));
  }
  out.push(
    solid(k.slabOf(CRATE, CRATE_Z, CRATE_H, P, 3, 0.5), { tone: "mid" }),
  );
  const top = CRATE_Z + CRATE_H;
  out.push(
    line(k.planOutline(k.insetPlan(CRATE, 3), top, P, 2), { tone: "faint" }),
    line(k.sideSeam(CRATE, CRATE_Z + CRATE_H / 2, P, 3), { tone: "faint" }),
    screws(k.corners(CRATE, 2.4), top, P, 0.9),
  );
  return out.join("");
}

function post() {
  const z0 = ISLAND_H;
  const top = z0 + POST_H;
  const cap = k.insetPlan(POST, 2);
  const side = POST.x + POST.w;
  const out = [
    solid(k.slabOf(POST, z0, POST_H, P, 3, 0.6), { tone: "mid" }),
    line(k.sideSeam(POST, z0 + 6, P, 3), { tone: "faint" }),
  ];
  // Vent louvres on the visible side face.
  for (let i = 0; i < 4; i++) {
    const z = z0 + 9 + i * 2.6;
    out.push(
      line(
        k.segment([side, POST.y + 5, z], [side, POST.y + POST.d - 5, z], P),
        {
          tone: "lo",
        },
      ),
    );
  }
  out.push(
    solid(k.slabOf(cap, top, 2, P, 3), { tone: "lo" }),
    lamp([POST.x + POST.w / 2, POST.y + POST.d / 2], top + 2, P, {
      lit: true,
      radius: 3,
    }),
  );
  return out.join("");
}

/** The striped arm: alternate segments carry a dark band on top and side. */
function arm() {
  const out = [];
  const z1 = ARM_Z + ARM_H;
  for (let y = ARM_FROM, i = 0; y < ARM_TO - 0.01; y += STRIPE, i++) {
    const d = Math.min(STRIPE, ARM_TO - y);
    const plan = { x: ARM_X, y, w: ARM_W, d, r: 0 };
    out.push(
      solid(k.slabOf(plan, ARM_Z, ARM_H, P, 1), {
        tone: "mid",
        crease: "none",
      }),
    );
    if (i % 2 === 1) {
      out.push(
        shaded(k.planOutline(plan, z1, P, 1)),
        shaded(sideRect(y, y + d, ARM_Z, z1, ARM_X + ARM_W)),
      );
    }
  }
  out.push(
    line(
      k.planOutline(
        { x: ARM_X, y: ARM_FROM, w: ARM_W, d: ARM_TO - ARM_FROM, r: 0 },
        z1,
        P,
        1,
      ),
      {
        tone: "mid",
      },
    ),
  );
  // The pivot hub on the post face where the arm is pinned.
  out.push(
    solid(
      k.slabOf(
        { x: ARM_X - 2, y: ARM_FROM - 1, w: ARM_W + 4, d: 8, r: 2 },
        ARM_Z - 2.5,
        ARM_H + 5,
        P,
        3,
      ),
      {
        tone: "mid",
      },
    ),
    dots([at([ARM_X + ARM_W + 2, ARM_FROM + 3, ARM_Z + ARM_H / 2])], {
      size: 0.8,
    }),
  );
  return out.join("");
}

/** A row of short bollards along the far island past the gate. */
function bollards() {
  const out = [];
  for (const x of BOLLARDS) {
    out.push(
      solid(k.cylinder(x, BOLLARD_Y, BOLLARD_R + 1.2, ISLAND_H, 1, P, 20), {
        tone: "lo",
      }),
      solid(
        k.cylinder(x, BOLLARD_Y, BOLLARD_R, ISLAND_H + 1, BOLLARD_H, P, 24),
        {
          tone: "mid",
        },
      ),
      line(
        k.sideArc(x, BOLLARD_Y, BOLLARD_R, ISLAND_H + BOLLARD_H - 3, P, 24),
        {
          tone: "lo",
        },
      ),
    );
  }
  return out.join("");
}

/** A short rest post on the near island with a fork that cradles the arm tip. */
function rest() {
  const [x, y] = REST;
  const top = ARM_Z;
  return [
    solid(k.cylinder(x, y, 4.5, ISLAND_H, 2, P, 20), { tone: "lo" }),
    solid(k.cylinder(x, y, 2.4, ISLAND_H + 2, top - ISLAND_H - 2, P, 16), {
      tone: "mid",
    }),
    solid(
      k.slabOf({ x: x - 5, y: y - 3, w: 10, d: 6, r: 1 }, top - 2, 2, P, 2),
      {
        tone: "mid",
      },
    ),
    solid(
      k.slabOf({ x: x + 2.5, y: y - 3, w: 2.5, d: 6, r: 0.6 }, top, 4, P, 2),
      {
        tone: "mid",
      },
    ),
  ].join("");
}

export function figure() {
  return {
    label:
      "A toll checkpoint on a bench plate: a striped barrier arm from a post with a lit lamp drops across a lane onto a rest post, beside a booth and a row of bollards, with a crate waiting at the stop line.",
    body: [
      benchPlate(PLATE, P),
      road(),
      bollards(),
      booth(),
      crate(),
      post(),
      arm(),
      rest(),
    ],
  };
}
