import {
  ArrowUpRight,
  Blocks,
  Cloud,
  Code2,
  Cpu,
  Globe2,
  Monitor,
  Puzzle,
  Radio,
  Smartphone,
  Terminal,
} from "lucide-react";
import Link from "next/link";

import { docsPath } from "@/lib/docs-version";

interface Product {
  description: string;
  href: string;
  icon: typeof Blocks;
  name: string;
}

interface ProductGroup {
  id: string;
  products: readonly Product[];
  title: string;
}

export const DOCS_PRODUCT_GROUPS: readonly ProductGroup[] = [
  {
    id: "build",
    title: "Build with Ryu",
    products: [
      {
        description:
          "Add Ryu capabilities to a product with the TypeScript or Rust SDK",
        href: docsPath("extend", "develop", "sdk"),
        icon: Code2,
        name: "SDKs",
      },
      {
        description:
          "Run agents, sessions, memory, tools, workflows, and sandboxes",
        href: docsPath("core"),
        icon: Cpu,
        name: "Core",
      },
      {
        description:
          "Route models and govern budgets, policies, tools, and channels",
        href: docsPath("gateway"),
        icon: Radio,
        name: "Gateway",
      },
      {
        description:
          "Package complete workflows as sidecar-backed Ryu products",
        href: docsPath("apps"),
        icon: Blocks,
        name: "Apps",
      },
      {
        description: "Extend Ryu with tools, agents, workflows, skills, and UI",
        href: docsPath("plugins"),
        icon: Puzzle,
        name: "Plugins",
      },
      {
        description:
          "Use a managed Gateway and shared services for hosted workloads",
        href: docsPath("gateway", "managed-data-plane"),
        icon: Cloud,
        name: "Ryu Cloud",
      },
    ],
  },
  {
    id: "surfaces",
    title: "Use Ryu across surfaces",
    products: [
      {
        description:
          "Full Ryu workspace for chat, agents, tools, and local runtimes",
        href: docsPath("surfaces", "desktop"),
        icon: Monitor,
        name: "Desktop",
      },
      {
        description:
          "Use Ryu from a browser with a hosted or visitor-controlled server",
        href: docsPath("surfaces", "webapp"),
        icon: Globe2,
        name: "Web",
      },
      {
        description:
          "Bring local models and permissioned browser tools into a tab",
        href: docsPath("browser-extension"),
        icon: Globe2,
        name: "Browser extension",
      },
      {
        description:
          "Run Ryu with on-device models, notifications, and device tools",
        href: docsPath("mobile"),
        icon: Smartphone,
        name: "Mobile",
      },
      {
        description:
          "Use Island and Raycast for quick actions, context, and chat",
        href: docsPath("surfaces", "island"),
        icon: Monitor,
        name: "Companions",
      },
      {
        description: "Drive Core over HTTP and SSE from a terminal",
        href: docsPath("surfaces", "cli"),
        icon: Terminal,
        name: "CLI",
      },
      {
        description:
          "Connect inbound messages and outbound actions through Gateway",
        href: docsPath("gateway", "channels"),
        icon: Radio,
        name: "Bots and channels",
      },
    ],
  },
] as const;

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;

  return (
    <li>
      <Link
        className="group flex h-full items-start gap-3 rounded-xl bg-fd-secondary p-4 transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        href={product.href}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fd-background text-fd-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-medium text-fd-foreground text-sm">
            {product.name}
          </span>
          <span className="mt-1 block text-fd-muted-foreground text-sm leading-relaxed">
            {product.description}
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

export function Products() {
  return (
    <section
      aria-labelledby="products-heading"
      className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12 sm:py-16"
      id="products"
    >
      <div className="max-w-3xl">
        <h2
          className="text-balance font-medium font-heading text-3xl text-fd-foreground tracking-tight sm:text-4xl"
          id="products-heading"
        >
          Products
        </h2>
        <p className="mt-4 max-w-2xl text-balance text-fd-muted-foreground leading-relaxed sm:text-lg">
          Start with the runtime, integration layer, or surface that matches the
          work you want to do
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {DOCS_PRODUCT_GROUPS.map((group) => (
          <section
            aria-labelledby={`${group.id}-products-heading`}
            key={group.id}
          >
            <h3
              className="font-medium text-fd-foreground text-xl"
              id={`${group.id}-products-heading`}
            >
              {group.title}
            </h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.products.map((product) => (
                <ProductCard key={product.name} product={product} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
