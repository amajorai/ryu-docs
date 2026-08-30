import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const UI_PACKAGE_ROOT = path.join(REPO_ROOT, "packages/ui");
const CONTENT_ROOT = path.join(REPO_ROOT, "apps/fumadocs/content/docs/ui");
const COMPONENTS_ROOT = path.join(CONTENT_ROOT, "components");
const PREVIEW_MODULES_SOURCE = path.join(
  REPO_ROOT,
  "apps/fumadocs/src/components/mdx/ui-component-modules.generated.ts",
);
const PREVIEW_METADATA_SOURCE = path.join(
  REPO_ROOT,
  "apps/fumadocs/src/components/mdx/ui-component-preview-metadata.generated.ts",
);
const COMPONENT_CATALOG_SOURCE = path.join(
  REPO_ROOT,
  "apps/fumadocs/content/docs/extend/develop/ui-package/components.mdx",
);

type PackageJson = {
  exports?: Record<string, string>;
};

export type UiComponent = {
  category: string;
  description: string;
  exports: string[];
  importPath: string;
  pageSlug: string;
  preview: UiComponentPreviewMetadata;
  sourcePath: string;
  title: string;
};

export type UiComponentPreviewMetadata = {
  props: Record<string, string[]>;
  targetExport: string;
};

type ComponentHint = {
  category: string;
  description: string;
  importPath: string;
  title: string;
};

const CATEGORY_ORDER = [
  "Primitives",
  "Layout & Navigation",
  "Overlay & Dialog",
  "Forms & Data",
  "Chat & Communication",
  "Visualization",
  "Animation & Effects",
  "Specialized",
  "Agent UI",
  "Data Grid",
  "Editor",
];

const CATEGORY_NAVIGATION_LABELS: Record<string, string> = {
  Primitives: "Core primitives",
  "Layout & Navigation": "Layout & navigation",
  "Overlay & Dialog": "Overlays & dialogs",
  "Forms & Data": "Forms & data",
  "Chat & Communication": "Chat & communication",
  Visualization: "Visualization",
  "Animation & Effects": "Motion & effects",
  Specialized: "Ryu-specific components",
  "Agent UI": "Agent UI",
  "Data Grid": "Data grid",
  Editor: "Editor",
};

const COMPONENT_EXPORT_EXCLUSIONS = [
  /(?:Props|Config|Options|Variant|Variants|Schema|State|Type|Data|Kind|Size|Speed|ClassNames|Token|Theme)$/,
  /Kit$/,
  /Plugin$/,
];

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  "components/agents/agent-activity":
    "Displays the activity timeline for an agent run.",
  "components/agents/approval-card":
    "Presents a reviewable approval request for a tool or action.",
  "components/agents/loading-states":
    "Loading and progress indicators for agent work.",
  "components/dither-kit/avatar":
    "Renders a deterministic dithered avatar from a user seed.",
  "components/dither-kit/gradient":
    "Renders a dithered gradient visual from tokenized colors.",
  "components/motion/button/index":
    "Animated button primitives for state and interaction transitions.",
  "components/motion/checkbox":
    "Animated checkbox control with reduced-motion support.",
  "components/motion/input":
    "Animated input control for focused and changing states.",
  "components/motion/loader":
    "Animated loading indicator for in-progress work.",
  "components/motion/preview-rail":
    "Animated preview rail for browsing adjacent content.",
  "components/motion/radio":
    "Animated radio control with reduced-motion support.",
  "components/motion/text-scramble":
    "Animated text transition that scrambles characters before settling.",
  "components/motion/text-shimmer":
    "Animated shimmer treatment for text content.",
};

const EXAMPLES: Record<string, string> = {
  "components/button": `<Button>Continue</Button>`,
  "components/badge": `<Badge variant="secondary">Ready</Badge>`,
  "components/input": `<Input placeholder="Search" />`,
  "components/textarea": `<Textarea placeholder="Write a note" />`,
  "components/checkbox": `<Checkbox aria-label="Enable notifications" />`,
  "components/switch": `<Switch aria-label="Enable notifications" />`,
  "components/progress": `<Progress value={64} />`,
  "components/spinner": `<Spinner />`,
  "components/skeleton": `<Skeleton className="h-4 w-32" />`,
  "components/separator": `<Separator />`,
  "components/card": `<Card>Content</Card>`,
  "components/accordion": `<Accordion>Sections</Accordion>`,
  "components/collapsible": `<Collapsible>Details</Collapsible>`,
  "components/dialog": `<Dialog>Dialog content</Dialog>`,
  "components/alert-dialog": `<AlertDialog>Confirm this change</AlertDialog>`,
  "components/popover": `<Popover>Additional context</Popover>`,
  "components/tooltip": `<Tooltip>Helpful context</Tooltip>`,
  "components/calendar": `<Calendar />`,
  "components/avatar": `<Avatar />`,
  "components/bubble": `<Bubble>Message</Bubble>`,
  "components/message": `<Message>Message content</Message>`,
  "components/logo": `<Logo />`,
  "components/data-grid/data-grid": `<DataGrid />`,
};

const PREVIEW_OPTION_KEYS = [
  "align",
  "direction",
  "kind",
  "mode",
  "orientation",
  "position",
  "side",
  "size",
  "state",
  "status",
  "theme",
  "variant",
];

const PREVIEW_BOOLEAN_KEYS = [
  "checked",
  "defaultChecked",
  "defaultOpen",
  "defaultPressed",
  "disabled",
  "loading",
  "loop",
  "open",
  "pressed",
];

const DEFAULT_PREVIEW_BOOLEAN_PROPS: Record<string, string[]> = {
  "components/button": ["disabled", "loading"],
  "components/checkbox": ["disabled"],
  "components/input": ["disabled"],
  "components/motion/checkbox": ["disabled"],
  "components/motion/input": ["disabled"],
  "components/motion/radio": ["disabled"],
  "components/radio-group": ["disabled"],
  "components/slider": ["disabled"],
  "components/switch": ["disabled"],
  "components/textarea": ["disabled"],
};

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

function isComponentExport(name: string): boolean {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || /^[A-Z0-9_]+$/.test(name)) {
    return false;
  }
  return !COMPONENT_EXPORT_EXCLUSIONS.some((pattern) => pattern.test(name));
}

export function extractComponentExports(source: string): string[] {
  const names = new Set<string>();
  const declarationPattern =
    /\bexport\s+(?:(?:async)\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(declarationPattern)) {
    const name = match[1];
    if (name && isComponentExport(name)) {
      names.add(name);
    }
  }

  const defaultPattern =
    /\bexport\s+default\s+(?:function|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(defaultPattern)) {
    const name = match[1];
    if (name && isComponentExport(name)) {
      names.add(name);
    }
  }

  const listPattern = /\bexport\s*\{([\s\S]*?)\}(?:\s*from\s+[^;]+)?\s*;?/g;
  for (const match of source.matchAll(listPattern)) {
    const body = match[1] ?? "";
    for (const specifier of body.split(",")) {
      const name = specifier
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim();
      if (name && isComponentExport(name)) {
        names.add(name);
      }
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
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
      importPath: packageImport.replace("@ryu/ui/", ""),
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
  const packageJson = JSON.parse(
    await readFile(path.join(UI_PACKAGE_ROOT, "package.json"), "utf8"),
  ) as PackageJson;
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
      description: hint?.description ?? DEFAULT_DESCRIPTIONS[importPath],
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
    component.preview = previewMetadata(
      component,
      await readFile(component.sourcePath, "utf8"),
    );
  }
  return catalog;
}

function primaryExport(component: UiComponent): string {
  const titleName = component.title.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return (
    component.exports.find((name) => name.toLowerCase() === titleName) ??
    component.exports.find((name) => name.toLowerCase().endsWith(titleName)) ??
    component.exports[0] ??
    component.title.replace(/[^A-Za-z0-9]/g, "")
  );
}

function componentExample(component: UiComponent): string {
  return EXAMPLES[component.importPath] ?? `<${primaryExport(component)} />`;
}

function literalValues(value: string): string[] {
  const values = new Set<string>();
  const pattern = /(["'])(.*?)\1/g;
  for (const match of value.matchAll(pattern)) {
    const literal = match[2]?.trim();
    if (literal) {
      values.add(literal);
    }
  }
  return [...values];
}

function objectBodies(source: string, property: string): string[] {
  const bodies: string[] = [];
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${property}|["']${property}["'])\\s*:\\s*\\{`,
    "gm",
  );

  for (const match of source.matchAll(pattern)) {
    const start = (match.index ?? 0) + match[0].lastIndexOf("{");
    let depth = 0;
    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          bodies.push(source.slice(start + 1, index));
          break;
        }
      }
    }
  }
  return bodies;
}

function extractLiteralOptions(source: string, property: string): string[] {
  const values = new Set<string>();
  const unionPattern = new RegExp(
    `\\b${property}\\??\\s*:\\s*((?:(?:"[^"]+"|'[^']+')\\s*\\|\\s*)+(?:"[^"]+"|'[^']+'))`,
    "g",
  );
  for (const match of source.matchAll(unionPattern)) {
    for (const value of literalValues(match[1] ?? "")) {
      values.add(value);
    }
  }

  for (const variantsBody of objectBodies(source, "variants")) {
    for (const propertyBody of objectBodies(variantsBody, property)) {
      const keyPattern = /^\s*(?:(['"])(.*?)\1|([A-Za-z0-9_-]+))\s*:/gm;
      for (const keyMatch of propertyBody.matchAll(keyPattern)) {
        const value = (keyMatch[2] ?? keyMatch[3])?.trim();
        if (value) {
          values.add(value);
        }
      }
    }
  }

  return [...values]
    .filter((value) => value !== "true" && value !== "false")
    .sort((left, right) => left.localeCompare(right));
}

function hasDeclaredProperty(source: string, property: string): boolean {
  return new RegExp(`(?:^|\\n)\\s*${property}\\?\\s*:\\s*boolean\\b`, "m").test(
    source,
  );
}

function previewMetadata(
  component: UiComponent,
  source: string,
): UiComponentPreviewMetadata {
  const props: Record<string, string[]> = {};

  for (const property of PREVIEW_OPTION_KEYS) {
    const options = extractLiteralOptions(source, property);
    if (options.length >= 2 && options.length <= 12) {
      props[property] = options;
    }
  }

  const booleanProps = new Set(
    DEFAULT_PREVIEW_BOOLEAN_PROPS[component.importPath] ?? [],
  );
  for (const property of PREVIEW_BOOLEAN_KEYS) {
    if (hasDeclaredProperty(source, property)) {
      booleanProps.add(property);
    }
  }
  for (const property of booleanProps) {
    props[property] = ["false", "true"];
  }

  return {
    props,
    targetExport: primaryExport(component),
  };
}

export function componentNavigationPages(catalog: UiComponent[]): string[] {
  const pages = ["index"];
  let currentCategory = "";

  for (const component of catalog) {
    if (component.category !== currentCategory) {
      currentCategory = component.category;
      const label =
        CATEGORY_NAVIGATION_LABELS[currentCategory] ?? currentCategory;
      pages.push(`---${label}---`);
    }
    pages.push(component.pageSlug);
  }

  return pages;
}

function inlineCode(value: string): string {
  return `\`${value}\``;
}

function componentPage(component: UiComponent): string {
  const packageImport = `@ryu/ui/${component.importPath}`;
  const namedExports = component.exports.join(", ");
  const primary = primaryExport(component);
  return [
    "---",
    `title: ${JSON.stringify(component.title)}`,
    `description: ${JSON.stringify(component.description)}`,
    "---",
    "",
    `${component.description} The module is part of the ${inlineCode("@ryu/ui")} package and is available on every surface that includes the package.`,
    "",
    "## Preview",
    "",
    `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} />`,
    "",
    "The preview uses representative props and is safe to interact with. It does not call a provider, write data, or depend on a host application.",
    "",
    "## Variants",
    "",
    `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} mode="variants" />`,
    "",
    "This section renders the named variants, sizes, and states declared by the module when they are available.",
    "",
    "## Settings",
    "",
    `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} mode="settings" />`,
    "",
    "Use the controls to compare supported settings without changing application data or calling a provider.",
    "",
    "## Import",
    "",
    "```tsx",
    `import { ${namedExports} } from "${packageImport}";`,
    "```",
    "",
    `The module exports ${inlineCode(namedExports)}, so you can compose the primitive with its related parts.`,
    "",
    "## Usage",
    "",
    "```tsx",
    `import { ${primary} } from "${packageImport}";`,
    "",
    "export function Example() {",
    "  return (",
    `    ${componentExample(component)}`,
    "  );",
    "}",
    "```",
    "",
    "Add the props required by your workflow and compose the named exports as needed. TypeScript provides the complete prop and event contract at the import site.",
    "",
    "## Package path",
    "",
    inlineCode(packageImport),
    "",
    "This page is generated from the package export and source module so the catalog stays aligned with the usable component surface.",
    "",
  ].join("\n");
}

function componentsIndex(catalog: UiComponent[]): string {
  const lines = [
    "---",
    'title: "Components"',
    'description: "The component catalog for @ryu/ui, with one reference page for every documented source module."',
    "---",
    "",
    "Every entry below maps to a real `@ryu/ui` component module. Open a component page for its live preview, variants, settings, import path, named exports, and usage example.",
    "",
  ];
  let currentCategory = "";
  for (const [index, component] of catalog.entries()) {
    if (component.category !== currentCategory) {
      currentCategory = component.category;
      lines.push(`## ${currentCategory}`, "", "<Cards>");
    }
    lines.push(
      `  <DocCard href="/docs/ui/components/${component.pageSlug}" title=${JSON.stringify(component.title)} description={${JSON.stringify(component.description)}} />`,
    );
    const next = catalog[index + 1];
    if (!next || next.category !== currentCategory) {
      lines.push("</Cards>", "");
    }
  }
  return `${lines.join("\n")}\n`;
}

function componentsMeta(catalog: UiComponent[]): string {
  return `${JSON.stringify(
    {
      title: "Components",
      description: "The @ryu/ui component catalog.",
      pages: componentNavigationPages(catalog),
    },
    null,
    2,
  )}\n`;
}

function previewModulesSource(catalog: UiComponent[]): string {
  const lines = [
    "// This file is generated by apps/fumadocs/scripts/generate-ui-docs.ts.",
    "// Keep the import paths aligned with the @ryu/ui package export map.",
    "",
    "type UiComponentModule = Record<string, unknown>;",
    "",
    "export const UI_COMPONENT_MODULE_LOADERS: Record<",
    "  string,",
    "  () => Promise<UiComponentModule>",
    "> = {",
  ];

  for (const component of catalog) {
    const packageImport = `@ryu/ui/${component.importPath}`;
    const importExpression = `    (await import(${JSON.stringify(packageImport)})) as UiComponentModule,`;
    lines.push(
      `  ${JSON.stringify(component.importPath)}: async () =>`,
      ...(importExpression.length <= 80
        ? [importExpression]
        : [
            "    (await import(",
            `      ${JSON.stringify(packageImport)}`,
            "    )) as UiComponentModule,",
          ]),
    );
  }

  lines.push("};", "");
  return `${lines.join("\n")}\n`;
}

function previewMetadataSource(catalog: UiComponent[]): string {
  const lines = [
    "// This file is generated by apps/fumadocs/scripts/generate-ui-docs.ts.",
    "// It contains only literal public prop options used by the docs playground.",
    "",
    "export type UiComponentPreviewMetadata = {",
    "  props: Record<string, string[]>;",
    "  targetExport: string;",
    "};",
    "",
    "export const UI_COMPONENT_PREVIEW_METADATA: Record<",
    "  string,",
    "  UiComponentPreviewMetadata",
    "> = {",
  ];

  for (const component of catalog) {
    lines.push(
      `  ${JSON.stringify(component.importPath)}: ${JSON.stringify(component.preview)},`,
    );
  }

  lines.push("};");
  return `${lines.join("\n")}\n`;
}

export async function generateUiDocs(): Promise<UiComponent[]> {
  const catalog = await buildUiCatalog();
  await rm(COMPONENTS_ROOT, { recursive: true, force: true });
  await mkdir(COMPONENTS_ROOT, { recursive: true });
  await mkdir(path.dirname(PREVIEW_MODULES_SOURCE), { recursive: true });
  await writeFile(
    path.join(COMPONENTS_ROOT, "meta.json"),
    componentsMeta(catalog),
  );
  await writeFile(
    path.join(COMPONENTS_ROOT, "index.mdx"),
    componentsIndex(catalog),
  );
  await writeFile(PREVIEW_MODULES_SOURCE, previewModulesSource(catalog));
  await writeFile(PREVIEW_METADATA_SOURCE, previewMetadataSource(catalog));
  for (const component of catalog) {
    await writeFile(
      path.join(COMPONENTS_ROOT, `${component.pageSlug}.mdx`),
      componentPage(component),
    );
  }
  return catalog;
}

if (import.meta.main) {
  const catalog = await generateUiDocs();
  console.log(`Generated ${catalog.length} @ryu/ui component pages.`);
}
