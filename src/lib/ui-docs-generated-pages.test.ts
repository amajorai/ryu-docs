import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildUiCatalog,
  renderUiDocsPages,
} from "../../scripts/generate-ui-docs";

const componentsRoot = fileURLToPath(
  new URL("../../content/docs/ui/components/", import.meta.url),
);

// `bun run build` regenerates every @ryu/ui component page before `next build`.
// A hand edit to a generated page is silently reverted by that step, so the
// published page would differ from the reviewed source. Compare each checked-in
// file with the generator output byte-for-byte instead of only its file list.
test("checked-in @ryu/ui component pages are exactly the generator output", async () => {
  const rendered = renderUiDocsPages(await buildUiCatalog());
  const renderedNames = rendered.map((page) => page.fileName).sort();
  const checkedInNames = (await readdir(componentsRoot)).sort();

  expect(checkedInNames).toEqual(renderedNames);

  const drifted: string[] = [];
  for (const page of rendered) {
    const checkedIn = await readFile(
      join(componentsRoot, page.fileName),
      "utf8",
    );
    if (checkedIn !== page.content) {
      drifted.push(page.fileName);
    }
  }

  expect(drifted).toEqual([]);
}, 60_000);
