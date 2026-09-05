import { expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);

async function readDoc(path: string): Promise<string> {
	return Bun.file(new URL(path, docsRoot)).text();
}

test("login approval docs describe the shared website-centered flow", async () => {
	const [account, devices] = await Promise.all([
		readDoc("security/authentication-account.mdx"),
		readDoc("security/authentication-devices.mdx"),
	]);

	expect(account).toContain("Approve on another device");
	expect(account).toContain("The website owns the account email field");
	expect(account).toContain("HttpOnly");
	expect(devices).toContain("Website-centered approval for every client surface");
	expect(devices).toContain("foreground");
	expect(devices).toContain("mobile session receives");
	expect(devices).toContain("one-time");
});
