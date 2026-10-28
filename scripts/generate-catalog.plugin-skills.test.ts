import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogManifestSchema } from "./catalog-manifest";
import { buildPage, readCoreCatalogState } from "./generate-catalog";

const root = path.resolve(import.meta.dirname, "../../..");
for (const name of ["writing-style", "llm-wiki", "security-scanner"]) {
  test(`${name} regeneration retains installed skill ownership and retry guidance`, () => {
    const manifest = catalogManifestSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(root, "plugins-store/plugins", name, "manifest.json"),
          "utf8",
        ),
      ),
    );
    const page = buildPage(manifest, "plugins", [], readCoreCatalogState(root));
    expect(page).toContain("A catalog entry alone does not supply skill files");
    expect(page).toContain(
      "same-name skill installed by you or another plugin is preserved",
    );
    expect(page).toContain("enable the plugin again to retry");
    expect(page).toContain('"builtIn":false');
  });
}
