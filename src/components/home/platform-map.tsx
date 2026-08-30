import {
  ArrowUpRight,
  Bot,
  Code2,
  Cpu,
  GitBranch,
  Globe2,
  Layers3,
  MonitorSmartphone,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { Mermaid } from "@/components/mdx/mermaid";
import { docsPath } from "@/lib/docs-version";

export const DOCS_PLATFORM_COPY = {
  capabilitiesDescription:
    "The capabilities that give an agent context, action, and control",
  capabilitiesTitle: "What connects through Ryu",
  ecosystemDescription:
    "Build with Ryu, run the work through Core and Gateway, then choose the surface and deployment that fit",
  ecosystemTitle: "The Ryu ecosystem at a glance",
  integrationDescription:
    "Choose the seam that matches what you already have and what you want to ship",
  integrationHeading: "Add Ryu to your product",
  integrationTitle: "Ways to integrate",
  showcaseDescription: "Products and workflows built with the same contracts",
  showcaseLink: "See examples",
  showcaseTitle: "Built with Ryu",
  subtitle:
    "The same contracts connect the runtime, integration seams, surfaces, and deployment choices",
  title: "How the pieces connect",
} as const;

export const ECOSYSTEM_DIAGRAM = `flowchart LR
  subgraph BUILD["Build and connect"]
    SDK["SDKs"]
    MCP["MCP"]
    SKILLS["Agent Skills"]
    EXT["Apps and plugins"]
  end

  subgraph PLATFORM["Ryu platform"]
    CORE["Core"]
    CAP["Models · agents · tools<br/>memory · workflows · policies"]
    GATEWAY["Gateway"]
  end

  subgraph RUN["Run"]
    NODE["Local or self-hosted server"]
    CLOUD["Ryu Cloud"]
  end

  subgraph SURFACES["Surfaces"]
    DESKTOP["Desktop"]
    BOT["Bot"]
    WEB["Web and browser"]
    MOBILE["Mobile"]
    CHANNELS["Channel bots"]
  end

  SDK --> CORE
  MCP --> CORE
  SKILLS --> CORE
  EXT --> CORE
  CORE --> CAP
  CORE --> GATEWAY
  GATEWAY --> NODE
  GATEWAY --> CLOUD
  NODE --> DESKTOP
  NODE --> WEB
  NODE --> MOBILE
  CLOUD --> BOT
  CLOUD --> CHANNELS`;

export const INTEGRATION_DIAGRAM = `flowchart LR
  subgraph START["Start with"]
    PRODUCT["Your product"]
    AGENT["Your agent"]
    TEAM["Your team"]
    USERS["Your users"]
  end

  subgraph SEAMS["Choose an integration seam"]
    SDK["Use the SDK"]
    MCP["Give an agent Ryu MCP"]
    SKILL["Give an agent a Skill"]
    API["Call the Core or Gateway API"]
    APP["Build a Ryu App or plugin"]
    CHANNEL["Connect inbound and outbound channels"]
  end

  subgraph RESULT["Connect to Ryu"]
    RUNTIME["Core and Gateway"]
    RUNNABLE["Agent, tool, or workflow"]
    APP_SURFACE["Embedded or standalone app"]
    DELIVERY["Bot, web, desktop, or mobile"]
  end

  PRODUCT --> SDK
  AGENT --> MCP
  AGENT --> SKILL
  PRODUCT --> API
  TEAM --> APP
  USERS --> CHANNEL
  SDK --> RUNTIME
  MCP --> RUNTIME
  SKILL --> RUNTIME
  API --> RUNTIME
  CHANNEL -->|inbound| RUNTIME
  RUNTIME --> RUNNABLE
  APP --> APP_SURFACE
  RUNNABLE --> APP_SURFACE
  RUNNABLE -->|outbound| DELIVERY`;

interface Capability {
  description: string;
  href: string;
  icon: typeof Bot;
  name: string;
}

const CAPABILITIES: readonly Capability[] = [
  {
    description:
      "Local models, hosted providers, BYOK, routing, fallback, and caching",
    href: docsPath("start-here", "architecture", "providers"),
    icon: Cpu,
    name: "Models and providers",
  },
  {
    description:
      "Agents, sub-agents, teams, workflows, durable runs, and approvals",
    href: docsPath("core", "workflows"),
    icon: Bot,
    name: "Agents and orchestration",
  },
  {
    description:
      "Spaces, long-term memory, embeddings, retrieval, search, and RAG",
    href: docsPath("core", "memory"),
    icon: Layers3,
    name: "Knowledge and memory",
  },
  {
    description:
      "Vision models, OCR, document parsing, media workflows, voice, and transcription",
    href: docsPath("core", "mcp-registry"),
    icon: ScanSearch,
    name: "Multimodal and OCR",
  },
  {
    description:
      "Permissions, firewall, DLP, budgets, approvals, evals, and audit history",
    href: docsPath("gateway"),
    icon: ShieldCheck,
    name: "Governance and spend",
  },
  {
    description:
      "Browser-local models, in-page tools, and a visitor-controlled Ryu server",
    href: docsPath("browser-extension"),
    icon: Globe2,
    name: "Browser and local AI",
  },
  {
    description:
      "On-device models, notifications, files, camera, haptics, and background status",
    href: docsPath("mobile"),
    icon: Smartphone,
    name: "Mobile and device AI",
  },
];

interface IntegrationExample {
  description: string;
  href: string;
  name: string;
}

const INTEGRATION_EXAMPLES: readonly IntegrationExample[] = [
  {
    description:
      "Use the SDK or an HTTP endpoint to create sessions, call capabilities, and stream results from your product",
    href: docsPath("extend", "develop", "sdk"),
    name: "Integrate an existing product",
  },
  {
    description:
      "Give an agent Ryu's MCP server or an Agent Skill so it can discover setup steps and call governed tools",
    href: docsPath("extend", "mcp", "quickstart"),
    name: "Give an agent a Ryu seam",
  },
  {
    description:
      "Package a tool, workflow, or UI as a Ryu App or plugin, then ship the same product inside Ryu or on its own",
    href: docsPath("extend", "develop", "extensions", "standalone-apps"),
    name: "Build an app",
  },
  {
    description:
      "Route inbound messages and webhooks into Ryu, then send governed replies and actions back through the channel",
    href: docsPath("gateway", "channels"),
    name: "Connect inbound and outbound work",
  },
];

interface ShowcaseItem {
  description: string;
  external?: boolean;
  href: string;
  icon: typeof Bot;
  name: string;
}

const SHOWCASE: readonly ShowcaseItem[] = [
  {
    description:
      "An external product using @ryuhq/client to route text generation through Ryu Core",
    external: true,
    href: "https://github.com/amajorai/updatenight",
    icon: Code2,
    name: "Update Night",
  },
  {
    description: "Ryu's app catalog for workflows packaged as apps",
    href: docsPath("apps"),
    icon: Workflow,
    name: "Ryu Apps",
  },
  {
    description:
      "A website or browser extension can run a small model locally or call a server the visitor controls",
    href: docsPath("browser-extension"),
    icon: MonitorSmartphone,
    name: "Local AI in the tab",
  },
  {
    description:
      "Agents and allowlisted tools become steps in a repeatable CI workflow with the same Core contract",
    href: docsPath("ci", "github-actions"),
    icon: GitBranch,
    name: "Ryu in GitHub",
  },
];

function CapabilityCard({ capability }: { capability: Capability }) {
  const Icon = capability.icon;
  return (
    <li>
      <Link
        className="group flex h-full items-start gap-3 rounded-xl bg-fd-secondary p-4 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        href={capability.href}
      >
        <Icon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground"
        />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-fd-foreground text-sm">
            {capability.name}
          </span>
          <span className="mt-1 block text-fd-muted-foreground text-xs leading-relaxed">
            {capability.description}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0 text-fd-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>
    </li>
  );
}

function IntegrationExampleCard({ example }: { example: IntegrationExample }) {
  return (
    <li>
      <Link
        className="group flex h-full flex-col rounded-xl bg-fd-secondary p-4 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        href={example.href}
      >
        <h4 className="font-medium text-fd-foreground text-sm">
          {example.name}
        </h4>
        <p className="mt-2 flex-1 text-fd-muted-foreground text-sm leading-relaxed">
          {example.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 font-medium text-fd-foreground text-xs">
          Read the guide
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </Link>
    </li>
  );
}

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const Icon = item.icon;
  const className =
    "group block h-full rounded-xl bg-fd-secondary p-4 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring";
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-fd-background text-fd-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-fd-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
      <h4 className="mt-5 font-medium text-fd-foreground text-lg">
        {item.name}
      </h4>
      <p className="mt-2 text-fd-muted-foreground text-sm leading-relaxed">
        {item.description}
      </p>
    </>
  );

  return (
    <li>
      {item.external ? (
        <a
          className={className}
          href={item.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {content}
        </a>
      ) : (
        <Link className={className} href={item.href}>
          {content}
        </Link>
      )}
    </li>
  );
}

export function PlatformMap() {
  return (
    <section
      aria-labelledby="platform-map-heading"
      className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16"
      data-testid="docs-platform-map"
      id="platform-map"
    >
      <div className="max-w-3xl">
        <h2
          className="text-balance font-medium font-heading text-3xl text-fd-foreground tracking-tight sm:text-4xl"
          id="platform-map-heading"
        >
          {DOCS_PLATFORM_COPY.title}
        </h2>
        <p className="mt-4 max-w-2xl text-balance text-fd-muted-foreground leading-relaxed sm:text-lg">
          {DOCS_PLATFORM_COPY.subtitle}
        </p>
      </div>

      <div className="mt-10 space-y-12">
        <section aria-labelledby="ecosystem-diagram-heading">
          <h3
            className="font-medium text-fd-foreground text-xl"
            id="ecosystem-diagram-heading"
          >
            {DOCS_PLATFORM_COPY.ecosystemTitle}
          </h3>
          <p className="mt-1 max-w-2xl text-fd-muted-foreground text-sm leading-relaxed">
            {DOCS_PLATFORM_COPY.ecosystemDescription}
          </p>
          <div
            className="mt-5 overflow-hidden rounded-xl border border-fd-border/60 bg-fd-secondary/30 p-2 sm:p-4"
            data-testid="ecosystem-diagram"
          >
            <Mermaid chart={ECOSYSTEM_DIAGRAM} />
          </div>
        </section>

        <section aria-labelledby="integration-diagram-heading">
          <h3
            className="font-medium text-fd-foreground text-xl"
            id="integration-diagram-heading"
          >
            {DOCS_PLATFORM_COPY.integrationHeading}
          </h3>
          <p className="mt-1 max-w-2xl text-fd-muted-foreground text-sm leading-relaxed">
            <span className="font-medium text-fd-foreground">
              {DOCS_PLATFORM_COPY.integrationTitle}
            </span>
            <span aria-hidden="true"> · </span>
            {DOCS_PLATFORM_COPY.integrationDescription}
          </p>
          <div
            className="mt-5 overflow-hidden rounded-xl border border-fd-border/60 bg-fd-secondary/30 p-2 sm:p-4"
            data-testid="integration-diagram"
          >
            <Mermaid chart={INTEGRATION_DIAGRAM} />
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {INTEGRATION_EXAMPLES.map((example) => (
              <IntegrationExampleCard example={example} key={example.name} />
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="capabilities-heading" className="mt-14">
        <h3
          className="font-medium text-fd-foreground text-xl"
          id="capabilities-heading"
        >
          {DOCS_PLATFORM_COPY.capabilitiesTitle}
        </h3>
        <p className="mt-1 text-fd-muted-foreground text-sm">
          {DOCS_PLATFORM_COPY.capabilitiesDescription}
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((capability) => (
            <CapabilityCard capability={capability} key={capability.name} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="showcase-heading" className="mt-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3
              className="font-medium text-fd-foreground text-xl"
              id="showcase-heading"
            >
              {DOCS_PLATFORM_COPY.showcaseTitle}
            </h3>
            <p className="mt-1 text-fd-muted-foreground text-sm">
              {DOCS_PLATFORM_COPY.showcaseDescription}
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 font-medium text-fd-foreground text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
            href={docsPath("showcase")}
          >
            {DOCS_PLATFORM_COPY.showcaseLink}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHOWCASE.map((item) => (
            <ShowcaseCard item={item} key={item.name} />
          ))}
        </ul>
      </section>
    </section>
  );
}
