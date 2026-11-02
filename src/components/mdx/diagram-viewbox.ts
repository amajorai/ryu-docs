/** Intrinsic diagram size in CSS pixels; `0` means unknown. */
export interface DiagramSize {
  width: number;
  height: number;
}

const ROOT_SVG_TAG_RE = /<svg\b[^>]*>/i;
const VIEWBOX_RE = /\bviewBox\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const VIEWBOX_SEPARATOR_RE = /[\s,]+/;

/**
 * Reads the intrinsic size from the root `<svg>` element's `viewBox`. Only the
 * root tag is read, so a nested `<svg>`, `<symbol>` or embedded image (an
 * Excalidraw export may carry several) cannot be mistaken for the diagram.
 * Mermaid and Excalidraw both write a `viewBox`, and the lightbox fits the
 * diagram to the viewport from it.
 */
export function parseSvgViewBox(svg: string): DiagramSize {
  const root = ROOT_SVG_TAG_RE.exec(svg)?.[0] ?? "";
  const match = VIEWBOX_RE.exec(root);
  const parts = (match?.[1] ?? match?.[2] ?? "")
    .trim()
    .split(VIEWBOX_SEPARATOR_RE)
    .map(Number);
  const valid = parts.length === 4 && parts.every(Number.isFinite);
  const width = valid ? (parts[2] ?? 0) : 0;
  const height = valid ? (parts[3] ?? 0) : 0;
  return width > 0 && height > 0 ? { width, height } : { width: 0, height: 0 };
}
