import { describe, expect, test } from "bun:test";
import { type NextFetchEvent, NextRequest } from "next/server";

import { config, proxy } from "./proxy";

const event = {} as NextFetchEvent;

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
      runProxy("/docs/0.4.0/start-here").headers.get("x-middleware-rewrite"),
    ).toBe("http://localhost:4010/en/docs/0.4.0/start-here");
  });

  test("leaves a non-default locale on its localized route", () => {
    const response = runProxy("/es/docs/0.4.0/start-here");

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("negotiates localized Markdown through the matching page projection", () => {
    const response = runProxy("/es/docs/0.4.0/start-here", "text/markdown");

    expect(response.headers.get("vary")).toBe("Accept");
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:4010/llms.mdx/docs/es/0.4.0/start-here",
    );
  });

  test("matches only the supported locale route boundary", () => {
    expect(config.matcher).toContain(
      "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)/:path*",
    );
    expect(config.matcher).not.toContain("/:locale/:path*");
  });
});
