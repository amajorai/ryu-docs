"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import {
  ArrowRight,
  BookOpen,
  CircuitBoard,
  Code2,
  Cpu,
  CreditCard,
  Gauge,
  GraduationCap,
  type LucideIcon,
  Monitor,
  PlugZap,
  Puzzle,
  Rocket,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlphaBadge, isAlphaRealm } from "@/components/realm-alpha-badge";
import { docsPath } from "@/lib/docs-version";

/**
 * `track` is the documentation split.
 *
 * Ryu is one product sold through two motions, and the two must never share
 * copy: a firm hires it to do work and lives in the app; a developer runs it
 * themselves and wires it into their own stack. The business site is written
 * entirely for the first reader. These docs serve BOTH, so rather than pick a
 * voice they separate by track — "use" answers "how do I get my work done with
 * this", "build" answers "how do I run and extend it".
 *
 * A realm belongs in "build" if reading it requires a terminal.
 */
type Track = "build" | "use";

type Realm = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  track: Track;
};

const REALMS: Realm[] = [
  {
    slug: "start-here",
    title: "Start Here",
    description:
      "Install Ryu, understand how the pieces fit together, and send your first message.",
    icon: Rocket,
    accent: "var(--start-here-color)",
    track: "use",
  },
  {
    slug: "integrate",
    title: "Integrate",
    description:
      "Every surface, protocol, and API Ryu exposes for agents, tools, and applications — find the right integration path.",
    icon: Puzzle,
    accent: "var(--integrate-color)",
    track: "build",
  },
  {
    slug: "billing",
    title: "Billing & Plans",
    description:
      "Plans, limits, credits, AI pools, Agent Inboxes, and the free tier baseline.",
    icon: CreditCard,
    accent: "var(--billing-color)",
    track: "use",
  },
  {
    slug: "desktop",
    title: "Desktop",
    description:
      "The flagship app and its companions (Island, extension, Raycast): chat, agents, teams, engines, and more.",
    icon: Monitor,
    accent: "var(--desktop-color)",
    track: "use",
  },
  {
    slug: "cli",
    title: "CLI",
    description:
      "The Rust terminal UI: chat, a fuzzy command palette, live list tabs, and GitOps from your shell.",
    icon: Terminal,
    accent: "var(--cli-color)",
    track: "build",
  },
  {
    slug: "mobile",
    title: "Mobile",
    description:
      "The Expo app: chat and a drawer of screens over the same Core, through the active node.",
    icon: Smartphone,
    accent: "var(--mobile-color)",
    track: "use",
  },
  {
    slug: "hardware",
    title: "Hardware",
    description:
      "ESP32-S3 devices (watch, necklace, desk hub) that capture audio and camera and run all inference on a node: protocol, pairing, ambient capture, firmware, and deployment.",
    icon: CircuitBoard,
    accent: "var(--hardware-color)",
    track: "build",
  },
  {
    slug: "skills",
    title: "Skills",
    description:
      "Agent skills: reusable SKILL.md instruction packs that load on demand. The setup-ryu flagship, the shipped catalog, authoring, and publishing.",
    icon: Sparkles,
    accent: "var(--skills-color)",
    track: "use",
  },
  {
    slug: "mcp",
    title: "MCP Server",
    description:
      "Connect Claude Desktop or any MCP host to your node: quickstart config, the tool list, remote-node setup, and security.",
    icon: PlugZap,
    accent: "var(--mcp-color)",
    track: "build",
  },
  {
    slug: "cookbook",
    title: "Cookbook",
    description:
      "End-to-end recipes: agents, routing, deployments, multi-node, and channel bots.",
    icon: BookOpen,
    accent: "var(--cookbook-color)",
    track: "build",
  },
  {
    slug: "academy",
    title: "Academy",
    description:
      "Structured courses from first chat to certified builder, with knowledge checks.",
    icon: GraduationCap,
    accent: "var(--academy-color)",
    track: "use",
  },
  {
    slug: "gateway",
    title: "Gateway",
    description:
      "The LLM control plane: routing, firewall, budgets, evals, and audit.",
    icon: Shield,
    accent: "var(--gateway-color)",
    track: "build",
  },
  {
    slug: "core",
    title: "Core",
    description:
      "Local backend internals: sessions, memory, RAG, workflows, sandboxes, and MCP.",
    icon: Cpu,
    accent: "var(--core-color)",
    track: "build",
  },
  {
    slug: "security",
    title: "Security",
    description:
      "Ryu's security model: trust boundary, sandboxing, command approval and HITL, credential scrubbing, outbound DLP, SSRF protection, and deployment hardening.",
    icon: ShieldCheck,
    accent: "var(--security-color)",
    track: "build",
  },
  {
    slug: "develop",
    title: "Develop",
    description:
      "Build on Ryu: TypeScript SDK, Rust SDK, plugin manifests, and the full API reference.",
    icon: Code2,
    accent: "var(--develop-color)",
    track: "build",
  },
  {
    slug: "benchmark",
    title: "RyuBench",
    description:
      "Measure how well any model or harness can operate Ryu — execution-verified, cost-normalized, hard to game.",
    icon: Gauge,
    accent: "var(--benchmark-color)",
    track: "build",
  },
];

type QuickLink = {
  id: string;
  label: string;
  href: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    id: "install",
    label: "Install",
    href: docsPath("start-here", "getting-started"),
  },
  {
    id: "architecture",
    label: "Architecture",
    href: docsPath("start-here", "architecture"),
  },
  { id: "cookbook", label: "Cookbook", href: docsPath("cookbook") },
  {
    id: "api",
    label: "API reference",
    href: docsPath("develop", "api-reference"),
  },
  { id: "security", label: "Security", href: docsPath("security") },
  { id: "benchmark", label: "Benchmarks", href: docsPath("benchmark") },
];

// The hero used to close with a strip of hardcoded document counts (API
// reference pages, documentation sections, architecture diagrams), and the
// search placeholder quoted the API-page figure a second time. Nothing in the build
// recomputed any of them, so every page added or removed made the landing page
// a little more wrong, silently. Counting the corpus for real is not worth a
// build step, and a stale count is worse than no count, so the claim is gone
// rather than automated. Do not reintroduce one by hand.

type Featured = {
  id: string;
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
};

const FEATURED: Featured[] = [
  {
    id: "architecture",
    href: docsPath("start-here", "architecture"),
    eyebrow: "Start Here",
    title: "The architecture, end to end",
    description:
      "How a request travels from any surface through the Gateway and Core to an engine, and back.",
    accent: "var(--start-here-color)",
  },
  {
    id: "gateway",
    href: docsPath("gateway"),
    eyebrow: "Gateway",
    title: "The Gateway: routing, firewall, and budgets",
    description:
      "Every model call passes through: routing picks the provider, the firewall blocks what shouldn't leave, budgets cap spend.",
    accent: "var(--gateway-color)",
  },
  {
    id: "workflows",
    href: docsPath("core", "workflows"),
    eyebrow: "Core",
    title: "Workflows and the DAG engine",
    description:
      "Chain agents, tools, and sub-workflows into durable runs that survive crashes and wait for human approval.",
    accent: "var(--core-color)",
  },
  {
    id: "cookbook",
    href: docsPath("cookbook"),
    eyebrow: "Cookbook",
    title: "Recipes: real flows, start to finish",
    description:
      "Monitor a price and alert Slack, give a model a tool, route coding to Claude, ship an SDK agent.",
    accent: "var(--cookbook-color)",
  },
];

/** The centered fake-search button that opens the built-in command palette. */
function SearchTrigger() {
  const { setOpenSearch } = useSearchContext();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const platform = navigator.userAgent || navigator.platform || "";
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(platform));
  }, []);

  return (
    <button
      aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      aria-label="Search the documentation"
      className="group flex w-full items-center gap-3 rounded-xl bg-fd-secondary px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
      onClick={() => setOpenSearch(true)}
      type="button"
    >
      <Search
        aria-hidden="true"
        className="size-5 shrink-0 text-fd-muted-foreground transition-colors group-hover:text-fd-foreground"
      />
      <span className="flex-1 text-base text-fd-muted-foreground">
        Search the documentation…
      </span>
      <kbd className="hidden shrink-0 items-center gap-1 rounded-md bg-fd-background px-2 py-1 font-medium font-mono text-fd-muted-foreground text-xs sm:inline-flex">
        {isMac ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}

function QuickLinks() {
  return (
    <nav aria-label="Common destinations">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {QUICK_LINKS.map((link) => (
          <li key={link.id}>
            <Link
              className="inline-flex items-center rounded-full bg-fd-secondary px-3.5 py-1.5 font-medium text-fd-muted-foreground text-sm transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-16 pb-8 text-center sm:pt-24">
      <h1 className="text-balance font-medium font-heading text-4xl text-fd-foreground tracking-tight sm:text-5xl md:text-6xl">
        The universal agent interface.
      </h1>

      <p className="mt-6 max-w-2xl text-balance text-base text-fd-muted-foreground leading-relaxed sm:text-lg">
        An open, composable platform for agent orchestration and knowledge
        sharing. Build plugins that extend capabilities and apps that leverage
        pre-built primitives. Ryu is not another agent — it is a whole
        infrastructure layer.
      </p>

      <div className="mt-9 flex w-full max-w-xl flex-col items-center gap-4">
        <SearchTrigger />
        <QuickLinks />
      </div>
    </section>
  );
}

function RealmCard({ realm }: { realm: Realm }) {
  const Icon = realm.icon;
  return (
    <Link
      className="group relative flex flex-col gap-3 rounded-xl bg-fd-secondary p-5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
      href={docsPath(realm.slug)}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `color-mix(in oklab, ${realm.accent} 16%, transparent)`,
            color: realm.accent,
          }}
        >
          <Icon className="size-5" />
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-fd-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-heading font-medium text-fd-foreground text-lg">
          <span className="inline-flex items-center gap-2">
            {realm.title}
            {isAlphaRealm(realm.slug) ? <AlphaBadge /> : null}
          </span>
        </h3>
        <p className="text-fd-muted-foreground text-sm leading-relaxed">
          {realm.description}
        </p>
      </div>
    </Link>
  );
}

const TRACKS: {
  description: string;
  id: Track;
  title: string;
}[] = [
  {
    id: "use",
    title: "Use Ryu",
    description:
      "You want Ryu to do the work. The app and its companions, what to ask them, and how to check what they did.",
  },
  {
    id: "build",
    title: "Build on Ryu",
    description:
      "You want to run it yourself. The gateway and Core internals, the SDKs and API, MCP, security, and hands-on recipes.",
  },
];

function TrackSection({ track }: { track: (typeof TRACKS)[number] }) {
  const realms = REALMS.filter((realm) => realm.track === track.id);
  const headingId = `track-${track.id}-heading`;

  return (
    <section aria-labelledby={headingId} className="mt-10 first:mt-0">
      <h3
        className="font-heading font-medium text-fd-foreground text-lg"
        id={headingId}
      >
        {track.title}
      </h3>
      <p className="mt-1 text-fd-muted-foreground text-sm">
        {track.description}
      </p>
      <nav
        aria-label={track.title}
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {realms.map((realm) => (
          <RealmCard key={realm.slug} realm={realm} />
        ))}
      </nav>
    </section>
  );
}

export function Realms() {
  return (
    <section
      aria-labelledby="realms-heading"
      className="mx-auto w-full max-w-4xl px-4 py-12"
    >
      <h2
        className="font-heading font-medium text-fd-foreground text-xl"
        id="realms-heading"
      >
        Documentation
      </h2>
      <p className="mt-1 text-fd-muted-foreground text-sm">
        Split by what you came here to do. Nothing is hidden from either track —
        the line is simply whether reading it needs a terminal.
      </p>
      <div className="mt-8">
        {TRACKS.map((track) => (
          <TrackSection key={track.id} track={track} />
        ))}
      </div>
    </section>
  );
}

function FeaturedCard({ item }: { item: Featured }) {
  return (
    <Link
      className="group flex flex-col gap-2 rounded-xl bg-fd-secondary p-5 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring sm:flex-row sm:items-center sm:gap-5 sm:p-6"
      href={item.href}
    >
      <span
        aria-hidden="true"
        className="hidden h-12 w-1 shrink-0 rounded-full sm:block"
        style={{
          backgroundColor: `color-mix(in oklab, ${item.accent} 55%, transparent)`,
        }}
      />
      <div className="flex flex-1 flex-col gap-1">
        <span
          className="font-heading font-medium text-xs uppercase tracking-wide"
          style={{ color: item.accent }}
        >
          {item.eyebrow}
        </span>
        <h3 className="font-heading font-medium text-base text-fd-foreground sm:text-lg">
          {item.title}
        </h3>
        <p className="text-fd-muted-foreground text-sm leading-relaxed">
          {item.description}
        </p>
      </div>
      <ArrowRight
        aria-hidden="true"
        className="hidden size-5 shrink-0 text-fd-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-fd-foreground sm:block"
      />
    </Link>
  );
}

export function FeaturedRail() {
  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto w-full max-w-4xl px-4 py-12"
    >
      <h2
        className="font-heading font-medium text-fd-foreground text-xl"
        id="featured-heading"
      >
        Featured
      </h2>
      <p className="mt-1 text-fd-muted-foreground text-sm">
        Deep dives to get you oriented quickly.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {FEATURED.map((item) => (
          <FeaturedCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}
