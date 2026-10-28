import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogManifestSchema } from "./catalog-manifest";
import { buildPage, readCoreCatalogState } from "./generate-catalog";

test("Browser catalog regeneration retains annotation recovery and dictation guidance", () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const manifest = catalogManifestSchema.parse(
    JSON.parse(
      readFileSync(path.join(root, "apps-store/browser/manifest.json"), "utf8"),
    ),
  );
  const page = buildPage(manifest, "apps", [], readCoreCatalogState(root));
  expect(page).toContain("Cancel draft");
  expect(page).toContain("button stays disabled to prevent duplicate requests");
  expect(page).toContain("Failed note");
  expect(page).toContain("Dictate annotation");
  expect(page).toContain("Stop voice annotation");
});
