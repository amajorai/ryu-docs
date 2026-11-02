export interface PointerPoint {
  x: number;
  y: number;
}

/** Distance between the first two active pointers, or `null` with fewer. */
export function pinchDistance(
  pointers: ReadonlyMap<number, PointerPoint>,
): number | null {
  const [first, second] = pointers.values();
  if (!(first && second)) {
    return null;
  }
  return Math.hypot(second.x - first.x, second.y - first.y);
}

/**
 * Zoom factor for a two-finger pinch that moved from `previous` to `next`
 * apart. A degenerate start (both fingers on one point) or a non-finite value
 * leaves the zoom unchanged instead of jumping to zero or infinity.
 */
export function pinchZoomFactor(previous: number, next: number): number {
  if (!(previous > 0 && next > 0)) {
    return 1;
  }
  const factor = next / previous;
  return Number.isFinite(factor) ? factor : 1;
}
