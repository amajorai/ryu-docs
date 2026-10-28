import { describe, expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);

async function page(path: string): Promise<string> {
  return Bun.file(new URL(path, docsRoot)).text();
}

/** One `## heading` section, with line breaks folded so assertions do not depend on wrapping. */
function section(content: string, heading: string): string {
  const start = content.indexOf(`## ${heading}\n`);
  expect(start, `missing section ${heading}`).toBeGreaterThanOrEqual(0);
  const next = content.indexOf("\n## ", start + 1);
  return content
    .slice(start, next === -1 ? undefined : next)
    .replace(/\s+/g, " ");
}

describe("Managed Agents public docs", () => {
  test("describe the per-key API limit as an idle reset, not a fixed window", async () => {
    const limits = section(
      await page("standalone/managed-agents-api.mdx"),
      "Rate limits",
    );

    // Better Auth's key limiter resets its count only after a full window with no request, so
    // a steady integration is throttled after its 600th request whatever its rate.
    expect(limits).not.toMatch(/600 requests per (?:60 seconds|minute)/);
    expect(limits).toContain("600 requests by default");
    expect(limits).toContain("does not reset every minute");
    expect(limits).toContain(
      "count goes back to zero only when a full wait ends with no request from the key",
    );
    expect(limits).toContain(
      "throttled after its 600th request, even at a low rate",
    );
    expect(limits).toContain("](/docs/standalone/managed-agents-events)");
  });

  test("the Client SDK page points to the Managed Agents client", async () => {
    const client = await page("extend/develop/sdk/client.mdx");
    const managed = section(client, "Separate service clients");

    expect(client).toMatch(/^description: .*Managed Agents/m);
    expect(managed).toContain("createManagedAgentsClient");
    expect(managed).toContain("](/docs/standalone/managed-agents-api)");
    expect(managed).toContain(
      "](/docs/standalone/managed-agents-api#typescript-client)",
    );
    expect(managed).not.toContain("—");
  });
});
