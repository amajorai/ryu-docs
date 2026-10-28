/*
 * WebGL2 plumbing for the Gradient ASCII background (vendored from React Bits,
 * https://www.reactbits.dev/c/backgrounds/gradient-ascii, MIT + Commons Clause):
 * program linking, render targets, the glyph atlas, and sRGB → OKLab colors.
 */

import { VERTEX } from "./shaders";

export interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export interface Target {
  framebuffer: WebGLFramebuffer | null;
  height: number;
  textures: (WebGLTexture | null)[];
  width: number;
}

export interface Atlas {
  count: number;
  grid: number[];
  texture: WebGLTexture | null;
}

export const ATLAS_CELL_W = 60;
export const ATLAS_CELL_H = 100;
const ATLAS_COLUMNS = 16;
const FONT_SCALE = 0.78;

const toLinear = (value: number) =>
  value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

/** sRGB (0–1) to OKLab, the space the field shader interpolates the ramp in. */
export const toLab = ([r, g, b]: number[]): number[] => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(
    0.412_221_470_8 * lr + 0.536_332_536_3 * lg + 0.051_445_992_9 * lb,
  );
  const m = Math.cbrt(
    0.211_903_498_2 * lr + 0.680_699_545_1 * lg + 0.107_396_956_6 * lb,
  );
  const s = Math.cbrt(
    0.088_302_461_9 * lr + 0.281_718_837_6 * lg + 0.629_978_700_5 * lb,
  );
  return [
    0.210_454_255_3 * l + 0.793_617_785 * m - 0.004_072_046_8 * s,
    1.977_998_495_1 * l - 2.428_592_205 * m + 0.450_593_709_9 * s,
    0.025_904_037_1 * l + 0.782_771_766_2 * m - 0.808_675_766 * s,
  ];
};

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }
  gl.deleteShader(shader);
  return null;
}

export function link(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
): Program | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!(vertex && fragment && program)) {
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) {
      const name = info.name.replace(/\[0\]$/, "");
      uniforms[name] = gl.getUniformLocation(program, name);
    }
  }
  return { program, uniforms };
}

/** Make `program` current (WebGL's useProgram, not a React hook). */
export function bindProgram(gl: WebGL2RenderingContext, program: Program) {
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL2RenderingContext.useProgram, not a React hook
  gl.useProgram(program.program);
}

export function createTarget(
  gl: WebGL2RenderingContext,
  count: number,
): Target {
  const textures = Array.from({ length: count }, () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  });
  return { textures, framebuffer: gl.createFramebuffer(), width: 0, height: 0 };
}

export function sizeTarget(
  gl: WebGL2RenderingContext,
  target: Target,
  width: number,
  height: number,
) {
  if (target.width === width && target.height === height) {
    return;
  }
  target.width = width;
  target.height = height;
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
  for (const [i, texture] of target.textures.entries()) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + i,
      gl.TEXTURE_2D,
      texture,
      0,
    );
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

export function deleteTarget(gl: WebGL2RenderingContext, target: Target) {
  for (const texture of target.textures) {
    gl.deleteTexture(texture);
  }
  gl.deleteFramebuffer(target.framebuffer);
}

/** Render every distinct character into one mipmapped alpha atlas. */
export function buildAtlas(
  gl: WebGL2RenderingContext,
  characters: string,
  fontFamily: string,
): Atlas {
  const list = [
    ...new Set(
      [...characters].filter((char) => char !== "\n" && char !== "\r"),
    ),
  ];
  if (list.length === 0) {
    list.push(" ");
  }
  const columns = Math.min(ATLAS_COLUMNS, list.length);
  const rows = Math.ceil(list.length / columns);
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_CELL_W * columns;
  canvas.height = ATLAS_CELL_H * rows;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = `300 ${Math.round(ATLAS_CELL_H * FONT_SCALE)}px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    for (const [index, char] of list.entries()) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      context.fillText(
        char,
        column * ATLAS_CELL_W + ATLAS_CELL_W / 2,
        row * ATLAS_CELL_H + ATLAS_CELL_H / 2 + 3,
      );
    }
  }
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, count: list.length, grid: [columns, rows] };
}
