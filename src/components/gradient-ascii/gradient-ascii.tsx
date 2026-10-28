"use client";

/*
 * Gradient ASCII background: soft gradient glows drawn in ASCII characters that
 * scramble under the cursor. Vendored from React Bits
 * (https://www.reactbits.dev/c/backgrounds/gradient-ascii, MIT + Commons Clause)
 * and split into shaders, GL helpers, input and the render loop. The WebGL
 * renderer loads and starts once the browser is idle, so the shaders stay off
 * the hydration path, and the glyphs fade in over the static page.
 */

import { type HTMLAttributes, useEffect, useRef } from "react";

import { clamp, type GradientAsciiSettings, MAX_COLORS } from "./settings";
import { allowsDecorativeWebGl, whenBrowserIdle } from "./webgl-gate";

export type GradientAsciiShape = "horizon" | "pinch" | "rise" | "eclipse";
export type GradientAsciiClickEffect = "wave" | "burst" | "none";

export interface GradientAsciiProps extends HTMLAttributes<HTMLDivElement> {
  cellSize?: number;
  characters?: string;
  clickEffect?: GradientAsciiClickEffect;
  colors?: string[];
  density?: number;
  depthOfField?: number;
  flicker?: number;
  flow?: number;
  fontFamily?: string;
  glow?: number;
  glyphOpacity?: number;
  gradientOpacity?: number;
  grain?: number;
  intro?: boolean;
  lightMode?: boolean;
  mouseInteraction?: boolean;
  scale?: number;
  scrambleRadius?: number;
  shape?: GradientAsciiShape;
  softness?: number;
  speed?: number;
  variation?: number;
}

const DEFAULT_COLORS = ["#1e3fd8", "#f6f8ff", "#a5d8ff", "#38bdf8"];
const DEFAULT_CHARACTERS = " =+xX0S8#@";
const DEFAULT_FONT =
  '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const SHAPES: Record<GradientAsciiShape, number> = {
  horizon: 0,
  pinch: 1,
  rise: 2,
  eclipse: 3,
};
const CLICK_EFFECTS: Record<GradientAsciiClickEffect, number> = {
  none: 0,
  wave: 1,
  burst: 2,
};

export function GradientAscii({
  colors = DEFAULT_COLORS,
  shape = "horizon",
  characters = DEFAULT_CHARACTERS,
  cellSize = 18,
  density = 0.8,
  glyphOpacity = 0.85,
  glow = 0.2,
  depthOfField = 0,
  flicker = 0.2,
  softness = 0.5,
  scale = 1,
  flow = 0.5,
  speed = 1,
  gradientOpacity = 0.9,
  grain = 0.08,
  variation = 0,
  mouseInteraction = true,
  scrambleRadius = 0.1,
  clickEffect = "wave",
  intro = true,
  lightMode = false,
  fontFamily = DEFAULT_FONT,
  className,
  ...rest
}: GradientAsciiProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const palette = (colors.length > 0 ? colors : DEFAULT_COLORS).slice(
    0,
    MAX_COLORS,
  );
  const settings: GradientAsciiSettings = {
    colors: palette.length > 1 ? palette : [palette[0], palette[0]],
    shape: SHAPES[shape],
    characters: characters || DEFAULT_CHARACTERS,
    cellSize: clamp(cellSize, 6, 64),
    density: clamp(density, 0, 1),
    glyphOpacity: clamp(glyphOpacity, 0, 1),
    glow: clamp(glow, 0, 2),
    depthOfField: clamp(depthOfField, 0, 1),
    flicker: clamp(flicker, 0, 1),
    softness: clamp(softness, 0, 1),
    scale: clamp(scale, 0.4, 2.5),
    flow: clamp(flow, 0, 2),
    speed: Math.max(0, speed),
    gradientOpacity: clamp(gradientOpacity, 0, 1),
    grain: clamp(grain, 0, 0.4),
    variation: Math.max(0, variation),
    mouseInteraction,
    scrambleRadius: clamp(scrambleRadius, 0.02, 0.4),
    clickEffect: CLICK_EFFECTS[clickEffect],
    intro,
    lightMode,
    fontFamily: fontFamily || DEFAULT_FONT,
  };
  // The renderer reads the latest props each frame without restarting WebGL.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!(container && canvas && allowsDecorativeWebGl())) {
      return;
    }
    let disposed = false;
    let renderer: { dispose: () => void; wake: () => void } | null = null;
    const cancelIdle = whenBrowserIdle(() => {
      import("./renderer").then(
        ({ createGradientAsciiRenderer }) => {
          if (disposed) {
            return;
          }
          renderer = createGradientAsciiRenderer(
            container,
            canvas,
            () => settingsRef.current,
          );
          wakeRef.current = renderer?.wake ?? null;
          if (renderer) {
            canvas.dataset.ready = "true";
          }
        },
        // Decorative: a chunk that fails to load leaves the static backdrop.
        () => undefined,
      );
    });
    return () => {
      disposed = true;
      cancelIdle();
      wakeRef.current = null;
      renderer?.dispose();
    };
  }, []);

  // Redraw after any prop change, even while the loop sleeps.
  useEffect(() => {
    wakeRef.current?.();
  });

  return (
    <div
      aria-hidden="true"
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
      ref={containerRef}
      {...rest}
    >
      <canvas
        className="absolute inset-0 block h-full w-full opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100 motion-reduce:transition-none"
        ref={canvasRef}
      />
    </div>
  );
}
