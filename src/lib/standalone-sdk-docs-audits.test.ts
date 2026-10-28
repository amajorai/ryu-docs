import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fences,
  page,
  pages,
  prose,
  repoRoot,
  sdkRoot,
} from "./standalone-sdk-docs-fixtures";
import {
  printCalls,
  printsMessageAndHint,
  underscoreConflict,
  WEBHOOK_VERIFY_CALL,
} from "./standalone-sdk-docs-samples";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("hosted MCP Mail tools", () => {
  test("sdk/mcp.mdx lists mail_list_organizations in the hosted Mail tools", async () => {
    const mcp = await readFile(join(sdkRoot, "mcp-hosted-mail.mdx"), "utf8");
    const hosted = mcp.slice(
      mcp.indexOf("## Tools"),
      mcp.indexOf("## Before the first call"),
    );
    expect(hosted).toContain("| `mail_list_organizations` |");
  });
});

describe("audit-2 sample pins", () => {
  test("pages with Python tabs name the Python client in their first-call heading and description", () => {
    for (const entry of pages) {
      if (
        entry.file.startsWith("reference/") ||
        !entry.content.includes('```python tab="Python"')
      ) {
        continue;
      }
      expect({
        file: entry.file,
        nodeOnly: entry.content.includes("## First call with Node"),
      }).toEqual({ file: entry.file, nodeOnly: false });
      if (entry.content.includes("## First call with the SDK")) {
        const description =
          /^description: "(.*)"$/m.exec(entry.content)?.[1] ?? "";
        expect({
          file: entry.file,
          python: description.includes("ryu_sdk.services"),
        }).toEqual({ file: entry.file, python: true });
      }
    }
  });

  test("the edge Worker matches Notify's signed timestamps", () => {
    const edge = page("frameworks/edge.mdx").content;
    expect(edge).not.toContain("carries no timestamp");
    expect(edge).not.toContain("covers only the body");
    // requireTimestamp is the default for destinations, so the sample sets nothing.
    expect(edge).not.toContain("requireTimestamp");
    expect(edge).toContain("allowBodyOnlySignature: true");
    expect(edge).toContain("replayProtected: true");
  });

  test("the Hono app reads configuration with env(c) on every runtime", () => {
    const code = fences(page("frameworks/hono.mdx").content)
      .map((fence) => fence.body)
      .join("\n");
    expect(code).toContain('import { env } from "hono/adapter";');
    // c.env is the server adapter on Node.js, Bun, and Deno, not the environment.
    expect(code).not.toMatch(/env: c\.env\b|\bc\.env\.[A-Z]/);
    // hono/adapter's env(c) returns {} on Fastly and unknown runtimes, so the
    // page names the runtimes it covers instead of claiming all of them.
    const prose = page("frameworks/hono.mdx").content;
    expect(prose).not.toContain("Workers-style runtimes");
    expect(prose).not.toContain("runs unchanged on all of");
    expect(prose).toContain("Fastly Compute");
  });

  test("the Next.js server action strips the operator hint", () => {
    const nextjs = page("frameworks/nextjs.mdx").content;
    expect(nextjs).not.toContain("safe to show");
    expect(nextjs).not.toContain("message: error.message");
    expect(nextjs).toContain("messageWithoutHint(error)");
  });

  test("Sites settings samples check the result and keep invited under OpenID Connect", () => {
    const sites = page("sites.mdx").content;
    const code = fences(sites)
      .map((fence) => fence.body)
      .join("\n");
    expect(code).not.toMatch(/^await ryu\.sites\.projects\.updateSettings\(/m);
    expect(code).not.toMatch(/^ryu\.sites\.projects\.update_settings\(/m);
    expect(code).not.toContain("--audience invited");
    const oidc =
      prose(sites)
        .split("\n- ")
        .find((item) => item.startsWith("`invited`, `workspace`")) ?? "";
    expect(oidc).toContain('audience: "invited"');
  });

  test("the TypeScript agent-tools options sample warns that every named service must be configured", () => {
    const content = page("agent-tools.mdx").content;
    const sample = content.indexOf('  services: ["mail", "notify"],');
    const before = content.slice(Math.max(0, sample - 600), sample);
    expect(sample).toBeGreaterThan(0);
    expect(before).toContain("RyuConfigurationError");
  });

  test("Python object-mode samples narrow data and meta before reading them", () => {
    const findings: string[] = [];
    for (const entry of pages) {
      for (const fence of fences(entry.content)) {
        if (fence.lang !== "python") {
          continue;
        }
        // `if error: ... else: data[...]` leaves data typed `X | None` under mypy --strict.
        if (
          /^if \w*error:\n(?: {4}.*\n)+else:\n {4}.*\b(?:data|meta)\b/m.test(
            `${fence.body}\n`,
          )
        ) {
          findings.push(`${entry.file}:${fence.line}`);
        }
      }
    }
    expect(findings).toEqual([]);
  });
});

describe("audit-3 sample pins", () => {
  test("no sample prints message beside hint, since message already ends with the hint", () => {
    const findings: string[] = [];
    for (const entry of pages) {
      for (const fence of fences(entry.content)) {
        for (const call of printCalls(fence.body)) {
          if (printsMessageAndHint(call)) {
            findings.push(`${entry.file}:${fence.line}: ${call}`);
          }
        }
      }
    }
    expect(findings).toEqual([]);
  });

  // Mail, Messaging, and Notify destinations treat any non-2xx as a failed
  // attempt, so a 401 can be retried like a 500; never claim otherwise.
  test("no page claims a 401 stops the sender from retrying", () => {
    const findings: string[] = [];
    for (const entry of pages) {
      const flat = entry.content.replace(/\s+/g, " ");
      for (const match of flat.matchAll(/401[^.]{0,120}\bdoes not retry\b/g)) {
        findings.push(`${entry.file}: ${match[0]}`);
      }
    }
    expect(findings).toEqual([]);
  });

  test("every Node webhook verify sample answers a failed verification itself", () => {
    const findings: string[] = [];
    for (const entry of pages) {
      for (const fence of fences(entry.content)) {
        if (
          (fence.lang === "ts" || fence.lang === "typescript") &&
          WEBHOOK_VERIFY_CALL.test(fence.body) &&
          !fence.body.includes("RyuWebhookVerificationError") &&
          !fence.body.includes("onError")
        ) {
          findings.push(`${entry.file}:${fence.line}`);
        }
      }
    }
    expect(findings).toEqual([]);
  });

  test("Python samples never bind `_` to two different Result types", () => {
    const findings: string[] = [];
    for (const entry of pages) {
      for (const fence of fences(entry.content)) {
        const conflict =
          fence.lang === "python" ? underscoreConflict(fence.body) : null;
        if (conflict) {
          findings.push(`${entry.file}:${fence.line}: ${conflict}`);
        }
      }
    }
    expect(findings).toEqual([]);
  });

  test("Sites documents 400 incompatible for HTML without <!doctype html>", async () => {
    expect(page("sites-errors.mdx").content).toContain(
      "| `400 incompatible` |",
    );
    const sitesApi = await readFile(
      join(repoRoot, "apps/fumadocs/content/docs/standalone/sites-api.mdx"),
      "utf8",
    );
    expect(sitesApi).toContain("| `400` | `incompatible` |");
    const contracts = await readFile(
      join(repoRoot, "apps-store/sites/sidecar/src/contracts.ts"),
      "utf8",
    );
    expect(contracts).toContain('code: "incompatible"');
  });

  test("the Sites settings CLI tab does not use a slug created later on the page", () => {
    const sites = page("sites-cli-mcp.mdx").content;
    const create = sites.indexOf("--slug launch-notes-cli");
    const settings = sites.indexOf("sites settings launch-notes-cli");
    expect(create).toBeGreaterThan(-1);
    expect(settings).toBeGreaterThan(create);
  });

  test("agent-tools says how to install the packages its samples import", () => {
    const agentTools = page("agent-tools.mdx").content;
    expect(agentTools).toContain("bun add @ryuhq/sdk ai @ai-sdk/openai");
    expect(agentTools).toContain(
      "/docs/standalone/sdk/choose-an-sdk#what-you-can-install-today",
    );
    expect(agentTools).toContain("pip install openai");
  });

  test("the Python section names the object-mode annotation and request_approval's keys", () => {
    const index = page("index.mdx").content;
    expect(index).toContain('`Ryu[Literal["object"]]`');
    expect(index).toContain('`AsyncRyu[Literal["object"]]`');
    expect(index).toContain("`ObjectRyu` or `AsyncObjectRyu`");
    expect(index).toContain("from ryu_sdk.services import ObjectRyu, Ryu");
    // The aliases are subscripted generics, so the note says not to isinstance() them.
    expect(index).toContain(
      'The aliases are for annotations only: `isinstance(client, ObjectRyu)` raises\n`TypeError`, so check the mode at run time with `client.result == "object"`.',
    );
    expect(index).toContain(
      "`notify.request_approval()` returns snake_case keys",
    );
    expect(index).toContain("`timed_out`");
  });

  test("cli.mdx says messaging status runs without credentials", () => {
    const row =
      page("cli.mdx")
        .content.split("\n")
        .find((line) => line.startsWith("| `ryu-services messaging status`")) ??
      "";
    expect(row).toContain("Runs without credentials");
    expect(row).not.toContain("like every Messaging command");
  });

  test("CLI docs match webhooks verify, dry-run notes, and error output", () => {
    const flat = (file: string) => page(file).content.replace(/\s+/g, " ");
    const findings = pages
      .filter((entry) =>
        /\bMail or Notify delivery\b/.test(entry.content.replace(/\s+/g, " ")),
      )
      .map((entry) => entry.file);
    expect(findings).toEqual([]);
    const cli = flat("cli.mdx");
    expect(cli).toContain("a captured Mail, Notify or Messaging delivery");
    expect(cli).toContain("`requestId`, `retryAfter`");
    expect(cli).toContain("`$RYU_API_KEY` for Managed Agents and Messaging");
    expect(cli).toContain("`complete: false`");
    expect(cli).toContain(
      "prints only that lookup and a note that the send was left out",
    );
    const webhooks = flat("webhooks.mdx");
    expect(webhooks).toContain(
      "`headers.json` is a JSON object mapping each header name to its value.",
    );
    expect(webhooks).toContain(
      "ryu-services webhooks verify --service notify --allow-body-only-signature",
    );
    expect(flat("sites-cli-mcp.mdx")).toContain(
      "the Site's `id` from `sites_list` or `sites_get`, not its slug.",
    );
  });
});
