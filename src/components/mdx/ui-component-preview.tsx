"use client";

import { ArrowUpRight } from "lucide-react";
import { Component, type ReactNode, useEffect, useState } from "react";
import { z } from "zod";
import { getUiComponentModuleLoader } from "./ui-component-modules.generated";
import styles from "./ui-component-preview.module.css";
import {
  getUiComponentPreviewMetadata,
  type UiComponentPreviewMetadata,
} from "./ui-component-preview-metadata.generated";
import { FORM_AND_CHAT_PREVIEW_RENDERERS } from "./ui-component-preview-renderers-forms";
import { LAYOUT_PREVIEW_RENDERERS } from "./ui-component-preview-renderers-layout";
import { MOTION_BRAND_AND_AGENT_PREVIEW_RENDERERS } from "./ui-component-preview-renderers-motion";
import { OVERLAY_PREVIEW_RENDERERS } from "./ui-component-preview-renderers-overlays";
import { PRIMITIVE_PREVIEW_RENDERERS } from "./ui-component-preview-renderers-primitives";
import {
  CONTRIBUTION_DATA,
  type PreviewModule,
  type PreviewProps,
  type PreviewRenderer,
  view,
} from "./ui-component-preview-shared";

const previewErrorSchema = z.instanceof(Error);

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
  "animation",
  "expression",
  "size",
  "disabled",
  "loading",
  "state",
  "status",
  "kind",
  "theme",
  "orientation",
  "plan",
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
  "plan",
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

const PREVIEW_BASE_PROPS = {
  "components/run-status-timeline": {
    ariaLabel: "Example run status for the last 24 hours",
    endAt: 86_400_000,
    entries: [],
    startAt: 0,
  },
  "components/contributions-graph": {
    colorSchema: "blue",
    data: CONTRIBUTION_DATA,
    title: "@ryu",
  },
  "components/overflow-actions": {
    overflowActions: [
      { id: "duplicate", label: "Duplicate" },
      { id: "archive", label: "Archive" },
    ],
    primaryActions: [{ id: "save", label: "Save" }],
  },
  "components/dither-kit/avatar": {
    name: "Ryu UI",
  },
  "components/dither-kit/gradient": {
    bloom: "low",
    className: "h-32 w-full max-w-md",
    from: "blue",
    to: "transparent",
  },
  "components/agents/code-block": {
    code: "<Button>Continue</Button>",
    filename: "example.tsx",
    language: "tsx",
  },
  "components/agents/file-diff": {
    file: "components/button.tsx",
    lines: [
      { content: "+ export { Button }", id: "1", type: "added" },
      { content: "  export type ButtonProps", id: "2", type: "context" },
    ],
  },
  "components/agents/todo-list": {
    items: [
      { id: "tokens", status: "completed", title: "Load design tokens" },
      {
        id: "preview",
        progress: 64,
        status: "in-progress",
        title: "Render component",
      },
    ],
  },
  "components/agents/tool-approval": {
    choices: [
      { id: "allow", label: "Allow", tone: "secondary" },
      { id: "deny", label: "Deny", tone: "ghost" },
    ],
    parameters: [{ id: "path", label: "Path", value: "packages/ui" }],
    title: "Allow component inspection?",
    tool: "read",
  },
  "components/agents/tool-result": {
    kind: "terminal",
    status: "success",
    title: "Component catalog",
    tool: "read",
  },
};

function previewBaseProps(component: string): PreviewProps {
  const key = z
    .custom<keyof typeof PREVIEW_BASE_PROPS>(
      (value) =>
        z.string().safeParse(value).success &&
        Object.hasOwn(PREVIEW_BASE_PROPS, String(value)),
    )
    .safeParse(component);
  return key.success ? { ...PREVIEW_BASE_PROPS[key.data] } : {};
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

function previewValue(value: string) {
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
  props: PreviewProps,
  label = "Preview",
): ReactNode {
  if (component === "components/motion-highlight") {
    return <span>Highlighted content</span>;
  }
  const size = props.size;
  const parsedSize = z.string().safeParse(size);
  if (parsedSize.success && parsedSize.data.startsWith("icon")) {
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
  props: PreviewProps,
  label = "Preview",
): ReactNode {
  return view(
    module,
    metadata.targetExport,
    props,
    previewChildren(component, props, label),
  );
}

export function previewSettingEntries(
  metadata: UiComponentPreviewMetadata,
): Array<[string, string[]]> {
  const orderedProperties = new Set(PREVIEW_SETTING_ORDER);
  const properties = [
    ...PREVIEW_SETTING_ORDER,
    ...Object.keys(metadata.props)
      .filter((property) => !orderedProperties.has(property))
      .sort(),
  ];
  return properties.flatMap<[string, string[]]>((property) => {
    const options = metadata.props[property];
    return options && options.length > 1 ? [[property, options]] : [];
  });
}

function hasVariantOrSizeOptions(
  metadata: UiComponentPreviewMetadata,
): boolean {
  return ["plan", "variant", "size"].some((property) => {
    const options = metadata.props[property];
    return options !== undefined && options.length > 1;
  });
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
  const isLogo = component === "components/logo";
  const props = previewBaseProps(component);
  if (isLogo) {
    props.animated = false;
    props.size = "72px";
  }
  props[property] = previewValue(value);

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
  metadata,
  module,
}: {
  component: string;
  metadata: UiComponentPreviewMetadata;
  module: PreviewModule;
}) {
  if (!hasVariantOrSizeOptions(metadata)) {
    return null;
  }

  const entries = previewSettingEntries(metadata).filter(([property]) =>
    PREVIEW_VARIANT_PROPERTIES.has(property),
  );

  if (entries.length === 0) {
    return null;
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
  const preferred: Record<string, string> =
    component === "components/logo"
      ? { animation: "random", expression: "random", variant: "outline-muted" }
      : {};
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      entries.map(([property, options]) => [
        property,
        preferred[property] ??
          (options.includes("default") ? "default" : (options[0] ?? "")),
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

  const props = previewBaseProps(component);
  if (component === "components/logo") {
    props.size = "88px";
  }
  for (const [property, options] of entries) {
    props[property] = previewValue(selected[property] ?? options[0] ?? "");
  }

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

const PREVIEW_RENDERERS = {
  ...PRIMITIVE_PREVIEW_RENDERERS,
  ...LAYOUT_PREVIEW_RENDERERS,
  ...OVERLAY_PREVIEW_RENDERERS,
  ...FORM_AND_CHAT_PREVIEW_RENDERERS,
  ...MOTION_BRAND_AND_AGENT_PREVIEW_RENDERERS,
} satisfies Record<string, PreviewRenderer>;

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
      <p className="font-medium text-status-destructive">
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

  static getDerivedStateFromError(
    error: Parameters<typeof previewErrorSchema.safeParse>[0],
  ): PreviewErrorBoundaryState {
    return {
      error:
        previewErrorSchema.safeParse(error).data ?? new Error(String(error)),
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
    const loader = getUiComponentModuleLoader(component);
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
      .catch((error: Parameters<typeof previewErrorSchema.safeParse>[0]) => {
        if (active) {
          setState({
            error:
              previewErrorSchema.safeParse(error).data ??
              new Error(String(error)),
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
    const metadata = getUiComponentPreviewMetadata(component) ?? {
      props: {},
      targetExport: exportName,
    };
    if (mode === "variants") {
      content = (
        <PreviewVariants
          component={component}
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
      const rendererKey = z
        .custom<keyof typeof PREVIEW_RENDERERS>(
          (value) =>
            z.string().safeParse(value).success &&
            Object.hasOwn(PREVIEW_RENDERERS, String(value)),
        )
        .safeParse(component);
      const renderer = rendererKey.success
        ? PREVIEW_RENDERERS[rendererKey.data]
        : undefined;
      content = renderer
        ? renderer(state.module)
        : renderFallback(state.module, exportName);
    }
  }

  return (
    <div
      className={styles.root}
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
