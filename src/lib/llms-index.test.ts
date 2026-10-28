import { describe, expect, test } from "bun:test";
import { llms } from "fumadocs-core/source";
import { z } from "zod";

import { docsRouteAliases } from "@/lib/canonical-docs";
import { docsPath } from "@/lib/docs-version";
import {
  buildRootLlmsIndex,
  buildSectionLlmsIndex,
  LLMS_INDEX_MAX_CHARS,
  llmsIndexSize,
  llmsPageDescription,
  llmsSectionIndexPaths,
  llmsSectionIndexUrl,
  SERVICE_OPENAPI_INDEX_PATH,
  SERVICE_OPENAPI_PAGE_URL,
  shortDescription,
} from "@/lib/llms-index";
import { siteConfig } from "@/lib/metadata";
import {
  SERVICE_OPENAPI_LINKS,
  serviceOpenApiUrl,
} from "@/lib/service-openapi-links";
import { getLLMText, source, specDescription } from "@/lib/source";

const LINK = /\[(?:[^\]\\]|\\.)+\]\(((?:[^()\s\\]|\\.)+)\)/gu;
const INDEX_PATH = /^\/llms\/(.+)\.txt$/u;

function links(text: string): string[] {
  return [...text.matchAll(LINK)].map((match) =>
    (match[1] ?? "").replace(/\\([()])/gu, "$1"),
  );
}

const pageCounts = new Map<string, number>();

/** Every section index, every continuation page included. */
function allSectionIndexes(): { path: string[]; text: string }[] {
  return llmsSectionIndexPaths().flatMap((path) => {
    const first = buildSectionLlmsIndex(path);
    if (!first) {
      throw new Error(`No index for ${path.join("/")}`);
    }
    pageCounts.set(path.join("/"), first.pageCount);
    const rest = Array.from({ length: first.pageCount - 1 }, (_, i) => {
      const next = buildSectionLlmsIndex(path, i + 2);
      if (!next) {
        throw new Error(`Missing page ${i + 2} of ${path.join("/")}`);
      }
      return next;
    });
    return [first, ...rest].map(({ text }) => ({ path, text }));
  });
}

const root = buildRootLlmsIndex();
const sections = allSectionIndexes();

describe("root /llms.txt", () => {
  test("stays under the agent-readiness size limit", () => {
    expect(root.length).toBeLessThan(LLMS_INDEX_MAX_CHARS);
    expect(llmsIndexSize(root)).toBeLessThan(LLMS_INDEX_MAX_CHARS);
  });

  test("follows the llmstxt.org shape", () => {
    const [title, blank, summary] = root.split("\n");
    expect(title).toBe("# Ryu Documentation");
    expect(blank).toBe("");
    expect(summary).toBe(`> ${siteConfig.description}`);
    expect(root).toContain("\n## Optional\n");
    expect(root).toContain(`(${siteConfig.url}/llms-full.txt)`);
  });

  test("gives every top-level section a heading and a complete index link", () => {
    for (const node of source.getPageTree("en").children) {
      if (node.type !== "folder") {
        continue;
      }
      expect(root).toContain(`\n## ${z.string().parse(node.name)}\n`);
    }
    const sectionLinks = links(root).filter((url) =>
      INDEX_PATH.test(url.replace(siteConfig.url, "")),
    );
    expect(sectionLinks.length).toBeGreaterThanOrEqual(
      source.getPageTree("en").children.length,
    );
  });

  test("keeps every line short: one page per line", () => {
    for (const line of root.split("\n")) {
      expect(line.length).toBeLessThan(600);
    }
  });
});

describe("per-folder /llms/{path}.txt indexes", () => {
  test("every index and continuation page stays under the size limit", () => {
    expect(sections.length).toBeGreaterThan(20);
    for (const { path, text } of sections) {
      if (llmsIndexSize(text) >= LLMS_INDEX_MAX_CHARS) {
        throw new Error(`${path.join("/")} is ${llmsIndexSize(text)} bytes`);
      }
      expect(text.startsWith("# Ryu Docs: ")).toBe(true);
    }
  });

  test("together list every page the complete page-tree index listed", () => {
    const listed = new Set(
      [root, ...sections.map(({ text }) => text)].flatMap(links),
    );
    const previous = links(llms(source).index("en")).map((url) =>
      url.startsWith("/") ? `${siteConfig.url}${url}` : url,
    );
    const redirected = new Set(
      docsRouteAliases.map(
        ({ from }) => `${siteConfig.url}${docsPath(...from.split("/"))}`,
      ),
    );
    const missing = previous.filter(
      (url) => !(listed.has(url) || redirected.has(url)),
    );
    expect(missing).toEqual([]);
  });

  test("every link resolves to a docs page, a folder index, or a site endpoint", () => {
    const endpoints = new Set([
      "/llms.txt",
      "/llms-full.txt",
      "/mcp",
      "/sitemap.xml",
    ]);
    const pageUrls = new Set(source.getPages("en").map((page) => page.url));
    for (const text of [root, ...sections.map((section) => section.text)]) {
      for (const url of links(text)) {
        if (!url.startsWith(siteConfig.url)) {
          continue;
        }
        const target = new URL(url);
        const index = INDEX_PATH.exec(target.pathname);
        if (index?.[1]) {
          const page = Number(target.searchParams.get("page") ?? "1");
          expect(page).toBeLessThanOrEqual(pageCounts.get(index[1]) ?? 0);
        } else if (!endpoints.has(target.pathname)) {
          // Sidebar link items in meta.json use the unversioned /docs/<slug> route, which the
          // docs route also serves; resolve it against the versioned page URL.
          const versioned = docsPath(
            ...target.pathname.replace(/^\/docs\/?/u, "").split("/"),
          );
          expect(
            pageUrls.has(target.pathname) || pageUrls.has(versioned),
            target.pathname,
          ).toBe(true);
        }
      }
    }
  });

  test("never lists a redirected compatibility URL", () => {
    const urls = new Set(
      [root, ...sections.map(({ text }) => text)].flatMap(links),
    );
    for (const { from } of docsRouteAliases) {
      expect(urls.has(`${siteConfig.url}${docsPath(...from.split("/"))}`)).toBe(
        false,
      );
    }
  });

  test("rejects unknown folders and out-of-range continuation pages", () => {
    expect(buildSectionLlmsIndex(["missing-section"])).toBeUndefined();
    expect(buildSectionLlmsIndex([])).toBeUndefined();
    expect(buildSectionLlmsIndex(["start-here"], 0)).toBeUndefined();
    const first = buildSectionLlmsIndex(["start-here"]);
    expect(first?.pageCount).toBe(1);
    expect(buildSectionLlmsIndex(["start-here"], 2)).toBeUndefined();
  });

  test("links a split listing's pages to each other", () => {
    const split = llmsSectionIndexPaths().find(
      (path) => (buildSectionLlmsIndex(path)?.pageCount ?? 1) > 1,
    );
    if (!split) {
      return;
    }
    const first = buildSectionLlmsIndex(split);
    const last = buildSectionLlmsIndex(split, first?.pageCount);
    const url = `${siteConfig.url}${llmsSectionIndexUrl(split)}`;
    expect(first?.text).toContain(`(${url}?page=2)`);
    expect(last?.text).toContain(
      `(${url}?page=${(first?.pageCount ?? 2) - 1})`,
    );
  });
});

describe("service OpenAPI document links", () => {
  test("the root index points to the SDK index for the service OpenAPI documents", () => {
    expect(root).toContain("\n## Standalone service OpenAPI documents\n");
    const urls = new Set(links(root));
    expect(
      urls.has(
        `${siteConfig.url}${llmsSectionIndexUrl(SERVICE_OPENAPI_INDEX_PATH)}`,
      ),
    ).toBe(true);
    expect(urls.has(`${siteConfig.url}${SERVICE_OPENAPI_PAGE_URL}`)).toBe(true);
    for (const service of SERVICE_OPENAPI_LINKS) {
      expect(root).toContain(service.title);
    }
  });

  test("the service OpenAPI page URL is a real docs page", () => {
    expect(
      source
        .getPages("en")
        .some((page) => page.url === SERVICE_OPENAPI_PAGE_URL),
    ).toBe(true);
  });

  test("the root pointer stays one short paragraph", () => {
    const start = root.indexOf("## Standalone service OpenAPI documents");
    const end = root.indexOf("\n## ", start + 1);
    const section = root.slice(start, end);
    expect(section.trim().split("\n").filter(Boolean)).toHaveLength(2);
    expect(Buffer.byteLength(section, "utf8")).toBeLessThan(400);
    for (const service of SERVICE_OPENAPI_LINKS) {
      expect(section).not.toContain(serviceOpenApiUrl(service.slug));
    }
  });

  test("the SDK index lists each document with its servers and status", () => {
    const sdk = buildSectionLlmsIndex(SERVICE_OPENAPI_INDEX_PATH);
    expect(sdk?.text).toContain("\n## Service OpenAPI documents\n");
    expect(sdk?.text).toContain(
      `(${siteConfig.url}${SERVICE_OPENAPI_PAGE_URL})`,
    );
    for (const service of SERVICE_OPENAPI_LINKS) {
      expect(sdk?.text).toContain(
        `(${serviceOpenApiUrl(service.slug)}): served at ${service.servers}.`,
      );
    }
  });

  test("no other folder index repeats them", () => {
    const sdkPath = SERVICE_OPENAPI_INDEX_PATH.join("/");
    for (const { path, text } of sections) {
      if (path.join("/") !== sdkPath) {
        expect(text).not.toContain("## Service OpenAPI documents");
      }
    }
  });
});

describe("generated OpenAPI reference pages", () => {
  test("are listed with the operation description from the spec", () => {
    const text = sections.map((section) => section.text).join("\n");
    expect(text).toContain(
      `[List delivery attempts](${siteConfig.url}${docsPath("standalone/sdk/reference/notify/deliveries/listDeliveries")}): Lists durable delivery attempts, newest first, with their status, attempts and last error.`,
    );
  });

  test("every reference page has an index description from the spec", () => {
    const prefix = docsPath("standalone/sdk/reference/");
    const pages = source
      .getPages("en")
      .filter((page) => page.url.startsWith(prefix));
    expect(pages.length).toBeGreaterThan(0);
    const missing = pages.flatMap((page) => {
      const fromSpec = specDescription(page.data._openapi);
      const description = llmsPageDescription(page);
      // Folder overviews carry frontmatter; generated operation pages do not.
      const expected = shortDescription(page.data.description || fromSpec);
      return description && description === expected ? [] : [page.url];
    });
    expect(missing).toEqual([]);
    const operations = pages.filter((page) => !page.data.description);
    expect(operations.length).toBeGreaterThan(0);
    for (const page of operations) {
      expect(llmsPageDescription(page)).toBe(
        shortDescription(specDescription(page.data._openapi)),
      );
    }
  });

  test("Markdown projections carry no generator scaffolding", async () => {
    const prefix = docsPath("standalone/sdk/reference/");
    const pages = source
      .getPages("en")
      .filter((page) => page.url.startsWith(prefix) && page.data._openapi);
    expect(pages.length).toBeGreaterThan(0);
    const findings: string[] = [];
    let operations = 0;
    for (const page of pages) {
      const text = await getLLMText(page);
      if (
        text.includes("## ") &&
        /^## (?:GET|POST|PUT|PATCH|DELETE) /m.test(text)
      ) {
        operations += 1;
      }
      if (
        text.includes("export default function Layout") ||
        text.includes("This file was generated by Fumadocs") ||
        text.includes("<Comp document=")
      ) {
        findings.push(page.url);
      }
    }
    expect(findings).toEqual([]);
    expect(operations).toBeGreaterThan(0);
  });

  test("no index line ends inside an open code span", () => {
    const unbalanced = sections
      .flatMap((section) => section.text.split("\n"))
      .filter((line) => /^\s*- \[/u.test(line))
      .filter((line) => (line.match(/`/gu)?.length ?? 0) % 2 === 1);
    expect(unbalanced).toEqual([]);
  });
});

describe("shortDescription", () => {
  test("flattens whitespace and cuts long text on a word boundary", () => {
    expect(shortDescription(" A\n  short\tline. ")).toBe("A short line.");
    expect(shortDescription(undefined)).toBe("");
    const long = shortDescription(`${"word ".repeat(60)}end`);
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("word…")).toBe(true);
  });

  test("never ends inside an inline code span", () => {
    const prefix = `${"word ".repeat(26)}with a ticket from `;
    const cut = shortDescription(
      `${prefix}\`POST /v1/realtime/tickets\` and more ${"tail ".repeat(10)}`,
    );
    expect((cut.match(/`/gu)?.length ?? 0) % 2).toBe(0);
    expect(cut).toBe(`${prefix.trimEnd()}…`);
    const closed = shortDescription(
      `Sets \`subject\` to the original's ${"word ".repeat(40)}`,
    );
    expect(closed.startsWith("Sets `subject` to the original's")).toBe(true);
  });
});
