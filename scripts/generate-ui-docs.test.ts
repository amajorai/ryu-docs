import { beforeAll, describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import ts from "typescript";
import { z } from "zod";
import { getUiComponentModuleLoader } from "../src/components/mdx/ui-component-modules.generated";

import {
  buildUiCatalog,
  componentNavigationPages,
  hasVariantOrSizeOptions,
  previewMetadataSource,
  previewModulesSource,
} from "./generate-ui-docs";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const COMPONENTS_ROOT = path.join(
  REPO_ROOT,
  "apps/fumadocs/content/docs/ui/components",
);

const packageJsonSchema = z.object({
  exports: z.record(z.string(), z.string()).optional(),
});
type PackageJson = z.output<typeof packageJsonSchema>;

async function readPackageJson(): Promise<PackageJson> {
  return packageJsonSchema.parse(
    JSON.parse(
      await readFile(path.join(REPO_ROOT, "packages/ui/package.json"), "utf8"),
    ),
  );
}

function isExported(importPath: string, packageJson: PackageJson): boolean {
  const key = `./${importPath}`;
  return Object.keys(packageJson.exports ?? {}).some(
    (exportPath) =>
      exportPath === key ||
      (exportPath === "./components/*" && importPath.startsWith("components/")),
  );
}

// One catalog build parses every @ryu/ui source file with the TypeScript
// compiler, which takes several seconds on a shared CI host. Build it once for
// the suite so each case reads the same generator output instead of racing
// Bun's five-second default per test.
const CATALOG_BUILD_TIMEOUT_MS = 120_000;
type UiCatalog = Awaited<ReturnType<typeof buildUiCatalog>>;

describe("Ryu UI documentation catalog", () => {
  let catalog: UiCatalog = [];

  beforeAll(async () => {
    catalog = await buildUiCatalog();
  }, CATALOG_BUILD_TIMEOUT_MS);

  test("lazy registry reproduces static imports and safely rejects unknown paths", async () => {
    const generated = previewModulesSource(catalog);
    const checkedIn = await readFile(
      path.join(
        REPO_ROOT,
        "apps/fumadocs/src/components/mdx/ui-component-modules.generated.ts",
      ),
      "utf8",
    );
    expect(checkedIn).toBe(generated);
    const metadata = await readFile(
      path.join(
        REPO_ROOT,
        "apps/fumadocs/src/components/mdx/ui-component-preview-metadata.generated.ts",
      ),
      "utf8",
    );
    expect(metadata).toBe(previewMetadataSource(catalog));
    const ast = ts.createSourceFile(
      "registry.ts",
      generated,
      ts.ScriptTarget.Latest,
      true,
    );
    const imports: string[] = [];
    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const argument = node.arguments[0];
        if (!argument || !ts.isStringLiteral(argument)) {
          throw new Error(
            "Lazy imports must remain literal for Next's bundler",
          );
        }
        imports.push(argument.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    expect(imports).toEqual(
      catalog.map((component) => `@ryu/ui/${component.importPath}`),
    );
    for (const component of catalog) {
      expect(getUiComponentModuleLoader(component.importPath)).toBeFunction();
    }
    for (const path of [
      "components/missing",
      "__proto__",
      "constructor",
      "toString",
      "",
    ]) {
      expect(getUiComponentModuleLoader(path)).toBeUndefined();
    }
  });

  test("contains unique component pages backed by package exports", async () => {
    const packageJson = await readPackageJson();
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
    const metadata = z
      .object({ pages: z.array(z.string()).optional() })
      .parse(
        JSON.parse(
          await readFile(path.join(COMPONENTS_ROOT, "meta.json"), "utf8"),
        ),
      );
    const expectedPages = componentNavigationPages(catalog);
    expect(metadata.pages).toEqual(expectedPages);

    const files = (await readdir(COMPONENTS_ROOT))
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""))
      .sort();
    expect(files).toEqual(
      expectedPages.filter((page) => !page.startsWith("---")).sort(),
    );
  });

  test("every component page has previews, conditional variants, settings, and a lazy loader", async () => {
    const [previewSource, metadataSource] = await Promise.all([
      readFile(
        path.join(
          REPO_ROOT,
          "apps/fumadocs/src/components/mdx/ui-component-modules.generated.ts",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          REPO_ROOT,
          "apps/fumadocs/src/components/mdx/ui-component-preview-metadata.generated.ts",
        ),
        "utf8",
      ),
    ]);

    for (const component of catalog) {
      const page = await readFile(
        path.join(COMPONENTS_ROOT, `${component.pageSlug}.mdx`),
        "utf8",
      );
      expect(page).toMatch(
        /<UiComponentPreview component="components\/[^"]+" exportName="[^"]+" \/>/,
      );
      expect(page).toContain(
        `<UiComponentPreview component="${component.importPath}" exportName=`,
      );
      if (hasVariantOrSizeOptions(component.preview)) {
        expect(page).toContain("## Variants");
        expect(page).toContain('mode="variants" />');
      } else {
        expect(page).not.toContain("## Variants");
        expect(page).not.toContain('mode="variants" />');
      }
      expect(page).toContain('mode="settings" />');
      expect(previewSource).toContain(`"${component.importPath}": async () =>`);
      expect(metadataSource).toContain(`"${component.importPath}":`);
    }

    const button = catalog.find(
      (component) => component.importPath === "components/button",
    );
    expect(button?.preview.props.variant).toContain("progress");
    expect(button?.preview.props.size).toContain("icon-lg");

    const logo = catalog.find(
      (component) => component.importPath === "components/logo",
    );
    expect(logo?.preview.props.variant).toContain("outline-muted");
    expect(logo?.preview.props.animation).toContain("random");
    expect(logo?.preview.props.animation).toContain("wink");
    expect(logo?.preview.props.animation).toHaveLength(15);
    expect(logo?.preview.props.expression).toContain("random");
    expect(logo?.preview.props.expression).toContain("surprised");
    expect(logo?.preview.props.expression).toHaveLength(18);
    expect(logo?.preview.props.variant).toContain("3d");

    const planBadge = catalog.find(
      (component) => component.importPath === "components/plan-badge",
    );
    expect(planBadge?.preview.props.plan).toEqual([
      "business",
      "desktop-license",
      "enterprise",
      "marketplace-membership",
      "max",
      "plus",
      "pro",
      "teams",
      "teams-lite",
    ]);

    const contributions = catalog.find(
      (component) => component.importPath === "components/contributions-graph",
    );
    expect(contributions?.preview.props.variant).toEqual([
      "city-lights",
      "default",
      "minimal",
    ]);

    const spinner = catalog.find(
      (component) => component.importPath === "components/spinner",
    );
    expect(spinner?.preview.props.size).toEqual(["default", "lg", "md", "sm"]);

    const loader = catalog.find(
      (component) => component.importPath === "components/motion/loader",
    );
    expect(loader?.preview.props.variant).toContain("ascii-braille");

    const motionHighlight = catalog.find(
      (component) => component.importPath === "components/motion-highlight",
    );
    expect(motionHighlight?.preview.props.mode).toEqual(["children", "parent"]);

    const timeline = catalog.find(
      (component) => component.importPath === "components/run-status-timeline",
    );
    expect(timeline?.preview.props.status).toBeUndefined();

    const todoList = catalog.find(
      (component) => component.importPath === "components/agents/todo-list",
    );
    expect(todoList?.preview.props.status).toBeUndefined();
  });

  test("the UI realm contains no external source-comparison copy", async () => {
    const files = await readdir(COMPONENTS_ROOT);
    for (const file of files.filter((entry) => entry.endsWith(".mdx"))) {
      const content = await readFile(path.join(COMPONENTS_ROOT, file), "utf8");
      expect(content).not.toMatch(/agent[- ]native|shadcn/i);
    }
  });
});
