import { expect, test } from "bun:test";
import { metaSchema } from "fumadocs-core/source/schema";

const startHereRoot = new URL(
  "../../content/docs/start-here/",
  import.meta.url,
);
const migrationRoot = new URL("migration/", startHereRoot);

test("migration guides expose the supported migration boundaries", async () => {
  const pages = await Promise.all([
    Bun.file(new URL("index.mdx", migrationRoot)).text(),
    Bun.file(new URL("plan-and-cutover.mdx", migrationRoot)).text(),
    Bun.file(new URL("agents-and-threads.mdx", migrationRoot)).text(),
    Bun.file(new URL("projects-and-spaces.mdx", migrationRoot)).text(),
    Bun.file(new URL("providers-and-services.mdx", migrationRoot)).text(),
  ]);
  const [overview, plan, agents, projects, providers] = pages;
  const navigation = metaSchema.parse(
    await Bun.file(new URL("meta.json", startHereRoot)).json(),
  );

  expect(overview).toContain('title: "Migrate to Ryu"');
  for (const page of pages) {
    expect(page).not.toContain("—");
  }
  const startHere = navigation.pages ?? [];
  // Newcomer order: install first, then concepts, then migration, then
  // reference tables.
  expect(startHere.filter((page) => page.startsWith("---"))).toEqual([
    "---Getting Started---",
    "---Architecture---",
    "---Migration---",
    "---Reference---",
  ]);
  const migrationStart = startHere.indexOf("---Migration---") + 1;
  expect(
    startHere.slice(migrationStart, startHere.indexOf("---Reference---")),
  ).toEqual([
    "migration/index",
    "migration/from-other-agents",
    "migration/plan-and-cutover",
    "migration/agents-and-threads",
    "migration/projects-and-spaces",
    "migration/providers-and-services",
  ]);
  expect(plan).toContain("/docs/gateway/agent-sync");
  expect(agents).toContain("/api/agents/:id/migrate-to-ryu");
  expect(agents).toContain("/docs/surfaces/desktop/user-guide/import-agent");
  expect(projects).toContain("/docs/surfaces/desktop/user-guide/git-workspace");
  expect(projects).toContain(
    "/docs/surfaces/desktop/user-guide/data-and-storage",
  );
  expect(providers).toContain("/api/mail/inboxes/:id/send");
  expect(providers).toContain("Resend");
});
