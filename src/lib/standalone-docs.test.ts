import { expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);

const servicePages = [
  ["Gateway", ["standalone/gateway.mdx", "standalone/gateway-api.mdx"]],
  [
    "Box",
    [
      "standalone/box.mdx",
      "standalone/box-api.mdx",
      "standalone/box-lifecycle.mdx",
    ],
  ],
  [
    "Mail",
    [
      "standalone/mail.mdx",
      "standalone/mail-api.mdx",
      "standalone/mail-delivery.mdx",
    ],
  ],
  [
    "Notify",
    [
      "standalone/notify.mdx",
      "standalone/notify-api.mdx",
      "standalone/notify-streams.mdx",
    ],
  ],
  ["Hire", ["standalone/hire.mdx"]],
] as const;

test("standalone services have published guides", async () => {
  const index = await Bun.file(
    new URL("standalone/index.mdx", docsRoot),
  ).text();

  for (const [service, pages] of servicePages) {
    expect(index).toContain(`## Ryu ${service}`);
    expect(pages.length).toBeGreaterThan(0);

    for (const pagePath of pages) {
      const content = await Bun.file(new URL(pagePath, docsRoot)).text();
      expect(content).toContain("## ");
    }
  }
});
