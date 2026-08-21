"use client";

import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  FileText,
  LayoutPanelTop,
  List,
  Palette,
  PanelLeft,
  Pin,
  Plus,
  Settings2,
  Sparkles,
  TerminalSquare,
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
    render: () => <SidebarSectionPreview />,
  },
  {
    key: "sidebar-button",
    title: "Sidebar button",
    manifestKey: "contributes.sidebar_buttons[]",
    description:
      "Place one navigation row in the shell for an app-owned page or companion surface.",
    controls: ["label + icon", "order", "target route"],
    icon: PanelLeft,
    render: () => <SidebarButtonPreview />,
  },
  {
    key: "pinned-summary",
    title: "Pinned summary / live activity",
    manifestKey: "contributes.live_activities[]",
    description:
      "Feed a host-owned summary rail with live status rows. The rail stays recognizable while your activity stays visible.",
    controls: ["title + accent", "source + status map", "progress + target"],
    icon: Pin,
    render: () => <PinnedSummaryPreview />,
  },
  {
    key: "workspace-tab",
    title: "Workspace dock tab",
    manifestKey: "contributes.dock_panels[]",
    description:
      "Offer a panel in the bottom or right workspace dock, backed by a companion, declarative view, or registered native host panel.",
    controls: ["title + icon", "bottom / right / both", "companion or view"],
    icon: LayoutPanelTop,
    render: () => <WorkspaceTabPreview />,
  },
  {
    key: "companion",
    title: "Companion surface",
    manifestKey: "runnables[].kind = companion",
    description:
      "Ship a focused app surface that can open as a tab, sidebar companion, or dock panel through the host bridge.",
    controls: ["sandboxed UI bundle", "host context", "theme bridge"],
    icon: Sparkles,
    render: () => <CompanionPreview />,
  },
  {
    key: "theme",
    title: "Theme contribution",
    manifestKey: "contributes.themes[]",
    description:
      "Ship palette tokens as a normal plugin contribution. The shell applies them as CSS variables without evaluating code.",
    controls: ["light / dark mode", "preview palette", "CSS token map"],
    icon: Palette,
    render: () => <ThemePreview />,
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
          These are intentionally small skeletons. They use the docs host
          tokens, so switching light/dark mode updates every render without
          changing the extension contract.
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

function SidebarSectionPreview() {
  return (
    <div className="flex min-h-44 overflow-hidden rounded-md bg-fd-background shadow-sm">
      <aside className="w-32 shrink-0 bg-fd-secondary/70 p-2">
        <div className="mb-3 flex items-center gap-1.5 text-fd-foreground text-[10px]">
          <span className="flex size-4 items-center justify-center rounded bg-fd-primary text-[8px] text-fd-primary-foreground">
            R
          </span>
          Ryu
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="rounded bg-fd-accent px-2 py-1 text-fd-foreground">
            Overview
          </div>
          <div className="mt-3 flex items-center justify-between px-2 text-fd-muted-foreground uppercase tracking-wider">
            <span>Research</span>
            <Plus size={10} />
          </div>
          <div className="flex items-center gap-1.5 rounded bg-fd-background px-2 py-1 text-fd-foreground">
            <FileText className="text-fd-primary" size={11} />
            Sprint notes
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 text-fd-muted-foreground">
            <FileText size={11} />
            Field guide
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-fd-foreground text-xs">
            Sprint notes
          </span>
          <ArrowUpRight className="text-fd-muted-foreground" size={12} />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-4/5 rounded-full bg-fd-secondary" />
          <div className="h-2 w-3/5 rounded-full bg-fd-secondary" />
          <div className="h-16 rounded-md bg-fd-secondary/70" />
        </div>
      </div>
    </div>
  );
}

function SidebarButtonPreview() {
  return (
    <div className="flex min-h-44 overflow-hidden rounded-md bg-fd-background shadow-sm">
      <aside className="w-36 shrink-0 bg-fd-secondary/70 p-2">
        <div className="mb-3 px-2 text-fd-muted-foreground text-[9px] uppercase tracking-wider">
          Workspace
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2 px-2 py-1.5 text-fd-muted-foreground">
            <Bot size={12} />
            Agents
          </div>
          <div className="flex items-center gap-2 rounded bg-fd-accent px-2 py-1.5 text-fd-foreground">
            <Activity className="text-fd-primary" size={12} />
            Research
            <ArrowUpRight
              className="ml-auto text-fd-muted-foreground"
              size={10}
            />
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 text-fd-muted-foreground">
            <Settings2 size={12} />
            Settings
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-3">
        <p className="mb-1 text-fd-muted-foreground text-[9px] uppercase tracking-wider">
          /research
        </p>
        <p className="m-0 font-medium text-fd-foreground text-xs">
          Your app-owned page opens here.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-md bg-fd-secondary p-2 text-fd-muted-foreground text-[10px]">
          <Check className="text-emerald-500" size={12} />
          One row, one target, no shell fork.
        </div>
      </div>
    </div>
  );
}

function PinnedSummaryPreview() {
  return (
    <div className="min-h-44 rounded-md bg-fd-background p-2 shadow-sm">
      <div className="flex items-center gap-2 px-1 text-fd-muted-foreground text-[9px] uppercase tracking-wider">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Chat · running
      </div>
      <div className="mt-2 grid grid-cols-[1fr_9rem] gap-2">
        <div className="space-y-2 p-2">
          <div className="h-2 w-4/5 rounded-full bg-fd-secondary" />
          <div className="h-2 w-3/5 rounded-full bg-fd-secondary" />
          <div className="mt-5 h-12 rounded-md bg-fd-secondary/70" />
        </div>
        <aside className="rounded-md bg-fd-secondary/80 p-2.5">
          <div className="flex items-center gap-1.5 text-fd-foreground text-[10px]">
            <Pin className="text-fd-primary" size={11} />
            Pinned summary
          </div>
          <div className="mt-3 rounded-md bg-fd-background p-2">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-fd-foreground">Research pass</span>
              <span className="text-fd-muted-foreground">68%</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-fd-secondary">
              <div className="h-1 w-2/3 rounded-full bg-fd-primary" />
            </div>
            <p className="mt-2 mb-0 text-fd-muted-foreground text-[9px]">
              Reading source 4 of 6
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function WorkspaceTabPreview() {
  return (
    <div className="flex min-h-44 flex-col rounded-md bg-fd-background p-2 shadow-sm">
      <div className="flex items-center gap-1 rounded bg-fd-secondary/70 p-1 text-[9px]">
        <span className="rounded bg-fd-background px-2 py-1 text-fd-muted-foreground">
          Chat
        </span>
        <span className="rounded bg-fd-accent px-2 py-1 text-fd-foreground">
          Research
        </span>
        <span className="rounded px-2 py-1 text-fd-muted-foreground">
          Files
        </span>
        <Plus className="ml-auto text-fd-muted-foreground" size={11} />
      </div>
      <div className="flex flex-1 items-center justify-center text-center">
        <div>
          <TerminalSquare className="mx-auto text-fd-primary" size={20} />
          <p className="mt-2 mb-0 font-medium text-fd-foreground text-[10px]">
            App-owned workspace panel
          </p>
          <p className="mt-1 mb-0 text-fd-muted-foreground text-[9px]">
            Bottom, right, or offered in both docks.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded bg-fd-secondary/70 p-1 text-[9px]">
        <span className="rounded bg-fd-accent px-2 py-1 text-fd-foreground">
          Research
        </span>
        <span className="rounded px-2 py-1 text-fd-muted-foreground">
          Terminal
        </span>
      </div>
    </div>
  );
}

function CompanionPreview() {
  return (
    <div className="min-h-44 rounded-md bg-fd-background p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-fd-primary text-fd-primary-foreground">
            <Sparkles size={13} />
          </span>
          <div>
            <p className="m-0 font-medium text-fd-foreground text-[10px]">
              Research companion
            </p>
            <p className="m-0 text-fd-muted-foreground text-[9px]">
              app-owned surface
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-700 dark:text-emerald-300">
          Connected
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="col-span-2 rounded-md bg-fd-secondary p-2">
          <div className="h-2 w-3/4 rounded-full bg-fd-background" />
          <div className="mt-2 h-2 w-1/2 rounded-full bg-fd-background" />
          <div className="mt-4 h-8 rounded bg-fd-background" />
        </div>
        <div className="rounded-md bg-fd-accent p-2">
          <ArrowUpRight className="text-fd-primary" size={12} />
          <p className="mt-2 mb-0 text-fd-foreground text-[9px]">Open run</p>
        </div>
      </div>
    </div>
  );
}

function ThemePreview() {
  return (
    <div className="min-h-44 rounded-md bg-fd-background p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-fd-foreground text-[10px]">
          Quiet focus
        </span>
        <Palette className="text-fd-primary" size={14} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="h-16 rounded-md bg-fd-secondary" />
        <div className="h-16 rounded-md bg-fd-accent" />
        <div className="h-16 rounded-md bg-fd-primary" />
        <div className="h-16 rounded-md bg-fd-foreground" />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md bg-fd-secondary p-2">
        <span className="size-2 rounded-full bg-fd-primary" />
        <span className="text-fd-muted-foreground text-[9px]">
          Same render, host theme tokens.
        </span>
      </div>
    </div>
  );
}
