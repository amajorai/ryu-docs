import { expect, test } from "bun:test";
import { docsRouteAliases, isCanonicalDocsPage } from "./canonical-docs";

test("redirect sources never appear as canonical sitemap pages", () => {
  for (const alias of docsRouteAliases) {
    expect(isCanonicalDocsPage(alias.from.split("/"))).toBe(false);
    expect(isCanonicalDocsPage(alias.to.split("/"))).toBe(true);
  }
  expect(isCanonicalDocsPage(["extend", "mcp", "llms"])).toBe(true);
});
