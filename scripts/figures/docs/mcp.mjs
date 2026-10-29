/*
 * "MCP": one standard connector between Ryu and every tool server, drawn as a
 * connector hub. A long block on a bench plate carries a row of identical
 * sockets; identical plugs sit in them, their leads fanning out across the
 * plate to a ring of small server boxes, and one plug (the lit part) is caught
 * just before it seats, its pins showing.
 */

import {
  benchPlate,
  byDepth,
  cable,
  k,
  line,
  screws,
  solid,
} from "../parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;

const PLATE = { x: -64, y: -84, w: 136, d: 168, r: 8 };
const HUB = { x: -52, y: -56, w: 26, d: 112, r: 4 };
const HUB_H = 28;
const FACE = HUB.x + HUB.w;
const SOCKET_Z = 14;
const SOCKETS = [-40, -20, 0, 20, 40];
const PULLED = 3;
const GAP = 12;
const PLUG = { length: 13, half: 5, height: 9, relief: 6 };
const FAN = { radius: 102, spread: 21, stretch: 1.08 };
const BOX = { w: 18, d: 16, h: 12 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [HUB.x, HUB.y, HUB_H + 2]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (point) => k.iso(point, P);

const box = (x0, x1, y0, y1, z0, z1, r = 0.8) =>
  k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 2);

/** A closed outline on the hub's face between y0..y1 and z0..z1. */
const faceRect = (y0, y1, z0, z1, x = FACE) =>
  k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map(at),
    true,
  );

/** Where each server box sits, fanned around the hub on an arc. */
const servers = SOCKETS.map((_, i) => {
  const angle = ((i - (SOCKETS.length - 1) / 2) * FAN.spread * Math.PI) / 180;
  return [
    HUB.x + Math.cos(angle) * FAN.radius,
    Math.sin(angle) * FAN.radius * FAN.stretch,
  ];
});

function hub() {
  const top = k.insetPlan(HUB, 4);
  const out = [
    `<path class="iso-halo" d="${k.haloOf(HUB, 0, 0.1, P)}" style="filter:blur(5px)"/>`,
    solid(k.slabOf(HUB, 0, 4, P, 4, 0.6), { tone: "lo" }),
    solid(k.slabOf(k.insetPlan(HUB, 1.5), 4, HUB_H - 4, P, 4, 0.8), {
      tone: "mid",
    }),
    line(k.planOutline(top, HUB_H, P, 3), { tone: "faint" }),
    screws(k.corners(top, 3), HUB_H, P, 1.2),
  ];
  for (let i = 0; i < 9; i++) {
    const y = -32 + i * 8;
    out.push(
      line(k.lineOnTop([top.x + 5, y], [top.x + top.w - 5, y], HUB_H, P), {
        tone: "lo",
      }),
    );
  }
  out.push(
    line(faceRect(HUB.y + 6, HUB.y + HUB.d - 6, 7, HUB_H - 5, FACE - 1.5), {
      tone: "faint",
    }),
  );
  for (const y of SOCKETS) {
    const socket = faceRect(
      y - 6.5,
      y + 6.5,
      SOCKET_Z - 5.5,
      SOCKET_Z + 5.5,
      FACE - 1.5,
    );
    out.push(
      `<path class="iso-shade" data-shade="0" d="${socket}"/>`,
      line(socket, { tone: "lo" }),
      line(
        [-2.5, 2.5]
          .map((dy) =>
            k.segment(
              [FACE - 1.5, y + dy, SOCKET_Z - 2],
              [FACE - 1.5, y + dy, SOCKET_Z + 2],
              P,
            ),
          )
          .join(""),
        { tone: "mid" },
      ),
    );
  }
  return out.join("");
}

/** A plug: a gripped body, a strain relief, and (when pulled) its pins. */
function plug(y, { pulled = false } = {}) {
  const x0 = FACE - 1.5 + (pulled ? GAP : 0);
  const x1 = x0 + PLUG.length;
  const z0 = SOCKET_Z - PLUG.height / 2;
  const z1 = SOCKET_Z + PLUG.height / 2;
  const tone = pulled ? "hi" : "mid";
  const out = [];
  if (pulled) {
    for (const dy of [-2.5, 2.5]) {
      out.push(
        solid(
          box(
            FACE - 1,
            x0,
            y + dy - 0.5,
            y + dy + 0.5,
            SOCKET_Z - 1.6,
            SOCKET_Z + 1.6,
            0.2,
          ),
          {
            tone: "mid",
          },
        ),
      );
    }
  }
  out.push(
    solid(box(x0, x1, y - PLUG.half, y + PLUG.half, z0, z1, 1.6), {
      tone,
      lit: pulled,
    }),
    line(
      [4, 6.5, 9]
        .map((dx) =>
          k.lineOnTop(
            [x0 + dx, y - PLUG.half + 1.5],
            [x0 + dx, y + PLUG.half - 1.5],
            z1,
            P,
          ),
        )
        .join(""),
      { tone: "lo" },
    ),
    solid(
      box(
        x1,
        x1 + PLUG.relief,
        y - 2.6,
        y + 2.6,
        SOCKET_Z - 2.6,
        SOCKET_Z + 2.6,
        1.2,
      ),
      {
        tone: "lo",
      },
    ),
  );
  return out.join("");
}

function leads() {
  return SOCKETS.map((y, i) => {
    const pulled = i === PULLED;
    const start = FACE - 1.5 + (pulled ? GAP : 0) + PLUG.length + PLUG.relief;
    const [sx, sy] = servers[i];
    return cable(
      [start, y, SOCKET_Z],
      [sx - BOX.w / 2 + 2, sy, 3],
      [
        [start + 4, y, 0.8],
        [start + 14, y, 0.8],
        [sx - BOX.w / 2 - 6, sy, 0.8],
      ],
      P,
      { tone: "mid", ends: "from" },
    );
  }).join("");
}

/** A small tool server: a box with a seam, vents and a jack on its lid. */
function server([x, y]) {
  const plan = { x: x - BOX.w / 2, y: y - BOX.d / 2, w: BOX.w, d: BOX.d, r: 2 };
  return [
    `<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(4px)"/>`,
    solid(k.slabOf(plan, 0, BOX.h, P, 3, 0.6), { tone: "mid" }),
    line(k.sideSeam(plan, 4, P, 3), { tone: "faint" }),
    line(
      [0, 1, 2]
        .map((i) =>
          k.lineOnTop(
            [plan.x + 4 + i * 3, plan.y + 4],
            [plan.x + 4 + i * 3, plan.y + 12],
            BOX.h,
            P,
          ),
        )
        .join(""),
      { tone: "lo" },
    ),
    line(k.ring(plan.x + 14, y, 1.6, BOX.h, P, 16), { tone: "lo" }),
  ].join("");
}

export function figure() {
  return {
    label:
      "A connector hub on a bench plate with a row of identical sockets: identical plugs sit in them with leads fanning out to a ring of small server boxes, and one lit plug hovers just before it seats.",
    body: [
      benchPlate(PLATE, P),
      hub(),
      ...SOCKETS.map((y, i) => plug(y, { pulled: i === PULLED })),
      leads(),
      ...byDepth(servers, P).map((point) => server(point)),
    ],
  };
}
