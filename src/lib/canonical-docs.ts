import aliases from "../../docs-route-aliases.json";

const redirectedPaths = new Set(aliases.map((alias) => alias.from));

/** Compatibility URLs redirect at the server and must not be sitemap canonicals. */
export function isCanonicalDocsPage(slugs: readonly string[]): boolean {
  return !redirectedPaths.has(slugs.join("/"));
}
