import { expect, test } from "bun:test";

import { DOCS_HOME_COPY, DOCS_HOME_REALM_PATHS } from "./hero";
import {
  DOCS_PLATFORM_COPY,
  ECOSYSTEM_DIAGRAM,
  INTEGRATION_DIAGRAM,
} from "./platform-map";
import { DOCS_PRODUCT_GROUPS } from "./products";

test("docs home uses the composable integration layer positioning", () => {
  expect(DOCS_HOME_COPY).toEqual({
    description:
      "Ryu connects models, agents, tools, memory, workflows, policies, and apps. Build and run AI agents without starting from scratch",
    title: "Universal integration layer for AI",
  });
  expect(DOCS_HOME_COPY.title).not.toMatch(/[.!?]$/);
  expect(DOCS_HOME_COPY.description).not.toMatch(/[.!?]$/);
});

test("docs home uses direct integration framing", () => {
  expect(DOCS_PLATFORM_COPY).toMatchObject({
    capabilitiesTitle: "What connects through Ryu",
    ecosystemTitle: "The Ryu ecosystem at a glance",
    integrationHeading: "Add Ryu to your product",
    integrationTitle: "Ways to integrate",
    showcaseTitle: "Built with Ryu",
    title: "How the pieces connect",
  });
  expect(DOCS_PLATFORM_COPY).not.toHaveProperty("eyebrow");
  expect(DOCS_PLATFORM_COPY).not.toHaveProperty("integrationEyebrow");
  expect(ECOSYSTEM_DIAGRAM).toContain("SDKs");
  expect(ECOSYSTEM_DIAGRAM).toContain("Gateway");
  expect(INTEGRATION_DIAGRAM).toContain("inbound and outbound channels");
  expect(INTEGRATION_DIAGRAM).toContain("Embedded or standalone app");
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
    "hardware",
    "core",
    "gateway",
    "providers",
    "ci/github-actions",
    "extend",
    "ui",
    "apps",
    "programs",
    "plugins",
    "security",
    "legal",
    "billing",
    "reference",
    "learn",
    "roadmap",
  ]);
});

test("docs home gives products a dedicated anchor", () => {
  const products = DOCS_PRODUCT_GROUPS.flatMap((group) => group.products);
  const names = products.map((product) => product.name);

  expect(names).toEqual([
    "SDKs",
    "Core",
    "Gateway",
    "Apps",
    "Plugins",
    "Ryu Cloud",
    "Desktop",
    "Web",
    "Browser extension",
    "Mobile",
    "Companions",
    "CLI",
    "Bots and channels",
  ]);
});
