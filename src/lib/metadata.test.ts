import { describe, expect, it } from "bun:test";
import {
  docsIdentityNodes,
  generateMetadata,
  RYU_ORGANIZATION_ID,
  siteConfig,
} from "./metadata";

describe("docs metadata", () => {
  it("carries the AI agent deployment positioning into the docs head", () => {
    const metadata = generateMetadata();

    expect(metadata.description).toBe(siteConfig.description);
    expect(metadata.keywords).toEqual(siteConfig.keywords);
    expect(siteConfig.keywords).toContain("AI agent deployment platform");
    expect(siteConfig.keywords).toContain("AI agents for startups");
  });

  it("canonicalizes untranslated home pages to the English source", () => {
    const metadata = generateMetadata("es");

    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.alternates?.languages?.en).toBe("/");
    expect(metadata.alternates?.languages?.es).toBeUndefined();
    expect(metadata.openGraph?.locale).toBe("en");
    expect(metadata.openGraph?.url).toBe("/");
  });

  it("uses a versioned shared social image so refreshed cards bypass old caches", () => {
    const metadata = generateMetadata();
    const images = metadata.openGraph?.images;

    expect(Array.isArray(images) ? images[0] : images).toMatchObject({
      url: "/opengraph-image?v=7",
      width: 1200,
      height: 630,
    });
  });

  it("connects docs articles to the website publisher", () => {
    const [organization, website] = docsIdentityNodes();
    expect(organization?.["@id"]).toBe(RYU_ORGANIZATION_ID);
    expect(organization?.url).toBe("https://ryuhq.com");
    expect(website?.publisher).toEqual({ "@id": RYU_ORGANIZATION_ID });
  });
});
