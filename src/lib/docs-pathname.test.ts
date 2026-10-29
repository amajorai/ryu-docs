import { expect, test } from "bun:test";
import { publicDocsPathname } from "./docs-pathname";

test("rewritten English SSR and public paths select identical documentation", () => {
  for (const suffix of [
    "",
    "/apps/browser",
    "/surfaces/desktop",
    "/apps/sites",
    "/billing/hosted-agents",
  ]) {
    expect(publicDocsPathname(`/en/docs${suffix}`)).toBe(
      publicDocsPathname(`/docs${suffix}`),
    );
  }
});

test("other locales, homepage and similar prefixes retain their native URL", () => {
  for (const pathname of [
    "/fr/docs/apps/browser",
    "/zh-cn/docs/apps/sites",
    "/en",
    "/en/docs-other",
    "/en/documentation",
    "/enterprise/docs",
    "/api/search",
  ]) {
    expect(publicDocsPathname(pathname)).toBe(pathname);
  }
});
