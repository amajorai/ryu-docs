import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { docsPath } from "@/lib/docs-version";
import { DEFAULT_DOCS_LOCALE, DOCS_LANGUAGES } from "@/lib/i18n";

import { GET } from "./route";

// Run this from apps/fumadocs (`bun run test`): its bunfig.toml preloads the MDX
// compiler that produces each page's search data, so from the repository root
// every query answers 500.
// The first query builds an Orama index per locale from the real MDX content,
// which takes about a minute on a loaded host.
const INDEX_BUILD_MS = 300_000;
const repoRoot = fileURLToPath(new URL("../../../../../../", import.meta.url));

const resultsSchema = z.array(
  z.object({
    breadcrumbs: z.array(z.string()).optional(),
    content: z.string(),
    id: z.string(),
    type: z.enum(["page", "heading", "text"]),
    url: z.string(),
  }),
);

/** What a visitor's browser sees: a status and, on success, the result list. */
async function search(params: Record<string, string>) {
  const url = new URL("https://docs.test/api/search");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  let response: Response;
  try {
    response = await GET(new Request(url));
  } catch {
    // Next.js answers a handler that throws with a 500.
    return { results: [], status: 500 };
  }
  return {
    results: resultsSchema.parse(await response.json()),
    status: response.status,
  };
}

function localeDocsPath(locale: string): string {
  return locale === DEFAULT_DOCS_LOCALE
    ? docsPath()
    : `/${locale}${docsPath()}`;
}

describe("docs search route", () => {
  test("answers a missing or empty query with an empty list", async () => {
    expect(await search({})).toEqual({ results: [], status: 200 });
    expect(await search({ query: "" })).toEqual({ results: [], status: 200 });
  });

  test(
    "finds the OpenRouter provider page and honours the result limit",
    async () => {
      const found = await search({ query: "OpenRouter" });
      expect(found.status).toBe(200);
      expect(found.results.map(({ url }) => url)).toContain(
        `${docsPath()}/providers/openrouter`,
      );

      const limited = await search({ limit: "2", query: "OpenRouter" });
      expect(limited.status).toBe(200);
      expect(limited.results).toHaveLength(2);
    },
    INDEX_BUILD_MS,
  );

  test(
    "searches in every docs locale the site serves",
    async () => {
      const outcomes = [];
      for (const locale of DOCS_LANGUAGES) {
        const { results, status } = await search({
          locale,
          query: "OpenRouter",
        });
        outcomes.push({
          locale,
          resultsInLocale:
            results.length > 0 &&
            results.every(({ url }) => url.startsWith(localeDocsPath(locale))),
          status,
        });
      }
      expect(outcomes).toEqual(
        DOCS_LANGUAGES.map((locale) => ({
          locale,
          resultsInLocale: true,
          status: 200,
        })),
      );
    },
    INDEX_BUILD_MS,
  );

  test(
    "answers an unknown locale with no results instead of an error",
    async () => {
      expect(await search({ locale: "xx", query: "OpenRouter" })).toEqual({
        results: [],
        status: 200,
      });
    },
    INDEX_BUILD_MS,
  );

  test(
    "returns only site-relative docs links, never a server file path",
    async () => {
      const { results, status } = await search({ query: "configuration" });
      expect(status).toBe(200);
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.url.startsWith(`${docsPath()}/`)).toBe(true);
        expect(JSON.stringify(result)).not.toContain(repoRoot);
      }
    },
    INDEX_BUILD_MS,
  );

  test(
    "finds a release by its version but does not index the changelog body",
    async () => {
      const byVersion = await search({ query: "Ryu v0.4.0" });
      expect(byVersion.status).toBe(200);
      expect(byVersion.results.map(({ url }) => url)).toContain(
        `${docsPath()}/release-notes/v0.4.0`,
      );

      // A sentence from inside the v0.4.0 changelog and a heading shared by
      // every release page: neither is indexed, so neither leads to a release.
      for (const query of [
        "Made live activity observability state truthful",
        "Patch changes",
      ]) {
        const { results, status } = await search({ query });
        expect(status).toBe(200);
        expect(
          results.filter(({ url }) =>
            url.startsWith(`${docsPath()}/release-notes/`),
          ),
        ).toEqual([]);
      }
    },
    INDEX_BUILD_MS,
  );
});
