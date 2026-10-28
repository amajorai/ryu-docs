"use client";

import { Card as FumadocsCard } from "fumadocs-ui/components/card";
import { useParams } from "next/navigation";
import type { ComponentProps } from "react";

import { localizeDocsHref } from "@/lib/docs-version";

type LocalizedCardProps = ComponentProps<typeof FumadocsCard>;

/** Localize MDX cards using the locale from the dynamic route segment. */
export function LocalizedCard({ href, ...props }: LocalizedCardProps) {
  const params = useParams<{ lang?: string }>();
  const localizedHref = localizeDocsHref(href, params.lang);

  return <FumadocsCard {...props} href={localizedHref} />;
}
