import { docs } from "collections/server";
import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import type { CatalogAttributes } from "@/lib/catalog";
import {
  DOCS_VERSION,
  docsPath,
  stripDocsVersion,
  versionedDocsHref,
} from "@/lib/docs-version";
import { DEFAULT_DOCS_LOCALE, i18n } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";
import { openapi } from "@/lib/openapi";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsPath(),
  i18n,
  source: docs.toFumadocsSource(),
  // `openapi.loaderPlugin()` decorates generated API pages in the page tree with
  // their HTTP method badge (GET/POST/...).
  plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
});

export type DocsPage = InferPageType<typeof source>;

export function getPage(
  slugs: string[] | undefined,
  locale: string = DEFAULT_DOCS_LOCALE,
): DocsPage | undefined {
  return source.getPage(stripDocsVersion(slugs), locale);
}

export function getPageByHref(
  href: string,
  locale: string = DEFAULT_DOCS_LOCALE,
) {
  const result = source.getPageByHref(versionedDocsHref(href), {
    language: locale,
  });
  if (!result) {
    return;
  }

  const page = getPage(result.page.slugs, locale);
  if (!page) {
    return;
  }

  return { ...result, page };
}

export function generateDocsParams() {
  return source
    .generateParams("slug", "lang")
    .map(({ slug, lang }) => ({ lang, slug: [DOCS_VERSION, ...slug] }));
}

// Generated API pages and deep localized copies repeat large schema/navigation
// payloads. Keep their complete URL inventory, but render/cache those pages on
// first request instead of duplicating tens of gigabytes in every deployment
// artifact. The default locale remains fully eager for stable canonical pages;
// localized root pages stay eager as lightweight landings.
export function generateDocsPrerenderParams() {
  return generateDocsParams().filter((param) => {
    const page = getPage(param.slug, param.lang);
    // `fumadocs-openapi` marks operation pages with `_openapi` in the parsed
    // page metadata. Use that source-owned marker instead of coupling this build
    // policy to the current Core/Gateway directory layout.
    if (page?.data._openapi) {
      return false;
    }
    return param.lang === DEFAULT_DOCS_LOCALE || param.slug.length <= 2;
  });
}

export function getPageImage(page: DocsPage) {
  const locale =
    page.locale && page.locale !== i18n.defaultLanguage ? [page.locale] : [];
  const segments = [...locale, DOCS_VERSION, ...page.slugs, "image-v4.png"];

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

function catalogSurfaceSummary(
  surfaces: CatalogAttributes["surfaces"],
): string {
  if (surfaces === undefined) {
    return "all (default)";
  }
  const entries = Object.entries(surfaces);
  return entries.length > 0
    ? entries
        .map(([surface, support]) => `${surface}:${support || "none"}`)
        .join(",")
    : "none declared";
}

export async function getLLMText(page: DocsPage) {
  const processed = await getProcessedMarkdown(page);

  // For API reference pages, extract the HTTP method and path from frontmatter
  // to produce a structured header that agents can parse. `_openapi` is an open
  // record on the schema, so each field is narrowed rather than asserted.
  const openapi = page.data._openapi;
  const method = openapi?.method;
  const methodLine =
    typeof method === "string" ? `Method: ${method.toUpperCase()}` : "";
  const descriptionFromSpec = specDescription(openapi);

  // Tags for agent-optimized discoverability. Read straight off `page.data`,
  // which IS the parsed frontmatter — the previous `page.data.frontmatter.tags`
  // was a level too deep, so it was always undefined and this line never
  // rendered on any of the 33 pages that declare tags.
  const tags = page.data.tags;
  const tagsLine = tags?.length ? `Tags: ${tags.join(", ")}` : "";
  const catalog = page.data.catalog;
  const catalogLine = catalog
    ? `Catalog: ${catalog.kind} ${catalog.id} v${catalog.version}; official=${catalog.official}; builtIn=${catalog.builtIn}; system=${catalog.system}; preInstalled=${catalog.preInstalled}; stability=${catalog.stability}; hidden=${catalog.hidden}; surfaces=${catalogSurfaceSummary(catalog.surfaces)}`
    : "";

  const header = [
    `Source: ${siteConfig.url}${page.url}`,
    `Title: ${page.data.title}`,
    methodLine ? `${methodLine}` : "",
    `Description: ${page.data.description || descriptionFromSpec || "(no description)"}`,
    tagsLine,
    catalogLine,
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n${processed}`;
}

/**
 * Keep the Markdown projections useful in lightweight test/CLI runtimes that
 * load an older generated `.source` without processed Markdown metadata. The
 * normal Fumadocs build always takes the processed branch.
 */
async function getProcessedMarkdown(page: DocsPage): Promise<string> {
  try {
    return await page.data.getText("processed");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("includeProcessedMarkdown")
    ) {
      return page.data.getText("raw");
    }
    throw error;
  }
}
