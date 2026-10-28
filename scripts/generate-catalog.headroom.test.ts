import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogManifestSchema } from "./catalog-manifest";
import { buildPage, readCoreCatalogState } from "./generate-catalog";

test("Headroom catalog regeneration preserves chat-path and failure behavior", () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const manifest = catalogManifestSchema.parse(
    JSON.parse(
      readFileSync(
        path.join(root, "plugins-store/plugins/headroom/manifest.json"),
        "utf8",
      ),
    ),
  );
  const page = buildPage(manifest, "plugins", [], readCoreCatalogState(root));
  expect(page).toContain("streaming and non-streaming");
  expect(page).toContain("four messages");
  expect(page).toContain("Gateway sends the original messages");
  expect(page).toContain("disabling it clears");
});
