import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createFromSource } from "fumadocs-core/search/server";
import { z } from "zod";

import { siteConfig } from "@/lib/metadata";
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
 * The server is deliberately **stateless** (no chat history, no auth) — the
 * transport owns sessions, but the tool bodies only read the docs tree.
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

const search = createFromSource(source, {
  // Matches /api/search (https://docs.orama.com/docs/orama-js/supported-languages)
  language: "english",
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

/** Render a search hit as readable text for the model. */
function formatHit(hit: SearchHit): string {
  const crumbs =
    hit.breadcrumbs.length > 0 ? `${hit.breadcrumbs.join(" / ")} — ` : "";
  return `- ${crumbs}${hit.type}: ${hit.content}`;
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
  href = href.startsWith("/docs") ? href : `/docs${href}`;

  const byHref = getPageByHref(href);
  if (byHref?.page) {
    return byHref.page;
  }
  // Fall back to treating the remainder as slugs (version segment is handled by
  // `getPage` itself via `stripDocsVersion`).
  const slugs = href.split("/").filter(Boolean).slice(1);
  return getPage(slugs);
}

/**
 * Build a fresh, fully-configured docs MCP server.
 *
 * One instance per MCP session on purpose: the SDK's `Protocol` routes
 * responses through a single transport field, so sharing one server across
 * concurrent HTTP sessions would cross-wire them. A docs server has no
 * cross-session state, so per-session instances cost nothing but a few tool
 * registrations.
 */
export function createDocsServer(): McpServer {
  const server = new McpServer({
    name: "ryu-docs-mcp",
    version: "0.1.14",
  });

  server.tool(
    "docs_search",
    {
      query: z
        .string()
        .describe("The search query, e.g. 'install cli' or 'plugin manifest'."),
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
        .describe("Filter by a documentation tag (e.g. 'mcp', 'extensions')."),
    },
    async ({ query, limit, tag }) => {
      const results = await search.search(query, { limit: limit ?? 8, tag });
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

  server.tool(
    "docs_get_page",
    {
      path: z
        .string()
        .describe(
          "The docs page to read: a URL or path, e.g. '/docs/mcp/quickstart' or 'mcp/quickstart'. Returns the full page as Markdown.",
        ),
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

  server.tool(
    "docs_index",
    {
      section: z
        .string()
        .optional()
        .describe(
          "Optional top-level section slug to filter by (e.g. 'start-here', 'mcp', 'develop'). Omit for the whole index.",
        ),
    },
    async ({ section }) => {
      const pages = source
        .getPages()
        .filter((page) => !section || page.slugs[0] === section)
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
            text: `${header}\n${lines.join("\n")}`,
          },
        ],
      };
    },
  );

  return server;
}
