/*
 * "Box": a cloud computer on demand, drawn as a blade server chassis. One
 * blade rides out of its bay on telescoping rails with its lit compute module
 * exposed; the other bays stay closed behind their faceplates.
 */

import { benchPlate, dots, k, line, screws, solid } from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -96, y: -96, w: 192, d: 166, r: 8 };
const CHASSIS = { x: -72, y: -78, w: 144, d: 74, r: 3 };
const CHASSIS_H = 54;
const FRONT = CHASSIS.y + CHASSIS.d;
const BAY_H = 13;
const BAYS = [6, 21, 36];
const OPEN_BAY = 1;
const BAY_X = [CHASSIS.x + 6, CHASSIS.x + CHASSIS.w - 6];
const PULL = 60;
const EAR_W = 8;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [CHASSIS.x - EAR_W, CHASSIS.y, CHASSIS_H],
    [CHASSIS.x + CHASSIS.w + EAR_W, FRONT + 2, CHASSIS_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the vertical face `y` between x0..x1 and z0..z1. */
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

/** Two pull tabs, a vent strip and a status pip on a bay's faceplate. */
function faceplateDetail(z, y) {
  const mid = z + BAY_H / 2;
  const out = [];
  for (const x of [BAY_X[0] + 6, BAY_X[1] - 12]) {
    out.push(
      line(faceRect(x, x + 6, z + 3, z + BAY_H - 3, y), { tone: "mid" }),
    );
  }
  const vents = [];
  for (let i = 0; i < 18; i++) {
    vents.push(at([BAY_X[0] + 26 + i * 4, y, mid + 1.6]));
    vents.push(at([BAY_X[0] + 26 + i * 4, y, mid - 1.6]));
  }
  out.push(dots(vents, { size: 0.45, tone: "lo" }));
  out.push(
    line(k.sideRing([BAY_X[1] - 24, y, mid], 1.6, "y", P, 14), { tone: "mid" }),
  );
  return out.join("");
}

function chassis() {
  const lid = k.insetPlan(CHASSIS, 6);
  const out = [
    `<path class="iso-halo" d="${k.haloOf(CHASSIS, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    solid(k.slabOf(CHASSIS, 0, CHASSIS_H, P, 4, 0.8), { tone: "mid" }),
    line(k.planOutline(lid, CHASSIS_H, P, 3), { tone: "faint" }),
    dots(k.dotGrid(lid.x + 8, lid.y + 8, 22, 9, 5.6, CHASSIS_H, P), {
      size: 0.4,
      tone: "lo",
    }),
    screws(k.corners(CHASSIS, 3.5), CHASSIS_H, P, 1.3),
    line(k.sideSeam(CHASSIS, 3, P, 4), { tone: "faint" }),
  ];
  for (const [i, z] of BAYS.entries()) {
    out.push(
      line(faceRect(BAY_X[0], BAY_X[1], z, z + BAY_H, FRONT), { tone: "lo" }),
    );
    if (i === OPEN_BAY) {
      const d = faceRect(
        BAY_X[0] + 1,
        BAY_X[1] - 1,
        z + 1,
        z + BAY_H - 1,
        FRONT,
      );
      out.push(`<path class="iso-shade" data-shade="0" d="${d}"/>`);
    } else {
      out.push(faceplateDetail(z, FRONT));
    }
  }
  return out.join("");
}

/** Rack ears on both front corners with two mounting holes each. */
function ear(x) {
  const plan = { x, y: FRONT - 4, w: EAR_W, d: 4, r: 0.6 };
  const out = [solid(k.slabOf(plan, 2, CHASSIS_H - 4, P, 2), { tone: "mid" })];
  for (const z of [12, CHASSIS_H - 12]) {
    out.push(
      line(k.sideRing([x + EAR_W / 2, FRONT, z], 1.6, "y", P, 14), {
        tone: "lo",
      }),
    );
  }
  return out.join("");
}

function rail(x, z) {
  const outer = { x, y: FRONT - 2, w: 3, d: PULL - 6, r: 0.4 };
  const inner = {
    x: x + 0.6,
    y: FRONT + PULL * 0.45,
    w: 1.8,
    d: PULL * 0.5,
    r: 0.3,
  };
  return [
    solid(k.slabOf(outer, z, 2.4, P, 2), { tone: "lo", crease: "none" }),
    line(
      k.lineOnTop(
        [inner.x + 0.9, outer.y + 4],
        [inner.x + 0.9, inner.y],
        z + 2.4,
        P,
      ),
      {
        tone: "faint",
      },
    ),
  ].join("");
}

/** The pulled blade: a tray with memory, storage and the lit compute module. */
function blade() {
  const z = BAYS[OPEN_BAY] + 1;
  const tray = {
    x: BAY_X[0] + 4,
    y: FRONT - 4,
    w: BAY_X[1] - BAY_X[0] - 8,
    d: PULL,
    r: 1,
  };
  const top = z + 2.5;
  const out = [solid(k.slabOf(tray, z, 2.5, P, 2, 0.4), { tone: "mid" })];
  out.push(
    dots(k.dotGrid(tray.x + 4, tray.y + 4, 30, 2, 4, top, P), {
      size: 0.35,
      tone: "faint",
    }),
  );
  // Storage drives on the left of the tray.
  for (const y of [tray.y + 14, tray.y + 32]) {
    const drive = { x: tray.x + 6, y, w: 26, d: 14, r: 1 };
    out.push(
      solid(k.slabOf(drive, top, 3, P, 2), { tone: "mid", crease: "lo" }),
    );
    out.push(
      line(k.ring(drive.x + 18, y + 7, 4, top + 3, P, 24), { tone: "faint" }),
    );
  }
  // Memory sticks standing in a row.
  for (let i = 0; i < 6; i++) {
    const stick = {
      x: tray.x + 82 + i * 5,
      y: tray.y + 10,
      w: 1.6,
      d: 40,
      r: 0.3,
    };
    out.push(
      solid(k.slabOf(stick, top, 7, P, 1), { tone: "mid", crease: "none" }),
    );
  }
  // The compute module with a finned heatsink.
  const cpu = { x: tray.x + 42, y: tray.y + 16, w: 30, d: 28, r: 1.5 };
  const cpuTop = top + 8;
  out.push(
    solid(k.slabOf(cpu, top, 8, P, 3, 0.6), {
      tone: "hi",
      lit: true,
      crease: "lo",
    }),
  );
  for (let i = 1; i < 7; i++) {
    const x = cpu.x + i * (cpu.w / 7);
    out.push(
      line(k.lineOnTop([x, cpu.y + 3], [x, cpu.y + cpu.d - 3], cpuTop, P), {
        tone: "lo",
      }),
    );
  }
  // Faceplate on the front of the tray.
  const plate = {
    x: BAY_X[0] + 1,
    y: tray.y + tray.d,
    w: BAY_X[1] - BAY_X[0] - 2,
    d: 3,
    r: 0.6,
  };
  const face = plate.y + plate.d;
  out.push(
    solid(k.slabOf(plate, z - 1, BAY_H - 1, P, 2, 0.4), { tone: "mid" }),
  );
  out.push(faceplateDetail(z - 1, face));
  return out.join("");
}

export function figure() {
  const railZ = BAYS[OPEN_BAY] + 0.5;
  return {
    label:
      "A blade server chassis on a bench plate with one blade slid out on rails, showing its drives, memory and a lit compute module.",
    body: [
      benchPlate(PLATE, P),
      ear(CHASSIS.x - EAR_W),
      chassis(),
      rail(BAY_X[0] + 1, railZ),
      blade(),
      rail(BAY_X[1] - 4, railZ),
      ear(CHASSIS.x + CHASSIS.w),
    ],
  };
}
