import type { MetadataRoute } from "next";
import { isCanonicalDocsPage } from "@/lib/canonical-docs";
import { siteConfig } from "@/lib/metadata";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source
    .getPages()
    .filter((page) => isCanonicalDocsPage(page.slugs));

  const docEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${siteConfig.url}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: siteConfig.url,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...docEntries,
  ];
}
