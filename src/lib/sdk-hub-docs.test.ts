import { expect, test } from "bun:test";

const contentRoot = new URL(
	"../../content/docs/extend/develop/sdk/",
	import.meta.url,
);

async function page(name: string): Promise<string> {
	return Bun.file(new URL(name, contentRoot)).text();
}

test("SDK docs expose the public hub and its publishing contract", async () => {
	const [hub, publishing, index, java, bindings] = await Promise.all([
		page("hub.mdx"),
		page("publishing.mdx"),
		page("index.mdx"),
		page("java.mdx"),
		page("language-bindings.mdx"),
	]);

	for (const content of [hub, publishing, index, java, bindings]) {
		expect(content).toContain("amajorai/ryu-sdk");
		expect(content).not.toContain("docs/RELEASING.md");
	}

	for (const packageName of [
		"@ryuhq/sdk",
		"@ryuhq/client",
		"@ryuhq/core-client",
		"com.ryu:ryu-client",
		"ryu-sdk",
		"ryu-sdk-ffi",
		"ryu-sdk-uniffi",
		"@ryuhq/sdk-native",
	]) {
		expect(hub + publishing).toContain(packageName);
	}

	for (const command of [
		"bun run build:native",
		"bun run test:packages",
		"cargo test --workspace --locked --all-targets",
		"bindings/python/test.sh",
		"bindings/swift/test.sh",
		"bindings/java/test.sh",
	]) {
		expect(hub + publishing).toContain(command);
	}

	expect(hub + publishing + bindings).toContain("React Native");
	expect(hub + publishing + bindings).toContain("expo/fetch");
	expect(java).toContain("com.ryu:ryu-client");
});
