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
 *
 * The client copy also shortens the sidebar. Each `---Label---` separator and
 * the pages after it become one collapsible group. Groups and nested content
 * folders start open (a meta `defaultOpen: false` can still close one), so the
 * whole outline is visible; readers can fold what they do not need.
 * URLs and the server tree are unchanged.
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
    children: shortenChildLabels(
      groupSections(node.children.map(child), idFor, keepsLabels(node)),
      keepsLabels(node) || node.root ? undefined : node.name,
    ),
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
 * Folds each separator and the nodes up to the next separator into an open,
 * collapsible folder named after the separator. Nodes before the first
 * separator (usually the overview page) stay at the top level.
 */
export function groupSections(
  nodes: Node[],
  idFor: (node: object) => string,
  keepLabels = false,
): Node[] {
  if (!nodes.some((node) => node.type === "separator")) {
    return nodes;
  }
  const grouped: Node[] = [];
  let group: Folder | undefined;
  for (const node of nodes) {
    if (node.type === "separator") {
      group = {
        $id: "",
        type: "folder",
        name: node.name ?? "",
        ...(node.icon ? { icon: node.icon } : {}),
        collapsible: true,
        children: [],
      };
      group.$id = idFor(group);
      grouped.push(group);
      continue;
    }
    if (group) {
      group.children.push(keepLabels ? node : shortenLabel(node, group.name));
    } else {
      grouped.push(node);
    }
  }
  return grouped.filter(
    (node) => node.type !== "folder" || node.children.length > 0 || node.index,
  );
}

/**
 * A sidebar label without its group's name in front: under "Workflows",
 * "Workflow Loops and Fan-Out" reads "Loops and Fan-Out". Only plain-text
 * labels are shortened, and only when what remains starts a new capitalised
 * phrase, so "Encryption at Rest" keeps its name. Page titles are unchanged.
 */
export function withoutGroupPrefix(label: string, group: string): string {
  const name = group.trim();
  const candidates = name.endsWith("s") ? [name, name.slice(0, -1)] : [name];
  for (const candidate of candidates) {
    if (!candidate || label.length <= candidate.length + 1) {
      continue;
    }
    const head = label.slice(0, candidate.length);
    const rest = label.slice(candidate.length + 1);
    if (
      head.toLowerCase() === candidate.toLowerCase() &&
      label[candidate.length] === " " &&
      /^[A-Z0-9]/.test(rest)
    ) {
      return rest;
    }
  }
  return label;
}

// Catalog page titles are product names ("Browser Use", "Security Scanner"),
// which must not lose their first word to the category they are filed under.
const CATALOG_FOLDERS = new Set(["apps", "plugins"]);

function keepsLabels(folder: Folder): boolean {
  return CATALOG_FOLDERS.has(folder.$ref?.folder ?? "");
}

function shortenLabel(node: Node, group: Node["name"] | undefined): Node {
  if (
    node.type !== "page" ||
    typeof node.name !== "string" ||
    typeof group !== "string"
  ) {
    return node;
  }
  const name = withoutGroupPrefix(node.name, group);
  return name === node.name ? node : { ...node, name };
}

function shortenChildLabels(
  nodes: Node[],
  group: Node["name"] | undefined,
): Node[] {
  return group === undefined
    ? nodes
    : nodes.map((node) => shortenLabel(node, group));
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
