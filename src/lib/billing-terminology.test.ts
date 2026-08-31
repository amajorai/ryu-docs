import { expect, test } from "bun:test";

const billingRoot = new URL("../../content/docs/billing/", import.meta.url);

async function readPage(name: string): Promise<string> {
	return Bun.file(new URL(name, billingRoot)).text();
}

test("billing docs describe hosted capacity as servers", async () => {
	const pages = await Promise.all([
		readPage("index.mdx"),
		readPage("hosted-agents.mdx"),
		readPage("limits.mdx"),
		readPage("metering.mdx"),
		readPage("plan-changes.mdx"),
	]);
	const content = pages.join("\n");

	expect(content).toContain("managed server");
	expect(content).toContain("Cloud server changes and downtime");
	expect(content).toContain("$200/year");
	expect(content).toContain("two months free");
	expect(content).not.toMatch(/managed node|cloud nodes|Remote nodes/i);
});
