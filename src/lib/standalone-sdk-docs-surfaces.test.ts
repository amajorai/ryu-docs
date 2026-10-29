import { describe, expect, test } from "bun:test";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  commandLines,
  commandProblems,
  FRAMEWORK_PAGES,
  PYTHON_CALLOUT,
  PYTHON_TAB_PAGES,
  regions,
  splitRow,
  unpairedNodeTabs,
} from "./standalone-sdk-docs-checks";
import {
  callouts,
  cli,
  config,
  fences,
  frameworkTests,
  listFiles,
  openapiDir,
  page,
  pages,
  repoRoot,
  sdkRoot,
  services,
} from "./standalone-sdk-docs-fixtures";
import {
  acloseProblems,
  NODE_OBJECT_CLIENT,
  nodeResultMisreads,
  OWN_THROW_CLIENT,
  PYTHON_OBJECT_CLIENT,
  pythonResultMisreads,
  SERVICE_TITLES,
} from "./standalone-sdk-docs-samples";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("standalone SDK docs guard: surfaces and navigation", () => {
  test("samples on an object-mode page are written for object mode", () => {
    const findings: string[] = [];
    let checked = 0;
    for (const entry of pages) {
      const nodeObject = NODE_OBJECT_CLIENT.test(entry.content);
      const pythonObject = PYTHON_OBJECT_CLIENT.test(entry.content);
      for (const fence of fences(entry.content)) {
        if (OWN_THROW_CLIENT.test(fence.body)) {
          continue;
        }
        const isNode = ["ts", "tsx", "js", "typescript"].includes(fence.lang);
        const isPython = ["python", "py"].includes(fence.lang);
        let misreads: string[] = [];
        if (isNode && nodeObject) {
          misreads = nodeResultMisreads(fence.body);
        } else if (isPython && pythonObject) {
          misreads = pythonResultMisreads(fence.body);
        } else {
          continue;
        }
        checked += 1;
        for (const misread of misreads) {
          findings.push(`${entry.file}:${fence.line}: ${misread}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(40);
    expect(findings).toEqual([]);
  });

  test("Python samples close only async generators with aclosing()", () => {
    const findings: string[] = [];
    let checked = 0;
    for (const entry of pages) {
      for (const fence of fences(entry.content)) {
        if (!["python", "py"].includes(fence.lang)) {
          continue;
        }
        checked += fence.body.includes("aclosing(") ? 1 : 0;
        for (const problem of acloseProblems(fence.body)) {
          findings.push(`${entry.file}:${fence.line}: ${problem}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(1);
    expect(findings).toEqual([]);
  });

  test("Node samples on the SDK pages have a Python tab beside them", () => {
    const findings = PYTHON_TAB_PAGES.flatMap((file) =>
      unpairedNodeTabs(page(file).content).map((line) => `${file}:${line}`),
    );
    expect(findings).toEqual([]);
    const tabbed = PYTHON_TAB_PAGES.filter((file) =>
      page(file).content.includes('```python tab="Python"'),
    );
    expect(tabbed).toEqual(PYTHON_TAB_PAGES);
  });

  test("the Python client is introduced with its unpublished-package callout", () => {
    expect(callouts(page("index.mdx").content)).toContain(PYTHON_CALLOUT);
    const claims = pages
      .filter((entry) => /There is no Python SDK/i.test(entry.content))
      .map((entry) => entry.file);
    expect(claims).toEqual([]);
    const pipInstall = pages
      .filter((entry) =>
        /\bpip3? install\b[^\n]*\bryu-sdk\b/.test(entry.content),
      )
      .map((entry) => entry.file);
    expect(pipInstall).toEqual([]);
  });

  test("every extend/develop/sdk page that installs ryu-sdk says it is unpublished", async () => {
    const developRoot = join(
      repoRoot,
      "apps/fumadocs/content/docs/extend/develop/sdk",
    );
    const findings: string[] = [];
    for (const path of await listFiles(developRoot, ".mdx")) {
      const content = await readFile(path, "utf8");
      const installs = /\bpip3? install\b[^\n]*\bryu-sdk\b/.test(content);
      const saysUnpublished = callouts(content).some(
        (text) =>
          text === PYTHON_CALLOUT ||
          /`ryu-sdk`.*?\bnot (?:yet )?published\b/.test(text),
      );
      if (installs && !saysUnpublished) {
        findings.push(
          `${relative(developRoot, path)}: pip install without the PyPI callout`,
        );
      }
      if (/\bryu-sdk`? (?:package )?on PyPI\b/.test(content)) {
        findings.push(
          `${relative(developRoot, path)}: claims ryu-sdk is on PyPI`,
        );
      }
    }
    expect(findings).toEqual([]);
  });

  test("every ryu-services command line exists in the CLI registry", () => {
    const lines = pages.flatMap((entry) => commandLines(entry.content));
    expect(lines.length).toBeGreaterThan(40);
    const findings = pages.flatMap((entry) =>
      commandLines(entry.content).flatMap((line) =>
        commandProblems(line).map((problem) => `${entry.file}: ${problem}`),
      ),
    );
    expect(findings).toEqual([]);
  });

  test("the CLI page lists every registered command", () => {
    const content = page("cli.mdx").content;
    for (const service of cli.CLI_SERVICES) {
      for (const command of service.commands) {
        expect(content).toContain(
          `\`${cli.commandLine(service.name, command)}`,
        );
      }
    }
  });

  test("the MCP page lists every tool with its read-only flag", () => {
    const content = page("mcp.mdx").content;
    const ryu = new services.Ryu({ env: {} });
    for (const module of cli.MCP_TOOL_MODULES) {
      module.register(
        {
          service: module.service,
          tool: (definition) => {
            const row = content
              .split("\n")
              .find((line) => line.startsWith(`| \`${definition.name}\``));
            expect({ tool: definition.name, row: row !== undefined }).toEqual({
              tool: definition.name,
              row: true,
            });
            const readOnly = definition.annotations.readOnlyHint ? "Yes" : "No";
            expect(row?.trim().endsWith(`| ${readOnly} |`)).toBe(true);
          },
        },
        ryu,
      );
    }
  });

  test("the retries page's route table equals SERVICE_ROUTES", () => {
    const content = page("retries-and-idempotency.mdx").content;
    const documented = content
      .split("\n")
      .filter((line) => /^\| `?(?:POST|PATCH)`? \|/.test(line))
      .map((line) => splitRow(line).join(" | "));
    const slugs = config.SERVICE_DOC_SLUGS;
    const expected = Object.entries(services.SERVICE_ROUTES).flatMap(
      ([service, table]) =>
        table.idempotent.map((route) =>
          [
            `\`${route.method}\``,
            `\`${table.mount}${route.path}\``,
            route.required ? "Required" : "Optional",
            `[${SERVICE_TITLES[service]}](/docs/standalone/sdk/${slugs[service]})`,
          ].join(" | "),
        ),
    );
    expect(documented.sort()).toEqual(expected.sort());
  });

  test("the errors page names every RyuError class", () => {
    const content = page("errors.mdx").content;
    const classes = Object.keys(services).filter((name) =>
      /^Ryu\w*Error$/.test(name),
    );
    expect(classes.length).toBeGreaterThan(10);
    for (const name of classes) {
      expect({ name, documented: content.includes(`\`${name}\``) }).toEqual({
        name,
        documented: true,
      });
    }
  });

  test("the errors page's configuration example matches the SDK", async () => {
    const content = page("errors.mdx").content;
    const shown = /\/\/ error\.details => (\{ missing: \[[^\]]*\] \})/.exec(
      content,
    )?.[1];
    expect(shown).toBeDefined();
    const ryu = new services.Ryu({ result: "object", env: false });
    const notify = ryu.notify as {
      publish(input: { title: string }): Promise<{
        error: { code: string; details: unknown } | null;
      }>;
    };
    const { error } = await notify.publish({ title: "Hello" });
    expect(error?.code).toBe("configuration_error");
    const missing = (error?.details as { missing: string[] }).missing;
    expect(shown).toBe(
      `{ missing: [${missing.map((name) => JSON.stringify(name)).join(", ")}] }`,
    );
  });

  test("the OpenAPI page lists every service document and links only existing ones", async () => {
    const published = (await readdir(openapiDir))
      .filter((name) => name.endsWith(".json") && name !== "v1.json")
      .map((name) => name.replace(/\.json$/, ""));
    const content = page("openapi.mdx").content;
    for (const id of published) {
      expect(content).toContain(`https://ryuhq.com/openapi/${id}.json`);
    }
    const linked = pages.flatMap((entry) =>
      [
        ...entry.content.matchAll(
          /https:\/\/ryuhq\.com\/openapi\/([\w-]+)\.json/g,
        ),
      ].map((match) => match[1] ?? ""),
    );
    for (const id of linked) {
      expect({ id, exists: published.includes(id) || id === "v1" }).toEqual({
        id,
        exists: true,
      });
    }
  });

  test("framework snippets are byte-identical to their tested regions", async () => {
    for (const [file, testFile] of Object.entries(FRAMEWORK_PAGES)) {
      const source = await readFile(join(frameworkTests, testFile), "utf8");
      const tested = regions(source).map((region) => region.body);
      // Python blocks are checked by their own test
      // (bindings/python/tests/test_services_tools_docs.py runs each one).
      const shown = fences(page(file).content)
        .filter((fence) => !["python", "py"].includes(fence.lang))
        .map((fence) => fence.body);
      expect({ file, blocks: shown }).toEqual({ file, blocks: tested });
    }
  });

  test("never shows Hire with an install or a call", () => {
    const findings: string[] = [];
    for (const entry of pages) {
      if (
        /\bryu\.hire\b|ryu-services\s+hire\b|@ryuhq\/hire/i.test(entry.content)
      ) {
        findings.push(`${entry.file}: Hire call`);
      }
      for (const fence of fences(entry.content)) {
        if (/\bhire\b/i.test(fence.body)) {
          findings.push(`${entry.file}:${fence.line}: Hire in code`);
        }
      }
    }
    expect(findings).toEqual([]);
  });

  test("meta.json pages all exist and every page is listed", async () => {
    const sdkMeta = (await Bun.file(join(sdkRoot, "meta.json")).json()) as {
      pages: string[];
      title: string;
    };
    expect(sdkMeta.title).toBe("SDK, CLI and MCP");
    expect(sdkMeta.pages).toEqual([
      "index",
      "choose-an-sdk",
      "---Core concepts---",
      "errors",
      "retries-and-idempotency",
      "pagination",
      "webhooks",
      "---Managed Agents---",
      "managed-agents",
      "managed-agents-tool-approvals",
      "managed-agents-cli-mcp",
      "---Mail---",
      "mail",
      "mail-resources",
      "mail-errors",
      "mail-cli-mcp",
      "---Notify---",
      "notify",
      "notify-errors",
      "notify-cli-mcp",
      "---Box---",
      "box",
      "box-errors",
      "box-cli-mcp",
      "---Gateway, Connect and Passport---",
      "gateway",
      "connect",
      "passport",
      "---Sites---",
      "sites",
      "sites-errors",
      "sites-cli-mcp",
      "---Messaging---",
      "messaging",
      "messaging-errors",
      "messaging-cli-mcp",
      "---Tools and frameworks---",
      "cli",
      "mcp",
      "mcp-hosted-mail",
      "agent-tools",
      "frameworks",
      "openapi",
      "reference",
    ]);
    const metaFiles = await listFiles(sdkRoot, "meta.json");
    const listed = new Set<string>();
    for (const metaFile of metaFiles) {
      const folder = relative(sdkRoot, join(metaFile, ".."));
      const meta = (await Bun.file(metaFile).json()) as { pages: string[] };
      for (const entry of meta.pages.filter(
        (name) => !name.startsWith("---"),
      )) {
        const base = join(sdkRoot, folder, entry);
        const asPage = await stat(`${base}.mdx`).catch(() => null);
        const asFolder = await stat(join(base, "meta.json")).catch(() => null);
        expect({
          entry: join(folder, entry),
          exists: Boolean(asPage ?? asFolder),
        }).toEqual({ entry: join(folder, entry), exists: true });
        listed.add(join(folder, `${entry}.mdx`).replaceAll("\\", "/"));
        // A listed folder's index.mdx is its own page (the generated API
        // reference folders under reference/ rely on this).
        if (asFolder) {
          listed.add(join(folder, entry, "index.mdx").replaceAll("\\", "/"));
        }
      }
    }
    expect(
      pages.map((entry) => entry.file).filter((file) => !listed.has(file)),
    ).toEqual([]);
  });
});
