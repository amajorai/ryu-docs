import { describe, expect, test } from "bun:test";
import {
  chainMatches,
  chainProblem,
  commandProblems,
  hostProblems,
  pythonChainMatches,
  pythonChainProblem,
  regions,
  unpairedNodeTabs,
} from "./standalone-sdk-docs-checks";
import {
  acloseProblems,
  nodeResultMisreads,
  printCalls,
  printsMessageAndHint,
  pythonResultMisreads,
  underscoreConflict,
} from "./standalone-sdk-docs-samples";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("standalone SDK docs guard: matchers", () => {
  test("the host check accepts documented hosts and rejects others", () => {
    const accepted = [
      "https://api.ryuhq.com/api/v1/managed-agents",
      "https://docs.ryuhq.com/docs/standalone/sdk",
      "https://ryuhq.com/openapi/notify.json",
      "https://box.ryuhq.com/v1/boxes",
      "https://notify.ryuhq.com/v1/events",
      "http://127.0.0.1:7981/v1/models",
      "http://localhost:8090",
      "https://notify.example.com/v1/events",
      "https://api.github.com/user",
    ];
    const rejected = [
      "https://api.ryu.ai/v1",
      "https://gateway.ryuhq.com/health",
      "https://connect.ryuhq.com/mcp",
      "https://ryuhq.com/pricing",
      "https://evil.test/hook",
    ];
    for (const url of accepted) {
      expect({ url, problems: hostProblems(url) }).toEqual({
        url,
        problems: [],
      });
    }
    for (const url of rejected) {
      expect({ url, rejected: hostProblems(url).length > 0 }).toEqual({
        url,
        rejected: true,
      });
    }
    expect(hostProblems("Point it at box.ryuhq.com.")).toEqual([]);
    expect(hostProblems("Point it at gateway.ryuhq.com.")).not.toEqual([]);
    expect(hostProblems("Point it at passport.ryuhq.com.")).not.toEqual([]);
  });

  test("regions render docs:show lines, dedent, and expand tabs", () => {
    const source = [
      "namespace X {",
      "\t// docs:start sample",
      '\t// docs:show import { Ryu } from "@ryuhq/services";',
      "\t// docs:show",
      "\tconst ryu = new Ryu();",
      "\tif (ryu) {",
      "\t\tdone();",
      "\t}",
      "\t// docs:end sample",
      "}",
    ].join("\n");
    expect(regions(source)).toEqual([
      {
        id: "sample",
        body: [
          'import { Ryu } from "@ryuhq/services";',
          "",
          "const ryu = new Ryu();",
          "if (ryu) {",
          "  done();",
          "}",
        ].join("\n"),
      },
    ]);
    expect(() => regions("// docs:start a\n")).toThrow("not closed");
  });

  test("chains and commands are checked against the real surfaces", () => {
    const chains = (text: string) =>
      chainMatches(text).flatMap((match) => chainProblem(match) ?? []);
    expect(
      chains(
        'ryu.notify.publish(x); ryu.safe.box.run(); ryu.notify.with({ idempotencyKey: "k" }).publish(); ryu.webhooks.verify(); ryu.managedAgents.sessions.iterate()',
      ),
    ).toEqual([]);
    expect(chains("ryu.notify.sendLater()")).toEqual([
      "ryu.notify.sendLater does not resolve",
    ]);
    expect(chains("ryu.hire.run()")).toEqual(["ryu.hire.run does not resolve"]);
    expect(
      chains(
        'await ryu.notify\n  .with({ idempotencyKey: "k" })\n  .events.list({ limit: 1 });',
      ),
    ).toEqual([]);
    expect(
      chains(
        'await ryu.notify\n  .with({ idempotencyKey: "k" })\n  .listEvents({ limit: 1 });',
      ),
    ).toEqual([
      'ryu.notify.with({ idempotencyKey: "k" }).listEvents uses a deprecated alias; write ryu.notify.events.list',
    ]);
    expect(
      chains(
        'await ryu.notify\n  .with({ idempotencyKey: "k" })\n  .sendLater({ title: "T" });',
      ),
    ).toEqual([
      'ryu.notify.with({ idempotencyKey: "k" }).sendLater does not resolve',
    ]);
    expect(
      chains("ryu.notify\n\n  .publish(x);\nconst rest = [...items];"),
    ).toEqual([]);
    expect(
      commandProblems(
        "ryu-services notify publish --title T --level success --json",
      ),
    ).toEqual([]);
    expect(commandProblems("ryu-services box exec <id> -- ls -la")).toEqual([]);
    expect(commandProblems("ryu-services notify launch")).not.toEqual([]);
    expect(commandProblems("ryu-services notify publish --colour red")).toEqual(
      ["ryu-services notify publish --colour red: unknown flag --colour"],
    );
    expect(commandProblems("ryu-services hire run")).not.toEqual([]);
  });

  test("python chains are checked against the Python client's surface", () => {
    const chains = (text: string) =>
      pythonChainMatches(text).flatMap(
        (match) => pythonChainProblem(match) ?? [],
      );
    expect(
      chains(
        'ryu.notify.publish(x)\nryu.safe.box.run()\nryu.mail.with_options(idempotency_key="k").messages.reply_all()\nryu.managed_agents.sessions\nryu.webhooks.verify()',
      ),
    ).toEqual([]);
    expect(chains("ryu.notify.send_later()")).toEqual([
      "ryu.notify.send_later does not resolve on the Python client",
    ]);
    expect(chains("ryu.managedAgents.sessions.run()")).toEqual([
      "ryu.managedAgents.sessions.run does not resolve on the Python client",
    ]);
    expect(chains("ryu.safe.hire.run()")).toEqual([
      "ryu.safe.hire.run: hire is not a Python namespace",
    ]);
    expect(
      unpairedNodeTabs(
        '```ts tab="Node"\na\n```\n\n```python tab="Python"\nb\n```\n```ts tab="Node"\nc\n```\n',
      ),
    ).toEqual([8]);
  });

  test("result-mode checks flag reply fields read off an object-mode result", () => {
    expect(
      nodeResultMisreads(
        "const updated = await ryu.messaging.settings.update({});\nconst secret = updated.webhookSecret ?? (await ryu.messaging.settings.rotateWebhookSecret()).webhookSecret;",
      ),
    ).toEqual(["updated.webhookSecret", "(await ...).webhookSecret"]);
    expect(
      nodeResultMisreads(
        "const updated = await ryu.messaging.settings.update({});\nif (updated.error) {\n  throw updated.error;\n}\nlet secret = updated.data.webhookSecret;\nconst rotated = (await ryu.messaging.settings.rotateWebhookSecret()).data;\nconst once = await ryu.safe.notify.publish({});\nonce.foo;\nconst quote = await ryu.messaging.quote({});\nconsole.log(quote.data.quote.ceilingMicroUsd);",
      ),
    ).toEqual([]);
    expect(
      pythonResultMisreads(
        'updated = ryu.messaging.settings.update({"webhookUrl": u})\nsecret = updated.get("webhookSecret") or ryu.messaging.settings.rotate_webhook_secret()["webhookSecret"]',
      ),
    ).toEqual([
      "updated.get",
      "ryu.messaging.settings.rotate_webhook_secret()[",
    ]);
    expect(
      pythonResultMisreads(
        'page = ryu.passport.runtime.connections.fetch(\n    "<id>",\n    {"url": u},\n).data\nprint(page["status"])\nbox = ryu.box.create({}).data\nryu.box.files.list(box["id"])\nupdated = ryu.messaging.settings.update({"webhookUrl": u}).unwrap()\nsecret = updated.get("webhookSecret") or ryu.messaging.settings.rotate_webhook_secret().unwrap()["webhookSecret"]\nsent = ryu.notify.publish({})\nif sent.error:\n    print(sent.data)',
      ),
    ).toEqual([]);
  });

  test("aclosing() is accepted only around stream() and follow()", () => {
    expect(
      acloseProblems(
        "async with aclosing(ryu.notify.events.stream()) as s:\nasync with aclosing(ryu.managed_agents.sessions.follow(sid)) as e:",
      ),
    ).toEqual([]);
    expect(
      acloseProblems(
        'async with aclosing(ryu.notify.events.iterate(topic="deploys")) as events:',
      ),
    ).toEqual([
      'aclosing(ryu.notify.events.iterate(topic="deploys")) as events:',
    ]);
  });
});

describe("audit-3 guard helpers", () => {
  test("flag reordered and multi-line message-plus-hint prints, not fallbacks", () => {
    const flagged = (body: string) =>
      printCalls(body).some((call) => printsMessageAndHint(call));
    expect(flagged("console.error(error.message, error.hint);")).toBe(true);
    expect(flagged("console.error(error.hint, error.message);")).toBe(true);
    expect(flagged("print(\n    error.message,\n    error.hint,\n)")).toBe(
      true,
    );
    expect(flagged('print(f"{error.message} ({error.hint})")')).toBe(true);
    expect(
      flagged("console.error(messageWithoutHint(error), error.hint);"),
    ).toBe(false);
    expect(
      flagged("console.error(error.code, error.hint ?? error.message)"),
    ).toBe(false);
    expect(flagged("print(error.code, error.hint or error.message)")).toBe(
      false,
    );
  });

  test("flag `_` reused across slots or across data slots of different calls", () => {
    expect(
      underscoreConflict(
        "a, b, _ = ryu.sites.projects.make_public(x)\n_, c, _ = ryu.sites.projects.update_settings(x)",
      ),
    ).toBe("slots");
    expect(
      underscoreConflict(
        "_, e1, m1 = ryu.sites.projects.make_public(x)\n_, e2, m2 = ryu.box.list()",
      ),
    ).toBe("data slot: ryu.sites.projects.make_public, ryu.box.list");
    expect(
      underscoreConflict(
        "a, e1, _ = ryu.box.list()\nb, e2, _ = await ryu.box.get(x)",
      ),
    ).toBeNull();
  });
});
