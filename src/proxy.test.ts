import { describe, expect, test } from "bun:test";
import { NextFetchEvent } from "next/dist/server/web/spec-extension/fetch-event";
import { NextRequest } from "next/server";

import { wantsMarkdown as mainSiteWantsMarkdown } from "../../web/src/lib/markdown-negotiation.ts";
import { config, proxy } from "./proxy";

const event = new NextFetchEvent({
  request: new NextRequest("http://localhost:4010"),
  page: "/",
  context: undefined,
});

function runProxy(pathname: string, accept?: string) {
  const response = proxy(
    new NextRequest(`http://localhost:4010${pathname}`, {
      headers: accept ? { Accept: accept } : undefined,
    }),
    event,
  );
  if (!(response instanceof Response)) {
    throw new Error("Expected the locale proxy to return a response");
  }
  return response;
}

describe("Fumadocs locale proxy", () => {
  test("rewrites the default home and docs paths to the internal English route", () => {
    expect(runProxy("/").headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4010/en/",
    );
    expect(
      runProxy("/docs/start-here").headers.get("x-middleware-rewrite"),
    ).toBe("http://localhost:4010/en/docs/start-here");
  });

  test("leaves a non-default locale on its localized route", () => {
    const response = runProxy("/es/docs/start-here");

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("negotiates localized Markdown through the matching page projection", () => {
    const response = runProxy("/es/docs/start-here", "text/markdown");

    expect(response.headers.get("vary")).toBe("Accept");
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4010/llms.mdx/docs/es/start-here",
    );
  });

  test("rewrites the default docs path without redirecting to itself", () => {
    const response = runProxy("/docs/gateway/batches");

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4010/en/docs/gateway/batches",
    );
  });

  test("consumes the internal English rewrite marker before the page handler", () => {
    const response = proxy(
      new NextRequest("http://localhost:4010/en/docs/gateway/batches", {
        headers: { "x-fumadocs-default-english-rewrite": "1" },
      }),
      event,
    );

    if (!(response instanceof Response)) {
      throw new Error("Expected the locale proxy to return a response");
    }
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(
      response.headers.get("x-fumadocs-default-english-rewrite"),
    ).toBeNull();
  });

  test("matches only the supported locale route boundary", () => {
    expect(config.matcher).toContain(
      "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)/:path*",
    );
    expect(config.matcher).not.toContain("/:locale/:path*");
  });
  test("the internal English rewrite resolves instead of redirecting back to itself", () => {
    for (const path of ["/", "/docs/start-here"]) {
      const rewrite = runProxy(path).headers.get("x-middleware-rewrite");
      expect(rewrite).not.toBeNull();
      if (rewrite === null) {
        throw new Error("Expected the default locale rewrite destination");
      }
      const response = runProxy(new URL(rewrite).pathname);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    }
  });

  test("English-prefixed Markdown still uses content negotiation", () => {
    const response = runProxy("/en/docs/start-here", "text/markdown");
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4010/llms.mdx/docs/en/start-here",
    );
  });

  test("English-prefixed root endpoints still redirect to their real routes", () => {
    for (const path of [
      "/llms.txt",
      "/llms-full.txt",
      "/sitemap.xml",
      "/api/search",
    ]) {
      const response = runProxy(`/en${path}`);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost:4010${path}`,
      );
    }
  });
});

describe("Accept negotiation shared with the main site", () => {
  // The public "LLM-friendly docs" page describes how docs.ryuhq.com (this
  // proxy, through fumadocs-core's negotiator) and ryuhq.com (its own parser)
  // answer the same Accept header. Pin both sites to one table so a negotiator
  // upgrade or a main-site parser change cannot silently split the two.
  const markdownProjection = "http://localhost:4010/llms.mdx/docs/start-here";
  const cases: [accept: string, docs: boolean, main: boolean][] = [
    ["text/markdown", true, true],
    // A zero weight in any spelling declines Markdown on both sites, and so
    // does a negative or numberless one.
    ["text/markdown;q=0", false, false],
    ["text/markdown;q=0.0", false, false],
    ["text/markdown;Q=0", false, false],
    ["text/markdown;q=0.0000", false, false],
    ["text/markdown;q=00", false, false],
    ["text/markdown;q=-0", false, false],
    ["text/markdown;q=-1", false, false],
    ["text/markdown;q=abc", false, false],
    ["text/markdown;q", false, false],
    ['text/markdown;q="0"', false, false],
    ["text/markdown;q=0.001", true, true],
    ['text/markdown;q="0.5"', true, true],
    // The first `q` is the weight, and quoted separators split nothing.
    ["text/markdown;q=0.5;q=0", true, true],
    ["text/markdown;q=0;q=0.5", false, false],
    ['text/markdown;profile="x;q=0"', true, true],
    ['text/html;note=", text/markdown, "', false, false],
    ["text/markdown; q = 0", true, true],
    ["text/markdown;q=0, text/markdown", true, true],
    // A positive weight is enough even when HTML is weighted higher; a
    // browser's Accept header and a bare wildcard stay on HTML.
    ["text/html, text/markdown;q=0.5", true, true],
    [
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      false,
      false,
    ],
    ["*/*", false, false],
    // Only the docs site also treats these as Markdown requests.
    ["text/plain", true, false],
    ["text/x-markdown", true, false],
  ];

  test("both sites match an upper- or mixed-case Markdown media type (RFC 9110)", () => {
    // RFC 9110 section 8.3.1: the type and subtype are case-insensitive, so a
    // client spelling the media type in capitals is asking for the same thing.
    const caseCases: [accept: string, docs: boolean, main: boolean][] = [
      ["TEXT/MARKDOWN", true, true],
      ["Text/Markdown", true, true],
      ["text/MARKDOWN;q=0.5", true, true],
      ["text/html, TEXT/MARKDOWN;Q=0.4", true, true],
      ["TEXT/MARKDOWN;Q=0", false, false],
      ["TEXT/MARKDOWN;q=0.0", false, false],
      // Docs-only Markdown aliases are case-insensitive on the docs site too.
      ["TEXT/PLAIN", true, false],
      ["Text/X-Markdown", true, false],
      ["TEXT/HTML", false, false],
    ];
    for (const [accept, docs, main] of caseCases) {
      const response = runProxy("/docs/start-here", accept);
      expect({
        accept,
        docs:
          response.headers.get("x-middleware-rewrite") === markdownProjection,
        vary: response.headers.get("vary"),
        main: mainSiteWantsMarkdown(accept),
      }).toEqual({ accept, docs, vary: docs ? "Accept" : null, main });
    }
    // The localized projection follows the same rule.
    expect(
      runProxy("/es/docs/start-here", "TEXT/MARKDOWN").headers.get(
        "x-middleware-rewrite",
      ),
    ).toBe("http://localhost:4010/llms.mdx/docs/es/start-here");
  });

  test("both sites read every Markdown weight the same way", () => {
    for (const [accept, docs, main] of cases) {
      const rewrite = runProxy("/docs/start-here", accept).headers.get(
        "x-middleware-rewrite",
      );
      expect({
        accept,
        docs: rewrite === markdownProjection,
        main: mainSiteWantsMarkdown(accept),
      }).toEqual({ accept, docs, main });
    }
  });
});
