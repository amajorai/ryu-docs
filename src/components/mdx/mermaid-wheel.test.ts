import { describe, expect, test } from "bun:test";
import {
  installMermaidWheelZoom,
  type MermaidWheelEvent,
  type MermaidWheelTarget,
} from "./mermaid-wheel";

describe("Mermaid wheel zoom", () => {
  test("uses a non-passive listener and prevents page scrolling", () => {
    let listener: ((event: MermaidWheelEvent) => void) | null = null;
    let options: { passive: false } | null = null;
    let removedListener: ((event: MermaidWheelEvent) => void) | null = null;
    const target: MermaidWheelTarget = {
      addEventListener(_type, nextListener, nextOptions) {
        listener = nextListener;
        options = nextOptions;
      },
      removeEventListener(_type, nextListener) {
        removedListener = nextListener;
      },
    };
    const zoomFactors: number[] = [];

    const cleanup = installMermaidWheelZoom(target, (factor) => {
      zoomFactors.push(factor);
    });

    if (!(listener && options)) {
      throw new Error("Mermaid wheel listener was not installed");
    }
    const installedListener = listener as (event: MermaidWheelEvent) => void;
    const installedOptions = options as { passive: false };
    let prevented = false;
    installedListener({
      deltaY: 120,
      preventDefault: () => {
        prevented = true;
      },
    });

    expect(installedOptions).toEqual({ passive: false });
    expect(prevented).toBe(true);
    expect(zoomFactors).toEqual([0.9]);

    cleanup();
    if (!removedListener) {
      throw new Error("Mermaid wheel listener was not removed");
    }
    const installedRemovedListener = removedListener as (
      event: MermaidWheelEvent,
    ) => void;
    expect(installedRemovedListener).toBe(installedListener);
  });
});
