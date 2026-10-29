import type * as PageTree from "fumadocs-core/page-tree";
import type { LayoutTab } from "fumadocs-ui/layouts/shared";

function collectPageUrls(nodes: PageTree.Node[], urls: string[]): void {
  for (const node of nodes) {
    if (node.type === "page") {
      urls.push(node.url);
    } else if (node.type === "folder") {
      if (node.index) {
        urls.push(node.index.url);
      }
      collectPageUrls(node.children, urls);
    }
  }
}

/**
 * Bind each root selector tab to the pages it owns rather than to its folder.
 *
 * A folder-bound tab counts as active on every URL its folder lists, sidebar
 * link items included. The Surfaces root links to the landing page of each
 * surface root (Desktop App, Mobile, CLI, ...), and the selector shows the last
 * active tab, so those landing pages would show "Surfaces" as the current
 * section. Leaving out the other roots' landing URLs keeps the selector on the
 * root whose page you are reading; every other page still matches as before.
 */
export function bindTabsToOwnPages(tabs: LayoutTab[]): LayoutTab[] {
  const landingUrls = new Set(tabs.map((tab) => tab.url));
  return tabs.map((tab) => {
    const folder = tab.$folder;
    if (!folder) {
      return tab;
    }
    const pageUrls: string[] = [];
    if (folder.index) {
      pageUrls.push(folder.index.url);
    }
    collectPageUrls(folder.children, pageUrls);
    const urls = new Set(
      pageUrls.filter((url) => url === tab.url || !landingUrls.has(url)),
    );
    return { ...tab, $folder: undefined, urls };
  });
}
