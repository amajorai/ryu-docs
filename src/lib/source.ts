import { docs } from "collections/server";
import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { z } from "zod";
import { hasLocalizedDocsContent } from "@/lib/canonical-docs";
import type { CatalogAttributes } from "@/lib/catalog";
import {
  canonicalDocsHref,
  docsPath,
  stripDocsVersion,
} from "@/lib/docs-version";
import { DEFAULT_DOCS_LOCALE, i18n } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";
import { openapi } from "@/lib/openapi";
import {
  type OperationReference,
  parseOperationReference,
  renderOperationReferenceMarkdown,
  stripGeneratedScaffold,
} from "@/lib/openapi-markdown";

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

/** Preserve fallback navigation while attributing English content to its source. */
export function getCanonicalDocsPage(page: DocsPage): DocsPage {
  return hasLocalizedDocsContent(page)
    ? page
    : (getPage(page.slugs, DEFAULT_DOCS_LOCALE) ?? page);
}

export function getPageByHref(
  href: string,
  locale: string = DEFAULT_DOCS_LOCALE,
) {
  const result = source.getPageByHref(canonicalDocsHref(href), {
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
  return source.generateParams("slug", "lang");
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
    return param.lang === DEFAULT_DOCS_LOCALE || param.slug.length <= 1;
  });
}

export function getPageImage(page: DocsPage) {
  const locale =
    page.locale && page.locale !== i18n.defaultLanguage ? [page.locale] : [];
  const segments = [...locale, ...page.slugs, "image-v4.png"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

const specContentsSchema = z.object({
  structuredData: z.object({ contents: z.array(z.unknown()) }),
});
const specContentSchema = z.object({ content: z.string() });

/** Read the first description from the generator's open metadata boundary. */
export function specDescription(openapi: DocsPage["data"]["_openapi"]): string {
  const parsed = specContentsSchema.safeParse(openapi);
  if (!parsed.success) {
    return "";
  }
  const first = specContentSchema.safeParse(
    parsed.data.structuredData.contents[0],
  );
  return first.success ? first.data.content : "";
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

/** The `APIPage` operations a generated OpenAPI page renders, from its raw MDX. */
async function getOperationReference(
  page: DocsPage,
): Promise<OperationReference | null> {
  if (!page.data._openapi) {
    return null;
  }
  return parseOperationReference(await page.data.getText("raw"));
}

/**
 * The operation summary rendered from the vendored spec. A generated page's
 * body is only the `APIPage` layout, so without this its Markdown projection
 * has no path, parameters, body, or responses. A spec the OpenAPI server
 * cannot load leaves the projection as it was rather than failing the route.
 */
async function getOperationMarkdown(
  reference: OperationReference | null,
): Promise<string> {
  if (!reference) {
    return "";
  }
  try {
    const { bundled } = await openapi.getSchema(reference.document);
    return renderOperationReferenceMarkdown(bundled, reference);
  } catch {
    return "";
  }
}

export async function getLLMText(page: DocsPage) {
  const canonicalPage = getCanonicalDocsPage(page);
  const processed = await getProcessedMarkdown(canonicalPage);
  const operationReference = await getOperationReference(canonicalPage);
  const operationMarkdown = await getOperationMarkdown(operationReference);
  const pathLine =
    operationReference?.operations.length === 1
      ? `Path: ${operationReference.operations[0]?.path ?? ""}`
      : "";

  // For API reference pages, extract the HTTP method and path from frontmatter
  // to produce a structured header that agents can parse. `_openapi` is an open
  // record on the schema, so each field is narrowed rather than asserted.
  const openapi = canonicalPage.data._openapi;
  const method = z.string().safeParse(openapi?.method);
  const methodLine = method.success
    ? `Method: ${method.data.toUpperCase()}`
    : "";
  const descriptionFromSpec = specDescription(openapi);

  // Tags for agent-optimized discoverability. Read straight off `page.data`,
  // which IS the parsed frontmatter — the previous `page.data.frontmatter.tags`
  // was a level too deep, so it was always undefined and this line never
  // rendered on any of the 33 pages that declare tags.
  const tags = canonicalPage.data.tags;
  const tagsLine = tags?.length ? `Tags: ${tags.join(", ")}` : "";
  const catalog = canonicalPage.data.catalog;
  const catalogLine = catalog
    ? `Catalog: ${catalog.kind} ${catalog.id} v${catalog.version}; official=${catalog.official}; builtIn=${catalog.builtIn}; system=${catalog.system}; preInstalled=${catalog.preInstalled}; stability=${catalog.stability}; hidden=${catalog.hidden}; surfaces=${catalogSurfaceSummary(catalog.surfaces)}`
    : "";

  const header = [
    `Source: ${siteConfig.url}${canonicalPage.url}`,
    `Title: ${canonicalPage.data.title}`,
    methodLine ? `${methodLine}` : "",
    pathLine,
    `Description: ${canonicalPage.data.description || descriptionFromSpec || "(no description)"}`,
    tagsLine,
    catalogLine,
  ]
    .filter(Boolean)
    .join("\n");

  // A matched operation page's processed body is the generator's comment and
  // `Layout` block plus any prose; keep only the prose before the operation.
  const prose = operationReference
    ? stripGeneratedScaffold(processed)
    : processed;
  const body = operationMarkdown
    ? [prose, operationMarkdown].filter(Boolean).join("\n\n")
    : prose;
  return `${header}\n\n${body}`;
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
