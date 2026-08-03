export const DOCS_VERSION = "0.1.1" as const;

export const DOCS_VERSIONS = [
  {
    slug: DOCS_VERSION,
    title: `v${DOCS_VERSION}`,
    description: "Ryu docs and API reference",
  },
] as const;

export function docsPathForVersion(
  version: string,
  ...segments: string[]
): string {
  const suffix = segments.filter(Boolean).join("/");
  return `/docs/${version}${suffix ? `/${suffix}` : ""}`;
}

export function docsPath(...segments: string[]): string {
  return docsPathForVersion(DOCS_VERSION, ...segments);
}

export function isDocsVersionSlug(slug: string | undefined): boolean {
  return DOCS_VERSIONS.some((version) => version.slug === slug);
}

export function versionedDocsHref(href: string): string;
export function versionedDocsHref(href: undefined): undefined;
export function versionedDocsHref(href: string | undefined): string | undefined;
export function versionedDocsHref(
  href: string | undefined,
): string | undefined {
  if (!href || (href !== "/docs" && !href.startsWith("/docs/"))) {
    return href;
  }

  const match = href.match(/^([^?#]*)([?#].*)?$/);
  if (!match) {
    return href;
  }

  const [, pathname, suffix = ""] = match;
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts[0] === "docs" && isDocsVersionSlug(pathParts[1])) {
    return href;
  }

  return `${docsPath()}${pathname.slice("/docs".length)}${suffix}`;
}

export function stripDocsVersion(slugs: string[] | undefined): string[] {
  const normalized = slugs ?? [];
  return isDocsVersionSlug(normalized[0]) ? normalized.slice(1) : normalized;
}

export function docsSegmentsFromPathname(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "docs") {
    return [];
  }

  return isDocsVersionSlug(parts[1]) ? parts.slice(2) : parts.slice(1);
}
