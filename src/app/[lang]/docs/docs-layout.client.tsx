"use client";

import { GlassLayout } from "fumadocs-ui/layouts/glass";
import { getLayoutTabs, type LayoutTab } from "fumadocs-ui/layouts/shared";
import { ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode, useMemo } from "react";

import { realmTabTitle } from "@/components/realm-alpha-badge";
import { docsSegmentsFromPathname } from "@/lib/docs-version";
import { MAIN_SITE_TAB } from "@/lib/layout.shared";

/*
 * Per-root theming, matching the official Fumadocs docs site.
 *
 * Each root ("/docs/<version>/<segment>") owns an accent color defined as a CSS variable
 * "--<segment>-color" in global.css. We tint the root selector icon with it, and
 * a "data-docs-root" wrapper switches "--color-fd-primary" so the whole layout
 * (sidebar, content, TOC) takes on that root's color while you are inside it.
 */
const NESTED_ROOTS = [
  { path: "extend/develop/api-reference", segment: "api-reference" },
  { path: "reference/benchmark", segment: "benchmark" },
] as const;

/** Resolve the accent segment for both top-level and nested Fumadocs roots. */
export function rootSegment(url: string): string {
  const segments = docsSegmentsFromPathname(url);
  const path = segments.join("/");
  const nestedRoot = NESTED_ROOTS.find(
    (root) => path === root.path || path.startsWith(`${root.path}/`),
  );
  return nestedRoot?.segment ?? segments[0] ?? "";
}

function rootColor(segment: string): string {
  return segment
    ? `var(--${segment}-color, var(--color-fd-foreground))`
    : "var(--color-fd-foreground)";
}

type DocsLayoutClientProps = ComponentProps<typeof GlassLayout> & {
  children: ReactNode;
};

export function DocsLayoutClient({
  children,
  ...props
}: DocsLayoutClientProps) {
  const pathname = usePathname();
  const activeRoot = rootSegment(pathname);
  const tabs = useMemo<LayoutTab[]>(
    () => [
      ...getLayoutTabs(props.tree, {
        transform(option, node) {
          const segment = rootSegment(option.url);
          const color = rootColor(segment);
          return {
            ...option,
            description: undefined,
            title: realmTabTitle(option.title, segment),
            icon: (
              <div
                className="flex size-5 shrink-0 items-center justify-center rounded-md p-0.5 [&_svg]:size-4 max-md:size-9 max-md:p-1.5 max-md:[&_svg]:size-5"
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
      }),
      {
        ...MAIN_SITE_TAB,
        icon: (
          <div
            className="flex size-5 shrink-0 items-center justify-center rounded-md p-0.5 [&_svg]:size-4 max-md:size-9 max-md:p-1.5 max-md:[&_svg]:size-5"
            style={{
              color: "var(--color-fd-muted-foreground)",
              backgroundColor:
                "color-mix(in oklab, var(--color-fd-muted-foreground) 18%, transparent)",
            }}
          >
            <ExternalLink />
          </div>
        ),
      },
    ],
    [props.tree],
  );

  return (
    // "display: contents" keeps this wrapper out of the layout box model (so it
    // never disturbs Fumadocs' sticky sidebar), while CSS variables still
    // cascade from "data-docs-root" to every descendant.
    <div data-docs-root={activeRoot} style={{ display: "contents" }}>
      <GlassLayout {...props} tabs={tabs}>
        {children}
      </GlassLayout>
    </div>
  );
}
