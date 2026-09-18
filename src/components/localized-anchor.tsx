"use client";

import { useParams } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";

import { localizeDocsHref } from "@/lib/docs-version";

/** Localize Markdown links without changing their native anchor behavior. */
export function LocalizedAnchor({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const params = useParams<{ lang?: string }>();

  return <a href={localizeDocsHref(href, params.lang)} {...props} />;
}
