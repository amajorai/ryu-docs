import { expect, test } from "bun:test";

const billingRoot = new URL("../../content/docs/billing/", import.meta.url);

async function readPage(name: string): Promise<string> {
  return Bun.file(new URL(name, billingRoot)).text();
}

test("billing docs describe hosted capacity as cloud computers", async () => {
  const pages = await Promise.all([
    readPage("index.mdx"),
    readPage("hosted-agents.mdx"),
    readPage("limits.mdx"),
    readPage("metering.mdx"),
    readPage("plan-changes.mdx"),
    readPage("plans.mdx"),
    readPage("cloud-computers.mdx"),
  ]);
  const content = pages.join("\n");

  expect(content).toContain("cloud computer");
  expect(content).toContain("Cloud computer changes and downtime");
  expect(content).toContain("$200/year");
  expect(content).toContain("two months free");
  expect(content).not.toMatch(/managed node|cloud nodes/i);
  // "Remote nodes" is the separate desktop plan limit, never a name for cloud computers.
  for (const match of content.matchAll(/Remote nodes[^|\n]*/gi)) {
    expect(match[0]).toMatch(
      /^Remote nodes(?: connected to the desktop app)? *$/i,
    );
  }
});

test("billing docs record the pinned Polar API contract", async () => {
  const credits = await readPage("credits.mdx");

  expect(credits).toContain("`2026-04`");
  expect(credits).toContain("Polar-Version");
});

test("billing docs state the cloud-computer plan boundary", async () => {
  const pages = await Promise.all([
    readPage("hosted-agents.mdx"),
    readPage("index.mdx"),
    readPage("limits.mdx"),
    readPage("metering.mdx"),
    readPage("plan-changes.mdx"),
    readPage("plans.mdx"),
    readPage("cloud-computers.mdx"),
  ]);
  const content = pages.join("\n");

  expect(content).toContain(
    "Business and Teams can buy additional cloud computers",
  );
  expect(content).toContain("active Enterprise agreement");
  expect(content).toMatch(
    /Pro and Max individual plans cannot buy or\s+upgrade cloud computer capacity/,
  );
});

test("billing docs explain cloud-computer provisioning, regions, and pricing", async () => {
  const metering = await readPage("metering.mdx");

  expect(metering).toContain("Plan checkout does not ask for a region.");
  expect(metering).toContain("browser's round-trip latency");
  expect(metering).toContain("highest listed Hetzner rate");
  expect(metering).toContain("(currently Singapore)");
  expect(metering).toContain("Windows and macOS computers are not available");
});

test("billing notifications use cloud-computer transfer terminology", async () => {
  const notifications = await readPage("notifications.mdx");

  expect(notifications).toContain("Cloud computer transfer starts");
  expect(notifications).not.toMatch(
    /managed-node transfer|managed node transfer|managed cloud instance/i,
  );
});
