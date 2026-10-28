/** Curated catalog tables: categories, descriptions, examples, and preview options. */
import { EXPRESSIVE_EXPRESSION_IDS } from "../../../../packages/ui/src/components/expressive.ts";
import { EXPRESSIVE_ANIMATION_IDS } from "../../../../packages/ui/src/components/expressive-animation.ts";

export const CATEGORY_ORDER = [
  "Primitives",
  "Layout & Navigation",
  "Overlay & Dialog",
  "Forms & Data",
  "Chat & Communication",
  "Visualization",
  "Animation & Effects",
  "Specialized",
  "Agent UI",
  "Data Grid",
  "Editor",
];

export const CATEGORY_NAVIGATION_LABELS = {
  Primitives: "Core primitives",
  "Layout & Navigation": "Layout & navigation",
  "Overlay & Dialog": "Overlays & dialogs",
  "Forms & Data": "Forms & data",
  "Chat & Communication": "Chat & communication",
  Visualization: "Visualization",
  "Animation & Effects": "Motion & effects",
  Specialized: "Ryu-specific components",
  "Agent UI": "Agent UI",
  "Data Grid": "Data grid",
  Editor: "Editor",
} satisfies Record<string, string>;

export const COMPONENT_EXPORT_EXCLUSIONS = [
  /(?:Props|Config|Options|Variant|Variants|Schema|State|Type|Data|Kind|Size|Speed|ClassNames|Token|Theme)$/,
  /Kit$/,
  /Plugin$/,
];

export const DEFAULT_DESCRIPTIONS = {
  "components/agents/agent-activity":
    "Displays the activity timeline for an agent run.",
  "components/agents/approval-card":
    "Presents a reviewable approval request for a tool or action.",
  "components/agents/loading-states":
    "Loading and progress indicators for agent work.",
  "components/connection-status":
    "A compact, non-blocking status toast for network and node outages.",
  "components/dither-kit/avatar":
    "Renders a deterministic dithered avatar from a user seed.",
  "components/dither-kit/gradient":
    "Renders a dithered gradient visual from tokenized colors.",
  "components/motion/button/index":
    "Animated button primitives for state and interaction transitions.",
  "components/motion/checkbox":
    "Animated checkbox control with reduced-motion support.",
  "components/motion/input":
    "Animated input control for focused and changing states.",
  "components/motion/loader":
    "Animated loading indicator for in-progress work.",
  "components/motion/preview-rail":
    "Animated preview rail for browsing adjacent content.",
  "components/motion/radio":
    "Animated radio control with reduced-motion support.",
  "components/motion/text-scramble":
    "Animated text transition that scrambles characters before settling.",
  "components/text-morph":
    "Character-level text morphing for changing interface copy, with reduced-motion support.",
  "components/motion/text-shimmer":
    "Animated shimmer treatment for text content.",
  "components/run-status-timeline":
    "Maps scheduled run outcomes onto a compact 24-hour status strip.",
} satisfies Record<string, string>;

export const DEFAULT_PREVIEW_OPTIONS = {
  // Marker declares this complete two-key size CVA inline in its native source.
  "components/marker": { size: ["default", "compact"] },
  // Button's public entry point re-exports the implementation and the server-safe
  // CVA definition from sibling modules, so its literal unions are intentionally
  // not present in the entry file that the lightweight scanner reads.
  "components/button": {
    size: [
      "default",
      "icon",
      "icon-lg",
      "icon-sm",
      "icon-xs",
      "lg",
      "sm",
      "tiny",
      "xs",
    ],
    variant: [
      "default",
      "destructive",
      "ghost",
      "ghost-muted",
      "link",
      "loading",
      "mono",
      "outline",
      "progress",
      "secondary",
    ],
  },
  "components/logo": {
    animation: ["random", ...EXPRESSIVE_ANIMATION_IDS],
    expression: ["random", ...EXPRESSIVE_EXPRESSION_IDS],
  },
} satisfies Record<string, Record<string, string[]>>;

export const EXAMPLES = {
  "components/button": `<Button>Continue</Button>`,
  "components/badge": `<Badge variant="secondary">Ready</Badge>`,
  "components/input": `<Input placeholder="Search" />`,
  "components/textarea": `<Textarea placeholder="Write a note" />`,
  "components/checkbox": `<Checkbox aria-label="Enable notifications" />`,
  "components/connection-status": `<ConnectionStatusToast nodeName="Design node" phase="node-unreachable" />`,
  "components/text-morph": `<TextMorph duration={240}>Ryu UI</TextMorph>`,
  "components/text-swap": `<TextSwap>Checking…</TextSwap>`,
  "components/switch": `<Switch aria-label="Enable notifications" />`,
  "components/progress": `<Progress value={64} />`,
  "components/spinner": `<Spinner />`,
  "components/skeleton": `<Skeleton className="h-4 w-32" />`,
  "components/separator": `<Separator />`,
  "components/card": `<Card>Content</Card>`,
  "components/accordion": `<Accordion>Sections</Accordion>`,
  "components/collapsible": `<Collapsible>Details</Collapsible>`,
  "components/dialog": `<Dialog>Dialog content</Dialog>`,
  "components/alert-dialog": `<AlertDialog>Confirm this change</AlertDialog>`,
  "components/popover": `<Popover>Additional context</Popover>`,
  "components/tooltip": `<Tooltip>Helpful context</Tooltip>`,
  "components/calendar": `<Calendar />`,
  "components/color-picker": `<ColorPickerPopover defaultValue="#0099ff" swatches={["#000000", "#ffffff", "#ff3b30"]} />`,
  "components/avatar": `<Avatar />`,
  "components/bubble": `<Bubble>Message</Bubble>`,
  "components/message": `<Message>Message content</Message>`,
  "components/run-status-timeline": `<RunStatusTimeline ariaLabel="Run status" endAt={Date.now()} entries={[]} startAt={Date.now() - 86400000} />`,
  "components/logo": `<Logo variant="3d" size="192px" />`,
  "components/plan-badge": `<PlanBadge plan="business" size="md" />`,
  "components/data-grid/data-grid": `<DataGrid />`,
} satisfies Record<string, string>;

export const PREVIEW_OPTION_KEYS = [
  "align",
  "appearance",
  "direction",
  "framing",
  "inset",
  "kind",
  "mode",
  "orientation",
  "plan",
  "position",
  "radius",
  "side",
  "size",
  "spacing",
  "state",
  "status",
  "theme",
  "tone",
  "typography",
  "variant",
];

// These additions are root props only. Named-slot presentation options are
// documented on their own exports rather than offered as ineffective root controls.
export const ROOT_PRESENTATION_PREVIEW_OPTIONS = {
  "components/marker": ["spacing", "tone"],
  "components/button": ["appearance", "radius", "typography"],
  "components/avatar": ["framing"],
  "components/skeleton": ["radius"],
  "components/announcement-visual": ["appearance"],
  "components/alert": ["appearance", "inset"],
  "components/badge": ["typography"],
  "components/empty": ["appearance", "inset", "spacing"],
  "components/marketplace-access-badge": ["tone"],
} satisfies Record<string, string[]>;

export const PRESENTATION_PREVIEW_KEYS = new Set([
  "appearance",
  "framing",
  "inset",
  "radius",
  "spacing",
  "tone",
  "typography",
]);

export const PREVIEW_BOOLEAN_KEYS = [
  "checked",
  "defaultChecked",
  "defaultOpen",
  "defaultPressed",
  "disabled",
  "loading",
  "loop",
  "open",
  "pressed",
  "readOnly",
];

export const DEFAULT_PREVIEW_BOOLEAN_PROPS = {
  "components/button": ["disabled", "loading"],
  "components/checkbox": ["disabled"],
  "components/input": ["disabled"],
  "components/motion/checkbox": ["disabled"],
  "components/motion/input": ["disabled"],
  "components/motion/radio": ["disabled"],
  "components/radio-group": ["disabled"],
  "components/slider": ["disabled"],
  "components/switch": ["disabled"],
  "components/textarea": ["disabled"],
} satisfies Record<string, string[]>;
