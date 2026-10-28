import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Honesty and drift guard for the public SDK, CLI and MCP pages under
// content/docs/standalone/sdk. The pages describe @ryuhq/services and
// @ryuhq/services-cli, so the guard reads both packages' sources by relative
// path (fumadocs test -> packages; the two packages never import each other
// for this) and fails when a page claims something the code does not do:
// a host Ryu does not serve, an env var or table the SDK does not read, an
// install command for an unpublished package without its callout, a
// `ryu.<ns>.<method>` call or `ryu-services` command that does not exist, a
// framework snippet that is not the tested code, or a sidebar entry with no
// page. Python samples (the `tab="Python"` beside each Node sample) are
// checked against the Python client's committed surface.json. The imports are dynamic with computed paths so the fumadocs type
// check does not compile the packages with this app's tsconfig.

export const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
export const sdkRoot = join(
  repoRoot,
  "apps/fumadocs/content/docs/standalone/sdk",
);
export const servicesSrc = join(repoRoot, "packages/services/src");
export const cliSrc = join(repoRoot, "packages/services-cli/src");
export const frameworkTests = join(
  repoRoot,
  "packages/services/test/frameworks",
);
export const openapiDir = join(repoRoot, "apps/web/public/openapi");

/** The callout every page with an install command carries while the package is unpublished. */
export const INSTALL_CALLOUT =
  "@ryuhq/services is not yet published to npm; it requires @ryuhq/client 0.4 or later, which is also not yet on npm (latest is 0.3.0).";

export interface EnvVarRow {
  default: string | null;
  description: string;
  name: string;
  role: string;
  service: string;
}

export interface IdempotentRoute {
  method: string;
  path: string;
  required: boolean;
}

export interface NamespaceDefinition {
  create(config: unknown, fetch: unknown, options: unknown): unknown;
  service: string;
}

export interface ServicesModule {
  AVAILABILITY: Record<string, string>;
  createEnvReader(
    source: Record<string, string>,
  ): (name: string) => string | undefined;
  ENV_VARS: readonly EnvVarRow[];
  NPM_PUBLISHED_VERSION: string | null;
  Ryu: new (options: Record<string, unknown>) => Record<string, unknown>;
  resolveServiceConfig(
    service: string,
    options: Record<string, unknown>,
    env: (name: string) => string | undefined,
  ): unknown;
  SERVICE_ROUTES: Record<
    string,
    { idempotent: readonly IdempotentRoute[]; mount: string }
  >;
  [name: string]: unknown;
}

export interface ConfigModule {
  SERVICE_DOC_SLUGS: Record<string, string>;
}

export interface FlagSpec {
  short?: string;
}

export interface ServiceCommand {
  flags?: Record<string, FlagSpec>;
  path: readonly string[];
}

export interface CliService {
  commands: readonly ServiceCommand[];
  name: string;
}

export interface ToolDefinition {
  annotations: { readOnlyHint: boolean };
  name: string;
}

export interface CliModule {
  CLI_SERVICES: readonly CliService[];
  commandLine(service: string, command: ServiceCommand): string;
  DOCTOR_COMMAND_FLAGS: Record<string, FlagSpec>;
  GLOBAL_FLAGS: Record<string, FlagSpec>;
  MCP_FLAGS: Record<string, FlagSpec>;
  MCP_TOOL_MODULES: readonly {
    register(
      registrar: { service: string; tool(definition: ToolDefinition): void },
      ryu: unknown,
    ): void;
    service: string;
  }[];
  matchCommand(
    commands: readonly ServiceCommand[],
    positionals: readonly string[],
  ): { command: ServiceCommand } | null;
  WEBHOOKS_COMMAND_FLAGS: Record<string, FlagSpec>;
}

export const services = (await import(
  join(servicesSrc, "index.ts")
)) as ServicesModule;
export const config = (await import(
  join(servicesSrc, "config.ts")
)) as ConfigModule;
export const cli = (await import(join(cliSrc, "index.ts"))) as CliModule;

export const NAMESPACE_DIRS = [
  "managed-agents",
  "messaging",
  "mail",
  "notify",
  "box",
  "gateway",
  "connect",
  "passport",
  "sites",
];

export async function loadDefinitions(): Promise<{
  definitions: Map<string, NamespaceDefinition>;
  deprecatedAliases: Map<string, Readonly<Record<string, string>>>;
}> {
  const definitions = new Map<string, NamespaceDefinition>();
  // A namespace module may export `<SVC>_DEPRECATED_ALIASES` (flat name ->
  // canonical dotted path); docs must use the canonical spelling.
  const deprecatedAliases = new Map<string, Readonly<Record<string, string>>>();
  for (const dir of NAMESPACE_DIRS) {
    const module = (await import(
      join(servicesSrc, dir, "namespace.ts")
    )) as Record<string, unknown>;
    let service: string | undefined;
    let aliases: Readonly<Record<string, string>> | undefined;
    for (const [name, value] of Object.entries(module)) {
      const candidate = value as Partial<NamespaceDefinition> | null;
      if (
        typeof candidate === "object" &&
        candidate !== null &&
        typeof candidate.create === "function" &&
        typeof candidate.service === "string"
      ) {
        service = candidate.service;
        definitions.set(candidate.service, candidate as NamespaceDefinition);
      } else if (
        name.endsWith("_DEPRECATED_ALIASES") &&
        typeof value === "object" &&
        value !== null
      ) {
        aliases = value as Readonly<Record<string, string>>;
      }
    }
    if (service && aliases) {
      deprecatedAliases.set(service, aliases);
    }
  }
  return { definitions, deprecatedAliases };
}

export const { definitions, deprecatedAliases } = await loadDefinitions();

// ---------------------------------------------------------------------------
// Page reading
// ---------------------------------------------------------------------------

export interface Page {
  content: string;
  /** Path relative to the sdk folder, e.g. `frameworks/nextjs.mdx`. */
  file: string;
}

export async function listFiles(
  directory: string,
  suffix: string,
): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path, suffix)));
    } else if (entry.name.endsWith(suffix)) {
      files.push(path);
    }
  }
  return files.sort();
}

export const pages: Page[] = await Promise.all(
  (await listFiles(sdkRoot, ".mdx")).map(async (path) => ({
    content: await readFile(path, "utf8"),
    file: relative(sdkRoot, path),
  })),
);

export function page(file: string): Page {
  const found = pages.find((candidate) => candidate.file === file);
  if (!found) {
    throw new Error(`missing page standalone/sdk/${file}`);
  }
  return found;
}

export interface Fence {
  body: string;
  lang: string;
  line: number;
}

/** Fenced code blocks, in order. */
export const DESTINATION_SAMPLE = /kind(: |=)"destination"/;

export function fences(content: string): Fence[] {
  const result: Fence[] = [];
  const lines = content.split("\n");
  let open: { lang: string; line: number; body: string[] } | null = null;
  for (const [index, line] of lines.entries()) {
    const marker = /^\s*```(\S*)/.exec(line);
    if (open === null && marker) {
      open = { lang: marker[1] ?? "", line: index + 1, body: [] };
    } else if (open !== null && /^\s*```\s*$/.test(line)) {
      result.push({
        body: open.body.join("\n"),
        lang: open.lang,
        line: open.line,
      });
      open = null;
    } else if (open !== null) {
      open.body.push(line);
    }
  }
  return result;
}

/** The page with fenced code removed. */
export function prose(content: string): string {
  return content.replace(/^\s*```[\s\S]*?^\s*```\s*$/gm, "");
}

/** Inline code spans in prose. */
export function inlineCode(content: string): string[] {
  return [...prose(content).matchAll(/`([^`\n]+)`/g)].map(
    (match) => match[1] ?? "",
  );
}

/** Callout bodies with whitespace collapsed. */
export function callouts(content: string): string[] {
  return [...content.matchAll(/<Callout[^>]*>([\s\S]*?)<\/Callout>/g)].map(
    (match) => (match[1] ?? "").replace(/\s+/g, " ").trim(),
  );
}
// ---------------------------------------------------------------------------
// Newcomer guard: samples a reader runs top to bottom must work as written.
// Each assertion pins one failure found by following the pages literally.
// ---------------------------------------------------------------------------

export const docsRoot = join(repoRoot, "apps/fumadocs/content/docs");

/** Shell fences of a page, with `\` line continuations joined. */
export function shellCommands(content: string): string[] {
  return fences(content)
    .filter((fence) => ["sh", "bash", "shell", "console"].includes(fence.lang))
    .map((fence) => fence.body.replace(/\\\n\s*/g, " "));
}
