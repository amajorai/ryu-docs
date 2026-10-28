import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  cli,
  definitions,
  deprecatedAliases,
  type EnvVarRow,
  type FlagSpec,
  fences,
  inlineCode,
  prose,
  repoRoot,
  services,
} from "./standalone-sdk-docs-fixtures";

// Matchers for the standalone SDK docs guard: hosts, tested regions, env
// tables, SDK and Python chains, and ryu-services command lines.
// ---------------------------------------------------------------------------
// Hosts
// ---------------------------------------------------------------------------

/**
 * Third-party hosts a page may name as the target of a call, never as a Ryu
 * service host. Each needs a reason.
 */
export const THIRD_PARTY_EXAMPLE_HOSTS: Record<string, string> = {
  "api.github.com":
    "Passport example: the upstream API a stored GitHub login is used for.",
};

/**
 * Ryu service hosts a page may name, each verified with read-only GETs on
 * 2026-10-22 (its `/health` and a 401 in the service's own error envelope).
 * `@ryuhq/services` defaults Box and Notify to these origins. Add a host only
 * after the same check.
 */
export const RYU_SERVICE_HOSTS: ReadonlySet<string> = new Set([
  "api.ryuhq.com",
  "box.ryuhq.com",
  "docs.ryuhq.com",
  "notify.ryuhq.com",
]);

export function hostProblem(url: string): string | null {
  const match = /^https?:\/\/([^/?#\s]+)(\/[^\s]*)?$/.exec(url);
  if (!match) {
    return null;
  }
  const host = (match[1] ?? "").replace(/:\d+$/, "").toLowerCase();
  const path = match[2] ?? "";
  if (host.startsWith("<") || host.startsWith("$") || host.startsWith("{")) {
    return null;
  }
  if (
    RYU_SERVICE_HOSTS.has(host) ||
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "example.com" ||
    host.endsWith(".example.com") ||
    Object.hasOwn(THIRD_PARTY_EXAMPLE_HOSTS, host)
  ) {
    return null;
  }
  if (host === "ryuhq.com" && path.startsWith("/openapi/")) {
    return null;
  }
  return `host ${host}${path} is not on the allowlist`;
}

export function hostProblems(content: string): string[] {
  const problems: string[] = [];
  // `}` ends a URL too, so a shell default such as
  // "${RYU_BOX_URL:-https://box.ryuhq.com}/v1/boxes" is read as the host it names.
  for (const match of content.matchAll(/https?:\/\/[^\s"'`)<>\]}]+/g)) {
    const problem = hostProblem(match[0].replace(/[.,;:]+$/, ""));
    if (problem) {
      problems.push(problem);
    }
  }
  for (const match of content.matchAll(
    /\b((?:[a-z0-9-]+\.)+ryuhq\.com|(?:[a-z0-9-]+\.)*ryu\.ai)\b/gi,
  )) {
    const host = (match[1] ?? "").toLowerCase();
    if (!RYU_SERVICE_HOSTS.has(host)) {
      problems.push(`host ${host} is not a documented Ryu API host`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Framework snippet regions
// ---------------------------------------------------------------------------

/** Renders one docs region as its code block (see packages/services/test/frameworks/*). */
export function renderRegion(lines: readonly string[]): string {
  const shown = lines.map((line) => {
    const show = /^(\s*)\/\/ docs:show(?: (.*))?$/.exec(line);
    return show ? `${show[1] ?? ""}${show[2] ?? ""}` : line;
  });
  const indents = shown
    .filter((line) => line.trim() !== "")
    .map((line) => /^\s*/.exec(line)?.[0].length ?? 0);
  const common = indents.length > 0 ? Math.min(...indents) : 0;
  return shown
    .map((line) => {
      const dedented = line.slice(common);
      const tabs = /^\t*/.exec(dedented)?.[0].length ?? 0;
      return `${"  ".repeat(tabs)}${dedented.slice(tabs)}`.trimEnd();
    })
    .join("\n");
}

export interface Region {
  body: string;
  id: string;
}

export function regions(source: string): Region[] {
  const result: Region[] = [];
  let open: { id: string; lines: string[] } | null = null;
  for (const line of source.split("\n")) {
    const start = /^\s*\/\/ docs:start (\S+)\s*$/.exec(line);
    const end = /^\s*\/\/ docs:end (\S+)\s*$/.exec(line);
    if (start) {
      if (open !== null) {
        throw new Error(`docs region ${open.id} is not closed`);
      }
      open = { id: start[1] ?? "", lines: [] };
    } else if (end) {
      if (open === null || open.id !== end[1]) {
        throw new Error(`docs:end ${end[1]} has no matching docs:start`);
      }
      result.push({ id: open.id, body: renderRegion(open.lines) });
      open = null;
    } else if (open !== null) {
      open.lines.push(line);
    }
  }
  if (open !== null) {
    throw new Error(`docs region ${open.id} is not closed`);
  }
  return result;
}

export const FRAMEWORK_PAGES: Record<string, string> = {
  "frameworks/nextjs.mdx": "next-route.test.ts",
  "frameworks/hono.mdx": "hono.test.ts",
  "frameworks/edge.mdx": "edge.test.ts",
  "agent-tools.mdx": "agent-tools.test.ts",
};

// ---------------------------------------------------------------------------
// Env tables
// ---------------------------------------------------------------------------

export interface TableRow {
  default: string;
  description: string;
  name: string;
}

export function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Every table whose header has a `Variable` column, as rows. */
export function envTables(content: string): TableRow[][] {
  const tables: TableRow[][] = [];
  const lines = prose(content).split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const header = splitRow(lines[index] ?? "");
    if (!header.includes("Variable") || !lines[index]?.trim().startsWith("|")) {
      continue;
    }
    const nameColumn = header.indexOf("Variable");
    const defaultColumn = header.indexOf("Default");
    const descriptionColumn = header.indexOf("Description");
    const rows: TableRow[] = [];
    let cursor = index + 2;
    while (lines[cursor]?.trim().startsWith("|")) {
      const cells = splitRow(lines[cursor] ?? "");
      rows.push({
        name: cells[nameColumn] ?? "",
        default: cells[defaultColumn] ?? "",
        description: cells[descriptionColumn] ?? "",
      });
      cursor += 1;
    }
    tables.push(rows);
    index = cursor;
  }
  return tables;
}

export function expectedRows(rows: readonly EnvVarRow[]): TableRow[] {
  return rows.map((row) => ({
    name: `\`${row.name}\``,
    default: row.default === null ? "none" : `\`${row.default}\``,
    description: row.description,
  }));
}

// ---------------------------------------------------------------------------
// `ryu.<ns>.<method>` chains
// ---------------------------------------------------------------------------

export const FAKE_ENV: Record<string, string> = Object.fromEntries(
  services.ENV_VARS.filter((row) => row.name !== "RYU_MAIL_API_KEY").map(
    (row) => [
      row.name,
      row.role === "url"
        ? `https://${row.service.toLowerCase()}.example.com`
        : "docs-guard-key",
    ],
  ),
);

export const CHAIN =
  /\bryu\.(safe\.)?([A-Za-z_$][\w$]*)((?:\.with\([^()]*\))?)((?:\.[A-Za-z_$][\w$]*)*)/g;

/** A line break and indentation before a `.member` continuation of a chain. */
export const CHAIN_CONTINUATION = /[ \t]*\r?\n\s*(?=\.[A-Za-z_$])/g;

/** Every chain in `text`, with chains split across lines joined first. */
export function chainMatches(text: string): RegExpMatchArray[] {
  return [...text.replace(CHAIN_CONTINUATION, "").matchAll(CHAIN)];
}

export function resolvePath(target: unknown, path: readonly string[]): boolean {
  let current = target;
  for (const key of path) {
    if (
      (typeof current !== "object" && typeof current !== "function") ||
      current === null ||
      !(key in (current as object))
    ) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current !== undefined;
}

export function chainProblem(match: RegExpMatchArray): string | null {
  const [chain, safe, head = "", , rest = ""] = match;
  const path = rest.split(".").filter(Boolean);
  const definition = definitions.get(head);
  const aliases = deprecatedAliases.get(head);
  const first = path[0] ?? "";
  // The Box stream's WebSocket subprotocols (`ryu.box.v1`, `ryu.token.<token>`)
  // read like chains but are wire names, not SDK calls.
  if ((head === "box" && path.join(".") === "v1") || head === "token") {
    return null;
  }
  if (aliases && Object.hasOwn(aliases, first)) {
    return `${chain} uses a deprecated alias; write ryu.${head}.${aliases[first]}`;
  }
  if (definition) {
    const resolved = services.resolveServiceConfig(
      head,
      {},
      services.createEnvReader(FAKE_ENV),
    );
    const client = definition.create(
      resolved,
      () => Promise.reject(new Error("the docs guard sends no request")),
      {},
    );
    return resolvePath(client, path) ? null : `${chain} does not resolve`;
  }
  if (safe) {
    return `${chain}: ryu.safe has no namespace ${head}`;
  }
  const ryu = new services.Ryu({ env: FAKE_ENV });
  return resolvePath(ryu, [head, ...path]) ? null : `${chain} does not resolve`;
}

// ---------------------------------------------------------------------------
// Python `ryu.<ns>.<method>` chains
// ---------------------------------------------------------------------------

// The Python client (bindings/python/ryu_sdk/services) commits its public
// surface as surface.json; its own test keeps that file equal to the client.
export const pythonSurfacePath = join(
  repoRoot,
  "bindings/python/ryu_sdk/services/surface.json",
);
export const pythonSurface = (
  JSON.parse(await readFile(pythonSurfacePath, "utf8")) as { paths: string[] }
).paths;
export const pythonPaths = new Set(pythonSurface);
export const pythonNamespaces = new Set(
  pythonSurface.filter((path) => !path.includes(".")),
);

export const PY_CHAIN =
  /\bryu\.(safe\.)?([A-Za-z_]\w*)((?:\.with_options\([^()]*\))?)((?:\.[A-Za-z_]\w*)*)/g;

/** Whether `path` is a member of the Python client or an object on the way to one. */
export function pythonPathResolves(path: string): boolean {
  return (
    pythonPaths.has(path) ||
    pythonSurface.some((entry) => entry.startsWith(`${path}.`))
  );
}

export function pythonChainProblem(match: RegExpMatchArray): string | null {
  const [chain, safe, head = "", withOptions = "", rest = ""] = match;
  if ((safe || withOptions) && !pythonNamespaces.has(head)) {
    return `${chain}: ${head} is not a Python namespace`;
  }
  if (withOptions && !pythonPaths.has(`${head}.with_options`)) {
    return `${chain}: ${head} has no with_options`;
  }
  const path = [head, ...rest.split(".").filter(Boolean)].join(".");
  return pythonPathResolves(path)
    ? null
    : `${chain} does not resolve on the Python client`;
}

export function pythonChainMatches(text: string): RegExpMatchArray[] {
  return [...text.matchAll(PY_CHAIN)];
}

/** The SDK pages whose Node samples carry a Python tab. */
export const PYTHON_TAB_PAGES = [
  "index.mdx",
  "managed-agents.mdx",
  "mail.mdx",
  "notify.mdx",
  "box.mdx",
  "gateway.mdx",
  "connect.mdx",
  "passport.mdx",
  "sites.mdx",
  "messaging.mdx",
  "errors.mdx",
  "webhooks.mdx",
  "pagination.mdx",
  "retries-and-idempotency.mdx",
];

/** The callout every page that introduces the Python client carries while it is unpublished. */
export const PYTHON_CALLOUT =
  "The `ryu-sdk` Python package is not yet published to PyPI, so the Python client cannot be installed outside Ryu either.";

/** `tab="Node"` fences that are not immediately followed by a `tab="Python"` fence. */
export function unpairedNodeTabs(content: string): number[] {
  const lines = content.split("\n");
  const unpaired: number[] = [];
  for (const [index, line] of lines.entries()) {
    if (!/^```\S+ tab="Node"/.test(line)) {
      continue;
    }
    let cursor = index + 1;
    while (cursor < lines.length && !/^```\s*$/.test(lines[cursor] ?? "")) {
      cursor += 1;
    }
    cursor += 1;
    while (cursor < lines.length && (lines[cursor] ?? "").trim() === "") {
      cursor += 1;
    }
    if (!/^```python tab="Python"/.test(lines[cursor] ?? "")) {
      unpaired.push(index + 1);
    }
  }
  return unpaired;
}

// ---------------------------------------------------------------------------
// `ryu-services` command lines
// ---------------------------------------------------------------------------

export function tokenize(line: string): string[] {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? "",
  );
}

export function commandLines(content: string): string[] {
  const lines: string[] = [];
  for (const fence of fences(content)) {
    if (!["sh", "bash", "shell", "console"].includes(fence.lang)) {
      continue;
    }
    const joined = fence.body.replace(/\\\n\s*/g, " ");
    for (const raw of joined.split("\n")) {
      const line = raw.trim().replace(/^\$\s+/, "");
      if (line.startsWith("ryu-services")) {
        lines.push(line);
      }
    }
  }
  for (const code of inlineCode(content)) {
    if (code.startsWith("ryu-services")) {
      lines.push(code);
    }
  }
  return lines;
}

export function flagProblems(
  line: string,
  tokens: readonly string[],
  allowed: Record<string, FlagSpec>,
): string[] {
  const problems: string[] = [];
  const shorts = new Set(
    Object.values(allowed).flatMap((spec) => (spec.short ? [spec.short] : [])),
  );
  for (const token of tokens) {
    if (token === "--") {
      break;
    }
    if (token.startsWith("--")) {
      const name = token.slice(2).split("=")[0] ?? "";
      if (!Object.hasOwn(allowed, name)) {
        problems.push(`${line}: unknown flag --${name}`);
      }
    } else if (/^-[a-zA-Z]$/.test(token) && !shorts.has(token.slice(1))) {
      problems.push(`${line}: unknown flag ${token}`);
    }
  }
  return problems;
}

export function commandProblems(line: string): string[] {
  const tokens = tokenize(line);
  const word = tokens[1];
  if (word === undefined || word.startsWith("<") || word === "--help") {
    return [];
  }
  const local: Record<string, Record<string, FlagSpec>> = {
    doctor: cli.DOCTOR_COMMAND_FLAGS,
    mcp: cli.MCP_FLAGS,
  };
  if (local[word]) {
    return flagProblems(line, tokens.slice(2), local[word]);
  }
  if (word === "help") {
    return [];
  }
  if (word === "webhooks") {
    return tokens[2] === "verify"
      ? flagProblems(line, tokens.slice(3), cli.WEBHOOKS_COMMAND_FLAGS)
      : [`${line}: webhooks has only the verify command`];
  }
  const service = cli.CLI_SERVICES.find((entry) => entry.name === word);
  if (!service) {
    return [`${line}: ryu-services has no service or command ${word}`];
  }
  const rest = tokens.slice(2);
  const firstFlag = rest.findIndex((token) => token.startsWith("-"));
  const positionals = firstFlag === -1 ? rest : rest.slice(0, firstFlag);
  if (positionals.length === 0) {
    return [];
  }
  const matched = cli.matchCommand(service.commands, positionals);
  if (!matched) {
    return [`${line}: ${word} has no command ${positionals.join(" ")}`];
  }
  return flagProblems(line, rest, {
    ...cli.GLOBAL_FLAGS,
    ...matched.command.flags,
  });
}
