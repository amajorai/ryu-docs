import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";

import { buildUiCatalog } from "./generate-ui-docs";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const COMPONENTS_ROOT = path.join(
  REPO_ROOT,
  "apps/fumadocs/content/docs/ui/components",
);

type PackageJson = {
  exports?: Record<string, string>;
};

async function readPackageJson(): Promise<PackageJson> {
  return JSON.parse(
    await readFile(path.join(REPO_ROOT, "packages/ui/package.json"), "utf8"),
  ) as PackageJson;
}

function isExported(importPath: string, packageJson: PackageJson): boolean {
  const key = `./${importPath}`;
  return Object.keys(packageJson.exports ?? {}).some(
    (exportPath) => exportPath === key || (exportPath === "./components/*" && importPath.startsWith("components/")),
  );
}

describe("Ryu UI documentation catalog", () => {
  test("contains unique component pages backed by package exports", async () => {
    const [catalog, packageJson] = await Promise.all([
      buildUiCatalog(),
      readPackageJson(),
    ]);
    const pageSlugs = catalog.map((component) => component.pageSlug);

    expect(catalog.length).toBeGreaterThan(80);
    expect(new Set(pageSlugs).size).toBe(catalog.length);
    for (const component of catalog) {
      expect(isExported(component.importPath, packageJson)).toBe(true);
      expect(component.exports.length).toBeGreaterThan(0);
      expect(component.importPath).toMatch(/^components\//);
    }
  });

  test("checked-in pages match the generated catalog", async () => {
    const catalog = await buildUiCatalog();
    const metadata = JSON.parse(
      await readFile(path.join(COMPONENTS_ROOT, "meta.json"), "utf8"),
    ) as { pages?: string[] };
    const expectedPages = ["index", ...catalog.map((component) => component.pageSlug)];
    expect(metadata.pages).toEqual(expectedPages);

    const files = (await readdir(COMPONENTS_ROOT))
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""))
      .sort();
    expect(files).toEqual([...expectedPages].sort());
  });

  test("the UI realm contains no external source-comparison copy", async () => {
    const files = await readdir(COMPONENTS_ROOT);
    for (const file of files.filter((entry) => entry.endsWith(".mdx"))) {
      const content = await readFile(path.join(COMPONENTS_ROOT, file), "utf8");
      expect(content).not.toMatch(/agent[- ]native|shadcn/i);
    }
  });
});
