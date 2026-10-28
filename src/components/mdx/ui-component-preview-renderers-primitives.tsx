import { ArrowUpRight } from "lucide-react";
import { type PreviewRenderer, view } from "./ui-component-preview-shared";

const ACTIVITY_DATA = [
  { count: 6, day: "2026-08-18" },
  { count: 12, day: "2026-08-19" },
  { count: 9, day: "2026-08-20" },
  { count: 18, day: "2026-08-21" },
  { count: 14, day: "2026-08-22" },
  { count: 24, day: "2026-08-23" },
  { count: 20, day: "2026-08-24" },
  { count: 31, day: "2026-08-25" },
  { count: 26, day: "2026-08-26" },
  { count: 36, day: "2026-08-27" },
];

export const PRIMITIVE_PREVIEW_RENDERERS = {
  "components/alert": (module) => (
    <div className="w-full max-w-md">
      {view(
        module,
        "Alert",
        { variant: "success" },
        <>
          {view(module, "AlertTitle", {}, "Connected")}
          {view(
            module,
            "AlertDescription",
            {},
            "The shared Ryu UI token contract is active.",
          )}
        </>,
      )}
    </div>
  ),
  "components/aspect-ratio": (module) =>
    view(
      module,
      "AspectRatio",
      { className: "w-full max-w-sm", ratio: 16 / 9 },
      <div className="grid size-full place-items-center rounded-2xl bg-primary/10 text-primary text-sm">
        16:9 surface
      </div>,
    ),
  "components/award-badge": (module) =>
    view(module, "AwardBadge", {
      place: 1,
      type: "product-of-the-day",
    }),
  "components/badge": (module) =>
    view(module, "Badge", { variant: "secondary" }, "Ready"),
  "components/bouncy-accordion": (module) =>
    view(module, "BouncyAccordion", {
      className: "w-full max-w-md",
      defaultValue: "tokens",
      items: [
        {
          description: "Use semantic colors and shared interaction states.",
          id: "tokens",
          title: "Semantic tokens",
        },
        {
          description: "Compose related slots when a primitive has them.",
          id: "composition",
          title: "Composition",
        },
      ],
    }),
  "components/button": (module) =>
    view(
      module,
      "Button",
      {},
      <>
        Continue
        <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
      </>,
    ),
  "components/checkbox": (module) =>
    view(module, "Checkbox", {
      "aria-label": "Enable notifications",
      defaultChecked: true,
    }),
  "components/connection-status": (module) =>
    view(module, "ConnectionStatusToast", {
      nodeName: "Design node",
      onRetry: () => undefined,
      phase: "node-unreachable",
    }),
  "components/elastic-slider": (module) =>
    view(module, "ElasticSlider", {
      "aria-label": "Temperature",
      defaultValue: 0.64,
      label: "Temperature",
      max: 1,
      min: 0,
      step: 0.01,
    }),
  "components/input": (module) =>
    view(module, "Input", {
      className: "w-full max-w-sm",
      placeholder: "Search components",
    }),
  "components/kbd": (module) =>
    view(
      module,
      "KbdGroup",
      {},
      <>
        {view(module, "Kbd", {}, "⌘")}
        {view(module, "Kbd", {}, "K")}
      </>,
    ),
  "components/label": (module) => (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {view(module, "Label", { htmlFor: "ui-preview-name" }, "Workspace name")}
      <input
        className="h-9 rounded-3xl bg-input/50 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        defaultValue="Ryu UI"
        id="ui-preview-name"
      />
    </div>
  ),
  "components/marketplace-access-badge": (module) =>
    view(module, "MarketplaceAccessBadge", {
      membershipEntitled: true,
      membershipIncluded: true,
    }),
  "components/native-select": (module) =>
    view(
      module,
      "NativeSelect",
      {
        "aria-label": "Choose a layer",
        className: "w-full max-w-xs",
        defaultValue: "ui",
      },
      <>
        {view(module, "NativeSelectOption", { value: "ui" }, "Ryu UI")}
        {view(module, "NativeSelectOption", { value: "blocks" }, "Ryu Blocks")}
        {view(module, "NativeSelectOption", { value: "app" }, "App layer")}
      </>,
    ),
  "components/profile-charts": (module) =>
    view(module, "ActivityArea", { data: ACTIVITY_DATA }),
  "components/progress": (module) =>
    view(
      module,
      "Progress",
      { className: "w-full max-w-sm", value: 64 },
      <>
        {view(module, "ProgressLabel", {}, "Indexing files")}
        {view(module, "ProgressValue", {}, "64%")}
      </>,
    ),
  "components/radio-group": (module) =>
    view(
      module,
      "RadioGroup",
      { className: "w-full max-w-sm", defaultValue: "shared" },
      <>
        {view(
          module,
          "RadioGroupItem",
          { value: "shared" },
          "Shared primitives",
        )}
        {view(module, "RadioGroupItem", { value: "custom" }, "Custom surface")}
      </>,
    ),
  "components/run-status-timeline": (module) => {
    const endAt = Date.parse("2026-08-30T12:00:00.000Z");
    const startAt = endAt - 24 * 60 * 60 * 1000;
    return (
      <div className="flex w-full max-w-xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-sm">Last 24 hours</span>
          {view(module, "RunStatusTimelineLegend", {
            statuses: ["success", "failure", "scheduled"],
          })}
        </div>
        {view(module, "RunStatusTimeline", {
          ariaLabel: "Example run status for the last 24 hours",
          endAt,
          entries: [
            {
              endAt: startAt + 5 * 60 * 60 * 1000 + 12 * 60 * 1000,
              id: "preview-success",
              label: "Morning digest · Succeeded · 05:00",
              startAt: startAt + 5 * 60 * 60 * 1000,
              status: "success",
            },
            {
              endAt: startAt + 13 * 60 * 60 * 1000 + 6 * 60 * 1000,
              id: "preview-failure",
              label: "Health check · Failed · 13:00",
              startAt: startAt + 13 * 60 * 60 * 1000,
              status: "failure",
            },
            {
              id: "preview-scheduled",
              label: "Weekly report · Scheduled · next run",
              startAt: startAt + 19 * 60 * 60 * 1000,
              status: "scheduled",
            },
          ],
          showScale: true,
          startAt,
        })}
      </div>
    );
  },
  "components/scroll-area": (module) =>
    view(
      module,
      "ScrollArea",
      { className: "h-28 w-full max-w-sm rounded-2xl bg-card p-3" },
      <div className="space-y-3 text-sm">
        <p>Scrollable content stays inside its surface.</p>
        <p>Keyboard focus and wheel input use the shared primitive.</p>
        <p>More content is available below this line.</p>
        <p className="text-muted-foreground">End of preview.</p>
      </div>,
    ),
  "components/select": (module) =>
    view(
      module,
      "Select",
      { defaultValue: "ui" },
      <>
        {view(
          module,
          "SelectTrigger",
          {
            "aria-label": "Choose a package",
            className: "w-48",
            variant: "default",
          },
          view(module, "SelectValue", { placeholder: "Choose a package" }),
        )}
        {view(
          module,
          "SelectContent",
          {},
          <>
            {view(module, "SelectItem", { value: "ui" }, "@ryu/ui")}
            {view(module, "SelectItem", { value: "blocks" }, "@ryu/blocks")}
            {view(module, "SelectItem", { value: "host" }, "@ryu/app-host")}
          </>,
        )}
      </>,
    ),
  "components/separator": (module) => (
    <div className="flex w-full max-w-sm flex-col gap-3 text-muted-foreground text-sm">
      <span>Before composition</span>
      {view(module, "Separator")}
      <span>After composition</span>
    </div>
  ),
  "components/sileo": (module) => {
    const notify =
      "toast" in module ? () => module.toast.success("Saved") : undefined;
    return (
      <>
        {view(module, "Toaster")}
        <button
          className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
          onClick={notify}
          type="button"
        >
          Show toast
        </button>
      </>
    );
  },
  "components/skeleton": (module) =>
    view(module, "Skeleton", { className: "h-4 w-40" }),
  "components/slider": (module) =>
    view(module, "Slider", {
      className: "w-full max-w-sm",
      defaultValue: [36, 72],
      max: 100,
      min: 0,
      step: 1,
    }),
  "components/spinner": (module) => view(module, "Spinner"),
  "components/status-badge": (module) =>
    view(module, "StatusBadge", { kind: "active" }),
  "components/success-check": (module) =>
    view(module, "SuccessCheck", { className: "size-12 text-status-success" }),
  "components/switch": (module) =>
    view(module, "Switch", {
      "aria-label": "Enable notifications",
      defaultChecked: true,
    }),
  "components/textarea": (module) =>
    view(module, "Textarea", {
      className: "min-h-24 w-full max-w-sm",
      placeholder: "Write a note",
    }),
  "components/visually-hidden-input": (module) => (
    <div className="max-w-sm text-center text-muted-foreground text-sm">
      <span>VisuallyHiddenInput is mounted below this explanation.</span>
      {view(module, "VisuallyHiddenInput", {
        control: null,
        name: "ui-preview-hidden-input",
        type: "hidden",
        value: "preview",
      })}
    </div>
  ),
} satisfies Record<string, PreviewRenderer>;
