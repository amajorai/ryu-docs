import { type PreviewRenderer, view } from "./ui-component-preview-shared";

export const OVERLAY_PREVIEW_RENDERERS = {
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
  "components/dropdrawer": (module) =>
    view(
      module,
      "DropDrawer",
      {},
      <>
        {view(
          module,
          "DropDrawerTrigger",
          {
            className:
              "rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm",
          },
          "Open preferences",
        )}
        {view(
          module,
          "DropDrawerContent",
          { drawerLabel: "Preferences" },
          <>
            {view(module, "DropDrawerLabel", {}, "Account")}
            {view(module, "DropDrawerItem", {}, "Profile")}
            {view(
              module,
              "DropDrawerSub",
              {},
              <>
                {view(module, "DropDrawerSubTrigger", {}, "Theme")}
                {view(
                  module,
                  "DropDrawerSubContent",
                  {},
                  <>
                    {view(module, "DropDrawerItem", {}, "Light")}
                    {view(module, "DropDrawerItem", {}, "Dark")}
                    {view(module, "DropDrawerItem", {}, "System")}
                  </>,
                )}
              </>,
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
} satisfies Record<string, PreviewRenderer>;
