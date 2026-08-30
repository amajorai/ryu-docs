import { describe, expect, it } from "bun:test";
import { generateMetadata, siteConfig } from "./metadata";

describe("docs metadata", () => {
  it("carries the AI agent deployment positioning into the docs head", () => {
    const metadata = generateMetadata();

    expect(metadata.description).toBe(siteConfig.description);
    expect(metadata.keywords).toEqual(siteConfig.keywords);
    expect(siteConfig.keywords).toContain("AI agent deployment platform");
    expect(siteConfig.keywords).toContain("AI agents for startups");
  });
});
