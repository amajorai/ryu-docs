// Shared readers for the docs navigation tests (docs-navigation*.test.ts).
import { fileURLToPath } from "node:url";
import { metaSchema } from "fumadocs-core/source/schema";

export const docsRoot = fileURLToPath(
  new URL("../../content/docs/", import.meta.url),
);
export const internalMarkdownLink = /\[[^\]]+\]\((\/docs(?:\/[^)\s]+)?)\)/g;
const versionSegment = /^\d+\.\d+\.\d+$/;

export async function readMeta(path: string) {
  return metaSchema.parse(await Bun.file(`${docsRoot}/${path}`).json());
}

export async function readPage(path: string): Promise<string> {
  return Bun.file(`${docsRoot}/${path}`).text();
}

export function normalizeDocsHref(href: string): string {
  const pathname = href.split(/[?#]/, 1)[0] ?? href;
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "docs") {
    return pathname;
  }

  if (versionSegment.test(segments[1] ?? "")) {
    segments.splice(1, 1);
  }

  return segments.length === 1 ? "/docs" : `/${segments.join("/")}`;
}

export async function readDocFiles(): Promise<string[]> {
  const files: string[] = [];
  const glob = new Bun.Glob("**/*.mdx");

  for await (const file of glob.scan({ cwd: docsRoot })) {
    files.push(file);
  }

  return files.sort();
}

// Every routable page: the authored `.mdx` pages plus the generated release
// notes, which are plain `.md`. Link targets resolve against all of them; the
// inline-link rules below apply only to authored `.mdx` pages.
export async function readRoutablePageFiles(): Promise<string[]> {
  const files: string[] = [];
  for await (const file of new Bun.Glob("**/*.{md,mdx}").scan({
    cwd: docsRoot,
  })) {
    files.push(file);
  }
  return files.sort();
}

export function pagePathFromFile(file: string): string {
  const withoutExtension = file.replace(/\\/g, "/").replace(/\.mdx?$/, "");
  const withoutIndex = withoutExtension.replace(/\/index$/, "");
  return withoutIndex ? `/docs/${withoutIndex}` : "/docs";
}

export function pagesUnderHeader(
  pages: string[],
  header: string,
  nextHeader?: string,
): string[] {
  const start = pages.indexOf(header);
  const end = nextHeader ? pages.indexOf(nextHeader) : pages.length;

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Missing sidebar section: ${header}`);
  }

  return pages.slice(start + 1, end);
}
