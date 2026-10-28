import { createElement, type ElementType, type ReactNode } from "react";
import { z } from "zod";
import type { getUiComponentModuleLoader } from "./ui-component-modules.generated";

export type PreviewModule = Awaited<
  ReturnType<NonNullable<ReturnType<typeof getUiComponentModuleLoader>>>
>;
/** Values authored by this playground: renderable content, nested data and UI callbacks. */
export type PreviewProp =
  | ReactNode
  | (() => void)
  | readonly PreviewProp[]
  | { readonly [property: string]: PreviewProp };
export type PreviewProps = Record<string, PreviewProp>;
export const reactComponentSchema = z.custom<ElementType>(
  (value) =>
    z.function().safeParse(value).success ||
    z.object({ $$typeof: z.symbol() }).safeParse(value).success,
);

export type PreviewRenderer = (module: PreviewModule) => ReactNode;

export const CONTRIBUTION_DATA = Array.from({ length: 42 }, (_, index) => ({
  count: (index * 7 + 3) % 8,
  day: `2026-07-${String(index + 1).padStart(2, "0")}`,
}));

export function resolveComponent(
  module: PreviewModule,
  exportName: string,
): ElementType | null {
  const exports = Object.entries(module);
  const candidate =
    exports.find(([name]) => name === exportName)?.[1] ??
    exports.find(([name]) => name === "default")?.[1];
  const component = reactComponentSchema.safeParse(candidate);
  return component.success ? component.data : null;
}

export function view(
  module: PreviewModule,
  exportName: string,
  props: PreviewProps = {},
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
