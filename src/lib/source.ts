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

export async function getLLMText(page: DocsPage) {
  const processed = await page.data.getText("processed");

  // For API reference pages, extract the HTTP method and path from frontmatter
  // to produce a structured header that agents can parse.
  const openapi = (page.data as Record<string, unknown>)._openapi as
    | {
        method?: string;
        structuredData?: { contents?: Array<{ content?: string }> };
      }
    | undefined;

  const methodLine = openapi?.method
    ? `Method: ${openapi.method.toUpperCase()}`
    : "";
  const descriptionFromSpec =
    openapi?.structuredData?.contents?.[0]?.content ?? "";

  // Extract tags from frontmatter for agent-optimized discoverability
  const frontmatter = (page.data as Record<string, unknown>).frontmatter as
    | { tags?: string[] }
    | undefined;
  const tags = frontmatter?.tags;
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
