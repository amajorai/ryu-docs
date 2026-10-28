import type { MetadataRoute } from "next";
import {
  hasLocalizedDocsContent,
  isCanonicalDocsPage,
} from "@/lib/canonical-docs";
import { DEFAULT_DOCS_LOCALE, DOCS_LANGUAGES, localizedPath } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = DOCS_LANGUAGES.flatMap((locale) =>
    source
      .getPages(locale)
      .filter(
        (page) =>
          isCanonicalDocsPage(page.slugs) && hasLocalizedDocsContent(page),
      ),
  );

  const docEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${siteConfig.url}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const homeEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteConfig.url}${localizedPath("/", DEFAULT_DOCS_LOCALE)}`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  return [...homeEntries, ...docEntries];
}
