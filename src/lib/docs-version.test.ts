import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  ARCHIVED_DOCS_VERSIONS,
  archivedDocsUrl,
  DOCS_ENTRY_PATH,
  DOCS_VERSION,
  DOCS_VERSIONS,
  docsPath,
  docsPathForLocale,
  docsSegmentsFromPathname,
  isDocsPathname,
  isVersionSegment,
  localizeDocsHref,
  stripDocsVersion,
  versionedDocsHref,
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
  test("offers only the current deployment", () => {
    expect(ARCHIVED_DOCS_VERSIONS).toEqual([]);
    expect(DOCS_VERSIONS).toEqual([
      {
        slug: DOCS_VERSION,
        title: DOCS_VERSION,
      },
    ]);
    expect(archivedDocsUrl("0.1.4")).toBeUndefined();
  });

  test("keeps current and legacy paths on the same content tree", () => {
    expect(docsPath("start-here")).toBe(`/docs/${DOCS_VERSION}/start-here`);
    expect(docsPathForLocale("es", "start-here")).toBe(
      `/es/docs/${DOCS_VERSION}/start-here`,
    );
    expect(versionedDocsHref("/docs/start-here")).toBe(
      `/docs/${DOCS_VERSION}/start-here`,
    );
    expect(versionedDocsHref(`/docs/${DOCS_VERSION}/start-here`)).toBe(
      `/docs/${DOCS_VERSION}/start-here`,
    );
    expect(versionedDocsHref("/es/docs/start-here")).toBe(
      `/es/docs/${DOCS_VERSION}/start-here`,
    );
    expect(localizeDocsHref(`/docs/${DOCS_VERSION}/start-here`, "es")).toBe(
      `/es/docs/${DOCS_VERSION}/start-here`,
    );
    expect(stripDocsVersion([DOCS_VERSION, "start-here"])).toEqual([
      "start-here",
    ]);
    expect(
      docsSegmentsFromPathname(`/docs/${DOCS_VERSION}/start-here`),
    ).toEqual(["start-here"]);
    expect(
      docsSegmentsFromPathname(`/es/docs/${DOCS_VERSION}/start-here`),
    ).toEqual(["start-here"]);
    expect(isVersionSegment("0.1.4")).toBe(true);
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
    expect(isDocsPathname(`/ja/docs/${DOCS_VERSION}/start-here`)).toBe(true);
    expect(isDocsPathname("/")).toBe(false);
    expect(isDocsPathname("/es")).toBe(false);
    expect(isDocsPathname("/proof")).toBe(false);
    expect(isDocsPathname("/docsify")).toBe(false);
    expect(isDocsPathname(null)).toBe(false);
  });

  test("generated API pages use the current docs version", async () => {
    const files = await markdownFiles(API_REFERENCE_ROOT);
    const staleLinks: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const match of content.matchAll(/\/docs\/(\d+\.\d+\.\d+)\//gu)) {
        if (match[1] !== DOCS_VERSION) {
          staleLinks.push(
            `${path.relative(API_REFERENCE_ROOT, file)}:${match[1]}`,
          );
        }
      }
    }
    expect(staleLinks).toEqual([]);
  });
});
