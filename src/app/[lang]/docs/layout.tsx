import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isDocsLocale } from "@/lib/i18n";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

import { DocsLayoutClient } from "./docs-layout.client";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isDocsLocale(lang)) {
    notFound();
  }

  return (
    <DocsLayoutClient tree={source.getPageTree(lang)} {...baseOptions(lang)}>
      {children}
    </DocsLayoutClient>
  );
}
