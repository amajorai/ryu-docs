import { readdirSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";

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
 */
const CONTENT_ROOT = path.join("content", "docs");
const APPS_STORE = path.join("..", "..", "apps-store");
const PLUGIN_STORES = [
  path.join("..", "..", "plugins-store", "plugins"),
  path.join("..", "..", "plugins-store", "lsp"),
  path.join("..", "..", "plugins-store", "external_plugins"),
];

const CATEGORY_LABELS = new Map([
  ["Knowledge & Memory", "Knowledge & Memory"],
  ["Media & Voice", "Media & Voice"],
]);

const TOOL_BACKEND_LABEL = new Map<string, string>([
  ["http", "HTTP"],
  ["command", "CLI command"],
  ["deno", "Sandboxed JS"],
]);

type ToolConfig = {
  slug?: string;
  name?: string;
  description?: string;
  backend?: string;
  method?: string;
  input_schema?: {
    type?: string;
    properties?: Record<
      string,
      { type?: string; description?: string; enum?: unknown[] }
    >;
    required?: string[];
  };
};

type Runnable = {
  id?: string;
  name?: string;
  kind?: string;
  config?: ToolConfig & {
    label?: string;
    ui_format?: string;
    policy_type?: string;
    definition?: { note?: string; surface?: string };
    system_prompt?: string;
    model?: string;
    tools?: string[];
    skill_id?: string;
  };
};

type ContributesItem = {
  id?: string;
  title?: string;
  label?: string;
  command?: string;
  description?: string;
  type?: string;
  on?: string;
  placement?: string;
  anchor?: string;
  capability?: string;
  fields?: { label?: string; type?: string; description?: string }[];
};

type Provide = {
  capability?: string;
  version?: string;
  title?: string;
  grant?: string;
  target?: string;
  tools?: Record<string, { tool?: string }>;
};

type Manifest = {
  id?: string;
  name?: string;
  version?: string;
  category?: string;
  description?: string;
  tagline?: string;
  keywords?: string[];
  icon?: string;
  hidden?: boolean;
  surfaces?: Record<string, { support?: string }>;
  engines?: Record<string, string>;
  runnables?: Runnable[];
  permission_grants?: string[];
  permission_levels?: {
    id?: string;
    label?: string;
    description?: string;
    implies?: string[];
  }[];
  provides?: Provide[];
  mcp_servers?: Record<string, { description?: string }>;
  sidecars?: { name?: string }[];
  requires?: {
    apps?: { id?: string; min_version?: string }[];
    grants?: string[];
  };
  activation_events?: string[];
  contributes?: Record<string, ContributesItem[]>;
};

type CatalogBase = "apps" | "plugins";

type CatalogEntry = {
  dir: string;
  manifest: Manifest;
  category?: string;
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
  return text
    .replace(/\s*\u2014\s*/g, " - ")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

/** Collapse whitespace for use inside a table cell (no pipes/newlines). */
function cell(text: string): string {
  return esc(text).replace(/\s+/g, " ").replace(/\|/g, "&#124;").trim();
}

function frontmatter(
  title: string,
  description: string,
  tags: string[],
): string {
  return [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(cell(description))}`,
    `tags: ${JSON.stringify(tags)}`,
    "---",
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
              `[${cell(manifest.name ?? dir)}](/docs/${base}/${dir})`,
          )
          .join(", ")}.`
      : "";

  return `This page is part of the ${links.join(", ")} documentation path.${relatedText}`;
}

function surfacesSection(surfaces: Manifest["surfaces"]): string {
  const rows = Object.entries(surfaces ?? {});
  if (rows.length === 0) {
    return "";
  }
  const lines = ["", "## Surfaces", "", "| Surface | Support |", "|---|---|"];
  for (const [surface, { support }] of rows) {
    lines.push(`| ${surface} | ${support ?? "none"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function toolSection(runnable: Runnable): string {
  const cfg = runnable.config ?? {};
  const slug = cfg.slug ?? runnable.id ?? "";
  const lines: string[] = [];
  lines.push(
    `### \`${cell(slug)}\`${runnable.name ? ` - ${cell(runnable.name)}` : ""}`,
  );
  if (cfg.description) {
    lines.push("", esc(cell(cfg.description)));
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
    if (cfg.system_prompt) {
      lines.push("", `System prompt: ${esc(cell(cfg.system_prompt))}`);
    }
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
      for (const [verb, { tool }] of verbs) {
        lines.push(
          `    - \`${cell(verb)}\`${tool ? ` -> \`${cell(tool)}\`` : ""}`,
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

const CONTRIBUTE_TITLES: Record<string, string> = {
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
  policies: "Policies",
  widgets: "Widgets",
  hook_events: "Hook events",
  data_categories: "Data categories",
  quotas: "Quotas",
  pi_extensions: "Pi extensions",
};

function contributesSection(
  contributes: Manifest["contributes"] | undefined,
): string {
  const entries = Object.entries(contributes ?? {}).filter(
    ([, items]) => Array.isArray(items) && items.length > 0,
  );
  if (entries.length === 0) {
    return "";
  }
  const lines: string[] = ["", "## UI it contributes"];
  for (const [key, items] of entries) {
    const title = CONTRIBUTE_TITLES[key] ?? key.replace(/_/g, " ");
    lines.push("", `### ${title}`, "");
    for (const item of items) {
      const label = item.command ?? item.title ?? item.label ?? item.id;
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

function buildPage(
  m: Manifest,
  base: CatalogBase,
  related: { dir: string; manifest: Manifest }[],
): string {
  const description = m.tagline ?? m.description?.split(/[.!?]\s/)[0] ?? "";
  const body: string[] = [];
  body.push(frontmatter(m.name ?? "", description, [m.category ?? ""]));
  body.push("");

  if (m.hidden) {
    body.push(
      '<Callout type="info">',
      "**Hidden reference example.** Not shown in the store by default; documented for reference.",
      "</Callout>",
      "",
    );
  }

  if (m.description) {
    body.push("## What it does", "", esc(m.description), "");
  }

  body.push("", catalogNavigation(base, related), "");

  body.push(surfacesSection(m.surfaces));

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
  body.push(contributesSection(m.contributes));
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

  return `${body
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
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
      entries: entries.sort((a, b) => a.dir.localeCompare(b.dir)),
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
      return a.category.localeCompare(b.category);
    });
}

function realmMeta(
  title: string,
  description: string,
  icon: string,
  groups: ReturnType<typeof groupByCategory>,
): string {
  const pages: string[] = ["index"];
  for (const group of groups) {
    pages.push(`---${group.category}---`);
    for (const entry of group.entries) {
      pages.push(entry.dir);
    }
  }
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
  for (const group of groups) {
    lines.push("", `## ${group.category}`, "");
    lines.push("<Cards>");
    for (const entry of group.entries) {
      lines.push(`  <DocCard href="/docs/${base}/${entry.dir}" />`);
    }
    lines.push("</Cards>", "");
  }
  return lines.join("\n");
}

function readManifests(storeDirs: string | string[]): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const storeDir of Array.isArray(storeDirs) ? storeDirs : [storeDirs]) {
    const isLanguageServerStore = storeDir.endsWith(
      path.join("plugins-store", "lsp"),
    );
    for (const dir of readdirSync(storeDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) {
        continue;
      }
      const manifestPath = path.join(storeDir, dir.name, "manifest.json");
      try {
        const manifest = JSON.parse(
          readFileSync(manifestPath, "utf8"),
        ) as Manifest;
        entries.push({
          dir: dir.name,
          manifest,
          ...(isLanguageServerStore ? { category: "Language Servers" } : {}),
        });
      } catch {
        // Skip directories without a parseable manifest.json.
      }
    }
  }
  return entries.sort((a, b) => a.dir.localeCompare(b.dir));
}

async function writeRealm(opts: {
  outDir: string;
  title: string;
  description: string;
  icon: string;
  base: CatalogBase;
  manifests: CatalogEntry[];
}): Promise<void> {
  await rm(opts.outDir, { recursive: true, force: true });
  await mkdir(opts.outDir, { recursive: true });

  const groups = groupByCategory(opts.manifests, opts.base);
  await writeFile(
    path.join(opts.outDir, "meta.json"),
    realmMeta(opts.title, opts.description, opts.icon, groups),
  );
  await writeFile(
    path.join(opts.outDir, "index.mdx"),
    realmIndex(opts.title, opts.description, groups, opts.base),
  );

  for (const entry of opts.manifests) {
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
    const page = buildPage(entry.manifest, opts.base, related);
    await writeFile(path.join(opts.outDir, `${entry.dir}.mdx`), page);
  }

  console.log(
    `wrote ${opts.manifests.length} pages + meta.json + index.mdx to ${opts.outDir}`,
  );
}

async function main() {
  const apps = readManifests(APPS_STORE);
  const plugins = readManifests(PLUGIN_STORES);

  await writeRealm({
    outDir: path.join(CONTENT_ROOT, "apps"),
    title: "Apps",
    description:
      "The apps Ryu ships in the store: each is a self-contained product - an out-of-process sidecar plus a surface - that reaches the platform through the generic ext-proxy, capability broker, and companion seams.",
    icon: "AppWindow",
    base: "apps",
    manifests: apps,
  });

  await writeRealm({
    outDir: path.join(CONTENT_ROOT, "plugins"),
    title: "Plugins",
    description:
      "The plugins Ryu ships: manifest.json bundles that extend capabilities with net-new logic - tools, agents, workflows, skills, turn hooks, and UI contributions - installed and enabled through the public API.",
    icon: "Blocks",
    base: "plugins",
    manifests: plugins,
  });
}

main().catch((error) => {
  process.exitCode = 1;
  throw error;
});
