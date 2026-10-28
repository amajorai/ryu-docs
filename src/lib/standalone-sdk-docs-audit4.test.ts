import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PYTHON_CALLOUT } from "./standalone-sdk-docs-checks";
import {
  callouts,
  docsRoot,
  INSTALL_CALLOUT,
  page,
  pages,
  repoRoot,
} from "./standalone-sdk-docs-fixtures";
import {
  nodeTopLevelNames,
  ONE_SCRIPT_PAGES,
  pythonTripleNames,
  redeclared,
  tabBodies,
} from "./standalone-sdk-docs-samples";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("standalone SDK docs guard: audit 4", () => {
  test("every page with a Python tab carries the PyPI callout", () => {
    const missing = pages
      .filter((entry) => entry.content.includes('```python tab="Python"'))
      .filter((entry) => !callouts(entry.content).includes(PYTHON_CALLOUT))
      .map((entry) => entry.file);
    expect(missing).toEqual([]);
  });

  test("every first-call opening sentence names the Python client", () => {
    const missing = pages
      .filter((entry) => /^This page makes a first call/m.test(entry.content))
      .filter((entry) => {
        const opening =
          entry.content
            .slice(entry.content.search(/^This page makes a first call/m))
            .split("\n\n")[0] ?? "";
        return !opening.includes("`ryu_sdk.services` Python client");
      })
      .map((entry) => entry.file);
    expect(missing).toEqual([]);
  });

  test("Sites says standalone mode is not in the published ryu-sites mirror", async () => {
    const operator = await readFile(
      join(docsRoot, "standalone/sites.mdx"),
      "utf8",
    );
    const gate = "Standalone mode needs a ryu-sites release after 0.4.0";
    // Drop these once the ryu-sites mirror ships standalone-config.ts and the
    // clone steps start a standalone process.
    expect(callouts(operator).join("\n")).toContain(gate);
    expect(callouts(page("sites.mdx").content).join("\n")).toContain(gate);
    const api = await readFile(
      join(docsRoot, "standalone/sites-api.mdx"),
      "utf8",
    );
    const [firstCallout = ""] = callouts(api);
    expect(firstCallout).toContain(gate);
    expect(api.indexOf("<Callout")).toBeLessThan(
      api.indexOf("RYU_SITES_API_TOKEN"),
    );
    const start = operator.slice(
      operator.indexOf("## Start the standalone service"),
      operator.indexOf("## Operator configuration"),
    );
    expect(start).toContain(
      "git clone --depth 1 https://github.com/amajorai/ryu-sites.git",
    );
    expect(start).toContain(gate);
    // The sample data directory must be one a normal user can write.
    expect(start).not.toMatch(/^RYU_DIR=\/var\//m);
    expect(start).toContain('RYU_DIR="$HOME/.local/share/ryu-sites"');
  });

  test("Sites names the data folder resolvePluginDataDir gives it", async () => {
    const sidecar = await readFile(
      join(repoRoot, "apps-store/sites/sidecar/src/sidecar.ts"),
      "utf8",
    );
    expect(sidecar).toContain('resolvePluginDataDir(Bun.env, "@ryu/sites")');
    expect(sidecar).toContain('join(directory, "runtime.json")');
    expect(sidecar).toContain('join(directory, "sites.sqlite")');
    const runtime = await readFile(
      join(repoRoot, "packages/sidecar-runtime/src/index.ts"),
      "utf8",
    );
    expect(runtime).toContain('return pluginId.replaceAll("/", "+");');
    expect(runtime).toContain('"plugin-data",');
    expect(runtime).toContain("env.RYU_PLUGIN_DATA_DIR?.trim()");

    const operator = await readFile(
      join(docsRoot, "standalone/sites.mdx"),
      "utf8",
    );
    expect(operator).toContain("`plugin-data/@ryu+sites/` below it");
    expect(operator).toContain(
      "`$RYU_DIR/plugin-data/@ryu+sites/runtime.json`",
    );
    expect(operator).toContain("| `RYU_PLUGIN_DATA_DIR` |");
    expect(operator).not.toMatch(
      /`sites\/(?:runtime\.json|sites\.sqlite|visitor-quota\.key)`/,
    );
  });

  test("Connect opens its first calls with the Skill catalog", () => {
    const connect = page("connect.mdx").content;
    const curl = connect.slice(connect.indexOf("## First call with curl"));
    expect(curl.indexOf("/v1/skills")).toBeGreaterThan(-1);
    expect(curl.indexOf("/v1/skills")).toBeLessThan(
      curl.indexOf("/v1/tools/search"),
    );
    const [node = "", python = ""] = [
      tabBodies(connect, "Node")[0],
      tabBodies(connect, "Python")[0],
    ];
    expect(node.indexOf("connect.skills.list()")).toBeGreaterThan(-1);
    expect(node.indexOf("connect.skills.list()")).toBeLessThan(
      node.indexOf("connect.tools.search"),
    );
    expect(python.indexOf("connect.skills.list()")).toBeGreaterThan(-1);
    expect(python.indexOf("connect.skills.list()")).toBeLessThan(
      python.indexOf("connect.tools.search"),
    );
  });

  test("quickstarts that read as one script never redeclare a top-level name", () => {
    const findings = ONE_SCRIPT_PAGES.flatMap((file) => {
      const content = page(file).content;
      return [
        ...redeclared(tabBodies(content, "Node"), nodeTopLevelNames).map(
          (name) => `${file}: Node ${name}`,
        ),
        ...redeclared(tabBodies(content, "Python"), pythonTripleNames).map(
          (name) => `${file}: Python ${name}`,
        ),
      ];
    });
    expect(findings).toEqual([]);
  });

  test("Box shows a clean-up sample, Python option names, and the MCP URL", () => {
    const box = page("box.mdx").content;
    const boxErrors = page("box-errors.mdx").content;
    expect(box).toContain("## Clean up");
    const cleanUp = box.slice(
      box.indexOf("## Clean up"),
      box.indexOf("## Expected response"),
    );
    expect(cleanUp).toContain("await ryu.box.delete(listedBox.id)");
    expect(cleanUp).toContain('ryu.box.delete(listed_box["id"])');
    for (const name of [
      "build-runner",
      "files-demo",
      "stream-demo",
      "nightly-runner",
    ]) {
      expect(cleanUp).toContain(`"${name}"`);
      // The idempotency sample (nightly-runner) moved to box-errors.mdx.
      expect(`${box}\n${boxErrors}`).toContain(`name: "${name}"`);
    }
    expect(box).toContain("[Clean up](#clean-up)");
    const quota =
      boxErrors
        .split("\n")
        .find((line) => line.startsWith("| `429 quota_exceeded`")) ?? "";
    expect(quota).toContain("(/docs/standalone/sdk/box#clean-up)");

    expect(box).toContain("`ready_timeout=`, in seconds, in Python");
    expect(box).toContain("`poll_interval=`");
    expect(box).toContain("the same `idempotency_key=` to `ryu.box.run()`");
    expect(box).toContain("ryu.box.with_options(timeout=15 * 60).exec(box_id");
    expect(box).toContain("The Python client has no `signal`");

    const boxCli = page("box-cli-mcp.mdx").content;
    const mcp = boxCli.slice(boxCli.indexOf("## MCP"));
    expect(mcp).toContain('"RYU_BOX_URL": "<your Box URL>"');
  });

  test("Box tells Python readers to end a stream in a way that type-checks", async () => {
    const box = page("box.mdx").content;
    // views.py types sync `exec_stream` as `Generator[...]`, so `close()` and
    // `contextlib.closing()` pass mypy --strict (test_services_typing.py pins it).
    const views = await readFile(
      join(repoRoot, "bindings/python/ryu_sdk/services/views.py"),
      "utf8",
    );
    expect(views).toContain(
      "def exec_stream(self, box_id: str, input: Mapping[str, Any]) -> Generator[dict[str, Any], None, None]: ...",
    );
    expect(box).toContain(
      "call `close()` on\nit, or wrap it in `contextlib.closing()`",
    );
    expect(box).toContain(
      "breaking out of a `for` loop written directly over the\ncall (`for event in box.exec_stream(...)`)",
    );
  });

  test("the PyPI callout's 'either' always follows the npm callout", () => {
    const misplaced = pages
      .filter((entry) => callouts(entry.content).includes(PYTHON_CALLOUT))
      .filter((entry) => {
        const list = callouts(entry.content);
        const npm = list.indexOf(INSTALL_CALLOUT);
        return npm === -1 || npm > list.indexOf(PYTHON_CALLOUT);
      })
      .map((entry) => entry.file);
    expect(misplaced).toEqual([]);
  });

  test("a later Node tab reads `data` only after an earlier tab narrowed it at top level", () => {
    const findings = ONE_SCRIPT_PAGES.flatMap((file) => {
      const bodies = tabBodies(page(file).content, "Node");
      const declaring = bodies.findIndex((body) =>
        /^const \{ data(?:,|\s*\})/m.test(body),
      );
      if (declaring === -1) {
        return [];
      }
      const readLater = bodies
        .slice(declaring + 1)
        .some((body) => /^\S.*(?<![.\w])data\./m.test(body));
      const body = bodies[declaring] ?? "";
      const narrowsAtTopLevel =
        /^if \(error\) \{[\s\S]*?^ {2}throw error;\n\}/m.test(body) &&
        !/^\} else \{/m.test(body);
      return readLater && !narrowsAtTopLevel ? [file] : [];
    });
    expect(findings).toEqual([]);
  });

  test("Box samples write the id placeholder without a second bx_ prefix", () => {
    const box = page("box.mdx").content;
    expect(box).not.toContain("bx_<id>");
    expect(box).toContain("/v1/boxes/<box-id>/commands");
    const boxCli = page("box-cli-mcp.mdx").content;
    expect(boxCli).not.toContain("bx_<id>");
    expect(boxCli).toContain("ryu-services box exec <box-id> -- uname -a");
    expect(boxCli).toContain("such as `bx_0123...`");
  });

  test("the Box MCP table marks box_write_file destructive, as mcp.mdx does", () => {
    const row = (file: string) =>
      page(file)
        .content.split("\n")
        .find((line) => line.startsWith("| `box_write_file` |"));
    expect(row("box-cli-mcp.mdx")).toContain("Destructive.");
    expect(row("mcp.mdx")).toContain("Destructive.");
  });

  test("the Sites CLI block creates index.html before deploying it", () => {
    const sites = page("sites-cli-mcp.mdx").content;
    const cli = sites.slice(sites.indexOf("## CLI"));
    const create = cli.indexOf("> index.html");
    const deploy = cli.indexOf("ryu-services sites deploy ./index.html");
    expect(create).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(create);
  });
});
