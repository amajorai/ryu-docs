"use client";

import {
  AgentActivity,
  type AgentActivityItem,
} from "@ryu/ui/components/agents/agent-activity";
import { ApprovalCard } from "@ryu/ui/components/agents/approval-card";
import { TodoList } from "@ryu/ui/components/agents/todo-list";
import {
  ToolResult,
  ToolResultOutput,
} from "@ryu/ui/components/agents/tool-result";
import { Badge } from "@ryu/ui/components/badge";
import { Bubble, BubbleContent } from "@ryu/ui/components/bubble";
import { Button } from "@ryu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ryu/ui/components/card";
import { Input } from "@ryu/ui/components/input";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@ryu/ui/components/message";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@ryu/ui/components/progress";
import { StatusBadge } from "@ryu/ui/components/status-badge";
import { cn } from "@ryu/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  CircleDot,
  GitBranch,
  MessageSquare,
  Minus,
  Puzzle,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

export type SurfacePreviewSurface =
  | "chat"
  | "governance"
  | "plugin"
  | "workflow";

export const SURFACE_PREVIEW_METADATA: Record<
  SurfacePreviewSurface,
  { label: string; source: string }
> = {
  chat: {
    label: "Chat workspace",
    source: "Message + Bubble + Input",
  },
  governance: {
    label: "Governance review",
    source: "ApprovalCard + ToolResult",
  },
  plugin: {
    label: "Plugin install",
    source: "Card + Progress + Button",
  },
  workflow: {
    label: "Workflow run",
    source: "TodoList + AgentActivity + ToolResult",
  },
};

const SURFACE_NAVIGATION: Array<{
  icon: LucideIcon;
  id: SurfacePreviewSurface;
  label: string;
}> = [
  { icon: MessageSquare, id: "chat", label: "Chat" },
  { icon: Workflow, id: "workflow", label: "Workflows" },
  { icon: Puzzle, id: "plugin", label: "Plugins" },
  { icon: ShieldCheck, id: "governance", label: "Approvals" },
];

const WORKFLOW_ACTIVITY: AgentActivityItem[] = [
  {
    id: "load-input",
    label: "Read release brief",
    status: "complete",
    type: "step",
  },
  {
    id: "run-checks",
    label: "Run compatibility checks",
    status: "complete",
    type: "step",
  },
];

export function SurfacePreview({
  surface,
}: {
  surface: SurfacePreviewSurface;
}) {
  const metadata = SURFACE_PREVIEW_METADATA[surface];
  const SurfaceIcon = SURFACE_NAVIGATION.find(
    (item) => item.id === surface,
  )?.icon;

  return (
    <figure
      className="not-prose my-8 overflow-hidden rounded-2xl bg-fd-secondary p-2 sm:p-3"
      data-surface={surface}
      data-testid="surface-preview"
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 sm:px-3">
        <span className="inline-flex items-center gap-2 font-medium text-fd-foreground text-xs">
          <span className="flex size-6 items-center justify-center rounded-lg bg-fd-background text-fd-primary">
            {SurfaceIcon ? <SurfaceIcon aria-hidden="true" size={14} /> : null}
          </span>
          {metadata.label}
        </span>
        <span className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-[0.12em]">
          Live UI composition
        </span>
      </figcaption>

      <div className="overflow-hidden rounded-xl bg-background text-foreground">
        <div className="flex items-center gap-2 bg-muted/70 px-3 py-2">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="size-1.5 rounded-full bg-destructive/70" />
            <span className="size-1.5 rounded-full bg-warning/80" />
            <span className="size-1.5 rounded-full bg-success/80" />
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
            Ryu Console
          </span>
          <Badge className="hidden sm:inline-flex" variant="secondary">
            @ryu/ui
          </Badge>
        </div>

        <div className="grid min-h-[320px] sm:grid-cols-[10rem_minmax(0,1fr)]">
          <PreviewSidebar active={surface} />
          <div className="min-w-0 p-3 sm:p-5">{renderSurface(surface)}</div>
        </div>
      </div>

      <p className="m-0 px-2 pt-2 text-fd-muted-foreground text-xs sm:px-3">
        Composed from {metadata.source}. The preview is local and read-only. It
        does not call a provider or write application data.
      </p>
    </figure>
  );
}

function PreviewSidebar({ active }: { active: SurfacePreviewSurface }) {
  return (
    <aside
      aria-label="Preview navigation"
      className="hidden bg-muted/55 p-3 sm:block"
    >
      <div className="mb-5 flex items-center gap-2 text-foreground text-xs">
        <span className="flex size-6 items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground">
          R
        </span>
        <span className="font-medium">Ryu</span>
      </div>

      <nav className="space-y-1">
        {SURFACE_NAVIGATION.map((item) => {
          const Icon = item.icon;
          const selected = item.id === active;
          return (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs",
                selected
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground",
              )}
              key={item.id}
            >
              <Icon aria-hidden="true" size={14} />
              <span>{item.label}</span>
              {selected ? (
                <CircleDot
                  aria-hidden="true"
                  className="ml-auto text-primary"
                  size={10}
                />
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-8 rounded-lg bg-background/75 p-2.5 text-[10px]">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Local node
        </div>
        <p className="mt-1.5 mb-0 text-muted-foreground">Connected</p>
      </div>
    </aside>
  );
}

function renderSurface(surface: SurfacePreviewSurface): ReactNode {
  if (surface === "chat") {
    return <ChatSurface />;
  }
  if (surface === "workflow") {
    return <WorkflowSurface />;
  }
  if (surface === "plugin") {
    return <PluginSurface />;
  }
  return <GovernanceSurface />;
}

function ChatSurface() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 font-medium text-sm">Release planning</p>
          <p className="mt-1 mb-0 text-muted-foreground text-xs">
            Ryu Agent · local node
          </p>
        </div>
        <StatusBadge kind="active" label="Running on local node" />
      </div>

      <MessageGroup className="gap-3">
        <Message>
          <MessageAvatar className="bg-primary/10 text-primary text-xs">
            R
          </MessageAvatar>
          <MessageContent>
            <MessageHeader className="px-0">Ryu Agent · just now</MessageHeader>
            <Bubble variant="secondary">
              <BubbleContent>
                I found three release checks and grouped them into one safe run.
              </BubbleContent>
            </Bubble>
            <MessageFooter className="px-0">2 steps · 8s</MessageFooter>
          </MessageContent>
        </Message>

        <Message align="end">
          <MessageContent>
            <Bubble align="end" variant="default">
              <BubbleContent>Run the read-only pass first.</BubbleContent>
            </Bubble>
            <MessageFooter className="px-0">You · delivered</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>

      <div className="flex items-center gap-2 rounded-3xl bg-muted p-1.5">
        <Input
          aria-label="Message composer preview"
          className="border-0 bg-transparent shadow-none"
          placeholder="Ask the agent..."
        />
        <Button
          aria-label="Send message"
          className="size-8 rounded-full"
          size="icon"
          type="button"
        >
          <ArrowRight aria-hidden="true" size={14} />
        </Button>
      </div>
    </div>
  );
}

function WorkflowSurface() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 font-medium text-sm">Release helper</p>
          <p className="mt-1 mb-0 text-muted-foreground text-xs">
            Input → checks → report
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind="active" label="Completed" />
          <Button size="sm" type="button" variant="outline">
            Run now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(13rem,0.9fr)]">
        <Card className="bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Run graph</CardTitle>
              <GitBranch
                aria-hidden="true"
                className="text-muted-foreground"
                size={15}
              />
            </div>
            <CardDescription>
              Three typed nodes in a durable run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
              <MiniNode label="Input" detail="brief" />
              <ArrowRight
                aria-hidden="true"
                className="text-muted-foreground"
                size={14}
              />
              <MiniNode label="Checks" detail="agent" active />
              <ArrowRight
                aria-hidden="true"
                className="text-muted-foreground"
                size={14}
              />
              <MiniNode label="Report" detail="output" />
            </div>
            <Progress className="mt-5" value={68}>
              <ProgressLabel>Run progress</ProgressLabel>
              <ProgressValue />
            </Progress>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <TodoList
            collapseOnComplete={false}
            defaultOpen
            items={[
              { id: "input", status: "completed", title: "Read release brief" },
              {
                id: "checks",
                status: "in-progress",
                title: "Run compatibility checks",
                progress: 68,
              },
              { id: "report", status: "pending", title: "Write report" },
            ]}
            title="Run steps"
          />
          <AgentActivity
            collapseOnComplete={false}
            defaultOpen
            duration={8}
            items={WORKFLOW_ACTIVITY}
            status="complete"
          />
        </div>
      </div>

      <ToolResult
        defaultOpen
        kind="terminal"
        status="success"
        title="Compatibility checks"
        tool="read"
      >
        <ToolResultOutput language="bash">
          {"3 checks passed\n0 files changed"}
        </ToolResultOutput>
      </ToolResult>
    </div>
  );
}

function MiniNode({
  active = false,
  detail,
  label,
}: {
  active?: boolean;
  detail: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl bg-muted/70 px-2 py-2.5 text-center",
        active && "bg-primary/10 ring-1 ring-primary/30",
      )}
    >
      <p className="m-0 truncate font-medium text-xs">{label}</p>
      <p className="mt-1 mb-0 truncate font-mono text-[10px] text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function PluginSurface() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(13rem,0.9fr)]">
      <Card className="bg-card/80">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Puzzle aria-hidden="true" size={19} />
              </span>
              <div>
                <CardTitle>Release helper</CardTitle>
                <CardDescription>Plugin · v0.4.0</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Ready</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="m-0 text-muted-foreground text-sm">
            Draft release notes from the workspace, then ask before anything
            leaves the node.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">agent</Badge>
            <Badge variant="outline">read-only</Badge>
            <Badge variant="outline">Gateway required</Badge>
          </div>
          <Progress value={72}>
            <ProgressLabel>Install checks</ProgressLabel>
            <ProgressValue />
          </Progress>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button size="sm" type="button" variant="outline">
            Review manifest
          </Button>
          <Button size="sm" type="button">
            Install plugin
          </Button>
        </CardFooter>
      </Card>

      <Card className="bg-muted/55">
        <CardHeader>
          <CardTitle>Permission preview</CardTitle>
          <CardDescription>Reviewable before install</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <PermissionRow label="Read workspace files" />
          <PermissionRow label="Call Gateway" />
          <PermissionRow label="Write files" allowed={false} />
        </CardContent>
      </Card>
    </div>
  );
}

function PermissionRow({
  allowed = true,
  label,
}: {
  allowed?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background/70 px-2.5 py-2 text-xs">
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full",
          allowed
            ? "bg-success/12 text-success"
            : "bg-muted text-muted-foreground",
        )}
      >
        {allowed ? (
          <Check aria-hidden="true" size={12} />
        ) : (
          <>
            <Minus aria-hidden="true" size={12} />
            <span className="sr-only">Not granted</span>
          </>
        )}
      </span>
      <span className={cn(!allowed && "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function GovernanceSurface() {
  return (
    <div className="space-y-4">
      <ApprovalCard
        description="The agent wants to read the release workspace before drafting a report."
        questions={[
          {
            id: "scope",
            options: [
              { label: "This run only", value: "once" },
              { label: "Allow for this agent", value: "agent" },
            ],
            title: "How should this request be allowed?",
          },
        ]}
        title="Review workspace access"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-muted/55">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="text-success"
                size={16}
              />
              <CardTitle>Gateway checks</CardTitle>
            </div>
            <CardDescription>Policy is visible at the edge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusLine label="Firewall" value="Passed" />
            <StatusLine label="Budget" value="Within limit" />
            <StatusLine label="Audit" value="Recorded" />
          </CardContent>
        </Card>

        <ToolResult
          defaultOpen
          kind="request"
          status="success"
          title="Read"
          tool="fs"
        >
          <ToolResultOutput language="json">
            {'{"files": 12, "mutations": 0}'}
          </ToolResultOutput>
        </ToolResult>
      </div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-2.5 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-medium text-success">
        <span className="size-1.5 rounded-full bg-success" />
        {value}
      </span>
    </div>
  );
}
