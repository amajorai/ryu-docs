"use client";

import type { TOCItemType } from "fumadocs-core/toc";
import {
  TOCProvider,
  TOCScrollArea,
  useTOCItems,
} from "fumadocs-ui/components/toc";
import { TOCItem, TOCItems } from "fumadocs-ui/components/toc/default";
import { Text } from "lucide-react";
import type { ReactNode } from "react";

/*
 * The classic Fumadocs "On this page" column (the docs layout's TOC) in the
 * Glass grid's right track. Glass' own hover-to-expand TOC stays for screens
 * below xl, where there is no room for a column; page.tsx hides it at xl.
 */

function DocsTOCColumn({ title }: { title: string }) {
  const items = useTOCItems();
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-labelledby="docs-toc-title"
      className="sticky hidden min-h-0 flex-col pe-4 pt-12 pb-2 [grid-area:right] xl:flex"
      data-docs-toc=""
    >
      <h2
        className="inline-flex items-center gap-1.5 text-fd-muted-foreground text-sm tracking-normal"
        id="docs-toc-title"
      >
        <Text aria-hidden="true" className="size-4" />
        {title}
      </h2>
      <TOCScrollArea>
        <TOCItems>
          {items.map((item) => (
            <TOCItem item={item} key={item.url} />
          ))}
        </TOCItems>
      </TOCScrollArea>
    </nav>
  );
}

export function DocsTOC({
  children,
  title,
  toc,
}: {
  children: ReactNode;
  title: string;
  toc: TOCItemType[];
}) {
  return (
    <TOCProvider toc={toc}>
      {children}
      <DocsTOCColumn title={title} />
    </TOCProvider>
  );
}
