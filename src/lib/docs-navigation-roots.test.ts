import { describe, expect, test } from "bun:test";

import {
  internalMarkdownLink,
  normalizeDocsHref,
  pagePathFromFile,
  readDocFiles,
  readMeta,
  readPage,
  readRoutablePageFiles,
} from "./docs-navigation-helpers";

describe("docs navigation: API roots, billing, and links", () => {
  test("keeps generated API roots as directories of endpoint groups", async () => {
    const coreIndex = await readPage(
      "extend/develop/api-reference/core/index.mdx",
    );
    const agentsIndex = await readPage(
      "extend/develop/api-reference/core/agents/index.mdx",
    );

    expect(coreIndex.split(/\r?\n/).length).toBeLessThan(120);
    expect(coreIndex).toContain("Browse by endpoint group");
    expect(agentsIndex).toContain("<Cards>");
    expect(agentsIndex).toContain("core/agents/list_agents");
  });

  test("surfaces API reference and RyuBench as dedicated root selectors", async () => {
    const apiReference = await readMeta(
      "extend/develop/api-reference/meta.json",
    );
    const benchmark = await readMeta("reference/benchmark/meta.json");

    expect(apiReference.root).toBe(true);
    expect(benchmark.root).toBe(true);
    expect(apiReference.pages).toEqual(["index", "gateway", "core"]);
    expect(benchmark.pages).toEqual([
      "index",
      "tasks",
      "authoring-tasks",
      "scoring",
      "local-models",
      "fields",
      "harbor",
      "kernel-boundaries",
    ]);
  });

  test("keeps current Core operations visible in generated API navigation", async () => {
    const core = await readMeta("extend/develop/api-reference/core/meta.json");
    const catalog = await readMeta(
      "extend/develop/api-reference/core/catalog/meta.json",
    );
    const outputStyles = await readMeta(
      "extend/develop/api-reference/core/output-styles/meta.json",
    );

    expect(catalog.pages).toContain("catalog_sources_remove");
    expect(core.pages).toContain("output-styles");
    expect(outputStyles.pages).toEqual(
      expect.arrayContaining([
        "create_style_handler",
        "delete_style_handler",
        "list_styles",
      ]),
    );
  });

  test("groups every billing page and includes Teams seats and family sharing", async () => {
    const billing = await readMeta("billing/meta.json");
    const pages = billing.pages ?? [];

    expect(pages).toEqual([
      "index",
      "---Plans & access---",
      "plans",
      "limits",
      "trial-and-access",
      "checkout",
      "plan-changes",
      "cloud-computers",
      "hosted-agents",
      "family-sharing",
      "powered-by-ryu",
      "pricing-changelog",
      "---Credits & usage---",
      "credits",
      "top-ups",
      "metering",
      "sandbox-billing",
      "usage-analytics",
      "usage-limits",
      "usage-limits-api",
      "standalone-credits",
      "gifts",
      "notifications",
      "---Organizations---",
      "organization-console",
      "organization-access",
      "organization-invitations",
      "organization-roles",
      "seats",
      "agent-inboxes",
      "merging-accounts",
    ]);

    const consoleGuide = await readPage("billing/organization-console.mdx");
    expect(consoleGuide).toContain("/organizations/<organization id>");
    expect(consoleGuide).toContain(
      "server checks your permissions again on every request",
    );
    expect(consoleGuide).toContain(
      "keep any query parameters, including checkout returns",
    );
  });

  test("groups the public programs pages", async () => {
    const root = await readMeta("meta.json");
    const programs = await readMeta("programs/meta.json");

    expect(root.pages).toContain("programs");
    expect(programs.root).toBe(true);
    expect(programs.pages).toEqual([
      "index",
      "---Community & access---",
      "partner-program",
      "perks",
      "startups-and-students",
      "discord",
      "---Build & earn---",
      "sell-your-own-agents",
      "creator-program",
      "template-rewards",
      "challenges",
      "referrals",
      "invite-passes",
    ]);
  });

  test("keeps every public page connected by valid inline documentation links", async () => {
    const files = await readDocFiles();
    const pagePaths = new Set(
      (await readRoutablePageFiles()).map(pagePathFromFile),
    );
    expect(pagePaths).toContain("/docs/release-notes/v0.4.0");
    expect(pagePaths).toContain("/docs/ui/components/switch");
    expect(pagePaths).toContain("/docs/ui/components/textarea");
    const missingInlineLinks: string[] = [];
    const brokenLinks: string[] = [];

    for (const file of files) {
      const content = await readPage(file);
      const links = [...content.matchAll(internalMarkdownLink)].map(
        (match) => match[1],
      );

      if (links.length === 0) {
        missingInlineLinks.push(file);
      }

      const minimum = [
        "apps/",
        "plugins/",
        "ui/components/",
        "extend/develop/api-reference/",
      ].some((prefix) => file.startsWith(prefix))
        ? 3
        : 0;
      expect(
        links.length,
        `${file} should expose at least ${minimum} inline documentation links`,
      ).toBeGreaterThanOrEqual(minimum);

      for (const href of links) {
        if (!pagePaths.has(normalizeDocsHref(href ?? ""))) {
          brokenLinks.push(`${file} -> ${href}`);
        }
      }
    }

    expect(missingInlineLinks).toEqual([]);
    expect(brokenLinks).toEqual([]);
  });
});
