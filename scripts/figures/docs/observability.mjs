/*
 * "Observability": see what a running system actually did, drawn as a bench
 * oscilloscope. Two probes resting on a small board feed the scope, whose lit
 * screen (the one lit part) draws the signal over a graticule, beside a printed
 * log on the bench.
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
export const HEIGHT = 420;

const PLATE = { x: -110, y: -64, w: 186, d: 162, r: 8 };
const BODY = { x: -96, y: -52, w: 118, d: 52, r: 3 };
const BODY_H = 62;
const DECK = { x: -96, y: 0, w: 118, d: 26, r: 3 };
const DECK_H = 14;
const SCREEN = { x0: -86, x1: -20, z0: DECK_H + 8, z1: BODY_H - 7 };
const GLASS = 1.4;
const HANDLE_H = 8;
const BOARD = { x: -18, y: 62, w: 76, d: 26, r: 2 };
const BOARD_Z = 4;
const PROBES = [-4, 14];
const PROBE_Y = 31;
const PROBE_LEN = 23;
const LOG = { x: 36, y: 14, w: 30, d: 40, r: 0.6 };

const flank = BODY.x + BODY.w;
const face = BODY.y + BODY.d;
const deckFront = DECK.y + DECK.d;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [BODY.x, BODY.y, BODY_H + HANDLE_H + 2],
    [flank, BODY.y, BODY_H + HANDLE_H + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

/** A closed outline on the vertical plane `y` between x0..x1 and z0..z1. */
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

function body() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ ...BODY, d: BODY.d + DECK.d }, 0, 0.1, P)}" style="filter:blur(6px)"/>`,
    solid(k.slabOf(BODY, 0, BODY_H, P, 4, 1), { tone: "mid" }),
    line(k.sideSeam(BODY, 6, P, 4), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(BODY, 5), BODY_H, P, 3), { tone: "faint" }),
    screws(k.corners(BODY, 3.5), BODY_H, P, 1.2),
  ];
  // Cooling slots on the right flank.
  const slots = [];
  for (let i = 0; i < 9; i++) {
    const y = BODY.y + 10 + i * 3.6;
    slots.push(k.segment([flank, y, 24], [flank, y, BODY_H - 12], P));
  }
  out.push(line(slots.join(""), { tone: "lo" }));
  return out.join("");
}

/** A carrying handle on two blocks along the top of the case. */
function handle() {
  const y = BODY.y + 12;
  const out = [];
  for (const x of [BODY.x + 18, flank - 26]) {
    out.push(
      solid(
        k.slabOf({ x, y: y - 1, w: 8, d: 8, r: 1 }, BODY_H, HANDLE_H, P, 2),
        {
          tone: "mid",
        },
      ),
    );
  }
  out.push(
    solid(
      k.slabOf(
        { x: BODY.x + 16, y, w: flank - BODY.x - 32, d: 6, r: 3 },
        BODY_H + HANDLE_H - 3,
        3,
        P,
        4,
      ),
      { tone: "mid" },
    ),
  );
  return out.join("");
}

/** The lit screen, its bezel, the graticule and two traces. */
function screen() {
  const { x0, x1, z0, z1 } = SCREEN;
  const glass = face + GLASS;
  const out = [
    line(faceRect(x0 - 4, x1 + 4, z0 - 4, z1 + 4, face), { tone: "lo" }),
    solid(
      k.slabOf(
        { x: x0, y: face, w: x1 - x0, d: GLASS, r: 0 },
        z0,
        z1 - z0,
        P,
        1,
      ),
      { tone: "hi", lit: true, crease: "lo" },
    ),
  ];
  const grid = [];
  const columns = 8;
  const rows = 6;
  for (let i = 1; i < columns; i++) {
    const x = x0 + ((x1 - x0) * i) / columns;
    grid.push(k.segment([x, glass, z0 + 1], [x, glass, z1 - 1], P));
  }
  for (let i = 1; i < rows; i++) {
    const z = z0 + ((z1 - z0) * i) / rows;
    grid.push(k.segment([x0 + 1, glass, z], [x1 - 1, glass, z], P));
  }
  out.push(line(grid.join(""), { tone: "faint", free: true }));
  const mid = (z0 + z1) / 2;
  out.push(
    line(
      k.segment([x0 + 1, glass, mid], [x1 - 1, glass, mid], P) +
        k.segment(
          [(x0 + x1) / 2, glass, z0 + 1],
          [(x0 + x1) / 2, glass, z1 - 1],
          P,
        ),
      { tone: "lo", free: true },
    ),
  );
  // Channel one: a ringing burst that settles. Channel two: a pulse train.
  const steps = 72;
  const ring = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const settle = t < 0.18 ? 0 : Math.exp(-3.2 * (t - 0.18));
    const swing = Math.sin((t - 0.18) * Math.PI * 2 * 4.5) * 9 * settle;
    return at([x0 + 2 + t * (x1 - x0 - 4), glass, mid + 6 + swing]);
  });
  out.push(line(k.pathOf(ring), { tone: "hi", free: true }));
  const low = z0 + 5;
  const pulses = [];
  let level = low;
  for (let i = 0; i <= 8; i++) {
    const x = x0 + 2 + (i * (x1 - x0 - 4)) / 8;
    pulses.push([x, level]);
    level = i % 2 === 0 ? low + 5 : low;
    if (i < 8) {
      pulses.push([x, level]);
    }
  }
  out.push(
    line(k.pathOf(pulses.map(([x, z]) => at([x, glass, z]))), {
      tone: "mid",
      free: true,
    }),
  );
  return out.join("");
}

/** Soft keys beside the screen and two small trim rings. */
function faceControls() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const z = SCREEN.z1 - 6 - i * 9;
    out.push(
      solid(
        k.slabOf(
          { x: SCREEN.x1 + 8, y: face, w: 7, d: 1.6, r: 0.4 },
          z,
          4,
          P,
          1,
        ),
        {
          tone: "mid",
        },
      ),
    );
  }
  for (const z of [SCREEN.z1 - 6, SCREEN.z0 + 8]) {
    const centre = [flank - 14, face, z];
    out.push(
      line(k.sideRing(centre, 5, "y", P, 28), { tone: "mid" }),
      line(k.sideRing(centre, 2.6, "y", P, 20), { tone: "lo" }),
    );
  }
  return out.join("");
}

/** The control deck in front of the screen: knobs, a lamp and probe jacks. */
function deck() {
  const top = DECK_H;
  const out = [
    solid(k.slabOf(DECK, 0, DECK_H, P, 4, 0.8), { tone: "mid" }),
    line(k.sideSeam(DECK, 6, P, 4), { tone: "faint" }),
  ];
  const knobs = [-80, -60, -40, -20].map((x) => [x, DECK.y + 12]);
  for (const point of byDepth(knobs, P, top)) {
    out.push(knob(point, top, P, { radius: 4.6, height: 4 }));
  }
  out.push(lamp([-4, DECK.y + 7], top, P));
  for (const x of PROBES) {
    out.push(jack([x, DECK.y + 18], top, P));
  }
  return out.join("");
}

/** The board under test on four standoffs, with two chips and pads. */
function board() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BOARD, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(BOARD, 4), P)) {
    out.push(
      solid(k.cylinder(x, y, 1.8, 0, BOARD_Z - 1.6, P, 14), { tone: "lo" }),
    );
  }
  const top = BOARD_Z;
  out.push(
    solid(k.slabOf(BOARD, BOARD_Z - 1.6, 1.6, P, 3), { tone: "mid" }),
    screws(k.corners(BOARD, 4), top, P, 1),
  );
  const chips = [
    { x: BOARD.x + 26, y: BOARD.y + 13, w: 16, d: 8, r: 0.6 },
    { x: BOARD.x + 50, y: BOARD.y + 6, w: 18, d: 12, r: 0.6 },
  ];
  for (const chip of chips) {
    const pins = [chip.y - 1.8, chip.y + chip.d].map((edge) =>
      k.topTicks(
        chip.x + 2,
        chip.x + chip.w - 2,
        2.5,
        99,
        edge,
        top,
        [1.8, 1.8],
        P,
      ),
    );
    out.push(
      line(pins.map(({ minor, major }) => minor + major).join(""), {
        tone: "lo",
      }),
      solid(k.slabOf(chip, top, 2.4, P, 2), { tone: "lo" }),
    );
  }
  const pad = BOARD.y + 6;
  out.push(
    dots(
      PROBES.map((x) => at([x, pad, top])),
      { size: 1.1, tone: "lo" },
    ),
    line(
      k.onTop(
        [
          [PROBES[0], pad],
          [PROBES[0], BOARD.y + 17],
          [BOARD.x + 26, BOARD.y + 17],
        ],
        top,
        P,
      ) +
        k.onTop(
          [
            [PROBES[1], pad],
            [BOARD.x + 50, pad],
          ],
          top,
          P,
        ),
      { tone: "faint" },
    ),
  );
  return out.join("");
}

/** A probe pen lying on the bench, its tip resting on a pad of the board. */
function probe(x) {
  const y0 = PROBE_Y;
  const y1 = y0 + PROBE_LEN;
  return [
    solid(
      k.slabOf({ x: x - 3, y: y0, w: 6, d: PROBE_LEN, r: 3 }, 0, 5, P, 4, 0.4),
      {
        tone: "mid",
      },
    ),
    line(k.planOutline({ x: x - 3, y: y0 + 15, w: 6, d: 3, r: 0 }, 5, P, 1), {
      tone: "lo",
    }),
    solid(k.slabOf({ x: x - 1.8, y: y1, w: 3.6, d: 4, r: 1.8 }, 1, 3, P, 3), {
      tone: "mid",
    }),
    line(k.segment([x, y1 + 4, 2.6], [x, BOARD.y + 6, BOARD_Z + 0.2], P), {
      tone: "hi",
    }),
  ].join("");
}

/** A printed log on the bench: two sheets with ruled entry lines. */
function log() {
  const under = { ...LOG, x: LOG.x + 3, y: LOG.y - 3 };
  const out = [
    `<path class="iso-halo" d="${k.haloOf(LOG, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(under, 0, 0.8, P, 1), { tone: "lo", crease: "none" }),
    solid(k.slabOf(LOG, 0.8, 0.8, P, 1), { tone: "mid", crease: "none" }),
  ];
  const rules = [];
  for (const [i, width] of [22, 16, 20, 12, 18, 22, 14].entries()) {
    const y = LOG.y + 6 + i * 4.6;
    rules.push(k.lineOnTop([LOG.x + 4, y], [LOG.x + 4 + width, y], 1.6, P));
  }
  out.push(line(rules.join(""), { tone: "faint" }));
  return out.join("");
}

/** Probe leads: from each jack down the deck front into a probe's tail. */
function leads() {
  return PROBES.map((x, i) =>
    cable(
      [x, DECK.y + 18, DECK_H],
      [x, PROBE_Y, 2.5],
      [
        [x, deckFront + 1, DECK_H - 3],
        [x, deckFront + 3, 0.8],
      ],
      P,
      { tone: "mid", flow: i === 0 },
    ),
  ).join("");
}

export function figure() {
  return {
    label:
      "A bench oscilloscope with a lit screen showing a ringing trace and a pulse train over a grid, its two probes resting on a small circuit board beside a printed log sheet.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -96, y: PLATE.y + PLATE.d - 16, w: 64, d: 7, r: 1 }, P),
      body(),
      handle(),
      screen(),
      faceControls(),
      deck(),
      log(),
      board(),
      leads(),
      ...byDepth(
        PROBES.map((x) => [x, PROBE_Y]),
        P,
      ).map(([x]) => probe(x)),
    ],
  };
}
