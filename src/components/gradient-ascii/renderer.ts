/*
 * The Gradient ASCII render loop (vendored from React Bits,
 * https://www.reactbits.dev/c/backgrounds/gradient-ascii, MIT + Commons Clause).
 * Each frame draws the gradient field at half resolution, optionally a blurred
 * glyph halo at quarter resolution, then composites glyphs over the field. The
 * loop sleeps when nothing moves (reduced motion, off screen, hidden tab). A
 * software rasterizer gets no context, so the backdrop stays static there.
 */

import {
  ATLAS_CELL_H,
  ATLAS_CELL_W,
  type Atlas,
  bindProgram,
  buildAtlas,
  createTarget,
  deleteTarget,
  link,
  type Program,
  sizeTarget,
  toLab,
} from "./gl";
import { createInput } from "./input";
import { clamp, type GradientAsciiSettings, MAX_COLORS } from "./settings";
import { BLUR, COMPOSITE, FIELD, HALO } from "./shaders";
import { getBackgroundWebGl2 } from "./webgl-gate";

const INTRO_SECONDS = 2.4;

/** Resolve any CSS color to sRGB through a 1px 2D canvas, cached per string. */
function createColorParser() {
  const probe = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  const cache = new Map<string, number[]>();
  return (value: string): number[] => {
    const cached = cache.get(value);
    if (cached) {
      return cached;
    }
    let rgb = [0, 0, 0];
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#000000";
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      rgb = [r / 255, g / 255, b / 255];
    }
    cache.set(value, rgb);
    return rgb;
  };
}

/** Start rendering into `canvas`; returns `wake` and `dispose`, or null without a GPU-backed WebGL2. */
export function createGradientAsciiRenderer(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  getSettings: () => GradientAsciiSettings,
) {
  const gl = getBackgroundWebGl2(canvas, {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) {
    return null;
  }
  const field = link(gl, FIELD);
  const halo = link(gl, HALO);
  const blur = link(gl, BLUR);
  const composite = link(gl, COMPOSITE);
  if (!(field && halo && blur && composite)) {
    return null;
  }
  const vao = gl.createVertexArray();
  const fieldTarget = createTarget(gl, 2);
  const haloA = createTarget(gl, 1);
  const haloB = createTarget(gl, 1);
  const parse = createColorParser();
  const input = createInput();
  const reduce =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const view = { width: 1, height: 1, ratio: 1 };
  const ramp = new Float32Array(MAX_COLORS * 3);
  let atlas: Atlas | null = null;
  let atlasKey = "";
  let paletteKey = "";
  let time = 0;
  let glyphTime = 0;
  let introClock = getSettings().intro && !reduce ? 0 : 1;
  let frameSeed = 0;
  let grainClock = 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  let disposed = false;

  const syncAtlas = () => {
    const s = getSettings();
    const key = `${s.fontFamily}|${s.characters}`;
    if (key === atlasKey && atlas) {
      return;
    }
    atlasKey = key;
    if (atlas) {
      gl.deleteTexture(atlas.texture);
    }
    atlas = buildAtlas(gl, s.characters, s.fontFamily);
    // Rebuild once the mono face loads so glyphs never stay in the fallback.
    document.fonts?.load?.(`300 64px ${s.fontFamily}`, s.characters).then(
      () => {
        if (disposed || atlasKey !== key) {
          return;
        }
        if (atlas) {
          gl.deleteTexture(atlas.texture);
        }
        atlas = buildAtlas(gl, s.characters, s.fontFamily);
        draw();
      },
      () => undefined,
    );
  };

  const syncPalette = () => {
    const s = getSettings();
    const key = s.colors.join(",");
    if (key === paletteKey) {
      return;
    }
    paletteKey = key;
    for (const [i, color] of s.colors.entries()) {
      ramp.set(toLab(parse(color)), i * 3);
    }
  };

  const bindGlyphs = (program: Program, width: number, height: number) => {
    if (!atlas) {
      return;
    }
    const s = getSettings();
    const u = program.uniforms;
    const cellH = s.cellSize * view.ratio;
    const cellW = cellH * (ATLAS_CELL_W / ATLAS_CELL_H);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTarget.textures[0]);
    gl.uniform1i(u.uField, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fieldTarget.textures[1]);
    gl.uniform1i(u.uAux, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
    gl.uniform1i(u.uAtlas, 2);
    gl.uniform2f(u.uResolution, width, height);
    gl.uniform2f(u.uCell, cellW, cellH);
    gl.uniform2f(
      u.uOffset,
      (width - Math.ceil(width / cellW) * cellW) / 2,
      (height - Math.ceil(height / cellH) * cellH) / 2,
    );
    gl.uniform2f(u.uAtlasGrid, atlas.grid[0], atlas.grid[1]);
    gl.uniform1f(u.uCount, atlas.count);
    gl.uniform1f(u.uDensity, s.density);
    gl.uniform1f(u.uOpacity, s.glyphOpacity);
    gl.uniform1f(u.uFlicker, reduce ? 0 : s.flicker);
    gl.uniform1f(u.uDepth, s.depthOfField);
    gl.uniform1f(u.uGlyphTime, glyphTime);
    gl.uniform1f(u.uSeedValue, s.variation);
    gl.uniform1f(u.uLight, s.lightMode ? 1 : 0);
  };

  const drawField = () => {
    const s = getSettings();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldTarget.framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, fieldTarget.width, fieldTarget.height);
    bindProgram(gl, field);
    const u = field.uniforms;
    gl.uniform1f(u.uAspect, view.width / view.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1i(u.uShape, s.shape);
    gl.uniform3fv(u.uRamp, ramp);
    gl.uniform1i(u.uCount, s.colors.length);
    gl.uniform1f(u.uScale, s.scale);
    gl.uniform1f(u.uSoftness, s.softness);
    gl.uniform1f(u.uFlow, s.flow);
    gl.uniform2f(u.uSeed, s.variation * 3.17, s.variation * 1.91);
    gl.uniform4fv(u.uTrail, input.trailData);
    gl.uniform1f(u.uRadius, s.scrambleRadius);
    gl.uniform4fv(u.uClicks, input.clickData);
    gl.uniform1i(u.uClickEffect, s.clickEffect);
    gl.uniform1f(u.uIntro, introClock);
    gl.uniform1f(u.uFrame, frameSeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const drawHalo = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, haloA.width, haloA.height);
    bindProgram(gl, halo);
    bindGlyphs(halo, canvas.width, canvas.height);
    gl.uniform1f(halo.uniforms.uDownscale, canvas.width / haloA.width);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    bindProgram(gl, blur);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(blur.uniforms.uSource, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloB.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]);
    gl.uniform2f(blur.uniforms.uStep, 1 / haloA.width, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, haloB.textures[0]);
    gl.uniform2f(blur.uniforms.uStep, 0, 1 / haloA.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const draw = () => {
    const s = getSettings();
    syncAtlas();
    syncPalette();
    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    drawField();
    const glowing = s.glow > 0.001;
    if (glowing) {
      drawHalo();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    bindProgram(gl, composite);
    bindGlyphs(composite, canvas.width, canvas.height);
    const u = composite.uniforms;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]);
    gl.uniform1i(u.uHalo, 3);
    gl.uniform1f(u.uGlow, glowing ? s.glow : 0);
    gl.uniform1f(u.uGradient, s.gradientOpacity);
    gl.uniform1f(u.uGrain, s.grain);
    gl.uniform1f(u.uFrame, frameSeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    view.width = Math.max(1, container.clientWidth);
    view.height = Math.max(1, container.clientHeight);
    view.ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(view.width * view.ratio));
    canvas.height = Math.max(1, Math.round(view.height * view.ratio));
    sizeTarget(
      gl,
      fieldTarget,
      Math.max(1, Math.round(canvas.width / 2)),
      Math.max(1, Math.round(canvas.height / 2)),
    );
    const haloWidth = Math.max(1, Math.round(canvas.width / 4));
    const haloHeight = Math.max(1, Math.round(canvas.height / 4));
    sizeTarget(gl, haloA, haloWidth, haloHeight);
    sizeTarget(gl, haloB, haloWidth, haloHeight);
    draw();
    wake();
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed || !visible || document.hidden) {
      return;
    }
    const s = getSettings();
    const dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
    last = now;
    if (!reduce) {
      time += dt * s.speed * 0.5;
      glyphTime += dt * Math.max(s.speed, 0.15);
    }
    if (introClock < 1) {
      introClock = Math.min(1, introClock + dt / INTRO_SECONDS);
    }
    grainClock += dt;
    if (!reduce && grainClock > 1 / 24) {
      grainClock = 0;
      frameSeed = (frameSeed + 1) % 97;
    }
    input.pack(dt);
    draw();
    if (!reduce || introClock < 1 || input.active()) {
      raf = requestAnimationFrame(frame);
    } else {
      last = 0;
    }
  };

  const wake = () => {
    if (!(raf || disposed) && visible && !document.hidden) {
      raf = requestAnimationFrame(frame);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!getSettings().mouseInteraction || reduce) {
      return;
    }
    const point = input.locate(event, container.getBoundingClientRect());
    if (point && input.move(point)) {
      wake();
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!getSettings().clickEffect || reduce) {
      return;
    }
    const point = input.locate(event, container.getBoundingClientRect());
    if (point) {
      input.click(point);
      wake();
    }
  };

  const onVisibility = () => {
    last = 0;
    wake();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) {
      last = 0;
      wake();
    }
  });
  intersection.observe(container);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  resize();

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersection.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("visibilitychange", onVisibility);
    for (const target of [fieldTarget, haloA, haloB]) {
      deleteTarget(gl, target);
    }
    if (atlas) {
      gl.deleteTexture(atlas.texture);
    }
    gl.deleteVertexArray(vao);
    for (const item of [field, halo, blur, composite]) {
      gl.deleteProgram(item.program);
    }
    // No WEBGL_lose_context here: a remount on the same canvas (React Strict
    // Mode, Fast Refresh) gets this context back, and a lost one draws nothing.
  };

  return { dispose, wake };
}
