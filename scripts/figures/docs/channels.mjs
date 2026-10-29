/*
 * "Channels": every bot and messaging channel patched into one place, drawn as
 * a cord switchboard. An upright jack field rises behind a keyshelf; patch cords
 * run from plugs in the jacks down to holes in the shelf, spare plugs wait in
 * the others, and one line lamp on the shelf (the lit part) shows a live call.
 */

import {
  benchPlate,
  byDepth,
  dots,
  k,
  lamp,
  line,
  rulerStrip,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 420;

const PLATE = { x: -100, y: -74, w: 200, d: 116, r: 8 };
const PANEL = { x: -78, y: -62, w: 156, d: 16, r: 3 };
const PANEL_H = 86;
const SHELF = { x: -78, y: -48, w: 156, d: 58, r: 3 };
const SHELF_H = 24;
const FACE = PANEL.y + PANEL.d;
const COLUMNS = Array.from({ length: 7 }, (_, i) => -63 + i * 21);
const ROWS = [40, 54, 68];
const HOLE_Y = FACE + 7;
const KEY_Y = FACE + 22;
const LAMP_Y = FACE + 36;
const PLUG_R = 2.2;
const PLUG_H = 7;
const BOOT = 6;
// Each cord: [jack column, jack row, shelf hole column].
const CORDS = [
  [1, 0, 3],
  [4, 1, 0],
  [6, 2, 5],
  [2, 2, 6],
];
const LIT = 3;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [PANEL.x, PANEL.y, PANEL_H + 4],
    [PANEL.x + PANEL.w, PANEL.y, PANEL_H + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const used = new Set(CORDS.map(([, , hole]) => hole));

function panel() {
  const cap = { ...k.insetPlan(PANEL, -1.5), r: 3.5 };
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ ...PANEL, d: PANEL.d + SHELF.d }, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(PANEL, 0, PANEL_H, P, 4, 0.6), { tone: "mid" }),
    solid(k.slabOf(cap, PANEL_H, 3, P, 4, 0.5), { tone: "mid" }),
    line(k.planOutline(k.insetPlan(cap, 3), PANEL_H + 3, P, 3), {
      tone: "faint",
    }),
    screws(k.corners(cap, 3), PANEL_H + 3, P, 1),
  ];
  // Rails between the rows of jacks.
  for (const z of [33, 47, 61, 75]) {
    out.push(
      line(
        k.segment([PANEL.x + 5, FACE, z], [PANEL.x + PANEL.w - 5, FACE, z], P),
        { tone: "faint" },
      ),
    );
  }
  const rings = [];
  const holes = [];
  for (const x of COLUMNS) {
    for (const z of ROWS) {
      rings.push(k.sideRing([x, FACE, z], 3, "y", P, 16));
      holes.push(k.sideRing([x, FACE, z], 1.6, "y", P, 12));
    }
  }
  out.push(
    line(rings.join(""), { tone: "mid" }),
    line(holes.join(""), { tone: "lo" }),
    dots(
      COLUMNS.flatMap((x) => ROWS.map((z) => at([x, FACE, z]))),
      { size: 0.6, tone: "hi" },
    ),
  );
  return out.join("");
}

/** A plug seated in a jack: a square boot standing out from the face. */
function boot([column, row]) {
  const x = COLUMNS[column];
  const z = ROWS[row];
  return solid(
    k.slabOf(
      { x: x - 2.4, y: FACE, w: 4.8, d: BOOT, r: 1 },
      z - 2.4,
      4.8,
      P,
      2,
    ),
    { tone: "mid" },
  );
}

function shelf() {
  const out = [
    solid(k.slabOf(SHELF, 0, SHELF_H, P, 4, 0.6), { tone: "mid" }),
    line(k.sideSeam(SHELF, 6, P, 4), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(SHELF, 3), SHELF_H, P, 3), {
      tone: "faint",
    }),
  ];
  for (const [i, x] of COLUMNS.entries()) {
    out.push(
      line(k.ring(x, HOLE_Y, 2.8, SHELF_H, P, 20), { tone: "lo" }),
      dots([at([x, HOLE_Y, SHELF_H])], { size: 0.6, tone: "hi" }),
      used.has(i) ? collar(x) : "",
      key(x),
      i === LIT
        ? lamp([x, LAMP_Y], SHELF_H, P, { lit: true, radius: 2 })
        : lens(x),
    );
  }
  return out.join("");
}

/** The ferrule where a working cord rises out of its shelf hole. */
function collar(x) {
  return solid(k.cylinder(x, HOLE_Y, PLUG_R, SHELF_H, 1.4, P, 12), {
    tone: "lo",
  });
}

/** An unlit line lamp: a bezel ring around a dark lens. */
function lens(x) {
  return [
    line(k.ring(x, LAMP_Y, 3, SHELF_H, P, 16), { tone: "mid" }),
    solid(k.cylinder(x, LAMP_Y, 2, SHELF_H, 1, P, 14), { tone: "lo" }),
  ].join("");
}

/** A talk key: a small base with a lever thrown back. */
function key(x) {
  const top = SHELF_H + 1.2;
  return [
    solid(
      k.slabOf(
        { x: x - 3, y: KEY_Y - 3, w: 6, d: 6, r: 1 },
        SHELF_H,
        1.2,
        P,
        1,
      ),
      { tone: "lo" },
    ),
    line(k.segment([x, KEY_Y, top], [x, KEY_Y - 2.4, top + 5], P), {
      tone: "hi",
    }),
    solid(k.cylinder(x, KEY_Y - 2.4, 1.1, top + 4.4, 1.4, P, 10), {
      tone: "mid",
    }),
  ].join("");
}

/** A spare plug standing in its shelf hole, cord stowed below. */
function sparePlug(x) {
  return [
    solid(k.cylinder(x, HOLE_Y, PLUG_R + 0.8, SHELF_H, 2, P, 12), {
      tone: "lo",
    }),
    solid(k.cylinder(x, HOLE_Y, PLUG_R, SHELF_H + 2, PLUG_H, P, 12), {
      tone: "mid",
    }),
    solid(k.cylinder(x, HOLE_Y, 1, SHELF_H + 2 + PLUG_H, 2.4, P, 12), {
      tone: "mid",
    }),
  ].join("");
}

/** A sagging cord from a plug boot down to a hole in the shelf. */
function cord([column, row, hole]) {
  const from = [COLUMNS[column], FACE + BOOT, ROWS[row]];
  const to = [COLUMNS[hole], HOLE_Y, SHELF_H + 1.4];
  const points = [];
  const steps = 18;
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const sag = Math.sin(Math.PI * t);
    points.push(
      at([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t + sag * 7,
        Math.max(
          SHELF_H + 1,
          from[2] + (to[2] - from[2]) * t - sag * 9 * (1 - t),
        ),
      ]),
    );
  }
  return line(k.pathOf(points), { tone: "mid" });
}

export function figure() {
  const spares = COLUMNS.filter((_, i) => !used.has(i));
  return {
    label:
      "A cord switchboard on a bench plate: patch cords run from plugs in an upright jack field down to a keyshelf with talk keys and line lamps, one lamp lit, and spare plugs standing ready.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -84, y: PLATE.y + PLATE.d - 18, w: 120, d: 7, r: 1 }, P),
      panel(),
      ...CORDS.map(boot),
      shelf(),
      ...byDepth(
        spares.map((x) => [x, HOLE_Y]),
        P,
      ).map(([x]) => sparePlug(x)),
      ...CORDS.map(cord),
    ],
  };
}
