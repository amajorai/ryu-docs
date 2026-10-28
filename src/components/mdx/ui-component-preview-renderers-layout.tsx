import { type PreviewRenderer, view } from "./ui-component-preview-shared";

export const LAYOUT_PREVIEW_RENDERERS = {
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
} satisfies Record<string, PreviewRenderer>;
