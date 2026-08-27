import { expect, test } from "bun:test";

import { DOCS_HOME_COPY } from "./hero";
import { DOCS_PLATFORM_COPY } from "./platform-map";

test("docs home uses the composable integration layer positioning", () => {
  expect(DOCS_HOME_COPY).toEqual({
    description:
      "Build and run AI agents without starting from scratch. Extend capability with plugins, or turn agents into apps.",
    title: "The composable integration layer for AI.",
  });
});

test("docs home uses direct integration framing", () => {
  expect(DOCS_PLATFORM_COPY).toMatchObject({
    capabilitiesTitle: "Capabilities",
    hierarchyLabel: "Product hierarchy",
    integrationTitle: "Integration points",
    invariantLabel: "Platform and surfaces",
    showcaseTitle: "Built with Ryu",
    title: "Ryu is the integration layer for AI.",
  });
  expect(DOCS_PLATFORM_COPY.hierarchyMeta).toBe("Deploy = Cloud");
  expect(DOCS_PLATFORM_COPY.invariantDescription).toContain(
    "SDK integrates, Core runs, Gateway secures",
  );
});
