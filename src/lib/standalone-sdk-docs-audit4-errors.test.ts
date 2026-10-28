import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DESTINATION_SAMPLE,
  fences,
  page,
  pages,
  repoRoot,
  services,
} from "./standalone-sdk-docs-fixtures";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("standalone SDK docs guard: audit 4", () => {
  test("the errors page names the module withRyuErrorFields imports from", () => {
    const content = page("errors.mdx").content;
    expect(content).toContain("Import it from `@ryuhq/services/errors`");
    expect(content).toContain("(Python `ryu_sdk.services.errors`)");
    // Keep the sentence true: drop it once the package roots re-export it.
    expect("withRyuErrorFields" in services).toBe(false);
  });

  test("the errors page says the Python transport hints leave out doctor", () => {
    const rows = page("errors.mdx")
      .content.split("\n")
      .filter(
        (line) =>
          line.startsWith("| `connection_error` |") ||
          line.startsWith("| `timeout` |"),
      );
    expect(rows).toHaveLength(2);
    const [connection, timeout] = rows;
    // bindings/python/ryu_sdk/services/config.py transport_failure_hint.
    expect(connection).toContain(
      "The Python hint names the URL variable only and leaves out the `ryu-services doctor` sentence.",
    );
    expect(timeout).toContain(
      "The Python hint suggests raising `timeout` and names the URL variable, and leaves out the `ryu-services doctor` sentence.",
    );
  });

  test("the webhooks page and framework guides answer webhook_payload_invalid with 422", () => {
    const content = page("webhooks.mdx").content;
    expect(content).toContain(
      "We recommend answering `webhook_payload_invalid` with `422`",
    );
    expect(content).toContain(
      "the Next.js and Hono framework guides, and `webhookHandler()` do this.",
    );
    expect(content).not.toContain("answer `401` to every verification error");
    // The snippets are byte-pinned to packages/services/test/frameworks.
    expect(page("frameworks/nextjs.mdx").content).toContain(
      'const status = error.code === "webhook_payload_invalid" ? 422 : 401;',
    );
    expect(page("frameworks/hono.mdx").content).toContain(
      'error.code === "webhook_payload_invalid"\n        ? 422',
    );
    for (const guide of ["frameworks/nextjs.mdx", "frameworks/hono.mdx"]) {
      expect(page(guide).content).not.toContain("answers that one with `422`");
    }
  });

  test("the Connect lane docs name the native tool settings first", () => {
    // Compatibility mode (RYU_CONNECT_CORE_URL / GATEWAY_URL) is single-tenant
    // and refuses native grants, so the docs lead with the native lane.
    const row = page("errors.mdx")
      .content.split("\n")
      .find((line) => line.startsWith("| Connect `503`"));
    expect(row).toBeDefined();
    // Same order as the SDK's CONNECT_UNCONFIGURED_LANES hint.
    const order = [
      "`RYU_CONNECT_MCP_SERVERS`",
      "`RYU_CONNECT_COMPOSIO_BINDINGS`",
      "`RYU_CONNECT_CORE_URL`",
      "`RYU_CONNECT_GATEWAY_URL`",
    ].map((name) => row?.indexOf(name) ?? -1);
    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(row).toContain("single-tenant compatibility-mode");
    const connect = page("connect.mdx").content.replace(/\s+/gu, " ");
    expect(connect).toContain(
      "native MCP registration (or Composio bindings) or a compatibility upstream",
    );
    expect(connect).not.toContain("tool upstream");
  });

  test("hand-written webhook samples answer webhook_payload_invalid with 422", () => {
    const samples = [
      "webhooks.mdx",
      "mail.mdx",
      "messaging.mdx",
      "notify.mdx",
    ].flatMap((file) =>
      fences(page(file).content)
        .filter(
          (fence) =>
            /RyuWebhookVerificationError/.test(fence.body) &&
            /\b(401|422)\b/.test(fence.body) &&
            // Notify destinations never raise webhook_payload_invalid; the
            // destination-sample test below covers them.
            !DESTINATION_SAMPLE.test(fence.body),
        )
        .map((fence) => ({ ...fence, line: `${file}:${fence.line}` })),
    );
    expect(samples.length).toBeGreaterThanOrEqual(9);
    const findings = samples
      .filter(
        (fence) =>
          !(
            /error\.code === "webhook_payload_invalid" \? 422 : 401/.test(
              fence.body,
            ) ||
            /422 if error\.code == "webhook_payload_invalid" else 401/.test(
              fence.body,
            )
          ),
      )
      .map((fence) => fence.line);
    expect(findings).toEqual([]);
  });

  test("the Sites page shows how to delete every Site its samples create", () => {
    const sites = page("sites.mdx").content;
    expect(sites).toContain("as in [Clean up](#clean-up)");
    const start = sites.indexOf("## Clean up");
    expect(start).toBeGreaterThan(-1);
    const end = sites.indexOf("\n## ", start + 1);
    const cleanUp = sites.slice(start, end === -1 ? undefined : end);
    // The CLI create sample moved to sites-cli-mcp.mdx; its Site is cleaned
    // up here too.
    const samples = `${sites}\n${page("sites-cli-mcp.mdx").content}`;
    const created = new Set(
      [
        ...samples.matchAll(
          /"slug":\s*"([a-z0-9-]+)"|slug: "([a-z0-9-]+)"|--slug ([a-z0-9-]+)/g,
        ),
      ].map((match) => match[1] ?? match[2] ?? match[3]),
    );
    expect(created.size).toBeGreaterThanOrEqual(3);
    for (const slug of created) {
      expect(cleanUp).toContain(`"${slug}"`);
    }
    expect(cleanUp).toContain("ryu.sites.projects.delete(listedSite.id, {");
    expect(cleanUp).toContain("expectedRevision: listedSite.revision");
    expect(cleanUp).toContain(
      '{"expectedRevision": listed_site["revision"], "slug": listed_site["slug"]}',
    );
    expect(cleanUp).toContain("-X DELETE");
  });

  test("the Connect tools.exec sample says composio ids are denied without a Composio binding", () => {
    const connect = page("connect.mdx").content;
    const sample = connect.indexOf('toolId: "composio.SLACK_SEND_MESSAGE"');
    const denied = connect.indexOf(
      "`composio.<SLUG>` ids are not granted, so the call answers\n`403 tool_denied`",
    );
    expect(sample).toBeGreaterThan(-1);
    expect(denied).toBeGreaterThan(sample);
  });

  test("Notify docs say only approval callbacks raise webhook_payload_invalid", () => {
    expect(page("notify.mdx").content).toContain(
      'Only approval callbacks (`kind: "callback"`) raise\n`webhook_payload_invalid`',
    );
    expect(page("webhooks.mdx").content).toContain(
      "A destination delivery therefore never\nraises `webhook_payload_invalid`",
    );
  });

  test("Notify destination samples never map webhook_payload_invalid to 422", () => {
    const findings: string[] = [];
    let destinationSamples = 0;
    for (const entry of pages) {
      for (const fence of fences(entry.content)) {
        // webhookHandler() answers failures itself; only hand-written
        // verify calls carry their own status mapping.
        const isNode =
          fence.body.includes('kind: "destination"') &&
          fence.body.includes("verifyNotifyWebhook(");
        const isPython =
          fence.body.includes('kind="destination"') &&
          fence.body.includes("verify_notify_webhook(");
        if (!(isNode || isPython)) {
          continue;
        }
        destinationSamples += 1;
        if (fence.body.includes("422")) {
          findings.push(
            `${entry.file}:${fence.line}: maps a destination delivery to 422`,
          );
        }
        const skipsNonEvents = isNode
          ? fence.body.includes("if (!delivery.eventId)")
          : fence.body.includes("if delivery.event_id is None:");
        if (!skipsNonEvents) {
          findings.push(
            `${entry.file}:${fence.line}: does not skip a delivery without an event id`,
          );
        }
      }
    }
    expect(destinationSamples).toBeGreaterThanOrEqual(4);
    expect(findings).toEqual([]);
  });

  test("the Connect composio denial is scoped to native grants", () => {
    expect(page("connect.mdx").content).toContain(
      "On a Connect with native grants, the sample's `composio.<SLUG>` id is\ngranted only when the Connect has a Composio binding for your tenant.",
    );
  });

  test("the Notify errors name the Python timeout keywords in seconds", () => {
    expect(page("notify-errors.mdx").content).toContain(
      "In Python they are the `timeout=` and `poll_interval=`\nkeyword arguments, in seconds",
    );
    expect(page("notify-errors.mdx").content).toContain(
      "Python raises `RyuInvalidRequestError`\n(`invalid_request`) before publishing when the input dict carries `timeoutMs`",
    );
  });

  test("the AsyncRyu sample gives Python 3.9 a way to close a stream", async () => {
    const pyproject = await readFile(
      join(repoRoot, "bindings/python/pyproject.toml"),
      "utf8",
    );
    const index = page("index.mdx").content;
    if (
      /requires-python = ">=3\.9"/.test(pyproject) &&
      index.includes("from contextlib import aclosing")
    ) {
      expect(index).toContain("On Python 3.9, which `ryu-sdk` also supports");
      expect(index).toContain("`finally: await stream.aclose()`");
    }
  });
});
