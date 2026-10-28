import { describe, expect, test } from "bun:test";

import {
  allowsDecorativeWebGl,
  getBackgroundWebGl2,
  isSoftwareRenderer,
  whenBrowserIdle,
} from "./webgl-gate";

type IdleWindow = NonNullable<Parameters<typeof whenBrowserIdle>[2]>;

function fakeWindow(options: {
  idle?: boolean;
  readyState: DocumentReadyState;
}) {
  const calls: string[] = [];
  const listeners = new Map<string, () => void>();
  const frames = new Map<number, FrameRequestCallback>();
  let idleTask: (() => void) | undefined;
  let idleTimeout: number | undefined;
  const win = {
    addEventListener: (type: string, listener: () => void) => {
      calls.push(`add:${type}`);
      listeners.set(type, listener);
    },
    cancelAnimationFrame: (id: number) => {
      calls.push(`cancelFrame:${id}`);
      frames.delete(id);
    },
    document: { readyState: options.readyState },
    removeEventListener: (type: string) => {
      calls.push(`remove:${type}`);
      listeners.delete(type);
    },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      const id = frames.size + 1;
      frames.set(id, callback);
      return id;
    },
    ...(options.idle
      ? {
          cancelIdleCallback: (handle: number) => {
            calls.push(`cancelIdle:${handle}`);
          },
          requestIdleCallback: (
            callback: () => void,
            idleOptions?: IdleRequestOptions,
          ) => {
            idleTask = callback;
            idleTimeout = idleOptions?.timeout;
            return 7;
          },
        }
      : {}),
  } as unknown as IdleWindow;
  return {
    calls,
    fireLoad: () => listeners.get("load")?.(),
    flushFrames: () => {
      for (const [id, callback] of frames) {
        frames.delete(id);
        callback(0);
      }
    },
    frames,
    idle: () => idleTask?.(),
    idleTimeout: () => idleTimeout,
    win,
  };
}

describe("getBackgroundWebGl2", () => {
  test("forces the performance caveat and keeps caller attributes", () => {
    const seen: unknown[] = [];
    const context = {} as WebGL2RenderingContext;
    const canvas = {
      getContext: (kind: string, attributes: unknown) => {
        seen.push(kind, attributes);
        return context;
      },
    } as unknown as HTMLCanvasElement;
    expect(
      getBackgroundWebGl2(canvas, {
        alpha: true,
        depth: false,
        failIfMajorPerformanceCaveat: false,
      }),
    ).toBe(context);
    expect(seen[0]).toBe("webgl2");
    expect(seen[1]).toEqual({
      alpha: true,
      depth: false,
      failIfMajorPerformanceCaveat: true,
      powerPreference: "low-power",
    });
  });

  test("passes a refused (software) context through as null", () => {
    const canvas = {
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    expect(getBackgroundWebGl2(canvas, {})).toBeNull();
  });
});

describe("allowsDecorativeWebGl", () => {
  test("Save-Data visitors get the static backdrop", () => {
    expect(allowsDecorativeWebGl({ connection: { saveData: true } })).toBe(
      false,
    );
  });

  test("everyone else gets WebGL", () => {
    expect(allowsDecorativeWebGl({})).toBe(true);
    expect(allowsDecorativeWebGl({ connection: { saveData: false } })).toBe(
      true,
    );
    expect(allowsDecorativeWebGl({ connection: null })).toBe(true);
    expect(allowsDecorativeWebGl(undefined)).toBe(true);
  });
});

describe("whenBrowserIdle", () => {
  test("uses requestIdleCallback with the timeout and cancels it", () => {
    const fake = fakeWindow({ idle: true, readyState: "loading" });
    let ran = 0;
    const cancel = whenBrowserIdle(() => ran++, 1500, fake.win);
    expect(fake.idleTimeout()).toBe(1500);
    fake.idle();
    expect(ran).toBe(1);
    cancel();
    expect(fake.calls).toContain("cancelIdle:7");
  });

  test("without idle callbacks waits for load, then a frame", () => {
    const fake = fakeWindow({ readyState: "loading" });
    let ran = 0;
    whenBrowserIdle(() => ran++, 2000, fake.win);
    expect(fake.calls).toEqual(["add:load"]);
    fake.flushFrames();
    expect(ran).toBe(0);
    fake.fireLoad();
    expect(ran).toBe(0);
    fake.flushFrames();
    expect(ran).toBe(1);
  });

  test("cancel removes the load listener and the pending frame", () => {
    const fake = fakeWindow({ readyState: "loading" });
    let ran = 0;
    const cancel = whenBrowserIdle(() => ran++, 2000, fake.win);
    fake.fireLoad();
    cancel();
    expect(fake.calls).toEqual(["add:load", "remove:load", "cancelFrame:1"]);
    fake.flushFrames();
    expect(ran).toBe(0);
  });

  test("an already loaded page runs on the next frame", () => {
    const fake = fakeWindow({ readyState: "complete" });
    let ran = 0;
    whenBrowserIdle(() => ran++, 2000, fake.win);
    expect(fake.calls).toEqual([]);
    expect(fake.frames.size).toBe(1);
    fake.flushFrames();
    expect(ran).toBe(1);
  });

  test("is a no-op without a window", () => {
    let ran = 0;
    const cancel = whenBrowserIdle(() => ran++, 2000, undefined);
    cancel();
    expect(ran).toBe(0);
  });
});

describe("isSoftwareRenderer", () => {
  const UNMASKED_RENDERER_WEBGL = 0x9246;
  function fakeGl(renderer: string) {
    return {
      RENDERER: 0x1f01,
      getExtension: (name: string) =>
        name === "WEBGL_debug_renderer_info"
          ? { UNMASKED_RENDERER_WEBGL }
          : null,
      getParameter: () => renderer,
    } as unknown as WebGL2RenderingContext;
  }

  test("flags CPU rasterizers and keeps hardware GPUs", () => {
    expect(
      isSoftwareRenderer(
        fakeGl(
          "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
        ),
      ),
    ).toBe(true);
    expect(isSoftwareRenderer(fakeGl("llvmpipe (LLVM 15.0.7, 256 bits)"))).toBe(
      true,
    );
    expect(
      isSoftwareRenderer(
        fakeGl("ANGLE (Apple, ANGLE Metal Renderer: Apple M2)"),
      ),
    ).toBe(false);
  });

  test("getBackgroundWebGl2 refuses and frees a software context", () => {
    let lost = 0;
    const gl = {
      RENDERER: 0x1f01,
      getExtension: (name: string) =>
        name === "WEBGL_lose_context"
          ? { loseContext: () => lost++ }
          : { UNMASKED_RENDERER_WEBGL },
      getParameter: () => "SwiftShader driver",
    };
    const canvas = { getContext: () => gl } as unknown as HTMLCanvasElement;
    expect(getBackgroundWebGl2(canvas, {})).toBeNull();
    expect(lost).toBe(1);
  });
});
