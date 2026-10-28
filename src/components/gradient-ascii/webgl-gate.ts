/*
 * Gate for decorative WebGL backgrounds: start them only once the browser is
 * idle, never for visitors who asked to save data, and only on a real GPU.
 * `whenBrowserIdle` mirrors packages/blocks/src/web/when-browser-idle.ts; the
 * docs app does not depend on @ryu/blocks, so keep the two in step by hand.
 */

type IdleWindow = Pick<
  Window,
  | "addEventListener"
  | "cancelAnimationFrame"
  | "removeEventListener"
  | "requestAnimationFrame"
> &
  Partial<Pick<Window, "cancelIdleCallback" | "requestIdleCallback">> & {
    document: Pick<Document, "readyState">;
  };

/**
 * Run `task` when the browser is idle (`requestIdleCallback`, capped at
 * `timeoutMs`); without it (Safari), on the first frame after `load`. No
 * timers. Returns a cancel function, and is a no-op on the server.
 */
export function whenBrowserIdle(
  task: () => void,
  timeoutMs = 2000,
  win: IdleWindow | undefined = globalThis.window,
): () => void {
  if (!win) {
    return noop;
  }
  if (typeof win.requestIdleCallback === "function") {
    const handle = win.requestIdleCallback(() => task(), {
      timeout: timeoutMs,
    });
    return () => win.cancelIdleCallback?.(handle);
  }
  let frame = 0;
  const afterLoad = () => {
    frame = win.requestAnimationFrame(() => task());
  };
  if (win.document.readyState === "complete") {
    afterLoad();
  } else {
    win.addEventListener("load", afterLoad, { once: true });
  }
  return () => {
    win.removeEventListener("load", afterLoad);
    if (frame) {
      win.cancelAnimationFrame(frame);
    }
  };
}

/** A visitor who asked the browser to save data gets the static backdrop. */
export function allowsDecorativeWebGl(
  nav: unknown = globalThis.navigator,
): boolean {
  if (!(typeof nav === "object" && nav !== null && "connection" in nav)) {
    return true;
  }
  const { connection } = nav;
  if (
    !(
      typeof connection === "object" &&
      connection !== null &&
      "saveData" in connection
    )
  ) {
    return true;
  }
  return connection.saveData !== true;
}

// CPU rasterizers that WebGL can land on: Chromium's SwiftShader (also via
// ANGLE), Mesa's llvmpipe/softpipe, and Windows' Basic Render Driver. Mirrors
// isSoftwareRenderer in packages/blocks/src/web/backgrounds/webgl-gate.ts.
const SOFTWARE_RENDERER =
  /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

type RendererInfoContext = Pick<
  WebGL2RenderingContext,
  "getExtension" | "getParameter" | "RENDERER"
>;

/** Whether `gl` rasterizes on the CPU, read from the unmasked renderer name. */
export function isSoftwareRenderer(gl: RendererInfoContext): boolean {
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer: unknown = info
      ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return typeof renderer === "string" && SOFTWARE_RENDERER.test(renderer);
  } catch {
    return false;
  }
}

/**
 * WebGL2 on a real GPU only. `failIfMajorPerformanceCaveat` refuses some
 * software GL, and the renderer check catches the rest (current Chromium hands
 * out ANGLE on SwiftShader even with the flag), so the backdrop stays static
 * instead of pinning the main thread.
 */
export function getBackgroundWebGl2(
  canvas: Pick<HTMLCanvasElement, "getContext">,
  attributes: WebGLContextAttributes,
): WebGL2RenderingContext | null {
  const gl = canvas.getContext("webgl2", {
    ...attributes,
    failIfMajorPerformanceCaveat: true,
    powerPreference: "low-power",
  });
  if (gl && isSoftwareRenderer(gl)) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  return gl;
}

function noop(): void {
  // Nothing was scheduled.
}
