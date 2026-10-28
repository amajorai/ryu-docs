import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import type { CatalogAttributes } from "../src/lib/catalog";
import { escapeMdxProseBraces } from "../src/lib/mdx-prose";
import {
  catalogManifestSchema,
  type CatalogManifest as Manifest,
  type CatalogProvide as Provide,
  type CatalogRunnable as Runnable,
} from "./catalog-manifest";

/**
 * Generate the public Apps and Plugins catalog realms from the store manifests.
 *
 * Every page ships as a self-contained .mdx (like the API-reference pages): the
 * docs satellite (`amajorai/ryu-docs`) is flattened from `apps/fumadocs` alone,
 * so the store directories are NOT present there and this script never runs at
 * build time. Run it in the monorepo when a manifest changes and commit the
 * output.
 *
 * The page surface is deliberately the PUBLIC one: what the app/plugin does,
 * the tools it exposes to agents (slug + input schema), the surfaces that
 * support it, its permission model, and the UI it contributes. Internal
 * engineering is stripped — no `core:/api/...` routes, ports, `RYU_*` env vars,
 * secret headers, sidecar command/env details, or crate paths. The manifests
 * are the source of truth; the generated prose is a faithful, sanitized mirror.
 *
 * Ownership: every file this script writes carries the frontmatter marker
 * `generated: "generate:catalog"`. A regeneration only overwrites or deletes
 * files that carry the marker, so hand-written pages that live beside the
 * catalog (and catalog slots deliberately taken over by a hand-written page)
 * survive. A marked page whose manifest left the catalog is deleted. `meta.json`
 * is merged: generated entries are rebuilt, hand-added entries keep their place
 * after the entry they followed.
 *
 * Authored prose belongs in `content-guides/<realm>/<slug>.mdx`, never in the
 * generated page. See `parseCatalogGuide` for the guide format. Run with
 * `--check` to fail when the committed output drifts from its sources.
 */
const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const CONTENT_ROOT = path.join(REPO_ROOT, "apps/fumadocs/content/docs");
const AUTHORED_GUIDES_ROOT = path.join(
  REPO_ROOT,
  "apps/fumadocs/content-guides",
);
const APPS_STORE = path.join(REPO_ROOT, "apps-store");
const PLUGIN_STORES = [
  path.join(REPO_ROOT, "plugins-store", "plugins"),
  path.join(REPO_ROOT, "plugins-store", "lsp"),
  path.join(REPO_ROOT, "plugins-store", "external_plugins"),
];

const CATEGORY_LABELS = new Map([
  ["Knowledge & Memory", "Knowledge & Memory"],
  ["Media & Voice", "Media & Voice"],
]);

// App directories are satellite-owned and may retain a historical folder name
// after a product identity changes. Public docs follow the manifest identity so
// a renamed app does not leave a second, stale page under its old name.
const PAGE_SLUG_ALIASES = new Map([["reelfarm", "studio"]]);

const TOOL_BACKEND_LABEL = new Map<string, string>([
  ["http", "HTTP"],
  ["command", "CLI command"],
  ["inline_js", "Sandboxed JS"],
]);

type CatalogBase = "apps" | "plugins";

export type CatalogEntry = {
  dir: string;
  manifest: Manifest;
  category?: string;
};

function pageSlug(entry: { dir: string }): string {
  const directory = path.basename(entry.dir.replaceAll("\\", "/"));
  return PAGE_SLUG_ALIASES.get(directory) ?? directory;
}

export type CatalogState = {
  builtInIds: Set<string>;
  preinstalledIds: Set<string>;
};

const PLUGIN_CATEGORY_ORDER = [
  "Automation",
  "Browsers",
  "Language Servers",
  "Developer Tools",
  "Knowledge & Memory",
  "Models",
  "Productivity",
  "Research",
  "Search",
  "Security",
];

/**
 * Escape text for safe insertion into MDX prose. Curly braces would be read as
 * JSX expressions, so they become HTML entities; pipes and newlines stay legal
 * outside tables but are collapsed. Em dashes are rewritten to a spaced hyphen,
 * per the site style guide.
 */
function esc(text: string): string {
  return escapeMdxProseBraces(text);
}

const CATALOG_PROSE_PARAGRAPH_LIMIT = 900;

function proseParagraphs(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const sentences: string[] = [];
  let start = 0;
  for (const match of normalized.matchAll(/[.!?](?=\s+(?:[A-Z0-9`*_[(]))/g)) {
    const end = (match.index ?? 0) + 1;
    sentences.push(normalized.slice(start, end).trim());
    start = end;
  }
  if (start < normalized.length) {
    sentences.push(normalized.slice(start).trim());
  }

  const paragraphs: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    const candidate = `${current} ${sentence}`;
    // Measure the escaped form: brace entities lengthen the rendered paragraph.
    if (esc(candidate).length > CATALOG_PROSE_PARAGRAPH_LIMIT) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) {
    paragraphs.push(current);
  }

  return paragraphs.map((paragraph) => esc(paragraph));
}

/**
 * Tool descriptions render as prose under the tool heading. Long manifest
 * descriptions are split at sentence boundaries like detail descriptions, and
 * pipes stay escaped so a description never reads as a table row.
 */
function toolDescriptionParagraphs(description: string): string {
  return proseParagraphs(description)
    .map((paragraph) => paragraph.replace(/\|/g, "&#124;"))
    .join("\n\n");
}

/** Collapse whitespace for use inside a table cell (no pipes/newlines). */
function cell(text: string): string {
  return esc(text).replace(/\s+/g, " ").replace(/\|/g, "&#124;").trim();
}

/** Frontmatter key/value that marks a file as owned by this generator. */
export const GENERATED_MARKER = 'generated: "generate:catalog"';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

/** True when `source` carries this generator's ownership marker. */
export function isGeneratedCatalogFile(source: string): boolean {
  const block = FRONTMATTER_PATTERN.exec(source)?.[1];
  if (block === undefined) {
    return false;
  }
  return block.split(/\r?\n/u).some((line) => line.trim() === GENERATED_MARKER);
}

function frontmatter(
  title: string,
  description: string,
  tags: string[],
  catalog?: CatalogAttributes,
): string {
  const lines = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(cell(description))}`,
    `tags: ${JSON.stringify(tags)}`,
  ];
  if (catalog) {
    lines.push(`catalog: ${JSON.stringify(catalog)}`);
  }
  lines.push(GENERATED_MARKER, "---");
  return lines.join("\n");
}

/**
 * One authored block from a catalog guide, placed relative to a generated
 * line. `after`/`before` is a path of line prefixes: the first entry matches
 * the first generated line that starts with it, every later entry matches the
 * first line after the previous match. The first entry must match exactly one
 * generated line so a moved or duplicated anchor fails loudly instead of
 * silently relocating prose.
 */
export type CatalogGuideInsert = {
  after?: string[];
  before?: string[];
  at?: "end";
  /** No blank line between the block and its anchor line. */
  tight?: boolean;
  body: string;
};

export type CatalogGuide = {
  /** Authored prose that replaces the generated "What it does" section. */
  lead?: string;
  /** Authored replacement for the manifest description paragraphs only. */
  description?: string;
  inserts: CatalogGuideInsert[];
};

const guideDirectiveSchema = z
  .object({
    after: z.array(z.string().min(1)).min(1).optional(),
    before: z.array(z.string().min(1)).min(1).optional(),
    at: z.literal("end").optional(),
    tight: z.boolean().optional(),
  })
  .strict()
  .refine(
    (spec) =>
      [spec.after, spec.before, spec.at].filter((value) => value !== undefined)
        .length === 1,
    { message: "exactly one of after, before, or at is required" },
  );

const GUIDE_DIRECTIVE_PATTERN =
  /^\{\/\* catalog:(insert|description)(?: (\{.*\}))? \*\/\}$/u;

function trimBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") {
    start += 1;
  }
  while (end > start && lines[end - 1].trim() === "") {
    end -= 1;
  }
  return lines.slice(start, end);
}

/**
 * Parse a catalog guide.
 *
 * Text before the first directive is the lead: it replaces the generated
 * "What it does" section and follows the catalog navigation sentence (which is
 * omitted when the lead already contains one). Directives are MDX comments on
 * their own line, each owning the text up to the next directive:
 *
 *     {/* catalog:description *\/}            replaces the manifest description
 *     {/* catalog:insert {"after":["## Permissions"]} *\/}
 *     {/* catalog:insert {"before":["This page is part of the"]} *\/}
 *     {/* catalog:insert {"at":"end"} *\/}
 */
export function parseCatalogGuide(
  source: string,
  label = "guide",
): CatalogGuide {
  const lines = source.replace(FRONTMATTER_PATTERN, "").split(/\r?\n/u);
  const guide: CatalogGuide = { inserts: [] };
  let current: string[] = [];
  let directive:
    | { kind: "lead" }
    | { kind: "description" }
    | { kind: "insert"; spec: Omit<CatalogGuideInsert, "body"> } = {
    kind: "lead",
  };

  const flush = () => {
    const body = trimBlankLines(current).join("\n");
    if (directive.kind === "lead") {
      if (body) {
        guide.lead = body;
      }
    } else if (directive.kind === "description") {
      if (!body) {
        throw new Error(`${label}: empty catalog:description block`);
      }
      if (guide.description !== undefined) {
        throw new Error(`${label}: duplicate catalog:description block`);
      }
      guide.description = body;
    } else {
      if (!body) {
        throw new Error(`${label}: empty catalog:insert block`);
      }
      guide.inserts.push({ ...directive.spec, body });
    }
    current = [];
  };

  for (const line of lines) {
    const match = GUIDE_DIRECTIVE_PATTERN.exec(line.trim());
    if (!match) {
      current.push(line);
      continue;
    }
    flush();
    if (match[1] === "description") {
      if (match[2]) {
        throw new Error(`${label}: catalog:description takes no options`);
      }
      directive = { kind: "description" };
      continue;
    }
    const parsed = guideDirectiveSchema.safeParse(JSON.parse(match[2] ?? "{}"));
    if (!parsed.success) {
      throw new Error(
        `${label}: invalid catalog:insert ${match[2] ?? ""}: ${parsed.error.message}`,
      );
    }
    directive = { kind: "insert", spec: parsed.data };
  }
  flush();
  if (guide.lead !== undefined && guide.description !== undefined) {
    throw new Error(
      `${label}: a lead already replaces "What it does"; drop catalog:description`,
    );
  }
  return guide;
}

function resolveAnchor(
  lines: string[],
  anchor: string[],
  label: string,
): number {
  const [first, ...rest] = anchor;
  const firstMatches = lines.flatMap((line, index) =>
    line.startsWith(first) ? [index] : [],
  );
  if (firstMatches.length !== 1) {
    throw new Error(
      `${label}: anchor ${JSON.stringify(first)} matched ${firstMatches.length} generated lines; it must match exactly one`,
    );
  }
  let index = firstMatches[0];
  for (const prefix of rest) {
    const next = lines.findIndex(
      (line, candidate) => candidate > index && line.startsWith(prefix),
    );
    if (next < 0) {
      throw new Error(
        `${label}: anchor ${JSON.stringify(prefix)} not found after ${JSON.stringify(lines[index])}`,
      );
    }
    index = next;
  }
  return index;
}

/**
 * Place a guide's insert blocks into generated page text. Anchors resolve
 * against the generated lines only, so authored blocks never anchor on each
 * other and their relative order follows the guide file.
 */
export function applyGuideInserts(
  page: string,
  inserts: CatalogGuideInsert[],
  label = "guide",
): string {
  if (inserts.length === 0) {
    return page;
  }
  const hasTrailingNewline = page.endsWith("\n");
  const lines = (hasTrailingNewline ? page.slice(0, -1) : page).split("\n");
  const before = new Map<number, CatalogGuideInsert[]>();
  const after = new Map<number, CatalogGuideInsert[]>();
  const atEnd: CatalogGuideInsert[] = [];
  for (const insert of inserts) {
    if (insert.at === "end") {
      atEnd.push(insert);
      continue;
    }
    const target = insert.after ? after : before;
    const index = resolveAnchor(
      lines,
      insert.after ?? insert.before ?? [],
      label,
    );
    target.set(index, [...(target.get(index) ?? []), insert]);
  }

  const out: string[] = [];
  let needBlank = false;
  const pushLine = (line: string) => {
    if (needBlank && line.trim() !== "") {
      out.push("");
    }
    needBlank = false;
    out.push(line);
  };
  const pushBlock = (
    block: CatalogGuideInsert,
    tightBefore: boolean,
    tightAfter: boolean,
  ) => {
    if (!tightBefore && out.length > 0 && out.at(-1)?.trim() !== "") {
      out.push("");
    }
    needBlank = false;
    out.push(...block.body.split("\n"));
    needBlank = !tightAfter;
  };

  lines.forEach((line, index) => {
    for (const block of before.get(index) ?? []) {
      pushBlock(block, false, block.tight === true);
    }
    pushLine(line);
    for (const block of after.get(index) ?? []) {
      pushBlock(block, block.tight === true, false);
    }
  });
  for (const block of atEnd) {
    pushBlock(block, false, false);
  }
  return `${out.join("\n")}${hasTrailingNewline ? "\n" : ""}`;
}

function withoutRustLineComments(source: string): string {
  return source.replace(/\/\/.*$/gm, "");
}

function rustStringConstants(sources: string[]): Map<string, string> {
  const constants = new Map<string, string>();
  for (const source of sources) {
    for (const match of withoutRustLineComments(source).matchAll(
      /(?:pub(?:\([^)]*\))?\s+)?const\s+([A-Z][A-Z0-9_]*)\s*:\s*&str\s*=\s*"([^"]+)"/g,
    )) {
      constants.set(match[1], match[2]);
    }
  }
  return constants;
}

function resolveRustIdList(
  body: string,
  constants: Map<string, string>,
  label: string,
): Set<string> {
  const ids = new Set<string>();
  for (const match of withoutRustLineComments(body).matchAll(
    /"([^"]+)"|([A-Z][A-Z0-9_]*)/g,
  )) {
    const id = match[1] ?? constants.get(match[2]);
    if (!id) {
      throw new Error(`Could not resolve ${label} entry ${match[2]}`);
    }
    ids.add(id);
  }
  return ids;
}

function readManifestId(manifestPath: string): string | undefined {
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  const parsed = z
    .object({ id: z.string().optional() })
    .safeParse(JSON.parse(readFileSync(manifestPath, "utf8")));
  return parsed.success ? parsed.data.id : undefined;
}

/**
 * Read the Core-owned lifecycle sets used by the Marketplace status columns.
 *
 * Built-in is derived from the production `CORE_RUNTIME_BUILTIN_MANIFESTS`
 * registry, while Pre-installed is derived from `CORE_PREINSTALLED`. The
 * manifest's `system` flag remains the public Marketplace listing attribute,
 * matching `tools/generate-marketplace.mjs` and the mirrored README.
 */
export function readCoreCatalogState(
  repoRoot: string = REPO_ROOT,
): CatalogState {
  const builtinsSourcePath = path.join(
    repoRoot,
    "apps/core/src/plugins/builtins.rs",
  );
  const manifestSourcePath = path.join(
    repoRoot,
    "apps/core/src/plugin_manifest/mod.rs",
  );
  const builtinsSource = readFileSync(builtinsSourcePath, "utf8");
  const manifestSource = readFileSync(manifestSourcePath, "utf8");
  const constants = rustStringConstants([builtinsSource, manifestSource]);
  const preinstalledBlock = withoutRustLineComments(builtinsSource).match(
    /pub const CORE_PREINSTALLED:\s*&\[&str\]\s*=\s*&\[(.*?)\n\];/s,
  );
  if (!preinstalledBlock) {
    throw new Error("CORE_PREINSTALLED is missing from Core");
  }

  const preinstalledIds = resolveRustIdList(
    preinstalledBlock[1],
    constants,
    "CORE_PREINSTALLED",
  );
  const productionBlock = withoutRustLineComments(manifestSource).match(
    /const CORE_RUNTIME_BUILTIN_MANIFESTS:\s*&\[&str\]\s*=\s*&\[(.*?)\n\];/s,
  );
  const fallbackBlock = withoutRustLineComments(manifestSource).match(
    /(?:pub(?:\([^)]*\))?\s+)?const BUILTIN_MANIFESTS:\s*&\[&str\]\s*=\s*&\[(.*?)\n\];/s,
  );
  const builtInBlock = productionBlock?.[1] ?? fallbackBlock?.[1];
  if (!builtInBlock) {
    throw new Error(
      "production built-in manifest registry is missing from Core",
    );
  }

  const manifestConstants = new Map<string, string>();
  const manifestDirectory = path.dirname(manifestSourcePath);
  for (const match of withoutRustLineComments(manifestSource).matchAll(
    /(?:pub(?:\([^)]*\))?\s+)?const\s+([A-Z][A-Z0-9_]*)\s*:\s*&str\s*=\s*include_str!\("([^"]+\/manifest\.json)"\)/g,
  )) {
    const id = readManifestId(path.resolve(manifestDirectory, match[2]));
    if (id) {
      manifestConstants.set(match[1], id);
    }
  }

  const builtInIds = new Set<string>();
  const builtInBody = withoutRustLineComments(builtInBlock);
  for (const match of builtInBody.matchAll(
    /include_str!\("([^"]+\/manifest\.json)"\)/g,
  )) {
    const id = readManifestId(path.resolve(manifestDirectory, match[1]));
    if (id) {
      builtInIds.add(id);
    }
  }
  for (const match of builtInBody.matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
    const id = manifestConstants.get(match[1]);
    if (id) {
      builtInIds.add(id);
    }
  }

  return { builtInIds, preinstalledIds };
}

function stabilityLabel(manifest: Manifest): string {
  const stability = manifest.stability?.trim().toLowerCase();
  return stability || "stable";
}

function layerLabel(manifest: Manifest): string | undefined {
  const layers = (manifest.provides ?? [])
    .map((provide) => provide.title ?? provide.capability)
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => cell(value));
  return layers.length > 0 ? layers.join(", ") : undefined;
}

function surfaceSupport(manifest: Manifest): CatalogAttributes["surfaces"] {
  if (manifest.surfaces !== undefined) {
    return Object.fromEntries(
      Object.entries(manifest.surfaces).map(([surface, entry]) => [
        surface,
        entry.support?.trim() || "none",
      ]),
    );
  }

  // Older manifests used `targets` without support levels. Keep those pages
  // truthful while preserving the Core default of every surface when neither
  // declaration exists.
  if (manifest.targets && manifest.targets.length > 0) {
    return Object.fromEntries(
      manifest.targets.map((surface) => [surface, "supported"]),
    );
  }

  return undefined;
}

export function catalogAttributes(
  manifest: Manifest,
  base: CatalogBase,
  catalogState: CatalogState,
): CatalogAttributes {
  const catalog: CatalogAttributes = {
    kind: base === "apps" ? "app" : "plugin",
    id: manifest.id ?? "not declared",
    category: manifest.category ?? "Uncategorized",
    version: manifest.version ?? "0.0.0",
    official: true,
    builtIn:
      manifest.id !== undefined && catalogState.builtInIds.has(manifest.id),
    system: manifest.system === true,
    preInstalled:
      manifest.id !== undefined &&
      catalogState.preinstalledIds.has(manifest.id),
    stability: stabilityLabel(manifest),
    hidden: manifest.hidden === true,
    surfaces: surfaceSupport(manifest),
  };
  if (manifest.external === true) {
    catalog.external = true;
  }
  const layer = base === "plugins" ? layerLabel(manifest) : undefined;
  if (layer) {
    catalog.layer = layer;
  }
  return catalog;
}

function attributesLegend(): string {
  return [
    "",
    "## Attribute legend",
    "",
    "Every app and plugin detail page includes a generated Attributes table. The values are projected from the manifest plus Core's compiled and fresh-install registries.",
    "",
    "| Attribute | Meaning |",
    "|---|---|",
    "| **Official** | Published through Ryu's official marketplace source; this is provenance, not install state. |",
    "| **Built-in** | The manifest is compiled into the Core distribution. |",
    "| **System** | The manifest's Marketplace system marker for a Core-owned/protected runtime component; it is distinct from Built-in. |",
    "| **Pre-installed** | Core seeds an enabled lifecycle record on a fresh store. |",
    "| **Stability** | The manifest's maturity label; an omitted value is shown as `stable`, not as an update channel. |",
    "| **Hidden** | The listing is kept out of the normal catalog view. |",
    "| **External** | The provider operates outside the local Ryu runtime; shown only for external plugins. |",
    "| **Layer** | Capability layers projected from a plugin's `provides` declarations; shown only when declared. |",
    "| **Surfaces** | Per-surface support levels from the manifest; an omitted map uses the legacy all-surfaces default. |",
    "",
  ].join("\n");
}

function catalogNavigation(
  base: CatalogBase,
  related: { dir: string; manifest: Manifest }[],
): string {
  const isApps = base === "apps";
  const realm = isApps ? "Apps" : "Plugins";
  const realmHref = isApps ? "/docs/apps" : "/docs/plugins";
  const links = isApps
    ? [
        `[${realm} catalog](${realmHref})`,
        "[app manifest lifecycle](/docs/core/app-manifest-lifecycle)",
        "[Plugins vs Apps](/docs/extend/develop/extensions/plugins-vs-apps)",
        "[Marketplace](/docs/extend/develop/extensions/marketplace)",
        "[Gateway governance](/docs/gateway/governance)",
      ]
    : [
        `[${realm} catalog](${realmHref})`,
        "[plugin manifests](/docs/extend/develop/extensions/plugin-json-manifest)",
        "[plugin runtime](/docs/extend/develop/extensions/plugin-runtime)",
        "[unified tool catalog](/docs/core/unified-tool-catalog)",
        "[Marketplace](/docs/extend/develop/extensions/marketplace)",
        "[Gateway governance](/docs/gateway/governance)",
      ];
  const relatedText =
    related.length > 0
      ? ` In the same category, compare ${related
          .map(
            ({ dir, manifest }) =>
              `[${cell(manifest.name ?? dir)}](/docs/${base}/${pageSlug({ dir })})`,
          )
          .join(", ")}.`
      : "";

  return `This page is part of the ${links.join(", ")} documentation path.${relatedText}`;
}

function toolSection(runnable: Runnable): string {
  const cfg = runnable.config ?? {};
  const slug = cfg.slug ?? runnable.id ?? "";
  const lines: string[] = [];
  lines.push(
    `### \`${cell(slug)}\`${runnable.name ? ` - ${cell(runnable.name)}` : ""}`,
  );
  if (cfg.description) {
    lines.push("", toolDescriptionParagraphs(cfg.description));
  }
  const meta = [
    cfg.backend
      ? `Backend: ${TOOL_BACKEND_LABEL.get(cfg.backend) ?? cfg.backend}`
      : "",
    cfg.method ? `Method: ${cfg.method.toUpperCase()}` : "",
  ].filter(Boolean);
  if (meta.length > 0) {
    lines.push("", meta.join(" · "));
  }
  const schema = cfg.input_schema;
  const props = schema?.properties;
  if (props && Object.keys(props).length > 0) {
    const required = new Set(schema?.required ?? []);
    lines.push(
      "",
      "| Parameter | Type | Required | Description |",
      "|---|---|---|---|",
    );
    for (const [name, prop] of Object.entries(props)) {
      const type = prop.enum
        ? `${prop.type ?? "string"} (one of: ${prop.enum.join(", ")})`
        : (prop.type ?? "string");
      lines.push(
        `| \`${cell(name)}\` | ${cell(type)} | ${required.has(name) ? "yes" : "no"} | ${cell(prop.description ?? "")} |`,
      );
    }
    lines.push("");
  } else if (schema?.type) {
    lines.push("", `_No parameters_ (empty schema).`);
  }
  return lines.join("\n");
}

function runnablesSection(runnables: Runnable[] | undefined): string {
  if (!runnables || runnables.length === 0) {
    return "";
  }
  const tools = runnables.filter((r) => r.kind === "tool");
  const companions = runnables.filter((r) => r.kind === "companion");
  const policies = runnables.filter((r) => r.kind === "policy");
  const others = runnables.filter(
    (r) => !["tool", "companion", "policy"].includes(r.kind ?? ""),
  );

  const lines: string[] = [];
  lines.push("", "## What it exposes");

  if (tools.length > 0) {
    lines.push("", "### Tools", "");
    for (const tool of tools) {
      lines.push(toolSection(tool));
    }
  }
  if (companions.length > 0) {
    lines.push("", "### Companion surfaces", "");
    for (const c of companions) {
      const cfg = c.config ?? {};
      lines.push(
        `- **${cell(c.name ?? c.id ?? "Companion")}**${cfg.ui_format ? ` (${cell(cfg.ui_format)})` : ""}`,
      );
    }
  }
  if (policies.length > 0) {
    lines.push("", "### Policies", "");
    for (const p of policies) {
      const cfg = p.config ?? {};
      const note = cfg.definition?.note;
      lines.push(
        `- **${cell(cfg.policy_type ?? p.name ?? p.id ?? "Policy")}**${note ? ` - ${esc(cell(note))}` : ""}`,
      );
    }
  }
  for (const other of others) {
    const cfg = other.config ?? {};
    lines.push("", `### ${other.name ?? other.kind ?? other.id}`);
    // Agent system prompts are runtime configuration, not public prose: the
    // public-product boundary forbids literal prompt bodies in the docs. Use a
    // catalog guide insert to describe the agent's behavior instead.
    if (cfg.model) {
      lines.push("", `Model: \`${cell(cfg.model)}\``);
    }
    if (cfg.tools && cfg.tools.length > 0) {
      lines.push(
        "",
        `Tools: ${cfg.tools.map((t) => `\`${cell(t)}\``).join(", ")}`,
      );
    }
    if (cfg.skill_id) {
      lines.push("", `Skill: \`${cell(cfg.skill_id)}\``);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function providesSection(provides: Provide[] | undefined): string {
  if (!provides || provides.length === 0) {
    return "";
  }
  const lines: string[] = ["", "### Capabilities", ""];
  for (const p of provides) {
    lines.push(
      `- **${cell(p.title ?? p.capability ?? "")}** - capability \`${cell(p.capability ?? "")}\``,
    );
    if (p.grant) {
      lines.push(`  - Grant: \`${cell(p.grant)}\``);
    }
    if (p.target) {
      lines.push(`  - Target: ${cell(p.target)}`);
    }
    const verbs = Object.entries(p.tools ?? {});
    if (verbs.length > 0) {
      lines.push("  - Verbs:");
      for (const [verb, { tool, adapter }] of verbs) {
        // A capability adapter may call extra provider tools (for example a
        // keyless fallback); name them so the verb's full tool set is visible.
        const extra = (adapter?.tools ?? [])
          .map((name) => `\`${cell(name)}\``)
          .join(", ");
        lines.push(
          `    - \`${cell(verb)}\`${tool ? ` -> \`${cell(tool)}\`` : ""}${extra ? ` (adapter also calls ${extra})` : ""}`,
        );
      }
    }
  }
  lines.push("");
  return lines.join("\n");
}

function mcpSection(mcp: Manifest["mcp_servers"]): string {
  const entries = Object.entries(mcp ?? {});
  if (entries.length === 0) {
    return "";
  }
  const lines: string[] = [
    "",
    "### MCP server",
    "",
    "MCP (Model Context Protocol) is a standard way for an AI host to find and call tools. An MCP server provides those tools.",
    "",
  ];
  for (const [name, { description }] of entries) {
    lines.push(
      `- **\`${cell(name)}\`**${description ? ` - ${esc(cell(description))}` : ""}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function permissionsSection(m: Manifest): string {
  const lines: string[] = [];
  const grants = m.permission_grants ?? [];
  const levels = m.permission_levels ?? [];
  if (grants.length > 0 || levels.length > 0) {
    lines.push("", "## Permissions");
  }
  if (grants.length > 0) {
    lines.push(
      "",
      `**Grants:** ${grants.map((g) => `\`${cell(g)}\``).join(", ")}`,
    );
  }
  if (levels.length > 0) {
    lines.push("", "| Level | Description | Implies |", "|---|---|---|");
    for (const level of levels) {
      const implies = (level.implies ?? [])
        .map((i) => `\`${cell(i)}\``)
        .join(", ");
      lines.push(
        `| **${cell(level.label ?? level.id ?? "")}** | ${cell(level.description ?? "")} | ${implies} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

const CONTRIBUTE_TITLES = {
  agent_profile_tabs: "Agent profile tabs",
  composer_controls: "Composer controls",
  settings_tabs: "Settings tabs",
  slash_commands: "Slash commands",
  turn_hooks: "Turn hooks",
  dock_panels: "Dock panels",
  views: "Views",
  sidebar_sections: "Sidebar sections",
  sidebar_buttons: "Sidebar buttons",
  store_tabs: "Store tabs",
  context_menu_items: "Context menu items",
  create_actions: "Create actions",
  output_styles: "Output styles",
  backgrounds: "Wallpaper backgrounds",
  policies: "Policies",
  widgets: "Widgets",
  hook_events: "Hook events",
  data_categories: "Data categories",
  quotas: "Quotas",
  pi_extensions: "Pi extensions",
};

function isContributionTitle(
  key: string,
): key is keyof typeof CONTRIBUTE_TITLES {
  return Object.hasOwn(CONTRIBUTE_TITLES, key);
}

const DESKTOP_SHELL_CONTRIBUTIONS = new Set([
  "agent_profile_tabs",
  "dock_panels",
  "live_activities",
  "sidebar_buttons",
  "sidebar_sections",
  "store_tabs",
  "views",
  "backgrounds",
]);

function hasCompanionRunnable(m: Manifest): boolean {
  return (m.runnables ?? []).some((r) => r.kind === "companion");
}

function hasDesktopShellContribution(m: Manifest): boolean {
  if (hasCompanionRunnable(m)) {
    return true;
  }
  return Object.entries(m.contributes ?? {}).some(
    ([key, items]) =>
      DESKTOP_SHELL_CONTRIBUTIONS.has(key) &&
      Array.isArray(items) &&
      items.length > 0,
  );
}

function contributesSection(
  contributes: Manifest["contributes"] | undefined,
  base: CatalogBase,
  desktopShell = false,
  companion = false,
): string {
  const entries = Object.entries(contributes ?? {}).filter(
    ([key, items]) =>
      !(base === "apps" && companion && key === "sidebar_buttons") &&
      Array.isArray(items) &&
      items.length > 0,
  );
  if (entries.length === 0 && base !== "apps") {
    return "";
  }
  if (entries.length === 0 && base === "apps" && !desktopShell) {
    return "";
  }
  const lines: string[] = ["", "## UI it contributes"];
  if (base === "apps" && desktopShell) {
    lines.push(
      "",
      companion ? "### Apps shelf" : "### Desktop shell",
      "",
      companion
        ? "When enabled, this app appears as one icon tile in the desktop sidebar's Apps shelf. Use sidebar sections for the app's record lists; feature navigation stays inside the Companion."
        : "This app contributes the declared desktop shell surfaces below; the host owns navigation, focus, authentication, and theme behavior.",
    );
  }
  for (const [key, items] of entries) {
    const title = isContributionTitle(key)
      ? CONTRIBUTE_TITLES[key]
      : key.replace(/_/g, " ");
    lines.push("", `### ${title}`, "");
    for (const item of items) {
      const label =
        item.command ?? item.title ?? item.label ?? item.id ?? item.tool_id;
      const desc = item.description ? ` - ${esc(cell(item.description))}` : "";
      const extra: string[] = [];
      if (item.type) {
        extra.push(`type: ${cell(item.type)}`);
      }
      if (item.on) {
        extra.push(`on: \`${cell(item.on)}\``);
      }
      if (item.placement) {
        extra.push(`placement: ${cell(item.placement)}`);
      }
      if (item.anchor) {
        extra.push(`anchor: ${cell(item.anchor)}`);
      }
      if (item.capability) {
        extra.push(`capability: \`${cell(item.capability)}\``);
      }
      if (item.fields && item.fields.length > 0) {
        extra.push(
          "fields: " +
            item.fields
              .map((f) => `${cell(f.label ?? "")} (${cell(f.type ?? "")})`)
              .join(", "),
        );
      }
      lines.push(
        `- ${label ? `**${cell(String(label))}**` : ""}${desc}${extra.length > 0 ? ` (${extra.join(", ")})` : ""}`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

function requiresSection(m: Manifest): string {
  const req = m.requires;
  const apps = req?.apps ?? [];
  const grants = req?.grants ?? [];
  if (apps.length === 0 && grants.length === 0) {
    return "";
  }
  const lines: string[] = ["", "## Dependencies"];
  if (apps.length > 0) {
    lines.push("", "Requires these apps:");
    for (const app of apps) {
      const version = app.min_version
        ? ` (min \`${cell(app.min_version)}\`)`
        : "";
      lines.push(`- \`${cell(app.id ?? "")}\`${version}`);
    }
  }
  if (grants.length > 0) {
    lines.push(
      "",
      `Needs these grants: ${grants.map((g) => `\`${cell(g)}\``).join(", ")}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function engineSection(m: Manifest): string {
  const ryu = m.engines?.ryu;
  if (!ryu) {
    return "";
  }
  return [
    "",
    "## Engine requirement",
    "",
    `Requires Ryu ${cell(ryu)}.`,
    "",
  ].join("\n");
}

function activationSection(m: Manifest): string {
  const events = m.activation_events ?? [];
  if (events.length === 0) {
    return "";
  }
  return [
    "",
    "## Activation",
    "",
    `Activates on: ${events.map((e) => `\`${cell(e)}\``).join(", ")}`,
    "",
  ].join("\n");
}

const NAVIGATION_PREFIX = "This page is part of the ";

/** Path of the authored guide for one catalog page. */
export function catalogGuidePath(
  base: CatalogBase,
  slug: string,
  guidesRoot: string = AUTHORED_GUIDES_ROOT,
): string {
  return path.join(guidesRoot, base, `${slug}.mdx`);
}

/** Read and parse a guide, or `undefined` when none is authored. */
export function readCatalogGuide(guidePath: string): CatalogGuide | undefined {
  if (!existsSync(guidePath)) {
    return undefined;
  }
  return parseCatalogGuide(readFileSync(guidePath, "utf8"), guidePath);
}

/** Public slug used when a caller has only the manifest (e.g. tests). */
function slugFromManifestId(m: Manifest): string | undefined {
  return m.id?.split("/").at(-1);
}

export type BuildPageOptions = {
  /** Authored guide; `null` disables the default lookup. */
  guide?: CatalogGuide | null;
  /** Page slug used for the default guide lookup. */
  slug?: string;
};

export function buildPage(
  m: Manifest,
  base: CatalogBase,
  related: { dir: string; manifest: Manifest }[],
  catalogState: CatalogState,
  options: BuildPageOptions = {},
): string {
  const description = m.tagline ?? m.description?.split(/[.!?]\s/)[0] ?? "";
  const body: string[] = [];
  body.push(
    frontmatter(
      m.name ?? "",
      description,
      [m.category ?? ""],
      catalogAttributes(m, base, catalogState),
    ),
  );
  body.push("");

  const slug = options.slug ?? slugFromManifestId(m);
  const guide =
    options.guide === undefined
      ? slug
        ? readCatalogGuide(catalogGuidePath(base, slug))
        : undefined
      : (options.guide ?? undefined);
  const authoredGuide = guide?.lead;

  if (m.hidden) {
    body.push(
      '<Callout type="info">',
      base === "apps"
        ? "**Hidden from the store.** This app is not offered in the store; the description below explains why."
        : "**Hidden from the store.** This plugin is not offered in the store; the description below explains why.",
      "</Callout>",
      "",
    );
  }

  if (authoredGuide) {
    // A lead that already places the navigation sentence keeps its placement.
    const leadHasNavigation = authoredGuide
      .split("\n")
      .some((line) => line.startsWith(NAVIGATION_PREFIX));
    if (!leadHasNavigation) {
      body.push(catalogNavigation(base, related), "");
    }
    body.push(authoredGuide, "");
  } else {
    const prose =
      guide?.description ??
      (m.description ? proseParagraphs(m.description).join("\n\n") : "");
    if (prose) {
      body.push("## What it does", "", prose, "");
    }
    body.push("", catalogNavigation(base, related), "");
  }

  const runnables = runnablesSection(m.runnables);
  const capabilitySection =
    providesSection(m.provides) + mcpSection(m.mcp_servers);

  if (runnables) {
    body.push(runnables);
    // Capabilities + MCP already carry their own `###` headings.
    if (capabilitySection.trim()) {
      body.push(capabilitySection.trim(), "");
    }
  } else if (capabilitySection.trim()) {
    body.push("## What it exposes", "", capabilitySection.trim(), "");
  }

  body.push(permissionsSection(m));
  body.push(
    contributesSection(
      m.contributes,
      base,
      hasDesktopShellContribution(m),
      hasCompanionRunnable(m),
    ),
  );
  body.push(requiresSection(m));
  body.push(engineSection(m));
  body.push(activationSection(m));

  if (m.sidecars && m.sidecars.length > 0) {
    body.push(
      "",
      "## Sidecar",
      "",
      "Runs an out-of-process sidecar: " +
        m.sidecars.map((s) => `\`${cell(s.name ?? "")}\``).join(", ") +
        ".",
      "",
    );
  }

  const page = `${body
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
  return normalizePage(
    applyGuideInserts(page, guide?.inserts ?? [], `${base}/${slug ?? "?"}`),
  );
}

function normalizePage(page: string): string {
  return `${page.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** Locale-pinned ordering so output does not depend on the host's locale. */
function compareText(a: string, b: string): number {
  return a.localeCompare(b, "en");
}

function groupByCategory(
  manifests: CatalogEntry[],
  base: CatalogBase,
): { category: string; entries: { dir: string; manifest: Manifest }[] }[] {
  const groups = new Map<string, CatalogEntry[]>();
  for (const entry of manifests) {
    const category =
      entry.category ?? entry.manifest.category ?? "Uncategorized";
    const list = groups.get(category) ?? [];
    list.push(entry);
    groups.set(category, list);
  }
  const categoryOrder = base === "plugins" ? PLUGIN_CATEGORY_ORDER : [];
  return [...groups.entries()]
    .map(([category, entries]) => ({
      category: CATEGORY_LABELS.get(category) ?? category,
      entries: entries.sort((a, b) => compareText(a.dir, b.dir)),
    }))
    .sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      if (aIndex >= 0 && bIndex >= 0) {
        return aIndex - bIndex;
      }
      if (aIndex >= 0) {
        return -1;
      }
      if (bIndex >= 0) {
        return 1;
      }
      return compareText(a.category, b.category);
    });
}

const META_SEPARATOR_PATTERN = /^---.*---$/u;

/**
 * Merge freshly generated `meta.json` pages with the committed list.
 *
 * Generated entries (`index`, catalog slugs, and their category separators)
 * are rebuilt in generator order. Every other entry is hand-added and is kept
 * directly after the entry it followed in the committed list. Entries for
 * pages the generator just retired are dropped, as is a separator that no
 * longer heads any hand-added page.
 */
export function mergeRealmMetaPages(
  generated: string[],
  existing: string[] | undefined,
  retired: ReadonlySet<string> = new Set(),
): string[] {
  if (!existing) {
    return [...generated];
  }
  const generatedSet = new Set(generated);
  const isHandPage = (entry: string) =>
    !(
      generatedSet.has(entry) ||
      retired.has(entry) ||
      META_SEPARATOR_PATTERN.test(entry)
    );
  const keep = existing.map((entry, index) => {
    if (generatedSet.has(entry) || retired.has(entry)) {
      return false;
    }
    if (!META_SEPARATOR_PATTERN.test(entry)) {
      return true;
    }
    for (const next of existing.slice(index + 1)) {
      if (META_SEPARATOR_PATTERN.test(next)) {
        return false;
      }
      if (isHandPage(next)) {
        return true;
      }
    }
    return false;
  });

  const pages = [...generated];
  existing.forEach((entry, index) => {
    if (!keep[index]) {
      return;
    }
    let anchor = -1;
    for (let previous = index - 1; previous >= 0 && anchor < 0; previous -= 1) {
      anchor = pages.indexOf(existing[previous]);
    }
    pages.splice(anchor + 1, 0, entry);
  });
  return pages;
}

function realmMeta(
  title: string,
  description: string,
  icon: string,
  groups: ReturnType<typeof groupByCategory>,
  existingPages?: string[],
  retired?: ReadonlySet<string>,
): string {
  const generated: string[] = ["index"];
  for (const group of groups) {
    generated.push(`---${group.category}---`);
    for (const entry of group.entries) {
      generated.push(pageSlug(entry));
    }
  }
  const pages = mergeRealmMetaPages(generated, existingPages, retired);
  return `${JSON.stringify(
    {
      root: true,
      title,
      description,
      icon,
      pages,
    },
    null,
    2,
  )}\n`;
}

function realmIndex(
  title: string,
  description: string,
  groups: ReturnType<typeof groupByCategory>,
  base: CatalogBase,
  guide?: CatalogGuide,
): string {
  const lines: string[] = [];
  lines.push(frontmatter(title, description, [title]));
  lines.push(
    "",
    description,
    "",
    base === "apps"
      ? "Use the [Apps catalog](/docs/apps) with the [app manifest lifecycle](/docs/core/app-manifest-lifecycle), [Plugins vs Apps](/docs/extend/develop/extensions/plugins-vs-apps), and [Marketplace](/docs/extend/develop/extensions/marketplace) guides to understand how these pages fit together."
      : "Use the [Plugins catalog](/docs/plugins) with [plugin manifests](/docs/extend/develop/extensions/plugin-json-manifest), the [plugin runtime](/docs/extend/develop/extensions/plugin-runtime), the [unified tool catalog](/docs/core/unified-tool-catalog), and [Gateway governance](/docs/gateway/governance) to move from discovery to execution.",
    "",
  );
  lines.push(attributesLegend());
  for (const group of groups) {
    lines.push("", `## ${group.category}`, "");
    lines.push("<Cards>");
    for (const entry of group.entries) {
      lines.push(`  <DocCard href="/docs/${base}/${pageSlug(entry)}" />`);
    }
    lines.push("</Cards>", "");
  }
  if (guide?.lead !== undefined || guide?.description !== undefined) {
    throw new Error(
      `${base}/index guide: only catalog:insert blocks are supported on the realm index`,
    );
  }
  return applyGuideInserts(
    lines.join("\n"),
    guide?.inserts ?? [],
    `${base}/index`,
  );
}

function readManifests(storeDirs: string | string[]): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const storeDir of Array.isArray(storeDirs) ? storeDirs : [storeDirs]) {
    const isLanguageServerStore = storeDir.endsWith(
      path.join("plugins-store", "lsp"),
    );
    const isExternalPluginStore = storeDir.endsWith(
      path.join("plugins-store", "external_plugins"),
    );
    for (const dir of readdirSync(storeDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) {
        continue;
      }
      const manifestPath = path.join(storeDir, dir.name, "manifest.json");
      try {
        const parsedManifest = catalogManifestSchema.parse(
          JSON.parse(readFileSync(manifestPath, "utf8")),
        );
        const manifest = isExternalPluginStore
          ? { ...parsedManifest, external: true }
          : parsedManifest;
        const entry: CatalogEntry = { dir: dir.name, manifest };
        if (isLanguageServerStore) {
          entry.category = "Language Servers";
        }
        entries.push(entry);
      } catch {
        // Skip directories without a parseable manifest.json.
      }
    }
  }
  return entries.sort((a, b) => compareText(a.dir, b.dir));
}

export type RealmOptions = {
  outDir: string;
  guidesRoot?: string;
  title: string;
  description: string;
  icon: string;
  base: CatalogBase;
  manifests: CatalogEntry[];
  catalogState: CatalogState;
};

/** Everything one regeneration would change in a realm directory. */
export type RealmPlan = {
  /** Absolute path -> full file content for every generator-owned file. */
  writes: Map<string, string>;
  /** Generator-owned files whose catalog entry no longer exists. */
  deletes: string[];
  /** Catalog slots held by a hand-written page without the marker. */
  handOwned: string[];
};

function readExistingMetaPages(metaPath: string): string[] | undefined {
  if (!existsSync(metaPath)) {
    return undefined;
  }
  const parsed = z
    .object({ pages: z.array(z.string()).optional() })
    .safeParse(JSON.parse(readFileSync(metaPath, "utf8")));
  if (!parsed.success) {
    throw new Error(`${metaPath}: unreadable meta.json pages`);
  }
  return parsed.data.pages;
}

/**
 * Compute a realm's regeneration without touching the filesystem.
 *
 * Only files carrying {@link GENERATED_MARKER} are overwritten or deleted.
 * A missing file is created with the marker; an existing unmarked file is a
 * hand-written page and is left alone even when it occupies a catalog slot.
 */
export function planRealm(opts: RealmOptions): RealmPlan {
  const guidesRoot = opts.guidesRoot ?? AUTHORED_GUIDES_ROOT;
  const writes = new Map<string, string>();
  const handOwned: string[] = [];
  const existingPages = existsSync(opts.outDir)
    ? readdirSync(opts.outDir)
        .filter((name) => name.endsWith(".mdx"))
        .sort(compareText)
    : [];
  const isOwned = (file: string) =>
    !existsSync(file) || isGeneratedCatalogFile(readFileSync(file, "utf8"));

  const slugs = new Set<string>();
  for (const entry of opts.manifests) {
    const slug = pageSlug(entry);
    if (slugs.has(slug) || slug === "index") {
      throw new Error(`${opts.base}: duplicate catalog page slug "${slug}"`);
    }
    slugs.add(slug);
  }

  const guidesDir = path.join(guidesRoot, opts.base);
  if (existsSync(guidesDir)) {
    for (const name of readdirSync(guidesDir).sort(compareText)) {
      const slug = name.replace(/\.mdx$/u, "");
      if (!(name.endsWith(".mdx") && (slugs.has(slug) || slug === "index"))) {
        throw new Error(
          `${path.join(guidesDir, name)} does not match a catalog page; its prose would never be rendered`,
        );
      }
    }
  }

  const groups = groupByCategory(opts.manifests, opts.base);
  for (const entry of opts.manifests) {
    const slug = pageSlug(entry);
    const target = path.join(opts.outDir, `${slug}.mdx`);
    const guidePath = catalogGuidePath(opts.base, slug, guidesRoot);
    if (!isOwned(target)) {
      if (existsSync(guidePath)) {
        throw new Error(
          `${guidePath} targets the hand-written page ${target}; add the generated marker to that page or merge the guide into it`,
        );
      }
      handOwned.push(target);
      continue;
    }
    const group = groups.find((candidate) =>
      candidate.entries.some(({ dir }) => dir === entry.dir),
    );
    const index =
      group?.entries.findIndex(({ dir }) => dir === entry.dir) ?? -1;
    const related =
      index < 0 || !group
        ? []
        : [
            ...group.entries.slice(Math.max(0, index - 2), index),
            ...group.entries.slice(index + 1, index + 3),
          ];
    writes.set(
      target,
      buildPage(entry.manifest, opts.base, related, opts.catalogState, {
        slug,
        guide: readCatalogGuide(guidePath) ?? null,
      }),
    );
  }

  const indexPath = path.join(opts.outDir, "index.mdx");
  if (isOwned(indexPath)) {
    writes.set(
      indexPath,
      realmIndex(
        opts.title,
        opts.description,
        groups,
        opts.base,
        readCatalogGuide(catalogGuidePath(opts.base, "index", guidesRoot)),
      ),
    );
  } else {
    handOwned.push(indexPath);
  }

  const deletes: string[] = [];
  const retired = new Set<string>();
  for (const name of existingPages) {
    const slug = name.replace(/\.mdx$/u, "");
    const file = path.join(opts.outDir, name);
    if (
      slug !== "index" &&
      !slugs.has(slug) &&
      isGeneratedCatalogFile(readFileSync(file, "utf8"))
    ) {
      deletes.push(file);
      retired.add(slug);
    }
  }

  const metaPath = path.join(opts.outDir, "meta.json");
  writes.set(
    metaPath,
    realmMeta(
      opts.title,
      opts.description,
      opts.icon,
      groups,
      readExistingMetaPages(metaPath),
      retired,
    ),
  );

  return { writes, deletes, handOwned };
}

/** Paths whose committed content differs from the plan. */
export function realmDrift(plan: RealmPlan): string[] {
  const drift: string[] = [];
  for (const [file, content] of plan.writes) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== content) {
      drift.push(file);
    }
  }
  return [...drift, ...plan.deletes];
}

/** Apply a plan, touching only files whose content changes. */
export async function applyRealmPlan(
  plan: RealmPlan,
  outDir: string,
): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const changed = realmDrift(plan);
  for (const file of changed) {
    const content = plan.writes.get(file);
    if (content === undefined) {
      await rm(file, { force: true });
    } else {
      await writeFile(file, content);
    }
  }
  return changed;
}

export function catalogRealms(): RealmOptions[] {
  const catalogState = readCoreCatalogState();
  return [
    {
      outDir: path.join(CONTENT_ROOT, "apps"),
      title: "Apps",
      description:
        "Ryu apps provide focused product behavior through host-owned surfaces, app-owned services, or both. They use the generic ext-proxy, capability broker, and companion seams where their contracts need them.",
      icon: "AppWindow",
      base: "apps",
      manifests: readManifests(APPS_STORE),
      catalogState,
    },
    {
      outDir: path.join(CONTENT_ROOT, "plugins"),
      title: "Plugins",
      description:
        "The plugins Ryu ships: manifest.json bundles that extend capabilities with net-new logic - tools, agents, workflows, skills, turn hooks, and UI contributions - installed and enabled through the public API.",
      icon: "Blocks",
      base: "plugins",
      manifests: readManifests(PLUGIN_STORES),
      catalogState,
    },
  ];
}

async function main() {
  const { values } = parseArgs({
    options: { check: { type: "boolean", default: false } },
    strict: true,
  });
  const drift: string[] = [];
  for (const realm of catalogRealms()) {
    const plan = planRealm(realm);
    if (values.check) {
      drift.push(...realmDrift(plan));
      continue;
    }
    const changed = await applyRealmPlan(plan, realm.outDir);
    process.stdout.write(
      `${realm.base}: ${plan.writes.size} generated files, ${changed.length} changed, ${plan.deletes.length} retired, ${plan.handOwned.length} hand-written catalog pages kept\n`,
    );
  }
  if (values.check && drift.length > 0) {
    process.stderr.write(
      `Catalog docs are out of date. Run \`bun run generate:catalog\` in apps/fumadocs and commit:\n${drift
        .map((file) => `  ${path.relative(REPO_ROOT, file)}`)
        .join("\n")}\n`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main().catch((error) => {
    process.exitCode = 1;
    throw error;
  });
}
