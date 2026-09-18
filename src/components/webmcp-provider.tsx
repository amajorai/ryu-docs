"use client";

import { useEffect } from "react";
import {
  DOCS_VERSION,
  docsPathForLocale,
  isVersionSegment,
} from "@/lib/docs-version";
import {
  DEFAULT_DOCS_LOCALE,
  isDocsLocale,
  localeFromPathname,
} from "@/lib/i18n";

interface DocsWebMcpToolSpec {
  annotations: { readOnlyHint: true; untrustedContentHint: true };
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
  title: string;
}

interface DocsWebMcpTool extends DocsWebMcpToolSpec {
  execute: (
    input: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => Promise<string>;
}

interface ModelContext {
  registerTool?: (
    tool: DocsWebMcpTool,
    options?: { signal?: AbortSignal },
  ) => unknown;
}

const MAX_ARGUMENT_CHARS = 200;
const MAX_RESULT_CHARS = 8000;

/** The read-only WebMCP tools available on docs.ryuhq.com. */
export const DOCS_WEBMCP_TOOL_SPECS: DocsWebMcpToolSpec[] = [
  {
    name: "docs_search",
    title: "Search Ryu Docs",
    description:
      "Search the public Ryu documentation and return bounded matching pages. Use the result URLs with docs_get_page when the full page is needed.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search terms such as 'MCP checkout' or 'Core pairing'.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Optional result count, from 1 to 10.",
        },
        locale: {
          type: "string",
          description: "Optional locale such as 'es' or 'ar'.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "docs_get_page",
    title: "Read a Ryu Docs page",
    description:
      "Read one public Ryu documentation page as Markdown. Accepts a /docs path, a versioned docs path, or a bare docs slug.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "A docs path such as '/es/docs/0.2.3/extend/mcp/webmcp' or 'extend/mcp/webmcp'.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "docs_index",
    title: "List Ryu Docs pages",
    description:
      "List public Ryu documentation pages, optionally limited to a top-level section such as extend, billing, or surfaces.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          description: "Optional top-level docs section slug.",
        },
        locale: {
          type: "string",
          description: "Optional locale such as 'es' or 'ar'.",
        },
      },
      additionalProperties: false,
    },
  },
];

function modelContext(): ModelContext | null {
  if (typeof document !== "undefined") {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (context) {
      return context;
    }
  }
  if (typeof navigator !== "undefined") {
    return (
      (navigator as Navigator & { modelContext?: ModelContext }).modelContext ??
      null
    );
  }
  return null;
}

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > MAX_ARGUMENT_CHARS) {
    throw new Error(`${key} is too long`);
  }
  return normalized;
}

function optionalLimit(input: Record<string, unknown>): number | undefined {
  const value = input.limit;
  if (value === undefined) {
    return undefined;
  }
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 10
  ) {
    throw new Error("limit must be a whole number from 1 to 10");
  }
  return value;
}

function boundedResult(value: unknown): string {
  const text =
    typeof value === "string"
      ? value
      : (() => {
          try {
            return JSON.stringify(value) ?? "The docs tool returned no result.";
          } catch {
            return "The docs tool returned an unreadable result.";
          }
        })();
  return text.length <= MAX_RESULT_CHARS
    ? text
    : `${text.slice(0, MAX_RESULT_CHARS)}\n\n[truncated]`;
}

async function readResponse(response: Response): Promise<string> {
  if (!response.ok) {
    throw new Error(`The docs service returned HTTP ${response.status}.`);
  }
  return boundedResult(await response.text());
}

async function executeDocsTool(
  name: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Docs WebMCP tools are only available in a browser.");
  }
  if (name === "docs_search") {
    const url = new URL("/api/search", window.location.origin);
    url.searchParams.set("query", requiredString(input, "query"));
    const limit = optionalLimit(input);
    if (limit !== undefined) {
      url.searchParams.set("limit", String(limit));
    }
    const locale = input.locale;
    if (locale !== undefined) {
      if (typeof locale !== "string" || !isDocsLocale(locale)) {
        throw new Error("locale is not supported");
      }
      url.searchParams.set("locale", locale);
    } else {
      url.searchParams.set(
        "locale",
        localeFromPathname(window.location.pathname),
      );
    }
    const response = await fetch(url, {
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal,
    });
    return `Untrusted Ryu Docs search results:\n${await readResponse(response)}`;
  }
  if (name === "docs_get_page") {
    const rawPath = requiredString(input, "path");
    const currentLocale = localeFromPathname(window.location.pathname);
    const path =
      rawPath.startsWith("http://") || rawPath.startsWith("https://")
        ? rawPath
        : rawPath.startsWith("/")
          ? rawPath
          : docsPathForLocale(currentLocale, ...rawPath.split("/"));
    const url = new URL(path, window.location.origin);
    const parts = url.pathname.split("/").filter(Boolean);
    const locale = isDocsLocale(parts[0]) ? parts.shift() : DEFAULT_DOCS_LOCALE;
    if (url.origin !== window.location.origin || parts[0] !== "docs") {
      throw new Error("Only public docs paths on this site can be read.");
    }
    const version = parts[1] ?? DOCS_VERSION;
    const hasVersion = isVersionSegment(version);
    const slugs = hasVersion ? parts.slice(2) : parts.slice(1);
    if (slugs.length === 0) {
      throw new Error("A specific docs page is required.");
    }
    const markdownUrl = new URL(
      `/llms.mdx/docs/${locale === DEFAULT_DOCS_LOCALE ? "" : `${locale}/`}${hasVersion ? version : DOCS_VERSION}/${slugs.join("/")}`,
      window.location.origin,
    );
    const response = await fetch(markdownUrl, {
      credentials: "omit",
      headers: { Accept: "text/markdown" },
      signal,
    });
    return `Untrusted Ryu Docs page:\n${await readResponse(response)}`;
  }
  const section =
    input.section === undefined ? "" : requiredString(input, "section");
  const locale = localeFromPathname(window.location.pathname);
  const url = new URL(
    section ? `/llms-sections/${encodeURIComponent(section)}` : "/llms.txt",
    window.location.origin,
  );
  url.searchParams.set("locale", locale);
  const response = await fetch(url, {
    credentials: "omit",
    headers: { Accept: "text/markdown" },
    signal,
  });
  return `Untrusted Ryu Docs index:\n${await readResponse(response)}`;
}

export function WebMcpProvider() {
  useEffect(() => {
    const context = modelContext();
    if (!context?.registerTool) {
      return;
    }
    const controller = new AbortController();
    for (const spec of DOCS_WEBMCP_TOOL_SPECS) {
      const tool: DocsWebMcpTool = {
        ...spec,
        execute: (input, options) =>
          executeDocsTool(spec.name, input, options?.signal),
      };
      try {
        void Promise.resolve(
          context.registerTool?.(tool, { signal: controller.signal }),
        ).catch(() => undefined);
      } catch {
        // A browser may reject one definition; the rest should still register.
      }
    }
    return () => controller.abort();
  }, []);
  return null;
}
