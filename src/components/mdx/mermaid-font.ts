/**
 * Font handling for Mermaid diagrams shown as `data:` SVG images.
 *
 * Mermaid measures label boxes in the live page, but `MermaidImage` paints the
 * SVG as an isolated image document. That document cannot see the page's CSS
 * or its web fonts, so `font-family: inherit` (or a bare page `@font-face`
 * name) paints labels in the browser's default font inside boxes sized for the
 * docs font. To keep measuring and painting on one font, the docs font's
 * `@font-face` subsets that the chart needs are copied into the SVG as `data:`
 * URLs. When the docs font cannot be read, both sides use a system stack that
 * the page and the image document resolve identically.
 */

/** Docs body font; keep in sync with `--font-sans` in `src/app/global.css`. */
export const DOCS_FONT_FAMILY = "Inter Variable";
/** Installed fonts are visible to image documents, so this stack matches. */
export const SYSTEM_FONT_STACK = "ui-sans-serif, system-ui, sans-serif";
/** Single quotes keep the value safe inside double-quoted SVG attributes. */
export const DOCS_FONT_STACK = `'${DOCS_FONT_FAMILY}', ${SYSTEM_FONT_STACK}`;

/** Upper bound per embedded subset; Inter's largest subset is ~85 KB. */
const MAX_EMBEDDED_FONT_BYTES = 256 * 1024;
const BASE64_CHUNK_SIZE = 0x80_00;
const MEASURE_FONT_SIZE = "16px";

const FONT_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/;
const QUOTES_RE = /^['"]|['"]$/g;
const UNICODE_RANGE_TOKEN_RE = /^u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?$/i;
// Values copied into the SVG <style> must not be able to close the rule or tag.
const SAFE_UNICODE_RANGE_RE = /^[\s0-9a-f?u+,-]*$/i;
const SAFE_FONT_WEIGHT_RE = /^(?:normal|bold|\d{1,3}(?:\s+\d{1,3})?)$/;
const FONT_MIME_RE = /^font\/[a-z0-9.+-]+$/;
const SVG_OPEN_TAG_RE = /<svg\b[^>]*>/;
/** Mermaid `#9829;` codes and HTML `&#9829;` / `&#x2665;` references. */
const NUMERIC_ENTITY_RE = /&?#(x[0-9a-f]{1,6}|\d{1,7});/gi;
const MAX_CODE_POINT = 0x10_ff_ff;

/** The subset of the CSSOM read here; real `document.styleSheets` fits it. */
export type CssRuleLike = {
  readonly cssText: string;
  /** Grouping rules (`@media`, `@layer`, `@supports`). */
  readonly cssRules?: Iterable<CssRuleLike>;
  /** `@import` rules. */
  readonly styleSheet?: CssSheetLike | null;
  /** Declarations of `@font-face` (and style) rules. */
  readonly style?: { getPropertyValue(property: string): string };
};

export type CssSheetLike = {
  readonly href: string | null;
  readonly cssRules: Iterable<CssRuleLike>;
};

export type DocsFontFace = {
  /** Absolute font URL resolved against its stylesheet. */
  url: string;
  unicodeRange: string;
  weight: string;
};

export type MermaidFont = {
  /** Value for Mermaid's `fontFamily`, used while measuring in the page. */
  fontFamily: string;
  /** `@font-face` rules to embed in the SVG; empty for the system stack. */
  css: string;
};

export type MermaidFontEnvironment = {
  sheets: Iterable<CssSheetLike>;
  baseUrl: string;
  fetchFont: (url: string) => Promise<Response>;
  /** Waits until the page font is ready, so measuring does not use a fallback. */
  loadFont?: (font: string, text: string) => Promise<void>;
};

const SYSTEM_FONT: MermaidFont = { fontFamily: SYSTEM_FONT_STACK, css: "" };

type CodePointRange = readonly [number, number];

export function parseUnicodeRange(value: string): CodePointRange[] {
  const ranges: CodePointRange[] = [];
  for (const token of value.split(",")) {
    const match = token.trim().match(UNICODE_RANGE_TOKEN_RE);
    const start = match?.[1];
    if (!start) {
      continue;
    }
    if (start.includes("?")) {
      ranges.push([
        Number.parseInt(start.replaceAll("?", "0"), 16),
        Number.parseInt(start.replaceAll("?", "f"), 16),
      ]);
      continue;
    }
    const first = Number.parseInt(start, 16);
    const last = match?.[2] ? Number.parseInt(match[2], 16) : first;
    ranges.push([first, last]);
  }
  return ranges;
}

/**
 * The characters a chart can paint: its source plus the characters its
 * numeric entity codes decode to, which do not appear in the source itself.
 */
export function chartCharacters(source: string): string {
  const decoded: string[] = [];
  for (const match of source.matchAll(NUMERIC_ENTITY_RE)) {
    const code = match[1] ?? "";
    const codePoint = code.toLowerCase().startsWith("x")
      ? Number.parseInt(code.slice(1), 16)
      : Number.parseInt(code, 10);
    if (codePoint > 0 && codePoint <= MAX_CODE_POINT) {
      decoded.push(String.fromCodePoint(codePoint));
    }
  }
  return `${source}${decoded.join("")}`;
}

/** Whether a subset holds any character of `text`; no range means all. */
export function faceCoversText(face: DocsFontFace, text: string): boolean {
  if (!face.unicodeRange) {
    return true;
  }
  const ranges = parseUnicodeRange(face.unicodeRange);
  for (const char of new Set(text)) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (
      ranges.some(([first, last]) => codePoint >= first && codePoint <= last)
    ) {
      return true;
    }
  }
  return false;
}

function readFontFace(
  rule: CssRuleLike,
  sheetUrl: string,
): DocsFontFace | null {
  const style = rule.style;
  if (!style) {
    return null;
  }
  // Check the cheap family first; serializing `cssText` for every style rule
  // of a large stylesheet is not.
  const family = style
    .getPropertyValue("font-family")
    .trim()
    .replace(QUOTES_RE, "");
  if (
    family !== DOCS_FONT_FAMILY ||
    !rule.cssText.trimStart().startsWith("@font-face")
  ) {
    return null;
  }
  const fontStyle = style.getPropertyValue("font-style").trim();
  if (fontStyle && fontStyle !== "normal") {
    return null;
  }
  const source = style.getPropertyValue("src").match(FONT_URL_RE)?.[2];
  const unicodeRange = style.getPropertyValue("unicode-range").trim();
  const weight = style.getPropertyValue("font-weight").trim();
  if (
    !source ||
    !SAFE_UNICODE_RANGE_RE.test(unicodeRange) ||
    (weight && !SAFE_FONT_WEIGHT_RE.test(weight))
  ) {
    return null;
  }
  try {
    return { url: new URL(source, sheetUrl).href, unicodeRange, weight };
  } catch {
    return null;
  }
}

/** Finds the docs font's normal-style `@font-face` subsets in the page CSS. */
export function collectDocsFontFaces(
  sheets: Iterable<CssSheetLike>,
  baseUrl: string,
): DocsFontFace[] {
  const faces = new Map<string, DocsFontFace>();
  const visitSheet = (sheet: CssSheetLike) => {
    let rules: CssRuleLike[];
    try {
      rules = [...sheet.cssRules];
    } catch {
      // Cross-origin stylesheets do not expose their rules.
      return;
    }
    visitRules(rules, sheet.href ?? baseUrl);
  };
  const visitRules = (rules: Iterable<CssRuleLike>, sheetUrl: string) => {
    for (const rule of rules) {
      if (rule.styleSheet) {
        visitSheet(rule.styleSheet);
      } else if (rule.cssRules) {
        visitRules(rule.cssRules, sheetUrl);
      } else {
        const face = readFontFace(rule, sheetUrl);
        if (face && !faces.has(face.url)) {
          faces.set(face.url, face);
        }
      }
    }
  };
  for (const sheet of sheets) {
    visitSheet(sheet);
  }
  return [...faces.values()];
}

export function fontFaceCss(face: DocsFontFace, dataUrl: string): string {
  const declarations = [
    `font-family:'${DOCS_FONT_FAMILY}'`,
    "font-style:normal",
    face.weight ? `font-weight:${face.weight}` : "",
    `src:url(${dataUrl})`,
    face.unicodeRange ? `unicode-range:${face.unicodeRange}` : "",
  ].filter(Boolean);
  return `@font-face{${declarations.join(";")}}`;
}

/** Adds `css` as the SVG's first stylesheet so the image document can use it. */
export function embedFontCss(svg: string, css: string): string {
  if (!css) {
    return svg;
  }
  const style = `<style>${css}</style>`;
  const openTag = svg.match(SVG_OPEN_TAG_RE);
  if (!openTag || openTag.index === undefined) {
    return svg;
  }
  const end = openTag.index + openTag[0].length;
  return `${svg.slice(0, end)}${style}${svg.slice(end)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK_SIZE)),
    );
  }
  return btoa(chunks.join(""));
}

const fontDataUrls = new Map<string, Promise<string | null>>();

async function readFontDataUrl(
  url: string,
  fetchFont: MermaidFontEnvironment["fetchFont"],
): Promise<string | null> {
  try {
    const response = await fetchFont(url);
    if (!response.ok) {
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_EMBEDDED_FONT_BYTES) {
      return null;
    }
    const type =
      response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    // Re-encoding keeps the embedded value to the base64 alphabet.
    const mime = FONT_MIME_RE.test(type) ? type : "font/woff2";
    return `data:${mime};base64,${bytesToBase64(bytes)}`;
  } catch {
    return null;
  }
}

function fontDataUrl(
  url: string,
  fetchFont: MermaidFontEnvironment["fetchFont"],
): Promise<string | null> {
  const cached = fontDataUrls.get(url);
  if (cached) {
    return cached;
  }
  const pending = readFontDataUrl(url, fetchFont).then((dataUrl) => {
    if (dataUrl === null) {
      fontDataUrls.delete(url);
    }
    return dataUrl;
  });
  fontDataUrls.set(url, pending);
  return pending;
}

/**
 * Picks the font Mermaid measures with and the CSS to embed so the image
 * paints the same font. Falls back to the system stack on any failure, so a
 * font problem never stops the diagram itself from rendering.
 */
export async function resolveMermaidFont(
  source: string,
  environment: MermaidFontEnvironment,
): Promise<MermaidFont> {
  try {
    return await resolveDocsFont(chartCharacters(source), environment);
  } catch {
    return SYSTEM_FONT;
  }
}

async function resolveDocsFont(
  text: string,
  environment: MermaidFontEnvironment,
): Promise<MermaidFont> {
  const faces = collectDocsFontFaces(
    environment.sheets,
    environment.baseUrl,
  ).filter((face) => faceCoversText(face, text));
  if (faces.length === 0) {
    return SYSTEM_FONT;
  }
  const dataUrls = await Promise.all(
    faces.map((face) => fontDataUrl(face.url, environment.fetchFont)),
  );
  const rules: string[] = [];
  for (const [index, face] of faces.entries()) {
    const dataUrl = dataUrls[index];
    if (!dataUrl) {
      return SYSTEM_FONT;
    }
    rules.push(fontFaceCss(face, dataUrl));
  }
  try {
    await environment.loadFont?.(
      `${MEASURE_FONT_SIZE} ${DOCS_FONT_STACK}`,
      text,
    );
  } catch {
    // The page would measure with a fallback while the image paints the
    // embedded docs font, so use the system stack on both sides instead.
    return SYSTEM_FONT;
  }
  return { fontFamily: DOCS_FONT_STACK, css: rules.join("") };
}

/** The live page's stylesheets and fetch; call only in the browser. */
export function browserFontEnvironment(): MermaidFontEnvironment {
  return {
    sheets: document.styleSheets,
    baseUrl: document.baseURI,
    // Same URL the page already loaded, so this is normally a cache hit.
    fetchFont: (url) => fetch(url, { cache: "force-cache" }),
    loadFont: async (font, text) => {
      await document.fonts.load(font, text);
    },
  };
}
