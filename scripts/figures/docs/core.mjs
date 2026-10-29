/*
 * "Core": the local runtime every surface talks to, drawn as a heavy server
 * core. A machined block on a plinth carries a bank of heat-sink fins, a fan
 * grille on one flank and a row of ports on the other, cabled to a terminal
 * strip; the status lamp on its lid is the one lit part.
 */

import {
  benchPlate,
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
export const HEIGHT = 420;

const PLATE = { x: -80, y: -84, w: 148, d: 186, r: 8 };
const PLINTH = { x: -62, y: -66, w: 112, d: 112, r: 6 };
const PLINTH_H = 6;
const BLOCK = { x: -56, y: -60, w: 100, d: 100, r: 5 };
const BLOCK_H = 46;
const LID = BLOCK_H + PLINTH_H;
const FINS = 10;
const FIN_H = 20;
const FIN_GAP = 6;
const FAN = { y: -10, z: 28, r: 15 };
const PORT_X = [-42, -26, -10, 6, 22];
const STRIP = { x: -32, y: 62, w: 60, d: 14, r: 3 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [BLOCK.x, BLOCK.y, LID + FIN_H + 4]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const front = BLOCK.y + BLOCK.d;
const flank = BLOCK.x + BLOCK.w;

/** A closed outline on the vertical face y = `y`, between x0..x1 and z0..z1. */
const frontRect = (x0, x1, z0, z1, y = front) =>
  k.pathOf(
    [
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ].map(at),
    true,
  );

function body() {
  return [
    `<path class="iso-halo" d="${k.haloOf(PLINTH, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    solid(k.slabOf(PLINTH, 0, PLINTH_H, P, 6, 0.6), { tone: "lo" }),
    solid(k.slabOf(BLOCK, PLINTH_H, BLOCK_H, P, 6, 1), { tone: "mid" }),
    line(k.sideSeam(BLOCK, PLINTH_H + 8, P, 6), { tone: "faint" }),
    line(k.sideSeam(BLOCK, LID - 6, P, 6), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(BLOCK, 4), LID, P, 4), { tone: "faint" }),
    screws(k.corners(BLOCK, 5), LID, P, 1.4),
  ].join("");
}

/** The fan on the right flank: a guard of rings around a hub and blades. */
function fan() {
  const centre = [flank, FAN.y, FAN.z];
  const out = [];
  for (const [i, r] of [FAN.r, FAN.r - 4, FAN.r - 8].entries()) {
    out.push(
      line(k.sideRing(centre, r, "x", P, 36), {
        tone: i === 0 ? "mid" : "lo",
      }),
    );
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = a + 0.6;
    out.push(
      line(
        k.pathOf([
          at([flank, FAN.y + Math.cos(a) * 3, FAN.z + Math.sin(a) * 3]),
          at([
            flank,
            FAN.y + Math.cos(b) * (FAN.r - 1.5),
            FAN.z + Math.sin(b) * (FAN.r - 1.5),
          ]),
        ]),
        { tone: "lo" },
      ),
    );
  }
  out.push(line(k.sideRing(centre, 3, "x", P, 16), { tone: "mid" }));
  out.push(
    dots(
      [
        [FAN.y - FAN.r - 3, FAN.z - FAN.r - 3],
        [FAN.y + FAN.r + 3, FAN.z - FAN.r - 3],
        [FAN.y - FAN.r - 3, FAN.z + FAN.r + 3],
        [FAN.y + FAN.r + 3, FAN.z + FAN.r + 3],
      ].map(([y, z]) => at([flank, y, z])),
      { size: 0.5 },
    ),
  );
  // Vent slots behind the fan.
  for (let i = 0; i < 5; i++) {
    const y = BLOCK.y + 8 + i * 4;
    out.push(
      line(k.segment([flank, y, PLINTH_H + 14], [flank, y, LID - 10], P), {
        tone: "lo",
      }),
    );
  }
  return out.join("");
}

/** The port row on the front face: framed sockets above a recessed bay. */
function ports() {
  const out = [
    line(frontRect(BLOCK.x + 10, flank - 10, PLINTH_H + 12, PLINTH_H + 30), {
      tone: "lo",
    }),
  ];
  for (const x of PORT_X) {
    out.push(
      line(frontRect(x, x + 9, PLINTH_H + 16, PLINTH_H + 22), { tone: "mid" }),
      line(
        k.segment(
          [x + 2, front, PLINTH_H + 19],
          [x + 7, front, PLINTH_H + 19],
          P,
        ),
        {
          tone: "lo",
        },
      ),
    );
  }
  out.push(
    dots(
      PORT_X.map((x) => at([x + 4.5, front, PLINTH_H + 26])),
      { size: 0.55 },
    ),
  );
  return out.join("");
}

/** The heat sink: a bank of fins standing on a base plate on the lid. */
function heatSink() {
  const base = { x: BLOCK.x + 10, y: BLOCK.y + 8, w: 66, d: 62, r: 2 };
  const out = [solid(k.slabOf(base, LID, 2, P, 3, 0.3), { tone: "lo" })];
  for (let i = 0; i < FINS; i++) {
    const fin = {
      x: base.x + 3,
      y: base.y + 3 + i * FIN_GAP,
      w: base.w - 6,
      d: 1.8,
      r: 0.6,
    };
    out.push(
      solid(k.slabOf(fin, LID + 2, FIN_H, P, 2), {
        tone: "mid",
        crease: "lo",
      }),
    );
  }
  return out.join("");
}

function controls() {
  const y = BLOCK.y + BLOCK.d - 14;
  return [
    lamp([flank - 14, y], LID, P, { lit: true, radius: 3.6 }),
    knob([flank - 30, y], LID, P, { radius: 4.4 }),
    jack([BLOCK.x + 18, y], LID, P),
    jack([BLOCK.x + 30, y], LID, P),
  ].join("");
}

/** Leads from two front ports down to the terminal strip on the plate. */
function leads() {
  const z = 0.8;
  return [PORT_X[1], PORT_X[3]]
    .map((x, i) => {
      const from = [x + 4.5, front, PLINTH_H + 19];
      const end = [STRIP.x + 8 + i * 43.8, STRIP.y + 9, 4];
      const lip = PLINTH.y + PLINTH.d;
      return k.wireSvg(at(from), at(end), {
        via: [
          at([x + 4.5, front + 3, PLINTH_H + 6]),
          at([x + 4.5, lip - 1, PLINTH_H + 0.8]),
          at([x + 4.5, lip + 4, z]),
          at([end[0], STRIP.y - 4, z]),
        ],
        tone: "mid",
        size: 1,
      });
    })
    .join("");
}

function terminalStrip() {
  return [
    solid(k.slabOf(STRIP, 0, 4, P, 4, 0.5), { tone: "mid" }),
    screws(
      [0, 1, 2, 3].map((i) => [STRIP.x + 8 + i * 14.6, STRIP.y + 9]),
      4,
      P,
      1.6,
    ),
  ].join("");
}

export function figure() {
  return {
    label:
      "A heavy server block on a plinth with a bank of heat-sink fins on its lid, a fan grille on its flank and a row of ports cabled to a terminal strip; its status lamp is lit.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -44, y: PLATE.y + PLATE.d - 16, w: 70, d: 7, r: 1 }, P),
      body(),
      fan(),
      ports(),
      heatSink(),
      controls(),
      terminalStrip(),
      leads(),
    ],
  };
}
