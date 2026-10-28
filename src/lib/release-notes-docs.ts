import type { AdvancedIndex } from "fumadocs-core/search/server";

import type { DocsPage } from "@/lib/source";

export const RELEASE_NOTES_SLUG = "release-notes";

/** How many of the newest release pages /llms-sections/release-notes inlines. */
export const RELEASE_NOTES_LLMS_FULL_PAGES = 3;

export function isReleaseNotesPage(slugs: readonly string[]): boolean {
  return slugs[0] === RELEASE_NOTES_SLUG;
}

/**
 * Search index entry for one docs page.
 *
 * Release notes are generated changelogs of about 2 MB across 43 pages, with
 * thousands of headings. `createFromSource` indexes every page once per locale
 * (twelve, each falling back to the English page), so indexing their bodies
 * would hold that text twelve times in memory and slow every cold start. A
 * release page is found by its title and description (the version and date);
 * the page itself carries the detail.
 */
export function buildDocsSearchIndex(page: DocsPage): AdvancedIndex {
  const entry = {
    id: page.url,
    url: page.url,
    title: page.data.title,
    description: page.data.description,
  };
  if (isReleaseNotesPage(page.slugs)) {
    return { ...entry, structuredData: { headings: [], contents: [] } };
  }
  return { ...entry, structuredData: page.data.structuredData };
}

const VERSION_SLUG = /^v(\d+)\.(\d+)\.(\d+)$/;

function compareVersionSlugsDescending(a: string, b: string): number {
  const left = VERSION_SLUG.exec(a)?.slice(1).map(Number) ?? [];
  const right = VERSION_SLUG.exec(b)?.slice(1).map(Number) ?? [];
  for (let i = 0; i < 3; i++) {
    const difference = (right[i] ?? 0) - (left[i] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/**
 * Split the release notes pages for /llms-sections/release-notes.
 *
 * Returning all 43 pages is a response of about 2 MB, which defeats excluding
 * the archive from llms-full.txt. The section index and the newest releases are
 * inlined; every older release is a link the agent can fetch on its own.
 */
export function splitReleaseNotesForLlms<
  T extends { slugs: readonly string[] },
>(pages: readonly T[], fullReleases = RELEASE_NOTES_LLMS_FULL_PAGES) {
  const index = pages.filter((page) => page.slugs.length < 2);
  const releases = pages
    .filter((page) => page.slugs.length >= 2)
    .sort((a, b) =>
      compareVersionSlugsDescending(a.slugs[1] ?? "", b.slugs[1] ?? ""),
    );
  return {
    full: [...index, ...releases.slice(0, fullReleases)],
    linked: releases.slice(fullReleases),
  };
}
