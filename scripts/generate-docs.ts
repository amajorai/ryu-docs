import { rm } from "node:fs/promises";
import * as path from "node:path";
import { generateFiles, type OutputEntry } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

import { docsPath } from "../src/lib/docs-version";

/**
 * Generate the interactive API reference pages from the OpenAPI specs.
 *
 * Each spec is generated into its own folder so tag groups never collide across
 * schemas (both surfaces have, e.g., a "Health" tag). One page per operation,
 * grouped into folders by tag. The generated `<APIPage />` bodies are rendered
 * at request time by the shared server in `src/lib/openapi.ts` — keep the input
 * paths identical between the two files.
 *
 * A folder is only routable when it has an `index.mdx`; without one the surface
 * roots (`.../gateway`, `.../core`) 404 even though the parent api-reference
 * page links straight to them. `fumadocs-openapi`'s built-in `index` option
 * skips group (tag-folder) entries, which is everything when `groupBy: "tag"`,
 * so we build the compact surface and tag landing pages ourselves in
 * `beforeWrite` instead.
 */
const CONTENT_ROOT = path.join("content", "docs");
const API_DIR = path.join(CONTENT_ROOT, "extend", "develop", "api-reference");

const specs = [
  {
    input: "./specs/gateway-openapi.yaml",
    out: "gateway",
    title: "Gateway API",
    description:
      "The OpenAI-compatible control layer: chat, image, and audio generation plus routing, evals, audit, and governance.",
  },
  {
    input: "./specs/core-openapi.json",
    out: "core",
    title: "Core API",
    description:
      "The local orchestration backend: chat, agents, conversations, models, skills, MCP tools, spaces/RAG, sidecars, and more.",
  },
] as const;

const MAX_CARD_DESCRIPTION = 160;

const API_GUIDE_LINKS = {
  core: [
    { label: "Core internals", href: "/docs/core" },
    {
      label: "Core vs Gateway",
      href: "/docs/start-here/architecture/core-vs-gateway",
    },
    { label: "SDK reference", href: "/docs/extend/develop/sdk" },
    {
      label: "agent integration guide",
      href: "/docs/extend/develop/agent-integration-guide",
    },
  ],
  gateway: [
    { label: "Gateway", href: "/docs/gateway" },
    {
      label: "Gateway configuration",
      href: "/docs/gateway/configuration",
    },
    {
      label: "Gateway for any agent",
      href: "/docs/gateway/gateway-for-any-agent",
    },
    { label: "integration guide", href: "/docs/extend/integrate" },
  ],
} as const;

function cleanDescription(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) {
    return undefined;
  }
  return collapsed.length > MAX_CARD_DESCRIPTION
    ? `${collapsed.slice(0, MAX_CARD_DESCRIPTION - 1).trimEnd()}…`
    : collapsed;
}

function surfaceHref(spec: (typeof specs)[number], entryPath: string): string {
  const surfaceBase = docsPath("extend", "develop", "api-reference", spec.out);
  return `${surfaceBase}/${entryPath
    .split(path.sep)
    .join("/")
    .replace(/\.mdx$/, "")}`;
}

function apiNavigation(spec: (typeof specs)[number], group?: string): string {
  const surface = surfaceHref(spec, "").replace(/\/$/, "");
  const links = API_GUIDE_LINKS[spec.out];
  const groupLink = group
    ? `, in the [${group} endpoint group](${surface}/${group})`
    : "";
  return `This reference is part of the [API reference](/docs/extend/develop/api-reference) and the [${spec.title}](${surface})${groupLink}. Continue with ${links
    .map(({ label, href }) => `[${label}](${href})`)
    .join(", ")}.`;
}

function cardForEntry(
  entry: OutputEntry,
  href: (entryPath: string) => string,
): string {
  const description = cleanDescription(entry.info.description);
  const descriptionAttr = description
    ? ` description={${JSON.stringify(description)}}`
    : "";
  return `  <Card href=${JSON.stringify(href(entry.path))} title=${JSON.stringify(entry.info.title)}${descriptionAttr} />`;
}

/**
 * Build the compact surface landing page. Tag groups get their own landing
 * page below, so the surface root only needs to organize those destinations.
 */
function landingPage(
  spec: (typeof specs)[number],
  entries: OutputEntry[],
): string {
  const href = (entryPath: string) => surfaceHref(spec, entryPath);
  const lines = [
    "",
    "## Browse by endpoint group",
    "",
    "Each group has its own page with the available operations and their request and response details.",
    "",
    apiNavigation(spec),
    "",
    "<Cards>",
  ];

  for (const entry of entries) {
    if (entry.type === "group") {
      const description = cleanDescription(entry.info.description);
      const descriptionAttr = description
        ? ` description={${JSON.stringify(description)}}`
        : "";
      lines.push(
        `  <Card href=${JSON.stringify(href(entry.path))} title=${JSON.stringify(entry.info.title)}${descriptionAttr} />`,
      );
    } else {
      lines.push(cardForEntry(entry, href));
    }
  }
  lines.push("</Cards>");

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(spec.title)}`,
    `description: ${JSON.stringify(spec.description)}`,
    "---",
  ].join("\n");
  const banner =
    "{/* Landing page generated by scripts/generate-docs.ts — edit the script, not this file. */}";

  return `${frontmatter}\n\n${banner}\n${lines.join("\n")}\n`;
}

function groupLandingPage(
  spec: (typeof specs)[number],
  group: Extract<OutputEntry, { type: "group" }>,
): string {
  const href = (entryPath: string) => surfaceHref(spec, entryPath);
  const operations = group.entries.filter((entry) => entry.type !== "group");
  const description = cleanDescription(group.info.description);
  const lines = [
    "---",
    `title: ${JSON.stringify(group.info.title)}`,
    ...(description ? [`description: ${JSON.stringify(description)}`] : []),
    "---",
    "",
    "{/* Tag landing page generated by scripts/generate-docs.ts — edit the script, not this file. */}",
    "",
    apiNavigation(spec, group.path),
    "",
    "<Cards>",
    ...operations.map((entry) => cardForEntry(entry, href)),
    "</Cards>",
    "",
  ];

  return lines.join("\n");
}

async function main() {
  for (const spec of specs) {
    const output = path.join(API_DIR, spec.out);
    // Drop previously generated pages so removed endpoints don't linger.
    await rm(output, { recursive: true, force: true });

    const server = createOpenAPI({ input: [spec.input] });
    await generateFiles({
      input: server,
      output,
      per: "operation",
      groupBy: "tag",
      includeDescription: true,
      meta: true,
      beforeWrite(files) {
        const entries = Object.values(this.generatedEntries).flat();
        const surface = spec.out;
        for (const file of files) {
          const normalizedPath = file.path.split(path.sep).join("/");
          if (
            !normalizedPath.endsWith(".mdx") ||
            normalizedPath === "index.mdx" ||
            normalizedPath.endsWith("/index.mdx")
          ) {
            continue;
          }
          const group = path.posix.dirname(normalizedPath);
          file.content = `${file.content.trimEnd()}\n\n${apiNavigation(
            specs.find((candidate) => candidate.out === surface) ?? spec,
            group,
          )}\n`;
        }
        // `path` is relative to `output`, so this writes `<output>/index.mdx`.
        files.push({ path: "index.mdx", content: landingPage(spec, entries) });
        for (const entry of entries) {
          if (entry.type === "group") {
            files.push({
              path: path.join(entry.path, "index.mdx"),
              content: groupLandingPage(spec, entry),
            });
          }
        }
      },
    });
  }
}

main().catch((error) => {
  process.exitCode = 1;
  throw error;
});
