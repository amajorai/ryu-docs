import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { OutputEntry } from "fumadocs-openapi";

import { docsPath } from "../src/lib/docs-version";

/**
 * The OpenAPI documents rendered as generated API reference pages, and the
 * page builders `scripts/generate-docs.ts` uses for them.
 *
 * Every `input` here must also be listed in `src/lib/openapi.ts`: the
 * generated `<APIPage document="<input>" />` bodies are resolved against that
 * render-time server by the exact input string.
 *
 * - Gateway and Core render under `extend/develop/api-reference/`.
 * - The standalone services render under `standalone/sdk/reference/`, from
 *   the copies `scripts/sync-service-openapi.mjs` (repository root) vendors
 *   from `apps/web/public/openapi/` into `specs/services/`.
 */

const APP_ROOT = path.resolve(import.meta.dirname, "..");
export const CONTENT_ROOT = path.join("content", "docs");

interface GuideLink {
  readonly href: string;
  readonly label: string;
}

export interface ReferenceSpec {
  readonly description: string;
  /** Docs path segments of the surface folder, below `content/docs`. */
  readonly dir: readonly string[];
  readonly guides: readonly GuideLink[];
  /** Input path, relative to the docs app; also the `<APIPage document>` id. */
  readonly input: string;
  /** `--surface` id and folder name. */
  readonly out: string;
  /** The page every generated page names as its parent reference. */
  readonly parent: GuideLink;
  /**
   * Standalone services only: the short service name used in deployment
   * labels, and the document's full `info.description`, rendered on the
   * service landing page so its availability caveats stay visible.
   */
  readonly service?: {
    readonly name: string;
    readonly overview: string;
  };
  readonly title: string;
}

const API_REFERENCE_DIR = ["extend", "develop", "api-reference"] as const;
const API_REFERENCE_PARENT: GuideLink = {
  label: "API reference",
  href: "/docs/extend/develop/api-reference",
};

export const API_SPECS: readonly ReferenceSpec[] = [
  {
    input: "./specs/gateway-openapi.yaml",
    out: "gateway",
    dir: [...API_REFERENCE_DIR, "gateway"],
    parent: API_REFERENCE_PARENT,
    title: "Gateway API",
    description:
      "The OpenAI-compatible inference and control surface: Chat Completions, Responses, image, audio, asynchronous batches, routing, evals, audit, and governance.",
    guides: [
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
  },
  {
    input: "./specs/core-openapi.json",
    out: "core",
    dir: [...API_REFERENCE_DIR, "core"],
    parent: API_REFERENCE_PARENT,
    title: "Core API",
    description:
      "The local orchestration backend: chat, agents, conversations, models, skills, MCP tools, spaces/RAG, sidecars, and more.",
    guides: [
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
  },
];

/** The `--surface` id that selects every standalone service reference. */
export const SERVICES_SURFACE = "services";
export const SERVICE_SPEC_DIR = path.join("specs", "services");
export const SERVICE_REFERENCE_DIR = [
  "standalone",
  "sdk",
  "reference",
] as const;
const SERVICE_REFERENCE_PARENT: GuideLink = {
  label: "service API reference",
  href: "/docs/standalone/sdk/reference",
};

interface ServiceReference {
  /**
   * A short page description, for a document whose first sentence is longer
   * than a card description can hold. Condensed from that sentence; it must
   * not claim anything the document does not say.
   */
  readonly description?: string;
  readonly id: string;
  readonly name: string;
}

/**
 * Standalone services with a vendored OpenAPI document, in the order the
 * OpenAPI page lists them. `id` is the document's file name without `.json`
 * and also the SDK quickstart slug; `name` is the short service name.
 */
export const SERVICE_REFERENCES: readonly ServiceReference[] = [
  { id: "managed-agents", name: "Managed Agents" },
  { id: "mail", name: "Mail" },
  {
    id: "notify",
    name: "Notify",
    description:
      "Ryu Notify is a tenant-scoped event inbox for products and agents: event history, approvals, live activities, Server-Sent Events, and signed delivery.",
  },
  { id: "box", name: "Box" },
  {
    id: "connect",
    name: "Connect",
    description:
      "Ryu Connect is a tenant-scoped integration edge: a shared SKILL.md catalog, governed tool search and execution, Composio execution, and its own MCP servers.",
  },
  { id: "passport", name: "Passport" },
  { id: "sites", name: "Sites" },
  { id: "messaging", name: "Messaging" },
];

const MAX_CARD_DESCRIPTION = 160;

/**
 * `cleanDescription`, but cut at the last word boundary so a truncated
 * description never ends mid-word. Used for the standalone service pages;
 * Gateway and Core keep `cleanDescription` so their committed pages do not
 * change.
 */
export function cleanDescriptionAtWord(
  raw: string | undefined,
): string | undefined {
  if (!raw) {
    return undefined;
  }
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) {
    return undefined;
  }
  if (collapsed.length <= MAX_CARD_DESCRIPTION) {
    return collapsed;
  }
  const head = collapsed.slice(0, MAX_CARD_DESCRIPTION);
  const boundary = head.lastIndexOf(" ");
  const cut = boundary > 0 ? head.slice(0, boundary) : head.slice(0, -1);
  return `${cut.replace(/[\s,;:]+$/, "")}…`;
}

export function cleanDescription(raw: string | undefined): string | undefined {
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

/** The first sentence of a spec's `info.description`, without Markdown emphasis. */
export function firstSentence(raw: string): string {
  const paragraph = (raw.split(/\n\s*\n/)[0] ?? "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const end = /[.!?](?=\s|$)/.exec(paragraph);
  return end ? paragraph.slice(0, end.index + 1) : paragraph;
}

interface SpecInfo {
  description: string;
  title: string;
}

function readSpecInfo(input: string): SpecInfo {
  const document = JSON.parse(
    readFileSync(path.join(APP_ROOT, input), "utf8"),
  ) as { info?: Partial<SpecInfo> };
  const title = document.info?.title;
  const description = document.info?.description;
  if (!(title && description)) {
    throw new Error(`${input} has no info.title or info.description`);
  }
  return { title, description };
}

/** Build a service's reference spec from its vendored document's `info`. */
export function serviceReferenceSpec(service: ServiceReference): ReferenceSpec {
  const input = `./${path.posix.join("specs", "services", `${service.id}.json`)}`;
  const info = readSpecInfo(input);
  return {
    input,
    out: service.id,
    dir: [...SERVICE_REFERENCE_DIR, service.id],
    parent: SERVICE_REFERENCE_PARENT,
    service: { name: service.name, overview: info.description },
    title: `${info.title} reference`,
    description:
      service.description ??
      cleanDescriptionAtWord(firstSentence(info.description)) ??
      info.title,
    guides: [
      {
        label: `${service.name} SDK quickstart`,
        href: `/docs/standalone/sdk/${service.id}`,
      },
      {
        label: `${service.name} API guide`,
        href: `/docs/standalone/${service.id}-api`,
      },
      { label: "SDK errors", href: "/docs/standalone/sdk/errors" },
      {
        label: "retries and idempotency",
        href: "/docs/standalone/sdk/retries-and-idempotency",
      },
    ],
  };
}

export const SERVICE_SPECS: readonly ReferenceSpec[] =
  SERVICE_REFERENCES.map(serviceReferenceSpec);

export const ALL_SPECS: readonly ReferenceSpec[] = [
  ...API_SPECS,
  ...SERVICE_SPECS,
];

/** Resolve a `--surface` value to the specs it selects. */
export function selectSpecs(surface: string | undefined): ReferenceSpec[] {
  if (surface === undefined) {
    return [...ALL_SPECS];
  }
  if (surface === SERVICES_SURFACE) {
    return [...SERVICE_SPECS];
  }
  return ALL_SPECS.filter((spec) => spec.out === surface);
}

export function surfaceHref(spec: ReferenceSpec, entryPath: string): string {
  const surfaceBase = docsPath(...spec.dir);
  return `${surfaceBase}/${entryPath
    .split(path.sep)
    .join("/")
    .replace(/\.mdx$/, "")}`;
}

export function apiNavigation(spec: ReferenceSpec, group?: string): string {
  const surface = surfaceHref(spec, "").replace(/\/$/, "");
  const groupLink = group
    ? `, in the [${group} endpoint group](${surface}/${group})`
    : "";
  return `This reference is part of the [${spec.parent.label}](${spec.parent.href}) and the [${spec.title}](${surface})${groupLink}. Continue with ${spec.guides
    .map(({ label, href }) => `[${label}](${href})`)
    .join(", ")}.`;
}

/** Longest paragraph the overview keeps before splitting at a sentence. */
const MAX_OVERVIEW_PARAGRAPH = 600;

/** Escape MDX expression and JSX syntax outside inline code spans. */
export function escapeMdxText(text: string): string {
  return text
    .split(/(`[^`]*`)/)
    .map((part) =>
      part.startsWith("`") ? part : part.replace(/([{}<])/g, "\\$1"),
    )
    .join("");
}

/** Split a paragraph into sentences, never inside an inline code span. */
function sentences(paragraph: string): string[] {
  const result: string[] = [];
  let current = "";
  let inCode = false;
  for (let index = 0; index < paragraph.length; index += 1) {
    const char = paragraph[index] ?? "";
    current += char;
    if (char === "`") {
      inCode = !inCode;
    }
    if (!inCode && /[.!?]/.test(char) && paragraph[index + 1] === " ") {
      result.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}

/**
 * A spec's `info.description` as MDX paragraphs: the document's own
 * paragraphs, with any longer than `MAX_OVERVIEW_PARAGRAPH` split between
 * sentences so the page stays scannable. The words are unchanged.
 */
export function overviewParagraphs(description: string): string[] {
  const paragraphs: string[] = [];
  for (const raw of description.split(/\n\s*\n/)) {
    const paragraph = raw.replace(/\s+/g, " ").trim();
    if (!paragraph) {
      continue;
    }
    let current = "";
    for (const sentence of sentences(paragraph)) {
      if (
        current &&
        current.length + sentence.length + 1 > MAX_OVERVIEW_PARAGRAPH
      ) {
        paragraphs.push(current);
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current) {
      paragraphs.push(current);
    }
  }
  return paragraphs.map(escapeMdxText);
}

/** The deployments a service document can scope an operation to. */
export const DEPLOYMENT_MARKER = "x-ryu-deployment";

const documentCache = new Map<string, unknown>();

function readDocument(input: string): unknown {
  if (!documentCache.has(input)) {
    documentCache.set(
      input,
      JSON.parse(readFileSync(path.join(APP_ROOT, input), "utf8")),
    );
  }
  return documentCache.get(input);
}

/** An operation's `x-ryu-deployment` value, when its document sets one. */
export function operationDeployment(
  spec: ReferenceSpec,
  item: { method: string; path: string },
): string | undefined {
  if (!(spec.service && spec.input.endsWith(".json"))) {
    return undefined;
  }
  const document = readDocument(spec.input) as {
    paths?: Record<string, Record<string, Record<string, unknown>>>;
  };
  const value = document.paths?.[item.path]?.[item.method]?.[DEPLOYMENT_MARKER];
  return typeof value === "string" ? value : undefined;
}

/**
 * The sentence an operation page carries when only one deployment serves
 * it. fumadocs-openapi does not render vendor extensions, so without this
 * line the page, its Markdown and its llms.txt projection would show the
 * route beside every server in the document.
 */
export function deploymentNote(
  spec: ReferenceSpec,
  item: { method: string; path: string },
): string | undefined {
  const deployment = operationDeployment(spec, item);
  if (!(deployment && spec.service)) {
    return undefined;
  }
  const name = spec.service.name;
  if (deployment === "hosted") {
    return `**Hosted ${name} only.** Self-hosted ${name} does not serve this operation.`;
  }
  if (deployment === "standalone") {
    return `**Self-hosted ${name} only.** Hosted ${name} does not serve this operation.`;
  }
  throw new Error(
    `${spec.input} ${item.method.toUpperCase()} ${item.path}: unknown ${DEPLOYMENT_MARKER} "${deployment}"`,
  );
}

/** The card-description cleaner for a spec's generated pages. */
function describe(spec: ReferenceSpec, raw: string | undefined) {
  return spec.service ? cleanDescriptionAtWord(raw) : cleanDescription(raw);
}

function cardForEntry(
  spec: ReferenceSpec,
  entry: OutputEntry,
  href: (entryPath: string) => string,
): string {
  const description = describe(spec, entry.info.description);
  const descriptionAttr = description
    ? ` description={${JSON.stringify(description)}}`
    : "";
  return `  <Card href=${JSON.stringify(href(entry.path))} title=${JSON.stringify(entry.info.title)}${descriptionAttr} />`;
}

/**
 * Build the compact surface landing page. Tag groups get their own landing
 * page below, so the surface root only needs to organize those destinations.
 */
export function landingPage(
  spec: ReferenceSpec,
  entries: OutputEntry[],
): string {
  const href = (entryPath: string) => surfaceHref(spec, entryPath);
  const overview = spec.service
    ? ["", ...overviewParagraphs(spec.service.overview).flatMap((p) => [p, ""])]
    : [""];
  const lines = [
    ...overview.slice(0, -1),
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
    lines.push(cardForEntry(spec, entry, href));
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

export function groupLandingPage(
  spec: ReferenceSpec,
  group: Extract<OutputEntry, { type: "group" }>,
): string {
  const href = (entryPath: string) => surfaceHref(spec, entryPath);
  const operations = group.entries.filter((entry) => entry.type !== "group");
  const description = describe(spec, group.info.description);
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
    ...operations.map((entry) => cardForEntry(spec, entry, href)),
    "</Cards>",
    "",
  ];

  return lines.join("\n");
}

function listNames(names: readonly string[]): string {
  if (names.length < 2) {
    return names.join("");
  }
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

/** `standalone/sdk/reference/index.mdx`: one card per service reference. */
export function serviceReferenceIndex(): string {
  const cards = SERVICE_SPECS.map(
    (spec) =>
      `  <Card href=${JSON.stringify(docsPath(...spec.dir))} title=${JSON.stringify(spec.title)} description={${JSON.stringify(spec.description)}} />`,
  );
  return [
    "---",
    'title: "Service API reference"',
    'description: "Interactive references for the routes in each standalone service\'s OpenAPI document"',
    'tags: ["sdk", "openapi", "standalone", "api"]',
    "---",
    "",
    "{/* Generated by scripts/generate-docs.ts — edit the script, not this file. */}",
    "",
    `${listNames(SERVICE_SPECS.map((spec) => spec.service?.name ?? spec.out))} each have an interactive reference here,`,
    "rendered from the OpenAPI document listed on the",
    "[Service OpenAPI documents](/docs/standalone/sdk/openapi) page. Every",
    "operation in a document shows its parameters, request and response",
    "schemas, and error bodies; routes a document leaves out are not shown.",
    "To call a service from TypeScript, start with the",
    "[SDK overview](/docs/standalone/sdk). The Gateway has its own",
    "[Gateway API reference](/docs/extend/develop/api-reference/gateway).",
    "",
    "<Cards>",
    ...cards,
    "</Cards>",
    "",
  ].join("\n");
}

/** `standalone/sdk/reference/meta.json`. */
export function serviceReferenceMeta(): string {
  return `${JSON.stringify(
    {
      title: "API reference",
      pages: ["index", ...SERVICE_SPECS.map((spec) => spec.out)],
    },
    null,
    2,
  )}\n`;
}

/** Files written beside the service surfaces, relative to `content/docs`. */
export function serviceReferenceRootFiles(): {
  content: string;
  path: string;
}[] {
  const dir = path.join(...SERVICE_REFERENCE_DIR);
  return [
    { path: path.join(dir, "index.mdx"), content: serviceReferenceIndex() },
    { path: path.join(dir, "meta.json"), content: serviceReferenceMeta() },
  ];
}

/** Names the service reference folder may hold besides service folders. */
const SERVICE_REFERENCE_ROOT_FILES = new Set(["index.mdx", "meta.json"]);

/**
 * Entries of `<contentRoot>/standalone/sdk/reference` that no current
 * service generates, such as the folder of a service whose document was
 * removed. fumadocs would still route their pages, and their
 * `<APIPage document>` no longer resolves.
 */
export function orphanedServiceEntries(contentRoot: string): string[] {
  const directory = path.join(contentRoot, ...SERVICE_REFERENCE_DIR);
  if (!existsSync(directory)) {
    return [];
  }
  const services = new Set(SERVICE_SPECS.map((spec) => spec.out));
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) =>
      entry.isDirectory()
        ? !services.has(entry.name)
        : !(
            entry.name.startsWith(".") ||
            SERVICE_REFERENCE_ROOT_FILES.has(entry.name)
          ),
    )
    .map((entry) => path.join(...SERVICE_REFERENCE_DIR, entry.name))
    .sort();
}
