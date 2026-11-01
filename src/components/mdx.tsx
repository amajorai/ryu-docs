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
import { Figure } from "@/components/mdx/figure";
import {
  ContributionSurfaces,
  Mermaid,
  Quiz,
  SurfacePreview,
  UiComponentPreview,
} from "@/components/mdx/lazy-client";
import { TryInRyu } from "@/components/mdx/try-in-ryu";
import { canonicalDocsHref } from "@/lib/docs-version";
import { DEFAULT_DOCS_LOCALE } from "@/lib/i18n";

export function DocsAnchor({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <LocalizedAnchor href={canonicalDocsHref(href)} {...props} />;
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

const DefaultImage = defaultMdxComponents.img;
const PACKAGE_ICON_SOURCE =
  /^https:\/\/raw\.githubusercontent\.com\/amajorai\/ryu-marketplace\/[^?#]+-(light|dark)\.png$/;

/** Release notes pages list every package icon twice, light then dark
 * (tools/release-notes-docs-pages.mjs), because Markdown has no `<picture>`.
 * Show the one that matches the reader's theme at text size; every other image
 * keeps the default figure treatment. */
function DocsImage(props: ComponentProps<"img">) {
  const theme =
    typeof props.src === "string"
      ? PACKAGE_ICON_SOURCE.exec(props.src)?.[1]
      : undefined;
  if (!theme) {
    return <DefaultImage {...(props as ComponentProps<typeof DefaultImage>)} />;
  }
  return (
    // biome-ignore lint/performance/noImgElement: a 20px remote package icon needs no image optimizer or remote-pattern config
    <img
      alt=""
      className={`not-prose m-0 inline-block size-5 rounded align-text-bottom ${theme === "dark" ? "hidden dark:inline-block" : "dark:hidden"}`}
      decoding="async"
      height={20}
      loading="lazy"
      src={props.src}
      width={20}
    />
  );
}

function DocsCard({ href, ...props }: ComponentProps<typeof FumadocsCard>) {
  return <LocalizedCard {...props} href={canonicalDocsHref(href)} />;
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
    a: DocsAnchor,
    Architecture,
    AutoCards: (props) => <AutoCards {...props} locale={locale} />,
    Card: DocsCard,
    ContributionSurfaces,
    DocCard: (props) => <DocCard {...props} locale={locale} />,
    Figure,
    File,
    Files,
    Folder,
    img: DocsImage,
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
