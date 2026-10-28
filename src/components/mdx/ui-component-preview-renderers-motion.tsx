"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  type PreviewModule,
  type PreviewRenderer,
  view,
} from "./ui-component-preview-shared";

function TextMorphPreview({ module }: { module: PreviewModule }): ReactNode {
  const values = ["Ryu UI", "Agents ready", "Work stays yours"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % values.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [values.length]);

  return (
    <div className="flex flex-col items-center gap-2">
      <span aria-live="polite" className="text-2xl">
        {view(
          module,
          "TextMorph",
          { duration: 240, numbers: false },
          values[index],
        )}
      </span>
      <span className="text-muted-foreground text-xs">
        Cycles through representative text states.
      </span>
    </div>
  );
}

export const MOTION_BRAND_AND_AGENT_PREVIEW_RENDERERS = {
  "components/motion/action-swap-roll": (module) =>
    view(module, "ActionSwapRollButton", {
      cycle: true,
      defaultValue: "preview",
      items: [
        { id: "preview", label: "Preview" },
        { id: "source", label: "View source" },
      ],
    }),
  "components/apple-hello-effect": (module) =>
    view(module, "AppleHelloEffect", { text: "hello", className: "text-5xl" }),
  "components/motion/button/index": (module) =>
    view(module, "Button", { variant: "primary" }, "Animated button"),
  "components/motion/checkbox": (module) =>
    view(module, "Checkbox", {
      checked: true,
      label: "Motion-safe checkbox",
      onCheckedChange: () => undefined,
    }),
  "components/motion/chromatic-text-reveal": (module) =>
    view(module, "ChromaticTextReveal", {
      loop: true,
      prefix: "Build with ",
      startOnView: false,
      words: ["Ryu", "tokens", "components"],
    }),
  "components/icon-swap": (module) =>
    view(module, "IconSwap", {
      a: <span className="text-2xl">○</span>,
      b: <span className="text-2xl">●</span>,
      state: "a",
    }),
  "components/motion/input": (module) =>
    view(module, "Input", {
      defaultValue: "Ryu UI",
      label: "Workspace",
      placeholder: "Workspace",
    }),
  "components/motion/loader": (module) =>
    view(module, "Loader", {
      label: "Loading component preview",
      variant: "dots",
    }),
  "components/morph-icon": (module) =>
    view(module, "MorphIcon", {
      icon: "M4 6h16M4 12h16M4 18h16",
      label: "Menu",
      size: 32,
    }),
  "components/motion-highlight": (module) =>
    view(
      module,
      "Highlight",
      { className: "rounded-2xl bg-card p-3" },
      <span>Highlighted content</span>,
    ),
  "components/number-pop-in": (module) =>
    view(module, "NumberPopIn", {
      className: "text-4xl",
      value: 128,
    }),
  "components/number-ticker": (module) =>
    view(module, "NumberTicker", {
      className: "text-4xl",
      prefix: "$",
      startOnView: false,
      value: 1284,
    }),
  "components/motion/preview-rail": (module) =>
    view(module, "PreviewRail", {
      className: "min-h-40 w-full max-w-md",
      defaultActiveId: "tokens",
      items: [
        {
          description: "Shared colors and type.",
          id: "tokens",
          label: "Tokens",
        },
        {
          description: "Buttons, fields, and overlays.",
          id: "components",
          label: "Components",
        },
        {
          description: "Reduced-motion-safe transitions.",
          id: "motion",
          label: "Motion",
        },
      ],
    }),
  "components/progressive-blur": (module) => (
    <div className="relative h-32 w-full max-w-md overflow-hidden rounded-2xl bg-card p-4 text-sm">
      <p>Content under the edge blur remains readable while it scrolls.</p>
      {view(module, "ProgressiveBlur", { position: "bottom" })}
    </div>
  ),
  "components/motion/radio": (module) =>
    view(
      module,
      "RadioGroup",
      { defaultValue: "shared" },
      <>
        {view(module, "RadioGroupItem", {
          label: "Shared primitives",
          value: "shared",
        })}
        {view(module, "RadioGroupItem", {
          label: "Custom surface",
          value: "custom",
        })}
      </>,
    ),
  "components/rolling-number": (module) =>
    view(module, "RollingNumber", {
      className: "text-4xl",
      suffix: " runs",
      value: 128,
    }),
  "components/stagger-reveal": (module) =>
    view(
      module,
      "StaggerReveal",
      { className: "space-y-1 text-lg", wrap: true },
      <>
        <div>One shared contract.</div>
        <div>One semantic token layer.</div>
        <div>One rendered preview.</div>
      </>,
    ),
  "components/motion/text-scramble": (module) =>
    view(module, "TextScramble", { text: "Ryu UI primitives" }),
  "components/motion/text-shimmer": (module) =>
    view(
      module,
      "TextShimmer",
      { className: "text-2xl" },
      "Shared design system",
    ),
  "components/text-morph": (module) => <TextMorphPreview module={module} />,
  "components/text-swap": (module) =>
    view(module, "TextSwap", {}, "Rendered component"),
  "components/voice-activity-beam": (module) =>
    view(module, "VoiceActivityBeam", {
      active: true,
      className: "w-52",
      levels: [0.1, 0.3, 0.7, 0.45, 0.8, 0.25, 0.6, 0.35],
      theme: "dark",
    }),
  "components/wave": (module) =>
    view(module, "Wave", {
      barCount: 18,
      className: "h-10 w-52",
      levels: [0.2, 0.8, 0.45, 0.7, 0.3, 0.9],
    }),
  "components/dither-kit/avatar": (module) =>
    view(module, "DitherAvatar", { animate: true, name: "Ryu UI", size: 96 }),
  "components/button-download": (module) =>
    view(module, "DownloadButton", {
      downloadStatus: "downloading",
      onClick: () => undefined,
      progress: 64,
    }),
  "components/carousel": (module) =>
    view(
      module,
      "Carousel",
      { className: "w-full max-w-md", opts: { loop: true } },
      <>
        {view(
          module,
          "CarouselContent",
          {},
          <>
            {view(
              module,
              "CarouselItem",
              {},
              <div className="grid h-24 place-items-center rounded-2xl bg-card text-sm">
                First panel
              </div>,
            )}
            {view(
              module,
              "CarouselItem",
              {},
              <div className="grid h-24 place-items-center rounded-2xl bg-primary/10 text-primary text-sm">
                Second panel
              </div>,
            )}
          </>,
        )}
        {view(module, "CarouselPrevious")}
        {view(module, "CarouselNext")}
      </>,
    ),
  "components/employee-badge": (module) =>
    view(module, "EmployeeBadge", {
      employeeId: "RYU-UI",
      level: 12,
      name: "Ryu Agent",
      ringed: false,
      role: "UI system",
      stats: [
        { label: "Runs", value: "128" },
        { label: "Tools", value: "24" },
      ],
      still: true,
    }),
  "components/dither-kit/gradient": (module) =>
    view(module, "DitherGradient", {
      className: "h-32 w-full max-w-md rounded-2xl",
      direction: "up",
      from: "#0099ff",
      to: "transparent",
    }),
  "components/lanyard/Lanyard": (module) =>
    view(module, "Lanyard", { className: "h-48 w-full max-w-md" }),
  "components/logo": (module) =>
    view(module, "Logo", {
      animated: true,
      animation: "random",
      expression: "random",
      size: "240px",
      variant: "3d",
    }),
  "components/marker": (module) =>
    view(
      module,
      "Marker",
      { className: "w-full max-w-md", variant: "separator" },
      view(module, "MarkerContent", {}, "A marked section"),
    ),
  "components/plan-badge": (module) => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {view(module, "PlanBadge", { plan: "pro", size: "md" })}
      {view(module, "PlanBadge", { plan: "business", size: "md" })}
    </div>
  ),
  "components/signature": (module) =>
    view(module, "Signature", { inView: true, text: "Ryu UI" }),
  "components/agents/agent-activity": (module) =>
    view(module, "AgentActivity", {
      defaultOpen: true,
      duration: 8,
      items: [
        {
          id: "step-1",
          label: "Read component source",
          status: "complete",
          type: "step",
        },
        {
          id: "step-2",
          label: "Render live preview",
          status: "active",
          type: "step",
        },
      ],
      status: "working",
    }),
  "components/agents/agent-code": (module) =>
    view(module, "AgentCode", {
      className: "rounded-2xl bg-card p-4",
      code: 'import { Button } from "@ryu/ui/components/button";',
      language: "tsx",
    }),
  "components/agents/agent-disclosure": (module) =>
    view(
      module,
      "AgentDisclosure",
      { className: "w-full max-w-md", open: true },
      "Expanded agent detail",
    ),
  "components/agents/approval-card": (module) =>
    view(module, "ApprovalCard", {
      description: "This preview asks for a local UI decision.",
      questions: [
        {
          id: "surface",
          options: [
            { label: "Use shared primitive", value: "shared" },
            { label: "Keep local", value: "local" },
          ],
          title: "Which surface should own this control?",
        },
      ],
      title: "Design review",
    }),
  "components/agents/citations": (module) =>
    view(module, "Citations", {
      citations: [
        {
          domain: "docs.ryu.dev",
          id: "ui",
          title: "Ryu UI documentation",
          url: "#ui",
        },
        {
          domain: "github.com",
          id: "source",
          title: "Source module",
          url: "#source",
        },
      ],
      defaultOpen: true,
    }),
  "components/agents/code-block": (module) =>
    view(module, "CodeBlock", {
      className: "max-w-md",
      code: "<Button>Continue</Button>",
      filename: "example.tsx",
      language: "tsx",
      status: "complete",
    }),
  "components/agents/file-diff": (module) =>
    view(module, "FileDiff", {
      defaultOpen: true,
      file: "components/button.tsx",
      lines: [
        { content: "+ export { Button }", id: "1", type: "added" },
        { content: "  export type ButtonProps", id: "2", type: "context" },
      ],
      status: "complete",
    }),
  "components/agents/loading-states": (module) =>
    view(module, "AgentProgress", {
      elapsedSeconds: 6.4,
      label: "Rendering preview",
    }),
  "components/agents/message-scroller": (module) =>
    view(
      module,
      "MessageScroller",
      {
        className: "h-40 w-full max-w-md rounded-2xl bg-card p-3",
        showScrollToLatest: false,
      },
      <>
        {view(module, "MessageScrollerItem", {}, "Inspect the module")}
        {view(module, "MessageScrollerItem", {}, "Render the component")}
      </>,
    ),
  "components/agents/loading-states/thinking-shimmer": (module) =>
    view(module, "ThinkingShimmer", {}, "Thinking about the next component…"),
  "components/agents/todo-list": (module) =>
    view(module, "TodoList", {
      defaultOpen: true,
      items: [
        { id: "tokens", status: "completed", title: "Load design tokens" },
        {
          id: "preview",
          progress: 64,
          status: "in-progress",
          title: "Render component",
        },
        { id: "docs", status: "pending", title: "Read usage notes" },
      ],
    }),
  "components/agents/tool-approval": (module) =>
    view(module, "ToolApproval", {
      choices: [
        { id: "allow", label: "Allow", tone: "success" },
        { id: "deny", label: "Deny", tone: "danger" },
      ],
      defaultOpen: true,
      description: "The preview does not call a real tool.",
      parameters: [{ label: "Path", value: "packages/ui" }],
      title: "Allow component inspection?",
      tool: "read",
    }),
  "components/agents/tool-result": (module) =>
    view(module, "ToolResult", {
      children: view(
        module,
        "ToolResultOutput",
        {},
        "117 component modules indexed",
      ),
      kind: "terminal",
      status: "success",
      title: "Component catalog",
      tool: "read",
    }),
} satisfies Record<string, PreviewRenderer>;
