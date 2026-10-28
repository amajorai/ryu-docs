import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PYTHON_CALLOUT } from "./standalone-sdk-docs-checks";
import {
  callouts,
  INSTALL_CALLOUT,
  listFiles,
  page,
  repoRoot,
  services,
} from "./standalone-sdk-docs-fixtures";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("choose-an-sdk pins", () => {
  const choose = page("choose-an-sdk.mdx").content;

  /** Source trees whose env reads the page's environment table describes. */
  const ENV_SOURCES = [
    "packages/sdk/src",
    "packages/client/src",
    "packages/core-client/src",
    "packages/services/src",
    "packages/services-cli/src",
    "bindings/python/ryu_sdk",
    "apps/cli/src",
    "apps/mcp/src",
  ];

  test("every RYU_* variable on the page is read by an SDK, CLI, or MCP source", async () => {
    const sources: string[] = [];
    for (const dir of ENV_SOURCES) {
      for (const suffix of [".ts", ".tsx", ".py"]) {
        for (const file of await listFiles(join(repoRoot, dir), suffix)) {
          if (!/\.test\.tsx?$|__tests__/.test(file)) {
            sources.push(await readFile(file, "utf8"));
          }
        }
      }
    }
    const corpus = sources.join("\n");
    const named = [
      ...new Set(
        [...choose.matchAll(/\bRYU_[A-Z0-9_]*[A-Z0-9]\b/g)].map(
          (match) => match[0],
        ),
      ),
    ];
    expect(named.length).toBeGreaterThan(10);
    const unread = named.filter(
      (name) => !new RegExp(`\\b${name}\\b`).test(corpus),
    );
    expect(unread).toEqual([]);
  });

  test("names each command by the bin its package.json declares", async () => {
    const bins: Record<string, string> = {
      "packages/sdk/package.json": "ryu",
      "packages/services-cli/package.json": "ryu-services",
      "apps/cli/package.json": "ryu-cli",
      "apps/mcp/package.json": "ryu-mcp",
      "packages/create-ryu-app/package.json": "create-ryu-app",
    };
    for (const [file, bin] of Object.entries(bins)) {
      const manifest = (await Bun.file(join(repoRoot, file)).json()) as {
        bin?: Record<string, string>;
      };
      expect({ file, bin: Object.hasOwn(manifest.bin ?? {}, bin) }).toEqual({
        file,
        bin: true,
      });
      expect(choose).toContain(`\`${bin}\``);
    }
  });

  test("states the unpublished packages as unpublished", async () => {
    expect(services.NPM_PUBLISHED_VERSION).toBeNull();
    for (const name of ["@ryuhq/services", "@ryuhq/services-cli"]) {
      const row = choose
        .split("\n")
        .filter((line) => line.startsWith(`| \`${name}\``))
        .some((line) => line.trim().endsWith("| Not published. |"));
      expect({ name, row }).toEqual({
        name,
        row: true,
      });
    }
    expect(callouts(choose)).toContain(INSTALL_CALLOUT);
    expect(callouts(choose)).toContain(PYTHON_CALLOUT);
  });

  test("the SDK overviews link to the page", async () => {
    const develop = await readFile(
      join(repoRoot, "apps/fumadocs/content/docs/extend/develop/sdk/index.mdx"),
      "utf8",
    );
    const developLanding = await readFile(
      join(repoRoot, "apps/fumadocs/content/docs/extend/develop/index.mdx"),
      "utf8",
    );
    for (const content of [
      page("index.mdx").content,
      develop,
      developLanding,
    ]) {
      expect(content).toContain("/docs/standalone/sdk/choose-an-sdk");
    }
  });

  /** The page's `## Environment variables` section. */
  const envSection =
    choose.split("## Environment variables")[1]?.split("\n## ")[0] ?? "";

  /** The environment-table row that starts with `| <cell>`. */
  function envRow(cell: string): string {
    const rows = envSection
      .split("\n")
      .filter((line) => line.startsWith(`| ${cell} |`));
    expect({ cell, rows: rows.length }).toEqual({ cell, rows: 1 });
    return rows[0] ?? "";
  }

  /** `RYU_*` names a source file reads, as `process.env.X` or a `"X"` literal. */
  async function readsOf(file: string): Promise<string[]> {
    const text = await readFile(join(repoRoot, file), "utf8");
    const names = new Set<string>();
    for (const match of text.matchAll(
      /process\.env\.(RYU_[A-Z0-9_]+)|["'](RYU_[A-Z0-9_]+)["']/g,
    )) {
      names.add(match[1] ?? match[2] ?? "");
    }
    return [...names];
  }

  test("each environment row names every variable its source reads", async () => {
    const rows: [string, string[]][] = [
      ["`ryu-mcp`", ["apps/mcp/src/target.ts", "apps/mcp/src/auth.ts"]],
      ["`ryu-cli`", ["apps/cli/src/core/target.ts"]],
      [
        "The `box-tunnel` command in `@ryuhq/client`",
        ["packages/client/src/box-tunnel.ts"],
      ],
      [
        "`resolveLocalNodeToken` in `@ryuhq/core-client`",
        ["packages/core-client/src/node-token.ts"],
      ],
      [
        "`createRyuServer` in `@ryuhq/sdk`",
        ["packages/sdk/src/server/server.ts"],
      ],
    ];
    const missing: string[] = [];
    for (const [cell, files] of rows) {
      const row = envRow(cell);
      for (const file of files) {
        for (const name of await readsOf(file)) {
          if (!row.includes(`\`${name}\``)) {
            missing.push(`${cell}: ${name} (${file})`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test("ryu-mcp inherits RYU_TOKEN through core-client, ryu-cli does not", async () => {
    expect(await readsOf("packages/core-client/src/node-token.ts")).toEqual(
      expect.arrayContaining(["RYU_CORE_TOKEN", "RYU_TOKEN"]),
    );
    const mcpTarget = await readFile(
      join(repoRoot, "apps/mcp/src/target.ts"),
      "utf8",
    );
    expect(mcpTarget).toContain("resolveLocalNodeToken(url)");
    expect(envRow("`ryu-mcp`")).toContain("`RYU_TOKEN`");
    expect(await readsOf("apps/cli/src/core/target.ts")).not.toContain(
      "RYU_TOKEN",
    );
    expect(envRow("`ryu-cli`")).not.toContain("`RYU_TOKEN`");
    expect(choose).toContain("`ryu-cli` alone reads only\n`RYU_CORE_TOKEN`");
  });

  test("both SDKs read RYU_CORE_TOKEN, then RYU_TOKEN, as the paragraph says", async () => {
    const ts = await readFile(
      join(repoRoot, "packages/sdk/src/core-env.ts"),
      "utf8",
    );
    expect(ts).toContain(
      'CORE_TOKEN_ENV_VARS = ["RYU_CORE_TOKEN", "RYU_TOKEN"]',
    );
    const py = await readFile(
      join(repoRoot, "bindings/python/ryu_sdk/gateway.py"),
      "utf8",
    );
    expect(py).toContain(
      'ENV_CORE_TOKENS = ("RYU_CORE_TOKEN", ENV_CORE_TOKEN)',
    );
    expect(py).toContain('ENV_CORE_TOKEN = "RYU_TOKEN"');
    expect(choose).toContain(
      "Both\nSDKs, `ryu-mcp`, `ryu install`, and eval uploads read it first",
    );
  });

  test("no environment row claims a package reads nothing when its bin does", () => {
    expect(envSection.length).toBeGreaterThan(0);
    const noneRows = envSection
      .split("\n")
      .filter((line) => /^\| .+ \| none \|/.test(line));
    expect(noneRows).toEqual([
      "| `@ryuhq/client` and `@ryuhq/core-client` library clients | none | Each client takes its URL and token as options. |",
    ]);
  });

  /**
   * What the registries hold, checked against the published tarballs. Bump with a release,
   * and the status rows below must follow.
   */
  const PUBLISHED = {
    npm: {
      "@ryuhq/sdk": "0.3.0",
      "@ryuhq/client": "0.3.0",
      "@ryuhq/core-client": "0.3.0",
      "create-ryu-app": "0.3.0",
    },
    /** `ryu` commands in the published `@ryuhq/sdk` tarball's bin. */
    sdkCommands: ["pack", "publish", "github-publish", "agent-plugin", "dev"],
    /** `ryu-sdk` on PyPI: pypi.org/pypi/ryu-sdk/json is a 404. */
    pypi: null as string | null,
  };

  function statusRow(name: string): string {
    const rows = choose
      .split("\n")
      .filter(
        (line) => line.startsWith(`| \`${name}\``) && line.includes("| npm |"),
      );
    expect({ name, rows: rows.length }).toEqual({ name, rows: 1 });
    return rows[0] ?? "";
  }

  test("npm status rows match the published versions", () => {
    for (const [name, version] of Object.entries(PUBLISHED.npm)) {
      expect(statusRow(name)).toContain(`| npm | ${version} is published.`);
    }
  });

  test("the @ryuhq/sdk row names every ryu command missing from the release", async () => {
    const cli = await readFile(
      join(repoRoot, "packages/sdk/src/cli.ts"),
      "utf8",
    );
    const commands = new Set(
      [...cli.matchAll(/command === "([a-z-]+)"/g)].map((match) => match[1]),
    );
    // `package` only redirects to `ryu-cli package`.
    commands.delete("package");
    const newer = [...commands].filter(
      (command) => command && !PUBLISHED.sdkCommands.includes(command),
    );
    expect(newer.length).toBeGreaterThan(0);
    const row = statusRow("@ryuhq/sdk");
    expect(newer.filter((command) => !row.includes(`${command}\``))).toEqual(
      [],
    );
    expect(row).toContain("`dev --studio`");
  });

  test("the @ryuhq/client row names the clients missing from the release", () => {
    const row = statusRow("@ryuhq/client");
    for (const client of ["Managed Agents", "Messaging", "Notify", "Box"]) {
      expect(row).toContain(client);
    }
  });

  test("the ryu-sdk row is unpublished while PyPI has no release", async () => {
    const pyproject = await readFile(
      join(repoRoot, "bindings/python/pyproject.toml"),
      "utf8",
    );
    expect(pyproject).toMatch(/^name = "ryu-sdk"$/m);
    expect(PUBLISHED.pypi).toBeNull();
    const row = choose
      .split("\n")
      .find((line) => line.startsWith("| `ryu-sdk`"));
    expect(row?.trim().endsWith("| PyPI | Not published. |")).toBe(true);
  });

  test("warns that SDK tools calling services need an in-process agent", () => {
    expect(choose).toContain(
      "It does not work in a tool\nyou pack into a plugin with `ryu pack`",
    );
  });
});
