/*
 * "Build on Ryu": the Gateway routing each call under policy, drawn as a
 * transfer table. A request cart (the lit part) arrives on the input track,
 * rides a sliding platform across the pit and leaves on one of three output
 * lanes; a dial gauge beside the pit reads the budget left.
 */

import {
  benchPlate,
  dots,
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

const PLATE = { x: -150, y: -84, w: 300, d: 168, r: 8 };
const GAUGE = 7;
const RAIL_H = 2.4;
const LANES = [-50, 0, 50];
const INPUT = { from: -140, to: -50, y: 0 };
const OUTPUT = { from: 6, to: 128 };
const PIT = { x: -48, y: -76, w: 52, d: 152, r: 2 };
const PLATFORM_Y = LANES[0];
const PLATFORM = { x: -44, y: PLATFORM_Y - 15, w: 44, d: 30, r: 2 };
const DIAL = [96, 62];
const DIAL_R = 15;
const DIAL_Z = 18;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [DIAL[0], DIAL[1], DIAL_Z + 6]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A straight run of track along x: sleepers, two rails, chairs as dots. */
function track(from, to, y, z = 0) {
  const out = [];
  for (let x = from + 3; x < to - 2; x += 9) {
    out.push(
      solid(k.slabOf({ x, y: y - 11, w: 4.5, d: 22, r: 0.6 }, z, 1.4, P, 2), {
        tone: "lo",
        crease: "none",
      }),
    );
  }
  for (const side of [-GAUGE, GAUGE]) {
    out.push(
      solid(
        k.slabOf(
          { x: from, y: y + side - 1.2, w: to - from, d: 2.4, r: 0.6 },
          z + 1.4,
          RAIL_H,
          P,
          2,
          0.3,
        ),
        {
          tone: "mid",
        },
      ),
    );
  }
  const chairs = [];
  for (let x = from + 5; x < to - 2; x += 9) {
    chairs.push(
      at([x, y - GAUGE - 2.2, z + 1.4]),
      at([x, y + GAUGE + 2.2, z + 1.4]),
    );
  }
  out.push(dots(chairs, { size: 0.4, tone: "lo" }));
  return out.join("");
}

/** End stop: a buffer beam on two posts with sprung pads facing the track. */
function bufferStop(x, y) {
  return [
    solid(k.slabOf({ x, y: y - 12, w: 6, d: 24, r: 1 }, 0, 12, P, 3, 0.5), {
      tone: "mid",
    }),
    solid(k.slabOf({ x: x - 3, y: y - 9, w: 3, d: 5, r: 1 }, 5, 4, P, 3), {
      tone: "mid",
    }),
    solid(k.slabOf({ x: x - 3, y: y + 4, w: 3, d: 5, r: 1 }, 5, 4, P, 3), {
      tone: "mid",
    }),
    dots([at([x + 3, y - 8, 12]), at([x + 3, y + 8, 12])], { size: 0.45 }),
  ].join("");
}

function pit() {
  const out = [line(k.planOutline(PIT, 0, P, 3), { tone: "mid" })];
  out.push(
    line(k.planOutline(k.insetPlan(PIT, 3), 0, P, 3), { tone: "faint" }),
  );
  for (const x of [PIT.x + 8, PIT.x + PIT.w - 12]) {
    out.push(
      solid(
        k.slabOf(
          { x, y: PIT.y + 4, w: 4, d: PIT.d - 8, r: 0.6 },
          0,
          1.6,
          P,
          2,
          0.3,
        ),
        {
          tone: "mid",
        },
      ),
    );
  }
  out.push(
    rulerStrip(
      { x: PIT.x + PIT.w + 2, y: PIT.y + 6, w: 6, d: PIT.d - 12, r: 1 },
      P,
    ),
  );
  return out.join("");
}

function platform() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(PLATFORM, 1.6, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(PLATFORM, 1.6, 4, P, 4, 0.6), { tone: "mid" }),
    screws(k.corners(PLATFORM, 3), 5.6, P, 1.2),
    track(PLATFORM.x, PLATFORM.x + PLATFORM.w, PLATFORM_Y, 5.6),
  ];
  // Drive lever on the platform's front edge.
  const lever = [PLATFORM.x + PLATFORM.w - 6, PLATFORM.y + PLATFORM.d + 4];
  out.push(
    solid(
      k.slabOf(
        { x: lever[0] - 2, y: PLATFORM.y + PLATFORM.d, w: 4, d: 4, r: 1 },
        2,
        3,
        P,
        2,
      ),
      {
        tone: "mid",
        crease: "none",
      },
    ),
  );
  out.push(knob(lever, 1.6, P, { radius: 3, height: 5 }));
  return out.join("");
}

function cart() {
  const z = 5.6 + 1.4 + RAIL_H;
  const body = { x: PLATFORM.x + 8, y: PLATFORM_Y - 9, w: 28, d: 18, r: 2 };
  const out = [];
  for (const x of [body.x + 4, body.x + body.w - 8]) {
    out.push(
      solid(
        k.slabOf(
          { x, y: PLATFORM_Y - GAUGE - 2, w: 4, d: GAUGE * 2 + 4, r: 1.6 },
          z - 1,
          4,
          P,
          4,
        ),
        {
          tone: "mid",
        },
      ),
    );
  }
  out.push(
    solid(k.slabOf(body, z + 3, 10, P, 4, 0.8), { tone: "hi", lit: true }),
  );
  out.push(
    line(k.planOutline(k.insetPlan(body, 3), z + 13, P, 3), { tone: "lo" }),
  );
  out.push(
    dots(
      [
        at([body.x + 6, body.y + 5, z + 13]),
        at([body.x + body.w - 6, body.y + body.d - 5, z + 13]),
      ],
      {
        size: 0.45,
        tone: "hi",
      },
    ),
  );
  return out.join("");
}

function dial() {
  const [x, y] = DIAL;
  const top = DIAL_Z + 5;
  const ticks = k.radialTicks(
    x,
    y,
    DIAL_R - 3,
    40,
    5,
    top,
    [1.2, 2.6],
    P,
    -Math.PI * 0.75,
    Math.PI * 1.5,
  );
  const angle = -Math.PI * 0.75 + Math.PI * 1.5 * 0.62;
  return [
    solid(
      k.slabOf({ x: x - 8, y: y - 8, w: 16, d: 16, r: 2 }, 0, 4, P, 4, 0.5),
      { tone: "mid" },
    ),
    solid(k.cylinder(x, y, 3, 4, DIAL_Z - 4, P, 20), {
      tone: "mid",
      crease: "none",
    }),
    solid(k.cylinder(x, y, DIAL_R, DIAL_Z, 5, P, 64, 0.8), {
      tone: "hi",
      crease: "lo",
    }),
    line(k.knurl(x, y, DIAL_R, top - 2.4, top, 72, P, 0.3), { tone: "lo" }),
    line(k.ring(x, y, DIAL_R - 2, top, P, 64), { tone: "lo" }),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    line(
      k.lineOnTop(
        [x, y],
        [
          x + Math.cos(angle) * (DIAL_R - 4),
          y + Math.sin(angle) * (DIAL_R - 4),
        ],
        top + 0.2,
        P,
      ),
      {
        tone: "lit",
        free: "end",
      },
    ),
    line(k.ring(x, y, 1.4, top, P, 16), { tone: "mid" }),
  ].join("");
}

export function yardFigure() {
  const lanes = LANES.map((y, i) =>
    [
      track(OUTPUT.from, OUTPUT.to, y),
      bufferStop(OUTPUT.to, y),
      lamp([OUTPUT.from + 6, y + 18], 0, P, { lit: i === 0 }),
    ].join(""),
  );
  return {
    label:
      "A transfer table on a bench plate: a lit cart on a sliding platform is carried from the input track across a pit to the first of three output lanes, each ending at a buffer stop, beside a dial gauge.",
    body: [
      benchPlate(PLATE, P),
      track(INPUT.from, INPUT.to, INPUT.y),
      bufferStop(INPUT.from - 6, INPUT.y),
      pit(),
      ...lanes,
      platform(),
      cart(),
      dial(),
    ],
  };
}
