import {
  ArrowUpRight,
  Blocks,
  Bot,
  Cloud,
  Code2,
  Cpu,
  GitBranch,
  Globe2,
  Layers3,
  Link2,
  type LucideIcon,
  MonitorSmartphone,
  Network,
  ScanSearch,
  Settings2,
  ShieldCheck,
  Smartphone,
  Terminal,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { docsPath } from "@/lib/docs-version";

export const DOCS_PLATFORM_COPY = {
  capabilitiesDescription:
    "Models, agents, knowledge, media, governance, and device support.",
  capabilitiesTitle: "Capabilities",
  hierarchyLabel: "Product hierarchy",
  hierarchyMeta: "Deploy = Cloud",
  integrationDescription:
    "Add Ryu through the SDK, an endpoint, MCP, apps, plugins, CI, or a node.",
  integrationTitle: "Integration points",
  integrationDescriptionLong:
    "Use the SDK, Core, Gateway, Bot, Console, Apps, or plugins through the same integration layer.",
  integrationHeading: "Add Ryu to your product.",
  integrationEyebrow: "Integration points",
  invariantLabel: "Platform and surfaces",
  invariantDescription:
    "Platform: SDK integrates, Core runs, Gateway secures. Interfaces / surfaces: Bot chats, Console configures, Apps provide ready-made workflows.",
  showcaseDescription: "Products and workflows built with Ryu.",
  showcaseLink: "See examples",
  showcaseTitle: "Built with Ryu",
  subtitle:
    "Ryu connects models, agents, tools, memory, workflows, policies, and apps. Build and run AI agents without starting from scratch.",
  title: "Ryu is the integration layer for AI.",
  eyebrow: "What Ryu provides",
} as const;

interface PlatformLayer {
  description: string;
  group: "Infra" | "Platform" | "Interfaces / surfaces";
  href: string;
  icon: LucideIcon;
  id: string;
  name: string;
  positioning: string;
  verb: string;
}

const PLATFORM_LAYERS: readonly PlatformLayer[] = [
  {
    description: "Deploy Ryu in the cloud.",
    group: "Infra",
    href: docsPath("start-here", "getting-started", "self-host"),
    icon: Cloud,
    id: "deploy",
    name: "Deploy",
    positioning: "Deploy Ryu in the cloud.",
    verb: "Cloud",
  },
  {
    description: "Add Ryu capabilities to an existing product.",
    group: "Platform",
    href: docsPath("extend", "develop", "sdk"),
    icon: Code2,
    id: "sdk",
    name: "SDK",
    positioning: "Add Ryu capabilities to an existing product.",
    verb: "Integrate",
  },
  {
    description: "Run models, agents, tools, memory and workflows.",
    group: "Platform",
    href: docsPath("core"),
    icon: Cpu,
    id: "core",
    name: "Core",
    positioning: "Run models, agents, tools, memory and workflows.",
    verb: "Run",
  },
  {
    description: "Secure model access, spending and providers.",
    group: "Platform",
    href: docsPath("gateway"),
    icon: ShieldCheck,
    id: "gateway",
    name: "Gateway",
    positioning: "Secure model access, spending and providers.",
    verb: "Secure",
  },
  {
    description: "Chat with Ryu through the Bot interface.",
    group: "Interfaces / surfaces",
    href: docsPath("surfaces", "desktop", "bot"),
    icon: Bot,
    id: "bot",
    name: "Bot",
    positioning: "Chat with Ryu through the Bot interface.",
    verb: "Chat",
  },
  {
    description: "Configure Ryu from the control panel.",
    group: "Interfaces / surfaces",
    href: docsPath("surfaces", "desktop"),
    icon: Settings2,
    id: "console",
    name: "Console",
    positioning: "Configure Ryu from the control panel.",
    verb: "Configure",
  },
  {
    description: "Use ready-made applications for business workflows.",
    group: "Interfaces / surfaces",
    href: docsPath("apps"),
    icon: Workflow,
    id: "apps",
    name: "Apps",
    positioning: "Use ready-made applications for business workflows.",
    verb: "Use",
  },
];

const PRIMITIVES = [
  "Models",
  "Agents",
  "Tools",
  "Memory",
  "RAG",
  "Workflows",
  "Policies",
  "Nodes",
  "Surfaces",
  "Apps",
] as const;

interface IntegrationPath {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
  token: string;
}

const INTEGRATION_PATHS: readonly IntegrationPath[] = [
  {
    description: "Send model calls through one OpenAI-compatible endpoint.",
    href: docsPath("extend", "integrate", "openai-compat"),
    icon: Network,
    label: "Gateway endpoint",
    token: "/v1",
  },
  {
    description: "Author typed agents, workflows, tools, and skills.",
    href: docsPath("extend", "develop", "sdk"),
    icon: Blocks,
    label: "SDK",
    token: "@ryuhq/sdk",
  },
  {
    description: "Connect MCP hosts and servers.",
    href: docsPath("extend", "integrate", "mcp-integration"),
    icon: Link2,
    label: "MCP",
    token: "ryu-mcp",
  },
  {
    description: "Run subprocess agents and connect remote agents.",
    href: docsPath("extend", "integrate", "acp-integration"),
    icon: Bot,
    label: "ACP + A2A",
    token: "agent protocols",
  },
  {
    description: "Package capabilities as plugins, widgets, or apps.",
    href: docsPath("extend", "develop", "extensions", "ryu-apps"),
    icon: Workflow,
    label: "Apps + plugins",
    token: "manifest.json · create-ryu-app",
  },
  {
    description:
      "Run the same agent from desktop, mobile, browser, terminal, or web.",
    href: docsPath("surfaces"),
    icon: MonitorSmartphone,
    label: "Every surface",
    token: "local → cloud",
  },
  {
    description: "Run agents and allowlisted tools in CI.",
    href: docsPath("ci", "github-actions"),
    icon: GitBranch,
    label: "GitHub Actions",
    token: "amajorai/ryu@v1",
  },
  {
    description: "Run Ryu with managed infrastructure or self-hosted nodes.",
    href: docsPath("gateway", "gateway-for-any-agent"),
    icon: Globe2,
    label: "Managed or self-hosted",
    token: "BYOK · BYOS",
  },
];

interface Capability {
  description: string;
  href: string;
  icon: LucideIcon;
  name: string;
}

const CAPABILITIES: readonly Capability[] = [
  {
    description:
      "Local models, hosted providers, BYOK, routing, fallback, and caching.",
    href: docsPath("start-here", "architecture", "providers"),
    icon: Cpu,
    name: "Models + providers",
  },
  {
    description:
      "Agents, sub-agents, teams, workflows, durable runs, and human approvals.",
    href: docsPath("core", "workflows"),
    icon: Bot,
    name: "Agents + orchestration",
  },
  {
    description:
      "Spaces, long-term memory, embeddings, retrieval, conversation search, and RAG.",
    href: docsPath("core", "memory"),
    icon: Layers3,
    name: "Knowledge + memory",
  },
  {
    description:
      "Vision models, OCR, document parsing, image and media workflows, voice, and transcription.",
    href: docsPath("core", "mcp-registry"),
    icon: ScanSearch,
    name: "Multimodal + OCR",
  },
  {
    description:
      "Train LoRA or QLoRA adapters locally or remotely, then merge the result into a runnable model.",
    href: docsPath("apps", "finetune"),
    icon: Terminal,
    name: "Fine-tuning",
  },
  {
    description:
      "Permissions, firewall, DLP, budgets, approvals, evals, and an audit trail.",
    href: docsPath("gateway"),
    icon: ShieldCheck,
    name: "Governance + spend",
  },
  {
    description:
      "Browser-local models, in-page tools, and an explicit path to a visitor's own Ryu node.",
    href: docsPath("browser-extension"),
    icon: Globe2,
    name: "Browser + local AI",
  },
  {
    description:
      "On-device mobile models plus native notifications, files, camera, haptics, and background status.",
    href: docsPath("mobile"),
    icon: Smartphone,
    name: "Mobile + device AI",
  },
];

interface ShowcaseItem {
  description: string;
  external?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  name: string;
}

const SHOWCASE: readonly ShowcaseItem[] = [
  {
    description:
      "An external product using @ryuhq/client to route text generation through Ryu Core.",
    external: true,
    href: "https://github.com/amajorai/updatenight",
    icon: Code2,
    label: "External app",
    name: "Update Night",
  },
  {
    description: "Ryu's app catalog: workflows packaged as apps.",
    href: docsPath("apps"),
    icon: Workflow,
    label: "Ryu-built software",
    name: "Ryu Apps",
  },
  {
    description:
      "A website or browser extension can run a small model locally or call a node the visitor controls.",
    href: docsPath("browser-extension"),
    icon: MonitorSmartphone,
    label: "Web + browser",
    name: "Local AI in the tab",
  },
  {
    description:
      "Agents and allowlisted tools become steps in a repeatable CI workflow with the same Core contract.",
    href: docsPath("ci", "github-actions"),
    icon: GitBranch,
    label: "Automation",
    name: "Ryu in GitHub",
  },
];

function PlatformLayerCard({ layer }: { layer: PlatformLayer }) {
  const Icon = layer.icon;
  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-5 hidden h-px w-5 bg-fd-muted-foreground/25 sm:block"
      />
      <Link
        className="group flex items-start gap-3 rounded-xl bg-fd-secondary p-3.5 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        href={layer.href}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fd-background text-fd-foreground shadow-sm">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-fd-foreground text-sm">
              {layer.name}
            </span>
            <span className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider">
              {layer.group} · {layer.verb}
            </span>
          </span>
          <span className="mt-1 block text-fd-muted-foreground text-xs leading-relaxed">
            {layer.description}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>
    </li>
  );
}

function IntegrationCard({ path }: { path: IntegrationPath }) {
  const Icon = path.icon;
  return (
    <li className="flex h-full flex-col rounded-xl bg-fd-secondary p-4 transition-colors hover:bg-fd-accent">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-fd-background text-fd-foreground shadow-sm">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="rounded-full bg-fd-background px-2 py-1 font-mono text-[10px] text-fd-muted-foreground">
          {path.token}
        </span>
      </div>
      <h4 className="mt-5 font-medium text-fd-foreground text-sm">
        {path.label}
      </h4>
      <p className="mt-2 flex-1 text-fd-muted-foreground text-xs leading-relaxed">
        {path.description}
      </p>
      <Link
        className="mt-4 inline-flex items-center gap-1.5 font-medium text-fd-foreground text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        href={path.href}
      >
        Read docs
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>
    </li>
  );
}

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

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-fd-background text-fd-foreground shadow-sm">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-fd-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
      <p className="mt-5 font-mono text-[10px] text-fd-muted-foreground uppercase tracking-[0.16em]">
        {item.label}
      </p>
      <h4 className="mt-2 font-medium text-fd-foreground text-lg">
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
          className="group block h-full rounded-xl bg-fd-secondary p-4 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
          href={item.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {content}
        </a>
      ) : (
        <Link
          className="group block h-full rounded-xl bg-fd-secondary p-4 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
          href={item.href}
        >
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
        <p className="font-medium text-fd-muted-foreground text-xs uppercase tracking-[0.18em]">
          {DOCS_PLATFORM_COPY.eyebrow}
        </p>
        <h2
          className="mt-4 text-balance font-medium font-heading text-3xl text-fd-foreground tracking-tight sm:text-4xl"
          id="platform-map-heading"
        >
          {DOCS_PLATFORM_COPY.title}
        </h2>
        <p className="mt-4 max-w-2xl text-balance text-fd-muted-foreground leading-relaxed sm:text-lg">
          {DOCS_PLATFORM_COPY.subtitle}
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-fd-muted p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-fd-foreground text-sm">
              {DOCS_PLATFORM_COPY.hierarchyLabel}
            </h3>
            <span className="font-mono text-[10px] text-fd-muted-foreground">
              {DOCS_PLATFORM_COPY.hierarchyMeta}
            </span>
          </div>
          <div className="mt-5">
            <div className="mx-auto max-w-xs rounded-xl bg-fd-primary px-4 py-3 text-fd-primary-foreground shadow-sm">
              <p className="font-mono text-[10px] opacity-65 uppercase tracking-[0.18em]">
                Ryu
              </p>
              <p className="mt-1 font-medium text-lg">AI deployment platform</p>
            </div>
            <div
              aria-hidden="true"
              className="mx-auto h-6 w-px bg-fd-muted-foreground/25"
            />
            <div className="relative sm:pl-5">
              <div
                aria-hidden="true"
                className="absolute inset-y-2 left-0 hidden w-px bg-fd-muted-foreground/25 sm:block"
              />
              <ol className="space-y-2">
                {PLATFORM_LAYERS.map((layer) => (
                  <PlatformLayerCard key={layer.id} layer={layer} />
                ))}
              </ol>
            </div>
          </div>
          <ul
            className="mt-5 flex flex-wrap gap-1.5"
            aria-label="Ryu primitives"
          >
            {PRIMITIVES.map((primitive) => (
              <li key={primitive}>
                <span className="rounded-full bg-fd-background px-2.5 py-1 font-mono text-[10px] text-fd-muted-foreground">
                  {primitive}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-fd-muted p-4 sm:p-6">
          <p className="font-medium text-fd-foreground text-sm">
            {DOCS_PLATFORM_COPY.integrationEyebrow}
          </p>
          <h3 className="mt-3 text-balance font-medium font-heading text-2xl text-fd-foreground tracking-tight">
            {DOCS_PLATFORM_COPY.integrationHeading}
          </h3>
          <p className="mt-3 max-w-md text-fd-muted-foreground text-sm leading-relaxed">
            {DOCS_PLATFORM_COPY.integrationDescriptionLong}
          </p>
          <dl className="mt-6 grid gap-2 sm:grid-cols-2">
            {PLATFORM_LAYERS.map((layer) => (
              <div
                className="rounded-xl bg-fd-background/70 p-3"
                key={layer.id}
              >
                <dt className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider">
                  {layer.group} · {layer.name} = {layer.verb}
                </dt>
                <dd className="mt-1 text-fd-foreground/80 text-xs leading-relaxed">
                  {layer.positioning}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 rounded-xl bg-fd-background/70 p-4">
            <p className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider">
              {DOCS_PLATFORM_COPY.invariantLabel}
            </p>
            <p className="mt-2 text-fd-foreground text-sm leading-relaxed">
              {DOCS_PLATFORM_COPY.invariantDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="font-medium text-fd-foreground text-xl">
          {DOCS_PLATFORM_COPY.integrationTitle}
        </h3>
        <p className="mt-1 text-fd-muted-foreground text-sm">
          {DOCS_PLATFORM_COPY.integrationDescription}
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INTEGRATION_PATHS.map((path) => (
            <IntegrationCard key={path.label} path={path} />
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <h3 className="font-medium text-fd-foreground text-xl">
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
      </div>

      <div className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-medium text-fd-foreground text-xl">
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
      </div>
    </section>
  );
}
