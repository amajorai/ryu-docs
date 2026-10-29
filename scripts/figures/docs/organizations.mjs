/*
 * "Organizations": seats and roles, drawn as an org chart of pucks wired on a
 * board. One large owner puck with the lit lamp feeds two team-lead pucks, and
 * each lead feeds its member seats; one seat is still an empty socket.
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
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -104, y: -78, w: 208, d: 142, r: 8 };
const OWNER = { x: 0, y: -42, r: 25, h: 26 };
const LEADS = [
  { x: -50, y: 2, r: 16, h: 15 },
  { x: 50, y: 2, r: 16, h: 15 },
];
const MEMBERS = [
  { x: -76, y: 42, r: 11, h: 8, mark: "dot" },
  { x: -26, y: 42, r: 11, h: 8, mark: "bars" },
  { x: 26, y: 42, r: 11, h: 8, mark: "dot" },
];
const EMPTY_SEAT = { x: 76, y: 42, r: 11 };
const BUS_Y = [-12, 24];
const WIRE_Z = 0.8;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [OWNER.x, OWNER.y - OWNER.r, OWNER.h + 6]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const haloOf = ({ x, y, r }) =>
  `<path class="iso-halo" d="${k.haloOf({ x: x - r, y: y - r, w: r * 2, d: r * 2, r }, 0, 0.1, P)}" style="filter:blur(4px)"/>`;

/** A puck: a dark foot ring, a bevelled body with a seam, and an inset lid. */
function puckBody({ x, y, r, h }, tone = "mid") {
  return [
    haloOf({ x, y, r }),
    solid(k.cylinder(x, y, r, 0, 2, P, 40), { tone: "lo" }),
    solid(k.cylinder(x, y, r - 1.2, 2, h - 2, P, 40, 0.7), { tone }),
    line(k.sideArc(x, y, r - 1.2, h * 0.55, P, 32), { tone: "faint" }),
    line(k.ring(x, y, r - 4, h, P, 36), { tone: "faint" }),
  ].join("");
}

function owner() {
  const { x, y, r, h } = OWNER;
  const ticks = k.radialTicks(x, y, r - 4, 24, 6, h, [1.2, 2.4], P);
  return [
    puckBody(OWNER, "hi"),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    knob([x - 5, y + 4], h, P, { radius: 5, height: 4 }),
    lamp([x + 9, y - 5], h, P, { lit: true, radius: 2.4 }),
    jack([x + 9, y + 9], h, P),
    screws(
      [
        [x - 12, y - 10],
        [x + 13, y + 1],
      ],
      h,
      P,
      1.1,
    ),
  ].join("");
}

function lead(spec) {
  const { x, y, r, h } = spec;
  const ticks = k.radialTicks(x, y, r - 4, 12, 3, h, [1, 2], P);
  return [
    puckBody(spec),
    line(ticks.minor, { tone: "faint" }),
    line(ticks.major, { tone: "lo" }),
    lamp([x, y], h, P, { radius: 2.6 }),
  ].join("");
}

function member(spec) {
  const { x, y, h, mark } = spec;
  const out = [puckBody(spec)];
  if (mark === "dot") {
    out.push(dots([at([x, y, h])], { size: 1.1, tone: "mid" }));
  } else {
    out.push(
      line(
        [-1.6, 1.6]
          .map((dy) => k.lineOnTop([x - 2.6, y + dy], [x + 2.6, y + dy], h, P))
          .join(""),
        { tone: "mid" },
      ),
    );
  }
  return out.join("");
}

/** An unfilled seat: a counterbored socket in the board, waiting for a puck. */
function emptySeat() {
  const { x, y, r } = EMPTY_SEAT;
  return [
    line(k.ring(x, y, r, 0, P, 36), { tone: "mid" }),
    line(k.ring(x, y, r - 2.4, 0, P, 32), { tone: "lo", dashed: true }),
    dots([at([x, y, 0])], { size: 0.6 }),
  ].join("");
}

/** Right-angle wires run on the board from a parent puck down to children. */
function wires() {
  const out = [];
  for (const child of LEADS) {
    out.push(
      cable(
        [OWNER.x, OWNER.y, WIRE_Z],
        [child.x, child.y, WIRE_Z],
        [
          [OWNER.x, BUS_Y[0], WIRE_Z],
          [child.x, BUS_Y[0], WIRE_Z],
        ],
        P,
        { tone: "mid" },
      ),
    );
  }
  const seats = [...MEMBERS, EMPTY_SEAT];
  for (const [i, seat] of seats.entries()) {
    const parent = LEADS[i < 2 ? 0 : 1];
    out.push(
      cable(
        [parent.x, parent.y, WIRE_Z],
        [seat.x, seat.y - seat.r, WIRE_Z],
        [
          [parent.x, BUS_Y[1], WIRE_Z],
          [seat.x, BUS_Y[1], WIRE_Z],
        ],
        P,
        {
          tone: seat === EMPTY_SEAT ? "lo" : "mid",
          dashed: seat === EMPTY_SEAT,
        },
      ),
    );
  }
  return out.join("");
}

export function figure() {
  const pucks = byDepth(
    [
      [OWNER.x, OWNER.y, owner],
      ...LEADS.map((spec) => [spec.x, spec.y, () => lead(spec)]),
      ...MEMBERS.map((spec) => [spec.x, spec.y, () => member(spec)]),
    ],
    P,
  );
  return {
    label:
      "An org chart of pucks wired across a board: a large owner puck with a lit lamp feeds two team-lead pucks, which feed smaller member seats and one empty socket.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: 34, y: PLATE.y + 9, w: 56, d: 6, r: 1 }, P),
      emptySeat(),
      wires(),
      ...pucks.map(([, , draw]) => draw()),
    ],
  };
}
