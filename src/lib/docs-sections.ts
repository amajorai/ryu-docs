// Section slugs accepted by /llms-sections/{section} and the docs MCP
// `docs_index` tool. Values are the URL prefix that section owns (relative to
// /docs/{version}/). Legacy slugs from the pre-reorg layout map onto the realm
// they now live in, so old clients that asked for `desktop` or `mcp` still get
// those pages.
export const DOCS_SECTIONS = {
  "start-here": "start-here",
  learn: "learn",
  surfaces: "surfaces",
  mobile: "mobile",
  "browser-extension": "browser-extension",
  hardware: "hardware",
  apps: "apps",
  plugins: "plugins",
  providers: "providers",
  core: "core",
  gateway: "gateway",
  security: "security",
  extend: "extend",
  ui: "ui",
  standalone: "standalone",
  ci: "ci",
  showcase: "showcase",
  reference: "reference",
  billing: "billing",
  programs: "programs",
  legal: "legal",
  "release-notes": "release-notes",
  roadmap: "roadmap",
  rsi: "rsi",
  // Realms whose pages live under another realm's URL prefix.
  desktop: "surfaces/desktop",
  cli: "surfaces/cli",
  // Legacy aliases → the realm that absorbed them.
  island: "surfaces/island",
  raycast: "surfaces/raycast",
  develop: "extend/develop",
  integrate: "extend/integrate",
  skills: "extend/skills",
  mcp: "extend/mcp",
  cookbook: "learn/cookbook",
  academy: "learn/academy",
  defaults: "reference/defaults",
  benchmark: "reference/benchmark",
};

export type DocsSection = keyof typeof DOCS_SECTIONS;

export function isDocsSection(section: string): section is DocsSection {
  return Object.hasOwn(DOCS_SECTIONS, section);
}

/**
 * True when a page (by its content slugs) belongs to `section`: a known section
 * or legacy alias resolves to the prefix it owns, and any other value is taken
 * as a literal slug prefix such as `extend/mcp`.
 */
export function pageInDocsSection(slugs: string[], section: string): boolean {
  const prefix = isDocsSection(section) ? DOCS_SECTIONS[section] : section;
  const path = slugs.join("/");
  return path === prefix || path.startsWith(`${prefix}/`);
}
