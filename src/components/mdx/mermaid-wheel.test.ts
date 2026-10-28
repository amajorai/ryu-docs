import { describe, expect, test } from "bun:test";
import {
  installMermaidWheelZoom,
  type MermaidWheelTarget,
} from "./mermaid-wheel";

type MermaidWheelBinding = {
  listener?: Parameters<MermaidWheelTarget["addEventListener"]>[1];
  options?: Parameters<MermaidWheelTarget["addEventListener"]>[2];
  removedListener?: Parameters<MermaidWheelTarget["removeEventListener"]>[1];
};

describe("Mermaid wheel zoom", () => {
  test("uses a non-passive listener and prevents page scrolling", () => {
    const binding: MermaidWheelBinding = {};
    const target: MermaidWheelTarget = {
      addEventListener(_type, nextListener, nextOptions) {
        binding.listener = nextListener;
        binding.options = nextOptions;
      },
      removeEventListener(_type, nextListener) {
        binding.removedListener = nextListener;
      },
    };
    const zoomFactors: number[] = [];

    const cleanup = installMermaidWheelZoom(target, (factor) => {
      zoomFactors.push(factor);
    });

    if (!(binding.listener && binding.options)) {
      throw new Error("Mermaid wheel listener was not installed");
    }
    const installedListener = binding.listener;
    const installedOptions = binding.options;
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
    if (!binding.removedListener) {
      throw new Error("Mermaid wheel listener was not removed");
    }
    const installedRemovedListener = binding.removedListener;
    expect(installedRemovedListener).toBe(installedListener);
  });
});
