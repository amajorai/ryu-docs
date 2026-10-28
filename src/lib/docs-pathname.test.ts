import { expect, test } from "bun:test";
import { publicDocsPathname } from "./docs-pathname";

test("rewritten English SSR and public paths select identical documentation", () => {
  for (const suffix of [
    "",
    "/0.4.0/apps/browser",
    "/0.4.0/surfaces/desktop",
    "/0.4.0/apps/sites",
    "/0.4.0/billing/hosted-agents",
  ]) {
    expect(publicDocsPathname(`/en/docs${suffix}`)).toBe(
      publicDocsPathname(`/docs${suffix}`),
    );
  }
});

test("other locales, homepage and similar prefixes retain their native URL", () => {
  for (const pathname of [
    "/fr/docs/0.4.0/apps/browser",
    "/zh-cn/docs/0.4.0/apps/sites",
    "/en",
    "/en/docs-other",
    "/en/documentation",
    "/enterprise/docs",
    "/api/search",
  ]) {
    expect(publicDocsPathname(pathname)).toBe(pathname);
  }
});
