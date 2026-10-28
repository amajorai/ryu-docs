import { describe, expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);
const repoRoot = new URL("../../../../", import.meta.url);

const AWS_PRICING_URL = "https://aws.amazon.com/end-user-messaging/pricing/";
const MESSAGING_PAGES = [
  "standalone/messaging.mdx",
  "standalone/messaging-api.mdx",
  "standalone/messaging-numbers.mdx",
] as const;

async function page(path: string): Promise<string> {
  return Bun.file(new URL(path, docsRoot)).text();
}

async function source(path: string): Promise<string> {
  return Bun.file(new URL(path, repoRoot)).text();
}

/** Line breaks folded so assertions do not depend on wrapping. */
function folded(content: string): string {
  return content.replace(/\s+/g, " ");
}

/** One `## heading` section, folded. */
function section(content: string, heading: string): string {
  const start = content.indexOf(`## ${heading}\n`);
  expect(start, `missing section ${heading}`).toBeGreaterThanOrEqual(0);
  const next = content.indexOf("\n## ", start + 1);
  return folded(content.slice(start, next === -1 ? undefined : next));
}

/** A numeric `name: 1_000,` or `const NAME = 7;` value from a source file. */
function numberIn(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match?.[1]) {
    throw new Error(`${pattern} not found`);
  }
  return Number(match[1].replaceAll("_", ""));
}

const formatCount = (value: number): string => value.toLocaleString("en-US");

describe("Ryu Messaging public docs", () => {
  test("price every charge at the AWS list price without inventing figures", async () => {
    for (const path of MESSAGING_PAGES) {
      const content = await page(path);
      // Per-country prices come from AWS; a dollar figure here would be invented.
      expect({ path, dollarFigure: /\$\d/.test(content) }).toEqual({
        path,
        dollarFigure: false,
      });
    }
    const pricing = section(await page("standalone/messaging.mdx"), "Pricing");
    expect(pricing).toContain(AWS_PRICING_URL);
    expect(pricing).toContain("**no markup**");
    expect(pricing).toContain("`402 insufficient_credits`");
    expect(pricing).toContain("never more than the hold");
    expect(pricing).toContain("deposit fee on credit top-ups still applies");

    for (const path of [
      "standalone/index.mdx",
      "billing/metering.mdx",
      "billing/credits.mdx",
    ]) {
      const content = await page(path);
      expect({ path, linksAws: content.includes(AWS_PRICING_URL) }).toEqual({
        path,
        linksAws: true,
      });
    }
    expect(folded(await page("billing/metering.mdx"))).toContain(
      "A Messaging charge therefore never takes the balance below zero.",
    );
  });

  test("state the early-access gate and the voice boundary", async () => {
    const overview = folded(await page("standalone/messaging.mdx"));
    expect(overview).toContain("**early access**");
    expect(overview).toContain("`403 feature_disabled`");
    expect(overview).toContain("Voice is outbound text-to-speech only.");
    expect(overview).toContain("](/docs/gateway/phone-assistant)");
  });

  test("keep operator configuration and operator routes out of public pages", async () => {
    for (const path of MESSAGING_PAGES) {
      const content = await page(path);
      for (const pattern of [
        /\bRYU_MESSAGING_[A-Z_]+\b/,
        /\bAWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|REGION)\b/,
        /\/admin\//,
        /\/events\/(?:sms|inbound|whatsapp)/,
        /\?token=/,
        /arn:aws:/,
        /docs\/messaging-service/,
      ]) {
        expect({
          path,
          leak: String(pattern),
          found: pattern.test(content),
        }).toEqual({ path, leak: String(pattern), found: false });
      }
    }
  });

  test("the endpoint table lists every customer route the router serves", async () => {
    const router = await source("packages/api/src/routers/messaging.ts");
    const routes = [
      ...router.matchAll(
        /messagingRouter\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g,
      ),
    ]
      .map(([, method, path]) => ({
        method: (method ?? "").toUpperCase(),
        path: path ?? "",
      }))
      .filter(
        ({ path }) =>
          !(path.startsWith("/admin/") || path.startsWith("/events/")),
      );
    expect(routes.length).toBeGreaterThan(20);

    const table = section(
      await page("standalone/messaging-api.mdx"),
      "Endpoints",
    );
    for (const { method, path } of routes) {
      const row = `| \`${method}\` | \`${path}\` |`;
      expect({ row, documented: table.includes(row) }).toEqual({
        row,
        documented: true,
      });
    }
  });

  test("quote the enforced send caps, metadata bounds, and lease timings", async () => {
    const limits = await source("packages/api/src/lib/messaging-rate-limit.ts");
    const model = await source("packages/db/src/models/messaging.model.ts");
    const api = await page("standalone/messaging-api.mdx");
    const sendLimits = section(api, "Send limits");
    expect(sendLimits).toContain(
      `| Per organization per minute | ${formatCount(numberIn(limits, /orgPerMinute: ([\d_]+)/))} sends |`,
    );
    expect(sendLimits).toContain(
      `| Per organization per hour | ${formatCount(numberIn(limits, /orgPerHour: ([\d_]+)/))} sends |`,
    );
    expect(sendLimits).toContain(
      `| Per organization per UTC day | ${formatCount(numberIn(limits, /defaultDaily: ([\d_]+)/))} sends`,
    );
    expect(section(api, "Send messages")).toContain(
      `\`metadata\` is up to ${numberIn(model, /MESSAGING_METADATA_MAX_ENTRIES = ([\d_]+)/)} string entries`,
    );

    const lifecycle = section(
      await page("standalone/messaging-numbers.mdx"),
      "Number lifecycle",
    );
    expect(lifecycle).toContain(
      `Each lease period is ${numberIn(model, /MESSAGING_LEASE_PERIOD_DAYS = ([\d_]+)/)} days.`,
    );
    expect(lifecycle).toContain(
      `${numberIn(model, /MESSAGING_SUSPENSION_GRACE_DAYS = ([\d_]+)/)}-day grace period`,
    );
  });

  test("the Client SDK page points to the Messaging client", async () => {
    const client = await page("extend/develop/sdk/client.mdx");
    const messaging = section(client, "Separate service clients");

    expect(client).toMatch(/^description: .*Messaging/m);
    expect(messaging).toContain("createMessagingClient");
    expect(messaging).toContain("](/docs/standalone/messaging-api)");
    expect(messaging).toContain(
      "](/docs/standalone/messaging-api#typescript-client)",
    );
    expect(messaging).not.toContain("—");
  });
});
