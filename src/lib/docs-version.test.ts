import { describe, expect, test } from "bun:test";

import {
  ARCHIVED_DOCS_VERSIONS,
  DOCS_VERSION,
  DOCS_VERSIONS,
  archivedDocsUrl,
  docsPath,
  docsSegmentsFromPathname,
  isVersionSegment,
  stripDocsVersion,
  versionedDocsHref,
} from "./docs-version";

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
    expect(versionedDocsHref("/docs/start-here")).toBe(
      `/docs/${DOCS_VERSION}/start-here`,
    );
    expect(versionedDocsHref(`/docs/${DOCS_VERSION}/start-here`)).toBe(
      `/docs/${DOCS_VERSION}/start-here`,
    );
    expect(stripDocsVersion([DOCS_VERSION, "start-here"])).toEqual([
      "start-here",
    ]);
    expect(docsSegmentsFromPathname(`/docs/${DOCS_VERSION}/start-here`)).toEqual([
      "start-here",
    ]);
    expect(isVersionSegment("0.1.4")).toBe(true);
  });
});
