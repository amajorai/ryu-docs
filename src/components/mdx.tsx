import { Card as FumadocsCard } from "fumadocs-ui/components/card";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { AnchorHTMLAttributes, ComponentProps } from "react";

import { Architecture } from "@/components/mdx/architecture";
import { ContributionSurfaces } from "@/components/mdx/contribution-surfaces";
import { AutoCards, DocCard } from "@/components/mdx/doc-cards";
import { Mermaid } from "@/components/mdx/mermaid";
import { Quiz } from "@/components/mdx/quiz";
import { TryInRyu } from "@/components/mdx/try-in-ryu";
import { versionedDocsHref } from "@/lib/docs-version";

export function VersionedAnchor({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={versionedDocsHref(href)} {...props} />;
}

function VersionedCard({
  href,
  ...props
}: ComponentProps<typeof FumadocsCard>) {
  return <FumadocsCard {...props} href={versionedDocsHref(href)} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    a: VersionedAnchor,
    Architecture,
    AutoCards,
    Card: VersionedCard,
    ContributionSurfaces,
    DocCard,
    File,
    Files,
    Folder,
    Mermaid,
    Quiz,
    Step,
    Steps,
    TryInRyu,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
