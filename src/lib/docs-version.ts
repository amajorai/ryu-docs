import { DEFAULT_DOCS_LOCALE, isDocsLocale } from "./i18n";

export const DOCS_VERSION = "0.4.0" as const;

/**
 * Ryu's public docs intentionally serve one current version.
 *
 * The version segment remains in the URL so links can identify the release that
 * produced them, but it is a label for this deployment rather than a selector
 * for a fleet of historical sites. Keeping archives live would require one
 * separately built deployment per release and would grow the production surface
 * without a bounded retention policy.
 */
export const ARCHIVED_DOCS_VERSIONS: readonly {
  readonly slug: string;
  readonly url: string;
}[] = [];

/** Matches a bare semver-ish version segment, e.g. `0.1.1`. */
const VERSION_SEGMENT_RE = /^\d+\.\d+\.\d+$/;

/**
 * True for a path segment that is SHAPED like a version, whoever owns it.
 *
 * Distinct from {@link isDocsVersionSlug}, which answers "does THIS deployment
 * serve it". The difference is what keeps old links alive: a stale version
 * segment has to be recognised as a version so it can be stripped and redirected,
 * rather than falling through to content resolution and 404ing.
 */
export function isVersionSegment(slug: string | undefined): boolean {
  return typeof slug === "string" && VERSION_SEGMENT_RE.test(slug);
}

/**
 * Compatibility seam for stale-link routing. Latest-only mode intentionally
 * returns `undefined` for every historical version.
 */
export function archivedDocsUrl(slug: string): string | undefined {
  return ARCHIVED_DOCS_VERSIONS.find((v) => v.slug === slug)?.url;
}

/**
 * The one version the switcher offers. `stripDocsVersion` still drops a version
 * segment before resolving, so `/docs/<current>/foo` and `/docs/foo` are the
 * same page. A stale version-shaped URL is redirected to that current page.
 */
export const DOCS_VERSIONS: readonly {
  readonly slug: string;
  readonly title: string;
  /** Reserved for compatibility with older callers; archives are disabled. */
  readonly externalUrl?: string;
}[] = [
  {
    slug: DOCS_VERSION,
    // Bare number, no "v" prefix — the switcher reads "0.4.0", not "v0.4.0".
    title: DOCS_VERSION,
  },
];

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

/** Add the visible locale prefix for a non-default docs page. */
export function docsPathForLocale(
  locale: string,
  ...segments: string[]
): string {
  const path = docsPath(...segments);
  return locale === DEFAULT_DOCS_LOCALE ? path : `/${locale}${path}`;
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
  if (!href) {
    return href;
  }

  const match = href.match(/^([^?#]*)([?#].*)?$/);
  if (!match) {
    return href;
  }

  const [, pathname, suffix = ""] = match;
  const pathParts = pathname.split("/").filter(Boolean);
  const locale = isDocsLocale(pathParts[0]) ? pathParts.shift() : undefined;
  if (pathParts[0] !== "docs") {
    return href;
  }

  if (isDocsVersionSlug(pathParts[1])) {
    return href;
  }

  const segments = pathParts.slice(1);
  const path = docsPath(...segments);
  return `${locale ? `/${locale}` : ""}${path}${suffix}`;
}

/**
 * Normalize an internal docs href and apply the locale of the current route.
 * The helper is used by client links because Fumadocs page URLs are generated
 * on the server while the active locale is a dynamic route segment.
 */
export function localizeDocsHref(
  href: string | undefined,
  locale: string | undefined,
): string | undefined {
  if (!href || !isDocsLocale(locale)) {
    return href;
  }

  const match = href.match(/^([^?#]*)([?#].*)?$/);
  if (!match) {
    return href;
  }

  const [, pathname, suffix = ""] = match;
  const parts = pathname.split("/").filter(Boolean);
  if (isDocsLocale(parts[0])) {
    parts.shift();
  }
  if (parts[0] !== "docs") {
    return href;
  }

  const segments = isDocsVersionSlug(parts[1])
    ? parts.slice(2)
    : parts.slice(1);
  return `${docsPathForLocale(locale, ...segments)}${suffix}`;
}

export function stripDocsVersion(slugs: string[] | undefined): string[] {
  const normalized = slugs ?? [];
  return isDocsVersionSlug(normalized[0]) ? normalized.slice(1) : normalized;
}

export function docsSegmentsFromPathname(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  const offset = isDocsLocale(parts[0]) ? 1 : 0;
  if (parts[offset] !== "docs") {
    return [];
  }

  return isDocsVersionSlug(parts[offset + 1])
    ? parts.slice(offset + 2)
    : parts.slice(offset + 1);
}
