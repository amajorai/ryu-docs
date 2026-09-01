import { expect, test } from "bun:test";

const startHereRoot = new URL("../../content/docs/start-here/", import.meta.url);
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
	const navigation = (await Bun.file(new URL("meta.json", startHereRoot)).json()) as {
		pages?: string[];
	};

	expect(overview).toContain('title: "Migrate to Ryu"');
	for (const page of pages) {
		expect(page).not.toContain("—");
	}
	expect(navigation.pages).toEqual([
		"index",
		"---Getting Started---",
		"getting-started/index",
		"getting-started/install-sidecar",
		"getting-started/first-chat",
		"---Migration---",
		"migration/index",
		"migration/plan-and-cutover",
		"migration/agents-and-threads",
		"migration/projects-and-spaces",
		"migration/providers-and-services",
		"---Reference---",
		"configuration",
		"environment-variables",
		"release-channels",
		"glossary",
		"---Architecture---",
		"architecture/index",
		"architecture/why-ryu",
		"architecture/three-products",
		"architecture/core-vs-gateway",
		"architecture/runnable-model",
		"architecture/capability-layers",
		"architecture/batteries-included",
		"architecture/acp-agents",
		"architecture/providers",
		"architecture/platform-decomposition",
		"architecture/open-core",
	]);
	expect(plan).toContain("/docs/gateway/agent-sync");
	expect(agents).toContain("/api/agents/:id/migrate-to-ryu");
	expect(agents).toContain("/docs/surfaces/desktop/user-guide/import-agent");
	expect(projects).toContain("/docs/surfaces/desktop/user-guide/git-workspace");
	expect(projects).toContain("/docs/surfaces/desktop/user-guide/data-and-storage");
	expect(providers).toContain("/api/mail/inboxes/:id/send");
	expect(providers).toContain("Resend");
});
