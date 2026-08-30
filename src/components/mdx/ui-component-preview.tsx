"use client";

import { ArrowUpRight } from "lucide-react";
import {
  Component,
  createElement,
  type ElementType,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { UI_COMPONENT_MODULE_LOADERS } from "./ui-component-modules.generated";
import {
  UI_COMPONENT_PREVIEW_METADATA,
  type UiComponentPreviewMetadata,
} from "./ui-component-preview-metadata.generated";

type PreviewModule = Record<string, unknown>;

type PreviewRenderer = (module: PreviewModule) => ReactNode;

type PreviewState =
  | { error: Error; status: "error" }
  | { module: PreviewModule; status: "ready" }
  | { status: "loading" };

type UiComponentPreviewProps = {
  component: string;
  exportName: string;
  mode?: PreviewMode;
};

type PreviewMode = "default" | "settings" | "variants";

const PREVIEW_SETTING_ORDER = [
  "variant",
  "size",
  "disabled",
  "loading",
  "state",
  "status",
  "kind",
  "theme",
  "orientation",
  "direction",
  "position",
  "side",
  "align",
  "mode",
  "defaultChecked",
  "defaultOpen",
  "defaultPressed",
  "loop",
];

const PREVIEW_VARIANT_PROPERTIES = new Set([
  "align",
  "direction",
  "kind",
  "mode",
  "orientation",
  "position",
  "side",
  "size",
  "state",
  "status",
  "theme",
  "variant",
]);

const ICON_BUTTON_COMPONENTS = new Set([
  "components/button",
  "components/motion/button/index",
]);

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

const CONTRIBUTION_DATA = Array.from({ length: 42 }, (_, index) => ({
  count: (index * 7 + 3) % 8,
  day: `2026-07-${String(index + 1).padStart(2, "0")}`,
}));

function resolveComponent(
  module: PreviewModule,
  exportName: string,
): ElementType | null {
  const candidate = module[exportName] ?? module.default;
  if (typeof candidate === "function") {
    return candidate as ElementType;
  }
  if (typeof candidate === "object" && candidate !== null) {
    return candidate as ElementType;
  }
  return null;
}

function view(
  module: PreviewModule,
  exportName: string,
  props: Record<string, unknown> = {},
  children?: ReactNode,
): ReactNode {
  const ComponentType = resolveComponent(module, exportName);
  if (!ComponentType) {
    return (
      <span className="text-muted-foreground text-sm">
        Export <code>{exportName}</code> is not available in this module.
      </span>
    );
  }
  return children === undefined
    ? createElement(ComponentType, props)
    : createElement(ComponentType, props, children);
}

function renderFallback(module: PreviewModule, exportName: string): ReactNode {
  return (
    <div className="flex min-h-12 items-center justify-center rounded-2xl bg-card px-4 py-3 text-center">
      {view(module, exportName, { className: "max-w-full" }, "Preview")}
    </div>
  );
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function previewValue(value: string): unknown {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}

function previewChildren(
  component: string,
  props: Record<string, unknown>,
  label = "Preview",
): ReactNode {
  const size = props.size;
  if (typeof size === "string" && size.startsWith("icon")) {
    return <ArrowUpRight aria-hidden="true" />;
  }
  if (ICON_BUTTON_COMPONENTS.has(component)) {
    return (
      <>
        {label}
        <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
      </>
    );
  }
  return label;
}

function previewTarget(
  component: string,
  module: PreviewModule,
  metadata: UiComponentPreviewMetadata,
  props: Record<string, unknown>,
  label = "Preview",
): ReactNode {
  return view(
    module,
    metadata.targetExport,
    props,
    previewChildren(component, props, label),
  );
}

function previewSettingEntries(
  metadata: UiComponentPreviewMetadata,
): Array<[string, string[]]> {
  return PREVIEW_SETTING_ORDER.flatMap((property) => {
    const options = metadata.props[property];
    return options && options.length > 1
      ? [[property, options] as [string, string[]]]
      : [];
  }).slice(0, 6);
}

function PreviewNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-12 w-full max-w-2xl items-center justify-center rounded-2xl bg-card px-4 py-3 text-center text-muted-foreground text-sm">
      {children}
    </div>
  );
}

function PreviewVariantSample({
  component,
  metadata,
  module,
  property,
  value,
}: {
  component: string;
  metadata: UiComponentPreviewMetadata;
  module: PreviewModule;
  property: string;
  value: string;
}) {
  const props = { [property]: previewValue(value) };
  const content =
    component === "components/avatar"
      ? view(
          module,
          metadata.targetExport,
          props,
          view(module, "AvatarFallback", {}, "RY"),
        )
      : previewTarget(component, module, metadata, props);

  return (
    <div className="flex min-h-20 flex-col items-center justify-center gap-3 rounded-2xl bg-card px-3 py-4">
      <span className="text-muted-foreground text-xs">{humanize(value)}</span>
      <PreviewErrorBoundary key={`${component}-${property}-${value}`}>
        {content}
      </PreviewErrorBoundary>
    </div>
  );
}

function PreviewVariants({
  component,
  exportName,
  metadata,
  module,
}: {
  component: string;
  exportName: string;
  metadata: UiComponentPreviewMetadata;
  module: PreviewModule;
}) {
  const entries = previewSettingEntries(metadata).filter(([property]) =>
    PREVIEW_VARIANT_PROPERTIES.has(property),
  );

  if (entries.length === 0) {
    return (
      <PreviewNotice>
        No named variants or sizes are declared by <code>{exportName}</code>.
      </PreviewNotice>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {entries.map(([property, options]) => (
        <section className="flex flex-col gap-3" key={property}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-medium text-sm">{humanize(property)}</h3>
            <span className="text-muted-foreground text-xs">
              {options.length} options
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((value) => (
              <PreviewVariantSample
                component={component}
                key={`${property}-${value}`}
                metadata={metadata}
                module={module}
                property={property}
                value={value}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PreviewSettings({
  component,
  exportName,
  metadata,
  module,
}: {
  component: string;
  exportName: string;
  metadata: UiComponentPreviewMetadata;
  module: PreviewModule;
}) {
  const entries = previewSettingEntries(metadata);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      entries.map(([property, options]) => [
        property,
        options.includes("default") ? "default" : (options[0] ?? ""),
      ]),
    ),
  );

  if (entries.length === 0) {
    return (
      <PreviewNotice>
        No named settings are declared by <code>{exportName}</code>. Interact
        with the preview above to explore its behavior.
      </PreviewNotice>
    );
  }

  const props = Object.fromEntries(
    entries.map(([property, options]) => [
      property,
      previewValue(selected[property] ?? options[0] ?? ""),
    ]),
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid gap-3 rounded-2xl bg-card p-4 sm:grid-cols-2">
        {entries.map(([property, options]) => {
          const id = `ui-preview-${component.replaceAll("/", "-")}-${property}`;
          return (
            <label
              className="flex flex-col gap-2 text-sm"
              htmlFor={id}
              key={property}
            >
              <span className="font-medium">{humanize(property)}</span>
              <select
                className="h-9 rounded-xl bg-background px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                id={id}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setSelected((current) => ({
                    ...current,
                    [property]: value,
                  }));
                }}
                value={selected[property] ?? options[0]}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {humanize(option)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <div className="flex min-h-24 items-center justify-center rounded-2xl bg-card p-6">
        <PreviewErrorBoundary key={`${component}-${JSON.stringify(selected)}`}>
          {previewTarget(component, module, metadata, props)}
        </PreviewErrorBoundary>
      </div>
    </div>
  );
}

const PREVIEW_RENDERERS: Record<string, PreviewRenderer> = {
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
    const api = module.toast;
    const success =
      typeof api === "object" && api !== null
        ? (api as { success?: (message: string) => unknown }).success
        : undefined;
    const notify =
      typeof success === "function" ? () => success("Saved") : undefined;
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
    view(module, "SuccessCheck", { className: "size-12 text-success" }),
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
  "components/accordion": (module) =>
    view(
      module,
      "Accordion",
      { className: "w-full max-w-md", defaultValue: ["tokens"] },
      <>
        {view(
          module,
          "AccordionItem",
          { value: "tokens" },
          <>
            {view(module, "AccordionTrigger", {}, "Semantic tokens")}
            {view(
              module,
              "AccordionContent",
              {},
              <p className="pb-4 text-muted-foreground text-sm">
                Use semantic utilities so themes can change without rewriting
                component code.
              </p>,
            )}
          </>,
        )}
        {view(
          module,
          "AccordionItem",
          { value: "composition" },
          <>
            {view(module, "AccordionTrigger", {}, "Composable slots")}
            {view(
              module,
              "AccordionContent",
              {},
              <p className="pb-4 text-muted-foreground text-sm">
                Compose the named parts exported by the module when you need
                more structure.
              </p>,
            )}
          </>,
        )}
      </>,
    ),
  "components/breadcrumb": (module) =>
    view(
      module,
      "Breadcrumb",
      {},
      view(
        module,
        "BreadcrumbList",
        {},
        <>
          {view(
            module,
            "BreadcrumbItem",
            {},
            view(module, "BreadcrumbLink", { href: "#" }, "Docs"),
          )}
          {view(module, "BreadcrumbSeparator")}
          {view(
            module,
            "BreadcrumbItem",
            {},
            view(module, "BreadcrumbPage", {}, "UI"),
          )}
        </>,
      ),
    ),
  "components/card": (module) =>
    view(
      module,
      "Card",
      { className: "w-full max-w-sm" },
      <>
        {view(
          module,
          "CardHeader",
          {},
          <>
            {view(module, "CardTitle", {}, "Shared surface")}
            {view(module, "CardDescription", {}, "A composed Ryu UI card.")}
          </>,
        )}
        {view(
          module,
          "CardContent",
          {},
          "Content stays inside the shared spacing contract.",
        )}
        {view(module, "CardFooter", {}, "Footer")}
      </>,
    ),
  "components/collapsible": (module) =>
    view(
      module,
      "Collapsible",
      { className: "w-full max-w-sm", defaultOpen: true },
      <>
        {view(
          module,
          "CollapsibleTrigger",
          { className: "rounded-full bg-muted px-3 py-2 text-sm" },
          "Details",
        )}
        {view(
          module,
          "CollapsibleContent",
          { className: "pt-3 text-muted-foreground text-sm" },
          "This content can be opened and closed.",
        )}
      </>,
    ),
  "components/empty": (module) =>
    view(
      module,
      "Empty",
      { className: "w-full max-w-sm" },
      <>
        {view(
          module,
          "EmptyHeader",
          {},
          view(module, "EmptyTitle", {}, "No runs yet"),
        )}
        {view(
          module,
          "EmptyDescription",
          {},
          "Start a run to see activity here.",
        )}
      </>,
    ),
  "components/item": (module) =>
    view(
      module,
      "Item",
      { className: "w-full max-w-sm" },
      <>
        {view(
          module,
          "ItemContent",
          {},
          <>
            {view(module, "ItemTitle", {}, "Ryu UI")}
            {view(module, "ItemDescription", {}, "Shared primitives")}
          </>,
        )}
        {view(module, "ItemActions", {}, "Open")}
      </>,
    ),
  "components/motion-navigation-menu": (module) =>
    view(
      module,
      "MotionNavigationMenu",
      { className: "w-full justify-center" },
      view(
        module,
        "MotionNavigationMenuList",
        {},
        view(
          module,
          "MotionNavigationMenuItem",
          { value: "layers" },
          <>
            {view(module, "MotionNavigationMenuTrigger", {}, "Layers")}
            {view(
              module,
              "MotionNavigationMenuContent",
              {},
              <div className="p-4 text-sm">UI, blocks, and host seams.</div>,
            )}
          </>,
        ),
      ),
    ),
  "components/navigation-menu": (module) =>
    view(
      module,
      "NavigationMenu",
      {},
      view(
        module,
        "NavigationMenuList",
        {},
        view(
          module,
          "NavigationMenuItem",
          {},
          <>
            {view(module, "NavigationMenuTrigger", {}, "Layers")}
            {view(
              module,
              "NavigationMenuContent",
              {},
              view(
                module,
                "NavigationMenuLink",
                { href: "#" },
                "Shared UI package",
              ),
            )}
          </>,
        ),
      ),
    ),
  "components/page-header": (module) =>
    view(module, "PageHeader", {
      className: "w-full max-w-md",
      subtitle: "Semantic components for every Ryu surface.",
      title: "Ryu UI",
    }),
  "components/pagination": (module) =>
    view(
      module,
      "Pagination",
      {},
      view(
        module,
        "PaginationContent",
        {},
        <>
          {view(
            module,
            "PaginationItem",
            {},
            view(module, "PaginationPrevious", { href: "#" }),
          )}
          {view(
            module,
            "PaginationItem",
            {},
            view(module, "PaginationLink", { href: "#", isActive: true }, "1"),
          )}
          {view(
            module,
            "PaginationItem",
            {},
            view(module, "PaginationLink", { href: "#" }, "2"),
          )}
          {view(
            module,
            "PaginationItem",
            {},
            view(module, "PaginationNext", { href: "#" }),
          )}
        </>,
      ),
    ),
  "components/resizable": (module) =>
    view(
      module,
      "ResizablePanelGroup",
      {
        className: "h-28 w-full max-w-md rounded-2xl bg-card",
        direction: "horizontal",
      },
      <>
        {view(
          module,
          "ResizablePanel",
          { defaultSize: 50 },
          <div className="grid size-full place-items-center text-sm">
            Panel A
          </div>,
        )}
        {view(module, "ResizableHandle", { withHandle: true })}
        {view(
          module,
          "ResizablePanel",
          { defaultSize: 50 },
          <div className="grid size-full place-items-center text-sm">
            Panel B
          </div>,
        )}
      </>,
    ),
  "components/sidebar": (module) =>
    view(
      module,
      "SidebarProvider",
      { className: "h-44 min-h-44 w-full max-w-md", defaultOpen: true },
      view(
        module,
        "Sidebar",
        { className: "relative h-full", collapsible: "none" },
        <>
          {view(module, "SidebarHeader", {}, "Ryu UI")}
          {view(
            module,
            "SidebarContent",
            {},
            view(
              module,
              "SidebarGroup",
              {},
              <>
                {view(module, "SidebarGroupLabel", {}, "Components")}
                {view(
                  module,
                  "SidebarGroupContent",
                  {},
                  view(
                    module,
                    "SidebarMenu",
                    {},
                    view(
                      module,
                      "SidebarMenuItem",
                      {},
                      view(module, "SidebarMenuButton", {}, "Primitives"),
                    ),
                  ),
                )}
              </>,
            ),
          )}
        </>,
      ),
    ),
  "components/tabs": (module) =>
    view(
      module,
      "Tabs",
      { className: "w-full max-w-md", defaultValue: "components" },
      <>
        {view(
          module,
          "TabsList",
          {},
          <>
            {view(module, "TabsTrigger", { value: "components" }, "Components")}
            {view(module, "TabsTrigger", { value: "tokens" }, "Tokens")}
          </>,
        )}
        {view(
          module,
          "TabsContent",
          { value: "components" },
          "Shared controls and composed primitives.",
        )}
        {view(
          module,
          "TabsContent",
          { value: "tokens" },
          "Semantic colors, type, and motion.",
        )}
      </>,
    ),
  "components/tabs-subtle": (module) =>
    view(
      module,
      "TabsSubtle",
      {
        className: "w-full max-w-md",
        onSelect: () => undefined,
        selectedIndex: 0,
      },
      <>
        {view(module, "TabsSubtleItem", { index: 0, label: "Components" })}
        {view(module, "TabsSubtleItem", { index: 1, label: "Themes" })}
      </>,
    ),
  "components/alert-dialog": (module) =>
    view(
      module,
      "AlertDialog",
      {},
      <>
        {view(
          module,
          "AlertDialogTrigger",
          {
            className:
              "rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm",
          },
          "Delete draft",
        )}
        {view(
          module,
          "AlertDialogContent",
          {},
          <>
            {view(
              module,
              "AlertDialogHeader",
              {},
              <>
                {view(module, "AlertDialogTitle", {}, "Delete draft?")}
                {view(
                  module,
                  "AlertDialogDescription",
                  {},
                  "This is a local preview. No data is changed.",
                )}
              </>,
            )}
            {view(
              module,
              "AlertDialogFooter",
              {},
              <>
                {view(module, "AlertDialogCancel", {}, "Cancel")}
                {view(module, "AlertDialogAction", {}, "Delete")}
              </>,
            )}
          </>,
        )}
      </>,
    ),
  "components/command": (module) =>
    view(
      module,
      "Command",
      { className: "h-44 w-full max-w-sm bg-card" },
      <>
        {view(module, "CommandInput", { placeholder: "Search commands" })}
        {view(
          module,
          "CommandList",
          {},
          view(
            module,
            "CommandGroup",
            { heading: "Suggestions" },
            <>
              {view(module, "CommandItem", {}, "Open UI docs")}
              {view(module, "CommandItem", {}, "Change theme")}
            </>,
          ),
        )}
      </>,
    ),
  "components/context-menu": (module) =>
    view(
      module,
      "ContextMenu",
      {},
      <>
        {view(
          module,
          "ContextMenuTrigger",
          { className: "rounded-2xl bg-card px-5 py-4 text-sm" },
          "Right-click this surface",
        )}
        {view(
          module,
          "ContextMenuContent",
          {},
          <>
            {view(module, "ContextMenuLabel", {}, "Actions")}
            {view(module, "ContextMenuItem", {}, "Copy import")}
            {view(module, "ContextMenuItem", {}, "Open source")}
          </>,
        )}
      </>,
    ),
  "components/dialog": (module) =>
    view(
      module,
      "Dialog",
      {},
      <>
        {view(
          module,
          "DialogTrigger",
          {
            className:
              "rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm",
          },
          "Open dialog",
        )}
        {view(
          module,
          "DialogContent",
          {},
          <>
            {view(
              module,
              "DialogHeader",
              {},
              <>
                {view(module, "DialogTitle", {}, "Ryu UI dialog")}
                {view(
                  module,
                  "DialogDescription",
                  {},
                  "Compose the named dialog slots.",
                )}
              </>,
            )}
            {view(module, "DialogFooter", { showCloseButton: true })}
          </>,
        )}
      </>,
    ),
  "components/drawer": (module) =>
    view(
      module,
      "Drawer",
      {},
      <>
        {view(
          module,
          "DrawerTrigger",
          {
            className:
              "rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm",
          },
          "Open drawer",
        )}
        {view(
          module,
          "DrawerContent",
          {},
          <>
            {view(
              module,
              "DrawerHeader",
              {},
              <>
                {view(module, "DrawerTitle", {}, "Ryu UI drawer")}
                {view(
                  module,
                  "DrawerDescription",
                  {},
                  "The drawer content is interactive.",
                )}
              </>,
            )}
            {view(
              module,
              "DrawerFooter",
              {},
              view(
                module,
                "DrawerClose",
                {
                  className:
                    "rounded-full bg-primary px-4 py-2 text-center font-medium text-primary-foreground text-sm",
                },
                "Close",
              ),
            )}
          </>,
        )}
      </>,
    ),
  "components/dropdown-menu": (module) =>
    view(
      module,
      "DropdownMenu",
      {},
      <>
        {view(
          module,
          "DropdownMenuTrigger",
          {
            className:
              "rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm",
          },
          "Open menu",
        )}
        {view(
          module,
          "DropdownMenuContent",
          {},
          <>
            {view(module, "DropdownMenuLabel", {}, "Ryu UI")}
            {view(module, "DropdownMenuItem", {}, "Components")}
            {view(module, "DropdownMenuItem", {}, "Themes")}
          </>,
        )}
      </>,
    ),
  "components/hover-card": (module) =>
    view(
      module,
      "HoverCard",
      {},
      <>
        {view(
          module,
          "HoverCardTrigger",
          { className: "rounded-full bg-muted px-4 py-2 text-sm" },
          "Hover this label",
        )}
        {view(
          module,
          "HoverCardContent",
          {},
          <div className="text-sm">A preview card appears on hover.</div>,
        )}
      </>,
    ),
  "components/menubar": (module) =>
    view(
      module,
      "Menubar",
      {},
      view(
        module,
        "MenubarMenu",
        {},
        <>
          {view(module, "MenubarTrigger", {}, "File")}
          {view(
            module,
            "MenubarContent",
            {},
            <>
              {view(module, "MenubarItem", {}, "New")}
              {view(module, "MenubarItem", {}, "Open")}
            </>,
          )}
        </>,
      ),
    ),
  "components/overflow-actions": (module) =>
    view(module, "OverflowActions", {
      overflowActions: [
        { id: "duplicate", label: "Duplicate" },
        { id: "archive", label: "Archive" },
      ],
      primaryActions: [{ id: "save", label: "Save" }],
    }),
  "components/popover": (module) =>
    view(
      module,
      "Popover",
      {},
      <>
        {view(
          module,
          "PopoverTrigger",
          {
            className:
              "rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm",
          },
          "Open popover",
        )}
        {view(
          module,
          "PopoverContent",
          {},
          view(
            module,
            "PopoverHeader",
            {},
            <>
              {view(module, "PopoverTitle", {}, "Popover title")}
              {view(
                module,
                "PopoverDescription",
                {},
                "A small contextual surface.",
              )}
            </>,
          ),
        )}
      </>,
    ),
  "components/sheet": (module) =>
    view(
      module,
      "Sheet",
      {},
      <>
        {view(
          module,
          "SheetTrigger",
          {
            className:
              "rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm",
          },
          "Open sheet",
        )}
        {view(
          module,
          "SheetContent",
          {},
          view(
            module,
            "SheetHeader",
            {},
            <>
              {view(module, "SheetTitle", {}, "Ryu UI sheet")}
              {view(
                module,
                "SheetDescription",
                {},
                "A side surface for secondary work.",
              )}
            </>,
          ),
        )}
      </>,
    ),
  "components/tooltip": (module) =>
    view(
      module,
      "TooltipProvider",
      { delay: 0 },
      view(
        module,
        "Tooltip",
        {},
        <>
          {view(
            module,
            "TooltipTrigger",
            { className: "rounded-full bg-muted px-4 py-2 text-sm" },
            "Hover for help",
          )}
          {view(module, "TooltipContent", {}, "Shared tooltip content")}
        </>,
      ),
    ),
  "components/button-group": (module) =>
    view(
      module,
      "ButtonGroup",
      {},
      <>
        {view(module, "ButtonGroupText", {}, "Format")}
        {view(module, "ButtonGroupSeparator")}
        {view(module, "ButtonGroupText", {}, "Preview")}
      </>,
    ),
  "components/calendar": (module) =>
    view(module, "Calendar", { className: "w-fit rounded-2xl bg-card p-2" }),
  "components/color-picker": (module) =>
    view(
      module,
      "ColorPicker",
      { defaultOpen: true, defaultValue: "#0099ff" },
      <>
        {view(module, "ColorPickerTrigger", {}, "Choose color")}
        {view(
          module,
          "ColorPickerContent",
          {},
          <>
            {view(module, "ColorPickerArea", { className: "h-40" })}
            {view(module, "ColorPickerHueSlider")}
            {view(module, "ColorPickerSwatch", { className: "size-8" })}
          </>,
        )}
      </>,
    ),
  "components/combobox": (module) =>
    view(
      module,
      "Combobox",
      { defaultValue: "ui" },
      <>
        {view(module, "ComboboxInput", {
          className: "w-56",
          placeholder: "Choose a package",
          showTrigger: true,
        })}
        {view(
          module,
          "ComboboxContent",
          {},
          view(
            module,
            "ComboboxList",
            {},
            <>
              {view(module, "ComboboxItem", { value: "ui" }, "@ryu/ui")}
              {view(module, "ComboboxItem", { value: "blocks" }, "@ryu/blocks")}
              {view(module, "ComboboxItem", { value: "host" }, "@ryu/app-host")}
            </>,
          ),
        )}
      </>,
    ),
  "components/field": (module) =>
    view(
      module,
      "Field",
      { className: "w-full max-w-sm" },
      <>
        {view(module, "FieldLabel", {}, "Package path")}
        {view(
          module,
          "FieldContent",
          {},
          <>
            {view(module, "FieldTitle", {}, "@ryu/ui")}
            {view(
              module,
              "FieldDescription",
              {},
              "Tree-shakable component imports.",
            )}
          </>,
        )}
      </>,
    ),
  "components/input-group": (module) =>
    view(
      module,
      "InputGroup",
      { className: "w-full max-w-sm" },
      <>
        {view(module, "InputGroupAddon", {}, "https://")}
        {view(module, "InputGroupInput", { defaultValue: "docs.ryu.dev" })}
        {view(module, "InputGroupAddon", { align: "inline-end" }, ".com")}
      </>,
    ),
  "components/motion/otp-input": (module) =>
    view(module, "OTPInput", {
      hint: "Enter the six-digit code",
      label: "Verification code",
      length: 6,
    }),
  "components/table": (module) =>
    view(
      module,
      "Table",
      { className: "w-full max-w-md" },
      <>
        {view(
          module,
          "TableHeader",
          {},
          view(
            module,
            "TableRow",
            {},
            <>
              {view(module, "TableHead", {}, "Layer")}
              {view(module, "TableHead", {}, "Status")}
            </>,
          ),
        )}
        {view(
          module,
          "TableBody",
          {},
          <>
            {view(
              module,
              "TableRow",
              {},
              <>
                {view(module, "TableCell", {}, "UI")}
                {view(module, "TableCell", {}, "Ready")}
              </>,
            )}
            {view(
              module,
              "TableRow",
              {},
              <>
                {view(module, "TableCell", {}, "Blocks")}
                {view(module, "TableCell", {}, "Shared")}
              </>,
            )}
          </>,
        )}
      </>,
    ),
  "components/toggle": (module) =>
    view(module, "Toggle", { pressed: true }, "Pinned"),
  "components/toggle-group": (module) =>
    view(
      module,
      "ToggleGroup",
      { defaultValue: ["grid"], type: "multiple" },
      <>
        {view(module, "ToggleGroupItem", { value: "grid" }, "Grid")}
        {view(module, "ToggleGroupItem", { value: "list" }, "List")}
      </>,
    ),
  "components/attachment": (module) =>
    view(
      module,
      "Attachment",
      { className: "max-w-sm", state: "done" },
      <>
        {view(
          module,
          "AttachmentMedia",
          {},
          <span className="font-medium text-xs">PDF</span>,
        )}
        {view(
          module,
          "AttachmentContent",
          {},
          <>
            {view(module, "AttachmentTitle", {}, "design-system.pdf")}
            {view(module, "AttachmentDescription", {}, "2.4 MB")}
          </>,
        )}
        {view(
          module,
          "AttachmentActions",
          {},
          view(
            module,
            "AttachmentAction",
            { "aria-label": "More actions" },
            "…",
          ),
        )}
      </>,
    ),
  "components/avatar": (module) =>
    view(
      module,
      "Avatar",
      { size: "lg" },
      <>
        {view(module, "AvatarFallback", {}, "RY")}
        {view(module, "AvatarBadge")}
      </>,
    ),
  "components/bubble": (module) =>
    view(
      module,
      "Bubble",
      {},
      view(module, "BubbleContent", {}, "The UI preview is interactive."),
    ),
  "components/emoji-picker": (module) =>
    view(module, "EmojiPicker", { onEmojiSelect: () => undefined }),
  "components/message": (module) =>
    view(
      module,
      "Message",
      { className: "max-w-md" },
      <>
        {view(module, "MessageAvatar", {}, "R")}
        {view(
          module,
          "MessageContent",
          {},
          <>
            {view(module, "MessageHeader", {}, "Ryu")}
            {view(
              module,
              "MessageContent",
              {},
              "Shared UI components keep surfaces aligned.",
            )}
            {view(module, "MessageFooter", {}, "Just now")}
          </>,
        )}
      </>,
    ),
  "components/message-scroller": (module) =>
    view(
      module,
      "MessageScroller",
      { className: "h-40 w-full max-w-md rounded-2xl bg-card p-3" },
      <>
        {view(module, "MessageScrollerItem", {}, "First message")}
        {view(module, "MessageScrollerItem", {}, "Second message")}
        {view(module, "MessageScrollerItem", {}, "Latest message")}
      </>,
    ),
  "components/chart": (module) =>
    view(
      module,
      "ChartContainer",
      {
        className: "h-40 w-full max-w-md",
        config: {
          requests: { color: "var(--primary)", label: "Requests" },
        },
        initialDimension: { height: 160, width: 360 },
      },
      <svg
        aria-label="Requests chart"
        className="size-full"
        role="img"
        viewBox="0 0 360 160"
      >
        <path
          d="M0 130 C 52 112, 72 122, 108 92 S 164 112, 202 72 S 268 84, 360 28"
          fill="none"
          stroke="var(--color-requests)"
          strokeWidth="4"
        />
        <path
          d="M0 130 C 52 112, 72 122, 108 92 S 164 112, 202 72 S 268 84, 360 28 L360 160 L0 160 Z"
          fill="var(--color-requests)"
          opacity="0.12"
        />
      </svg>,
    ),
  "components/contributions-graph": (module) =>
    view(module, "ContributionsGraph", {
      colorSchema: "blue",
      data: CONTRIBUTION_DATA,
      title: "@ryu",
    }),
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
      className: "font-heading text-4xl",
      value: 128,
    }),
  "components/number-ticker": (module) =>
    view(module, "NumberTicker", {
      className: "font-heading text-4xl",
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
      className: "font-heading text-4xl",
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
      animated: false,
      size: "88px",
      variant: "outline-static",
    }),
  "components/marker": (module) =>
    view(
      module,
      "Marker",
      { className: "w-full max-w-md", variant: "separator" },
      view(module, "MarkerContent", {}, "A marked section"),
    ),
  "components/plan-badge": (module) =>
    view(module, "PlanBadge", { plan: "pro", size: "md" }),
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
};

function PreviewLoading() {
  return (
    <span className="text-muted-foreground text-sm" role="status">
      Loading live preview…
    </span>
  );
}

function PreviewError({ error }: { error: Error }) {
  return (
    <div className="max-w-md text-center text-sm" role="alert">
      <p className="font-medium text-destructive">
        This preview could not render.
      </p>
      <details className="mt-2 text-left text-muted-foreground">
        <summary className="cursor-pointer">Show error</summary>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
          {error.message}
        </pre>
      </details>
    </div>
  );
}

type PreviewErrorBoundaryProps = { children: ReactNode };
type PreviewErrorBoundaryState = { error: Error | null };

class PreviewErrorBoundary extends Component<
  PreviewErrorBoundaryProps,
  PreviewErrorBoundaryState
> {
  state: PreviewErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): PreviewErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  render() {
    return this.state.error ? (
      <PreviewError error={this.state.error} />
    ) : (
      this.props.children
    );
  }
}

export function UiComponentPreview({
  component,
  exportName,
  mode = "default",
}: UiComponentPreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });

  useEffect(() => {
    const loader = UI_COMPONENT_MODULE_LOADERS[component];
    if (!loader) {
      setState({
        error: new Error(`No preview loader registered for ${component}.`),
        status: "error",
      });
      return;
    }

    let active = true;
    setState({ status: "loading" });
    loader()
      .then((module) => {
        if (active) {
          setState({ module, status: "ready" });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            error: error instanceof Error ? error : new Error(String(error)),
            status: "error",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [component]);

  let content: ReactNode = <PreviewLoading />;
  if (state.status === "error") {
    content = <PreviewError error={state.error} />;
  } else if (state.status === "ready") {
    const metadata = UI_COMPONENT_PREVIEW_METADATA[component] ?? {
      props: {},
      targetExport: exportName,
    };
    if (mode === "variants") {
      content = (
        <PreviewVariants
          component={component}
          exportName={exportName}
          metadata={metadata}
          module={state.module}
        />
      );
    } else if (mode === "settings") {
      content = (
        <PreviewSettings
          component={component}
          exportName={exportName}
          metadata={metadata}
          module={state.module}
        />
      );
    } else {
      const renderer = PREVIEW_RENDERERS[component];
      content = renderer
        ? renderer(state.module)
        : renderFallback(state.module, exportName);
    }
  }

  return (
    <div
      className="not-prose my-8"
      data-component={component}
      data-preview-mode={mode}
      data-testid="ui-component-preview"
    >
      <div className="flex w-full items-center justify-center overflow-x-auto">
        <PreviewErrorBoundary key={component}>{content}</PreviewErrorBoundary>
      </div>
    </div>
  );
}
