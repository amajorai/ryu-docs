import { expect, test } from "bun:test";
import { generateMetadata as generateDocsMetadata } from "@/app/[lang]/docs/[[...slug]]/page";
import sitemap from "@/app/sitemap";
import {
  docsRouteAliases,
  hasLocalizedDocsContent,
  isCanonicalDocsPage,
} from "./canonical-docs";
import { getPage } from "./source";

test("redirect sources never appear as canonical sitemap pages", () => {
  for (const alias of docsRouteAliases) {
    expect(isCanonicalDocsPage(alias.from.split("/"))).toBe(false);
    expect(isCanonicalDocsPage(alias.to.split("/"))).toBe(true);
  }
  expect(isCanonicalDocsPage(["extend", "mcp", "llms"])).toBe(true);
});

test("fallback locale pages point to the English canonical and stay out of the sitemap", async () => {
  const english = getPage(["start-here", "getting-started"], "en");
  const fallback = getPage(["start-here", "getting-started"], "es");
  const translated = getPage(["start-here"], "es");
  expect(english && hasLocalizedDocsContent(english)).toBe(true);
  expect(fallback && hasLocalizedDocsContent(fallback)).toBe(false);
  expect(translated && hasLocalizedDocsContent(translated)).toBe(true);

  const metadata = await generateDocsMetadata({
    params: Promise.resolve({
      lang: "es",
      slug: ["0.4.0", "start-here", "getting-started"],
    }),
  });
  expect(metadata.alternates?.canonical).toBe(english?.url);
  expect(metadata.alternates?.languages?.es).toBeUndefined();
  expect(metadata.openGraph?.url).toBe(english?.url);

  const translatedMetadata = await generateDocsMetadata({
    params: Promise.resolve({ lang: "es", slug: ["0.4.0", "start-here"] }),
  });
  expect(translatedMetadata.alternates?.canonical).toBe(translated?.url);
  expect(translatedMetadata.alternates?.languages?.es).toBe(translated?.url);

  const urls = new Set(sitemap().map((entry) => entry.url));
  expect(
    urls.has("https://docs.ryuhq.com/docs/0.4.0/start-here/getting-started"),
  ).toBe(true);
  expect(
    urls.has("https://docs.ryuhq.com/es/docs/0.4.0/start-here/getting-started"),
  ).toBe(false);
  expect(urls.has("https://docs.ryuhq.com/es/docs/0.4.0/start-here")).toBe(
    true,
  );
  expect(
    [...urls].some((url) => url.startsWith("https://docs.ryuhq.com/fr/")),
  ).toBe(false);
});
