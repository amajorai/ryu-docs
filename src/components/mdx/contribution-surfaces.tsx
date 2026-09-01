"use client";

import { Skeleton } from "@ryu/ui/components/skeleton";
import {
  LayoutPanelTop,
  List,
  Palette,
  PanelLeft,
  Pin,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";

type PreviewIcon = ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
  size?: number;
}>;

type SurfaceDefinition = {
  controls: string[];
  description: string;
  icon: PreviewIcon;
  key: string;
  manifestKey: string;
  render: () => ReactNode;
  title: string;
};

const surfaces: SurfaceDefinition[] = [
  {
    key: "sidebar-section",
    title: "Sidebar section",
    manifestKey: "contributes.sidebar_sections[]",
    description:
      "Add a titled, live list to the compact sidebar. The host owns the row treatment, grouping, and navigation.",
    controls: ["title + icon", "source + row map", "target + create action"],
    icon: List,
    render: () => <HostShellSkeleton slot="sidebar-section" />,
  },
  {
    key: "sidebar-button",
    title: "Sidebar button",
    manifestKey: "contributes.sidebar_buttons[]",
    description:
      "Place one navigation row in the shell for an app-owned page or companion surface.",
    controls: ["label + icon", "order", "target route"],
    icon: PanelLeft,
    render: () => <HostShellSkeleton slot="sidebar-button" />,
  },
  {
    key: "pinned-summary",
    title: "Pinned summary / live activity",
    manifestKey: "contributes.live_activities[]",
    description:
      "Feed a host-owned summary rail with live status rows. The rail stays recognizable while your activity stays visible.",
    controls: ["title + accent", "source + status map", "progress + target"],
    icon: Pin,
    render: () => <HostShellSkeleton slot="pinned-summary" />,
  },
  {
    key: "workspace-tab",
    title: "Workspace dock tab",
    manifestKey: "contributes.dock_panels[]",
    description:
      "Offer a panel in the bottom or right workspace dock, backed by a companion, declarative view, or registered native host panel.",
    controls: ["title + icon", "bottom / right / both", "companion or view"],
    icon: LayoutPanelTop,
    render: () => <HostShellSkeleton slot="workspace-tab" />,
  },
  {
    key: "companion",
    title: "Companion surface",
    manifestKey: "runnables[].kind = companion",
    description:
      "Ship a focused app surface that can open as a tab, sidebar companion, or dock panel through the host bridge.",
    controls: ["sandboxed UI bundle", "host context", "theme bridge"],
    icon: Sparkles,
    render: () => <HostShellSkeleton slot="companion" />,
  },
  {
    key: "theme",
    title: "Theme contribution",
    manifestKey: "contributes.themes[]",
    description:
      "Ship palette tokens as a normal plugin contribution. The shell applies them as CSS variables without evaluating code.",
    controls: ["light / dark mode", "preview palette", "CSS token map"],
    icon: Palette,
    render: () => <HostShellSkeleton slot="theme" />,
  },
];

export function ContributionSurfaces() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeLabel = !mounted
    ? "current"
    : resolvedTheme === "dark"
      ? "dark"
      : "light";

  return (
    <section
      aria-label="Contribution surface previews"
      className="not-prose my-8 rounded-2xl bg-fd-secondary p-2 sm:p-3"
    >
      <header className="rounded-xl bg-fd-background p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 font-medium text-fd-primary text-xs uppercase tracking-[0.14em]">
              Host-rendered preview
            </p>
            <h3 className="m-0 font-medium text-fd-foreground text-lg">
              One contribution, one recognizable place
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fd-secondary px-2.5 py-1 text-fd-muted-foreground text-xs">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-fd-primary"
            />
            Current theme · {themeLabel}
          </span>
        </div>
        <p className="mt-3 mb-0 max-w-2xl text-fd-muted-foreground text-sm leading-relaxed">
          These six views share one shell skeleton. The highlighted slot is the
          part a manifest changes; the host keeps the rest of the UI consistent.
        </p>
      </header>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {surfaces.map((surface) => (
          <SurfaceCard key={surface.key} surface={surface} />
        ))}
      </div>
    </section>
  );
}

function SurfaceCard({ surface }: { surface: SurfaceDefinition }) {
  const Icon = surface.icon;

  return (
    <article className="overflow-hidden rounded-xl bg-fd-background p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-fd-accent text-fd-primary">
          <Icon aria-hidden={true} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="m-0 font-medium text-fd-foreground text-sm">
              {surface.title}
            </h4>
            <code className="rounded bg-fd-secondary px-1.5 py-0.5 text-[10px] text-fd-muted-foreground">
              {surface.manifestKey}
            </code>
          </div>
          <p className="mt-1 mb-0 text-fd-muted-foreground text-xs leading-relaxed">
            {surface.description}
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg bg-fd-secondary/70 p-2">
        {surface.render()}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {surface.controls.map((control) => (
          <span
            className="rounded-full bg-fd-secondary px-2 py-1 text-[10px] text-fd-muted-foreground"
            key={control}
          >
            {control}
          </span>
        ))}
      </div>
    </article>
  );
}

type ContributionSlot =
  | "companion"
  | "pinned-summary"
  | "sidebar-button"
  | "sidebar-section"
  | "theme"
  | "workspace-tab";

function HostShellSkeleton({ slot }: { slot: ContributionSlot }) {
  return (
    <div className="relative min-h-44 overflow-hidden rounded-md bg-fd-background">
      <div className="flex min-h-44 overflow-hidden">
        <aside className="w-32 shrink-0 bg-fd-secondary/70 p-2">
          <div className="mb-3 flex items-center gap-1.5">
            <Skeleton className="size-4 rounded bg-fd-primary/30" />
            <Skeleton className="h-2 w-10 rounded-full bg-fd-background/70" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-5 w-full rounded bg-fd-background/70" />
            <SlotMarker
              active={slot === "sidebar-section"}
              label="Sidebar section"
            />
            <SlotMarker
              active={slot === "sidebar-button"}
              label="Sidebar button"
            />
            <Skeleton className="h-5 w-4/5 rounded bg-fd-background/70" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-2.5 w-24 rounded-full bg-fd-secondary" />
            <Skeleton className="h-5 w-5 rounded bg-fd-secondary" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-2 w-4/5 rounded-full bg-fd-secondary" />
            <Skeleton className="h-2 w-3/5 rounded-full bg-fd-secondary" />
            {slot === "companion" ? (
              <HighlightedSlot label="Companion surface">
                <Skeleton className="h-2 w-3/4 rounded-full bg-fd-background" />
                <Skeleton className="mt-2 h-8 w-full rounded bg-fd-background" />
              </HighlightedSlot>
            ) : (
              <Skeleton className="h-16 w-full rounded bg-fd-secondary/70" />
            )}
          </div>
        </main>
      </div>

      {slot === "pinned-summary" ? <PinnedSummarySlot /> : null}
      {slot === "workspace-tab" ? <WorkspaceTabSlot /> : null}
      {slot === "theme" ? <ThemeSlot /> : null}
    </div>
  );
}

function SlotMarker({ active, label }: { active: boolean; label: string }) {
  if (!active) {
    return <Skeleton className="h-5 w-full rounded bg-fd-background/60" />;
  }

  return (
    <div className="flex h-5 items-center gap-1.5 rounded bg-fd-accent px-2 text-fd-foreground text-[9px]">
      <span className="size-1.5 rounded-full bg-fd-primary" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function HighlightedSlot({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-md bg-fd-accent/70 p-2">
      <div className="mb-2 flex items-center gap-1.5 font-medium text-fd-foreground text-[9px]">
        <Sparkles aria-hidden="true" size={11} />
        {label}
      </div>
      {children}
    </div>
  );
}

function PinnedSummarySlot() {
  return (
    <aside className="absolute top-8 right-3 w-32 rounded-md bg-fd-accent p-2">
      <div className="flex items-center gap-1.5 font-medium text-fd-foreground text-[9px]">
        <Pin aria-hidden="true" size={11} />
        Live summary
      </div>
      <Skeleton className="mt-2 h-2 w-4/5 rounded-full bg-fd-background/80" />
      <Skeleton className="mt-1.5 h-2 w-3/5 rounded-full bg-fd-background/80" />
    </aside>
  );
}

function WorkspaceTabSlot() {
  return (
    <div className="absolute right-2 bottom-2 left-2 flex items-center gap-1 rounded bg-fd-secondary/90 p-1">
      <Skeleton className="h-5 w-12 rounded bg-fd-background" />
      <div className="flex h-5 items-center gap-1 rounded bg-fd-accent px-2 text-fd-foreground text-[9px]">
        <LayoutPanelTop aria-hidden="true" size={10} />
        Dock panel
      </div>
      <Skeleton className="h-5 w-10 rounded bg-fd-background/60" />
    </div>
  );
}

function ThemeSlot() {
  return (
    <div className="absolute right-3 bottom-3 left-3 rounded bg-fd-accent p-2">
      <div className="flex items-center gap-1.5 font-medium text-fd-foreground text-[9px]">
        <Palette aria-hidden="true" size={11} />
        Theme tokens
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <span className="h-5 rounded bg-fd-background/70" />
        <span className="h-5 rounded bg-fd-secondary" />
        <span className="h-5 rounded bg-fd-primary" />
        <span className="h-5 rounded bg-fd-foreground" />
      </div>
    </div>
  );
}
