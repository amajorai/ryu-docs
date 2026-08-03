export const DOCS_VERSION = "0.1.2" as const;

/**
 * Versions served from their OWN deployment, cut as a `docs/<version>` branch at
 * release time (`scripts/release/cut-docs-branch.sh`).
 *
 * This is the only honest way to serve old docs: a build of this repo contains
 * exactly one copy of the content, so an "older version" rendered from it would
 * describe today's software under yesterday's number. A branch freezes the
 * content with the release, and the switcher links out to where that branch is
 * deployed.
 *
 * Entries are absolute URLs for that reason — they leave this deployment. Add one
 * when a version's branch is deployed; never add a version that has no site, or
 * the switcher offers a dead link.
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
 * The archived deployment for a version slug, if there is one.
 *
 * A stale link should land on the same page in the docs that actually match its
 * version when that site exists, and fall back to the current version otherwise —
 * losing the version but never the reader.
 */
export function archivedDocsUrl(slug: string): string | undefined {
  return ARCHIVED_DOCS_VERSIONS.find((v) => v.slug === slug)?.url;
}

/**
 * Every version the switcher offers: the one THIS deployment serves, plus each
 * archived release that has its own deployment.
 *
 * # How multi-version actually works here
 *
 * A build serves exactly one version's content. `stripDocsVersion` drops the
 * version segment before resolving, so `/docs/<current>/foo` and `/docs/foo` are
 * the same page — within a deployment, the version in the URL is a label.
 *
 * History therefore does not come from this tree; it comes from
 * {@link ARCHIVED_DOCS_VERSIONS}, each entry a `docs/<version>` branch deployed
 * as its own site (`scripts/release/cut-docs-branch.sh`). That is the only
 * arrangement in which an old version's docs describe the old software, which is
 * the entire point of versioning them.
 *
 * # Stale links do not 404 any more
 *
 * They used to, and worse: the catch-all redirect carried the stale version
 * segment along, turning `/docs/0.1.1/start-here` into
 * `/docs/<current>/0.1.1/start-here`, which resolves to nothing. Every deep link
 * published under a release died at the next bump. The segment is now stripped
 * and the reader is sent to that version's archive when one exists, or to the
 * same page on the current version when it does not.
 */
export const DOCS_VERSIONS: readonly {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  /** Set for archived versions: the switcher links OUT to that deployment. */
  readonly externalUrl?: string;
}[] = [
  {
    slug: DOCS_VERSION,
    // Bare number, no "v" prefix — the switcher reads "0.1.2", not "v0.1.2".
    title: DOCS_VERSION,
    description: "Ryu docs and API reference",
  },
  ...ARCHIVED_DOCS_VERSIONS.map((v) => ({
    slug: v.slug,
    title: v.slug,
    description: "Archived release",
    externalUrl: v.url,
  })),
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
