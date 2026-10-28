import { describe, expect, test } from "bun:test";

import { fileURLToPath } from "node:url";

import { isDocsSection, pageInDocsSection } from "@/lib/docs-sections";

const rootMetaPath = fileURLToPath(
  new URL("../../content/docs/meta.json", import.meta.url),
);

describe("pageInDocsSection", () => {
  test("matches a top-level realm by its first slug", () => {
    expect(pageInDocsSection(["extend", "mcp", "quickstart"], "extend")).toBe(
      true,
    );
    expect(pageInDocsSection(["billing"], "extend")).toBe(false);
  });

  test("resolves legacy aliases to the realm that absorbed them", () => {
    expect(pageInDocsSection(["extend", "mcp", "quickstart"], "mcp")).toBe(
      true,
    );
    expect(pageInDocsSection(["extend", "develop"], "develop")).toBe(true);
    expect(pageInDocsSection(["surfaces", "desktop", "x"], "desktop")).toBe(
      true,
    );
    expect(pageInDocsSection(["extend", "skills"], "mcp")).toBe(false);
  });

  test("accepts a nested prefix without matching a sibling that shares it", () => {
    expect(pageInDocsSection(["extend", "mcp", "webmcp"], "extend/mcp")).toBe(
      true,
    );
    expect(pageInDocsSection(["extend", "mcp-legacy"], "extend/mcp")).toBe(
      false,
    );
  });

  test("accepts every top-level realm in the root navigation", async () => {
    const root: { pages: string[] } = await Bun.file(rootMetaPath).json();
    const realms = root.pages.filter((page) => !page.startsWith("---"));
    expect(realms.filter((realm) => !isDocsSection(realm))).toEqual([]);
  });
});
