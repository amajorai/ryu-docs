/*
 * "Programs": invites, referrals and partner programs, drawn as a ticket
 * dispenser. A roll of tickets turns between two cheeks on a base, its strip
 * runs under a tear bar and out across the bench; one ticket lies torn off and
 * a short stack waits beside it. The dispenser's lamp is the one lit part.
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
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -94, y: -64, w: 170, d: 124, r: 8 };
const BASE = { x: -80, y: -52, w: 80, d: 54, r: 5 };
const BASE_H = 10;
const POST = { d: 9, t: 4 };
const POST_X = [-74, -18];
const ROLL = { x0: -68, x1: -20, y: -27, z: 33, r: 18, core: 5 };
const STRIP = { x0: -63, x1: -25, end: 50, pitch: 16 };
const TICKET = { w: STRIP.x1 - STRIP.x0, d: STRIP.pitch, notch: 3 };
const LOOSE = { x: 30, y: 30, turn: 0.38 };
const STACK = { x: 40, y: -22, turn: -0.2, count: 4 };
const FLAT_Z = 0.4;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [ROLL.x0, ROLL.y - ROLL.r, ROLL.z + ROLL.r + 2],
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

/** The roll lying along x between the posts, its wound face on the near end. */
function roll() {
  const { x0, x1, y, z, r, core } = ROLL;
  const ring = k.circleRing(y, z, r, 40);
  const faces = [];
  const edges = [];
  const facing = ring.map(([ay, az], i) => {
    const [by, bz] = ring[(i + 1) % ring.length];
    return k.depthOf([0, (ay + by) / 2 - y, (az + bz) / 2 - z], P) > 0;
  });
  for (const [i, [ay, az]] of ring.entries()) {
    const [by, bz] = ring[(i + 1) % ring.length];
    const normal = [0, (ay + by) / 2 - y, (az + bz) / 2 - z];
    if (facing[i]) {
      faces.push(
        `<path ${paintOf(normal)} d="${k.pathOf([at([x0, ay, az]), at([x1, ay, az]), at([x1, by, bz]), at([x0, by, bz])], true)}"/>`,
      );
      // The back rim of a face turned to the viewer is on the silhouette.
      edges.push(k.segment([x0, ay, az], [x0, by, bz], P));
    }
    if (facing[i] !== facing.at(i - 1)) {
      edges.push(k.segment([x0, ay, az], [x1, ay, az], P));
    }
  }
  const back = ring.map(([cy, cz]) => at([x0, cy, cz]));
  const front = ring.map(([cy, cz]) => at([x1, cy, cz]));
  return [
    `<g class="iso-solid" data-seamless=""><path class="iso-fill" d="${k.pathOf(back, true)}${k.pathOf(front, true)}"/>${faces.join("")}<path class="iso-shade" data-shade="1" d="${k.pathOf(front, true)}"/></g>`,
    line(k.pathOf(front, true) + edges.join(""), { tone: "mid" }),
    line(
      [0.82, 0.64, 0.46]
        .map((share) => k.sideRing([x1, y, z], r * share, "x", P, 32))
        .join(""),
      { tone: "faint" },
    ),
    line(k.sideRing([x1, y, z], core, "x", P, 20), { tone: "lo" }),
  ].join("");
}

/** One post standing on the base, carrying the axle on a boss at its head. */
function post(x) {
  const plan = { x, y: ROLL.y - POST.d / 2, w: POST.t, d: POST.d, r: 1.2 };
  const face = x + POST.t;
  return [
    solid(k.slabOf(plan, BASE_H, ROLL.z + 4 - BASE_H, P, 3, 0.4), {
      tone: "mid",
    }),
    line(k.sideRing([face, ROLL.y, ROLL.z], 2.6, "x", P, 20), { tone: "lo" }),
    dots([at([face, ROLL.y, ROLL.z])], { size: 0.7 }),
  ].join("");
}

function base() {
  return [
    `<path class="iso-halo" d="${k.haloOf(BASE, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(BASE, 0, 3, P, 5, 0.5), { tone: "lo" }),
    solid(k.slabOf(k.insetPlan(BASE, 1.5), 3, BASE_H - 3, P, 5, 0.8), {
      tone: "mid",
    }),
    line(k.planOutline(k.insetPlan(BASE, 5), BASE_H, P, 3), { tone: "faint" }),
    screws(k.corners(BASE, 5), BASE_H, P, 1.1),
    lamp([-8, -42], BASE_H, P, { lit: true, radius: 2.4 }),
    knob([-8, -26], BASE_H, P, { radius: 3.6, height: 3.5 }),
  ].join("");
}

/** The strip's centre line as [y, z] points: down the roll, over the lip, out. */
function stripPath() {
  const top = BASE_H + 0.4;
  const lip = BASE.y + BASE.d;
  const out = [];
  // Hug the top-front of the roll before peeling away down its face.
  for (let i = 0; i < 8; i++) {
    const angle = 1.3 - (i / 8) * 1.3;
    out.push([
      ROLL.y + (ROLL.r + 0.3) * Math.cos(angle),
      ROLL.z + (ROLL.r + 0.3) * Math.sin(angle),
    ]);
  }
  for (let z = ROLL.z; z > top + 3; z -= 3) {
    out.push([ROLL.y + ROLL.r + 0.3, z]);
  }
  for (let i = 0; i <= 6; i++) {
    const angle = Math.PI + (i / 6) * (Math.PI / 2);
    out.push([
      ROLL.y + ROLL.r + 3 + 3 * Math.cos(angle),
      top + 3 + 3 * Math.sin(angle),
    ]);
  }
  for (let i = 0; i <= 8; i++) {
    const angle = Math.PI / 2 - (i / 8) * (Math.PI / 2);
    const bend = top - FLAT_Z;
    out.push([lip + bend * Math.cos(angle), FLAT_Z + bend * Math.sin(angle)]);
  }
  out.push([STRIP.end, FLAT_Z]);
  return out;
}

/** The ticket strip as thin quads swept across x, painted back to front. */
function strip() {
  const { x0, x1 } = STRIP;
  const path = stripPath();
  const quads = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [ay, az] = path[i];
    const [by, bz] = path[i + 1];
    const length = Math.hypot(by - ay, bz - az) || 1;
    const outer = [0, (bz - az) / length, -(by - ay) / length];
    const normal = k.depthOf(outer, P) > 0 ? outer : outer.map((c) => -c);
    const corner = (x, [y, z]) => at([x, y, z]);
    quads.push({
      depth: k.depthOf([0, (ay + by) / 2, (az + bz) / 2], P),
      svg: [
        `<path ${paintOf(normal)} d="${k.pathOf([corner(x0, path[i]), corner(x1, path[i]), corner(x1, path[i + 1]), corner(x0, path[i + 1])], true)}"/>`,
        line(
          k.segment([x0, ay, az], [x0, by, bz], P) +
            k.segment([x1, ay, az], [x1, by, bz], P),
          { tone: "mid" },
        ),
      ].join(""),
    });
  }
  const end = path.at(-1);
  quads.sort((a, b) => a.depth - b.depth);
  return `<g class="iso-solid" data-seamless="">${quads.map((quad) => quad.svg).join("")}${line(k.segment([x0, end[0], end[1]], [x1, end[0], end[1]], P), { tone: "mid" })}</g>`;
}

/** Perforations and punch holes on the flat run of the strip. */
function stripMarks() {
  const out = [];
  const holes = [];
  const lip = BASE.y + BASE.d + BASE_H;
  for (let y = lip + STRIP.pitch; y < STRIP.end - 2; y += STRIP.pitch) {
    out.push(k.lineOnTop([STRIP.x0, y], [STRIP.x1, y], FLAT_Z, P));
    holes.push(k.ring(STRIP.x1 - 6, y - STRIP.pitch / 2, 1.6, FLAT_Z, P, 16));
  }
  return [
    line(out.join(""), { tone: "lo", dotted: true }),
    line(holes.join(""), { tone: "lo" }),
  ].join("");
}

/** The serrated tear bar across the front lip of the base. */
function tearBar() {
  const bar = {
    x: STRIP.x0 - 4,
    y: BASE.y + BASE.d - 3,
    w: STRIP.x1 - STRIP.x0 + 8,
    d: 3,
    r: 1,
  };
  const teeth = k.topTicks(
    bar.x + 2,
    bar.x + bar.w - 2,
    2,
    1000,
    bar.y + bar.d,
    BASE_H + 1.8,
    [1.2, 1.2],
    P,
  );
  return [
    solid(k.slabOf(bar, BASE_H + 0.4, 1.4, P, 2), { tone: "mid" }),
    line(teeth.minor, { tone: "lo" }),
  ].join("");
}

/** A ticket outline with concave notched corners, centred and turned. */
function ticketRing({ x, y, turn }) {
  const { w, d, notch } = TICKET;
  const points = [];
  // Walk the corners in order; each notch sweeps a quarter turn inwards.
  const corners = [
    [w / 2, -d / 2, Math.PI],
    [w / 2, d / 2, -Math.PI / 2],
    [-w / 2, d / 2, 0],
    [-w / 2, -d / 2, Math.PI / 2],
  ];
  for (const [cx, cy, from] of corners) {
    for (let i = 0; i <= 4; i++) {
      const angle = from - (i / 4) * (Math.PI / 2);
      points.push([cx + notch * Math.cos(angle), cy + notch * Math.sin(angle)]);
    }
  }
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return points.map(([px, py]) => [
    x + px * cos - py * sin,
    y + px * sin + py * cos,
  ]);
}

/** A single loose ticket: notched body, a stub perforation and a punch hole. */
function ticket(spec, z, { punched = false } = {}) {
  const local = (px, py) => {
    const cos = Math.cos(spec.turn);
    const sin = Math.sin(spec.turn);
    return [spec.x + px * cos - py * sin, spec.y + px * sin + py * cos];
  };
  const top = z + 0.7;
  const stub = TICKET.w / 2 - 9;
  const out = [
    solid(k.extrude(ticketRing(spec), z, 0.7, P, { convex: false }), {
      tone: "mid",
    }),
    line(
      k.onTop([local(stub, -TICKET.d / 2), local(stub, TICKET.d / 2)], top, P),
      {
        tone: "lo",
        dotted: true,
      },
    ),
    line(
      k.onTop([local(-TICKET.w / 2 + 6, -2), local(4, -2)], top, P) +
        k.onTop([local(-TICKET.w / 2 + 6, 2), local(-2, 2)], top, P),
      { tone: "faint" },
    ),
  ];
  if (punched) {
    const [hx, hy] = local(stub + 4.5, 0);
    out.push(line(k.ring(hx, hy, 1.6, top, P, 16), { tone: "lo" }));
  }
  return out.join("");
}

function stack() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: STACK.x - 20, y: STACK.y - 12, w: 40, d: 24, r: 6 }, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
  ];
  for (let i = 0; i < STACK.count; i++) {
    out.push(
      ticket(
        {
          x: STACK.x + i * 0.8,
          y: STACK.y - i * 0.6,
          turn: STACK.turn + i * 0.04,
        },
        i * 0.9,
      ),
    );
  }
  return out.join("");
}

export function figure() {
  return {
    label:
      "A ticket dispenser on a bench plate: a roll of tickets turns between two cheeks and feeds a perforated strip under a tear bar and across the bench, beside a torn-off ticket, a short stack and a lit lamp.",
    body: [
      benchPlate(PLATE, P),
      rulerStrip({ x: 8, y: PLATE.y + 9, w: 56, d: 6, r: 1 }, P),
      stack(),
      base(),
      post(POST_X[0]),
      roll(),
      post(POST_X[1]),
      strip(),
      stripMarks(),
      tearBar(),
      ticket(LOOSE, 0, { punched: true }),
    ],
  };
}
