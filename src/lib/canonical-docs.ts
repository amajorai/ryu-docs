import { z } from "zod";
import * as aliasesModule from "../../docs-route-aliases.json";
import { DEFAULT_DOCS_LOCALE } from "./i18n";

const docsRouteAliasSchema = z.object({ from: z.string(), to: z.string() });
const aliasCandidatesSchema = z.array(z.json());

// Bun's Fumadocs preload exposes JSON as a namespace with numeric keys while
// Next's bundler uses a default export. Normalize both supported module shapes.
const directAliases = aliasCandidatesSchema.safeParse(aliasesModule);
const defaultAliases = z
  .object({ default: aliasCandidatesSchema })
  .safeParse(aliasesModule);
const candidates = directAliases.success
  ? directAliases.data
  : defaultAliases.success
    ? defaultAliases.data.default
    : Object.values(aliasesModule);
export const docsRouteAliases = candidates.flatMap((candidate) => {
  const alias = docsRouteAliasSchema.safeParse(candidate);
  return alias.success ? [alias.data] : [];
});

const redirectedPaths = new Set(docsRouteAliases.map((alias) => alias.from));

/** Compatibility URLs redirect at the server and must not be sitemap canonicals. */
export function isCanonicalDocsPage(slugs: readonly string[]): boolean {
  return !redirectedPaths.has(slugs.join("/"));
}

/** A fallback page has a locale URL but still contains the English source. */
export function hasLocalizedDocsContent(page: {
  locale?: string;
  path: string;
}): boolean {
  const locale = page.locale ?? DEFAULT_DOCS_LOCALE;
  return locale === DEFAULT_DOCS_LOCALE || page.path.endsWith(`.${locale}.mdx`);
}
