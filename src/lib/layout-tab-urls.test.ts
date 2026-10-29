import { expect, test } from "bun:test";
import type * as PageTree from "fumadocs-core/page-tree";
import { isLayoutTabActive } from "fumadocs-ui/layouts/shared";

import { bindTabsToOwnPages } from "./layout-tab-urls";

function page(url: string): PageTree.Item {
  return { type: "page", name: url, url };
}

const surfaces: PageTree.Folder = {
  type: "folder",
  name: "Surfaces",
  root: true,
  children: [
    page("/docs/surfaces"),
    // Sidebar links to other roots share their landing URLs.
    page("/docs/surfaces/cli"),
    page("/docs/mobile"),
    page("/docs/surfaces/island"),
  ],
};
const cli: PageTree.Folder = {
  type: "folder",
  name: "CLI",
  root: true,
  children: [page("/docs/surfaces/cli"), page("/docs/surfaces/cli/tui")],
};
const mobile: PageTree.Folder = {
  type: "folder",
  name: "Mobile",
  root: true,
  children: [page("/docs/mobile")],
};

const tabs = bindTabsToOwnPages([
  { title: "CLI", url: "/docs/surfaces/cli", $folder: cli },
  { title: "Mobile", url: "/docs/mobile", $folder: mobile },
  { title: "Surfaces", url: "/docs/surfaces", $folder: surfaces },
]);

function selected(pathname: string) {
  return tabs.findLast((tab) => isLayoutTabActive(tab, pathname))?.title;
}

test("a surface root's landing page selects that root, not Surfaces", () => {
  expect(selected("/docs/surfaces/cli")).toBe("CLI");
  expect(selected("/docs/mobile")).toBe("Mobile");
  expect(selected("/docs/surfaces/cli/tui")).toBe("CLI");
});

test("Surfaces keeps its own pages", () => {
  expect(selected("/docs/surfaces")).toBe("Surfaces");
  expect(selected("/docs/surfaces/island")).toBe("Surfaces");
});
