import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { commandLines } from "./standalone-sdk-docs-checks";
import {
  cliSrc,
  docsRoot,
  fences,
  INSTALL_CALLOUT,
  page,
  pages,
  services,
  shellCommands,
} from "./standalone-sdk-docs-fixtures";
import { printCalls, SERVICE_PAGES } from "./standalone-sdk-docs-samples";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("standalone SDK docs guard: newcomer walkthroughs", () => {
  test("the CLI page quotes the npm-status note that --version and doctor print", async () => {
    const version = (await import(join(cliSrc, "version.ts"))) as {
      NPM_INSTALL_CALLOUT: string;
      NPM_STATUS_CLAUSE: string;
      NPM_STATUS_NOTE: string | null;
      npmStatusNote: (origin: {
        bundledWith?: string;
        publishedVersion: string | null;
      }) => string | null;
    };
    expect(version.NPM_INSTALL_CALLOUT).toBe(INSTALL_CALLOUT);
    expect(services.NPM_PUBLISHED_VERSION).toBeNull();
    expect(version.NPM_STATUS_NOTE).not.toBeNull();
    const cliPage = page("cli.mdx").content;
    // The workspace-build note, and the ryu-cli one (whose version varies).
    expect(cliPage).toContain(`note: ${version.NPM_STATUS_NOTE}`);
    const bundled = version.npmStatusNote({
      bundledWith: "ryu-cli <version>",
      publishedVersion: null,
    });
    expect(cliPage).toContain(`note: ${bundled}`);
    // The page must not point readers at the private monorepo layout.
    expect(cliPage).not.toContain("packages/services-cli");
    expect(cliPage).toContain("calls itself a workspace build");
    // The callout begins with the clause the CLI prints.
    expect(
      INSTALL_CALLOUT.startsWith(version.NPM_STATUS_CLAUSE.slice(0, -1)),
    ).toBe(true);
    expect(cliPage).toContain("`npmNote`");
  });

  test("no page claims a released Ryu already has `ryu-cli services`", async () => {
    // v0.4.0 has no apps/cli/src/cli/services.ts, so `ryu-cli services` cannot be
    // installed until the next Ryu release. Drop this once that release ships.
    const releaseNotes = [
      "`ryu-cli services` arrives in a Ryu release after 0.4.0",
      "whose `services` command arrives in a Ryu release after 0.4.0",
    ];
    const unavailable =
      "neither the CLI nor the MCP server can be installed outside the Ryu repository";
    const hostPages = new Set([
      ...SERVICE_PAGES.map(({ file }) => file),
      "agent-tools.mdx",
      "cli.mdx",
      "mcp.mdx",
    ]);
    const reference = await readFile(
      join(docsRoot, "surfaces/cli/reference.mdx"),
      "utf8",
    );
    const problems: string[] = [];
    for (const entry of [
      ...pages,
      { file: "surfaces/cli/reference.mdx", content: reference },
    ]) {
      const prose = entry.content.replace(/\s+/g, " ");
      if (/ryu-cli`?,? (?:which )?ships with Ryu/i.test(prose)) {
        problems.push(`${entry.file}: says ryu-cli ships with Ryu`);
      }
      if (/ryu-cli \d+\.\d+\.\d+/.test(prose)) {
        problems.push(`${entry.file}: names a released ryu-cli version`);
      }
      const namesHost = /`ryu-cli services|"command": "ryu-cli"/.test(prose);
      if (!(hostPages.has(entry.file) && namesHost)) {
        continue;
      }
      if (!releaseNotes.some((note) => prose.includes(note))) {
        problems.push(
          `${entry.file}: ryu-cli services without the release note`,
        );
      }
      if (!prose.includes(unavailable)) {
        problems.push(
          `${entry.file}: ryu-cli services without the install note`,
        );
      }
    }
    expect(reference).toContain(
      "`ryu-cli services …`, in a Ryu release after 0.4.0",
    );
    expect(problems).toEqual([]);
  });

  test("CLI and MCP samples say how to run them before @ryuhq/services-cli is on npm", () => {
    const cliPage = page("cli.mdx").content;
    expect(cliPage).not.toMatch(/use the curl examples/i);
    expect(cliPage).toContain("## Run it from ryu-cli");
    expect(cliPage).toContain('"command": "ryu-cli"');
    expect(page("mcp.mdx").content).toContain('"command": "ryu-cli"');
    const missing = SERVICE_PAGES.flatMap(({ file }) => {
      const content = page(file).content;
      const problems: string[] = [];
      if (
        commandLines(content).length > 0 &&
        !content.includes("/docs/standalone/sdk/cli#run-it-from-ryu-cli")
      ) {
        problems.push(
          `${file}: ryu-services commands without the ryu-cli note`,
        );
      }
      if (
        /"args": \["mcp"/.test(content) &&
        !content.includes('"command": "ryu-cli"')
      ) {
        problems.push(`${file}: MCP config without the ryu-cli form`);
      }
      return problems;
    });
    expect(missing).toEqual([]);
  });

  test("curl samples honour the configured service URL", () => {
    const hardcoded = pages.flatMap((entry) =>
      shellCommands(entry.content)
        .flatMap((body) => body.split("\n"))
        .filter((line) =>
          /curl\b.*"https:\/\/(?:box|notify)\.ryuhq\.com\//.test(line),
        )
        .map((line) => `${entry.file}: ${line.trim()}`),
    );
    expect(hardcoded).toEqual([]);
  });

  test("hosted x-api-key curls send X-Ryu-Organization for a personal key", () => {
    const findings = pages.flatMap((entry) =>
      shellCommands(entry.content)
        .flatMap((body) => body.split(/\n(?=curl\b)/))
        .filter(
          (command) =>
            /x-api-key: \$RYU_API_KEY/.test(command) &&
            !/X-Ryu-Organization/.test(command),
        )
        .map((command) => `${entry.file}: ${command.trim().slice(0, 80)}`),
    );
    expect(findings).toEqual([]);
    expect(page("mail-errors.mdx").content).toContain(
      "`400 organization_required`",
    );
  });

  test("Box samples run commands the default ubuntu:24.04 image has", () => {
    const box = page("box.mdx").content;
    const runtimeCommands = fences(box).filter((fence) =>
      /["'](?:node|npm|npx|python3?|pip)["']|--\s+(?:node|npm)\b/.test(
        fence.body,
      ),
    );
    expect(runtimeCommands.map((fence) => fence.line)).toEqual([]);
    expect(box).toContain("ubuntu:24.04");
  });

  test("object-mode create samples print the error instead of nothing", () => {
    const checks: [string, RegExp, RegExp][] = [
      ["box.mdx", /if \(box\.data\)/, /box\.error\.code/],
      ["box.mdx", /if box\.data:/, /box\.error\.code/],
      ["sites.mdx", /if \(site\)/, /createError\.code/],
      ["sites.mdx", /if site:/, /create_error\.code/],
    ];
    const findings = checks.flatMap(([file, branch, report]) =>
      fences(page(file).content)
        .filter((fence) => branch.test(fence.body) && !report.test(fence.body))
        .map((fence) => `${file}:${fence.line}`),
    );
    expect(findings).toEqual([]);
  });

  test("samples that create named resources do not collide with earlier samples", () => {
    const box = page("box.mdx").content;
    // The curl step creates build-runner; only the replay sample may repeat it,
    // with the curl step's key and body.
    const creates = [
      ...box.matchAll(/create\(\s*\{\s*"?name"?:\s*"([^"]+)"[^)]*\)/g),
    ].map((match) => match[1]);
    const repeated = creates.filter((name) => name === "build-runner");
    expect(repeated.length).toBe(2);
    expect(box).toMatch(
      /with\(\{ idempotencyKey: "build-runner-1" \}\)\s*\.create\(\{ name: "build-runner", size: "small" \}\)/,
    );
    const sites = page("sites.mdx").content;
    expect(sites).not.toMatch(/projects\.create\([^)]*"launch-notes"/);
    // The curl step stays on notify.mdx; the SDK retries moved to
    // notify-errors.mdx and the CLI to notify-cli-mcp.mdx.
    const notify = page("notify.mdx").content;
    const curlKeys = new Set(
      [...notify.matchAll(/Idempotency-Key: ([\w-]+)/g)].map((m) => m[1]),
    );
    const notifyCli = page("notify-cli-mcp.mdx").content;
    const cliKeys = [...notifyCli.matchAll(/--idempotency-key ([\w-]+)/g)].map(
      (m) => m[1],
    );
    const notifyErrors = page("notify-errors.mdx").content;
    const boundKeys = [
      ...notifyErrors.matchAll(/idempotency_?[kK]ey[=:]\s*"([\w-]+)"/g),
    ].map((m) => m[1]);
    expect(boundKeys.length).toBeGreaterThan(0);
    expect(
      [...boundKeys, ...cliKeys].filter((key) => curlKeys.has(key)),
    ).toEqual([]);
  });

  // error.message already ends with " Hint: <hint>" (audit 3), so the first
  // call prints the message and does not print error.hint beside it twice.
  test("first-call error branches print the message, which carries the hint", () => {
    for (const file of ["index.mdx", "notify.mdx", "box.mdx", "sites.mdx"]) {
      const firstTabs = fences(page(file).content).filter((fence) =>
        ["ts", "python"].includes(fence.lang),
      );
      const firstNode = firstTabs.find((fence) =>
        /console\.error\(/.test(fence.body),
      );
      const firstPython = firstTabs.find(
        (fence) =>
          fence.lang === "python" && /print\(\w*error\.code/.test(fence.body),
      );
      for (const [lang, fence] of [
        ["node", firstNode],
        ["python", firstPython],
      ] as const) {
        const errorPrints = printCalls(fence?.body ?? "").filter((call) =>
          /\berror\b/.test(call),
        );
        expect({
          file,
          lang,
          printsMessage: errorPrints.some((call) => /\.message\b/.test(call)),
          printsHint: errorPrints.some((call) => /\.hint\b/.test(call)),
        }).toEqual({ file, lang, printsMessage: true, printsHint: false });
      }
    }
  });

  test("Sites says what a standalone visitor needs to open a deployed Site", () => {
    const sites = page("sites.mdx").content;
    expect(sites).not.toContain("only its owner can open the URL");
    expect(sites).toContain("RYU_SITES_PUBLIC=1");
    expect(sites).toContain("## Open the Site to visitors");
    expect(sites).toContain("/settings");
    expect(sites).toContain("last entry in `versions`");
  });

  test("Box does not send self-hosters to an unpublished service", async () => {
    const box = page("box.mdx").content;
    expect(box).not.toContain("start-a-local-box-service");
    const service = await readFile(
      join(docsRoot, "standalone/box.mdx"),
      "utf8",
    );
    expect(service).not.toMatch(/bun run apps\/box/);
    expect(service).toContain(
      "The self-hosted Box service is not yet published",
    );
  });

  test("Passport GitHub fetch samples send a User-Agent", () => {
    const passport = page("passport.mdx").content;
    const fetches = fences(passport).filter((fence) =>
      /api\.github\.com\/user/.test(fence.body),
    );
    expect(fetches.length).toBeGreaterThanOrEqual(3);
    const missing = fetches
      .filter((fence) => !/User-Agent/.test(fence.body))
      .map((fence) => fence.line);
    expect(missing).toEqual([]);
  });
});
