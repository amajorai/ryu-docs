import { expect, test } from "bun:test";

import {
  isReleaseNotesPage,
  RELEASE_NOTES_LLMS_FULL_PAGES,
  splitReleaseNotesForLlms,
} from "@/lib/release-notes-docs";
import { source } from "@/lib/source";

const page = (...slugs: string[]) => ({ slugs });

test("only pages under the release-notes root are release notes", () => {
  expect(isReleaseNotesPage(["release-notes"])).toBe(true);
  expect(isReleaseNotesPage(["release-notes", "v0.4.0"])).toBe(true);
  expect(isReleaseNotesPage(["start-here", "release-channels"])).toBe(false);
  expect(isReleaseNotesPage([])).toBe(false);
});

test("the llms section inlines the index and newest releases and links the rest", () => {
  const pages = [
    page("release-notes", "v0.1.10"),
    page("release-notes", "v0.0.9"),
    page("release-notes"),
    page("release-notes", "v0.4.0"),
    page("release-notes", "v0.1.2"),
    page("release-notes", "v0.3.1"),
  ];
  const { full, linked } = splitReleaseNotesForLlms(pages);
  expect(full.map((entry) => entry.slugs.join("/"))).toEqual([
    "release-notes",
    "release-notes/v0.4.0",
    "release-notes/v0.3.1",
    "release-notes/v0.1.10",
  ]);
  expect(linked.map((entry) => entry.slugs[1])).toEqual(["v0.1.2", "v0.0.9"]);
  expect(RELEASE_NOTES_LLMS_FULL_PAGES).toBe(3);
});

test("the real release notes section is bounded and never inlines the archive", () => {
  const pages = source
    .getPages("en")
    .filter((entry) => isReleaseNotesPage(entry.slugs));
  expect(pages.length).toBeGreaterThan(RELEASE_NOTES_LLMS_FULL_PAGES + 1);
  const { full, linked } = splitReleaseNotesForLlms(pages);
  expect(full).toHaveLength(RELEASE_NOTES_LLMS_FULL_PAGES + 1);
  expect(linked.length).toBe(pages.length - full.length);
});
