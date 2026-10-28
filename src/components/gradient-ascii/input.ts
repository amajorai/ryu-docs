/*
 * Pointer trail and click ripples for the Gradient ASCII background (vendored
 * from React Bits). Points live in the field shader's centred, aspect-scaled
 * space and age out; `pack` writes them into the uniform arrays each frame.
 */

export const MAX_CLICKS = 4;
export const MAX_TRAIL = 24;
const CLICK_LIFE = 1.2;
const TRAIL_LIFE = 0.7;
const TRAIL_STEP = 0.015;

interface Point {
  age: number;
  x: number;
  y: number;
}

export function createInput() {
  const clicks: Point[] = [];
  const trail: Point[] = [];
  const clickData = new Float32Array(MAX_CLICKS * 4);
  const trailData = new Float32Array(MAX_TRAIL * 4);

  /** Map a pointer event to field space, or null when it is outside `rect`. */
  const locate = (event: PointerEvent, rect: DOMRect) => {
    const x = (event.clientX - rect.left) / Math.max(1, rect.width);
    const y = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }
    const aspect = rect.width / Math.max(1, rect.height);
    return { x: (x - 0.5) * aspect, y: y - 0.5 };
  };

  const move = (point: { x: number; y: number }) => {
    const head = trail[0];
    const gap = head
      ? Math.hypot(point.x - head.x, point.y - head.y)
      : Number.POSITIVE_INFINITY;
    if (gap < TRAIL_STEP) {
      return false;
    }
    // Fill fast strokes so the scramble reads as a line, not dots.
    if (head && head.age < 0.1) {
      const steps = Math.min(6, Math.floor(gap / (TRAIL_STEP * 2)));
      for (let i = 1; i <= steps; i++) {
        const k = i / (steps + 1);
        trail.unshift({
          x: head.x + (point.x - head.x) * k,
          y: head.y + (point.y - head.y) * k,
          age: 0,
        });
      }
    }
    trail.unshift({ ...point, age: 0 });
    trail.length = Math.min(trail.length, MAX_TRAIL);
    return true;
  };

  const click = (point: { x: number; y: number }) => {
    clicks.unshift({ ...point, age: 0 });
    if (clicks.length > MAX_CLICKS) {
      clicks.pop();
    }
  };

  const pack = (dt: number) => {
    for (const point of trail) {
      point.age += dt;
    }
    while (trail.length > 0 && (trail.at(-1)?.age ?? 0) > TRAIL_LIFE) {
      trail.pop();
    }
    for (let i = 0; i < MAX_TRAIL; i++) {
      const point = trail[i];
      if (point) {
        const k = 1 - point.age / TRAIL_LIFE;
        trailData.set([point.x, point.y, k * k, 0], i * 4);
      } else {
        trailData[i * 4 + 2] = 0;
      }
    }
    for (const item of clicks) {
      item.age += dt;
    }
    while (clicks.length > 0 && (clicks.at(-1)?.age ?? 0) > CLICK_LIFE) {
      clicks.pop();
    }
    for (let i = 0; i < MAX_CLICKS; i++) {
      const item = clicks[i];
      if (item) {
        const k = item.age / CLICK_LIFE;
        const envelope = Math.min(1, item.age / 0.08) * (1 - k) * (1 - k);
        clickData.set([item.x, item.y, item.age, envelope], i * 4);
      } else {
        clickData[i * 4 + 3] = 0;
      }
    }
  };

  const active = () => clicks.length > 0 || trail.length > 0;

  return { active, click, clickData, locate, move, pack, trailData };
}
