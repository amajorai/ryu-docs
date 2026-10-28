"use client";

import { cn } from "@ryu/ui/lib/utils";
import { GlassLayout } from "fumadocs-ui/layouts/glass";
import { Header as GlassHeader } from "fumadocs-ui/layouts/glass/slots/header";
import {
  Sidebar as GlassSidebar,
  SidebarDrawer,
  SidebarProvider,
  useSidebar,
} from "fumadocs-ui/layouts/glass/slots/sidebar";
import { getLayoutTabs, type LayoutTab } from "fumadocs-ui/layouts/shared";
import { ExternalLink } from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useMemo,
} from "react";

import {
  DocsFrameworkProvider,
  useDocsNavigationPathname,
} from "@/components/docs-framework-provider";
import { realmTabTitle } from "@/components/realm-alpha-badge";
import { SiteHeader } from "@/components/site-header";
import { docsSegmentsFromPathname } from "@/lib/docs-version";
import { MAIN_SITE_TAB } from "@/lib/layout.shared";

import styles from "./docs-layout.module.css";

const glassGridStyle: CSSProperties = {
  gridTemplateAreas:
    'var(--docs-glass-grid-areas, "left left-margin main right-margin right")',
  gridTemplateColumns:
    "var(--docs-glass-grid-columns, var(--fd-left-width) calc(50% - var(--fd-main-width)/2 - var(--fd-left-width)) 1fr calc(50% - var(--fd-main-width)/2 - var(--fd-right-width)) var(--fd-right-width))",
};

interface RootTabStyle extends CSSProperties {
  "--docs-tab-accent": string;
}

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

/*
 * The landing-matched site header spans the whole first grid row on every
 * breakpoint. Glass' own floating header stays only as the phone bottom bar
 * (search, root picker, sidebar trigger); on wider screens its search, language
 * and theme controls live in the site header instead.
 */
function DocsHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <>
      <SiteHeader
        className="self-start [grid-area:1/1/2/-1]"
        mobileSearch={false}
      />
      <GlassHeader {...props} className={`md:hidden ${className ?? ""}`} />
    </>
  );
}

/*
 * Glass collapses its sidebar by sliding it 280px left out of a 0px "left"
 * track, which moves the collapse toggle with it. Here the panel stays in its
 * column (global.css keeps the track and cancels the slide via
 * data-collapsed) and only the rows under the toggle row fade out and leave
 * the tab order, so the toggle stays exactly where it was.
 */
function DocsSidebar({ className, ...props }: ComponentProps<"aside">) {
  const { collapsed } = useSidebar();
  return (
    <GlassSidebar
      {...props}
      className={cn(
        "*:not-first:transition-[opacity,visibility] *:not-first:duration-200",
        collapsed && "*:not-first:invisible *:not-first:opacity-0",
        className,
      )}
      data-collapsed={collapsed || undefined}
    />
  );
}

const DOCS_SIDEBAR_SLOTS = {
  drawer: SidebarDrawer,
  main: DocsSidebar,
  provider: SidebarProvider,
  use: useSidebar,
};

/** The logo lives in the site header; keep the sidebar row's layout slot. */
function SidebarNavTitle({ className }: ComponentProps<"a">) {
  return <span aria-hidden="true" className={className} />;
}

type DocsLayoutClientProps = ComponentProps<typeof GlassLayout> & {
  children: ReactNode;
};

export function DocsLayoutClient({
  children,
  ...props
}: DocsLayoutClientProps) {
  const pathname = useDocsNavigationPathname();
  const activeRoot = rootSegment(pathname);
  const tabs = useMemo<LayoutTab[]>(
    () => [
      ...getLayoutTabs(props.tree, {
        transform(option, node) {
          const segment = rootSegment(option.url);
          const accent: RootTabStyle = {
            "--docs-tab-accent": rootColor(segment),
          };
          return {
            ...option,
            description: undefined,
            title: realmTabTitle(option.title, segment),
            icon: (
              <div
                className={`${styles.icon} flex size-5 shrink-0 items-center justify-center rounded-md p-0.5 [&_svg]:size-4 max-md:size-9 max-md:p-1.5 max-md:[&_svg]:size-5`}
                style={accent}
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
            className={`${styles.icon} ${styles.mainSite} flex size-5 shrink-0 items-center justify-center rounded-md p-0.5 [&_svg]:size-4 max-md:size-9 max-md:p-1.5 max-md:[&_svg]:size-5`}
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
    <DocsFrameworkProvider>
      <div data-docs-root={activeRoot} className={styles.root}>
        <GlassLayout
          {...props}
          slots={{
            header: DocsHeader,
            navTitle: SidebarNavTitle,
            sidebar: DOCS_SIDEBAR_SLOTS,
            ...props.slots,
          }}
          tabs={tabs}
          containerProps={{
            ...props.containerProps,
            style: { ...glassGridStyle, ...props.containerProps?.style },
          }}
        >
          {children}
        </GlassLayout>
      </div>
    </DocsFrameworkProvider>
  );
}
