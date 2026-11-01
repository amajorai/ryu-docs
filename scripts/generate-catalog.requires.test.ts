import { expect, test } from "bun:test";
import path from "node:path";
import { catalogManifestSchema } from "./catalog-manifest";
import { buildPage, readCoreCatalogState } from "./generate-catalog";

const root = path.resolve(import.meta.dirname, "../../..");

test("Dependencies lists required capabilities with their contract version", () => {
  const manifest = catalogManifestSchema.parse({
    id: "@acme/needs-browser",
    name: "Needs Browser",
    version: "1.0.0",
    description: "Example app with dependencies.",
    requires: {
      apps: [{ id: "@ryu/shadow", min_version: "0.1.14" }],
      capabilities: [{ capability: "browser.control", min_version: "1.0.0" }],
      grants: ["browser:control"],
    },
  });
  const page = buildPage(manifest, "apps", [], readCoreCatalogState(root));
  expect(page).toContain("## Dependencies");
  expect(page).toContain("- `@ryu/shadow` (min `0.1.14`)");
  expect(page).toContain("Requires these capabilities:");
  expect(page).toContain("- `browser.control` (min `1.0.0`)");
  expect(page).toContain("Needs these grants: `browser:control`");
});

test("a capability-only requirement still renders a Dependencies section", () => {
  const manifest = catalogManifestSchema.parse({
    id: "@acme/needs-rlm",
    name: "Needs RLM",
    version: "1.0.0",
    description: "Example app with a capability dependency.",
    requires: { capabilities: [{ capability: "rlm.query" }] },
  });
  const page = buildPage(manifest, "apps", [], readCoreCatalogState(root));
  expect(page).toContain("## Dependencies");
  expect(page).toContain("- `rlm.query`\n");
});
