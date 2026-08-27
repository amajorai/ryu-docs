"use client";

import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

import { realmTabTitle } from "@/components/realm-alpha-badge";
import { docsSegmentsFromPathname } from "@/lib/docs-version";

/*
 * Per-root theming, matching the official Fumadocs docs site.
 *
 * Each root ("/docs/<version>/<segment>") owns an accent color defined as a CSS variable
 * "--<segment>-color" in global.css. We tint the root selector icon with it, and
 * a "data-docs-root" wrapper switches "--color-fd-primary" so the whole layout
 * (sidebar, content, TOC) takes on that root's color while you are inside it.
 */
function rootSegment(url: string): string {
  return docsSegmentsFromPathname(url)[0] ?? "";
}

function rootColor(segment: string): string {
  return segment
    ? `var(--${segment}-color, var(--color-fd-foreground))`
    : "var(--color-fd-foreground)";
}

type DocsLayoutClientProps = ComponentProps<typeof DocsLayout> & {
  children: ReactNode;
};

export function DocsLayoutClient({
  children,
  ...props
}: DocsLayoutClientProps) {
  const pathname = usePathname();
  const activeRoot = rootSegment(pathname);

  return (
    // "display: contents" keeps this wrapper out of the layout box model (so it
    // never disturbs Fumadocs' sticky sidebar), while CSS variables still
    // cascade from "data-docs-root" to every descendant.
    <div data-docs-root={activeRoot} style={{ display: "contents" }}>
      <DocsLayout
        {...props}
        tabs={{
          transform(option, node) {
            const segment = rootSegment(option.url);
            const color = rootColor(segment);
            return {
              ...option,
              description: undefined,
              title: realmTabTitle(option.title, segment),
              icon: (
                <div
                  className="size-full rounded-md p-1 [&_svg]:size-full max-md:p-1.5"
                  style={{
                    color,
                    backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
                  }}
                >
                  {node.icon}
                </div>
              ),
            };
          },
        }}
      >
        {children}
      </DocsLayout>
    </div>
  );
}
