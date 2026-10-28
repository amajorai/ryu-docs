import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  type CssRuleLike,
  type CssSheetLike,
  chartCharacters,
  collectDocsFontFaces,
  DOCS_FONT_FAMILY,
  DOCS_FONT_STACK,
  type DocsFontFace,
  embedFontCss,
  faceCoversText,
  type MermaidFontEnvironment,
  parseUnicodeRange,
  resolveMermaidFont,
  SYSTEM_FONT_STACK,
} from "./mermaid-font";

const LATIN_RANGE = "U+0000-00FF, U+0131, U+2000-206F";
const CYRILLIC_RANGE = "U+0301, U+0400-045F";

function fontFaceRule(declarations: Record<string, string>): CssRuleLike {
  return {
    cssText: "@font-face { }",
    style: {
      getPropertyValue: (property) => declarations[property] ?? "",
    },
  };
}

function interRule(file: string, unicodeRange: string): CssRuleLike {
  return fontFaceRule({
    "font-family": '"Inter Variable"',
    "font-style": "normal",
    "font-weight": "100 900",
    src: `url("../media/${file}") format("woff2-variations")`,
    "unicode-range": unicodeRange,
  });
}

function sheet(
  rules: CssRuleLike[],
  href: string | null = "https://docs.test/_next/static/css/app.css",
): CssSheetLike {
  return { href, cssRules: rules };
}

function fontEnvironment(
  sheets: CssSheetLike[],
  fetchFont: MermaidFontEnvironment["fetchFont"],
): MermaidFontEnvironment & { loaded: string[] } {
  const loaded: string[] = [];
  return {
    sheets,
    baseUrl: "https://docs.test/en/docs",
    fetchFont,
    loadFont: (font) => {
      loaded.push(font);
      return Promise.resolve();
    },
    loaded,
  };
}

const fontBytes = () =>
  new Response(new Uint8Array([0x77, 0x4f, 0x46, 0x32]), {
    headers: { "content-type": "font/woff2" },
  });

describe("Mermaid font stacks", () => {
  test("never ask the isolated image document to inherit a page font", () => {
    expect(DOCS_FONT_STACK).not.toContain("inherit");
    expect(SYSTEM_FONT_STACK).not.toContain("inherit");
    expect(DOCS_FONT_STACK.startsWith("'Inter Variable',")).toBe(true);
    expect(DOCS_FONT_STACK).not.toContain('"');
  });

  test("embed the same font the docs body uses", () => {
    const globalCss = readFileSync(
      new URL("../../app/global.css", import.meta.url),
      "utf8",
    );
    const sans = globalCss.match(/--font-sans:\s*([^;]+);/)?.[1] ?? "";
    expect(sans.startsWith(`"${DOCS_FONT_FAMILY}",`)).toBe(true);
  });
});

describe("unicode-range matching", () => {
  test("parses single code points, ranges, and wildcards", () => {
    expect(parseUnicodeRange("U+0131, U+0000-00FF, u+4??")).toEqual([
      [0x1_31, 0x1_31],
      [0x00, 0xff],
      [0x4_00, 0x4_ff],
    ]);
  });

  test("selects only the subsets a chart's characters need", () => {
    const latin: DocsFontFace = {
      url: "latin",
      unicodeRange: LATIN_RANGE,
      weight: "",
    };
    const cyrillic: DocsFontFace = {
      url: "cyrillic",
      unicodeRange: CYRILLIC_RANGE,
      weight: "",
    };
    expect(faceCoversText(latin, "flowchart LR\n A --> B")).toBe(true);
    expect(faceCoversText(cyrillic, "flowchart LR\n A --> B")).toBe(false);
    expect(faceCoversText(cyrillic, "A[Привет]")).toBe(true);
    expect(faceCoversText({ ...latin, unicodeRange: "" }, "漢字")).toBe(true);
  });

  test("counts characters that entity codes paint but the source lacks", () => {
    const characters = chartCharacters("A[#1046; &#x416; &#1046;] --> B");
    expect(characters).toContain("Ж");
    expect(characters.startsWith("A[#1046;")).toBe(true);
    expect(chartCharacters("A[#0; #99999999;]")).toBe("A[#0; #99999999;]");
  });
});

describe("collectDocsFontFaces", () => {
  test("reads docs font subsets through @media and @import, resolved per sheet", () => {
    const imported = sheet(
      [interRule("inter-cyrillic.woff2", CYRILLIC_RANGE)],
      "https://docs.test/_next/static/css/fonts/inter.css",
    );
    const faces = collectDocsFontFaces(
      [
        sheet([
          { cssText: "@import url(fonts/inter.css);", styleSheet: imported },
          {
            cssText: "@media screen { }",
            cssRules: [interRule("inter-latin.woff2", LATIN_RANGE)],
          },
          fontFaceRule({
            "font-family": "'Inter Variable'",
            "font-style": "italic",
            src: "url(italic.woff2)",
          }),
          fontFaceRule({
            "font-family": '"Geist Variable"',
            src: "url(geist.woff2)",
          }),
        ]),
      ],
      "https://docs.test/en/docs",
    );
    expect(faces).toEqual([
      {
        url: "https://docs.test/_next/static/css/media/inter-cyrillic.woff2",
        unicodeRange: CYRILLIC_RANGE,
        weight: "100 900",
      },
      {
        url: "https://docs.test/_next/static/media/inter-latin.woff2",
        unicodeRange: LATIN_RANGE,
        weight: "100 900",
      },
    ]);
  });

  test("skips stylesheets whose rules are hidden and inline sheets use the base URL", () => {
    const crossOrigin: CssSheetLike = {
      href: "https://cdn.test/app.css",
      get cssRules(): Iterable<CssRuleLike> {
        throw new Error("SecurityError");
      },
    };
    const faces = collectDocsFontFaces(
      [crossOrigin, sheet([interRule("inter-latin.woff2", LATIN_RANGE)], null)],
      "https://docs.test/en/docs/page",
    );
    expect(faces.map((face) => face.url)).toEqual([
      "https://docs.test/en/media/inter-latin.woff2",
    ]);
  });

  test("rejects declarations that could break out of the embedded stylesheet", () => {
    const faces = collectDocsFontFaces(
      [
        sheet([
          fontFaceRule({
            "font-family": '"Inter Variable"',
            src: "url(inter.woff2)",
            "unicode-range": "U+0-FF}</style><script>",
          }),
        ]),
      ],
      "https://docs.test/",
    );
    expect(faces).toEqual([]);
  });
});

describe("embedFontCss", () => {
  test("adds the font stylesheet first inside the root svg", () => {
    const svg =
      '<svg id="m" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>#m{font-family:x}</style><g/></svg>';
    expect(embedFontCss(svg, "@font-face{font-family:'Inter Variable'}")).toBe(
      '<svg id="m" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@font-face{font-family:\'Inter Variable\'}</style><style>#m{font-family:x}</style><g/></svg>',
    );
    expect(embedFontCss(svg, "")).toBe(svg);
  });
});

describe("resolveMermaidFont", () => {
  test("embeds the docs font subsets the chart uses and measures with the same stack", async () => {
    const fetched: string[] = [];
    const environment = fontEnvironment(
      [
        sheet([
          interRule("resolve-latin.woff2", LATIN_RANGE),
          interRule("resolve-cyrillic.woff2", CYRILLIC_RANGE),
        ]),
      ],
      (url) => {
        fetched.push(url);
        return Promise.resolve(fontBytes());
      },
    );
    const font = await resolveMermaidFont(
      "flowchart LR\n A --> B",
      environment,
    );
    expect(font.fontFamily).toBe(DOCS_FONT_STACK);
    expect(fetched).toEqual([
      "https://docs.test/_next/static/media/resolve-latin.woff2",
    ]);
    expect(font.css).toBe(
      `@font-face{font-family:'Inter Variable';font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,d09GMg==);unicode-range:${LATIN_RANGE}}`,
    );
    expect(environment.loaded).toEqual([`16px ${DOCS_FONT_STACK}`]);
  });

  test("falls back to the system stack, embedding nothing, when the font cannot be read", async () => {
    const environment = fontEnvironment(
      [sheet([interRule("resolve-missing.woff2", LATIN_RANGE)])],
      () => Promise.resolve(new Response("", { status: 404 })),
    );
    expect(await resolveMermaidFont("graph TD\n A", environment)).toEqual({
      fontFamily: SYSTEM_FONT_STACK,
      css: "",
    });
    expect(environment.loaded).toEqual([]);
  });

  test("embeds the subset an entity-coded label needs", async () => {
    const fetched: string[] = [];
    const environment = fontEnvironment(
      [
        sheet([
          interRule("entity-latin.woff2", LATIN_RANGE),
          interRule("entity-cyrillic.woff2", CYRILLIC_RANGE),
        ]),
      ],
      (url) => {
        fetched.push(url);
        return Promise.resolve(fontBytes());
      },
    );
    const font = await resolveMermaidFont("graph TD\n A[#1046;]", environment);
    expect(font.fontFamily).toBe(DOCS_FONT_STACK);
    expect(fetched).toEqual([
      "https://docs.test/_next/static/media/entity-latin.woff2",
      "https://docs.test/_next/static/media/entity-cyrillic.woff2",
    ]);
  });

  test("falls back to the system stack when the page cannot load the font for measuring", async () => {
    const environment: MermaidFontEnvironment = {
      sheets: [sheet([interRule("unloadable-latin.woff2", LATIN_RANGE)])],
      baseUrl: "https://docs.test/en/docs",
      fetchFont: () => Promise.resolve(fontBytes()),
      loadFont: () => Promise.reject(new Error("NetworkError")),
    };
    expect(await resolveMermaidFont("graph TD\n A", environment)).toEqual({
      fontFamily: SYSTEM_FONT_STACK,
      css: "",
    });
  });

  test("never rejects, so a font problem cannot hide the diagram", async () => {
    const environment: MermaidFontEnvironment = {
      sheets: {
        [Symbol.iterator](): Iterator<CssSheetLike> {
          throw new Error("stylesheets unavailable");
        },
      },
      baseUrl: "https://docs.test/en/docs",
      fetchFont: () => Promise.resolve(fontBytes()),
    };
    expect(await resolveMermaidFont("graph TD\n A", environment)).toEqual({
      fontFamily: SYSTEM_FONT_STACK,
      css: "",
    });
  });

  test("falls back to the system stack when the page declares no docs font", async () => {
    const environment = fontEnvironment([], () => Promise.resolve(fontBytes()));
    expect(await resolveMermaidFont("graph TD\n A", environment)).toEqual({
      fontFamily: SYSTEM_FONT_STACK,
      css: "",
    });
  });
});
