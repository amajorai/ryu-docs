/*
 * Settings shared by the Gradient ASCII component and its lazily loaded renderer
 * (vendored from React Bits, MIT + Commons Clause). No WebGL or shader code
 * lives here, so the component chunk stays small.
 */

export const MAX_COLORS = 8;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export interface GradientAsciiSettings {
  cellSize: number;
  characters: string;
  clickEffect: number;
  colors: string[];
  density: number;
  depthOfField: number;
  flicker: number;
  flow: number;
  fontFamily: string;
  glow: number;
  glyphOpacity: number;
  gradientOpacity: number;
  grain: number;
  intro: boolean;
  lightMode: boolean;
  mouseInteraction: boolean;
  scale: number;
  scrambleRadius: number;
  shape: number;
  softness: number;
  speed: number;
  variation: number;
}
