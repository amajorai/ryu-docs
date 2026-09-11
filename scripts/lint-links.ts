import { frontmatter } from "fumadocs-core/content/md/frontmatter";
import {
  type FileObject,
  printErrors,
  scanURLs,
  validateFiles,
} from "next-validate-link";

import { DOCS_VERSION } from "../src/lib/docs-version";
import { source } from "../src/lib/source";

function headings(page: (typeof source)["$inferPage"]): string[] {
  return (page.data.toc ?? []).map((item) => item.url.slice(1));
}

function pageParams(page: (typeof source)["$inferPage"]) {
  const hashes = headings(page);

  return [
    {
      value: [DOCS_VERSION, ...page.slugs],
      hashes,
    },
    {
      value: page.slugs,
      hashes,
    },
  ];
}

async function getFiles(): Promise<FileObject[]> {
  return Promise.all(
    source.getPages().map(async (page): Promise<FileObject> => {
      const url = page.url;
      const path = page.absolutePath;
      if (!url || !path) {
        throw new Error(
          `Documentation page is missing its URL or path: ${path ?? "unknown"}`,
        );
      }
      return {
        path,
        content: frontmatter(await page.data.getText("raw")).content,
        url,
        data: page.data,
      };
    }),
  );
}

async function checkLinks() {
  const pages = source.getPages();
  const scanned = await scanURLs({
    preset: "next",
    populate: {
      "docs/[[...slug]]": pages.flatMap(pageParams),
    },
  });

  const errors = await validateFiles(await getFiles(), {
    scanned,
    markdown: {
      components: {
        Card: { attributes: ["href"] },
        DocCard: { attributes: ["href"] },
      },
    },
    checkRelativePaths: "as-url",
    // These are valid routes owned by the docs host or the main Ryu site, but
    // they are not content pages represented by the Fumadocs source loader.
    whitelist: [
      "/llms.txt",
      "/llms-full.txt",
      "/mcp",
      "/pricing",
      "/products/hire",
    ],
  });

  printErrors(errors, true);
  console.info(
    `Validated ${pages.length} docs pages (${pages.reduce((count, page) => count + pageParams(page).length, 0)} URL variants).`,
  );
}

await checkLinks();
