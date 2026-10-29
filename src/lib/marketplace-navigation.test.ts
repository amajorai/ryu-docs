import { expect, test } from "bun:test";
import { findPath } from "fumadocs-core/page-tree";
import { metaSchema } from "fumadocs-core/source/schema";
import { getLayoutTabs, isLayoutTabActive } from "fumadocs-ui/layouts/shared";
import { docsPath } from "./docs-version";
import { getPage, source } from "./source";

test("the Develop extensions folder retains organization marketplaces in the active Extend tab", async () => {
  const readPages = async (path: string) =>
    metaSchema
      .required({ pages: true })
      .parse(
        await Bun.file(
          new URL(`../../content/docs/${path}`, import.meta.url),
        ).json(),
      ).pages;
  // Develop lists the extensions folder once; the folder owns its page list.
  expect(await readPages("extend/develop/meta.json")).toContain("extensions");
  const extensions = await readPages("extend/develop/extensions/meta.json");
  const sectionStart = extensions.indexOf("---Marketplace---");
  const nextGroup = extensions.findIndex(
    (entry, index) => index > sectionStart && entry.startsWith("---"),
  );
  const sectionEnd = nextGroup === -1 ? extensions.length : nextGroup;
  expect(sectionStart).toBeGreaterThanOrEqual(0);
  expect(sectionEnd).toBeGreaterThan(sectionStart);
  expect(extensions.slice(sectionStart + 1, sectionEnd)).toContain(
    "organization-marketplaces",
  );

  const segments = [
    "extend",
    "develop",
    "extensions",
    "organization-marketplaces",
  ];
  const currentUrl = docsPath(...segments);
  const page = getPage(segments, "en");
  expect(page?.url).toBe(currentUrl);
  expect(page?.data.title).toBe("Organization Marketplaces");

  // These are the same production source tree and framework projection used by
  // DocsLayoutClient. A routable page alone does not make its layout tab active.
  const tabs = getLayoutTabs(source.getPageTree("en"));
  const activeTabs = tabs.filter((tab) => isLayoutTabActive(tab, currentUrl));
  expect(activeTabs).toHaveLength(1);
  expect(activeTabs[0]?.title).toBe("Extend");
  expect(activeTabs[0]?.url).toBe(docsPath("extend"));
  const sidebarPath = findPath(
    activeTabs[0]?.$folder?.children ?? [],
    (node) => node.type === "page" && node.url === currentUrl,
  );
  expect(sidebarPath).not.toBeNull();
  expect(sidebarPath?.at(-1)).toMatchObject({
    type: "page",
    name: "Organization Marketplaces",
    url: currentUrl,
  });
});
