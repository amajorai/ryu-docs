import { describe, expect, test } from "bun:test";

import { fileURLToPath } from "node:url";

import {
  DOCS_SECTIONS,
  isDocsSection,
  pageInDocsSection,
} from "@/lib/docs-sections";

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
    // Nested realms such as `surfaces/desktop` are reached by their section
    // slug (`desktop`), whose prefix is the realm's path.
    const prefixes = new Set<string>(Object.values(DOCS_SECTIONS));
    expect(
      realms.filter((realm) => !(isDocsSection(realm) || prefixes.has(realm))),
    ).toEqual([]);
  });
});
