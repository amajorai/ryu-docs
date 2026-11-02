import { open } from "node:fs/promises";
import path from "node:path";

// Relative, not `@/`: source.config.ts bundles this without the tsconfig paths.
import { parseSvgViewBox } from "../components/mdx/diagram-viewbox";

/*
 * Gives every `<Excalidraw src="/…">` in MDX the intrinsic `width`/`height`
 * of its SVG export, read from the file's root `viewBox` at build time. The
 * inline `<img>` then reserves its box before the image loads (no layout
 * shift), and the lightbox can fit the diagram without waiting for it.
 *
 * Only site-relative files under `public/` are read; remote URLs and authored
 * `width`/`height` are left alone, and an unreadable file is left for the
 * browser to size, so a missing export shows up as a broken image rather than
 * failing the whole docs build.
 */

interface MdxJsxAttribute {
  type: string;
  name?: string;
  value?: unknown;
}

interface MdNode {
  type: string;
  name?: string | null;
  attributes?: MdxJsxAttribute[];
  children?: MdNode[];
}

/** The root `<svg>` tag of an export, fonts and scene data come after it. */
const HEAD_BYTES = 16 * 1024;
const QUERY_OR_HASH = /[?#]/;

export interface RemarkExcalidrawDimensionsOptions {
  /** Directory site-relative `src` paths resolve against. Default `./public`. */
  publicDir?: string;
}

export function remarkExcalidrawDimensions(
  options: RemarkExcalidrawDimensionsOptions = {},
) {
  const publicDir = path.resolve(
    options.publicDir ?? path.join(process.cwd(), "public"),
  );
  return async (tree: MdNode): Promise<void> => {
    const elements = collectExcalidrawElements(tree);
    await Promise.all(
      elements.map((element) => addDimensions(element, publicDir)),
    );
  };
}

function collectExcalidrawElements(tree: MdNode): MdNode[] {
  const found: MdNode[] = [];
  const stack = [tree];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (
      (node.type === "mdxJsxFlowElement" ||
        node.type === "mdxJsxTextElement") &&
      node.name === "Excalidraw"
    ) {
      found.push(node);
    }
    stack.push(...(node.children ?? []));
  }
  return found;
}

function attribute(node: MdNode, name: string): MdxJsxAttribute | undefined {
  return node.attributes?.find(
    (candidate) =>
      candidate.type === "mdxJsxAttribute" && candidate.name === name,
  );
}

/** `public/` file for a site-relative `src`, or `null` for anything else. */
export function resolvePublicSvg(
  src: string,
  publicDir: string,
): string | null {
  if (!src.startsWith("/") || src.startsWith("//")) {
    return null;
  }
  let pathname: string;
  try {
    pathname = decodeURIComponent(src.split(QUERY_OR_HASH, 1)[0] ?? "");
  } catch {
    return null;
  }
  const file = path.resolve(publicDir, `.${pathname}`);
  const inside = file.startsWith(`${publicDir}${path.sep}`);
  return inside && file.toLowerCase().endsWith(".svg") ? file : null;
}

export async function readSvgHead(file: string): Promise<string> {
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEAD_BYTES, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

async function addDimensions(node: MdNode, publicDir: string): Promise<void> {
  if (attribute(node, "width") || attribute(node, "height")) {
    return;
  }
  const src = attribute(node, "src")?.value;
  const file =
    typeof src === "string" ? resolvePublicSvg(src, publicDir) : null;
  if (!file) {
    return;
  }
  let head: string;
  try {
    head = await readSvgHead(file);
  } catch {
    // Missing or unreadable: the browser sizes the image from the file itself.
    return;
  }
  const { width, height } = parseSvgViewBox(head);
  if (width > 0 && height > 0) {
    node.attributes ??= [];
    node.attributes.push(
      { type: "mdxJsxAttribute", name: "width", value: String(width) },
      { type: "mdxJsxAttribute", name: "height", value: String(height) },
    );
  }
}
