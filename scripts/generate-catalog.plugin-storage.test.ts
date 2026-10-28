import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogManifestSchema } from "./catalog-manifest";
import { buildPage, readCoreCatalogState } from "./generate-catalog";

const root = path.resolve(import.meta.dirname, "../../..");
const state = readCoreCatalogState(root);

for (const name of ["recap", "security-scanner"]) {
  test(`${name} catalog regeneration retains authored storage failure and retry guidance`, () => {
    const manifest = catalogManifestSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(root, "plugins-store/plugins", name, "manifest.json"),
          "utf8",
        ),
      ),
    );
    const page = buildPage(manifest, "plugins", [], state);
    expect(page).toContain("storage accepts");
    expect(page).toContain("you can retry");
    if (name === "recap") {
      expect(page).toContain("refuses to replace it with empty history");
      expect(page).toContain("`/recap clear`");
    } else {
      expect(page).toContain("`/security-clear`");
      expect(page).toContain("failed clear does not confirm");
    }
  });
}
