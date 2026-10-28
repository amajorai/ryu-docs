import { McpServer } from "@modelcontextprotocol/server";
import { createFromSource } from "fumadocs-core/search/server";
import { z } from "zod";

import { pageInDocsSection } from "@/lib/docs-sections";
import { DEFAULT_DOCS_LOCALE, isDocsLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";
import { DOCS_SEARCH_LANGUAGES } from "@/lib/search-languages";
import { getLLMText, getPage, getPageByHref, source } from "@/lib/source";

/**
 * The Ryu Docs MCP server — a read-only Model Context Protocol server that
 * exposes this documentation site as tools (search + page content), the same
 * way OpenAI hosts a docs MCP for its developer docs. It is served from the
 * Next.js app itself at `/mcp` (see `src/app/mcp/route.ts`) and consumed as a
 * **remote** MCP server by the built-in `@ryu/docs` plugin and by any external
 * MCP host (Cursor, Claude Code, Codex, …).
 *
 * It is documentation-only: it never calls a Ryu API or model. The tools
 * resolve the same `source` loader and `getLLMText` the `/llms*.txt` routes
 * use, so MCP output and the plain-Markdown endpoints can never drift.
 *
 * The server is deliberately **stateless** (no chat history, no auth). The
 * 2026 protocol handles each request independently; legacy requests are also
 * served without retaining a protocol session.
 */

/** One search hit, with `<mark>` highlighting stripped for clean agent output. */
type SearchHit = {
  id: string;
  url: string;
  type: "page" | "heading" | "text";
  title: string;
  content: string;
  breadcrumbs: string[];
};

// The same per-locale tokenizers as /api/search. With a locale-aware source
// Fumadocs ignores a single `language` and derives one from each locale's code,
// which has no Orama tokenizer for `hi`, `ja`, `ko`, `pt-br` or `zh-cn`, so a
// search in any of them failed.
const search = createFromSource(source, {
  localeMap: DOCS_SEARCH_LANGUAGES,
});

/** Strip `<mark>`/`</mark>` highlight markers out of a search-result string. */
function stripHighlights(text: string): string {
  return text.replace(/<\/?mark>/g, "");
}

/** Absolute URL for a relative docs href, pinned to the deployment's own base. */
function absoluteUrl(path: string): string {
  return `${siteConfig.url}${path}`;
}

/** Map a search record onto a clean, agent-friendly hit object. */
function toSearchHit(result: {
  id: string;
  url: string;
  type: "page" | "heading" | "text";
  content: string;
  breadcrumbs?: string[];
}): SearchHit {
  return {
    id: result.id,
    url: absoluteUrl(result.url),
    type: result.type,
    title: result.breadcrumbs?.[0]
      ? stripHighlights(result.breadcrumbs[0])
      : result.id,
    content: stripHighlights(result.content),
    breadcrumbs: (result.breadcrumbs ?? []).map(stripHighlights),
  };
}

/**
 * Render a search hit as readable text for the model. The URL closes the line
 * because the result text tells the agent to pass "a result's URL" to
 * `docs_get_page`.
 */
function formatHit(hit: SearchHit): string {
  const crumbs =
    hit.breadcrumbs.length > 0 ? `${hit.breadcrumbs.join(" / ")} — ` : "";
  return `- ${crumbs}${hit.type}: ${hit.content} (${hit.url})`;
}

/**
 * Accept a docs path in any of the forms agents naturally pass: a full URL
 * (`https://docs.ryuhq.com/docs/...`), a versioned or bare `/docs/...` path, or
 * bare slugs (`mcp/quickstart`). Returns the resolved page, or `undefined`.
 */
function resolvePage(path: string) {
  let href = path.trim();
  if (href.startsWith(siteConfig.url)) {
    href = href.slice(siteConfig.url.length);
  }
  if (href && !href.startsWith("/")) {
    href = `/${href}`;
  }
  const parts = href.split("/").filter(Boolean);
  const locale = isDocsLocale(parts[0]) ? parts.shift() : DEFAULT_DOCS_LOCALE;
  href = parts[0] === "docs" ? `/${parts.join("/")}` : `/docs${href}`;

  const byHref = getPageByHref(href, locale);
  if (byHref?.page) {
    return byHref.page;
  }
  // Fall back to treating the remainder as slugs (version segment is handled by
  // `getPage` itself via `stripDocsVersion`).
  const slugs = href.split("/").filter(Boolean).slice(1);
  return getPage(slugs, locale);
}

/**
 * Build a fresh, fully-configured docs MCP server for one HTTP exchange.
 */
export function createDocsServer(): McpServer {
  const server = new McpServer({
    name: "ryu-docs-mcp",
    version: "0.1.14",
  });

  server.registerTool(
    "docs_search",
    {
      description: "Search Ryu documentation by query, tag, and locale.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "The search query, e.g. 'install cli' or 'plugin manifest'.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Maximum number of results to return (default 8)."),
        tag: z
          .string()
          .optional()
          .describe(
            "Filter by a documentation tag (e.g. 'mcp', 'extensions').",
          ),
        locale: z
          .string()
          .optional()
          .describe("Locale to search (defaults to English)."),
      }),
    },
    async ({ query, limit, tag, locale }) => {
      const language = locale ?? DEFAULT_DOCS_LOCALE;
      if (!isDocsLocale(language)) {
        return {
          content: [
            { type: "text" as const, text: `Unsupported locale: ${language}` },
          ],
          isError: true,
        };
      }
      const results = await search.search(query, {
        limit: limit ?? 8,
        locale: language,
        tag,
      });
      const hits = results.map(toSearchHit);
      const text =
        hits.length === 0
          ? `No results for '${query}'.`
          : hits.map(formatHit).join("\n");
      return {
        content: [
          {
            type: "text" as const,
            text: `Docs search results for '${query}':\n${text}\n\nUse docs_get_page with a result's URL to read the full page.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "docs_get_page",
    {
      description: "Read a Ryu documentation page as Markdown.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "The docs page to read: a URL or path, e.g. '/es/docs/extend/mcp/quickstart' or 'mcp/quickstart'. Returns the full page as Markdown.",
          ),
      }),
    },
    async ({ path }) => {
      const page = resolvePage(path);
      if (!page) {
        return {
          content: [{ type: "text" as const, text: `Page not found: ${path}` }],
          isError: true,
        };
      }
      const markdown = await getLLMText(page);
      return {
        content: [
          {
            type: "text" as const,
            text: markdown,
          },
        ],
      };
    },
  );

  server.registerTool(
    "docs_index",
    {
      description: "List pages in the Ryu documentation index.",
      inputSchema: z.object({
        section: z
          .string()
          .optional()
          .describe(
            "Optional section slug to filter by (e.g. 'start-here', 'core', 'extend', or a nested prefix such as 'extend/mcp'). Omit for the whole index.",
          ),
        locale: z
          .string()
          .optional()
          .describe("Locale to list (defaults to English)."),
      }),
    },
    async ({ section, locale }) => {
      const language = locale ?? DEFAULT_DOCS_LOCALE;
      if (!isDocsLocale(language)) {
        return {
          content: [
            { type: "text" as const, text: `Unsupported locale: ${language}` },
          ],
          isError: true,
        };
      }
      const pages = source
        .getPages(language)
        .filter((page) => !section || pageInDocsSection(page.slugs, section))
        .sort((a, b) => a.url.localeCompare(b.url));
      const lines = pages.map(
        (page) =>
          `- ${page.data.title} — ${absoluteUrl(page.url)}` +
          (page.data.description ? ` — ${page.data.description}` : ""),
      );
      const header = section
        ? `Pages in the '${section}' section (${pages.length}):`
        : `All Ryu documentation pages (${pages.length}):`;
      return {
        content: [
          {
            type: "text" as const,
            text: `${header}\nLocale: ${language}\n${lines.join("\n")}`,
          },
        ],
      };
    },
  );

  return server;
}
