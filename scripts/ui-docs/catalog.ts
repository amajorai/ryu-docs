/** Source discovery: resolve @ryu/ui modules and build the component catalog. */
import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";

import { CATEGORY_ORDER, DEFAULT_DESCRIPTIONS } from "./catalog-data.ts";
import { extractComponentExports } from "./component-exports.ts";
import { previewMetadata } from "./preview-metadata.ts";
import {
  COMPONENT_CATALOG_SOURCE,
  type ComponentHint,
  lookupCatalogValue,
  packageJsonSchema,
  UI_PACKAGE_ROOT,
  type UiComponent,
} from "./shared.ts";

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function componentTitle(importPath: string, hint?: string): string {
  if (hint) {
    return hint;
  }
  const segments = importPath.split("/").filter(Boolean);
  const last = segments.at(-1) ?? "component";
  const previous = segments.at(-2);
  const value = last === "index" && previous ? previous : last;
  return humanize(value);
}

function pageSlug(importPath: string): string {
  return importPath
    .replace(/^components\//, "")
    .replace(/\/index$/, "")
    .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function categoryForImport(importPath: string, hint?: string): string {
  if (hint) {
    return hint;
  }
  if (importPath.includes("/agents/")) {
    return "Agent UI";
  }
  if (importPath.includes("/data-grid/")) {
    return "Data Grid";
  }
  if (importPath.includes("/editor/")) {
    return "Editor";
  }
  if (importPath.includes("/dither-kit/")) {
    return "Specialized";
  }
  if (importPath.includes("/motion/")) {
    return "Animation & Effects";
  }
  return "Primitives";
}

function parseComponentHints(source: string): ComponentHint[] {
  const hints: ComponentHint[] = [];
  let category = "Primitives";
  const rowPattern =
    /^\| \*\*(.+?)\*\* \| `(@ryu\/ui\/components\/[^`]+)` \| (.*?) \|$/;

  for (const line of source.split("\n")) {
    const heading = line.match(/^## (.+)$/);
    if (heading?.[1]) {
      category = heading[1];
      continue;
    }
    const row = line.match(rowPattern);
    if (!row) {
      continue;
    }
    const [, title, packageImport, description] = row;
    if (!title || !packageImport) {
      continue;
    }
    hints.push({
      category,
      description: description?.trim() || "Reusable interface component.",
      importPath: packageImport
        .replace("@ryu/ui/", "")
        .replace(/\.(tsx|ts)$/, ""),
      title,
    });
  }
  return hints;
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function sourcePathFromPackageTarget(target: string): string {
  return path.join(UI_PACKAGE_ROOT, target.replace(/^\.\//, ""));
}

async function resolveSourcePath(
  importPath: string,
): Promise<string | undefined> {
  const relative = importPath.replace(/^components\//, "components/");
  const candidates = [
    path.join(UI_PACKAGE_ROOT, "src", `${relative}.tsx`),
    path.join(UI_PACKAGE_ROOT, "src", `${relative}.ts`),
    path.join(UI_PACKAGE_ROOT, "src", relative, "index.tsx"),
    path.join(UI_PACKAGE_ROOT, "src", relative, "index.ts"),
  ];
  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return candidate;
    }
  }

  const directory = path.join(UI_PACKAGE_ROOT, "src", relative);
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const sourceEntries = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /\.(tsx|ts)$/.test(entry.name) &&
          !entry.name.endsWith(".d.ts") &&
          !entry.name.endsWith(".test.ts"),
      )
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
    const preferredNames = [
      `${importPath.split("/").at(-1) ?? ""}.tsx`,
      `${humanize(importPath.split("/").at(-1) ?? "").replaceAll(" ", "")}.tsx`,
      ...sourceEntries,
    ];
    const preferred = preferredNames.find((name) =>
      sourceEntries.includes(name),
    );
    if (preferred) {
      return path.join(directory, preferred);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function importPathFromSource(sourcePath: string): string {
  const relative = path
    .relative(path.join(UI_PACKAGE_ROOT, "src"), sourcePath)
    .split(path.sep)
    .join("/");
  const withoutExtension = relative.replace(/\.(tsx|ts)$/, "");
  return withoutExtension.endsWith("/index")
    ? withoutExtension.slice(0, -"/index".length)
    : withoutExtension;
}

function mergeComponent(
  components: Map<string, UiComponent>,
  candidate: {
    category?: string;
    description?: string;
    exports: string[];
    importPath: string;
    sourcePath: string;
    title?: string;
  },
): void {
  const existing = components.get(candidate.importPath);
  if (existing) {
    existing.exports = [
      ...new Set([...existing.exports, ...candidate.exports]),
    ].sort((left, right) => left.localeCompare(right));
    if (
      candidate.description &&
      existing.description === "Reusable interface component."
    ) {
      existing.description = candidate.description;
    }
    if (candidate.title) {
      existing.title = candidate.title;
    }
    if (candidate.category) {
      existing.category = candidate.category;
    }
    return;
  }

  components.set(candidate.importPath, {
    category: candidate.category ?? categoryForImport(candidate.importPath),
    description: candidate.description ?? "Reusable interface component.",
    exports: candidate.exports,
    importPath: candidate.importPath,
    pageSlug: pageSlug(candidate.importPath),
    preview: { props: {}, targetExport: "" },
    sourcePath: candidate.sourcePath,
    title: candidate.title ?? componentTitle(candidate.importPath),
  });
}

export async function buildUiCatalog(): Promise<UiComponent[]> {
  const packageJson = packageJsonSchema.parse(
    JSON.parse(
      await readFile(path.join(UI_PACKAGE_ROOT, "package.json"), "utf8"),
    ),
  );
  const hints = parseComponentHints(
    await readFile(COMPONENT_CATALOG_SOURCE, "utf8"),
  );
  const hintByImport = new Map(hints.map((hint) => [hint.importPath, hint]));
  const components = new Map<string, UiComponent>();

  for (const [key, target] of Object.entries(packageJson.exports ?? {})) {
    if (
      !key.startsWith("./components/") ||
      key.includes("*") ||
      !/\.(tsx|ts)$/.test(target)
    ) {
      continue;
    }
    const sourcePath = sourcePathFromPackageTarget(target);
    if (!(await isFile(sourcePath))) {
      continue;
    }
    const exports = extractComponentExports(await readFile(sourcePath, "utf8"));
    if (exports.length === 0) {
      continue;
    }
    const importPath = key.slice(2);
    const hint = hintByImport.get(importPath);
    mergeComponent(components, {
      category: hint?.category ?? categoryForImport(importPath),
      description:
        hint?.description ??
        lookupCatalogValue(DEFAULT_DESCRIPTIONS, importPath),
      exports,
      importPath,
      sourcePath,
      title: hint?.title,
    });
  }

  for (const hint of hints) {
    const sourcePath = await resolveSourcePath(hint.importPath);
    if (!sourcePath) {
      continue;
    }
    const exports = extractComponentExports(await readFile(sourcePath, "utf8"));
    if (exports.length === 0) {
      continue;
    }
    const actualImportPath =
      sourcePath.endsWith(`${hint.importPath}.tsx`) ||
      sourcePath.endsWith(`${hint.importPath}.ts`)
        ? hint.importPath
        : importPathFromSource(sourcePath);
    mergeComponent(components, {
      category: hint.category,
      description: hint.description,
      exports,
      importPath: actualImportPath,
      sourcePath,
      title: hint.title,
    });
  }

  const catalog = [...components.values()].sort((left, right) => {
    const leftCategory = CATEGORY_ORDER.indexOf(left.category);
    const rightCategory = CATEGORY_ORDER.indexOf(right.category);
    return (
      (leftCategory === -1 ? CATEGORY_ORDER.length : leftCategory) -
        (rightCategory === -1 ? CATEGORY_ORDER.length : rightCategory) ||
      left.title.localeCompare(right.title)
    );
  });

  const slugs = new Set<string>();
  for (const component of catalog) {
    if (slugs.has(component.pageSlug)) {
      throw new Error(
        `Duplicate UI component page slug: ${component.pageSlug}`,
      );
    }
    slugs.add(component.pageSlug);
    const source = await readFile(component.sourcePath, "utf8");
    const variantSources =
      component.importPath === "components/button"
        ? [
            await readFile(
              path.join(UI_PACKAGE_ROOT, "src/components/button-variants.ts"),
              "utf8",
            ),
          ]
        : [];
    component.preview = previewMetadata(component, source, variantSources);
  }
  return catalog;
}
