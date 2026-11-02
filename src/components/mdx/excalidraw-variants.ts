import type { DiagramSize } from "./diagram-viewbox";

/** Which colour scheme an image is shown in. */
export type ExcalidrawVariantTheme = "light" | "dark" | "both";

export interface ExcalidrawVariant {
  src: string;
  /**
   * `light`: hidden in dark mode. `dark`: shown only in dark mode. `both`: one
   * light export for both themes, inverted in dark mode the way Excalidraw's
   * own dark theme renders a scene.
   */
  theme: ExcalidrawVariantTheme;
}

/**
 * The images to render for one diagram. Theme switching is CSS only (the
 * `.dark` class next-themes sets before paint), so server HTML already matches
 * the reader's theme and nothing flashes on hydration.
 */
export function excalidrawVariants(
  src: string,
  darkSrc?: string,
): ExcalidrawVariant[] {
  const dark = darkSrc?.trim();
  if (!dark) {
    return [{ src, theme: "both" }];
  }
  return [
    { src, theme: "light" },
    { src: dark, theme: "dark" },
  ];
}

/** MDX passes attributes as strings; anything but a positive number is unknown. */
export function diagramDimension(value: number | string | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
}

/**
 * The size the lightbox fits: the authored (or build-time) dimensions when
 * both are known, otherwise the loaded image's natural size, which for an SVG
 * comes from its `width`/`height` or `viewBox`.
 */
export function excalidrawFitSize(
  declared: DiagramSize,
  natural: DiagramSize | null,
): DiagramSize {
  if (declared.width > 0 && declared.height > 0) {
    return declared;
  }
  if (natural && natural.width > 0 && natural.height > 0) {
    return natural;
  }
  return { width: 0, height: 0 };
}
