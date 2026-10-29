import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  canonicalDocsHref,
  DOCS_ENTRY_PATH,
  docsPath,
  docsPathForLocale,
  docsSegmentsFromPathname,
  isDocsPathname,
  isVersionSegment,
  localizeDocsHref,
  stripDocsVersion,
} from "./docs-version";

const API_REFERENCE_ROOT = path.resolve(
  import.meta.dir,
  "../../content/docs/extend/develop/api-reference",
);

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? markdownFiles(fullPath)
        : entry.name.endsWith(".mdx")
          ? [fullPath]
          : [];
    }),
  );
  return nested.flat();
}

describe("docs version policy", () => {
  test("builds docs paths without a version segment", () => {
    expect(docsPath()).toBe("/docs");
    expect(docsPath("start-here")).toBe("/docs/start-here");
    expect(docsPathForLocale("en", "start-here")).toBe("/docs/start-here");
    expect(docsPathForLocale("es", "start-here")).toBe("/es/docs/start-here");
  });

  test("drops the version segment of links published by older releases", () => {
    expect(canonicalDocsHref("/docs/start-here")).toBe("/docs/start-here");
    expect(canonicalDocsHref("/docs/0.4.0/start-here")).toBe(
      "/docs/start-here",
    );
    expect(canonicalDocsHref("/es/docs/0.1.2/start-here#install")).toBe(
      "/es/docs/start-here#install",
    );
    expect(canonicalDocsHref("/pricing")).toBe("/pricing");
    expect(canonicalDocsHref("#install")).toBe("#install");
    expect(localizeDocsHref("/docs/0.4.0/start-here", "es")).toBe(
      "/es/docs/start-here",
    );
    expect(localizeDocsHref("/fr/docs/start-here?q=1", "es")).toBe(
      "/es/docs/start-here?q=1",
    );
    expect(stripDocsVersion(["0.4.0", "start-here"])).toEqual(["start-here"]);
    expect(stripDocsVersion(["start-here"])).toEqual(["start-here"]);
    expect(stripDocsVersion(undefined)).toEqual([]);
    expect(docsSegmentsFromPathname("/docs/start-here")).toEqual([
      "start-here",
    ]);
    expect(docsSegmentsFromPathname("/es/docs/0.4.0/start-here")).toEqual([
      "start-here",
    ]);
    expect(isVersionSegment("0.1.4")).toBe(true);
    expect(isVersionSegment("start-here")).toBe(false);
  });

  test("redirects every version-shaped docs URL to its unversioned page", async () => {
    const { default: config } = await import("../../next.config.mjs");
    if (!config.redirects) {
      throw new Error("next.config.mjs defines no redirects");
    }
    const redirects = await config.redirects();
    const source = (pattern: string) =>
      redirects.find((redirect) => redirect.source === pattern);
    const version = String.raw`[0-9]+\.[0-9]+\.[0-9]+`;
    const locales = "en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar";
    expect(source(`/docs/:version(${version})/:path+`)).toEqual({
      source: `/docs/:version(${version})/:path+`,
      destination: "/docs/:path+",
      permanent: true,
    });
    expect(source(`/docs/:version(${version})`)?.destination).toBe(
      DOCS_ENTRY_PATH,
    );
    expect(
      source(`/:locale(${locales})/docs/:version(${version})/:path+`)
        ?.destination,
    ).toBe("/:locale/docs/:path+");
    expect(
      redirects.some(
        (redirect) =>
          redirect.destination.includes(":version") ||
          /\/docs\/\d+\.\d+\.\d+/u.test(redirect.destination),
      ),
    ).toBe(false);
  });

  test("links the header straight to the bare /docs redirect target", async () => {
    // A header link to "/docs" costs every reader a redirect round trip, so it
    // targets DOCS_ENTRY_PATH; keep that equal to the redirect's destination.
    const config = await readFile(
      path.resolve(import.meta.dir, "../../next.config.mjs"),
      "utf8",
    );
    const redirect = config.match(
      /source: "\/docs",\s*destination: "([^"]+)"/u,
    );
    expect(redirect?.[1]).toBe(DOCS_ENTRY_PATH);
    expect(localizeDocsHref(DOCS_ENTRY_PATH, "en")).toBe(DOCS_ENTRY_PATH);
    expect(localizeDocsHref(DOCS_ENTRY_PATH, "es")).toBe(
      `/es${DOCS_ENTRY_PATH}`,
    );
  });

  test("recognizes docs routes with or without a locale prefix", () => {
    expect(isDocsPathname(DOCS_ENTRY_PATH)).toBe(true);
    expect(isDocsPathname("/docs")).toBe(true);
    expect(isDocsPathname("/ja/docs/start-here")).toBe(true);
    expect(isDocsPathname("/")).toBe(false);
    expect(isDocsPathname("/es")).toBe(false);
    expect(isDocsPathname("/proof")).toBe(false);
    expect(isDocsPathname("/docsify")).toBe(false);
    expect(isDocsPathname(null)).toBe(false);
  });

  test("generated API pages link to unversioned docs URLs", async () => {
    const files = await markdownFiles(API_REFERENCE_ROOT);
    const versionedLinks: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const match of content.matchAll(/\/docs\/(\d+\.\d+\.\d+)\//gu)) {
        versionedLinks.push(
          `${path.relative(API_REFERENCE_ROOT, file)}:${match[1]}`,
        );
      }
    }
    expect(versionedLinks).toEqual([]);
  });
});
