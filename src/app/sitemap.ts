import type { MetadataRoute } from "next";
import { isCanonicalDocsPage } from "@/lib/canonical-docs";
import { DOCS_LANGUAGES, localizedPath } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = DOCS_LANGUAGES.flatMap((locale) =>
    source.getPages(locale).filter((page) => isCanonicalDocsPage(page.slugs)),
  );

  const docEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${siteConfig.url}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const homeEntries: MetadataRoute.Sitemap = DOCS_LANGUAGES.map((locale) => ({
    url: `${siteConfig.url}${localizedPath("/", locale)}`,
    changeFrequency: "weekly",
    priority: locale === "en" ? 1 : 0.9,
  }));

  return [...homeEntries, ...docEntries];
}
