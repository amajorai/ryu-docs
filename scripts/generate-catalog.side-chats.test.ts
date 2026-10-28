import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogManifestSchema } from "./catalog-manifest";
import { buildPage, readCoreCatalogState } from "./generate-catalog";

test("Side Chats guide survives regeneration with cancellation and retry boundaries", () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const manifest = catalogManifestSchema.parse(
    JSON.parse(
      readFileSync(
        path.join(root, "plugins-store/plugins/side-chats/manifest.json"),
        "utf8",
      ),
    ),
  );
  const page = buildPage(manifest, "plugins", [], readCoreCatalogState(root));
  expect(page).toContain("retry explicitly");
  expect(page).toContain("A late result cannot reopen");
  expect(page).toContain("node credentials");
  expect(page).toContain("does not guarantee that a remote model stopped");
});
