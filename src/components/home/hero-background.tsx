"use client";

import { useTheme } from "next-themes";

import { GradientAscii } from "@/components/gradient-ascii/gradient-ascii";

/*
 * The docs hero's backdrop, the docs counterpart of the landing hero's animated
 * background: a brand-blue band of ASCII glyphs across the first viewport,
 * under the search row, fading into the page below. Light mode switches the
 * shader to ink on the light surface.
 */

// Ramps run from the faint rim to the bright core. Dark glows brand blue out of
// the page; light inks the same blues onto paper (pale colours vanish on white).
const DARK_COLORS = ["#0a1f4a", "#0057d9", "#0099ff", "#bfe6ff"];
const LIGHT_COLORS = ["#b9dcff", "#4aa8ff", "#0077e6", "#003a99"];

export function HeroBackground() {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      {/* The band sits at the canvas's middle; dropping the canvas runs it
          under the search row, clear of the headline. The hero clips it. */}
      <div className="absolute inset-x-0 top-[34%] h-full">
        <GradientAscii
          colors={light ? LIGHT_COLORS : DARK_COLORS}
          glow={0.35}
          glyphOpacity={light ? 1 : 0.85}
          lightMode={light}
          shape="pinch"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-fd-background" />
    </div>
  );
}
