import { describe, expect, test } from "bun:test";
import { previewSettingEntries } from "./ui-component-preview";
import { UI_COMPONENT_PREVIEW_METADATA } from "./ui-component-preview-metadata.generated";

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

  test("exposes the OTP read-only display state in its preview controls", () => {
    const metadata =
      UI_COMPONENT_PREVIEW_METADATA["components/motion/otp-input"];
    const entry = previewSettingEntries(metadata).find(
      ([property]) => property === "readOnly",
    );

    expect(entry?.[1]).toEqual(["false", "true"]);
  });
});
