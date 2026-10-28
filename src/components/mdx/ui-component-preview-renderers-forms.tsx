import {
  CONTRIBUTION_DATA,
  type PreviewRenderer,
  view,
} from "./ui-component-preview-shared";

export const FORM_AND_CHAT_PREVIEW_RENDERERS = {
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
      {
        defaultOpen: true,
        defaultValue: "#0099ff",
        swatches: [
          "#000000",
          "#ffffff",
          "#ff3b30",
          "#f0f0f0",
          "#e5e5e5",
          "#d0d0d0",
          "rgba(0, 0, 0, 0.5)",
        ],
      },
      <>
        {view(module, "ColorPickerTrigger", {}, "Choose color")}
        {view(
          module,
          "ColorPickerContent",
          {},
          view(module, "ColorPickerPanel"),
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
} satisfies Record<string, PreviewRenderer>;
