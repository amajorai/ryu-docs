import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { hasLocalizedDocsContent } from "@/lib/canonical-docs";
import { getPage } from "@/lib/source";
import { EnglishFallbackRegion } from "./english-fallback-region";

function renderArticle(page: { locale?: string; path: string }): string {
  return renderToStaticMarkup(
    <EnglishFallbackRegion fallback={!hasLocalizedDocsContent(page)}>
      <h1>Title</h1>
      <p>Prose</p>
    </EnglishFallbackRegion>,
  );
}

test("an untranslated page on /ar renders its article as English, left to right", () => {
  const page = getPage(["start-here", "getting-started"], "ar");
  expect(page).toBeDefined();
  if (!page) return;
  const html = renderArticle(page);
  expect(html).toBe(
    '<div class="contents" data-english-fallback="" dir="ltr" lang="en"><h1>Title</h1><p>Prose</p></div>',
  );
});

test("a translated page renders without the English region", () => {
  const page = getPage(["start-here"], "es");
  expect(page).toBeDefined();
  if (!page) return;
  expect(hasLocalizedDocsContent(page)).toBe(true);
  expect(renderArticle(page)).toBe("<h1>Title</h1><p>Prose</p>");
});

test("English routes never get the region", () => {
  const page = getPage(["start-here", "getting-started"], "en");
  expect(page).toBeDefined();
  if (!page) return;
  expect(renderArticle(page)).not.toContain("data-english-fallback");
});

test("the docs page wraps title and body, but not the localized feedback form", () => {
  const source = readFileSync(
    new URL("../app/[lang]/docs/[[...slug]]/page.tsx", import.meta.url),
    "utf8",
  );
  const regions = source.match(
    /<EnglishFallbackRegion fallback=\{!hasTranslation\}>[\s\S]*?<\/EnglishFallbackRegion>/g,
  );
  expect(regions).toHaveLength(2);
  expect(regions?.[0]).toContain("<DocsTitle>");
  expect(regions?.[1]).toContain("<DocsBody>");
  for (const region of regions ?? []) {
    expect(region).not.toContain("<Feedback\n");
  }
  expect(source).toContain("copy={chrome.feedback}");
});
