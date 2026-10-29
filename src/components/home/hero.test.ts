import { expect, test } from "bun:test";

import { existsSync } from "node:fs";

import { FEATURE_ROWS } from "./feature-rows";
import { DOCS_HOME_COPY, DOCS_HOME_REALM_PATHS } from "./hero";

test("docs home uses the composable integration layer positioning", () => {
  expect(DOCS_HOME_COPY).toEqual({
    description:
      "Ryu connects models, agents, tools, memory, workflows, policies, and apps. Build and run AI agents without starting from scratch",
    title: "Universal integration layer for AI",
  });
  expect(DOCS_HOME_COPY.title).not.toMatch(/[.!?]$/);
  expect(DOCS_HOME_COPY.description).not.toMatch(/[.!?]$/);
});

test("docs home exposes every root selector destination", () => {
  expect(DOCS_HOME_REALM_PATHS).toEqual([
    "start-here",
    "showcase",
    "surfaces",
    "mobile",
    "browser-extension",
    "surfaces/desktop",
    "surfaces/desktop/user-guide",
    "surfaces/desktop/engines",
    "surfaces/desktop/productivity",
    "surfaces/cli",
    "hardware",
    "core",
    "gateway",
    "providers",
    "ci/github-actions",
    "extend",
    "extend/develop/api-reference",
    "ui",
    "apps",
    "programs",
    "plugins",
    "security",
    "legal",
    "billing",
    "reference",
    "reference/benchmark",
    "learn",
    "roadmap",
    "release-notes",
  ]);
});

test("docs home rows pair each track with a generated figure", () => {
  expect(FEATURE_ROWS.map((row) => row.title)).toEqual([
    "Use Ryu",
    "Build on Ryu",
    "Extend Ryu",
  ]);
  for (const row of FEATURE_ROWS) {
    expect(row.links.length).toBeGreaterThan(0);
    expect(row.lead).not.toMatch(/[!?]$/);
    for (const theme of ["light", "dark"]) {
      const figure = new URL(
        `../../../public/figures/${row.figure}-${theme}.svg`,
        import.meta.url,
      );
      expect(existsSync(figure)).toBe(true);
    }
  }
});
