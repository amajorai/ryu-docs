/**
 * `track` is the documentation split.
 *
 * Ryu is one product sold through two motions, and the two must never share
 * copy: a firm hires it to do work and lives in the app; a developer runs it
 * themselves and wires it into their own stack. The business site is written
 * entirely for the first reader. These docs serve BOTH, so rather than pick a
 * voice they separate by track. "use" answers "how do I get my work done with
 * this", while "build" answers "how do I run and extend it".
 *
 * A realm belongs in "build" if reading it requires a terminal.
 */
export type Track = "build" | "use";

export type Realm = {
  slug: string;
  path?: string;
  title: string;
  description: string;
  track: Track;
};

export const REALMS: Realm[] = [
  {
    slug: "start-here",
    title: "Start Here",
    description: "Install Ryu and run your first agent.",
    track: "use",
  },
  {
    slug: "showcase",
    title: "Showcase",
    description: "See products and workflows built with Ryu",
    track: "use",
  },
  {
    slug: "surfaces",
    title: "Surfaces",
    description:
      "Run the same Core context from desktop, browser, companions, and terminal.",
    track: "use",
  },
  {
    slug: "mobile",
    title: "Mobile",
    description:
      "Use Ryu on iOS and Android with on-device models and native capabilities",
    track: "use",
  },
  {
    slug: "browser-extension",
    title: "Browser extension",
    description:
      "Run browser-local models and permissioned tools from the toolbar",
    track: "use",
  },
  {
    slug: "surfaces/desktop",
    title: "Desktop App",
    description:
      "Use the full desktop workspace for chat, agents, tools, and local runtimes",
    track: "use",
  },
  {
    slug: "surfaces/desktop/user-guide",
    title: "Desktop User Guide",
    description:
      "Learn the desktop app's layout, chat, tools, spaces, and data flows",
    track: "use",
  },
  {
    slug: "surfaces/desktop/engines",
    title: "Engines & Runtimes",
    description: "Install and manage local engines, models, and runtime health",
    track: "build",
  },
  {
    slug: "surfaces/desktop/productivity",
    title: "Desktop Productivity",
    description: "Use meetings, activities, tasks, and other focused tools",
    track: "use",
  },
  {
    slug: "hardware",
    title: "Hardware",
    description: "Connect ESP32-S3 devices to a Ryu server.",
    track: "build",
  },
  {
    slug: "core",
    title: "Core",
    description:
      "Run agents, sessions, memory, RAG, workflows, sandboxes, and MCP.",
    track: "build",
  },
  {
    slug: "gateway",
    title: "Gateway",
    description: "Control model routing, firewall, budgets, evals, and audit.",
    track: "build",
  },
  {
    slug: "providers",
    title: "Providers",
    description:
      "Choose cloud, local, custom, and BYOK backends across every capability layer.",
    track: "build",
  },
  {
    slug: "ci",
    path: "ci/github-actions",
    title: "CI/CD",
    description: "Run agents, workflows, and tools from GitHub Actions.",
    track: "build",
  },
  {
    slug: "extend",
    title: "Extend",
    description: "Build plugins and apps with skills, MCP, SDKs, and APIs.",
    track: "build",
  },
  {
    slug: "api-reference",
    path: "extend/develop/api-reference",
    title: "API Reference",
    description:
      "Browse the interactive OpenAPI contracts for Core and Gateway.",
    track: "build",
  },
  {
    slug: "ui",
    title: "UI",
    description: "Use Ryu's shared components, themes, and hooks.",
    track: "build",
  },
  {
    slug: "apps",
    title: "Apps",
    description: "Use Ryu apps packaged with a sidecar and a product surface.",
    track: "use",
  },
  {
    slug: "programs",
    title: "Programs",
    description: "Partner, build, learn, and earn with Ryu",
    track: "use",
  },
  {
    slug: "plugins",
    title: "Plugins",
    description: "Add tools, agents, workflows, and skills from a manifest.",
    track: "build",
  },
  {
    slug: "security",
    title: "Security",
    description:
      "Configure trust boundaries, sandboxing, approvals, DLP, and hardening.",
    track: "build",
  },
  {
    slug: "legal",
    title: "Legal",
    description: "Terms, privacy, data processing, and provider disclosures",
    track: "use",
  },
  {
    slug: "billing",
    title: "Billing & Plans",
    description: "Plans, limits, credits, and organization access.",
    track: "use",
  },
  {
    slug: "reference",
    title: "Reference",
    description: "Defaults, swappable building blocks, and benchmarks.",
    track: "build",
  },
  {
    slug: "benchmark",
    path: "reference/benchmark",
    title: "RyuBench",
    description: "Measure how well models and harnesses operate current Ryu.",
    track: "build",
  },
  {
    slug: "learn",
    title: "Learn",
    description: "Courses and recipes for using and building with Ryu.",
    track: "use",
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    description: "Planned and in-progress Ryu surfaces.",
    track: "use",
  },
  {
    slug: "release-notes",
    title: "Release notes",
    description:
      "Highlights and the package changelog for every stable release.",
    track: "use",
  },
];

export const DOCS_HOME_REALM_PATHS = REALMS.map(
  (realm) => realm.path ?? realm.slug,
);
