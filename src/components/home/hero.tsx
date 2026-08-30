"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import {
  AppWindow,
  ArrowRight,
  Blocks,
  BookOpen,
  CircuitBoard,
  Code2,
  Cpu,
  CreditCard,
  GitBranch,
  GraduationCap,
  Handshake,
  type LucideIcon,
  Monitor,
  Palette,
  Puzzle,
  Rocket,
  Route,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlphaBadge, isAlphaRealm } from "@/components/realm-alpha-badge";
import { docsPath } from "@/lib/docs-version";

export const DOCS_HOME_COPY = {
  description:
    "Ryu connects models, agents, tools, memory, workflows, policies, and apps. Build and run AI agents without starting from scratch",
  title: "Universal integration layer for AI",
} as const;

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
type Track = "build" | "use";

type Realm = {
  slug: string;
  path?: string;
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
    description: "Install Ryu and run your first agent.",
    icon: Rocket,
    accent: "var(--start-here-color)",
    track: "use",
  },
  {
    slug: "showcase",
    title: "Showcase",
    description: "See products and workflows built with Ryu",
    icon: Sparkles,
    accent: "var(--showcase-color)",
    track: "use",
  },
  {
    slug: "surfaces",
    title: "Surfaces",
    description:
      "Run the same Core context from desktop, browser, companions, and terminal.",
    icon: Monitor,
    accent: "var(--surfaces-color)",
    track: "use",
  },
  {
    slug: "mobile",
    title: "Mobile",
    description:
      "Use Ryu on iOS and Android with on-device models and native capabilities",
    icon: Smartphone,
    accent: "var(--mobile-color)",
    track: "use",
  },
  {
    slug: "browser-extension",
    title: "Browser extension",
    description:
      "Run browser-local models and permissioned tools from the toolbar",
    icon: Puzzle,
    accent: "var(--browser-extension-color)",
    track: "use",
  },
  {
    slug: "surfaces/desktop",
    title: "Desktop App",
    description:
      "Use the full desktop workspace for chat, agents, tools, and local runtimes",
    icon: Monitor,
    accent: "var(--surfaces-color)",
    track: "use",
  },
  {
    slug: "surfaces/desktop/user-guide",
    title: "Desktop User Guide",
    description:
      "Learn the desktop app's layout, chat, tools, spaces, and data flows",
    icon: BookOpen,
    accent: "var(--surfaces-color)",
    track: "use",
  },
  {
    slug: "surfaces/desktop/engines",
    title: "Engines & Runtimes",
    description: "Install and manage local engines, models, and runtime health",
    icon: Cpu,
    accent: "var(--surfaces-color)",
    track: "build",
  },
  {
    slug: "surfaces/desktop/productivity",
    title: "Desktop Productivity",
    description: "Use meetings, activities, tasks, and other focused tools",
    icon: Workflow,
    accent: "var(--surfaces-color)",
    track: "use",
  },
  {
    slug: "hardware",
    title: "Hardware",
    description: "Connect ESP32-S3 devices to a Ryu server.",
    icon: CircuitBoard,
    accent: "var(--hardware-color)",
    track: "build",
  },
  {
    slug: "core",
    title: "Core",
    description:
      "Run agents, sessions, memory, RAG, workflows, sandboxes, and MCP.",
    icon: Cpu,
    accent: "var(--core-color)",
    track: "build",
  },
  {
    slug: "gateway",
    title: "Gateway",
    description: "Control model routing, firewall, budgets, evals, and audit.",
    icon: Shield,
    accent: "var(--gateway-color)",
    track: "build",
  },
  {
    slug: "providers",
    title: "Providers",
    description:
      "Choose cloud, local, custom, and BYOK backends across every capability layer.",
    icon: Blocks,
    accent: "var(--providers-color)",
    track: "build",
  },
  {
    slug: "ci",
    path: "ci/github-actions",
    title: "CI/CD",
    description: "Run agents, workflows, and tools from GitHub Actions.",
    icon: GitBranch,
    accent: "var(--ci-color)",
    track: "build",
  },
  {
    slug: "extend",
    title: "Extend",
    description: "Build plugins and apps with skills, MCP, SDKs, and APIs.",
    icon: Code2,
    accent: "var(--extend-color)",
    track: "build",
  },
  {
    slug: "ui",
    title: "UI",
    description: "Use Ryu's shared components, themes, and hooks.",
    icon: Palette,
    accent: "var(--ui-color)",
    track: "build",
  },
  {
    slug: "apps",
    title: "Apps",
    description: "Use Ryu apps packaged with a sidecar and a product surface.",
    icon: AppWindow,
    accent: "var(--apps-color)",
    track: "use",
  },
  {
    slug: "programs",
    title: "Programs",
    description: "Partner, build, learn, and earn with Ryu",
    icon: Handshake,
    accent: "var(--programs-color)",
    track: "use",
  },
  {
    slug: "plugins",
    title: "Plugins",
    description: "Add tools, agents, workflows, and skills from a manifest.",
    icon: Blocks,
    accent: "var(--plugins-color)",
    track: "build",
  },
  {
    slug: "security",
    title: "Security",
    description:
      "Configure trust boundaries, sandboxing, approvals, DLP, and hardening.",
    icon: ShieldCheck,
    accent: "var(--security-color)",
    track: "build",
  },
  {
    slug: "legal",
    title: "Legal",
    description: "Terms, privacy, data processing, and provider disclosures",
    icon: Scale,
    accent: "var(--legal-color)",
    track: "use",
  },
  {
    slug: "billing",
    title: "Billing & Plans",
    description: "Plans, limits, credits, and organization access.",
    icon: CreditCard,
    accent: "var(--billing-color)",
    track: "use",
  },
  {
    slug: "reference",
    title: "Reference",
    description: "Defaults, swappable building blocks, and benchmarks.",
    icon: BookOpen,
    accent: "var(--reference-color)",
    track: "build",
  },
  {
    slug: "learn",
    title: "Learn",
    description: "Courses and recipes for using and building with Ryu.",
    icon: GraduationCap,
    accent: "var(--learn-color)",
    track: "use",
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    description: "Planned and in-progress Ryu surfaces.",
    icon: Route,
    accent: "var(--roadmap-color)",
    track: "use",
  },
];

export const DOCS_HOME_REALM_PATHS = REALMS.map(
  (realm) => realm.path ?? realm.slug,
);

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
  { id: "products", label: "Products", href: "#products" },
  {
    id: "showcase",
    label: "Showcase",
    href: docsPath("showcase"),
  },
  { id: "cookbook", label: "Cookbook", href: docsPath("learn", "cookbook") },
  {
    id: "api",
    label: "API reference",
    href: docsPath("extend", "develop", "api-reference"),
  },
  { id: "security", label: "Security", href: docsPath("security") },
  {
    id: "benchmark",
    label: "Benchmarks",
    href: docsPath("reference", "benchmark"),
  },
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
  title: string;
  description: string;
  accent: string;
};

const FEATURED: Featured[] = [
  {
    id: "architecture",
    href: docsPath("start-here", "architecture"),
    title: "Architecture",
    description:
      "How a request moves through the Gateway, Core, and an engine.",
    accent: "var(--start-here-color)",
  },
  {
    id: "gateway",
    href: docsPath("gateway"),
    title: "Gateway controls",
    description:
      "How the Gateway routes calls and applies firewall, budget, and audit controls.",
    accent: "var(--gateway-color)",
  },
  {
    id: "workflows",
    href: docsPath("core", "workflows"),
    title: "Workflows",
    description:
      "Chain agents and tools into durable runs that can wait for approval.",
    accent: "var(--core-color)",
  },
  {
    id: "cookbook",
    href: docsPath("learn", "cookbook"),
    title: "Cookbook recipes",
    description:
      "Working recipes for tools, Slack, model routing, and SDK agents.",
    accent: "var(--learn-color)",
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
        {DOCS_HOME_COPY.title}
      </h1>

      <p className="mt-6 max-w-2xl text-balance text-base text-fd-muted-foreground leading-relaxed sm:text-lg">
        {DOCS_HOME_COPY.description}
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
      href={docsPath(realm.path ?? realm.slug)}
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
    description: "Use Ryu to run agents and workflows.",
  },
  {
    id: "build",
    title: "Build on Ryu",
    description:
      "Build on Ryu with Core, Gateway, plugins, apps, SDKs, and APIs.",
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
        Use these docs to run Ryu or build on its integration layer.
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
        Start with a working example or a system reference.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {FEATURED.map((item) => (
          <FeaturedCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}
