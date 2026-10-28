"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentProps } from "react";
import { z } from "zod";

import { localizeDocsHref } from "@/lib/docs-version";

type LocalizedLinkProps = ComponentProps<typeof Link>;

/** Keep links authored by the docs home inside the active locale. */
export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const params = useParams<{ lang?: string }>();
  const locale = params.lang;
  const textHref = z.string().safeParse(href);
  const localizedHref = textHref.success
    ? localizeDocsHref(textHref.data, locale)
    : href;

  return <Link href={localizedHref ?? "#"} {...props} />;
}
