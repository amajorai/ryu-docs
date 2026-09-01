import { expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/start-here/", import.meta.url);

test("migration guide exposes the supported migration boundaries", async () => {
	const page = await Bun.file(new URL("migration.mdx", docsRoot)).text();
	const navigation = (await Bun.file(new URL("meta.json", docsRoot)).json()) as {
		pages?: string[];
	};

	expect(page).toContain('title: "Migrate to Ryu"');
	expect(navigation.pages).toContain("migration");
	expect(page).toContain("/docs/surfaces/desktop/user-guide/import-agent");
	expect(page).toContain("/docs/gateway/agent-sync");
	expect(page).toContain("/docs/surfaces/desktop/user-guide/git-workspace");
	expect(page).toContain("/docs/surfaces/desktop/user-guide/data-and-storage");
	expect(page).toContain("/docs/extend/develop/extensions/portable-packages");
	expect(page).toContain("/api/agents/:id/migrate-to-ryu");
	expect(page).toContain("/api/mail/inboxes/:id/send");
	expect(page).toContain("Resend");
	expect(page).not.toContain("—");
});
