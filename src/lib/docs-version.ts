import { DEFAULT_DOCS_LOCALE, isDocsLocale } from "./i18n";

/**
 * Ryu's public docs serve only the current release, so docs URLs carry no
 * version segment: `/docs/start-here`, `/es/docs/start-here`.
 *
 * Earlier releases published links shaped like `/docs/0.4.0/start-here`. No
 * archive of those releases is kept, so next.config.mjs permanently redirects
 * any version-shaped first segment to the same page without it, and the helpers
 * below drop such a segment wherever an old href or pathname still carries one.
 */

/** Matches a bare semver-ish version segment, e.g. `0.1.1`. */
const VERSION_SEGMENT_RE = /^\d+\.\d+\.\d+$/;

/** True for a path segment shaped like a release version, e.g. `0.4.0`. */
export function isVersionSegment(slug: string | undefined): boolean {
  return slug !== undefined && VERSION_SEGMENT_RE.test(slug);
}

export function docsPath(...segments: string[]): string {
  const suffix = segments.filter(Boolean).join("/");
  return `/docs${suffix ? `/${suffix}` : ""}`;
}

/** Add the visible locale prefix for a non-default docs page. */
export function docsPathForLocale(
  locale: string,
  ...segments: string[]
): string {
  const path = docsPath(...segments);
  return locale === DEFAULT_DOCS_LOCALE ? path : `/${locale}${path}`;
}

/** Next's default-locale rewrite must select the same tree as its public URL. */
export function normalizeDocsNavigationPathname(pathname: string): string {
  const hiddenDocsPrefix = `/${DEFAULT_DOCS_LOCALE}/docs`;
  return pathname === hiddenDocsPrefix ||
    pathname.startsWith(`${hiddenDocsPrefix}/`)
    ? pathname.slice(DEFAULT_DOCS_LOCALE.length + 1)
    : pathname;
}

/** Drop a legacy version segment from the docs part of a path. */
function withoutVersionSegment(parts: string[]): string[] {
  return isVersionSegment(parts[0]) ? parts.slice(1) : parts;
}

/**
 * Canonicalize an internal docs href: a legacy `/docs/<version>/...` link loses
 * its version segment. Non-docs hrefs, anchors, and queries pass through.
 */
export function canonicalDocsHref(href: string): string;
export function canonicalDocsHref(href: undefined): undefined;
export function canonicalDocsHref(href: string | undefined): string | undefined;
export function canonicalDocsHref(
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
  if (pathParts[0] !== "docs" || !isVersionSegment(pathParts[1])) {
    return href;
  }

  const path = docsPath(...pathParts.slice(2));
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

  const segments = withoutVersionSegment(parts.slice(1));
  return `${docsPathForLocale(locale, ...segments)}${suffix}`;
}

/** Page slugs with any legacy version segment removed. */
export function stripDocsVersion(slugs: string[] | undefined): string[] {
  return withoutVersionSegment(slugs ?? []);
}

export function docsSegmentsFromPathname(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  const offset = isDocsLocale(parts[0]) ? 1 : 0;
  if (parts[offset] !== "docs") {
    return [];
  }

  return withoutVersionSegment(parts.slice(offset + 1));
}

/** The page the bare "/docs" route redirects to (next.config.mjs). */
export const DOCS_ENTRY_PATH = docsPath("start-here");

/** True on any docs route, with or without a visible locale prefix. */
export function isDocsPathname(pathname: string | null | undefined): boolean {
  const parts = (pathname ?? "").split("/").filter(Boolean);
  return parts[isDocsLocale(parts[0]) ? 1 : 0] === "docs";
}
