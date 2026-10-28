import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// The behaviour lives in src/app/api/search/route.test.ts: every locale answers
// under its own URL prefix, and a page with no translation is served in English.
// This keeps the public WebMCP page from promising more than that.
const webmcpPage = fileURLToPath(
  new URL("../../content/docs/extend/mcp/webmcp.mdx", import.meta.url),
);

async function docsSearchRow(): Promise<string> {
  const page = await Bun.file(webmcpPage).text();
  const row = page
    .split("\n")
    .find((line) => line.startsWith("| `docs_search` |"));
  if (!row) {
    throw new Error("webmcp.mdx has no docs_search table row");
  }
  return row.replace(/\s+/g, " ");
}

test("the WebMCP page does not promise translated search results", async () => {
  const row = await docsSearchRow();

  // Almost every page is English only, so a query in another language finds
  // nothing; the row must not say the tool searches "in any language".
  expect(row).not.toMatch(
    /any of the site'?s languages|every (site )?language/i,
  );
  expect(row).not.toContain("page in that language");
});

test("the WebMCP page says a locale changes the link prefix and untranslated pages stay English", async () => {
  const row = await docsSearchRow();

  expect(row).toContain("Pass a locale");
  expect(row).toContain("URL prefix");
  expect(row).toContain("not yet translated are served in English");
});
