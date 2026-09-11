import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import * as path from "node:path";
import ts from "typescript";

import { EXPRESSIVE_EXPRESSION_IDS } from "../../../packages/ui/src/components/expressive.ts";
import { EXPRESSIVE_ANIMATION_IDS } from "../../../packages/ui/src/components/expressive-animation.ts";

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
  "components/connection-status":
    "A compact, non-blocking status toast for network and node outages.",
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
  "components/text-morph":
    "Character-level text morphing for changing interface copy, with reduced-motion support.",
  "components/motion/text-shimmer":
    "Animated shimmer treatment for text content.",
  "components/run-status-timeline":
    "Maps scheduled run outcomes onto a compact 24-hour status strip.",
};

const DEFAULT_PREVIEW_OPTIONS: Record<string, Record<string, string[]>> = {
  // Button's public entry point re-exports the implementation and the server-safe
  // CVA definition from sibling modules, so its literal unions are intentionally
  // not present in the entry file that the lightweight scanner reads.
  "components/button": {
    size: [
      "default",
      "icon",
      "icon-lg",
      "icon-sm",
      "icon-xs",
      "lg",
      "sm",
      "xs",
    ],
    variant: [
      "default",
      "destructive",
      "ghost",
      "ghost-muted",
      "link",
      "loading",
      "mono",
      "outline",
      "progress",
      "secondary",
    ],
  },
  "components/logo": {
    animation: ["random", ...EXPRESSIVE_ANIMATION_IDS],
    expression: ["random", ...EXPRESSIVE_EXPRESSION_IDS],
  },
};

const EXAMPLES: Record<string, string> = {
  "components/button": `<Button>Continue</Button>`,
  "components/badge": `<Badge variant="secondary">Ready</Badge>`,
  "components/input": `<Input placeholder="Search" />`,
  "components/textarea": `<Textarea placeholder="Write a note" />`,
  "components/checkbox": `<Checkbox aria-label="Enable notifications" />`,
  "components/connection-status": `<ConnectionStatusToast nodeName="Design node" phase="node-unreachable" />`,
  "components/text-morph": `<TextMorph duration={240}>Ryu UI</TextMorph>`,
  "components/text-swap": `<TextSwap>Checking…</TextSwap>`,
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
  "components/color-picker": `<ColorPickerPopover defaultValue="#0099ff" swatches={["#000000", "#ffffff", "#ff3b30"]} />`,
  "components/avatar": `<Avatar />`,
  "components/bubble": `<Bubble>Message</Bubble>`,
  "components/message": `<Message>Message content</Message>`,
  "components/run-status-timeline": `<RunStatusTimeline ariaLabel="Run status" endAt={Date.now()} entries={[]} startAt={Date.now() - 86400000} />`,
  "components/logo": `<Logo variant="3d" size="192px" />`,
  "components/plan-badge": `<PlanBadge plan="business" size="md" />`,
  "components/data-grid/data-grid": `<DataGrid />`,
};

const PREVIEW_OPTION_KEYS = [
  "align",
  "direction",
  "kind",
  "mode",
  "orientation",
  "plan",
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

function usageExport(component: UiComponent, primary: string): string {
  return component.importPath === "components/color-picker"
    ? "ColorPickerPopover"
    : primary;
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

function typeNodeName(node: ts.EntityName): string {
  return ts.isIdentifier(node) ? node.text : node.right.text;
}

function addDirectPropTypes(
  members: readonly ts.TypeElement[],
  propTypes: Map<string, ts.TypeNode[]>,
): void {
  for (const member of members) {
    if (!ts.isPropertySignature(member) || !member.type) {
      continue;
    }
    const propertyName =
      ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)
        ? member.name.text
        : undefined;
    if (!propertyName) {
      continue;
    }
    const existing = propTypes.get(propertyName) ?? [];
    existing.push(member.type);
    propTypes.set(propertyName, existing);
  }
}

function addPropTypesFromType(
  type: ts.Node | undefined,
  aliases: ReadonlyMap<string, ts.TypeNode>,
  propTypes: Map<string, ts.TypeNode[]>,
  seen = new Set<string>(),
): void {
  if (!type) {
    return;
  }
  if (ts.isParenthesizedTypeNode(type)) {
    addPropTypesFromType(type.type, aliases, propTypes, seen);
    return;
  }
  if (ts.isIntersectionTypeNode(type) || ts.isUnionTypeNode(type)) {
    for (const member of type.types) {
      addPropTypesFromType(member, aliases, propTypes, seen);
    }
    return;
  }
  if (ts.isInterfaceDeclaration(type)) {
    addDirectPropTypes(type.members, propTypes);
    return;
  }
  if (ts.isTypeLiteralNode(type)) {
    addDirectPropTypes(type.members, propTypes);
    return;
  }
  if (!ts.isTypeReferenceNode(type)) {
    return;
  }
  const aliasName = typeNodeName(type.typeName);
  const alias = aliases.get(aliasName);
  if (!alias || seen.has(aliasName)) {
    return;
  }
  const nextSeen = new Set(seen);
  nextSeen.add(aliasName);
  addPropTypesFromType(alias, aliases, propTypes, nextSeen);
}

function publicPropTypes(source: string): Map<string, ts.TypeNode[]> {
  const sourceFile = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const aliases = new Map<string, ts.TypeNode>();
  const publicComponents = new Set(extractComponentExports(source));
  const propTypes = new Map<string, ts.TypeNode[]>();

  const collectAliases = (node: ts.Node): void => {
    if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, node.type);
    }
    ts.forEachChild(node, collectAliases);
  };
  collectAliases(sourceFile);

  const collectPropContainers = (node: ts.Node): void => {
    if (
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      /Props$/.test(node.name.text)
    ) {
      addPropTypesFromType(
        ts.isTypeAliasDeclaration(node) ? node.type : node,
        aliases,
        propTypes,
      );
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (publicComponents.has(node.name.text)) {
        addPropTypesFromType(node.parameters[0]?.type, aliases, propTypes);
      }
    }
    if (ts.isVariableDeclaration(node)) {
      const name = ts.isIdentifier(node.name) ? node.name.text : undefined;
      const initializer = node.initializer;
      if (
        name &&
        publicComponents.has(name) &&
        initializer &&
        (ts.isArrowFunction(initializer) ||
          ts.isFunctionExpression(initializer))
      ) {
        addPropTypesFromType(
          initializer.parameters[0]?.type,
          aliases,
          propTypes,
        );
      }
    }
    ts.forEachChild(node, collectPropContainers);
  };
  collectPropContainers(sourceFile);
  return propTypes;
}

function literalOptionsFromType(
  type: ts.TypeNode | undefined,
  aliases: ReadonlyMap<string, ts.TypeNode>,
  seen = new Set<string>(),
): string[] {
  if (!type) {
    return [];
  }
  if (ts.isParenthesizedTypeNode(type)) {
    return literalOptionsFromType(type.type, aliases, seen);
  }
  if (ts.isUnionTypeNode(type)) {
    return type.types.flatMap((member) =>
      literalOptionsFromType(member, aliases, seen),
    );
  }
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
    return [type.literal.text];
  }
  if (ts.isTypeReferenceNode(type)) {
    const aliasName = typeNodeName(type.typeName);
    const alias = aliases.get(aliasName);
    if (!alias || seen.has(aliasName)) {
      return [];
    }
    const nextSeen = new Set(seen);
    nextSeen.add(aliasName);
    return literalOptionsFromType(alias, aliases, nextSeen);
  }
  return [];
}

function extractLiteralOptions(source: string, property: string): string[] {
  const values = new Set<string>();
  const aliases = new Map<string, ts.TypeNode>();
  const sourceFile = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const collectAliases = (node: ts.Node): void => {
    if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, node.type);
    }
    ts.forEachChild(node, collectAliases);
  };
  collectAliases(sourceFile);

  for (const type of publicPropTypes(source).get(property) ?? []) {
    for (const value of literalOptionsFromType(type, aliases)) {
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

  for (const [property, options] of Object.entries(
    DEFAULT_PREVIEW_OPTIONS[component.importPath] ?? {},
  )) {
    props[property] = options;
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

export function hasVariantOrSizeOptions(
  preview: UiComponentPreviewMetadata,
): boolean {
  return ["plan", "variant", "size"].some((property) => {
    const options = preview.props[property];
    return options !== undefined && options.length > 1;
  });
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

function componentNavigation(
  component: UiComponent,
  related: UiComponent[],
): string {
  const relatedText =
    related.length > 0
      ? ` In the same ${component.category.toLowerCase()} group, compare ${related
          .map(
            (peer) => `[${peer.title}](/docs/ui/components/${peer.pageSlug})`,
          )
          .join(", ")}.`
      : "";
  return `This reference is part of the [Ryu UI overview](/docs/ui), the [component catalog](/docs/ui/components), and the [UI getting started guide](/docs/ui/getting-started). Read the [primitive usage guide](/docs/ui/primitives) for composition and ownership rules.${relatedText}`;
}

function componentPage(component: UiComponent, related: UiComponent[]): string {
  const packageImport = `@ryu/ui/${component.importPath}`;
  const namedExports = component.exports.join(", ");
  const primary = primaryExport(component);
  const variantsSection = hasVariantOrSizeOptions(component.preview)
    ? [
        "## Variants",
        "",
        `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} mode="variants" />`,
        "",
        "This section renders the named variants, sizes, and states declared by the module when they are available.",
        "",
      ]
    : [];
  const planBadgeDetails =
    component.importPath === "components/plan-badge"
      ? [
          "## Tier palettes",
          "",
          "Pro and Business intentionally use different palettes. Pro keeps the signature soft holographic pastel sweep, while Business uses the repeated cyan, green, yellow, blue, violet, pink, and amber sweep requested for organization-facing plan badges. Business stretches that field to 300% of the badge width and eases it left and right over eight seconds so the fourteen stops blend more gently; the shared reduced-motion rule disables the drift. The same Business stops feed the shared tier-card border and backdrop so related surfaces stay aligned.",
          "",
        ]
      : [];
  const textMorphDetails =
    component.importPath === "components/text-morph"
      ? [
          "## Text morphing",
          "",
          "This Ryu primitive is backed by [Torph](https://github.com/lochie/torph), a dependency-free text morphing library. It accepts text-only children and keeps the current value available to assistive technology while visual segments move between values.",
          "",
          "The shared default is a 240 ms ease-out transition with `respectReducedMotion` enabled. Use `disabled` for a host-controlled static state, `numbers={false}` for ordinary character matching, or `as` to choose the semantic element when a heading or other text element is appropriate.",
          "",
        ]
      : component.importPath === "components/text-swap"
        ? [
            "## Text morphing behavior",
            "",
            "`TextSwap` is the compatibility entry point for short button-state changes. Its existing API now uses the shared Torph-backed text morph with a 160 ms duration, while the component continues to respect reduced-motion preferences.",
            "",
          ]
        : [];
  const colorPickerDetails =
    component.importPath === "components/color-picker"
      ? [
          "## Recent colors",
          "",
          "The complete panel follows the Fluid Functionalism interaction model with saturation/brightness, hue, alpha, and format controls for HEX, RGB, HSL, and OKLCH values. The built-in swatch strip shows recent selections above any supplied `swatches` presets.",
          "",
          "Recent colors are shared by Ryu picker instances and retained in local browser storage. Set `showRecentColors={false}` when a surface should show only its supplied presets. Use `ColorPickerPanel` to compose the complete panel while preserving a custom trigger, or use `ColorPickerPopover` for the compact swatch trigger and panel together.",
          "",
        ]
      : [];
  const usage = usageExport(component, primary);
  return [
    "---",
    `title: ${JSON.stringify(component.title)}`,
    `description: ${JSON.stringify(component.description)}`,
    "---",
    "",
    `${component.description} The module is part of the ${inlineCode("@ryu/ui")} package and is available on every surface that includes the package.`,
    "",
    componentNavigation(component, related),
    "",
    "## Preview",
    "",
    `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} />`,
    "",
    "The preview uses representative props and is safe to interact with. It does not call a provider, write data, or depend on a host application.",
    "",
    ...variantsSection,
    ...planBadgeDetails,
    ...textMorphDetails,
    ...colorPickerDetails,
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
    `import { ${usage} } from "${packageImport}";`,
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
    ...(component.importPath === "components/logo"
      ? [
          "## Rounded 3D ghost",
          "",
          'Use `variant="3d"` for a real, closed WebGL mesh with a smoothly rounded body, face, and tail. Drag horizontally or focus the model and use the left/right arrow keys to rotate it; Home restores the front view.',
          "",
          "`animated={false}` disables motion, blinking, expression cycling, and rotation controls, displaying a representative still pose of the selected animation. Reduced-motion preferences also stop automatic motion while keeping deliberate rotation available. Rendering pauses while offscreen or when the tab is hidden.",
          "",
          '`bodyStyle="orb"` wraps the 3D body in flowing colors from the default logo palette. Customize it',
          "with `colors={{ bg, c1, c2, c3 }}`; CSS colors including OKLCH are supported. `animationDuration`",
          "controls the color-flow speed in seconds (default 20). The solid pearl body remains the default;",
          "`colors.bg` sets its color. Color flow also stops with `animated={false}` or reduced motion.",
          "",
          "`size` accepts CSS lengths, `eyeScale` adjusts the oval eyes, and `showEyes={false}` hides them. All",
          "17 named `expression` values are supported in 3D, including the crossed eyes of `dead`.",
          '`expression="random"` changes the face every four seconds while motion is enabled. Eye width,',
          "openness, tilt, spacing, and gaze share the 2D expression definitions. Expressions blend smoothly over",
          "450 ms.",
          "",
          'All 14 named `animation` values and `animation="random"` work in 3D, including wink, thinking, sleep,',
          "orbit, burst, and comet. The shared timeline drives the body and eye poses, with three-dimensional dots",
          "and marks. Orbit, burst, and comet use rounded particle trails in the body palette; the ghost dissolves",
          "and reforms during burst and comet. Idle eye blinks close and reopen smoothly; wink, sleep, and crossed",
          "eyes retain their own poses.",
          "",
          "The 3D renderer loads only when this variant is used. A static outline appears while it loads and if WebGL is unavailable or its context is lost.",
          "",
        ]
      : []),
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
    "Use the [Ryu UI overview](/docs/ui), [UI getting started](/docs/ui/getting-started), and [primitive usage guide](/docs/ui/primitives) to place these components in a host surface.",
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
    const siblings = catalog.filter(
      (candidate) => candidate.category === component.category,
    );
    const index = siblings.findIndex(
      (candidate) => candidate.pageSlug === component.pageSlug,
    );
    const related =
      index < 0
        ? []
        : [
            ...siblings.slice(Math.max(0, index - 2), index),
            ...siblings.slice(index + 1, index + 3),
          ];
    await writeFile(
      path.join(COMPONENTS_ROOT, `${component.pageSlug}.mdx`),
      componentPage(component, related),
    );
  }
  return catalog;
}

if (import.meta.main) {
  const catalog = await generateUiDocs();
  console.log(`Generated ${catalog.length} @ryu/ui component pages.`);
}
