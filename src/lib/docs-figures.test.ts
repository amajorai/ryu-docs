import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { DOCS_FIGURES } from "@/components/mdx/docs-figures.generated";

const docsRoot = fileURLToPath(new URL("../../content/docs/", import.meta.url));
const FIGURE_TAG = /<Figure\s+name="([^"]+)"\s*\/>/g;

test("every <Figure> in the docs names a generated figure", async () => {
  const missing: string[] = [];
  const glob = new Bun.Glob("**/*.mdx");
  for await (const file of glob.scan({ cwd: docsRoot })) {
    const content = await Bun.file(`${docsRoot}/${file}`).text();
    for (const [, name] of content.matchAll(FIGURE_TAG)) {
      if (!(name && name in DOCS_FIGURES)) {
        missing.push(`${file}: ${name}`);
      }
    }
  }
  expect(missing).toEqual([]);
});
