import type { Card as FumadocsCard } from "fumadocs-ui/components/card";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { AnchorHTMLAttributes, ComponentProps } from "react";

import { LocalizedAnchor } from "@/components/localized-anchor";
import { LocalizedCard } from "@/components/localized-card";
import { Architecture } from "@/components/mdx/architecture";
import { AutoCards, DocCard } from "@/components/mdx/doc-cards";
import {
  ContributionSurfaces,
  Mermaid,
  Quiz,
  SurfacePreview,
  UiComponentPreview,
} from "@/components/mdx/lazy-client";
import { TryInRyu } from "@/components/mdx/try-in-ryu";
import { versionedDocsHref } from "@/lib/docs-version";
import { DEFAULT_DOCS_LOCALE } from "@/lib/i18n";

export function VersionedAnchor({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <LocalizedAnchor href={versionedDocsHref(href)} {...props} />;
}

/** Markdown tables sit in the landing's frame: header on a muted tray, rows in
 * an inset card (global.css `.docs-table-frame`). */
function FramedTable(props: ComponentProps<"table">) {
  return (
    <div className="docs-table-frame prose-no-margin">
      <table {...props} />
    </div>
  );
}

function VersionedCard({
  href,
  ...props
}: ComponentProps<typeof FumadocsCard>) {
  return <LocalizedCard {...props} href={versionedDocsHref(href)} />;
}

export function getMDXComponents(
  components?: MDXComponents,
  locale: string = DEFAULT_DOCS_LOCALE,
): MDXComponents {
  // SAFETY: The supplied overrides already satisfy MDXComponents, and the
  // returned literal preserves the installed components and their names.
  // Fumadocs' default map still exposes a few components as `Component<never>`
  // while the current MDX type expects the broader component signature. The
  // runtime map is the same object shape, so keep the adapter at this boundary
  // instead of weakening component types throughout the docs pages.
  return {
    ...defaultMdxComponents,
    a: VersionedAnchor,
    Architecture,
    AutoCards: (props) => <AutoCards {...props} locale={locale} />,
    Card: VersionedCard,
    ContributionSurfaces,
    DocCard: (props) => <DocCard {...props} locale={locale} />,
    File,
    Files,
    Folder,
    Mermaid,
    Quiz,
    SurfacePreview,
    Step,
    Steps,
    table: FramedTable,
    TryInRyu,
    UiComponentPreview,
    ...components,
  } as MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
