/*
 * Shared parts for the docs-home figures, drawn with the vendored Anatomy kit:
 * a bench plate on feet, screws, ruler strips, knobs and indicator lamps. Each
 * helper returns SVG strings in painter's order for the projection it is given.
 */

import * as k from "./vendor/anatomy/iso-kit.mjs";

export { k };

export const solid = (paths, style) => k.solidSvg(paths, style);
export const line = (d, style) => k.lineSvg(d, style);
export const dots = (points, style) => k.dotsSvg(points, style);

/** Sort plan points back to front so repeated parts paint in depth order. */
export const byDepth = (points, P, z = 0) =>
  [...points].sort(
    (a, b) => k.depthOf([a[0], a[1], z], P) - k.depthOf([b[0], b[1], z], P),
  );

/** Corner screws: a counterbore ring with a centre dot. */
export function screws(points, z, P, radius = 2.2) {
  return [
    line(points.map(([x, y]) => k.ring(x, y, radius, z, P, 16)).join(""), {
      tone: "lo",
    }),
    dots(
      points.map(([x, y]) => k.iso([x, y, z], P)),
      { size: 0.5 },
    ),
  ].join("");
}

/** A heavy bench plate on four turned feet, with an inset groove and screws. */
export function benchPlate(plan, P, { height = 12, foot = 5 } = {}) {
  const bottom = -height - foot;
  const out = [
    `<path class="iso-halo" d="${k.haloOf(plan, bottom, height, P)}"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(plan, 22), P)) {
    out.push(solid(k.cylinder(x, y, 7, bottom, 1.6, P, 28), { tone: "lo" }));
    out.push(
      solid(k.cylinder(x, y, 5.4, bottom + 1.6, foot - 1.6, P, 28), {
        tone: "mid",
      }),
    );
  }
  out.push(solid(k.slabOf(plan, -height, height, P, 8, 1.6), { tone: "mid" }));
  out.push(line(k.planOutline(k.insetPlan(plan, 5), 0, P), { tone: "lo" }));
  out.push(screws(k.corners(plan, 10), 0, P));
  return out.join("");
}

/** A thin ruler strip with minor and major ticks hanging from its edge. */
export function rulerStrip(strip, P, z = 0) {
  const ticks = k.topTicks(
    strip.x + 4,
    strip.x + strip.w - 4,
    4,
    5,
    strip.y + 0.8,
    z + 0.6,
    [2, 3.6],
    P,
  );
  return [
    solid(k.slabOf(strip, z, 0.6, P, 3), { tone: "lo", crease: "none" }),
    line(ticks.minor, { tone: "lo" }),
    line(ticks.major, { tone: "mid" }),
    dots(
      [
        k.iso([strip.x + 2, strip.y + strip.d / 2, z + 0.6], P),
        k.iso([strip.x + strip.w - 2, strip.y + strip.d / 2, z + 0.6], P),
      ],
      { size: 0.45 },
    ),
  ].join("");
}

/** A knurled knob on a short collar with a pointer line on its cap. */
export function knob([x, y], z, P, { radius = 4, height = 4 } = {}) {
  const top = z + height;
  return [
    solid(k.cylinder(x, y, radius + 1.2, z, 1, P, 28), { tone: "lo" }),
    solid(k.cylinder(x, y, radius, z + 1, height - 1, P, 32), { tone: "mid" }),
    line(k.knurl(x, y, radius, z + 1, top, 30, P), { tone: "lo" }),
    line(k.lineOnTop([x, y], [x + radius - 0.8, y], top, P), { tone: "hi" }),
    dots([k.iso([x, y, top], P)], { size: 0.45, tone: "hi" }),
  ].join("");
}

/** A lamp in a bezel: the one lit accent of a figure when `lit` is set. */
export function lamp([x, y], z, P, { lit = false, radius = 2.2 } = {}) {
  return [
    solid(k.cylinder(x, y, radius + 1, z, 0.8, P, 24), { tone: "mid" }),
    solid(k.cylinder(x, y, radius, z + 0.8, 1.2, P, 24), {
      tone: lit ? "hi" : "lo",
      lit,
    }),
  ].join("");
}

/** A jack socket: a hex nut ring around a dark hole, on a top face. */
export function jack([x, y], z, P) {
  return [
    line(k.ring(x, y, 2.6, z, P, 6), { tone: "mid" }),
    line(k.ring(x, y, 1.6, z, P, 20), { tone: "lo" }),
    dots([k.iso([x, y, z], P)], { size: 0.7, tone: "hi" }),
  ].join("");
}

/** A cable from `from` to `to` (both world points) with terminal dots. */
export function cable(from, to, via, P, style = {}) {
  return k.wireSvg(k.iso(from, P), k.iso(to, P), {
    via: via.map((point) => k.iso(point, P)),
    ...style,
  });
}
