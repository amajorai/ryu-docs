import { describe, expect, test } from "bun:test";

type Meta = {
  pages?: string[];
  root?: boolean;
};

const docsRoot = new URL("../../content/docs/", import.meta.url);

async function readMeta(path: string): Promise<Meta> {
  return (await Bun.file(new URL(path, docsRoot)).json()) as Meta;
}

describe("docs navigation", () => {
  test("keeps the roadmap as a navigable root", async () => {
    const root = await readMeta("meta.json");
    const roadmap = await readMeta("roadmap/meta.json");

    expect(root.pages).toContain("roadmap");
    expect(roadmap.root).toBe(true);
    expect(roadmap.pages).toEqual(["index"]);
  });

  test("groups every billing page and includes Teams seats", async () => {
    const billing = await readMeta("billing/meta.json");
    const pages = billing.pages ?? [];

    expect(pages).toEqual([
      "index",
      "---Plans & access---",
      "hosted-agents",
      "limits",
      "trial-and-access",
      "plan-changes",
      "pricing-changelog",
      "---Credits & usage---",
      "credits",
      "battle-pass",
      "metering",
      "notifications",
      "---Organizations---",
      "organization-access",
      "seats",
      "agent-inboxes",
      "merging-accounts",
    ]);
  });

  test("groups the public programs pages", async () => {
    const root = await readMeta("meta.json");
    const programs = await readMeta("programs/meta.json");

    expect(root.pages).toContain("programs");
    expect(programs.root).toBe(true);
    expect(programs.pages).toEqual([
      "index",
      "---Community & access---",
      "partner-program",
      "perks",
      "startups-and-students",
      "---Build & earn---",
      "sell-your-own-agents",
      "referrals",
    ]);
  });
});
