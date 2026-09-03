import { expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);

async function readPage(path: string): Promise<string> {
	return Bun.file(new URL(path, docsRoot)).text();
}

test("Secret Vault docs publish scopes, precedence, and consumer boundaries", async () => {
	const [vault, securityMeta, mcp, skills] = await Promise.all([
		readPage("security/secret-vault.mdx"),
		Bun.file(new URL("security/meta.json", docsRoot)).json(),
		readPage("extend/mcp/configuration.mdx"),
		readPage("extend/skills/authoring.mdx"),
	]);

	expect(securityMeta.pages).toContain("secret-vault");
	for (const level of ["User", "Node", "Team", "Organization"]) {
		expect(vault).toContain(`**${level}**`);
	}
	expect(vault).toContain("User → Node → Team → Organization");
	expect(vault).toContain("exact MCP binding");
	expect(vault).toContain("does not make an Identity Vault login profile organization-shared");
	expect(mcp).toContain("secret:NAME");
	expect(skills).toContain("secret:NAME");
});
