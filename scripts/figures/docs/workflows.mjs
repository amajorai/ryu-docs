/*
 * "Workflows": steps run in order, each handing its output to the next, drawn
 * as a conveyor line. A belt on legs carries parcels through three stations
 * (a hopper, a gauge and a stamp), each parcel a little more finished than the
 * last; the middle station's lamp is the one lit part.
 */

import {
  benchPlate,
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

const PLATE = { x: -150, y: -50, w: 300, d: 90, r: 8 };
const BELT = { x: -138, y: -14, w: 276, d: 28, r: 4 };
const LEG_H = 9;
const FRAME_H = 5;
const BELT_Z = LEG_H + FRAME_H;
const STATIONS = [-78, 0, 78];
const POST = { w: 18, d: 9 };
const ROOF_Z = 46;
const ROOF_H = 7;
const ITEMS = [-118, -40, 40, 118];
const ITEM = { w: 16, d: 16, h: 12 };
const PANEL = { x: -128, y: 17, w: 30, d: 18, r: 3 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [STATIONS[0], -BELT.d, ROOF_Z + ROOF_H + 14],
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const near = BELT.y + BELT.d;

function conveyor() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BELT, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
  ];
  for (const x of [BELT.x + 10, 0, BELT.x + BELT.w - 10]) {
    for (const y of [BELT.y + 4, near - 4]) {
      out.push(
        solid(
          k.slabOf(
            { x: x - 2.5, y: y - 2.5, w: 5, d: 5, r: 1 },
            0,
            LEG_H,
            P,
            2,
          ),
          {
            tone: "lo",
          },
        ),
      );
    }
  }
  out.push(solid(k.slabOf(BELT, LEG_H, FRAME_H, P, 6, 0.5), { tone: "mid" }));
  const belt = k.insetPlan(BELT, 3);
  out.push(line(k.planOutline(belt, BELT_Z, P, 4), { tone: "lo" }));
  for (let x = belt.x + 6; x < belt.x + belt.w - 4; x += 8) {
    out.push(
      line(k.lineOnTop([x, belt.y + 1], [x, belt.y + belt.d - 1], BELT_Z, P), {
        tone: "faint",
      }),
    );
  }
  // Roller ends along the near rail.
  const rollers = [];
  for (let x = BELT.x + 8; x < BELT.x + BELT.w - 4; x += 16) {
    rollers.push(k.sideRing([x, near, LEG_H + FRAME_H / 2], 1.6, "y", P, 12));
  }
  out.push(line(rollers.join(""), { tone: "lo" }));
  return out.join("");
}

const post = (x, y) =>
  solid(
    k.slabOf(
      { x: x - POST.w / 2, y, w: POST.w, d: POST.d, r: 1.5 },
      0,
      ROOF_Z,
      P,
      3,
      0.4,
    ),
    { tone: "mid" },
  );

/** The column of a station, behind the belt and painted before it. */
const backPost = (x) => post(x, BELT.y - POST.d - 2);

/** A station's tool head on its roof: hopper, gauge with the lit lamp, or stamp. */
function toolHead(x, index, top) {
  if (index === 0) {
    return [
      solid(k.cylinder(x, 0, 8, top, 3, P, 32), { tone: "mid" }),
      solid(k.cylinder(x, 0, 6.5, top + 3, 9, P, 32, 0.4), { tone: "mid" }),
      line(k.ring(x, 0, 4.5, top + 12, P, 28), { tone: "lo" }),
    ].join("");
  }
  if (index === 1) {
    return [
      lamp([x, -14], top, P, { lit: true, radius: 3.4 }),
      knob([x, 6], top, P, { radius: 4.2 }),
      ...[-6, -2, 2, 6].map((dx) =>
        line(k.lineOnTop([x + dx, -5], [x + dx, -1], top, P), {
          tone: "lo",
        }),
      ),
    ].join("");
  }
  return [
    solid(
      k.slabOf({ x: x - 7, y: -10, w: 14, d: 16, r: 2 }, top, 9, P, 3, 0.5),
      {
        tone: "mid",
      },
    ),
    jack([x, -2], top + 9, P),
  ].join("");
}

/** The arm cantilevered over the belt, its nozzle and its tool head. */
function stationFront(x, index) {
  const roof = {
    x: x - 12,
    y: BELT.y - POST.d - 4,
    w: 24,
    d: BELT.d + POST.d + 8,
    r: 2,
  };
  const top = ROOF_Z + ROOF_H;
  return [
    solid(k.cylinder(x, 0, 4.5, ROOF_Z - 8, 8, P, 24), { tone: "mid" }),
    solid(k.cylinder(x, 0, 2.5, ROOF_Z - 12, 4, P, 16), { tone: "lo" }),
    solid(k.slabOf(roof, ROOF_Z, ROOF_H, P, 3, 0.6), { tone: "mid" }),
    line(k.sideSeam(roof, ROOF_Z + 2.5, P, 3), { tone: "faint" }),
    screws(k.corners(roof, 3.2), top, P, 1.1),
    toolHead(x, index, top),
  ].join("");
}

/** A parcel on the belt; later parcels carry more of the work done on them. */
function parcel(x, stage) {
  const plan = {
    x: x - ITEM.w / 2,
    y: -ITEM.d / 2,
    w: ITEM.w,
    d: ITEM.d,
    r: 1,
  };
  const top = BELT_Z + ITEM.h;
  const out = [
    solid(k.slabOf(plan, BELT_Z, ITEM.h, P, 2, 0.3), { tone: "mid" }),
  ];
  if (stage >= 1) {
    out.push(
      line(k.lineOnTop([x, plan.y], [x, plan.y + plan.d], top, P), {
        tone: "lo",
      }),
    );
  }
  if (stage >= 2) {
    out.push(
      line(k.lineOnTop([plan.x, 0], [plan.x + plan.w, 0], top, P), {
        tone: "lo",
      }),
    );
  }
  if (stage >= 3) {
    out.push(line(k.ring(x, 0, 3, top, P, 20), { tone: "mid" }));
    out.push(dots([at([x, 0, top])], { size: 0.6 }));
  }
  return out.join("");
}

function controlPanel() {
  const top = 10;
  return [
    `<path class="iso-halo" d="${k.haloOf(PANEL, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(PANEL, 0, top, P, 4, 0.6), { tone: "mid" }),
    screws(k.corners(PANEL, 3), top, P, 1.1),
    knob([PANEL.x + 10, PANEL.y + 9], top, P, { radius: 4.4 }),
    lamp([PANEL.x + 22, PANEL.y + 5.5], top, P),
    lamp([PANEL.x + 22, PANEL.y + 12.5], top, P),
  ].join("");
}

export function figure() {
  const front = [
    ...STATIONS.map((x, index) => [x + 0.5, () => stationFront(x, index)]),
    ...ITEMS.map((x, stage) => [x, () => parcel(x, stage)]),
  ].sort((a, b) => a[0] - b[0]);
  return {
    label:
      "A conveyor belt on a bench plate carrying parcels through three stations, a hopper, a gauge and a stamp, with each parcel more finished than the last; the middle station's lamp is lit.",
    body: [
      benchPlate(PLATE, P),
      ...STATIONS.map(backPost),
      conveyor(),
      ...front.map(([, draw]) => draw()),
      controlPanel(),
    ],
  };
}
