/*
 * "Billing": plans, credits and invoices, drawn as a receipt printer. A strip
 * of receipt feeds out of the slot on its lid, arcs over the tear bar and drapes
 * down the front onto the bench; its status lamp is the one lit part. A spare
 * paper roll stands beside it and a payment card lies in front.
 */

import {
  benchPlate,
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

const PLATE = { x: -84, y: -62, w: 176, d: 112, r: 8 };
const BODY = { x: -60, y: -48, w: 66, d: 60, r: 6 };
const BODY_H = 30;
const SLOT_Y = 4;
const STRIP = {
  x0: -46,
  x1: -12,
  rise: 10,
  arc: 6,
  bend: 4,
  end: 44,
  teeth: 7,
};
const LIFT = 0.3;
const ROLL = { x: 52, y: -30, r: 11, h: 18 };
const CARD = { x: 24, y: 2, w: 46, d: 30, r: 3 };
const RULES = [22, 14, 26, 10, 18, 26, 12, 20];

const STRIP_TOP = BODY_H + STRIP.rise + STRIP.arc;
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [STRIP.x0, SLOT_Y, STRIP_TOP + 2],
    [BODY.x, BODY.y, BODY_H + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);
const { sinA, cosA } = k.cameraOf(P);

/** The kit's fill class for a face with this normal: top or a side shade. */
function paintOf([nx, ny, nz]) {
  if (nz > 0.6) {
    return 'class="iso-top"';
  }
  const across = Math.hypot(nx, ny) || 1;
  const light = ((nx * -sinA + ny * cosA) / across + 1) / 2;
  const shade = nz < -0.3 ? 0 : Math.min(3, Math.floor(light * 4));
  return `class="iso-shade" data-shade="${shade}"`;
}

/** Appends `steps` points of an arc about `centre` from angle a0 to a1. */
function arcInto(out, centre, radius, a0, a1, steps) {
  for (let i = 1; i <= steps; i++) {
    const angle = a0 + ((a1 - a0) * i) / steps;
    out.push([
      centre[0] + radius * Math.cos(angle),
      centre[1] + radius * Math.sin(angle),
    ]);
  }
}

/**
 * The strip's centre line as [y, z] points, back to front: up out of the slot,
 * over the tear bar, down the front of the printer and out along the bench.
 */
function stripPath() {
  const { rise, arc, bend, end } = STRIP;
  const top = BODY_H + rise;
  const hang = SLOT_Y + arc * 2;
  const out = [
    [SLOT_Y, BODY_H],
    [SLOT_Y, top],
  ];
  arcInto(out, [SLOT_Y + arc, top], arc, Math.PI, 0, 14);
  for (let z = top - 4; z > bend + LIFT; z -= 4) {
    out.push([hang, z]);
  }
  arcInto(out, [hang + bend, bend + LIFT], bend, Math.PI, Math.PI * 1.5, 8);
  for (let y = hang + bend + 4; y < end; y += 4) {
    out.push([y, LIFT]);
  }
  out.push([end, LIFT]);
  return out;
}

/** The torn end of the strip: a zigzag of teeth past its last edge. */
function tornEnd() {
  const { x0, x1, end, teeth } = STRIP;
  const step = (x1 - x0) / teeth;
  const edge = [];
  for (let i = 0; i <= teeth * 2; i++) {
    edge.push([x0 + (step * i) / 2, end + (i % 2 ? 1.6 : 0), LIFT]);
  }
  const shape = edge.map(at);
  return [
    `<path class="iso-top" d="${k.pathOf(shape, true)}"/>`,
    line(k.pathOf(shape), { tone: "mid" }),
  ].join("");
}

/**
 * The receipt as thin quads swept across x and painted in path order (the
 * path runs back to front), with side edges, printed rules on the hanging and
 * flat runs, and fold lines where the visible side changes.
 */
function receipt() {
  const { x0, x1 } = STRIP;
  const path = stripPath();
  const corner = (x, [y, z]) => at([x, y, z]);
  const out = [];
  let facing = null;
  let ruled = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [ay, az] = path[i];
    const [by, bz] = path[i + 1];
    const length = Math.hypot(by - ay, bz - az) || 1;
    const across = [0, (bz - az) / length, -(by - ay) / length];
    const front = k.depthOf(across, P) > 0;
    const normal = front ? across : across.map((c) => -c);
    const marks = [
      k.segment([x0, ay, az], [x0, by, bz], P),
      k.segment([x1, ay, az], [x1, by, bz], P),
    ];
    if (facing !== null && facing !== front) {
      marks.push(k.segment([x0, ay, az], [x1, ay, az], P));
    }
    facing = front;
    const rules = [];
    const straight = Math.abs(by - ay) < 1e-6 || Math.abs(bz - az) < 1e-6;
    if (straight && i > 2 && ruled < RULES.length) {
      const [ny, nz] = [normal[1] * 0.1, normal[2] * 0.1];
      const y = (ay + by) / 2 + ny;
      const z = (az + bz) / 2 + nz;
      const width = RULES[ruled++];
      rules.push(k.segment([x0 + 4, y, z], [x0 + 4 + width, y, z], P));
    }
    out.push(
      `<path ${paintOf(normal)} d="${k.pathOf([corner(x0, path[i]), corner(x1, path[i]), corner(x1, path[i + 1]), corner(x0, path[i + 1])], true)}"/>`,
      line(rules.join(""), { tone: "lo" }),
      line(marks.join(""), { tone: "mid" }),
    );
  }
  const start = path[0];
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x0, y: SLOT_Y + STRIP.arc * 2, w: x1 - x0, d: STRIP.end - SLOT_Y - STRIP.arc * 2, r: 1 }, 0, 0.1, P)}" style="filter:blur(3px)"/>`,
    `<g class="iso-solid" data-seamless="">${out.join("")}${line(k.segment([x0, ...start], [x1, ...start], P), { tone: "mid" })}${tornEnd()}</g>`,
  ].join("");
}

function printer() {
  const body = k.insetPlan(BODY, 1.5);
  const slot = {
    x: STRIP.x0 - 3,
    y: SLOT_Y - 2.5,
    w: STRIP.x1 - STRIP.x0 + 6,
    d: 5,
    r: 1.5,
  };
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BODY, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(BODY, 0, 4, P, 6, 0.6), { tone: "lo" }),
    solid(k.slabOf(body, 4, BODY_H - 4, P, 6, 1), { tone: "mid" }),
    line(k.sideSeam(body, BODY_H - 9, P, 6), { tone: "faint" }),
    line(k.planOutline(k.insetPlan(body, 4), BODY_H, P, 4), { tone: "faint" }),
    solid(k.slabOf(slot, BODY_H - 0.6, 0.6, P, 3), {
      tone: "lo",
      crease: "none",
    }),
    // The serrated tear bar just in front of the slot.
    solid(
      k.slabOf(
        { x: slot.x, y: SLOT_Y + 3, w: slot.w, d: 3, r: 1 },
        BODY_H,
        1.2,
        P,
        2,
      ),
      { tone: "mid" },
    ),
  ];
  const teeth = k.topTicks(
    slot.x + 2,
    slot.x + slot.w - 2,
    2,
    1000,
    SLOT_Y + 6,
    BODY_H + 1.2,
    [1.2, 1.2],
    P,
  );
  out.push(line(teeth.minor, { tone: "lo" }));
  // Vents on the right flank and the lid controls at the back.
  const flank = BODY.x + BODY.w - 1.5;
  for (let i = 0; i < 6; i++) {
    const y = BODY.y + 10 + i * 3.6;
    out.push(line(k.segment([flank, y, 8], [flank, y, 19], P), { tone: "lo" }));
  }
  out.push(
    knob([BODY.x + 14, BODY.y + 12], BODY_H, P, { radius: 4.2, height: 3 }),
    lamp([BODY.x + 28, BODY.y + 12], BODY_H, P, { lit: true, radius: 2.4 }),
    screws(
      k.corners(body, 3.5).filter(([, y]) => y < 0),
      BODY_H,
      P,
      1.1,
    ),
  );
  return out.join("");
}

/** A spare paper roll standing on end, with its core and the paper's loose end. */
function roll() {
  const { x, y, r, h } = ROLL;
  const seam = Math.PI * 0.3;
  const edge = [x + r * Math.cos(seam), y + r * Math.sin(seam)];
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: x - r, y: y - r, w: r * 2, d: r * 2, r }, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.cylinder(x, y, r, 0, h, P, 36), { tone: "mid" }),
    line(k.onTop(k.circleRing(x, y, r * 0.66, 32), h, P, true), {
      tone: "faint",
    }),
    `<path class="iso-shade" data-shade="0" d="${k.onTop(k.circleRing(x, y, r * 0.3, 20), h, P, true)}"/>`,
    line(k.onTop(k.circleRing(x, y, r * 0.3, 20), h, P, true), { tone: "lo" }),
    line(k.segment([...edge, 0.6], [...edge, h - 0.6], P), { tone: "lo" }),
  ].join("");
}

/** A payment card lying flat: a chip and the stripe of embossed digits. */
function card() {
  const top = 1.2;
  const chip = { x: CARD.x + 6, y: CARD.y + 8, w: 9, d: 7, r: 1.2 };
  return [
    `<path class="iso-halo" d="${k.haloOf(CARD, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(CARD, 0, top, P, 3), { tone: "mid" }),
    line(k.planOutline(chip, top, P, 2), { tone: "mid" }),
    line(
      [
        k.lineOnTop(
          [chip.x + 4.5, chip.y],
          [chip.x + 4.5, chip.y + chip.d],
          top,
          P,
        ),
        k.lineOnTop(
          [chip.x, chip.y + 3.5],
          [chip.x + chip.w, chip.y + 3.5],
          top,
          P,
        ),
      ].join(""),
      { tone: "lo" },
    ),
    line(
      [0, 10, 20, 30]
        .map((dx) =>
          k.lineOnTop(
            [CARD.x + 6 + dx, CARD.y + 20],
            [CARD.x + 13 + dx, CARD.y + 20],
            top,
            P,
          ),
        )
        .join(""),
      { tone: "lo" },
    ),
  ].join("");
}

export function figure() {
  return {
    label:
      "A receipt printer on a bench plate feeding a printed receipt strip over its tear bar and down onto the bench, with a lit status lamp, beside a spare paper roll and a payment card.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: -2, y: PLATE.y + PLATE.d - 13, w: 84, d: 7, r: 1 }, P),
      roll(),
      printer(),
      receipt(),
      card(),
    ],
  };
}
