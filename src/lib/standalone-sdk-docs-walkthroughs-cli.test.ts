import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  callouts,
  docsRoot,
  fences,
  page,
  pages,
  repoRoot,
} from "./standalone-sdk-docs-fixtures";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("standalone SDK docs guard: newcomer walkthroughs", () => {
  test("the Notify rate-limit callout says a blocked address refuses the correct key", () => {
    const notify = callouts(page("notify-errors.mdx").content).join("\n");
    expect(notify).not.toContain("That answer means the key is wrong");
    expect(notify).toContain("a request with the correct key");
    expect(notify).toContain("The SDK does not wait out a block");
  });

  test("the overview's async sample bounds its wait on a live stream", () => {
    const index = page("index.mdx").content;
    expect(index).not.toContain('topic="deploys"');
    expect(index).toContain("asyncio.wait_for");
    expect(index).toContain(
      "yields only the events published after it connects",
    );
  });

  test("FastAPI webhook samples answer a bad signature with 401", () => {
    const findings = pages.flatMap((entry) =>
      fences(entry.content)
        .filter(
          (fence) =>
            fence.lang === "python" &&
            /from fastapi import/.test(fence.body) &&
            /verify_\w*webhook\(/.test(fence.body),
        )
        .filter(
          (fence) =>
            !/except RyuWebhookVerificationError/.test(fence.body) ||
            /-> dict:/.test(fence.body),
        )
        .map((fence) => `${entry.file}:${fence.line}`),
    );
    expect(findings).toEqual([]);
    expect(page("webhooks.mdx").content).toContain(
      "pip install fastapi uvicorn",
    );
  });

  test("the agent-tools page names the Gateway agent.generate() needs", () => {
    const agentTools = page("agent-tools.mdx").content;
    expect(agentTools).toContain("RYU_GATEWAY_URL");
    expect(agentTools).toContain("RYU_GATEWAY_TOKEN");
  });

  test("the agent-tools page quotes the Gateway errors both Agent SDKs raise", async () => {
    const agentTools = page("agent-tools.mdx").content;
    const [typescript, ...python] = await Promise.all(
      [
        "packages/sdk/src/agent/model-call.ts",
        "bindings/python/ryu_sdk/agent.py",
        "bindings/python/ryu_sdk/model_call.py",
      ].map((file) => readFile(join(repoRoot, file), "utf8")),
    );
    // Each SDK as a whole: Python splits the wording across two modules.
    const sources = [typescript ?? "", python.join("\n")];
    for (const phrase of [
      "could not reach the Ryu Gateway at ",
      " did not respond in time",
      "the configured gateway URL",
      "[ryu-sdk] gateway ",
      "; check RYU_GATEWAY_TOKEN (or ",
    ]) {
      for (const source of sources) {
        expect(source).toContain(phrase);
      }
    }
    for (const phrase of [
      "could not reach the Ryu Gateway at ",
      " did not respond in time",
      "`[ryu-sdk] gateway <status> at <origin>`",
      "RYU_GATEWAY_TOKEN",
    ]) {
      expect(agentTools).toContain(phrase);
    }
  });

  test("Managed Agents shows how to get the agent and environment ids", () => {
    const managed = page("managed-agents.mdx").content;
    expect(managed).toContain("ryu.managedAgents.agents.create(");
    expect(managed).toContain("ryu.managedAgents.environments.create(");
    expect(managed).toContain("ryu.managed_agents.agents.create(");
    expect(managed).toContain("/docs/standalone/managed-agents-api#examples");
    expect(managed).toContain("| `ryu.managedAgents.sessions` |");
  });

  test("pages state current facts, not promised availability", () => {
    expect(page("connect.mdx").content).not.toMatch(/once available/i);
  });

  test("hand-written prose does not offer an unpublished self-hosted Box", async () => {
    // The callout and env rows quote packages/services/src/config.ts and are
    // pinned to it above; this covers the prose written on these pages.
    const box = page("box.mdx").content;
    expect(box).toContain("the self-hosted Box service is not yet published");
    expect(box).not.toContain("self-host it on your own capacity");
    expect(box).not.toContain("or you run your own Box");
    expect(page("index.mdx").content).not.toContain(
      "self-host it on your own capacity",
    );
    expect(page("mcp.mdx").content).not.toMatch(/run your own Box/);
    const overview = await readFile(
      join(docsRoot, "standalone/index.mdx"),
      "utf8",
    );
    const boxRow = overview
      .split("\n")
      .find((line) => line.startsWith("| [Box](/docs/standalone/box)"));
    expect(boxRow).toContain("is not yet published");
    expect(boxRow).not.toMatch(/Self-host on your own capacity/);
    const service = await readFile(
      join(docsRoot, "standalone/box.mdx"),
      "utf8",
    );
    expect(service).not.toContain("bun run apps/box/src/index.ts");
  });

  test("the Sites CLI sample does not reuse the curl step's slug", () => {
    const sites = page("sites-cli-mcp.mdx").content;
    const cli = sites.slice(sites.indexOf("## CLI"));
    expect(cli).toContain("--slug launch-notes-cli");
    expect(cli).not.toMatch(/--slug launch-notes\s/);
    expect(cli).toContain("--project launch-notes-cli");
  });

  test("the Notify CLI section describes the events list output shape", () => {
    const notify = page("notify-cli-mcp.mdx").content;
    const cli = notify.slice(
      notify.indexOf("## CLI"),
      notify.indexOf("## MCP"),
    );
    expect(cli).toContain("`events list` prints one JSON line per event");
    expect(cli).toMatch(
      /`events get` prints the\s+one event in the same shape/,
    );
    expect(cli).toContain("`--before`");
    expect(cli).toContain("`nextCursor`");
    expect(cli).toContain("`{ data, meta }`");
    expect(cli).toContain("/docs/standalone/sdk/cli#list-output");
  });

  test("the CLI page states one list output convention for every service", () => {
    const content = page("cli.mdx").content;
    const section = content.slice(
      content.indexOf("## List output"),
      content.indexOf("## Run it from ryu-cli"),
    );
    expect(section).toContain("One JSON line per item");
    expect(section).toContain("`{ data, meta }`");
    expect(section).toContain("NDJSON");
    expect(section).toContain("stderr");
    // No list command is described as an exception any more.
    expect(content).not.toContain("Unlike the other one-page list commands");
    // Each per-service CLI section with a list command points at it.
    for (const file of [
      "box-cli-mcp.mdx",
      "mail-cli-mcp.mdx",
      "messaging-cli-mcp.mdx",
      "notify-cli-mcp.mdx",
      "sites-cli-mcp.mdx",
      "passport.mdx",
      "managed-agents-cli-mcp.mdx",
    ]) {
      const body = page(file).content;
      const cli = body.slice(body.indexOf("## CLI"), body.indexOf("## MCP"));
      expect({ file, linked: cli.includes("cli#list-output") }).toEqual({
        file,
        linked: true,
      });
    }
  });

  test("the hosted API change log is published and linked", async () => {
    const meta = (await Bun.file(
      join(docsRoot, "reference/api/meta.json"),
    ).json()) as { pages: string[] };
    expect(meta.pages).toContain("changelog");
    const versioning = await readFile(
      join(docsRoot, "reference/api/versioning.mdx"),
      "utf8",
    );
    expect(versioning).toContain("/docs/reference/api/changelog");
    // The change log is split by service group; each link sits on the page
    // that now holds its entry.
    const changelogLinks: Record<string, readonly string[]> = {
      "changelog.mdx": [
        "/docs/reference/api/rate-limits#api-key-limits",
        "/docs/reference/api/idempotency",
      ],
      "changelog-mail.mdx": [
        "/docs/standalone/mail-api#hosted-mail-api-keys",
        "/docs/standalone/sdk/mcp#hosted-mail-tools",
      ],
      "changelog-services.mdx": [
        "/docs/standalone/gateway-api#errors-and-request-ids",
      ],
    };
    for (const [file, anchors] of Object.entries(changelogLinks)) {
      const changelog = await readFile(
        join(docsRoot, "reference/api", file),
        "utf8",
      );
      for (const anchor of anchors) {
        expect({ file, anchor, ok: changelog.includes(anchor) }).toEqual({
          file,
          anchor,
          ok: true,
        });
      }
    }
  });
});
