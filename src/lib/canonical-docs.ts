import * as aliasesModule from "../../docs-route-aliases.json";

type DocsRouteAlias = { from: string; to: string };

function isDocsRouteAlias(value: unknown): value is DocsRouteAlias {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.from === "string" && typeof candidate.to === "string";
}

// Bun's Fumadocs preload exposes JSON as a namespace with numeric keys while
// Next's bundler uses a default export. Normalize both shapes to the same alias
// list instead of relying on a loader-specific default export.
const namespace = aliasesModule as unknown as Record<string, unknown>;
const candidates = Array.isArray(aliasesModule)
  ? aliasesModule
  : Array.isArray(namespace.default)
    ? namespace.default
    : Object.values(namespace);
export const docsRouteAliases = candidates.filter(isDocsRouteAlias);

const redirectedPaths = new Set(docsRouteAliases.map((alias) => alias.from));

/** Compatibility URLs redirect at the server and must not be sitemap canonicals. */
export function isCanonicalDocsPage(slugs: readonly string[]): boolean {
  return !redirectedPaths.has(slugs.join("/"));
}
