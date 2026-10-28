import type { Folder, Item, Node, Root } from "fumadocs-core/page-tree";

/*
 * The docs layout hands the whole page tree to client components, so every docs
 * HTML response carries it in the RSC payload. Fumadocs' server-only `$ref`
 * file paths, path-length `$id`s, `undefined` keys (serialised as "$undefined")
 * and folder descriptions nothing renders (the realm tabs blank theirs) were
 * roughly a third of it. Clients compare `$id`s only within one tree (the glass
 * sidebar's active path, and the tree context memo on the root `$id`, which is
 * kept), so short ids unique within the tree are equivalent. Page descriptions
 * stay: the glass prev/next footer shows them. The server tree is untouched;
 * llms-index and doc cards read `$ref` from it.
 */

const compacted = new WeakMap<Root, Root>();

/** A client copy of `tree` without server-only and unused keys. Memoised per tree. */
export function compactPageTreeForClient(tree: Root): Root {
  const cached = compacted.get(tree);
  if (cached) {
    return cached;
  }
  const ids = new WeakMap<object, string>();
  let nextId = 0;
  // One id per source node, so a node reached twice keeps one id.
  const idFor = (node: object): string => {
    let id = ids.get(node);
    if (id === undefined) {
      id = (nextId++).toString(36);
      ids.set(node, id);
    }
    return id;
  };

  const page = (node: Item): Item => ({
    ...definedOwnKeys(node, ["$id", "$ref"]),
    $id: idFor(node),
  });

  const folder = (node: Folder): Folder => ({
    ...definedOwnKeys(node, [
      "$id",
      "$ref",
      "children",
      "description",
      "index",
    ]),
    $id: idFor(node),
    ...(node.index ? { index: page(node.index) } : {}),
    children: node.children.map(child),
  });

  function child(node: Node): Node {
    if (node.type === "page") {
      return page(node);
    }
    if (node.type === "folder") {
      return folder(node);
    }
    return { ...definedOwnKeys(node, ["$id"]), $id: idFor(node) };
  }

  const root = (node: Root): Root => ({
    ...definedOwnKeys(node, ["$ref", "children", "fallback"]),
    children: node.children.map(child),
    ...(node.fallback ? { fallback: root(node.fallback) } : {}),
  });

  const result = root(tree);
  compacted.set(tree, result);
  return result;
}

/**
 * The node's own keys minus `omit` and any whose value is undefined; React
 * Flight would serialise each of those as "$undefined". Values (React node
 * names and icons included) are kept by reference, never cloned. Typed as `T`
 * because every caller puts back the omitted keys it needs.
 */
function definedOwnKeys<T extends object>(
  node: T,
  omit: readonly (keyof T & string)[],
): T {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (value !== undefined && !(omit as readonly string[]).includes(key)) {
      kept[key] = value;
    }
  }
  return kept as T;
}
