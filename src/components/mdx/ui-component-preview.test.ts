import { describe, expect, test } from "bun:test";

import { previewSettingEntries } from "./ui-component-preview";

describe("UI component preview settings", () => {
	test("keeps every metadata-backed setting after the preferred order", () => {
		const entries = previewSettingEntries({
			props: {
				animation: ["random", "wink"],
				expression: ["random", "happy"],
				open: ["false", "true"],
				variant: ["default", "outline"],
			},
			targetExport: "Logo",
		});

		expect(entries.map(([property]) => property)).toEqual([
			"variant",
			"animation",
			"expression",
			"open",
		]);
	});
});
