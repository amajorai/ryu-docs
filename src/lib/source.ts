import { docs } from "collections/server";
import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";

import {
  DOCS_VERSION,
  docsPath,
  stripDocsVersion,
  versionedDocsHref,
} from "@/lib/docs-version";
import { siteConfig } from "@/lib/metadata";
import { openapi } from "@/lib/openapi";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  url: (slugs) => docsPath(...slugs),
  // `openapi.loaderPlugin()` decorates generated API pages in the page tree with
  // their HTTP method badge (GET/POST/...).
  plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
});

export type DocsPage = InferPageType<typeof source>;

export function getPage(slugs: string[] | undefined): DocsPage | undefined {
  return source.getPage(stripDocsVersion(slugs));
}

export function getPageByHref(href: string) {
  const result = source.getPageByHref(versionedDocsHref(href));
  if (!result) {
    return;
  }

  const page = getPage(result.page.slugs);
  if (!page) {
    return;
  }

  return { ...result, page };
}

export function generateDocsParams() {
  return source
    .generateParams()
    .map(({ slug }) => ({ slug: [DOCS_VERSION, ...slug] }));
}

export function getPageImage(page: DocsPage) {
  const segments = [DOCS_VERSION, ...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

/**
 * The first `structuredData.contents[].content` string fumadocs-openapi wrote,
 * or "" if this page has none. Narrows step by step because `_openapi` is typed
 * as an open record — the generator owns its shape, not this file.
 */
function specDescription(openapi: Record<string, unknown> | undefined): string {
  const structured = openapi?.structuredData;
  if (typeof structured !== "object" || structured === null) {
    return "";
  }
  const { contents } = structured as { contents?: unknown };
  if (!Array.isArray(contents)) {
    return "";
  }
  const [first] = contents;
  if (typeof first !== "object" || first === null) {
    return "";
  }
  const { content } = first as { content?: unknown };
  return typeof content === "string" ? content : "";
}

export async function getLLMText(page: DocsPage) {
  const processed = await page.data.getText("processed");

  // For API reference pages, extract the HTTP method and path from frontmatter
  // to produce a structured header that agents can parse. `_openapi` is an open
  // record on the schema, so each field is narrowed rather than asserted.
  const openapi = page.data._openapi;
  const method = openapi?.method;
  const methodLine = typeof method === "string" ? `Method: ${method.toUpperCase()}` : "";
  const descriptionFromSpec = specDescription(openapi);

  // Tags for agent-optimized discoverability. Read straight off `page.data`,
  // which IS the parsed frontmatter — the previous `page.data.frontmatter.tags`
  // was a level too deep, so it was always undefined and this line never
  // rendered on any of the 33 pages that declare tags.
  const tags = page.data.tags;
  const tagsLine = tags?.length ? `Tags: ${tags.join(", ")}` : "";

  const header = [
    `Source: ${siteConfig.url}${page.url}`,
    `Title: ${page.data.title}`,
    methodLine ? `${methodLine}` : "",
    `Description: ${page.data.description || descriptionFromSpec || "(no description)"}`,
    tagsLine,
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n${processed}`;
}
