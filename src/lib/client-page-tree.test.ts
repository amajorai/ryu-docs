import { describe, expect, test } from "bun:test";
import { flattenTree, type Root } from "fumadocs-core/page-tree";
import { getLayoutTabs } from "fumadocs-ui/layouts/shared";
import { createElement } from "react";

import { compactPageTreeForClient } from "@/lib/client-page-tree";
import { source } from "@/lib/source";

const methodLabel = createElement("span", null, "GET");

function syntheticTree(): Root {
  return {
    $id: "root:en",
    name: "Docs",
    children: [
      {
        $id: "content/docs/start-here",
        $ref: { folder: "start-here", meta: "start-here/meta.json" },
        type: "folder",
        name: "Start here",
        description: "Realm tab copy nothing renders",
        root: true,
        icon: undefined,
        index: {
          $id: "content/docs/start-here/index.mdx",
          $ref: "start-here/index.mdx",
          type: "page",
          name: "Overview",
          url: "/docs/start-here",
          description: "What Ryu is",
          icon: undefined,
        },
        children: [
          {
            $id: "content/docs/start-here/install.mdx",
            $ref: "start-here/install.mdx",
            type: "page",
            name: "Install",
            url: "/docs/start-here/install",
            description: undefined,
            icon: undefined,
          },
          { $id: "content/docs/start-here/---api---", type: "separator" },
          {
            $id: "content/docs/start-here/get-health.mdx",
            $ref: "start-here/get-health.mdx",
            type: "page",
            name: methodLabel,
            url: "/docs/start-here/get-health",
            description: "Health check",
          },
        ],
      },
    ],
    fallback: {
      $id: "fallback:en",
      name: "Unlisted",
      description: undefined,
      children: [
        {
          $id: "content/docs/unlisted.mdx",
          $ref: "unlisted.mdx",
          type: "page",
          name: "Unlisted",
          url: "/docs/unlisted",
        },
      ],
    },
  };
}

type Visit = (node: Record<string, unknown>) => void;

function walk(node: Root, visit: Visit): void {
  const queue: unknown[] = [node];
  for (const current of queue) {
    if (typeof current !== "object" || current === null) {
      continue;
    }
    const record = current as Record<string, unknown>;
    visit(record);
    if (Array.isArray(record.children)) {
      queue.push(...record.children);
    }
    queue.push(record.index, record.fallback);
  }
}

describe("compactPageTreeForClient", () => {
  test("drops $ref and undefined-valued keys everywhere", () => {
    const compact = compactPageTreeForClient(syntheticTree());
    let visited = 0;
    walk(compact, (node) => {
      visited++;
      expect(Object.hasOwn(node, "$ref")).toBe(false);
      for (const value of Object.values(node)) {
        expect(value).not.toBeUndefined();
      }
    });
    expect(visited).toBe(8);
  });

  test("gives non-root nodes short unique ids and keeps root ids", () => {
    const compact = compactPageTreeForClient(syntheticTree());
    expect(compact.$id).toBe("root:en");
    expect(compact.fallback?.$id).toBe("fallback:en");
    const rootIds = new Set(["root:en", "fallback:en"]);
    const ids: string[] = [];
    walk(compact, (node) => {
      const id = String(node.$id);
      if (!rootIds.has(id)) {
        ids.push(id);
      }
    });
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.length).toBeLessThanOrEqual(2);
    }
  });

  test("keeps names, urls, page descriptions, roots and order", () => {
    const compact = compactPageTreeForClient(syntheticTree());
    const [folder] = compact.children;
    if (folder?.type !== "folder") {
      throw new Error("expected the realm folder first");
    }
    expect(folder.root).toBe(true);
    expect(folder.name).toBe("Start here");
    expect(Object.hasOwn(folder, "description")).toBe(false);
    expect(folder.index?.url).toBe("/docs/start-here");
    expect(folder.index?.description).toBe("What Ryu is");
    expect(folder.children.map((node) => node.type)).toEqual([
      "page",
      "separator",
      "page",
    ]);
    const health = folder.children[2];
    expect(health?.type === "page" ? health.url : null).toBe(
      "/docs/start-here/get-health",
    );
    expect(health?.name).toBe(methodLabel);
    expect(health?.type === "page" ? health.description : null).toBe(
      "Health check",
    );
    expect(compact.fallback?.children[0]?.name).toBe("Unlisted");
  });

  test("leaves the server tree untouched and memoises per tree", () => {
    const tree = syntheticTree();
    const before = structuredClone({ ...tree, children: [] });
    const compact = compactPageTreeForClient(tree);
    const [folder] = tree.children;
    expect(folder?.type === "folder" ? folder.$ref?.folder : null).toBe(
      "start-here",
    );
    expect(folder?.$id).toBe("content/docs/start-here");
    expect({ ...tree, children: [] }).toEqual(before);
    expect(compactPageTreeForClient(tree)).toBe(compact);
  });

  test("the real docs tree keeps every url and realm tab", () => {
    const tree = source.getPageTree("en");
    const compact = compactPageTreeForClient(tree);
    const urls = (root: Root) =>
      flattenTree(root.children).map((node) => node.url);
    expect(urls(compact)).toEqual(urls(tree));
    const tabUrls = (root: Root) =>
      getLayoutTabs(root).map((tab) => [tab.url, tab.unlisted]);
    expect(tabUrls(compact)).toEqual(tabUrls(tree));
    expect(compact.$id).toBe(tree.$id);
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(tree).length,
    );
  });
});
