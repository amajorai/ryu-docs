import type { Folder, Item, Node, Root } from "fumadocs-core/page-tree";
import { z } from "zod";

import { isCanonicalDocsPage } from "@/lib/canonical-docs";
import { docsPath } from "@/lib/docs-version";
import { DEFAULT_DOCS_LOCALE } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";
import {
  SERVICE_OPENAPI_LINKS,
  serviceOpenApiUrl,
} from "@/lib/service-openapi-links";
import { type DocsPage, source, specDescription } from "@/lib/source";

/**
 * Navigation indexes for agents, in the llmstxt.org shape: an H1, a blockquote
 * summary, and H2 sections of Markdown link lists.
 *
 * The complete page tree is several hundred thousand characters, so the root
 * `/llms.txt` lists each section's overview page and its direct children only,
 * and every folder gets its own index at `/llms/{path}.txt`. A folder index
 * lists its whole subtree when that fits the budget; otherwise it lists one
 * level and links deeper folders to their own indexes. The complete page text
 * stays at `/llms-full.txt`.
 */

/** Agent readiness scanners expect a navigation index below this size. */
export const LLMS_INDEX_MAX_CHARS = 30_000;

/**
 * What the builders aim for, in UTF-8 bytes, so ordinary content growth and
 * multi-byte punctuation do not push an index over {@link LLMS_INDEX_MAX_CHARS}.
 */
const LLMS_INDEX_TARGET_BYTES = 28_000;

const encoder = new TextEncoder();

/** Size in UTF-8 bytes, which is never less than the character count. */
export function llmsIndexSize(text: string): number {
  return encoder.encode(text).length;
}

/** URL prefix of the per-folder indexes, served by `app/llms/[...path]`. */
export const LLMS_SECTION_INDEX_PREFIX = "/llms";

const DESCRIPTION_MAX_CHARS = 160;
const INDENT = "  ";
const GROUP_FOLDER = /^\(.+\)$/u;

type DescriptionMode = "full" | "none";

interface IndexContext {
  /** Folder path → folder, first folder in tree order wins. */
  readonly folders: ReadonlyMap<string, Folder>;
  readonly paths: WeakMap<Folder, string[]>;
}

/** The public URL of the index for a docs folder path such as `extend/mcp`. */
export function llmsSectionIndexUrl(path: readonly string[]): string {
  return `${LLMS_SECTION_INDEX_PREFIX}/${path.join("/")}.txt`;
}

function absoluteUrl(url: string): string {
  return url.startsWith("/") ? `${siteConfig.url}${url}` : url;
}

function escapeLinkText(text: string): string {
  return text.replace(/([[\]])/g, "\\$1");
}

function escapeLinkUrl(url: string): string {
  return url.replace(/([()])/g, "\\$1");
}

function markdownLink(title: string, url: string): string {
  return `[${escapeLinkText(title)}](${escapeLinkUrl(absoluteUrl(url))})`;
}

const TRAILING_SEPARATORS = /[\s,.;:]+$/u;

/**
 * One line, at most {@link DESCRIPTION_MAX_CHARS}, cut on a word boundary.
 * A cut never ends inside an inline code span: when it leaves an odd number
 * of backticks, it backs up to before the span that would stay open.
 */
export function shortDescription(text: string | undefined): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= DESCRIPTION_MAX_CHARS) {
    return flat;
  }
  const cut = flat.slice(0, DESCRIPTION_MAX_CHARS - 1);
  const lastSpace = cut.lastIndexOf(" ");
  let kept = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  if ((kept.match(/`/gu)?.length ?? 0) % 2 === 1) {
    kept = kept.slice(0, kept.lastIndexOf("`"));
  }
  return `${kept.replace(TRAILING_SEPARATORS, "")}…`;
}

function listItem(
  indent: number,
  label: string,
  description: string,
  mode: DescriptionMode,
): string {
  const prefix = `${INDENT.repeat(indent)}- ${label}`;
  return mode === "full" && description ? `${prefix}: ${description}` : prefix;
}

/** Page-tree names and descriptions are React nodes; only text is indexed. */
const treeText = z.string().catch("");

function nodeName(node: Node | Root): string {
  return treeText.parse(node.name);
}

function itemPage(item: Item) {
  return item.external
    ? undefined
    : source.getNodePage(item, DEFAULT_DOCS_LOCALE);
}

/** Redirected compatibility URLs are not listed, matching the sitemap. */
function isListedItem(item: Item): boolean {
  const page = itemPage(item);
  return page === undefined || isCanonicalDocsPage(page.slugs);
}

function itemTitle(item: Item): string {
  return itemPage(item)?.data.title ?? nodeName(item);
}

/**
 * The frontmatter description, else (for a generated OpenAPI page, which has
 * none) the operation description the generator stored, as `getLLMText` does,
 * else the tree node's description.
 */
function itemDescription(item: Item): string {
  const page = itemPage(item);
  return (
    (page ? llmsPageDescription(page) : "") ||
    shortDescription(treeText.parse(item.description))
  );
}

/**
 * The index description of a docs page: its frontmatter description, else
 * (for a generated OpenAPI page, which has none) the operation description
 * the generator stored. Empty when it has neither.
 */
export function llmsPageDescription(page: DocsPage): string {
  return shortDescription(
    page.data.description || specDescription(page.data._openapi),
  );
}

function folderTitle(folder: Folder): string {
  if (folder.index) {
    const title = itemPage(folder.index)?.data.title;
    if (title) {
      return title;
    }
  }
  return nodeName(folder);
}

function folderDescription(folder: Folder): string {
  if (folder.index) {
    const description = itemDescription(folder.index);
    if (description) {
      return description;
    }
  }
  return shortDescription(treeText.parse(folder.description));
}

function descendantItems(nodes: readonly Node[]): Item[] {
  const items: Item[] = [];
  for (const node of nodes) {
    if (node.type === "page") {
      items.push(node);
    } else if (node.type === "folder") {
      if (node.index) {
        items.push(node.index);
      }
      items.push(...descendantItems(node.children));
    }
  }
  return items;
}

function listedPageCount(folder: Folder): number {
  return descendantItems([folder]).filter(isListedItem).length;
}

/** The content folder a page-tree folder was built from, as URL slugs. */
function contentFolderSlugs(folder: Folder): string[] | undefined {
  const contentFolder = folder.$ref?.folder;
  if (!contentFolder) {
    return;
  }
  // Fumadocs drops `(group)` folders from page slugs.
  return contentFolder
    .split("/")
    .filter((segment) => segment && !GROUP_FOLDER.test(segment));
}

/**
 * A folder's docs path: its overview page, else its content folder, else the
 * common prefix of its pages. A candidate is accepted only when the folder's
 * pages actually live under it.
 */
function computeFolderPath(folder: Folder): string[] {
  const pages = descendantItems([folder]).flatMap((item) => {
    const page = itemPage(item);
    return page ? [page.slugs] : [];
  });
  const owns = (path: readonly string[]) =>
    path.length > 0 &&
    pages.length > 0 &&
    pages.every((slugs) => path.every((segment, i) => slugs[i] === segment));
  const overview = folder.index ? itemPage(folder.index)?.slugs : undefined;
  if (overview && owns(overview)) {
    return overview;
  }
  const fromContent = contentFolderSlugs(folder);
  if (fromContent && owns(fromContent)) {
    return fromContent;
  }
  let prefix: string[] | undefined;
  for (const slugs of pages) {
    if (prefix === undefined) {
      prefix = slugs.slice(0, -1);
      continue;
    }
    let shared = 0;
    while (
      shared < prefix.length &&
      shared < slugs.length &&
      prefix[shared] === slugs[shared]
    ) {
      shared += 1;
    }
    prefix = prefix.slice(0, shared);
  }
  return prefix ?? [];
}

function createContext(root: Root): IndexContext {
  const folders = new Map<string, Folder>();
  const paths = new WeakMap<Folder, string[]>();
  const visit = (nodes: readonly Node[]) => {
    for (const node of nodes) {
      if (node.type !== "folder") {
        continue;
      }
      const path = computeFolderPath(node);
      paths.set(node, path);
      const key = path.join("/");
      if (key && !folders.has(key)) {
        folders.set(key, node);
      }
      visit(node.children);
    }
  };
  visit(root.children);
  return { folders, paths };
}

/** The folder path only when its index URL resolves back to this folder. */
function indexablePath(
  folder: Folder,
  ctx: IndexContext,
): string[] | undefined {
  const path = ctx.paths.get(folder);
  if (!path || path.length === 0) {
    return;
  }
  return ctx.folders.get(path.join("/")) === folder ? path : undefined;
}

function itemLine(item: Item, indent: number, mode: DescriptionMode): string {
  return listItem(
    indent,
    markdownLink(itemTitle(item), item.url),
    itemDescription(item),
    mode,
  );
}

function separatorLines(name: string, indent: number): string[] {
  return ["", `${INDENT.repeat(indent)}- **${name || "Separator"}**`];
}

function pageCountLabel(count: number): string {
  return count === 1 ? "1 page" : `${count} pages`;
}

/**
 * The page a folder opens on: its `index` page, or (for root folders, whose
 * overview is listed as their first child) the direct child at its own path.
 */
function folderOverview(folder: Folder, ctx: IndexContext): Item | undefined {
  if (folder.index) {
    return isListedItem(folder.index) ? folder.index : undefined;
  }
  const path = ctx.paths.get(folder)?.join("/");
  return folder.children.find(
    (child): child is Item =>
      child.type === "page" &&
      isListedItem(child) &&
      itemPage(child)?.slugs.join("/") === path,
  );
}

/** A folder as one line: its overview page plus a link to its own index. */
function folderSummaryLine(
  folder: Folder,
  indent: number,
  mode: DescriptionMode,
  ctx: IndexContext,
): string | undefined {
  const path = indexablePath(folder, ctx);
  if (!path) {
    return;
  }
  const indexLink = markdownLink(
    pageCountLabel(listedPageCount(folder)),
    llmsSectionIndexUrl(path),
  );
  const description = folderDescription(folder);
  const overview = folderOverview(folder, ctx);
  const label = markdownLink(
    folderTitle(folder),
    overview ? overview.url : llmsSectionIndexUrl(path),
  );
  const text = mode === "full" && description ? `${description} ` : "";
  return `${INDENT.repeat(indent)}- ${label}: ${text}(index of ${indexLink})`;
}

/**
 * Render `nodes` as a nested list. `depth` is how many folder levels are
 * expanded; deeper folders collapse to {@link folderSummaryLine}.
 */
function renderNodes(
  nodes: readonly Node[],
  indent: number,
  depth: number,
  mode: DescriptionMode,
  ctx: IndexContext,
): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    if (node.type === "page") {
      if (isListedItem(node)) {
        lines.push(itemLine(node, indent, mode));
      }
      continue;
    }
    if (node.type === "separator") {
      lines.push(...separatorLines(nodeName(node), indent));
      continue;
    }
    const summary =
      depth <= 0 ? folderSummaryLine(node, indent, mode, ctx) : undefined;
    if (summary) {
      lines.push(summary);
      continue;
    }
    const overview =
      node.index && isListedItem(node.index) ? node.index : undefined;
    lines.push(
      overview
        ? itemLine(overview, indent, mode)
        : listItem(indent, folderTitle(node), folderDescription(node), mode),
    );
    lines.push(...renderNodes(node.children, indent + 1, depth - 1, mode, ctx));
  }
  return lines;
}

function joinLines(lines: readonly string[]): string {
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function rootHeader(): string[] {
  return [
    "# Ryu Documentation",
    "",
    `> ${siteConfig.description}`,
    "",
    'This is a compact navigation index. Each section lists its overview page and direct children; every folder has its own complete page index, linked as "index of N pages". Append `.md` to any docs page URL, or send `Accept: text/markdown`, to read it as Markdown.',
    "",
  ];
}

/** Docs folder whose index carries the service OpenAPI documents in full. */
export const SERVICE_OPENAPI_INDEX_PATH = ["standalone", "sdk"] as const;

/** Docs page that explains the service OpenAPI documents and their authentication. */
export const SERVICE_OPENAPI_PAGE_URL = docsPath(
  "standalone",
  "sdk",
  "openapi",
);

/** Names the services that have a document, in list order. */
function serviceOpenApiTitles(): string {
  const titles = SERVICE_OPENAPI_LINKS.map((service) => service.title);
  const last = titles.pop();
  return titles.length > 0 ? `${titles.join(", ")}, and ${last}` : (last ?? "");
}

/**
 * The root index keeps a single pointer to the service OpenAPI documents, so
 * the per-document list does not spend the root size budget; the links,
 * servers, and status of each are in the SDK folder's index.
 */
function rootServiceOpenApiLines(): string[] {
  return [
    "## Standalone service OpenAPI documents",
    "",
    `The ${markdownLink("SDK index", llmsSectionIndexUrl(SERVICE_OPENAPI_INDEX_PATH))} links the raw OpenAPI 3.1 document for each of ${serviceOpenApiTitles()}, with its servers and status. Authentication is on the ${markdownLink("Service OpenAPI documents", SERVICE_OPENAPI_PAGE_URL)} page.`,
    "",
  ];
}

/** Full lines, with servers and status, for the SDK folder's index. */
function serviceOpenApiSectionLines(): string[] {
  return [
    "## Service OpenAPI documents",
    "",
    `One OpenAPI 3.1 document for each of these services. Authentication is on the ${markdownLink("Service OpenAPI documents", SERVICE_OPENAPI_PAGE_URL)} page.`,
    "",
    ...SERVICE_OPENAPI_LINKS.map(
      (service) =>
        `- ${markdownLink(`Ryu ${service.title} OpenAPI`, serviceOpenApiUrl(service.slug))}: served at ${service.servers}.`,
    ),
    "",
  ];
}

function sectionExtraLines(path: readonly string[]): string[] {
  return path.join("/") === SERVICE_OPENAPI_INDEX_PATH.join("/")
    ? serviceOpenApiSectionLines()
    : [];
}

function rootFooter(): string[] {
  return [
    ...rootServiceOpenApiLines(),
    "## Optional",
    "",
    `- ${markdownLink("Full documentation text", "/llms-full.txt")}: Every English docs page as Markdown in one file.`,
    `- ${markdownLink("Documentation MCP server", "/mcp")}: Search and read these docs over the Model Context Protocol.`,
    `- ${markdownLink("Sitemap", "/sitemap.xml")}: Every canonical docs URL.`,
    "",
  ];
}

/** Root section detail levels, richest first. */
const ROOT_SECTION_DETAIL: readonly [number, DescriptionMode][] = [
  [1, "full"],
  [1, "none"],
  [0, "full"],
];

function rootSection(
  node: Node,
  depth: number,
  mode: DescriptionMode,
  ctx: IndexContext,
): string[] {
  if (node.type !== "folder") {
    return renderNodes([node], 0, depth, mode, ctx);
  }
  const title = folderTitle(node);
  const lines = [`## ${title}`, ""];
  const overview = folderOverview(node, ctx);
  const path = indexablePath(node, ctx);
  if (path) {
    lines.push(
      `- ${markdownLink(`${title}: complete index`, llmsSectionIndexUrl(path))}: All ${pageCountLabel(listedPageCount(node))} in this section.`,
    );
  }
  if (depth > 0) {
    if (node.index && overview) {
      lines.push(itemLine(overview, 0, "full"));
    }
    lines.push(...renderNodes(node.children, 0, depth - 1, mode, ctx));
  } else if (overview) {
    lines.push(itemLine(overview, 0, "full"));
  }
  lines.push("");
  return lines;
}

/**
 * The English root `/llms.txt`: one H2 per top-level docs section, listing its
 * direct children. While the index is over its size target, the
 * largest section drops a level of detail (descriptions, then children); its
 * complete index link always remains.
 */
export function buildRootLlmsIndex(): string {
  const root = source.getPageTree(DEFAULT_DOCS_LOCALE);
  const ctx = createContext(root);
  const header = joinLines(rootHeader());
  const footer = joinLines(rootFooter());
  const variants = root.children.map((node) =>
    ROOT_SECTION_DETAIL.map(([depth, mode]) =>
      joinLines(rootSection(node, depth, mode, ctx)),
    ),
  );
  const levels = variants.map(() => 0);
  const render = () =>
    joinLines([
      header,
      ...variants.map((options, i) => options[levels[i] ?? 0] ?? ""),
      footer,
    ]);
  let body = render();
  while (llmsIndexSize(body) > LLMS_INDEX_TARGET_BYTES) {
    let largest = -1;
    for (const [i, options] of variants.entries()) {
      const level = levels[i] ?? 0;
      if (level >= options.length - 1) {
        continue;
      }
      const size = options[level]?.length ?? 0;
      const largestSize =
        largest < 0
          ? -1
          : (variants[largest]?.[levels[largest] ?? 0]?.length ?? 0);
      if (size > largestSize) {
        largest = i;
      }
    }
    if (largest < 0) {
      break;
    }
    levels[largest] = (levels[largest] ?? 0) + 1;
    body = render();
  }
  return body;
}

function findFolder(
  path: readonly string[],
): { ctx: IndexContext; folder: Folder; trail: Folder[] } | undefined {
  const root = source.getPageTree(DEFAULT_DOCS_LOCALE);
  const ctx = createContext(root);
  const folder = ctx.folders.get(path.join("/"));
  if (!folder) {
    return;
  }
  const trail: Folder[] = [];
  const walk = (nodes: readonly Node[]): boolean => {
    for (const node of nodes) {
      if (node.type !== "folder") {
        continue;
      }
      trail.push(node);
      if (node === folder || walk(node.children)) {
        return true;
      }
      trail.pop();
    }
    return false;
  };
  walk(root.children);
  return { ctx, folder, trail };
}

/** Every folder path that has its own index, in page-tree order. */
export function llmsSectionIndexPaths(): string[][] {
  const ctx = createContext(source.getPageTree(DEFAULT_DOCS_LOCALE));
  return [...ctx.folders.values()].flatMap((folder) => {
    const path = indexablePath(folder, ctx);
    return path ? [path] : [];
  });
}

export interface SectionLlmsIndex {
  /** 1-based page of a listing that is split to stay under the budget. */
  readonly page: number;
  readonly pageCount: number;
  readonly text: string;
}

/** Room kept for the continuation links of a split listing. */
const PAGINATION_RESERVE = 600;

/** Split list lines into chunks that each fit `budget` bytes. */
function chunkLines(lines: readonly string[], budget: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of lines) {
    const lineSize = llmsIndexSize(line) + 1;
    if (current.length > 0 && size + lineSize > budget) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    if (current.length === 0 && line === "") {
      continue;
    }
    current.push(line);
    size += lineSize;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

/**
 * The index for one docs folder, or `undefined` when no folder owns `path` or
 * `page` is out of range. Lists the whole subtree when it fits, otherwise one
 * level with deeper folders linked to their own indexes. A folder whose direct
 * pages alone exceed the budget (large generated API groups) is split across
 * `?page=N` continuations.
 */
export function buildSectionLlmsIndex(
  path: readonly string[],
  page = 1,
): SectionLlmsIndex | undefined {
  const found = findFolder(path);
  if (!(found && Number.isInteger(page) && page >= 1)) {
    return;
  }
  const { ctx, folder, trail } = found;
  const indexUrl = llmsSectionIndexUrl(path);
  const parent = trail.at(-2);
  const parentPath = parent ? indexablePath(parent, ctx) : undefined;
  const description = folderDescription(folder);
  const within =
    parent && parentPath
      ? `, inside ${markdownLink(folderTitle(parent), llmsSectionIndexUrl(parentPath))}`
      : "";
  const header = (pageLabel: string) =>
    joinLines([
      `# Ryu Docs: ${trail.map(folderTitle).join(" / ")}${pageLabel}`,
      "",
      ...(description ? [`> ${description}`, ""] : []),
      `Part of the ${markdownLink("Ryu documentation index", "/llms.txt")}${within}. This section has ${pageCountLabel(listedPageCount(folder))}; folders too large to list here link to their own index.`,
      "",
      "## Pages",
      "",
    ]);
  const overview =
    folder.index && isListedItem(folder.index) ? [folder.index] : [];
  const listing = (depth: number) => [
    ...overview.map((item) => itemLine(item, 0, "full")),
    ...renderNodes(folder.children, 0, depth, "full", ctx),
  ];

  const extra = sectionExtraLines(path);

  for (const depth of [Number.POSITIVE_INFINITY, 1, 0]) {
    const text = joinLines([header(""), ...listing(depth), "", ...extra]);
    if (llmsIndexSize(text) <= LLMS_INDEX_TARGET_BYTES) {
      return page === 1 ? { page, pageCount: 1, text } : undefined;
    }
  }

  const budget =
    LLMS_INDEX_TARGET_BYTES -
    llmsIndexSize(header(" (page 99 of 99)")) -
    llmsIndexSize(joinLines(extra)) -
    PAGINATION_RESERVE;
  const chunks = chunkLines(listing(0), budget);
  const chunk = chunks[page - 1];
  if (!chunk) {
    return;
  }
  const pageCount = chunks.length;
  const pageLink = (n: number) =>
    markdownLink(`Page ${n} of ${pageCount}`, `${indexUrl}?page=${n}`);
  const navigation = [
    ...(page > 1 ? [`- Previous: ${pageLink(page - 1)}`] : []),
    ...(page < pageCount ? [`- Next: ${pageLink(page + 1)}`] : []),
  ];
  const text = joinLines([
    header(` (page ${page} of ${pageCount})`),
    ...chunk,
    "",
    "## More pages",
    "",
    ...navigation,
    "",
    ...(page === 1 ? extra : []),
  ]);
  return { page, pageCount, text };
}
