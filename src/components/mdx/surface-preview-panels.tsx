"use client";

// The plugin and governance panels of the docs surface preview (see surface-preview.tsx).

import { ApprovalCard } from "@ryu/ui/components/agents/approval-card";
import {
  ToolResult,
  ToolResultOutput,
} from "@ryu/ui/components/agents/tool-result";
import { Badge } from "@ryu/ui/components/badge";
import { Button } from "@ryu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ryu/ui/components/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@ryu/ui/components/progress";
import { cn } from "@ryu/ui/lib/utils";
import { Check, Minus, Puzzle, ShieldCheck } from "lucide-react";

export function PluginSurface() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(13rem,0.9fr)]">
      <Card appearance="translucent">
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
        <CardContent spacing="relaxed">
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
        <CardFooter className="justify-end" spacing="actions">
          <Button size="sm" type="button" variant="outline">
            Review manifest
          </Button>
          <Button size="sm" type="button">
            Install plugin
          </Button>
        </CardFooter>
      </Card>

      <Card appearance="subtle">
        <CardHeader>
          <CardTitle>Permission preview</CardTitle>
          <CardDescription>Reviewable before install</CardDescription>
        </CardHeader>
        <CardContent spacing="compact">
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
            ? "bg-success/12 text-status-success"
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

export function GovernanceSurface() {
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
        <Card appearance="subtle">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="text-status-success"
                size={16}
              />
              <CardTitle>Gateway checks</CardTitle>
            </div>
            <CardDescription>Policy is visible at the edge</CardDescription>
          </CardHeader>
          <CardContent spacing="compact">
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
      <span className="inline-flex items-center gap-1.5 font-medium text-status-success">
        <span className="size-1.5 rounded-full bg-success" />
        {value}
      </span>
    </div>
  );
}
