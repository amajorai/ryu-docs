import { expect, test } from "bun:test";
import { z } from "zod";

import { GET as apiSearch } from "@/app/api/search/route";
import { POST as mcp } from "@/app/mcp/route";
import { DOCS_LANGUAGES } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";

// Run this from apps/fumadocs (`bun run test`): its bunfig.toml preloads the MDX
// compiler that produces each page's search data. Each of the two search
// servers builds an Orama index per locale from the real MDX content on its
// first query, which takes a couple of minutes on a loaded host.
const INDEX_BUILD_MS = 600_000;
const protocolVersion = "2026-07-28";

const apiResultsSchema = z.array(
  z.object({
    breadcrumbs: z.array(z.string()).optional(),
    content: z.string(),
    type: z.enum(["page", "heading", "text"]),
    url: z.string(),
  }),
);
const toolResultSchema = z.object({
  content: z.array(z.object({ text: z.string(), type: z.literal("text") })),
  isError: z.boolean().optional(),
});
const rpcSchema = z.object({
  error: z.object({ message: z.string() }).optional(),
  result: toolResultSchema.optional(),
});

/** What an MCP client gets back from a docs tool: its text and error flag. */
async function docsTool(
  name: "docs_get_page" | "docs_search",
  args: Record<string, unknown>,
) {
  const headers = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "mcp-method": "tools/call",
    "mcp-name": name,
    "mcp-protocol-version": protocolVersion,
  });
  const response = await mcp(
    new Request("http://docs.test/mcp", {
      body: JSON.stringify({
        id: `${name}-${JSON.stringify(args)}`,
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          _meta: {
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": {
              name: "docs-mcp-search-locales-test",
              version: "1.0.0",
            },
            "io.modelcontextprotocol/protocolVersion": protocolVersion,
          },
          arguments: args,
          name,
        },
      }),
      headers,
      method: "POST",
    }),
  );
  const body = await response.text();
  const data = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  const envelope = rpcSchema.parse(JSON.parse(data || body));
  return {
    error: envelope.error?.message ?? null,
    isError: envelope.result?.isError === true,
    text: envelope.result?.content.map((part) => part.text).join("") ?? "",
  };
}

/** What an MCP client gets back from `docs_search`: its text and error flag. */
function docsSearchTool(locale: string, query: string, limit: number) {
  return docsTool("docs_search", { limit, locale, query });
}

/** What the site's own search box gets back for the same query and locale. */
async function siteSearchHits(locale: string, query: string, limit: number) {
  const url = new URL("https://docs.test/api/search");
  url.searchParams.set("locale", locale);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  const response = await apiSearch(new Request(url));
  expect(response.status).toBe(200);
  return apiResultsSchema.parse(await response.json());
}

/** The text `docs_search` renders for the hits `/api/search` returned. */
function expectedToolText(
  query: string,
  hits: z.output<typeof apiResultsSchema>,
): string {
  const strip = (text: string) => text.replace(/<\/?mark>/g, "");
  const lines = hits.map((hit) => {
    const crumbs = (hit.breadcrumbs ?? []).map(strip);
    const prefix = crumbs.length > 0 ? `${crumbs.join(" / ")} — ` : "";
    const url = `${siteConfig.url}${hit.url}`;
    return `- ${prefix}${hit.type}: ${strip(hit.content)} (${url})`;
  });
  const body =
    lines.length === 0 ? `No results for '${query}'.` : lines.join("\n");
  return `Docs search results for '${query}':\n${body}\n\nUse docs_get_page with a result's URL to read the full page.`;
}

test(
  "docs_search answers every docs locale with the same hits as /api/search",
  async () => {
    const query = "OpenRouter";
    const limit = 3;
    const outcomes = [];
    for (const locale of DOCS_LANGUAGES) {
      const hits = await siteSearchHits(locale, query, limit);
      const tool = await docsSearchTool(locale, query, limit);
      outcomes.push({
        agrees: tool.text === expectedToolText(query, hits),
        error: tool.error,
        hasHits: hits.length > 0,
        isError: tool.isError,
        locale,
      });
    }
    expect(outcomes).toEqual(
      DOCS_LANGUAGES.map((locale) => ({
        agrees: true,
        error: null,
        hasHits: true,
        isError: false,
        locale,
      })),
    );
  },
  INDEX_BUILD_MS,
);

test(
  "docs_search searches the locale's own pages, not the English ones",
  async () => {
    // `start-here/index.es.mdx` is the only translated page, so a Spanish word
    // from it is found in `es` and nowhere in `en`.
    const query = "instalar";
    const limit = 3;
    const hits = await siteSearchHits("es", query, limit);
    const tool = await docsSearchTool("es", query, limit);

    expect(hits.length).toBeGreaterThan(0);
    expect(tool.error).toBeNull();
    expect(tool.isError).toBe(false);
    expect(tool.text).toBe(expectedToolText(query, hits));
  },
  INDEX_BUILD_MS,
);

test(
  "docs_get_page reads the page behind every URL docs_search prints",
  async () => {
    // The search text ends "Use docs_get_page with a result's URL", so each hit
    // must carry a URL, and `docs_get_page` must accept it as printed.
    const search = await docsSearchTool("en", "OpenRouter", 5);
    const urls = [...search.text.matchAll(/\((https?:\/\/[^\s)]+)\)$/gm)].map(
      (match) => match[1],
    );
    const reads = [];
    for (const url of urls) {
      const page = await docsTool("docs_get_page", { path: url });
      reads.push({ hasBody: page.text.length > 0, isError: page.isError, url });
    }

    expect(urls.length).toBeGreaterThan(0);
    expect(reads).toEqual(
      urls.map((url) => ({ hasBody: true, isError: false, url })),
    );
  },
  INDEX_BUILD_MS,
);
