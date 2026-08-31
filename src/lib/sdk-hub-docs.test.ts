import { expect, test } from "bun:test";

const contentRoot = new URL(
	"../../content/docs/extend/develop/sdk/",
	import.meta.url,
);

async function page(name: string): Promise<string> {
	return Bun.file(new URL(name, contentRoot)).text();
}

test("SDK docs expose the public hub and its publishing contract", async () => {
	const [hub, publishing, index] = await Promise.all([
		page("hub.mdx"),
		page("publishing.mdx"),
		page("index.mdx"),
	]);

	for (const content of [hub, publishing, index]) {
		expect(content).toContain("amajorai/ryu-sdk");
		expect(content).not.toContain("docs/RELEASING.md");
	}

	for (const packageName of [
		"@ryuhq/sdk",
		"@ryuhq/client",
		"@ryuhq/core-client",
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
	]) {
		expect(hub + publishing).toContain(command);
	}
});
